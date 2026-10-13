export type JsonObject = Record<string, unknown>;
export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: JsonObject;
}
export interface ToolProvider {
  source: 'synthetic' | 'live';
  listTools(signal?: AbortSignal): Promise<ToolDefinition[]>;
  callTool(name: string, args: JsonObject, signal?: AbortSignal): Promise<unknown>;
}
export interface ToolRecord {
  sequence: number;
  toolName: string;
  input: unknown;
  output?: unknown;
  status: 'success' | 'failed' | 'blocked';
  durationMs: number;
  error?: string;
  code?: string;
  timestamp: string;
}
export interface ObservableEvent {
  type: string;
  agentSlot?: 'A' | 'B';
  step?: number;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  durationMs?: number;
  status?: string;
  error?: string;
  code?: string;
  [key: string]: unknown;
}
export type Emit = (event: ObservableEvent) => void;
