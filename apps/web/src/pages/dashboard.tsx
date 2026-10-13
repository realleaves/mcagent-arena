import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FlaskConical,
  PlugZap,
  ShieldCheck,
  Swords,
  Database,
  RefreshCw,
} from 'lucide-react';
import { api, type Battle, type Scenario, type Config, date } from '../lib/api';
import { ModeBadge, Empty, ErrorBox, Status } from '../components/ui';
export function Dashboard({ config }: { config?: Config }) {
  const [battles, setBattles] = useState<Battle[]>([]),
    [scenarios, setScenarios] = useState<Scenario[]>([]),
    [mcp, setMcp] = useState<{ connected: boolean; error?: string }>({ connected: false }),
    [error, setError] = useState(''),
    [probing, setProbing] = useState(false);
  useEffect(() => {
    Promise.all([
      api<Battle[]>('/battles'),
      api<Scenario[]>('/scenarios'),
      api<{ connected: boolean; error?: string }>('/mcp/status'),
    ])
      .then(([b, s, m]) => {
        setBattles(b);
        setScenarios(s);
        setMcp(m);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function probe() {
    setProbing(true);
    try {
      setMcp(await api('/mcp/probe', { method: 'POST', body: '{}' }));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProbing(false);
    }
  }
  return (
    <>
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="online-dot" />
            MCP AGENT BENCHMARK / V1.0
          </p>
          <h1>
            Same task.
            <br />
            Same tools.
            <br />
            <span>Let the evidence decide.</span>
          </h1>
          <p>
            给两个 AI Agent 同一道任务、同一组工具。
            <br />
            观察实际调用，用可执行断言评测能力。
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/arena">
              <Swords size={18} />
              Start Battle
              <ArrowRight size={17} />
            </Link>
            <Link className="button ghost" to="/results">
              Explore results
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="vs-core">
            VS<small>MCP</small>
          </div>
          <div className="orbit-agent agent-one">
            A<span>TOOL CALLING</span>
          </div>
          <div className="orbit-agent agent-two">
            B<span>EVIDENCE FIRST</span>
          </div>
          <div className="visual-caption">
            INDEPENDENT CONTEXTS
            <br />
            SHARED EVALUATION CONDITIONS
          </div>
        </div>
      </section>
      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="stats-grid">
        <div className="stat">
          <FlaskConical />
          <span>Executable scenarios</span>
          <strong>
            {scenarios.length.toString().padStart(2, '0')}
            <small>BENCHMARK v1.0</small>
          </strong>
        </div>
        <div className="stat">
          <Swords />
          <span>Recorded battles</span>
          <strong>
            {battles.length.toString().padStart(2, '0')}
            <small>LOCAL SQLITE</small>
          </strong>
        </div>
        <div className="stat">
          <PlugZap />
          <span>Official MCP connection</span>
          <strong className="stat-status">
            {mcp.connected ? 'Connected' : 'Not probed'}
            <button
              className="inline-button"
              onClick={() => void probe()}
              disabled={probing || !config?.mcpConfigured}
            >
              <RefreshCw size={13} className={probing ? 'spin' : ''} />
              Probe
            </button>
          </strong>
        </div>
        <div className="stat">
          <ShieldCheck />
          <span>Safety boundary</span>
          <strong className="stat-status">
            Read only<small>DEFAULT DENY</small>
          </strong>
        </div>
      </div>
      <section className="section-heading">
        <div>
          <p className="eyebrow">CHOOSE YOUR EXECUTION MODE</p>
          <h2>Clear provenance. Fair comparisons.</h2>
        </div>
      </section>
      <div className="modes-grid">
        {[
          ['demo', '01', 'Demo', '无需密钥。预定义合成 Agent 与合成工具数据，体验完整对战流程。'],
          [
            'replay',
            '02',
            'Fixture Replay',
            '真实模型，固定合成工具返回。仅相同评测条件下的 Replay 可进入标准排行榜。',
          ],
          [
            'live',
            '03',
            'Live MCP',
            '真实模型与官方只读 MCP。数据随时间变化，独立展示并保留调用证据。',
          ],
        ].map(([mode, n, title, text]) => (
          <div className="panel mode-card" key={mode}>
            <span className="mono muted">{n} / EXECUTION</span>
            <h3>
              {title}
              <ModeBadge mode={mode as 'demo' | 'replay' | 'live'} />
            </h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR LOCAL HISTORY</p>
          <h2>Recent battles</h2>
        </div>
        <Link to="/results">
          View all
          <ArrowRight size={15} />
        </Link>
      </div>
      <section className="panel">
        {battles.length ? (
          <div className="battle-list">
            {battles.slice(0, 5).map((b) => (
              <Link to={`/arena/${b.id}`} className="battle-row" key={b.id}>
                <span className="row-icon">
                  <Swords size={20} />
                </span>
                <div>
                  <strong>
                    {scenarios.find((s) => s.id === b.scenarioId)?.title || b.scenarioId}
                  </strong>
                  <small>{date(b.startedAt)}</small>
                </div>
                <ModeBadge mode={b.mode} />
                <Status status={b.status} />
                <span className="row-scores">
                  {b.runs[0]?.judge.totalScore ?? '—'} <span>:</span>{' '}
                  {b.runs[1]?.judge.totalScore ?? '—'}
                </span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="Your first battle starts here">
            选择一个场景，运行免密钥 Demo。<Link to="/arena">Enter the arena →</Link>
          </Empty>
        )}
      </section>
      <div className="note">
        <Database size={16} />
        所有历史记录保存在本机；没有隐藏思维链，仅展示实际调用、最终答案和评分依据。
      </div>
    </>
  );
}
