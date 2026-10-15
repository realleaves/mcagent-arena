import { test, expect } from 'vitest';
import { createApp, getService } from '../apps/api/src/server.js';
import { BattleStore } from '../apps/api/src/db/store.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
function app() {
  return createApp({ dbPath: ':memory:', env: {} });
}
test('API strictly rejects arbitrary URLs and extra request fields', async () => {
  const a = app();
  const r = await a.inject({
    method: 'POST',
    url: '/api/battles',
    payload: {
      scenarioId: 'scenario-001',
      agentA: 'demo-careful',
      agentB: 'demo-hasty',
      mode: 'demo',
      apiBaseUrl: 'http://127.0.0.1',
    },
  });
  expect(r.statusCode).toBe(400);
  expect(
    (
      await a.inject({
        method: 'POST',
        url: '/api/battles',
        payload: {
          scenarioId: 'scenario-006',
          agentA: 'demo-careful',
          agentB: 'demo-hasty',
          mode: 'live',
        },
      })
    ).statusCode,
  ).toBe(400);
  await a.close();
});
test('API blocks cross-origin and DNS rebinding requests', async () => {
  const a = app();
  expect(
    (await a.inject({ url: '/api/config', headers: { origin: 'https://evil.example' } }))
      .statusCode,
  ).toBe(403);
  expect(
    (await a.inject({ url: '/api/health', headers: { host: 'evil.example' } })).statusCode,
  ).toBe(403);
  await a.close();
});
test('no-key Demo executes two independent Agents and persists report', async () => {
  const a = app();
  const r = await a.inject({
    method: 'POST',
    url: '/api/battles',
    payload: {
      scenarioId: 'scenario-001',
      agentA: 'demo-careful',
      agentB: 'demo-hasty',
      mode: 'demo',
    },
  });
  expect(r.statusCode).toBe(202);
  const id = r.json().id;
  await getService(a).wait(id);
  const b = (await a.inject(`/api/battles/${id}`)).json();
  expect(b.runs).toHaveLength(2);
  expect(b.evaluationKey).toContain(`prompt-${b.runs[0].modelParameters.systemPromptVersion}:`);
  expect(b.runs[0].judge.passed).toBe(true);
  expect(b.runs[1].judge.passed).toBe(false);
  expect(b.events.some((e: { type: string }) => e.type === 'tool_called')).toBe(true);
  const count = b.events.length;
  expect((await a.inject(`/api/battles/${id}`)).json().events).toHaveLength(count);
  expect((await a.inject(`/api/battles/${id}/report`)).json().standardLeaderboardEligible).toBe(
    false,
  );
  const stream = await a.inject(`/api/battles/${id}/events`);
  expect(stream.body).toContain('event: battle_started');
  expect(stream.body).toContain('event: tool_result');
  expect(stream.body).toContain('event: battle_completed');
  await a.close();
});
test('SQLite restores completed battles and marks interrupted jobs without rerunning', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-db-'));
  const path = join(dir, 'db.sqlite');
  const store = new BattleStore(path);
  store.save({
    id: 'test-id',
    scenarioId: 'scenario-001',
    scenarioVersion: '1',
    fixtureHash: 'h',
    mode: 'demo',
    status: 'running',
    startedAt: new Date().toISOString(),
    agentA: 'a',
    agentB: 'b',
    runs: [],
    evaluationKey: 'test',
  });
  store.close();
  const recovered = new BattleStore(path);
  expect(recovered.get('test-id')?.status).toBe('interrupted');
  expect(recovered.events('test-id')[0]?.type).toBe('battle_failed');
  recovered.close();
  rmSync(dir, { recursive: true });
});
test('one Agent failure preserves the other result', async () => {
  const a = app();
  const r = await a.inject({
    method: 'POST',
    url: '/api/battles',
    payload: {
      scenarioId: 'scenario-005',
      agentA: 'demo-careful',
      agentB: 'demo-hasty',
      mode: 'demo',
    },
  });
  const b = await getService(a).wait(r.json().id);
  expect(b?.runs).toHaveLength(2);
  expect(b?.runs[0]?.judge.passed).toBe(true);
  expect(b?.runs[1]?.judge.passed).toBe(false);
  await a.close();
});
