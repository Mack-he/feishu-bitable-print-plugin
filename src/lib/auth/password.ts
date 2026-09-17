// 密码工具 - 用于密码哈希和验证
import bcrypt from 'bcryptjs';

// bcrypt 工作因子（越高越安全但越慢）
const SALT_ROUNDS = 12;

// 哈希密码
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const isValid = await bcrypt.compare(password, hash);
  return isValid;
}

// 同步版本（用于初始化脚本）
export function hashPasswordSync(password: string): string {
  const salt = bcrypt.genSaltSync(SALT_ROUNDS);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
}
