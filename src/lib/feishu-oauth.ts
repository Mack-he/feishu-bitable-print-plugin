import { getSystemConfig } from './system-config';

// 飞书 OAuth 2.0 客户端
interface AppAccessTokenCache {
  token: string;
  expireAt: number; // 过期时间戳（毫秒）
}

interface UserAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  user_id: string;
  union_id: string;
  open_id: string;
}

interface UserInfo {
  user_id: string;
  union_id: string;
  open_id: string;
  name: string;
  avatar_url?: string;
  avatar_thumb?: string;
  avatar_middle?: string;
  avatar_big?: string;
  mobile?: string;
  email?: string;
  tenant_key: string;
}

interface FeishuApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  // 飞书 API 有时会直接在根级别返回数据
  app_access_token?: string;
  expire?: number;
  tenant_access_token?: string;
}

let appAccessTokenCache: AppAccessTokenCache | null = null;

/**
 * 获取应用访问令牌 (App Access Token)
 * 带缓存机制，有效期2小时，提前10分钟刷新
 */
export async function getAppAccessToken(): Promise<string> {
  const now = Date.now();
  
  // 如果缓存有效且未过期（提前10分钟刷新）
  if (appAccessTokenCache && now < appAccessTokenCache.expireAt - 10 * 60 * 1000) {
    console.log('[Feishu OAuth] 使用缓存的 app_access_token');
    return appAccessTokenCache.token;
  }

  console.log('[Feishu OAuth] 获取新的 app_access_token');
  
  // 从系统配置读取，支持数据库配置和环境变量
  const appId = await getSystemConfig('FEISHU_APP_ID');
  const appSecret = await getSystemConfig('FEISHU_APP_SECRET');

  if (!appId || !appSecret) {
    throw new Error('FEISHU_APP_ID 或 FEISHU_APP_SECRET 未配置');
  }

  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  const result: FeishuApiResponse<{ app_access_token: string; expire: number }> = await response.json();

  console.log('[Feishu OAuth] 飞书 API 响应:', result);

  if (result.code !== 0) {
    console.error('[Feishu OAuth] 获取 app_access_token 失败:', result);
    throw new Error(`获取飞书访问令牌失败: ${result.msg}`);
  }

  // 飞书 API 响应格式：app_access_token 直接在根级别
  if (result.app_access_token && result.expire) {
    // 缓存 token，expire 单位是秒，转换为毫秒
    appAccessTokenCache = {
      token: result.app_access_token,
      expireAt: now + result.expire * 1000,
    };
  } else if (result.data && result.data.app_access_token && result.data.expire) {
    // 兼容旧格式
    appAccessTokenCache = {
      token: result.data.app_access_token,
      expireAt: now + result.data.expire * 1000,
    };
  } else {
    console.error('[Feishu OAuth] 飞书 API 返回数据格式错误:', result);
    throw new Error('飞书 API 返回数据格式错误');
  }

  // 根据实际格式获取 expire 值
  const expireValue = result.expire || (result.data && result.data.expire);
  console.log('[Feishu OAuth] app_access_token 获取成功，有效期:', expireValue, '秒');
  return appAccessTokenCache.token;
}

/**
 * 生成 OAuth 授权 URL
 */
export async function getOAuthUrl(state: string): Promise<string> {
  // 从系统配置读取，支持数据库配置和环境变量
  const appId = await getSystemConfig('FEISHU_APP_ID');
  const redirectUri = await getSystemConfig('FEISHU_REDIRECT_URI');

  console.log('[Feishu OAuth] 配置信息:', {
    appId: appId ? `${appId.substring(0, 8)}...` : null,
    redirectUri,
  });

  if (!appId || !redirectUri) {
    throw new Error('FEISHU_APP_ID 或 FEISHU_REDIRECT_URI 未配置');
  }

  // 飞书要求 redirect_uri 必须与应用后台配置完全一致
  // URLSearchParams 会自动对参数进行编码
  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: state,
  });

  const oauthUrl = `https://open.feishu.cn/open-apis/authen/v1/index?${params.toString()}`;
  console.log('[Feishu OAuth] 生成的授权 URL:', oauthUrl);

  return oauthUrl;
}

/**
 * 使用授权码获取用户访问令牌
 */
export async function getUserAccessToken(code: string): Promise<UserAccessTokenResponse> {
  console.log('[Feishu OAuth] 使用授权码获取用户访问令牌');
  
  const appAccessToken = await getAppAccessToken();
  const redirectUri = await getSystemConfig('FEISHU_REDIRECT_URI');

  const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appAccessToken}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri || undefined,
    }),
  });

  const result: FeishuApiResponse<UserAccessTokenResponse> = await response.json();

  console.log('[Feishu OAuth] 用户访问令牌 API 响应:', result);

  if (result.code !== 0) {
    console.error('[Feishu OAuth] 获取用户访问令牌失败:', result);
    throw new Error(`获取用户访问令牌失败: ${result.msg}`);
  }

  // 处理可能的响应格式
  let userTokenData: UserAccessTokenResponse;
  if (result.data) {
    userTokenData = result.data;
  } else {
    // 如果没有 data 字段，直接使用根级别数据
    userTokenData = result as unknown as UserAccessTokenResponse;
  }

  console.log('[Feishu OAuth] 获取用户访问令牌成功');
  return userTokenData;
}

/**
 * 使用用户访问令牌获取用户信息
 */
export async function getUserInfo(userAccessToken: string): Promise<UserInfo> {
  console.log('[Feishu OAuth] 获取用户信息');

  const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userAccessToken}`,
    },
  });

  const result: FeishuApiResponse<UserInfo> = await response.json();

  console.log('[Feishu OAuth] 用户信息 API 响应:', result);

  if (result.code !== 0) {
    console.error('[Feishu OAuth] 获取用户信息失败:', result);
    throw new Error(`获取用户信息失败: ${result.msg}`);
  }

  // 处理可能的响应格式
  let userInfo: UserInfo;
  if (result.data) {
    userInfo = result.data;
  } else {
    // 如果没有 data 字段，直接使用根级别数据
    userInfo = result as unknown as UserInfo;
  }

  console.log('[Feishu OAuth] 获取用户信息成功:', {
    union_id: userInfo.union_id,
    name: userInfo.name,
  });

  return userInfo;
}
