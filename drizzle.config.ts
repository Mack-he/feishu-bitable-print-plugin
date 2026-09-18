import { defineConfig } from 'drizzle-kit';

// 优先使用离散的键值对配置（密码可含特殊字符），否则回退到 DATABASE_URL
const host = process.env.DATABASE_HOST;
const port = process.env.DATABASE_PORT;
const user = process.env.DATABASE_USER;
const password = process.env.DATABASE_PASSWORD;
const database = process.env.DATABASE_NAME;

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: host && user && database
    ? {
        host,
        port: port ? parseInt(port, 10) : 3306,
        user,
        password: password ?? '',
        database,
      }
    : {
        url: process.env.DATABASE_URL || 'mysql://user:pass@localhost:3306/db',
      },
});