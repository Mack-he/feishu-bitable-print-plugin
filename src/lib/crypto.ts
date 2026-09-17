// 加密工具 - 用于安全存储授权码
import crypto from 'crypto';

// 从环境变量获取加密密钥（必须是32字节）
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  // 确保密钥是32字节（256位）
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
  return keyBuffer;
};

// 加密数据
export function encrypt(data: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // 128位IV
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    // 返回格式: iv.encrypted.tag (base64编码)
    return JSON.stringify({
      iv: iv.toString('base64'),
      encrypted: encrypted.toString('base64'),
      tag: tag.toString('base64')
    });
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

// 解密数据
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const { iv, encrypted, tag } = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// 生成安全的加密密钥（用于首次设置）
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
