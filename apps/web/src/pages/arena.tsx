import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Swords, ArrowUpRight, Download, Terminal, Clock3, CheckCircle2 } from 'lucide-react';
import { api, type Scenario, type Config, type Mode, type Battle, pretty } from '../lib/api';
import { useBattle } from '../hooks/use-battle';
import { PageHeader, ModeBadge, ErrorBox, Status, Empty } from '../components/ui';
import { TraceTimeline } from '../components/trace';
import { ScoreComparison } from '../components/score';
import { BattleTakeaways } from '../components/battle-takeaways';
import { scenarioGuides } from '../lib/scenario-guide';
export function Arena({ config }: { config?: Config }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
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
  useEffect(() => {
    const requested = searchParams.get('scenario');
    if (!id && requested && scenarios.some((s) => s.id === requested)) setScenarioId(requested);
  }, [id, searchParams, scenarios]);
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
  const guide = scenarioGuides[scenarioId];
  const running = battle?.status === 'running';
  return (
    <>
      <PageHeader
        eyebrow="McAgent Arena / 同一任务 · 独立执行"
        title="麦麦助手对比"
        description="检查营养、活动和安全查询是否有依据。先用 Demo 看懂流程，再用真实模型验收。"
        action={battle && <ModeBadge mode={battle.mode} />}
      />
      <section className="panel battle-controls">
        <label>
          助手 A
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
          助手 B
          <select value={agentB} onChange={(e) => setB(e.target.value)} disabled={running}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          任务场景
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            disabled={running}
          >
            {scenarios
              .filter((s) => s.mode.includes(mode))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id.slice(-3)} · {scenarioGuides[s.id]?.title || s.title}
                </option>
              ))}
          </select>
        </label>
        <label>
          运行方式
          <select
            value={mode}
            onChange={(e) => chooseMode(e.target.value as Mode)}
            disabled={running}
          >
            <option value="demo">Demo / Synthetic · 免密钥演示</option>
            <option value="replay">Fixture Replay · 真实模型 + 固定数据</option>
            <option value="live">Live MCP · 真实模型 + 官方数据</option>
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
          {starting ? '正在启动…' : running ? '正在执行…' : '开始对比'}
        </button>
      </section>
      {mode !== 'demo' && agentA && agentA === agentB && (
        <div className="note">
          两侧选用了同一个模型配置：这是两次独立运行，不能解读为两个不同模型的能力比较。
        </div>
      )}
      {mode !== 'demo' && config?.unavailableModels.length ? (
        <details className="model-availability panel">
          <summary>{config.unavailableModels.length} 个模型配置暂不可用，查看原因</summary>
          <ul>
            {config.unavailableModels.map((m) => (
              <li key={m.id}>
                {m.label}：{m.error}。请在本机 .env 修正后重启服务。
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {(error || traceError) && <ErrorBox>{error || traceError}</ErrorBox>}
      <div className="panel scenario-brief">
        <div>
          <p className="eyebrow">为什么要测这道题？</p>
          <h2>{guide?.title || current?.title}</h2>
          <p>{guide?.purpose || current?.description}</p>
        </div>
        <details open={!battle}>
          <summary>{mode === 'demo' ? 'Demo 操作与观察提示' : '操作提示'}</summary>
          <p>
            {mode === 'demo'
              ? guide?.lesson
              : '选择两个可用的模型，点击“开始对比”。先核对最终答案，再看失败断言及其对应的工具返回。真实模型请求可能消耗 API 额度；Replay 数据是固定合成数据，Live 数据来自官方 MCP。'}
          </p>
          {mode === 'demo' && (
            <p className="subtle">
              默认 A 是谨慎助手，B
              是故意出错的急躁助手。这里演示的是两种行为，分数不代表真实模型水平。
            </p>
          )}
        </details>
      </div>
      <div className="task-strip">
        <span className="eyebrow">本次交给助手的任务</span>
        <p>{current?.task}</p>
        <div className="task-limits">
          <span>v{current?.version}</span>
          <span>最多 6 轮</span>
          <span>最多 6 次工具调用</span>
          <span>限时 60 秒</span>
          <span>真实工具只读</span>
        </div>
      </div>
      <div className="arena-grid">
        {(['A', 'B'] as const).map((slot) => {
          const run = battle?.runs.find((r) => r.agentSlot === slot);
          const local = events.filter((e) => e.agentSlot === slot);
          const completion = [...local].reverse().find((e) => e.type === 'agent_completed');
          const modelId =
            run?.modelId ||
            models.find((m) => m.id === (slot === 'A' ? agentA : agentB))?.model ||
            '模型不可用';
          const name =
            mode === 'demo'
              ? modelId.includes('careful')
                ? '谨慎助手 · 合成演示'
                : modelId.includes('hasty')
                  ? '急躁助手 · 错误演示'
                  : modelId
              : modelId;
          return (
            <section className={`panel agent-panel ${slot.toLowerCase()}`} key={slot}>
              <div className="agent-heading">
                <div className="agent-avatar">{slot}</div>
                <div>
                  <p className="eyebrow">
                    助手 {slot} / AGENT {slot}
                  </p>
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
                  {local.filter((e) => e.type === 'tool_result').length} 次调用
                </span>
                <span>
                  <Clock3 size={14} />
                  {run ? `${(run.totalDurationMs / 1000).toFixed(1)}s` : '等待结果'}
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
                  <Empty title="点击“开始对比”后显示执行过程">
                    营养和活动答案都要能追溯到工具证据。
                  </Empty>
                )}
              </div>
              {run && (
                <div className="agent-answer">
                  <p className="eyebrow">助手回答 / 可观察输出</p>
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
          <BattleTakeaways battle={battle} />
          <ScoreComparison battle={battle} />
          <div className="report-actions">
            <Link className="button ghost" to={`/traces/${battle.id}`}>
              <ArrowUpRight size={16} />
              查看完整工具轨迹
            </Link>
            <a className="button ghost" href={`/api/battles/${battle.id}/report`}>
              <Download size={16} />
              下载 JSON 验收报告
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
