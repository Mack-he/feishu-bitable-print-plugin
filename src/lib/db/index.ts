// 数据库连接配置
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// 创建连接池
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL || 'mysql://user:pass@localhost:3306/db',
  waitForConnections: true,
  connectionLimit: 20,
  idleTimeout: 30000,
});

// 初始化 Drizzle ORM
export const db = drizzle(pool, { schema });
