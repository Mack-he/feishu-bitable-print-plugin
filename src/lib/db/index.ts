// 数据库连接配置
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// 连接池配置：
// 优先使用离散的键值对环境变量（密码可含 @ 等特殊字符）
// 否则回退到 DATABASE_URL 连接串
function getPoolConfig() {
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT;
  const user = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD;
  const database = process.env.DATABASE_NAME;

  if (host && user && database) {
    return {
      host,
      port: port ? parseInt(port, 10) : 3306,
      user,
      password: password ?? '',
      database,
      waitForConnections: true,
      connectionLimit: 20,
      idleTimeout: 30000,
    };
  }

  return {
    uri: process.env.DATABASE_URL || 'mysql://user:pass@localhost:3306/db',
    waitForConnections: true,
    connectionLimit: 20,
    idleTimeout: 30000,
  };
}

// 创建连接池
const pool = mysql.createPool(getPoolConfig());

// 初始化 Drizzle ORM
export const db = drizzle(pool, { schema, mode: 'default' });