/**
 * HeirloomDocument Component
 * Heirloom-Gold 风格的文档组件
 * 用于物理分片打印（Fragment A 和 Fragment B）
 * 
 * 注意：不修改 ShipAny 结构，仅为 Digital Heirloom 打印功能
 */

'use client';

interface HeirloomDocumentProps {
  fragment: 'A' | 'B';
  documentId: string;
  generatedAt: string;
  expiresAt: string;
  beneficiary: string;
  keyContent: string[]; // 助记词数组（12个单词）
  checksum: string;
  language?: string; // 'en' | 'zh' | 'fr'
}

export function HeirloomDocument({
  fragment,
  documentId,
  generatedAt,
  expiresAt,
  beneficiary,
  keyContent,
  checksum,
  language = 'en',
}: HeirloomDocumentProps) {
  const isFragmentA = fragment === 'A';
  
  // 根据语言选择翻译
  // 如果 next-intl 可用，使用它；否则使用硬编码的多语言映射
  const t = (key: string) => {
    // 简化的多语言映射（实际应该使用 next-intl）
    const translations: Record<string, Record<string, string>> = {
      en: {
        'print.greeting': 'Dear Beneficiary,',
        'print.letterContent': 'This document is the physical key to decrypt your digital legacy. Please keep it safe and use it together with Fragment B.',
        'print.important': 'Important:',
        'print.warning1': 'This document consists of two parts: Fragment A (Index) and Fragment B (Secret)',
        'print.warning2': 'Both parts must be used together to decrypt the digital legacy',
        'print.warning3': 'Store both parts separately for security',
        'print.warning4': 'Do not allow unauthorized persons to view this document',
        'print.indexKey': 'Index Key:',
        'print.mnemonicPhraseA': 'Mnemonic Phrase (Part A):',
        'print.mnemonicPhraseB': 'Mnemonic Phrase (Part B):',
        'print.securityWarning': '⚠️ WARNING: UNAUTHORIZED OPENING PROHIBITED | STORE IN SAFE AFTER VIEWING',
        'print.scratchInstruction': '[Apply scratch-off silver coating here by administrator]',
        'print.coreSecret': 'Core Secret (visible after scratching):',
        'print.securityNotice': 'Security Notice:',
        'print.security1': 'This key must be used together with Fragment A to decrypt the digital legacy',
        'print.security2': 'Ensure the scratch-off coating is intact and undamaged',
        'print.security3': 'Recommend storing both fragments in separate secure locations',
        'print.security4': 'Recommend using a safe or bank safety deposit box',
        'print.checksum': 'Checksum (SHA256):',
        'print.footerText': 'This page has been manually verified and shipped by administrator',
        'print.printDate': 'Print Date',
        'print.vaultId': 'Vault ID',
        'print.title': 'DIGITAL HEIRLOOM - PHYSICAL RECOVERY KIT',
        'print.fragmentA': 'FRAGMENT',
        'print.fragmentB': 'FRAGMENT',
        'print.shardA': 'SHARD A: INDEX KEY',
        'print.shardB': 'SHARD B: THE CORE SECRET',
        'print.proEdition': 'PRO EDITION',
        'print.documentId': 'Document ID',
        'print.generatedAt': 'Generated',
        'print.expiresAt': 'Expires',
        'print.beneficiary': 'Beneficiary',
      },
      zh: {
        'print.greeting': '亲爱的受益人：',
        'print.letterContent': '这份文档是数字遗产解密的物理密钥。请妥善保管，并配合分片 B 共同使用。',
        'print.important': '重要提示：',
        'print.warning1': '此文档分为两部分：分片 A（索引）和分片 B（密钥）',
        'print.warning2': '两部分必须同时使用才能解密数字遗产',
        'print.warning3': '请将两部分分开保存，确保安全性',
        'print.warning4': '严禁非授权人员查看此文档',
        'print.indexKey': '索引密钥：',
        'print.mnemonicPhraseA': '助记词（第一部分）：',
        'print.mnemonicPhraseB': '助记词（第二部分）：',
        'print.securityWarning': '⚠️ 警告：严禁非授权人员拆封 | 阅后请存入保险柜',
        'print.scratchInstruction': '[此处由管理员贴上刮刮银涂层]',
        'print.coreSecret': '核心密钥（刮开后可见）：',
        'print.securityNotice': '安全提示：',
        'print.security1': '此密钥与分片 A 配合使用才能解密数字遗产',
        'print.security2': '请确保刮刮银涂层完整，未被破坏',
        'print.security3': '建议将两部分分别存放在不同地点',
        'print.security4': '建议使用保险柜或银行保管箱保存',
        'print.checksum': '校验和（SHA256）：',
        'print.footerText': '此页由管理员人工核验并发货',
        'print.printDate': '打印日期',
        'print.vaultId': '保险箱编号',
        'print.title': '数字遗产 - 物理恢复包',
        'print.fragmentA': '分片',
        'print.fragmentB': '分片',
        'print.shardA': '分片 A：索引密钥',
        'print.shardB': '分片 B：核心密钥',
        'print.proEdition': '专业版',
        'print.documentId': '文档编号',
        'print.generatedAt': '生成时间',
        'print.expiresAt': '过期时间',
        'print.beneficiary': '受益人',
      },
      fr: {
        'print.greeting': 'Cher Bénéficiaire,',
        'print.letterContent': 'Ce document est la clé physique pour décrypter votre héritage numérique. Veuillez le conserver en sécurité et l\'utiliser avec le Fragment B.',
        'print.important': 'Important :',
        'print.warning1': 'Ce document se compose de deux parties : Fragment A (Index) et Fragment B (Secret)',
        'print.warning2': 'Les deux parties doivent être utilisées ensemble pour décrypter l\'héritage numérique',
        'print.warning3': 'Stockez les deux parties séparément pour la sécurité',
        'print.warning4': 'Ne permettez pas à des personnes non autorisées de consulter ce document',
        'print.indexKey': 'Clé d\'index :',
        'print.mnemonicPhraseA': 'Phrase mnémonique (Partie A) :',
        'print.mnemonicPhraseB': 'Phrase mnémonique (Partie B) :',
        'print.securityWarning': '⚠️ AVERTISSEMENT : OUVERTURE NON AUTORISÉE INTERDITE | CONSERVEZ DANS UN COFFRE-FORT APRÈS CONSULTATION',
        'print.scratchInstruction': '[Appliquer le revêtement argenté à gratter ici par l\'administrateur]',
        'print.coreSecret': 'Secret central (visible après grattage) :',
        'print.securityNotice': 'Avis de sécurité :',
        'print.security1': 'Cette clé doit être utilisée avec le Fragment A pour décrypter l\'héritage numérique',
        'print.security2': 'Assurez-vous que le revêtement à gratter est intact et non endommagé',
        'print.security3': 'Recommandation : stockez les deux fragments dans des emplacements sécurisés séparés',
        'print.security4': 'Recommandation : utilisez un coffre-fort ou un coffre de banque',
        'print.checksum': 'Somme de contrôle (SHA256) :',
        'print.footerText': 'Cette page a été vérifiée manuellement et expédiée par l\'administrateur',
        'print.printDate': 'Date d\'impression',
        'print.vaultId': 'ID du coffre',
        'print.title': 'Héritage Numérique - Kit de Récupération Physique',
        'print.fragmentA': 'FRAGMENT',
        'print.fragmentB': 'FRAGMENT',
        'print.shardA': 'FRAGMENT A : CLÉ D\'INDEX',
        'print.shardB': 'FRAGMENT B : LE SECRET CENTRAL',
        'print.proEdition': 'ÉDITION PRO',
        'print.documentId': 'ID du document',
        'print.generatedAt': 'Généré le',
        'print.expiresAt': 'Expire le',
        'print.beneficiary': 'Bénéficiaire',
      },
    };
    
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <div className={`heirloom-document fragment-${fragment.toLowerCase()}`}>
      {/* 文档头部 - 金色边框 */}
      <header className="gold-border">
        <h1 className="document-title">
          {language === 'zh' 
            ? '数字遗产 - 物理恢复包'
            : language === 'fr'
            ? 'Héritage Numérique - Kit de Récupération Physique'
            : 'DIGITAL HEIRLOOM - PHYSICAL RECOVERY KIT'
          }
        </h1>
        <div className="watermark">{t('print.proEdition')}</div>
        <div className="fragment-badge">
          FRAGMENT {fragment}
        </div>
      </header>

      {/* 文档信息区 */}
      <section className="document-info">
        <div className="info-row">
          <span className="info-label">{t('print.documentId')}:</span>
          <span className="info-value font-mono">{documentId}</span>
        </div>
        <div className="info-row">
          <span className="info-label">{t('print.generatedAt')}:</span>
          <span className="info-value">{generatedAt}</span>
        </div>
        <div className="info-row">
          <span className="info-label">{t('print.expiresAt')}:</span>
          <span className="info-value">{expiresAt}</span>
        </div>
        <div className="info-row">
          <span className="info-label">{t('print.beneficiary')}:</span>
          <span className="info-value font-semibold">{beneficiary}</span>
        </div>
      </section>

      {/* 分片内容区 */}
      <section className="shard-content">
        <h2 className="shard-title">
          {isFragmentA ? t('print.shardA') : t('print.shardB')}
        </h2>

        {isFragmentA ? (
          /* Fragment A: 索引密钥 */
          <>
            <div className="letter-content">
              <p className="greeting">{t('print.greeting')}</p>
              <p className="content-text">
                {t('print.letterContent')}
              </p>
              <div className="warning-box">
                <strong>{t('print.important')}</strong>
                <ul>
                  <li>{t('print.warning1')}</li>
                  <li>{t('print.warning2')}</li>
                  <li>{t('print.warning3')}</li>
                  <li>{t('print.warning4')}</li>
                </ul>
              </div>
            </div>

            <div className="key-display">
              <p className="key-label">{t('print.indexKey')}</p>
              <div className="key-value font-mono">
                {keyContent.join(' ')}
              </div>
            </div>

            <div className="mnemonic-grid">
              <p className="mnemonic-label">{t('print.mnemonicPhraseA')}</p>
              <div className="mnemonic-words">
                {keyContent.map((word, index) => (
                  <div key={index} className="mnemonic-word">
                    <span className="word-number">{String(index + 1).padStart(2, '0')}.</span>
                    <span className="word-text font-mono">{word}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Fragment B: 核心密钥 */
          <>
            <div className="security-header">
              <p className="security-warning">
                {t('print.securityWarning')}
              </p>
            </div>

            <div className="scratch-card-area">
              <p className="scratch-instruction">
                {t('print.scratchInstruction')}
              </p>
              <div className="secret-text">
                <p className="secret-label">{t('print.coreSecret')}</p>
                <div className="secret-value font-mono">
                  {keyContent.join(' ')}
                </div>
              </div>
            </div>

            <div className="mnemonic-grid">
              <p className="mnemonic-label">{t('print.mnemonicPhraseB')}</p>
              <div className="mnemonic-words">
                {keyContent.map((word, index) => (
                  <div key={index} className="mnemonic-word">
                    <span className="word-number">{String(index + 13).padStart(2, '0')}.</span>
                    <span className="word-text font-mono">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="security-notice">
              <strong>{t('print.securityNotice')}</strong>
              <ul>
                <li>{t('print.security1')}</li>
                <li>{t('print.security2')}</li>
                <li>{t('print.security3')}</li>
                <li>{t('print.security4')}</li>
              </ul>
            </div>
          </>
        )}

        {/* Checksum 验证 */}
        <div className="checksum-section">
          <p className="checksum-label">{t('print.checksum')}</p>
          <p className="checksum-value font-mono text-xs">{checksum}</p>
        </div>
      </section>

      {/* 文档底部 */}
      <footer className="document-footer">
        <p className="footer-text">
          {t('print.footerText')} | {t('print.printDate')}: {generatedAt.split(' at ')[0]}
        </p>
        <p className="footer-id">{t('print.vaultId')}: {documentId}</p>
      </footer>
    </div>
  );
}

