import { test, expect, vi } from 'vitest';
import { McdClient } from '../packages/mcp/src/mcd-client.js';
import { ToolGateway, SharedLimiter } from '../packages/mcp/src/tool-gateway.js';
import type { ToolProvider } from '../packages/shared/src/types.js';
import { ArenaError } from '../packages/shared/src/errors.js';
import { redact } from '../packages/shared/src/redact.js';
const tools = [
  {
    name: 'now-time-info',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];
function mock(): ToolProvider {
  return {
    source: 'synthetic',
    listTools: async () => tools,
    callTool: vi.fn(async () => ({ date: '2026-10-13' })),
  };
}
test('missing credentials produce structured connection failure', async () => {
  const c = new McdClient('https://mcp.mcd.cn', '');
  expect((await c.healthCheck()).code).toBe('MISSING_TOKEN');
  await c.close();
});
test('client refuses unknown endpoints and write tools', async () => {
  expect(() => new McdClient('http://127.0.0.1', '')).toThrow();
  await expect(
    new McdClient('https://mcp.mcd.cn', '').callTool('create-order', {}),
  ).rejects.toMatchObject({ code: 'SIDE_EFFECT_BLOCKED' });
});
test.each([
  'create-order',
  'cancel-order',
  'mall-create-order',
  'party-order-create',
  'draw-lottery',
  'auto-bind-coupons',
  'delivery-create-address',
  'unknown-write',
])('gateway defaults to deny %s', async (name) => {
  const p = mock();
  const g = new ToolGateway(p, tools, [name]);
  await g.call(name, {});
  expect(p.callTool).not.toHaveBeenCalled();
  expect(g.records[0]?.status).toBe('blocked');
});
test('schema validated before execution', async () => {
  const p = mock();
  const g = new ToolGateway(p, tools, ['now-time-info']);
  await g.call('now-time-info', { bad: 1 });
  expect(p.callTool).not.toHaveBeenCalled();
  expect(g.records[0]?.code).toBe('INVALID_ARGUMENTS');
  expect(await g.call('now-time-info', {})).toEqual({ date: '2026-10-13' });
});
test('429 retries exactly twice and records each attempt', async () => {
  const p = mock();
  p.callTool = vi.fn(async () => {
    throw new ArenaError('RATE_LIMIT', '429', 'infrastructure', true);
  });
  const g = new ToolGateway(p, tools, ['now-time-info']);
  await g.call('now-time-info', {});
  expect(p.callTool).toHaveBeenCalledTimes(3);
  expect(g.records).toHaveLength(3);
});
test('timeout and maximum calls bound runaway tools', async () => {
  const p = mock();
  p.callTool = async () => new Promise(() => {});
  const g = new ToolGateway(p, tools, ['now-time-info'], 1, 10);
  await g.call('now-time-info', {});
  expect(g.records[0]?.code).toBe('TOOL_TIMEOUT');
  await expect(g.call('now-time-info', {})).rejects.toMatchObject({ code: 'CALL_LIMIT' });
});
test('redaction covers keys and embedded secret values', () => {
  expect(
    redact({ token: 'abc', text: 'abc Bearer example-token', reasoning: 'hidden' }, ['abc']),
  ).toEqual({ token: '[REDACTED]', text: '[REDACTED] Bearer [REDACTED]' });
});
test('limiter coordinates callers', async () => {
  const l = new SharedLimiter(10);
  const t = Date.now();
  await Promise.all([l.acquire(), l.acquire(), l.acquire()]);
  expect(Date.now() - t).toBeGreaterThanOrEqual(15);
});

test('redaction preserves numeric token budgets and usage counters', () => {
  expect(
    redact({ tokenUsage: 123, maxTokens: 16000, maxOutputTokens: 2000, accessToken: 'sensitive' }),
  ).toEqual({
    tokenUsage: 123,
    maxTokens: 16000,
    maxOutputTokens: 2000,
    accessToken: '[REDACTED]',
  });
});

test('SDK connect/list/call/close flow uses actual v2 signatures', async () => {
  const { Client } = await import('@modelcontextprotocol/client');
  const connect = vi.spyOn(Client.prototype, 'connect').mockResolvedValue(undefined);
  const listing = vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({
    tools: [{ name: 'now-time-info', inputSchema: { type: 'object', properties: {} } }],
  });
  const calling = vi
    .spyOn(Client.prototype, 'callTool')
    .mockResolvedValue({ content: [{ type: 'text', text: '2026-10-13' }] });
  const close = vi.spyOn(Client.prototype, 'close').mockResolvedValue(undefined);
  try {
    const c = new McdClient('https://mcp.mcd.cn', 'synthetic-test-token');
    expect((await c.healthCheck()).connected).toBe(true);
    await c.callTool('now-time-info', {});
    expect(connect).toHaveBeenCalledTimes(1);
    expect(listing).toHaveBeenCalled();
    expect(calling.mock.calls[0]?.[0]).toEqual({ name: 'now-time-info', arguments: {} });
    await c.close();
    expect(close).toHaveBeenCalled();
  } finally {
    vi.restoreAllMocks();
  }
});
test('SDK authentication failure is classified without leaking credentials', async () => {
  const { Client } = await import('@modelcontextprotocol/client');
  vi.spyOn(Client.prototype, 'connect').mockRejectedValue(new Error('401 unauthorized'));
  vi.spyOn(Client.prototype, 'close').mockResolvedValue(undefined);
  try {
    const c = new McdClient('https://mcp.mcd.cn', 'synthetic-test-token');
    expect(await c.healthCheck()).toMatchObject({ connected: false, code: 'UNAUTHORIZED' });
  } finally {
    vi.restoreAllMocks();
  }
});

test('redaction keeps configured reasoning effort while removing hidden reasoning text', () => {
  expect(
    redact({
      reasoningEffort: 'low',
      reasoning_content: 'hidden',
      reasoningContent: 'hidden',
      reasoning: 'hidden',
    }),
  ).toEqual({ reasoningEffort: 'low' });
});
test('connection diagnostics redact even explicit constructor credentials', async () => {
  const { Client } = await import('@modelcontextprotocol/client');
  vi.spyOn(Client.prototype, 'connect').mockRejectedValue(
    new Error('remote failure: synthetic-test-token'),
  );
  vi.spyOn(Client.prototype, 'close').mockResolvedValue(undefined);
  try {
    const c = new McdClient('https://mcp.mcd.cn', 'synthetic-test-token');
    const status = await c.healthCheck();
    expect(status.error).not.toContain('synthetic-test-token');
    expect(status.error).toContain('[REDACTED]');
    expect(() => new McdClient('https://user:pass@mcp.mcd.cn', '')).toThrow();
  } finally {
    vi.restoreAllMocks();
  }
});

test('Gateway returns sanitized tool data to the model as well as to traces', async () => {
  const p = mock();
  p.callTool = async () => ({
    authorization: 'Bearer private',
    token: 'private',
    date: '2026-10-13',
  });
  const g = new ToolGateway(p, tools, ['now-time-info']);
  expect(await g.call('now-time-info', {})).toEqual({
    authorization: '[REDACTED]',
    token: '[REDACTED]',
    date: '2026-10-13',
  });
});

test('out-of-scenario readonly tools are blocked with a scope error', async () => {
  const p = mock();
  const g = new ToolGateway(p, tools, []);
  await g.call('now-time-info', {});
  expect(p.callTool).not.toHaveBeenCalled();
  expect(g.records[0]).toMatchObject({ status: 'blocked', code: 'TOOL_SCOPE_BLOCKED' });
});
