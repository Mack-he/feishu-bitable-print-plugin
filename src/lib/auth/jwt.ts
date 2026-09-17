// JWT 工具 - 用于用户和管理员认证
import jwt from 'jsonwebtoken';

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7天过期
const ADMIN_JWT_EXPIRES_IN = '24h'; // 管理员24小时过期

// 用户 JWT 负载
export interface UserJwtPayload {
  userId: number;
  feishuUserId: string;
  type: 'user';
}

// 管理员 JWT 负载
export interface AdminJwtPayload {
  adminId: number;
  username: string;
  type: 'admin';
}

// 通用 JWT 负载
export type JwtPayload = UserJwtPayload | AdminJwtPayload;

// 生成用户 Token
export function generateUserToken(payload: UserJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// 生成管理员 Token
export function generateAdminToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ADMIN_JWT_EXPIRES_IN });
}

// 验证 Token
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

// 从请求头中提取 Token
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) return null;
  return token;
}

// 验证并获取用户信息
export function verifyUserToken(token: string): UserJwtPayload | null {
  const payload = verifyToken(token);
  if (!payload || payload.type !== 'user') return null;
  return payload as UserJwtPayload;
}

// 验证并获取管理员信息
export function verifyAdminToken(token: string): AdminJwtPayload | null {
  const payload = verifyToken(token);
  if (!payload || payload.type !== 'admin') return null;
  return payload as AdminJwtPayload;
}
