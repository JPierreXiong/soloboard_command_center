/**
 * POST /api/digital-heirloom/assets/blob-upload
 * 上传加密文件到 Vercel Blob Storage（服务器端）
 * 
 * 注意：此路由在服务器端运行，可以访问 BLOB_READ_WRITE_TOKEN 环境变量
 */

import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }

    // 解析请求体
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;

    if (!file) {
      return respErr('File is required');
    }

    if (!path) {
      return respErr('Path is required');
    }

    // 检查环境变量
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return respErr('BLOB_READ_WRITE_TOKEN is not configured');
    }

    // 将文件转换为 Blob
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { 
      type: file.type || 'application/octet-stream' 
    });

    // 上传到 Vercel Blob（在服务器端，可以访问环境变量）
    const result = await put(path, blob, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
      token, // 显式传递 token
    });

    return respData({
      url: result.url,
      pathname: result.pathname,
      size: file.size, // 使用文件对象的大小
      uploadedAt: new Date().toISOString(), // 使用当前时间
    });
  } catch (error: any) {
    console.error('Blob upload failed:', error);
    return respErr(error.message || 'Failed to upload file to Blob storage');
  }
}
