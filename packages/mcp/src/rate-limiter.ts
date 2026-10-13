import { delay } from '../../shared/src/errors.js';
export class SharedLimiter {
  private tail = Promise.resolve();
  private nextAt = 0;
  constructor(private intervalMs = 120) {}
  async acquire(signal?: AbortSignal) {
    const run = this.tail.then(async () => {
      signal?.throwIfAborted();
      await delay(Math.max(0, this.nextAt - Date.now()), signal);
      this.nextAt = Date.now() + this.intervalMs;
    });
    this.tail = run.catch(() => {});
    await run;
  }
}
export const liveLimiter = new SharedLimiter(150);
