import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scenarioSchema, type Mode } from '../../shared/src/schemas.js';
import { scenarioForMode } from '../../shared/src/scenario-mode.js';
export function loadScenarios(root = resolve('benchmarks')) {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(resolve(root, d.name))
        .filter((f) => f.endsWith('.json'))
        .map((f) =>
          scenarioSchema.parse(JSON.parse(readFileSync(resolve(root, d.name, f), 'utf8'))),
        ),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}
export function loadScenario(id: string, mode?: Mode) {
  const s = loadScenarios().find((s) => s.id === id);
  if (!s) throw new Error(`Unknown scenario: ${id}`);
  return mode ? scenarioForMode(s, mode) : s;
}
