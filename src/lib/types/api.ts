// API 通用类型定义

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 用户相关类型
export interface User {
  id: number;
  feishuUserId: string;
  feishuUnionId?: string;
  name?: string;
  avatar?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

// 用户表格授权类型（核心）
export interface UserTableAuthorization {
  id: number;
  userId: number;
  tableId: string;
  tableName?: string;
  // appToken 只在创建/更新时传入，返回时不包含（安全考虑）
  appToken?: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 创建授权码请求
export interface CreateAuthorizationRequest {
  tableId: string;
  tableName?: string;
  appToken: string;
}

// 更新授权码请求
export interface UpdateAuthorizationRequest {
  appToken?: string;
  tableName?: string;
  isActive?: boolean;
}

// 模板相关类型
export interface Template {
  id: number;
  userId: number;
  name: string;
  description?: string;
  thumbnail?: string;
  data: any;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  thumbnail?: string;
  data: any;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  thumbnail?: string;
  data?: any;
  isPublic?: boolean;
}

// 飞书相关类型
export interface FeishuUserInfo {
  sub: string;
  name: string;
  picture: string;
  email: string;
  union_id?: string;
}

// 登录响应
export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  hasAuthorizations: boolean;
}

// 获取当前用户响应
export interface MeResponse {
  success: boolean;
  user: User;
  authorizations: UserTableAuthorization[];
}

// ========== 管理员相关类型 ==========

// 管理员类型
export interface Admin {
  id: number;
  username: string;
  name?: string;
  email?: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 管理员登录请求
export interface AdminLoginRequest {
  username: string;
  password: string;
}

// 管理员登录响应
export interface AdminLoginResponse {
  success: boolean;
  token: string;
  admin: Admin;
}

// 管理员创建请求
export interface CreateAdminRequest {
  username: string;
  password: string;
  name?: string;
  email?: string;
}

// 管理员更新请求
export interface UpdateAdminRequest {
  name?: string;
  email?: string;
  avatar?: string;
  password?: string;
  isActive?: boolean;
}
