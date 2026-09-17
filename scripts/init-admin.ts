// 初始化管理员账号脚本
// 运行方式: npx tsx scripts/init-admin.ts

import { hashPasswordSync } from '@/lib/auth/password';

console.log('='.repeat(60));
console.log('管理员账号初始化脚本');
console.log('='.repeat(60));
console.log('');

// 初始账号配置
const INITIAL_ADMIN = {
  username: 'fsadmins',
  password: 'Xxy94128866',
  name: '系统管理员',
  email: 'admin@example.com',
};

console.log('初始账号信息:');
console.log('  用户名:', INITIAL_ADMIN.username);
console.log('  密码:', INITIAL_ADMIN.password);
console.log('  姓名:', INITIAL_ADMIN.name);
console.log('  邮箱:', INITIAL_ADMIN.email);
console.log('');

// 生成密码哈希
console.log('正在生成密码哈希...');
const passwordHash = hashPasswordSync(INITIAL_ADMIN.password);
console.log('密码哈希生成完成!');
console.log('');

// 输出 SQL 插入语句
console.log('请执行以下 SQL 语句插入初始管理员账号:');
console.log('');
console.log('INSERT INTO admins (username, password_hash, name, email, is_active, created_at, updated_at)');
console.log(`VALUES ('${INITIAL_ADMIN.username}', '${passwordHash}', '${INITIAL_ADMIN.name}', '${INITIAL_ADMIN.email}', true, NOW(), NOW());`);
console.log('');
console.log('或者使用 Drizzle ORM 方式插入:');
console.log('');
console.log(`await db.insert(admins).values({
  username: '${INITIAL_ADMIN.username}',
  passwordHash: '${passwordHash}',
  name: '${INITIAL_ADMIN.name}',
  email: '${INITIAL_ADMIN.email}',
  isActive: true,
});`);
console.log('');
console.log('='.repeat(60));
console.log('初始化信息生成完成!');
console.log('请妥善保管初始账号密码。');
console.log('='.repeat(60));
