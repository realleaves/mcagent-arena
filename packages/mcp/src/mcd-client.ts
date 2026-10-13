import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import type { JsonObject, ToolProvider, ToolDefinition } from '../../shared/src/types.js';
import { ArenaError, asError } from '../../shared/src/errors.js';
import { redact } from '../../shared/src/redact.js';
import { liveLimiter } from './rate-limiter.js';
export const READ_ONLY_TOOLS = [
  'list-nutrition-foods',
  'campaign-calendar',
  'now-time-info',
] as const;
export class McdClient implements ToolProvider {
  readonly source = 'live' as const;
  private client?: Client;
  private transport?: StreamableHTTPClientTransport;
  private connecting?: Promise<void>;
  constructor(
    private url = process.env.MCD_MCP_URL || 'https://mcp.mcd.cn',
    private token = process.env.MCD_MCP_TOKEN || '',
  ) {
    const endpoint = new URL(url);
    if (
      endpoint.origin !== 'https://mcp.mcd.cn' ||
      endpoint.pathname !== '/' ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    )
      throw new ArenaError('INVALID_MCP_URL', '仅允许麦当劳官方 MCP Endpoint');
  }
  async connect(signal?: AbortSignal): Promise<void> {
    if (this.client) return;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      if (!this.token)
        throw new ArenaError('MISSING_TOKEN', '未配置 MCD_MCP_TOKEN，Demo / Replay 仍可使用');
      const client = new Client({ name: 'mcagent-arena', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(this.url), {
        requestInit: { headers: { Authorization: `Bearer ${this.token}` } },
        fetch: async (input, init) => {
          await liveLimiter.acquire(init?.signal || undefined);
          return fetch(input, { ...init, redirect: 'error' });
        },
      });
      try {
        await client.connect(transport, { timeout: 15000, signal });
        this.client = client;
        this.transport = transport;
      } catch (e) {
        await client.close().catch(() => {});
        throw asError(e);
      }
    })();
    try {
      await this.connecting;
    } finally {
      this.connecting = undefined;
    }
  }
  async listTools(signal?: AbortSignal): Promise<ToolDefinition[]> {
    await this.connect(signal);
    const tools: ToolDefinition[] = [];
    let cursor: string | undefined;
    do {
      const result = await this.client!.listTools(cursor ? { cursor } : {}, {
        timeout: 15000,
        signal,
      });
      tools.push(
        ...result.tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema as JsonObject,
        })),
      );
      cursor = result.nextCursor;
      if (tools.length > 1000) throw new ArenaError('SCHEMA_LIMIT', '工具列表超出安全上限');
    } while (cursor);
    return tools;
  }
  async callTool(name: string, args: JsonObject, signal?: AbortSignal): Promise<unknown> {
    if (!READ_ONLY_TOOLS.includes(name as (typeof READ_ONLY_TOOLS)[number]))
      throw new ArenaError('SIDE_EFFECT_BLOCKED', `默认拒绝工具 ${name}`, 'guard');
    await this.connect(signal);
    try {
      return await this.client!.callTool({ name, arguments: args }, { timeout: 12000, signal });
    } catch (e) {
      throw asError(e);
    }
  }
  async healthCheck(): Promise<{
    connected: boolean;
    tools: string[];
    error?: string;
    code?: string;
  }> {
    try {
      const tools = await this.listTools();
      return {
        connected: true,
        tools: tools
          .map((t) => t.name)
          .filter((n) => READ_ONLY_TOOLS.includes(n as (typeof READ_ONLY_TOOLS)[number])),
      };
    } catch (e) {
      const err = asError(e);
      return {
        connected: false,
        tools: [],
        error: String(redact(err.message, [this.token].filter(Boolean))),
        code: err.code,
      };
    }
  }
  async close(): Promise<void> {
    try {
      await this.transport?.terminateSession();
    } finally {
      await this.client?.close();
      this.client = undefined;
      this.transport = undefined;
    }
  }
}
