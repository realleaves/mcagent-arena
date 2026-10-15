import { z } from 'zod';
import type { JsonObject, ToolDefinition } from '../../shared/src/types.js';
import { redact } from '../../shared/src/redact.js';
import { ArenaError, delay, asError } from '../../shared/src/errors.js';
export interface ModelConfig {
  id: string;
  label: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  protocol: 'chat' | 'responses';
  temperature: number | null;
  maxOutputTokens: number;
  reasoningEffort: string;
  promptVersion: string;
  available?: boolean;
  error?: string;
}
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
}
export interface ModelTurn {
  content: string | null;
  calls: { id: string; name: string; arguments: string }[];
  usage: number;
  continuation?: JsonObject[];
  responseId?: string;
}
export interface AgentAdapter {
  config: ModelConfig;
  complete(
    messages: Message[],
    tools: ToolDefinition[],
    signal: AbortSignal,
    maxTokens: number,
  ): Promise<ModelTurn>;
}
export function configuredModels(env = process.env): ModelConfig[] {
  return ['A', 'B'].flatMap((slot) => {
    const prefix = `AGENT_${slot}_`;
    const apiKey = env[prefix + 'API_KEY'],
      model = env[prefix + 'MODEL'],
      baseUrl = env[prefix + 'API_BASE_URL'];
    if (!apiKey || !model || !baseUrl) return [];
    const url = new URL(baseUrl);
    if (url.username || url.password || url.search || url.hash)
      throw new ArenaError('PROVIDER_URL', 'Provider Base URL 不能包含账号密码、查询参数或片段');
    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
    )
      throw new ArenaError('PROVIDER_URL', 'Provider 必须使用 HTTPS 或本机 HTTP');
    const protocol =
      env[prefix + 'API_PROTOCOL'] === 'responses' || /^gpt-6\.1-sol|^gpt-6-astra/.test(model)
        ? 'responses'
        : 'chat';
    return [
      {
        id: `provider-${slot.toLowerCase()}`,
        label: `Agent ${slot} · ${model}`,
        model,
        baseUrl: url.pathname === '/' ? url.origin + '/v1' : baseUrl.replace(/\/$/, ''),
        apiKey,
        protocol,
        temperature: protocol === 'responses' ? null : Number(env[prefix + 'TEMPERATURE'] || 0),
        maxOutputTokens: Number(env[prefix + 'MAX_OUTPUT_TOKENS'] || 4000),
        reasoningEffort:
          protocol === 'responses' ? env[prefix + 'REASONING_EFFORT'] || 'low' : 'not_requested',
        promptVersion: 'arena-system-v3',
      },
    ];
  });
}
const call = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({ name: z.string(), arguments: z.string() }),
});
const chatResponse = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({
          content: z.string().nullable().optional(),
          tool_calls: z.array(call).optional(),
        }),
      }),
    )
    .min(1),
  usage: z.object({ total_tokens: z.number().optional() }).optional(),
});
const responseSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  output: z.array(z.record(z.string(), z.unknown())),
  usage: z
    .object({
      total_tokens: z.number().optional(),
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
    })
    .optional(),
});
export class OpenAICompatibleAdapter implements AgentAdapter {
  private responseId?: string;
  private responseInput: JsonObject[] = [];
  private processed = 0;
  constructor(
    public config: ModelConfig,
    private fetcher: typeof fetch = fetch,
  ) {}
  async request(path: string, body: unknown, signal: AbortSignal): Promise<unknown> {
    for (let retry = 0; retry <= 2; retry++) {
      signal.throwIfAborted();
      let r: Response;
      try {
        r = await this.fetcher(this.config.baseUrl + path, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal,
          redirect: 'error',
        });
      } catch (e) {
        throw asError(e);
      }
      if (r.status === 429 && retry < 2) {
        await r.body?.cancel();
        await delay(300 * 2 ** retry, signal);
        continue;
      }
      if (!r.ok) {
        await r.body?.cancel();
        if (r.status === 402)
          throw new ArenaError(
            'PROVIDER_BILLING',
            '模型服务返回 HTTP 402，生成请求被拒绝；请在服务商控制台核对额度、余额或计费权限。',
          );
        throw new ArenaError(
          r.status === 401
            ? 'PROVIDER_AUTH'
            : r.status === 429
              ? 'RATE_LIMIT'
              : r.status === 400
                ? 'PROVIDER_INCOMPATIBLE'
                : 'PROVIDER_HTTP',
          `模型服务返回 HTTP ${r.status}；检查模型名、接口协议与令牌权限。`,
        );
      }
      try {
        return await r.json();
      } catch {
        throw new ArenaError('PROVIDER_RESPONSE', '模型服务返回非 JSON 数据');
      }
    }
    throw new ArenaError('RATE_LIMIT', '模型服务持续限流');
  }
  async complete(
    messages: Message[],
    tools: ToolDefinition[],
    signal: AbortSignal,
    maxTokens: number,
  ): Promise<ModelTurn> {
    const limit = Math.min(this.config.maxOutputTokens, maxTokens);
    if (limit < 1) throw new ArenaError('TOKEN_LIMIT', '模型 Token 预算耗尽', 'model');
    if (this.config.protocol === 'chat') {
      const raw = await this.request(
        '/chat/completions',
        {
          model: this.config.model,
          messages,
          tools: tools.map((t) => ({
            type: 'function',
            function: { name: t.name, description: t.description, parameters: t.inputSchema },
          })),
          temperature: this.config.temperature,
          max_tokens: limit,
          stream: false,
        },
        signal,
      );
      const parsed = chatResponse.safeParse(raw);
      if (!parsed.success)
        throw new ArenaError(
          'PROVIDER_INCOMPATIBLE',
          '模型未返回兼容 tools/tool_calls 的 Chat Completions 数据',
        );
      const m = parsed.data.choices[0]!.message;
      if (parsed.data.choices[0]!.finish_reason === 'length')
        throw new ArenaError('OUTPUT_LIMIT', '模型输出被 Token 上限截断', 'model');
      return {
        content: m.content ?? null,
        calls: (m.tool_calls || []).map((c) => ({
          id: c.id,
          name: c.function.name,
          arguments: c.function.arguments,
        })),
        usage: parsed.data.usage?.total_tokens ?? limit,
      };
    }
    const fresh = messages
      .slice(this.processed)
      .filter((m) => m.role !== 'system')
      .flatMap((m): JsonObject[] => {
        if (m.role === 'tool')
          return [{ type: 'function_call_output', call_id: m.tool_call_id, output: m.content }];
        if (m.role === 'assistant') return [];
        return [{ role: m.role, content: m.content }];
      });
    this.responseInput.push(...fresh);
    const body = {
      model: this.config.model,
      instructions: messages
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n'),
      input: this.responseId ? fresh : this.responseInput,
      previous_response_id: this.responseId,
      store: true,
      tools: tools.map((t) => ({
        type: 'function',
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
        strict: false,
      })),
      max_output_tokens: limit,
      reasoning: { effort: this.config.reasoningEffort },
      stream: false,
    };
    const raw = await this.request('/responses', body, signal);
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success)
      throw new ArenaError(
        'PROVIDER_INCOMPATIBLE',
        '模型未返回兼容的 Responses 数据；中转站可能不支持 Responses',
      );
    const r = parsed.data;
    if (r.status === 'incomplete')
      throw new ArenaError('OUTPUT_LIMIT', '模型输出被 Token 上限截断', 'model');
    const calls = r.output
      .filter((o) => o.type === 'function_call')
      .map((o) => {
        const c = z
          .object({ call_id: z.string(), name: z.string(), arguments: z.string() })
          .safeParse(o);
        if (!c.success)
          throw new ArenaError('PROVIDER_INCOMPATIBLE', 'Responses function_call 格式不兼容');
        return { id: c.data.call_id, name: c.data.name, arguments: c.data.arguments };
      });
    const content = r.output
      .filter((o) => o.type === 'message')
      .flatMap((o) => (Array.isArray(o.content) ? o.content : []))
      .filter((o) => o && typeof o === 'object' && o.type === 'output_text')
      .map((o) => String(o.text))
      .join('\n');
    this.processed = messages.length;
    this.responseId = r.id;
    if (!r.id) {
      this.responseInput.push(
        ...r.output.filter((o) => o.type === 'function_call' || o.type === 'message'),
      );
    }
    return {
      content: content || null,
      calls,
      usage:
        r.usage?.total_tokens ?? (r.usage?.input_tokens || 0) + (r.usage?.output_tokens || limit),
      responseId: r.id,
    };
  }
}
export async function modelAvailability(config: ModelConfig): Promise<ModelConfig> {
  try {
    const r = await fetch(config.baseUrl + '/models', {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    if (!r.ok) return { ...config, available: false, error: `模型列表 HTTP ${r.status}` };
    const data = z.object({ data: z.array(z.object({ id: z.string() })) }).parse(await r.json());
    return {
      ...config,
      available: data.data.some((m) => m.id === config.model),
      error: data.data.some((m) => m.id === config.model)
        ? undefined
        : '配置的模型名不在服务端模型列表中（区分大小写）',
    };
  } catch {
    return { ...config, available: false, error: '无法验证服务端模型列表' };
  }
}
export function publicModel(config: ModelConfig) {
  const { apiKey: _key, baseUrl: _base, ...safe } = config;
  return redact(safe, [config.apiKey].filter(Boolean)) as Omit<ModelConfig, 'apiKey' | 'baseUrl'>;
}
