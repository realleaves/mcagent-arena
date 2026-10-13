import { Terminal, CheckCircle2, ShieldX, Clock3 } from 'lucide-react';
import type { StoredEvent } from '../lib/api';
import { date, pretty } from '../lib/api';
import { Status } from './ui';
export function TraceTimeline({ events, full = false }: { events: StoredEvent[]; full?: boolean }) {
  const shown = full
    ? events
    : events.filter((e) => !['model_requested', 'tool_called'].includes(e.type)).slice(-15);
  return (
    <div className="timeline">
      {shown.map((e) => (
        <article key={e.id} className={`trace-event ${e.status === 'blocked' ? 'blocked' : ''}`}>
          <div className="trace-dot">
            {e.status === 'blocked' ? (
              <ShieldX size={14} />
            ) : e.type === 'tool_result' && e.status === 'success' ? (
              <CheckCircle2 size={14} />
            ) : (
              <Terminal size={14} />
            )}
          </div>
          <div className="trace-content">
            <div className="trace-meta">
              <span className="mono">
                {e.agentSlot ? `Agent ${e.agentSlot} · ` : ''}#{e.sequence} {e.type}
              </span>
              <span>
                {e.durationMs !== undefined ? (
                  <>
                    <Clock3 size={12} />
                    {e.durationMs}ms
                  </>
                ) : (
                  new Date(e.timestamp).toLocaleTimeString()
                )}
              </span>
            </div>
            <h4>{e.toolName || e.type.replaceAll('_', ' ')}</h4>
            {e.status && <Status status={e.status} />}
            <p className="trace-error">{e.error}</p>
            {full ? (
              <>
                <time className="muted">{date(e.timestamp)}</time>
                {e.input !== undefined && (
                  <details>
                    <summary>参数 · sanitized input</summary>
                    <pre>{pretty(e.input)}</pre>
                  </details>
                )}
                {e.output !== undefined && (
                  <details>
                    <summary>工具结果 · sanitized output</summary>
                    <pre>{pretty(e.output)}</pre>
                  </details>
                )}
              </>
            ) : (
              e.output !== undefined && (
                <p className="trace-preview">{pretty(e.output)?.slice(0, 140)}</p>
              )
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
