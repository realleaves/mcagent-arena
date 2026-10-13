import type { Battle } from '../../../api/src/db/store.js';
import type { StoredEvent } from '../../../api/src/db/store.js';
import type { ModelConfig } from '../../../../packages/runner/src/provider-adapter.js';
import type { Scenario, Mode } from '../../../../packages/shared/src/schemas.js';
export type { Battle, StoredEvent, Scenario, Mode };
export type PublicModel = Omit<ModelConfig, 'apiKey' | 'baseUrl'>;
export interface Config {
  demoModels: PublicModel[];
  models: PublicModel[];
  unavailableModels: PublicModel[];
  modes: Record<Mode, boolean>;
  mcpConfigured: boolean;
  githubUrl: string;
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch('/api' + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.message || json.error || `HTTP ${r.status}`);
  return json as T;
}
export const pretty = (v: unknown) => JSON.stringify(v, null, 2);
export const date = (s: string) => new Date(s).toLocaleString();
