/**
 * src/shared/lib/encryption.ts
 * 核心安全模块：基于 Web Crypto API 的端到端加密实现
 * 用于 Digital Heirloom 数字保险箱的零知识存储
 */

// 配置参数
const PBKDF2_ITERATIONS = 100000;
const ALGORITHM_NAME = 'AES-GCM';

/**
 * 将字符串转为 Uint8Array
 */
const encode = (text: string) => new TextEncoder().encode(text);

/**
 * 将 Uint8Array 转为 Base64 字符串用于存储
 */
const bufToBase64 = (buf: Uint8Array) => btoa(String.fromCharCode(...buf));

/**
 * 将 Base64 字符串转为 Uint8Array
 */
const base64ToBuf = (base64: string) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

/**
 * 从主密码派生加密密钥
 * @param password 用户主密码
 * @param salt 随机盐值
 * @returns 加密密钥
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGORITHM_NAME, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密函数
 * @param plainText 待加密的明文（JSON 字符串）
 * @param password 用户主密码
 * @returns { encryptedData: Base64, salt: Base64, iv: Base64 }
 */
export async function encryptData(plainText: string, password: string) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // GCM 推荐 12 字节

  const key = await deriveKey(password, salt);

  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: ALGORITHM_NAME, iv },
    key,
    encode(plainText)
  );

  return {
    encryptedData: bufToBase64(new Uint8Array(encryptedBuf)),
    salt: bufToBase64(salt),
    iv: bufToBase64(iv),
  };
}

/**
 * 解密函数
 * @param encryptedData Base64 密文
 * @param password 用户主密码
 * @param salt Base64 盐值
 * @param iv Base64 初始向量
 * @returns 明文字符串
 */
export async function decryptData(
  encryptedData: string,
  password: string,
  salt: string,
  iv: string
): Promise<string> {
  const saltBuf = base64ToBuf(salt);
  const ivBuf = base64ToBuf(iv);
  const dataBuf = base64ToBuf(encryptedData);

  const key = await deriveKey(password, saltBuf);

  try {
    const decryptedBuf = await window.crypto.subtle.decrypt(
      { name: ALGORITHM_NAME, iv: ivBuf },
      key,
      dataBuf
    );

    return new TextDecoder().decode(decryptedBuf);
  } catch (e) {
    throw new Error('解密失败：密码错误或数据损坏');
  }
}



