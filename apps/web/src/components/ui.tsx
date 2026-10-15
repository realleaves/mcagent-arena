import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Info,
  LoaderCircle,
  XCircle,
} from 'lucide-react';
import type { Mode } from '../lib/api';
export function ModeBadge({ mode }: { mode: Mode }) {
  return (
    <span className={`badge ${mode}`}>
      {mode === 'demo' ? 'Demo / Synthetic' : mode === 'replay' ? 'Fixture Replay' : 'Live MCP'}
    </span>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <ArrowUpRight size={26} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="error">
      <AlertTriangle size={18} />
      <span>{children}</span>
    </div>
  );
}
export function Status({ status }: { status: string }) {
  const success = ['success', 'completed', 'scored'].includes(status),
    uncertain = status === 'unverifiable',
    fail = [
      'failed',
      'blocked',
      'model_failed',
      'infrastructure_failed',
      'interrupted',
      'partial',
    ].includes(status);
  return (
    <span className={`status ${success ? 'good' : uncertain ? 'neutral' : fail ? 'bad' : 'muted'}`}>
      {success ? (
        <CheckCircle2 size={14} />
      ) : uncertain ? (
        <Info size={14} />
      ) : fail ? (
        <XCircle size={14} />
      ) : (
        <LoaderCircle size={14} className="spin" />
      )}
      {uncertain ? '已完成 · 无法评分' : status}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subtle">{description}</p>
      </div>
      {action}
    </header>
  );
}
