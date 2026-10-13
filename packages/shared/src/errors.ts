export class ArenaError extends Error {
  constructor(
    public code: string,
    message: string,
    public category: 'infrastructure' | 'model' | 'guard' = 'infrastructure',
    public retryable = false,
  ) {
    super(message);
    this.name = 'ArenaError';
  }
}
export function asError(error: unknown): ArenaError {
  if (error instanceof ArenaError) return error;
  const text = error instanceof Error ? error.message : String(error);
  if (/401|unauthorized/i.test(text))
    return new ArenaError('UNAUTHORIZED', '凭据无效或已过期 (401)');
  if (/429|rate.?limit/i.test(text))
    return new ArenaError('RATE_LIMIT', '远端限流 (429)', 'infrastructure', true);
  if (/abort|timeout/i.test(text)) return new ArenaError('TIMEOUT', '请求超时或已取消');
  return new ArenaError('NETWORK', text.slice(0, 500));
}
export async function delay(ms: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const done = () => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    };
    const timer = setTimeout(done, ms);
    const cancel = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      reject(new ArenaError('TIMEOUT', '执行已取消'));
    };
    signal?.addEventListener('abort', cancel, { once: true });
  });
}
