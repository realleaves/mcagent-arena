import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import {
  configuredModels,
  modelAvailability,
  OpenAICompatibleAdapter,
} from '../packages/runner/src/provider-adapter.js';
import { redact } from '../packages/shared/src/redact.js';
if (existsSync('.env')) process.loadEnvFile('.env');
const providerIndex = process.argv.indexOf('--provider');
const providerId = providerIndex >= 0 ? process.argv[providerIndex + 1] : undefined;
const configured = configuredModels();
if (providerIndex >= 0 && (!providerId || providerId.startsWith('--')))
  throw new Error('--provider 需要指定已配置的 Provider ID');
const selected = providerId ? configured.filter((config) => config.id === providerId) : configured;
if (!selected.length)
  throw new Error(providerId ? `未找到已配置的 Provider：${providerId}` : '没有配置模型 Provider');
const evidence = [];
for (const config of selected) {
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
      if (!meta.available) throw new Error('服务端模型列表中没有这个模型，未发起付费探测');
      const adapter = new OpenAICompatibleAdapter({ ...config, maxOutputTokens: 256 });
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
        256,
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
