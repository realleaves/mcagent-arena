import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Swords, ArrowUpRight, Download, Terminal, Clock3, CheckCircle2 } from 'lucide-react';
import { api, type Scenario, type Config, type Mode, type Battle, pretty } from '../lib/api';
import { useBattle } from '../hooks/use-battle';
import { PageHeader, ModeBadge, ErrorBox, Status, Empty } from '../components/ui';
import { TraceTimeline } from '../components/trace';
import { ScoreComparison } from '../components/score';
export function Arena({ config }: { config?: Config }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { battle, events, error: traceError } = useBattle(id);
  const [scenarios, setScenarios] = useState<Scenario[]>([]),
    [scenarioId, setScenarioId] = useState('scenario-001'),
    [mode, setMode] = useState<Mode>('demo'),
    [agentA, setA] = useState('demo-careful'),
    [agentB, setB] = useState('demo-hasty'),
    [error, setError] = useState(''),
    [starting, setStarting] = useState(false);
  const models = mode === 'demo' ? config?.demoModels || [] : config?.models || [];
  useEffect(() => {
    api<Scenario[]>('/scenarios')
      .then(setScenarios)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (battle) {
      setMode(battle.mode);
      setScenarioId(battle.scenarioId);
      setA(battle.agentA);
      setB(battle.agentB);
    }
  }, [battle?.id]);
  function chooseMode(next: Mode) {
    setMode(next);
    const m = next === 'demo' ? config?.demoModels || [] : config?.models || [];
    setA(m[0]?.id || '');
    setB(m[1]?.id || m[0]?.id || '');
    if (!scenarios.find((s) => s.id === scenarioId)?.mode.includes(next))
      setScenarioId('scenario-001');
  }
  async function start() {
    setStarting(true);
    setError('');
    try {
      const b = await api<Battle>('/battles', {
        method: 'POST',
        body: JSON.stringify({ scenarioId, agentA, agentB, mode }),
      });
      navigate(`/arena/${b.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }
  const current = scenarios.find((s) => s.id === scenarioId);
  const running = battle?.status === 'running';
  return (
    <>
      <PageHeader
        eyebrow="SAME TASK / INDEPENDENT CONTEXTS"
        title="Battle Arena"
        description="观察实际工具调用，让证据决定结果。"
        action={battle && <ModeBadge mode={battle.mode} />}
      />
      <section className="panel battle-controls">
        <label>
          AGENT A
          <select value={agentA} onChange={(e) => setA(e.target.value)} disabled={running}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <span className="control-vs">VS</span>
        <label>
          AGENT B
          <select value={agentB} onChange={(e) => setB(e.target.value)} disabled={running}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          SCENARIO
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            disabled={running}
          >
            {scenarios
              .filter((s) => s.mode.includes(mode))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id.slice(-3)} · {s.title}
                </option>
              ))}
          </select>
        </label>
        <label>
          MODE
          <select
            value={mode}
            onChange={(e) => chooseMode(e.target.value as Mode)}
            disabled={running}
          >
            <option value="demo">Demo / Synthetic</option>
            <option value="replay">Fixture Replay</option>
            <option value="live">Live MCP</option>
          </select>
        </label>
        <button
          className="button primary"
          disabled={
            starting || running || !agentA || !agentB || !models.length || !config?.modes[mode]
          }
          onClick={() => void start()}
        >
          <Swords size={17} />
          {starting ? 'Starting…' : running ? 'Battle running…' : 'Start Battle'}
        </button>
      </section>
      {mode !== 'demo' &&
        config?.unavailableModels.map((m) => (
          <ErrorBox key={m.id}>
            {m.label}：{m.error}。请在本机 .env 修正后重启服务。
          </ErrorBox>
        ))}
      {(error || traceError) && <ErrorBox>{error || traceError}</ErrorBox>}
      <div className="task-strip">
        <span className="eyebrow">CHALLENGE BRIEF</span>
        <p>{current?.task}</p>
        <div className="task-limits">
          <span>v{current?.version}</span>
          <span>≤ 6 steps</span>
          <span>≤ 6 tool calls</span>
          <span>60s limit</span>
          <span>Default-deny gateway</span>
        </div>
      </div>
      <div className="arena-grid">
        {(['A', 'B'] as const).map((slot) => {
          const run = battle?.runs.find((r) => r.agentSlot === slot);
          const local = events.filter((e) => e.agentSlot === slot);
          const completion = [...local].reverse().find((e) => e.type === 'agent_completed');
          const name =
            run?.modelId ||
            models.find((m) => m.id === (slot === 'A' ? agentA : agentB))?.model ||
            'Model unavailable';
          return (
            <section className={`panel agent-panel ${slot.toLowerCase()}`} key={slot}>
              <div className="agent-heading">
                <div className="agent-avatar">{slot}</div>
                <div>
                  <p className="eyebrow">AGENT {slot}</p>
                  <h2>{name}</h2>
                </div>
                <Status
                  status={
                    run?.status ||
                    String(completion?.status || (local.length ? 'running' : 'ready'))
                  }
                />
              </div>
              <div className="agent-metrics">
                <span>
                  <Terminal size={14} />
                  {local.filter((e) => e.type === 'tool_result').length} calls
                </span>
                <span>
                  <Clock3 size={14} />
                  {run ? `${(run.totalDurationMs / 1000).toFixed(1)}s` : 'Awaiting result'}
                </span>
                <span>
                  <CheckCircle2 size={14} />
                  {run?.judge.totalScore ?? '—'} / 100
                </span>
              </div>
              <div className="agent-trace">
                {local.length ? (
                  <TraceTimeline events={local} />
                ) : (
                  <Empty title="Ready for the challenge">
                    独立上下文 · 相同任务 · 相同工具范围
                  </Empty>
                )}
              </div>
              {run && (
                <div className="agent-answer">
                  <p className="eyebrow">FINAL ANSWER / OBSERVABLE OUTPUT</p>
                  {run.error && (
                    <ErrorBox>
                      {run.errorCode}：{run.error}
                    </ErrorBox>
                  )}
                  <p>{run.finalAnswer?.answer}</p>
                  {run.finalAnswer?.selectedItems.length ? (
                    <div className="selected-items">
                      {run.finalAnswer.selectedItems.map((i) => (
                        <span key={i.id}>
                          {i.name}
                          {i.energyKcal !== undefined && ` · ${i.energyKcal.toFixed(1)} kcal`}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {run.judge.reason && <p className="subtle">{run.judge.reason}</p>}
                  <details>
                    <summary>最终结构化答案与断言</summary>
                    <pre>{pretty({ finalAnswer: run.finalAnswer, judge: run.judge })}</pre>
                  </details>
                </div>
              )}
            </section>
          );
        })}
      </div>
      {battle && battle.runs.length > 0 && (
        <>
          <ScoreComparison battle={battle} />
          <div className="report-actions">
            <Link className="button ghost" to={`/traces/${battle.id}`}>
              <ArrowUpRight size={16} />
              Explore full trace
            </Link>
            <a className="button ghost" href={`/api/battles/${battle.id}/report`}>
              <Download size={16} />
              Download JSON report
            </a>
          </div>
        </>
      )}
      <div className="note">
        {mode === 'demo'
          ? 'Demo / Synthetic：预定义合成 Agent 行为，不代表真实模型性能。'
          : mode === 'replay'
            ? 'Fixture Replay：真实模型调用，固定合成工具数据。LLM 输出并非绝对可复现。'
            : 'Live MCP：真实只读工具返回，不进入 Replay 标准排行榜；单位信息不足时不强行评分。'}
      </div>
    </>
  );
}
