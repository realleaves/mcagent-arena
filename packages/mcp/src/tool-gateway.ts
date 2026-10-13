import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type {
  Emit,
  JsonObject,
  ToolDefinition,
  ToolProvider,
  ToolRecord,
} from '../../shared/src/types.js';
import { ArenaError, asError, delay } from '../../shared/src/errors.js';
import { redact } from '../../shared/src/redact.js';
import { READ_ONLY_TOOLS } from './mcd-client.js';
import { SharedLimiter, liveLimiter } from './rate-limiter.js';
export { SharedLimiter, liveLimiter } from './rate-limiter.js';
export class ToolGateway {
  readonly records: ToolRecord[] = [];
  private count = 0;
  constructor(
    private provider: ToolProvider,
    private tools: ToolDefinition[],
    private allowedTools: string[],
    private maxCalls = 6,
    private timeoutMs = 12000,
    private emit: Emit = () => {},
    private limiter = provider.source === 'live' ? liveLimiter : new SharedLimiter(0),
  ) {}
  get definitions() {
    return this.tools.filter(
      (t) =>
        this.allowedTools.includes(t.name) &&
        READ_ONLY_TOOLS.includes(t.name as (typeof READ_ONLY_TOOLS)[number]),
    );
  }
  async call(name: string, args: unknown, signal?: AbortSignal): Promise<unknown> {
    let attempt = 0;
    while (true) {
      signal?.throwIfAborted();
      const start = Date.now();
      const record: ToolRecord = {
        sequence: this.records.length + 1,
        toolName: name,
        input: redact(args),
        status: 'failed',
        durationMs: 0,
        timestamp: new Date().toISOString(),
      };
      this.emit({
        type: 'tool_called',
        step: record.sequence,
        toolName: name,
        input: record.input,
        attempt: attempt + 1,
      });
      try {
        if (++this.count > this.maxCalls)
          throw new ArenaError('CALL_LIMIT', '超过每任务工具调用次数上限', 'model');
        if (!READ_ONLY_TOOLS.includes(name as (typeof READ_ONLY_TOOLS)[number])) {
          record.status = 'blocked';
          throw new ArenaError('SIDE_EFFECT_BLOCKED', `未进入只读白名单：${name}`, 'guard');
        }
        if (!this.allowedTools.includes(name)) {
          record.status = 'blocked';
          throw new ArenaError('TOOL_SCOPE_BLOCKED', `本场景未允许只读工具：${name}`, 'model');
        }
        const tool = this.tools.find((t) => t.name === name);
        if (!tool) throw new ArenaError('TOOL_MISSING', `服务端未提供工具：${name}`);
        const ajv = new Ajv({ strict: false, allErrors: true });
        addFormats(ajv);
        let validate;
        try {
          validate = ajv.compile(tool.inputSchema);
        } catch {
          throw new ArenaError('SCHEMA_MISMATCH', `工具 schema 无法校验：${name}`);
        }
        if (!validate(args))
          throw new ArenaError('INVALID_ARGUMENTS', ajv.errorsText(validate.errors), 'model');
        const local = AbortSignal.timeout(this.timeoutMs);
        const combined = signal ? AbortSignal.any([signal, local]) : local;
        await this.limiter.acquire(combined);
        const result = await Promise.race([
          this.provider.callTool(name, args as JsonObject, combined),
          new Promise<never>((_, reject) => {
            const fail = () => reject(new ArenaError('TOOL_TIMEOUT', '工具请求超时'));
            combined.addEventListener('abort', fail, { once: true });
          }),
        ]);
        if (result && typeof result === 'object' && 'isError' in result && result.isError)
          throw new ArenaError('TOOL_ERROR', 'MCP 工具返回 isError，无法确认数据');
        record.status = 'success';
        record.output = redact(result);
        record.durationMs = Date.now() - start;
        this.records.push(record);
        this.emit({ type: 'tool_result', ...record });
        return record.output;
      } catch (e) {
        const err = asError(e);
        record.error = String(redact(err.message));
        record.code = err.code;
        record.durationMs = Date.now() - start;
        this.records.push(record);
        this.emit({ type: 'tool_result', ...record });
        if (err.code === 'RATE_LIMIT' && attempt < 2 && this.count < this.maxCalls) {
          await delay(250 * 2 ** attempt, signal);
          attempt++;
          continue;
        }
        if (['CALL_LIMIT', 'SCHEMA_MISMATCH', 'TOOL_MISSING'].includes(err.code)) throw err;
        return { isError: true, error: { code: err.code, message: record.error } };
      }
    }
  }
}
