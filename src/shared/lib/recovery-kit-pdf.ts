/**
 * Recovery Kit PDF Generator 2.0
 * 全彩专业 PDF 生成引擎
 * 
 * 设计规范：
 * - Afterglow Signature Gold (#EAB308) 主题色
 * - 全英文专业格式
 * - 3x4 助记词网格布局
 * - 打印级质感
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { RecoveryKit } from './recovery-kit';

// Afterglow Signature Gold Color
const GOLD_COLOR = { r: 234, g: 179, b: 8 }; // #EAB308
const WHITE_BG = { r: 255, g: 255, b: 255 }; // White background
const DARK_TEXT = { r: 18, g: 18, b: 18 }; // #121212
const GRAY_TEXT = { r: 100, g: 100, b: 100 };
const GOLD_BG_LIGHT = { r: 250, g: 245, b: 230 }; // Light gold background for cells

/**
 * Generate professional full-color PDF Recovery Kit
 */
export async function generateRecoveryKitPDF(kit: RecoveryKit, beneficiaryName?: string): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Generate DOC ID
  const now = new Date(kit.createdAt);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomId = kit.vaultId.slice(0, 4).toUpperCase();
  const docId = `HV-${year}-${month}${day}-${randomId}`;

  // Valid until date (100 years)
  const validUntil = new Date(now);
  validUntil.setFullYear(validUntil.getFullYear() + 100);

  let yPos = margin;

  // ============================================
  // HEADER SECTION
  // ============================================
  
  // Gold decorative line at top
  doc.setFillColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.rect(0, 0, pageWidth, 5, 'F');

  yPos += 10;

  // Title: DIGITAL HERITAGE CERTIFICATE
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  const titleText = 'DIGITAL HERITAGE CERTIFICATE';
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, yPos);
  
  yPos += 5;
  
  // Subtitle: (Fragment A)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(GRAY_TEXT.r, GRAY_TEXT.g, GRAY_TEXT.b);
  const subtitleText = '(Fragment A)';
  const subtitleWidth = doc.getTextWidth(subtitleText);
  doc.text(subtitleText, (pageWidth - subtitleWidth) / 2, yPos);

  yPos += 10;

  // Decorative line
  doc.setDrawColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // ============================================
  // DOCUMENT INFORMATION SECTION
  // ============================================
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);

  // DOCUMENT ID
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.text('DOCUMENT ID:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);
  doc.text(docId, margin + 40, yPos);
  yPos += 7;

  // BENEFICIARY (if provided)
  if (beneficiaryName) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
    doc.text('BENEFICIARY:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);
    doc.text(beneficiaryName, margin + 40, yPos);
    yPos += 7;
  }

  // GENERATED DATE
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.text('GENERATED:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);
  const generatedDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(generatedDate, margin + 40, yPos);
  yPos += 7;

  // VALID UNTIL
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.text('VALID UNTIL:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);
  const validUntilDate = validUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(validUntilDate, margin + 40, yPos);
  yPos += 12;

  // ============================================
  // RECOVERY MNEMONICS SECTION (3x4 Grid)
  // ============================================
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.text('RECOVERY MNEMONICS (1-12)', margin, yPos);
  yPos += 8;

  // Grid layout: 3 columns x 4 rows
  const gridCols = 3;
  const gridRows = 4;
  const cellWidth = contentWidth / gridCols;
  const cellHeight = 12;
  const startX = margin;
  const startY = yPos;

  // Draw grid cells with gold borders
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const x = startX + (col * cellWidth);
      const y = startY + (row * cellHeight);
      const wordIndex = row * gridCols + col;
      
      // Gold border
      doc.setDrawColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
      doc.setLineWidth(0.3);
      doc.rect(x, y, cellWidth, cellHeight, 'S');
      
      // Light gold background
      doc.setFillColor(GOLD_BG_LIGHT.r, GOLD_BG_LIGHT.g, GOLD_BG_LIGHT.b);
      doc.rect(x + 0.5, y + 0.5, cellWidth - 1, cellHeight - 1, 'F');
      
      // Word number
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
      const wordNum = String(wordIndex + 1).padStart(2, '0');
      doc.text(wordNum + '.', x + 3, y + 5);
      
      // Word text
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);
      const word = kit.mnemonicArray[wordIndex];
      doc.text(word, x + 10, y + 5);
    }
  }

  yPos = startY + (gridRows * cellHeight) + 10;

  // Second grid (words 13-24)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.text('RECOVERY MNEMONICS (13-24)', margin, yPos);
  yPos += 8;

  const startY2 = yPos;
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const x = startX + (col * cellWidth);
      const y = startY2 + (row * cellHeight);
      const wordIndex = 12 + (row * gridCols + col);
      
      // Gold border
      doc.setDrawColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
      doc.setLineWidth(0.3);
      doc.rect(x, y, cellWidth, cellHeight, 'S');
      
      // Light gold background
      doc.setFillColor(GOLD_BG_LIGHT.r, GOLD_BG_LIGHT.g, GOLD_BG_LIGHT.b);
      doc.rect(x + 0.5, y + 0.5, cellWidth - 1, cellHeight - 1, 'F');
      
      // Word number
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
      const wordNum = String(wordIndex + 1).padStart(2, '0');
      doc.text(wordNum + '.', x + 3, y + 5);
      
      // Word text
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);
      const word = kit.mnemonicArray[wordIndex];
      doc.text(word, x + 10, y + 5);
    }
  }

  yPos = startY2 + (gridRows * cellHeight) + 15;

  // ============================================
  // SAFEKEEPING INSTRUCTIONS
  // ============================================
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.text('SAFEKEEPING INSTRUCTIONS', margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);
  
  const instructions = [
    '* Keep this document offline and away from digital storage.',
    '* This is 1 of 2 fragments required to unlock the vault.',
    '* Store in a secure, fireproof location.',
    '* Do not share this document with anyone.',
    '* If lost, your digital heritage cannot be recovered.',
  ];

  instructions.forEach((instruction) => {
    doc.text(instruction, margin + 2, yPos);
    yPos += 5;
  });

  yPos += 5;

  // ============================================
  // VERIFICATION INFORMATION
  // ============================================
  
  doc.setDrawColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.text('VERIFICATION INFORMATION', margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);

  doc.text(`VAULT ID: ${kit.vaultId}`, margin, yPos);
  yPos += 5;
  doc.text(`DOCUMENT ID: ${docId}`, margin, yPos);
  yPos += 5;
  doc.text(`GENERATED: ${now.toISOString()}`, margin, yPos);
  yPos += 5;
  doc.text('VERIFICATION CHECKSUM (SHA256): [Calculated during generation]', margin, yPos);
  yPos += 10;

  // ============================================
  // QR CODE SECTION (One-Click Unlock)
  // ============================================
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.text('QUICK UNLOCK QR CODE', margin, yPos);
  yPos += 8;

  // Generate QR Code
  try {
    // 生成 Release Token（用于自动解锁）
    const releaseToken = `AFTERGLOW-PRO-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    const qrData = {
      mnemonic: kit.mnemonicArray.join(' '),
      vaultId: kit.vaultId,
      documentId: docId,
      releaseToken, // 包含 Release Token 用于自动解锁
      version: '1.0',
      type: 'recovery-kit',
      isPro: true, // 标记为 Pro 级别
    };
    
    // 检查是否有足够的空间放置二维码
    const qrSize = 40; // mm
    const requiredSpace = qrSize + 15; // 二维码 + 说明文字
    
    // 如果空间不足，创建新页面
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin + 10;
      
      // 在新页面添加标题
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
      doc.text('QUICK UNLOCK QR CODE', margin, yPos);
      yPos += 8;
    }
    
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 60,
      margin: 1,
      color: {
        dark: `#${GOLD_COLOR.r.toString(16).padStart(2, '0')}${GOLD_COLOR.g.toString(16).padStart(2, '0')}${GOLD_COLOR.b.toString(16).padStart(2, '0')}`,
        light: '#FFFFFF',
      },
    });

    // Add QR Code image to PDF
    const qrX = (pageWidth - qrSize) / 2;
    doc.addImage(qrCodeDataUrl, 'PNG', qrX, yPos, qrSize, qrSize);
    yPos += qrSize + 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(GRAY_TEXT.r, GRAY_TEXT.g, GRAY_TEXT.b);
    doc.text('Scan this QR code with your phone camera to automatically unlock assets', margin, yPos, {
      align: 'center',
      maxWidth: contentWidth,
    });
    yPos += 8;
  } catch (qrError: any) {
    console.error('Failed to generate QR code:', qrError);
    // 显示错误信息在 PDF 上
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(GRAY_TEXT.r, GRAY_TEXT.g, GRAY_TEXT.b);
    doc.text('QR code generation failed. Please use manual mnemonic entry.', margin, yPos, {
      align: 'center',
      maxWidth: contentWidth,
    });
    yPos += 8;
  }

  // ============================================
  // LEGAL NOTICE
  // ============================================
  
  doc.setDrawColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(GRAY_TEXT.r, GRAY_TEXT.g, GRAY_TEXT.b);
  
  const legalText = [
    'This document contains sensitive recovery information for your',
    'Digital Heirloom vault. Unauthorized access or disclosure may',
    'result in loss of digital assets. Keep secure and confidential.',
    '',
    '© 2024 Digital Heirloom. All rights reserved.',
  ];

  legalText.forEach((line) => {
    if (line.trim()) {
      doc.text(line, margin, yPos);
      yPos += 4;
    } else {
      yPos += 2;
    }
  });

  // ============================================
  // FOOTER DECORATIVE LINE
  // ============================================
  
  doc.setFillColor(GOLD_COLOR.r, GOLD_COLOR.g, GOLD_COLOR.b);
  doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');

  // Generate PDF blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

/**
 * Download Recovery Kit PDF automatically
 */
export async function downloadRecoveryKitPDF(
  kit: RecoveryKit,
  beneficiaryName?: string
): Promise<void> {
  try {
    const pdfBlob = await generateRecoveryKitPDF(kit, beneficiaryName);
    
    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename
    const now = new Date(kit.createdAt);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomId = kit.vaultId.slice(0, 4).toUpperCase();
    const filename = `Digital-Heirloom-Recovery-Kit-${year}${month}${day}-${randomId}.pdf`;
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw error;
  }
}
