import { db } from '@/lib/db';
import { systemConfigs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 配置缓存
const configCache: Map<string, { value: string; expireAt: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取系统配置
 * 优先从缓存读取，其次从数据库，最后从环境变量
 */
export async function getSystemConfig(key: string): Promise<string | null> {
  const now = Date.now();

  // 1. 检查缓存
  const cached = configCache.get(key);
  if (cached && now < cached.expireAt) {
    console.log(`[System Config] 使用缓存配置: ${key}`);
    return cached.value;
  }

  try {
    // 2. 从数据库读取
    const config = await db.query.systemConfigs.findFirst({
      where: eq(systemConfigs.key, key),
    });

    if (config) {
      console.log(`[System Config] 从数据库读取配置: ${key}`);
      // 更新缓存
      configCache.set(key, {
        value: config.value,
        expireAt: now + CACHE_TTL,
      });
      return config.value;
    }
  } catch (error) {
    console.error(`[System Config] 从数据库读取配置失败: ${key}`, error);
  }

  // 3. 从环境变量读取
  const envValue = process.env[key];
  if (envValue) {
    console.log(`[System Config] 从环境变量读取配置: ${key}`);
    return envValue;
  }

  console.warn(`[System Config] 配置不存在: ${key}`);
  return null;
}

/**
 * 批量获取系统配置
 */
export async function getSystemConfigs(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};

  for (const key of keys) {
    result[key] = await getSystemConfig(key);
  }

  return result;
}

/**
 * 清除配置缓存
 */
export function clearConfigCache(key?: string): void {
  if (key) {
    configCache.delete(key);
    console.log(`[System Config] 清除配置缓存: ${key}`);
  } else {
    configCache.clear();
    console.log('[System Config] 清除所有配置缓存');
  }
}
