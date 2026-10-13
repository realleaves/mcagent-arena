import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { McdClient, READ_ONLY_TOOLS } from '../packages/mcp/src/mcd-client.js';
import { ToolGateway } from '../packages/mcp/src/tool-gateway.js';
import { redact } from '../packages/shared/src/redact.js';
if (existsSync('.env')) process.loadEnvFile('.env');
const client = new McdClient();
try {
  const health = await client.healthCheck();
  console.log(JSON.stringify(health, null, 2));
  if (!health.connected) process.exitCode = 1;
  else {
    const tools = await client.listTools();
    mkdirSync('data', { recursive: true });
    writeFileSync(
      'data/mcp-tools.json',
      JSON.stringify(
        redact(
          tools.filter((t) => READ_ONLY_TOOLS.includes(t.name as (typeof READ_ONLY_TOOLS)[number])),
        ),
        null,
        2,
      ),
    );
    if (process.argv.includes('--call')) {
      const toolIndex = process.argv.indexOf('--tool');
      const name = toolIndex >= 0 ? process.argv[toolIndex + 1] || '' : 'now-time-info';
      const tool = tools.find((t) => t.name === name);
      if (!tool) throw new Error('now-time-info 不存在');
      const schema = tool.inputSchema;
      const required = Array.isArray(schema.required) ? schema.required : [];
      const argsIndex = process.argv.indexOf('--args');
      const args = argsIndex >= 0 ? JSON.parse(process.argv[argsIndex + 1] || '{}') : {};
      if (required.length && argsIndex < 0)
        throw new Error(
          '当前 now-time-info 需要参数，请根据 data/mcp-tools.json schema 使用 --tool/--args',
        );
      const gateway = new ToolGateway(client, tools, [name]);
      await gateway.call(name, args);
      writeFileSync(
        'data/mcp-verification.json',
        JSON.stringify(
          { verifiedAt: new Date().toISOString(), source: 'live', records: gateway.records },
          null,
          2,
        ),
      );
      console.log(
        JSON.stringify(
          gateway.records.map((r) => ({
            toolName: r.toolName,
            status: r.status,
            durationMs: r.durationMs,
            error: r.error,
          })),
        ),
      );
      if (!gateway.records.some((r) => r.status === 'success')) process.exitCode = 1;
    }
  }
} catch (e) {
  console.error(String(redact(e instanceof Error ? e.message : String(e))));
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
