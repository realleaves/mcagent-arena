import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ToolProvider, ToolDefinition, JsonObject } from '../../shared/src/types.js';
import { ArenaError } from '../../shared/src/errors.js';
const fixtureSchema = z.object({
  id: z.string(),
  source: z.literal('synthetic'),
  version: z.string(),
  notice: z.string(),
  foods: z.array(z.record(z.string(), z.unknown())),
  campaigns: z.array(z.record(z.string(), z.unknown())),
  now: z.record(z.string(), z.unknown()),
  failuresBeforeSuccess: z.number().int().nonnegative(),
});
export const fixtureTools: ToolDefinition[] = [
  {
    name: 'list-nutrition-foods',
    description: 'Synthetic nutrition fixture, not live data',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'campaign-calendar',
    description: 'Synthetic campaign fixture; fixed dates',
    inputSchema: {
      type: 'object',
      properties: { specifiedDate: { type: 'string', format: 'date' } },
      additionalProperties: false,
    },
  },
  {
    name: 'now-time-info',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];
export class FixtureProvider implements ToolProvider {
  readonly source = 'synthetic' as const;
  readonly fixture;
  readonly hash: string;
  private attempts = 0;
  constructor(id: string) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new ArenaError('FIXTURE_ID', 'Invalid fixture ID');
    const data = readFileSync(`fixtures/synthetic/${id}.json`, 'utf8');
    this.fixture = fixtureSchema.parse(JSON.parse(data));
    this.hash = createHash('sha256').update(data).digest('hex');
  }
  async listTools() {
    return structuredClone(fixtureTools);
  }
  async callTool(name: string, _args: JsonObject): Promise<unknown> {
    if (name === 'list-nutrition-foods') {
      if (++this.attempts <= this.fixture.failuresBeforeSuccess)
        throw new ArenaError('TEMPORARY', '合成测试：临时工具错误');
      return {
        source: 'synthetic',
        notice: this.fixture.notice,
        foods: structuredClone(this.fixture.foods),
      };
    }
    if (name === 'campaign-calendar')
      return {
        source: 'synthetic',
        notice: this.fixture.notice,
        campaigns: structuredClone(this.fixture.campaigns),
      };
    if (name === 'now-time-info') return { source: 'synthetic', ...this.fixture.now };
    throw new ArenaError('UNKNOWN_TOOL', 'Fixture does not implement tool');
  }
}
