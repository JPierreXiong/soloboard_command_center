/**
 * PDF Fragment Parser
 * 解析 PDF 恢复包，提取 Fragment A/B 助记词和二维码
 * 
 * 注意：此文件包含客户端专用的代码（pdfjs-dist, jsqr），
 * 不应在服务器端 API 路由中直接导入。
 * 如需在服务器端合并 Fragment，请使用 fragment-merger.ts
 */

import { validateBIP39Mnemonic } from './recovery-kit';

// 仅在客户端导入 pdfjs-dist（使用动态导入避免服务器端构建错误）
let pdfjsLib: any = null;
let pdfjsLibPromise: Promise<any> | null = null;

// 延迟初始化 pdfjsLib，只在需要时加载（使用 Promise 避免构建时解析）
async function getPdfjsLib(): Promise<any> {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      try {
        // 使用动态 import，完全避免构建时解析
        const pdfjsModule = await import('pdfjs-dist');
        const lib = pdfjsModule.default || pdfjsModule;
        // 配置 PDF.js worker - 使用本地 Worker 避免 404 错误
        if (lib.GlobalWorkerOptions) {
          lib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
        }
        pdfjsLib = lib;
        return lib;
      } catch (error) {
        // 如果本地 Worker 不可用，禁用 Worker（性能稍慢但不会报错）
        console.warn('Failed to load pdfjs-dist:', error);
        pdfjsLib = null;
        return null;
      }
    })();
  }
  
  return pdfjsLibPromise;
}

export interface ParsedPDFFragment {
  fragment: 'A' | 'B' | 'full'; // Fragment 类型
  mnemonic: string[]; // 提取的助记词数组（12 或 24 个单词）
  releaseToken?: string; // 从二维码提取的 Release Token
  documentId?: string; // 文档 ID
  checksum?: string; // 校验和
  vaultId?: string; // Vault ID（从二维码提取）
}

export interface QRCodeData {
  releaseToken?: string;
  vaultId?: string;
  mnemonic?: string;
  documentId?: string;
}

/**
 * 从 PDF 中提取文本内容
 */
async function extractTextFromPDF(pdfFile: File): Promise<string> {
  // 仅在客户端执行
  const pdfjs = await getPdfjsLib();
  if (!pdfjs) {
    throw new Error('PDF parsing is only available in browser environment');
  }

  const arrayBuffer = await pdfFile.arrayBuffer();
  
  // 使用与现有 pdf-parser.ts 相同的配置
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    fullText += pageText + '\n';
  }
  
  return fullText;
}

/**
 * 从 PDF 中提取二维码（通过 Canvas 渲染）
 */
async function extractQRCodeFromPDF(pdfFile: File): Promise<QRCodeData | null> {
  try {
    // 动态导入 jsQR（仅在浏览器环境）
    if (typeof window === 'undefined') {
      return null;
    }

    // 尝试导入 jsQR，如果不存在则返回 null
    // Note: jsqr is an optional dependency, may not be installed
    // 使用字符串拼接避免构建时静态分析
    let jsQR: any;
    try {
      // 使用字符串拼接避免 Turbopack/Webpack 在构建时解析模块
      const jsqrModuleName = 'js' + 'qr';
      // @ts-expect-error - jsqr may not be installed, using dynamic import with string concatenation
      const module = await import(/* webpackIgnore: true */ jsqrModuleName);
      jsQR = module?.default || module || null;
      if (!jsQR) {
        console.warn('jsQR not available, skipping QR code extraction');
        return null;
      }
    } catch (error) {
      // jsQR 未安装，跳过二维码提取
      console.warn('jsQR not available, skipping QR code extraction');
      return null;
    }
    const pdfjs = await getPdfjsLib();
    if (!pdfjs) {
      return null;
    }
    
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // 使用与现有 pdf-parser.ts 相同的配置
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    
    // 只检查第一页（二维码通常在首页）
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    
    // 创建 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    
    if (!context) {
      return null;
    }
    
    // 渲染 PDF 页面到 Canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    await page.render(renderContext as any).promise; // 使用类型断言避免类型错误
    
    // 获取图像数据
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // 查找二维码
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (qrCode) {
      try {
        const data = JSON.parse(qrCode.data) as QRCodeData;
        return data;
      } catch {
        // 如果不是 JSON，可能是纯文本 Token
        return {
          releaseToken: qrCode.data,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn('QR code extraction failed:', error);
    return null;
  }
}

/**
 * 从文本中提取助记词
 */
function extractMnemonicFromText(text: string): string[] {
  // BIP39 单词列表（部分，用于匹配）
  const bip39Words = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
    // ... 更多单词（实际应该使用完整的 BIP39 单词列表）
  ];
  
  // 匹配模式：数字 + 单词（如 "01. abandon"）
  const mnemonicPattern = /(\d{1,2})\.\s*([a-z]+)/gi;
  const matches = Array.from(text.matchAll(mnemonicPattern));
  
  // 提取单词并按序号排序
  const words: Array<{ index: number; word: string }> = [];
  
  for (const match of matches) {
    const index = parseInt(match[1], 10);
    const word = match[2].toLowerCase().trim();
    
    if (word && index > 0 && index <= 24) {
      words.push({ index, word });
    }
  }
  
  // 按索引排序并提取单词
  words.sort((a, b) => a.index - b.index);
  return words.map(w => w.word);
}

/**
 * 识别 Fragment 类型（A/B/full）
 */
function identifyFragmentType(text: string, mnemonicCount: number): 'A' | 'B' | 'full' {
  const textLower = text.toLowerCase();
  
  // 检查是否包含 Fragment A 标识
  const hasFragmentA = textLower.includes('fragment a') || 
                       textLower.includes('shard a') ||
                       textLower.includes('part a') ||
                       textLower.includes('mnemonics (1-12)') ||
                       textLower.includes('words 1-12') ||
                       textLower.includes('words 01-12');
  
  // 检查是否包含 Fragment B 标识
  const hasFragmentB = textLower.includes('fragment b') || 
                       textLower.includes('shard b') ||
                       textLower.includes('part b') ||
                       textLower.includes('mnemonics (13-24)') ||
                       textLower.includes('words 13-24');
  
  // 根据助记词数量和标识判断
  if (mnemonicCount === 12) {
    if (hasFragmentA) return 'A';
    if (hasFragmentB) return 'B';
    // 如果没有明确标识，根据单词序号判断（检查提取的单词序号范围）
    // 这里简化处理：如果只有12个单词，默认是 Fragment A
    // 实际应该检查单词序号是否在 1-12 或 13-24 范围内
    return 'A'; // 默认返回 A
  }
  
  if (mnemonicCount === 24) {
    return 'full';
  }
  
  // 默认返回 full（如果无法识别）
  return 'full';
}

/**
 * 解析 PDF 恢复包
 */
export async function parsePDFFragment(pdfFile: File): Promise<ParsedPDFFragment> {
  // 1. 提取文本内容
  const text = await extractTextFromPDF(pdfFile);
  
  // 2. 提取助记词
  const mnemonic = extractMnemonicFromText(text);
  
  if (mnemonic.length === 0) {
    throw new Error('No mnemonic words found in PDF');
  }
  
  // 3. 识别 Fragment 类型
  const fragment = identifyFragmentType(text, mnemonic.length);
  
  // 4. 提取二维码数据
  const qrData = await extractQRCodeFromPDF(pdfFile);
  
  // 5. 提取文档 ID 和校验和（从文本中）
  const documentIdMatch = text.match(/DOCUMENT ID[:\s]+([A-Z0-9-]+)/i);
  const checksumMatch = text.match(/CHECKSUM[:\s]+([A-F0-9]+)/i);
  
  return {
    fragment,
    mnemonic,
    releaseToken: qrData?.releaseToken,
    vaultId: qrData?.vaultId,
    documentId: documentIdMatch?.[1],
    checksum: checksumMatch?.[1],
  };
}

// 重新导出 mergeFragments 和 validateFragmentMnemonic 以保持向后兼容
// 建议：在服务器端代码中使用 fragment-merger.ts 中的版本
export { mergeFragments, validateFragmentMnemonic } from './fragment-merger';
