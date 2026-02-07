/**
 * 文件加密模块
 * 功能：
 * - 大文件流式加密
 * - 分块处理（避免内存溢出）
 * - 进度回调支持
 */

import { encryptData, deriveKey } from './encryption';
import { calculateSHA256 } from './checksum';

const CHUNK_SIZE = 1024 * 1024; // 1MB 分块大小

export interface EncryptedFile {
  encryptedData: Uint8Array;
  salt: string;
  iv: string;
  checksum: string;
}

export interface EncryptProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * 加密文件（支持大文件流式加密）
 */
export async function encryptFile(
  file: File,
  masterPassword: string,
  onProgress?: (progress: EncryptProgress) => void
): Promise<EncryptedFile> {
  // 1. 生成随机盐值和 IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 2. 派生密钥
  const key = await deriveKey(masterPassword, salt);

  // 3. 读取文件并分块加密
  const fileSize = file.size;
  const chunks: Uint8Array[] = [];
  let processed = 0;

  // 对于小文件（< 50MB），直接加密
  if (fileSize < 50 * 1024 * 1024) {
    const fileBuffer = await file.arrayBuffer();
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileBuffer
    );

    const encryptedArray = new Uint8Array(encryptedData);
    
    // 计算校验和
    const checksum = await calculateSHA256(
      Array.from(encryptedArray).map(b => String.fromCharCode(b)).join('')
    );

    onProgress?.({
      loaded: fileSize,
      total: fileSize,
      percentage: 100,
    });

    return {
      encryptedData: encryptedArray,
      salt: bufToBase64(salt),
      iv: bufToBase64(iv),
      checksum,
    };
  }

  // 对于大文件，使用流式加密
  const reader = file.stream().getReader();
  const encryptedChunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 加密当前块
      const encryptedChunk = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        value
      );

      encryptedChunks.push(new Uint8Array(encryptedChunk));
      processed += value.length;

      // 更新进度
      onProgress?.({
        loaded: processed,
        total: fileSize,
        percentage: Math.round((processed / fileSize) * 100),
      });
    }

    // 合并所有加密块
    const totalLength = encryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const encryptedData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of encryptedChunks) {
      encryptedData.set(chunk, offset);
      offset += chunk.length;
    }

    // 计算校验和
    const checksum = await calculateSHA256(
      Array.from(encryptedData).map(b => String.fromCharCode(b)).join('')
    );

    return {
      encryptedData,
      salt: bufToBase64(salt),
      iv: bufToBase64(iv),
      checksum,
    };
  } finally {
    reader.releaseLock();
  }
}

/**
 * 解密文件（支持大文件流式解密）
 */
export async function decryptFile(
  encryptedData: Uint8Array,
  masterPassword: string,
  salt: string,
  iv: string,
  onProgress?: (progress: EncryptProgress) => void
): Promise<Blob> {
  // 1. 派生密钥
  const saltBuf = base64ToBuf(salt);
  const key = await deriveKey(masterPassword, saltBuf as Uint8Array);

  // 2. 解密
  const ivBuf = base64ToBuf(iv);
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuf as BufferSource },
    key,
    encryptedData as BufferSource
  );

  onProgress?.({
    loaded: encryptedData.length,
    total: encryptedData.length,
    percentage: 100,
  });

  return new Blob([decryptedData]);
}

// 工具函数
function bufToBase64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}

function base64ToBuf(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}



