import { existsSync, writeFileSync } from 'node:fs';
import { battleRequestSchema } from '../packages/shared/src/schemas.js';
import { delay } from '../packages/shared/src/errors.js';
import type { Battle } from '../apps/api/src/db/store.js';
if (existsSync('.env')) process.loadEnvFile('.env');
const get = (name: string, fallback: string) => {
  const index = process.argv.indexOf('--' + name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
};
const mode = get('mode', 'demo');
const body = battleRequestSchema.parse({
  scenarioId: get('scenario', 'scenario-001'),
  mode,
  agentA: get('agent-a', mode === 'demo' ? 'demo-careful' : 'provider-a'),
  agentB: get('agent-b', mode === 'demo' ? 'demo-hasty' : 'provider-b'),
});
const base = `http://127.0.0.1:${Number(process.env.API_PORT || 3001)}`;
const r = await fetch(base + '/api/battles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
if (!r.ok) throw new Error(JSON.stringify(await r.json()));
const created = (await r.json()) as Battle;
let battle = created;
const deadline = Date.now() + 95000;
while (battle.status === 'running' && Date.now() < deadline) {
  await delay(500);
  battle = (await (await fetch(base + '/api/battles/' + created.id)).json()) as Battle;
}
const report = await (await fetch(base + '/api/battles/' + created.id + '/report')).json();
const out = get('out', '');
if (out) writeFileSync(out, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      id: created.id,
      status: battle.status,
      mode: battle.mode,
      runs: battle.runs.map((r) => ({
        slot: r.agentSlot,
        model: r.modelId,
        status: r.status,
        score: r.judge.totalScore,
        passed: r.judge.passed,
        error: r.error,
        failedAssertions: r.judge.failedAssertions,
      })),
      report: out || `${base}/api/battles/${created.id}/report`,
    },
    null,
    2,
  ),
);
if (battle.status !== 'completed') process.exitCode = 1;
