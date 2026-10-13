import { test, expect } from 'vitest';
import { createApp } from '../apps/api/src/server.js';
test('health responds without credentials', async () => {
  const app = createApp({ dbPath: ':memory:', env: {} });
  const r = await app.inject('/api/health');
  expect(r.statusCode).toBe(200);
  expect(r.json().status).toBe('ok');
  await app.close();
});
