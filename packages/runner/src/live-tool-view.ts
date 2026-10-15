import { normalizedLiveView } from '../../mcp/src/live-data.js';

const MAX_DATA_CHARS = 1800;

function excerpt(value: string) {
  if (value.length <= MAX_DATA_CHARS) return { text: value, truncated: false };
  const prefix = value.slice(0, MAX_DATA_CHARS);
  const lastLine = prefix.lastIndexOf('\n');
  return {
    text: lastLine > MAX_DATA_CHARS / 2 ? prefix.slice(0, lastLine) : prefix,
    truncated: true,
  };
}

/** Keep the full sanitized MCP result in the trace, but send one bounded view to the model. */
export function liveToolView(result: unknown, toolName?: string, normalize = false): unknown {
  if (!result || typeof result !== 'object') return result;
  const value = result as Record<string, unknown>;
  if (value.isError === true) return value;
  if (normalize && toolName) return normalizedLiveView(toolName, result);
  const structured = value.structuredContent;
  if (structured && typeof structured === 'object') {
    const data = structured as Record<string, unknown>;
    const raw = typeof data.data === 'string' ? data.data : JSON.stringify(data.data ?? null);
    const compact = excerpt(raw);
    return {
      source: 'live',
      success: data.success,
      code: data.code,
      dataExcerpt: compact.text,
      originalCharacters: raw.length,
      truncated: compact.truncated,
      notice: compact.truncated
        ? 'Only an excerpt of the real MCP result is shown. Do not claim to have checked every row.'
        : 'Real MCP tool data; do not assume units or serving basis unless explicitly stated.',
    };
  }
  const raw = JSON.stringify(value);
  const compact = excerpt(raw);
  return {
    source: 'live',
    dataExcerpt: compact.text,
    originalCharacters: raw.length,
    truncated: compact.truncated,
    notice: compact.truncated
      ? 'Only an excerpt of the real MCP result is shown. Do not claim to have checked every row.'
      : 'Real MCP tool data; do not assume units or serving basis unless explicitly stated.',
  };
}
