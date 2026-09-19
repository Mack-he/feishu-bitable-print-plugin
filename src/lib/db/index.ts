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
      // 池上限调小：本应用并发不高，过大反而容易在热更新/多进程时占满数据库连接
      connectionLimit: 10,
      idleTimeout: 30000,
    };
  }

  return {
    uri: process.env.DATABASE_URL || 'mysql://user:pass@localhost:3306/db',
    waitForConnections: true,
    connectionLimit: 10,
    idleTimeout: 30000,
  };
}

// 创建连接池并初始化 Drizzle ORM
function createDb() {
  return drizzle(mysql.createPool(getPoolConfig()), { schema, mode: 'default' });
}

// 【重要】连接池挂在 globalThis 上：Next dev 热更新会重新执行本模块，
// 若不缓存会反复新建连接池，旧池连接不释放，最终把数据库连接数打满
// （表现为 "Too many connections"，所有 INSERT 都失败）。
const globalForDb = globalThis as unknown as { __printPluginDb?: ReturnType<typeof createDb> };

export const db = globalForDb.__printPluginDb ?? createDb();
globalForDb.__printPluginDb = db;
