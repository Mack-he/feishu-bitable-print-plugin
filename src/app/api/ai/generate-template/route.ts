import { NextResponse } from 'next/server';
import { authenticate } from '@/app/api/templates/_shared';
import { getSystemConfig } from '@/lib/system-config';
import {
  AiGenerateRequest,
  buildSystemPrompt,
  buildUserPrompt,
  normalizeGeneratedTemplate,
} from '@/lib/ai/template-spec';
import { generateTemplateByRules } from '@/lib/ai/rule-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** 允许用户填 https://api.deepseek.com / https://api.deepseek.com/v1 / 完整 endpoint 三种写法 */
function resolveChatCompletionsUrl(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(base)) return base;
  if (/\/(v\d+|compatible-mode\/v\d+)$/i.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

/** 大模型经常把 JSON 包在 ```json 代码块或解释文字里，这里做容错提取 */
function extractJson(content: string): any | null {
  if (!content) return null;
  let text = content.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  try {
    return JSON.parse(text);
  } catch {
    // 继续尝试截取第一个 { 到最后一个 }
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

interface ChatCallResult {
  content: string;
  usage?: unknown;
  model?: string;
}

async function callChatCompletion(options: {
  url: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userContent: any;
  timeoutMs: number;
  useJsonMode: boolean;
}): Promise<ChatCallResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(options.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        temperature: 0.3,
        max_tokens: 4096,
        stream: false,
        ...(options.useJsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userContent },
        ],
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    if (!response.ok) {
      const error = new Error(`大模型接口返回 ${response.status}: ${raw.slice(0, 300)}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error('大模型返回内容不是合法 JSON');
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('大模型没有返回内容');
    }

    return { content, usage: payload?.usage, model: payload?.model };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const auth = authenticate(request);
  if ('error' in auth) return auth.error;

  let body: AiGenerateRequest;
  try {
    body = (await request.json()) as AiGenerateRequest;
  } catch {
    return NextResponse.json({ success: false, error: '请求体格式错误' }, { status: 400 });
  }

  if (!body || (body.mode !== 'natural' && body.mode !== 'layout' && body.mode !== 'image')) {
    return NextResponse.json({ success: false, error: '不支持的生成方式' }, { status: 400 });
  }

  const fields = Array.isArray(body.fields) ? body.fields.slice(0, 60) : [];
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ ...body, fields });

  const ruleFallback = (notice: string, detail?: string) => {
    const normalized = normalizeGeneratedTemplate(generateTemplateByRules({ ...body, fields }), {
      fields,
      pageConfig: body.pageConfig,
    });
    return NextResponse.json({
      success: true,
      data: {
        template: normalized,
        mode: 'rule' as const,
        model: null,
        notice,
        detail: detail ?? null,
      },
    });
  };

  const apiKey = await getSystemConfig('AI_API_KEY');
  if (!apiKey) {
    return ruleFallback('未配置大模型 API Key，已用内置规则生成。配置入口：后台管理 → 系统设置 → AI 大模型。');
  }

  const baseUrl = (await getSystemConfig('AI_API_BASE_URL')) || DEFAULT_BASE_URL;
  const model = (await getSystemConfig('AI_MODEL')) || DEFAULT_MODEL;
  const timeoutMs = Number(await getSystemConfig('AI_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS;
  const url = resolveChatCompletionsUrl(baseUrl);

  const imageDataUrl =
    body.mode === 'image' && typeof body.imageDataUrl === 'string' && /^data:image\/[a-z+]+;base64,/i.test(body.imageDataUrl)
      ? body.imageDataUrl
      : null;

  const visionUsable = imageDataUrl !== null && imageDataUrl.length <= MAX_IMAGE_BYTES;

  const buildUserContent = (withImage: boolean) => {
    if (!withImage || !visionUsable) return userPrompt;
    return [
      { type: 'text', text: userPrompt },
      { type: 'image_url', image_url: { url: imageDataUrl } },
    ];
  };

  const attempts: { useJsonMode: boolean; withImage: boolean; label: string }[] = [
    { useJsonMode: true, withImage: visionUsable, label: '首次请求' },
    { useJsonMode: false, withImage: visionUsable, label: '重试（不带 JSON 模式）' },
    { useJsonMode: false, withImage: false, label: '重试（不带图片）' },
  ];

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      const result = await callChatCompletion({
        url,
        apiKey,
        model,
        systemPrompt,
        userContent: buildUserContent(attempt.withImage),
        timeoutMs,
        useJsonMode: attempt.useJsonMode,
      });

      const parsed = extractJson(result.content);
      if (!parsed) {
        errors.push(`${attempt.label}：返回内容无法解析为 JSON`);
        continue;
      }

      const normalized = normalizeGeneratedTemplate(parsed, { fields, pageConfig: body.pageConfig });
      if (normalized.components.length === 0) {
        errors.push(`${attempt.label}：返回的组件全部不合法`);
        continue;
      }

      return NextResponse.json({
        success: true,
        data: {
          template: normalized,
          mode: 'ai' as const,
          model: result.model || model,
          notice:
            normalized.unknownVariables.length > 0
              ? `有 ${normalized.unknownVariables.length} 个变量不在当前表格字段中，使用时需要手动替换`
              : null,
          detail: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${attempt.label}：${message}`);

      // 认证/额度/超时类错误重试没有意义，直接兜底，避免让用户等三次超时
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 403 || status === 429) break;
      if ((error as Error)?.name === 'AbortError') break;
    }
  }

  console.error('[AI Generate] 大模型调用失败，回退到本地规则生成:', errors.join(' | '));
  return ruleFallback('大模型调用失败，已用内置规则生成。可在后台设置中检查 AI 配置。', errors.join(' | '));
}