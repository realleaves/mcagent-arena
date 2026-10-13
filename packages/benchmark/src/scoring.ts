import type { AssertionResult } from './assertions.js';
export function scoreDimension(
  results: AssertionResult[],
  dimension: AssertionResult['dimension'],
  weight: number,
) {
  const group = results.filter((r) => r.dimension === dimension);
  return group.length
    ? Math.round((weight * group.filter((r) => r.passed).length) / group.length)
    : weight;
}
