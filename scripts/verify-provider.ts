import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import {
  configuredModels,
  modelAvailability,
  OpenAICompatibleAdapter,
} from '../packages/runner/src/provider-adapter.js';
import { redact } from '../packages/shared/src/redact.js';
if (existsSync('.env')) process.loadEnvFile('.env');
const evidence = [];
for (const config of configuredModels()) {
  const meta = await modelAvailability(config);
  const result: {
    id: string;
    model: string;
    protocol: string;
    listed: boolean;
    nativeToolCalling?: boolean;
    error?: string;
    errorCode?: string;
  } = {
    id: config.id,
    model: config.model,
    protocol: config.protocol,
    listed: Boolean(meta.available),
    error: meta.error,
  };
  if (process.argv.includes('--probe')) {
    try {
      const adapter = new OpenAICompatibleAdapter({ ...config, maxOutputTokens: 1000 });
      const turn = await adapter.complete(
        [
          {
            role: 'system',
            content:
              'Call now-time-info exactly once using the provided function tool. Do not output any explanation.',
          },
          { role: 'user', content: '请调用工具查询时间。' },
        ],
        [
          {
            name: 'now-time-info',
            description: 'Synthetic local read-only tool, no side effects',
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          },
        ],
        AbortSignal.timeout(15000),
        1000,
      );
      result.nativeToolCalling = turn.calls.some((c) => c.name === 'now-time-info');
      result.error = result.nativeToolCalling ? undefined : '模型未返回原生工具调用';
    } catch (e) {
      result.nativeToolCalling = false;
      result.error = String(redact(e instanceof Error ? e.message : String(e)));
      if (e && typeof e === 'object' && 'code' in e) result.errorCode = String(e.code);
    }
  }
  evidence.push(result);
}
mkdirSync('data', { recursive: true });
writeFileSync(
  'data/provider-verification.json',
  JSON.stringify(redact({ verifiedAt: new Date().toISOString(), evidence }), null, 2),
);
console.log(JSON.stringify(redact(evidence), null, 2));
if (evidence.some((e) => !e.listed || e.nativeToolCalling === false)) process.exitCode = 1;
