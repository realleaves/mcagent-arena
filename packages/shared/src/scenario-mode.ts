import type { Scenario, Mode } from './schemas.js';

export function scenarioForMode(s: Scenario, mode: Mode): Scenario {
  return mode === 'live' && s.liveVariant
    ? { ...s, ...s.liveVariant, liveVariant: undefined, targetDate: undefined }
    : s;
}
