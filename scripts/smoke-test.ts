import { mkdirSync, writeFileSync } from 'node:fs';
import { createApp, getService } from '../apps/api/src/server.js';
const app = createApp({ dbPath: ':memory:', env: {} });
try {
  const response = await app.inject({
    method: 'POST',
    url: '/api/battles',
    payload: {
      scenarioId: 'scenario-001',
      mode: 'demo',
      agentA: 'demo-careful',
      agentB: 'demo-hasty',
    },
  });
  if (response.statusCode !== 202) throw new Error('Demo API rejected request');
  const b = await getService(app).wait(response.json().id);
  if (b?.runs.length !== 2 || !b.runs[0]?.judge.passed || b.runs[1]?.judge.passed)
    throw new Error('Demo assertions failed');
  const report = (await app.inject(`/api/battles/${b.id}/report`)).json();
  mkdirSync('data', { recursive: true });
  writeFileSync('data/demo-report.json', JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        status: report.status,
        runs: report.runs.map(
          (r: {
            modelId: string;
            records: unknown[];
            judge: { totalScore: number; passed: boolean; failedAssertions: string[] };
          }) => ({
            model: r.modelId,
            calls: r.records.length,
            score: r.judge.totalScore,
            passed: r.judge.passed,
            failedAssertions: r.judge.failedAssertions,
          }),
        ),
        report: 'data/demo-report.json',
      },
      null,
      2,
    ),
  );
} finally {
  await app.close();
}
