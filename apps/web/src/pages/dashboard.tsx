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
  Sandwich,
  CalendarDays,
  ArrowUpRight,
} from 'lucide-react';
import { api, type Battle, type Scenario, type Config, date } from '../lib/api';
import { ModeBadge, Empty, ErrorBox, Status } from '../components/ui';
import { MealIllustration } from '../components/meal-illustration';
import { scenarioGuides } from '../lib/scenario-guide';
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
            麦麦业务场景 · MCP 助手验收台
          </p>
          <h1>
            同一道麦麦任务，
            <br />
            <span>哪位助手更靠谱？</span>
          </h1>
          <p>
            查热量、比营养、找活动：回答听起来不错，数据真的对吗？
            <br />
            用官方 MCP 工具和固定测试题，检查助手的每一步与每个结论。
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/arena">
              <Sandwich size={18} />
              体验麦麦 Demo
              <ArrowRight size={17} />
            </Link>
            <a className="button ghost" href="#how-to">
              这个怎么用？
            </a>
          </div>
        </div>
        <MealIllustration />
      </section>
      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="stats-grid">
        <div className="stat">
          <FlaskConical />
          <span>可执行的麦麦业务场景</span>
          <strong>
            {scenarios.length.toString().padStart(2, '0')}
            <small>BENCHMARK v1.0</small>
          </strong>
        </div>
        <div className="stat">
          <Swords />
          <span>本机已保存的对比</span>
          <strong>
            {battles.length.toString().padStart(2, '0')}
            <small>LOCAL SQLITE</small>
          </strong>
        </div>
        <div className="stat">
          <PlugZap />
          <span>麦当劳官方 MCP 连接</span>
          <strong className="stat-status">
            {mcp.connected ? '已连接' : '尚未检测'}
            <button
              className="inline-button"
              onClick={() => void probe()}
              disabled={probing || !config?.mcpConfigured}
            >
              <RefreshCw size={13} className={probing ? 'spin' : ''} />
              检测
            </button>
          </strong>
        </div>
        <div className="stat">
          <ShieldCheck />
          <span>真实工具执行边界</span>
          <strong className="stat-status">
            只读查询<small>不执行真实下单</small>
          </strong>
        </div>
      </div>
      <section className="panel purpose-panel">
        <div>
          <p className="eyebrow">给麦当劳 MCP 助手做验收</p>
          <h2>用途：选模型、查错误、验证一次改动。</h2>
          <p>
            你在开发一个麦当劳 AI
            助手，准备接入营养或活动查询。把同一道题交给两个候选模型，检查是否有数据依据、哪里算错、遇到异常会怎么处理，再决定用哪个模型或修哪一处。
          </p>
          <p className="subtle">
            面向助手开发者与测试人员。普通用户只是想查餐品或活动，不需要先做模型对比；这里验证的是助手能否可靠地完成这些查询。
          </p>
        </div>
        <div className="purpose-example">
          <CalendarDays size={22} />
          <strong>“10 月 10 日有什么活动？”</strong>
          <span>
            助手查到了活动，但把已取消的活动也推荐给用户。看分数只能知道没通过；看工具返回和日期断言，才知道该修什么。
          </span>
          <Link to="/arena?scenario=scenario-004">
            体验这个问题 <ArrowRight size={14} />
          </Link>
        </div>
      </section>
      <section id="how-to" className="panel walkthrough">
        <div className="section-heading">
          <div>
            <p className="eyebrow">第一次用 · 无需任何密钥</p>
            <h2>四步看懂一次助手验收</h2>
          </div>
          <ModeBadge mode="demo" />
        </div>
        <ol>
          <li>
            <b>01</b>
            <div>
              <strong>选一道麦麦任务</strong>
              <p>从下面的营养、活动或安全场景进入。</p>
            </div>
          </li>
          <li>
            <b>02</b>
            <div>
              <strong>点击“开始对比”</strong>
              <p>Demo 预设谨慎与急躁两种行为，不收费。</p>
            </div>
          </li>
          <li>
            <b>03</b>
            <div>
              <strong>核对答案和错误</strong>
              <p>看实际调用与“这次对比发现了什么”。</p>
            </div>
          </li>
          <li>
            <b>04</b>
            <div>
              <strong>再换成真实模型</strong>
              <p>配置可用模型后用 Replay 验收，Live 查官方数据。</p>
            </div>
          </li>
        </ol>
      </section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">从具体问题开始</p>
          <h2>六道麦麦业务测试题</h2>
        </div>
        <span className="subtle">点击任务，进入免密钥 Demo</span>
      </div>
      <div className="scenario-grid">
        {Object.entries(scenarioGuides).map(([id, guide]) => (
          <Link className="panel scenario-card" to={`/arena?scenario=${id}`} key={id}>
            <div>
              <span className="scenario-number">{id.slice(-3)}</span>
              <span className="scenario-category">{guide.category}</span>
              <ArrowUpRight size={16} />
            </div>
            <h3>{guide.title}</h3>
            <p>{guide.purpose}</p>
            <span className="scenario-entry">
              体验任务 <ArrowRight size={14} />
            </span>
          </Link>
        ))}
      </div>
      <section className="section-heading">
        <div>
          <p className="eyebrow">从演示到真实验证</p>
          <h2>先理解流程，再接入自己的模型。</h2>
        </div>
      </section>
      <div className="modes-grid">
        {[
          [
            'demo',
            '01',
            '先体验 Demo',
            '无需密钥。用预设正确与错误行为学习怎么验收；餐品、活动和成绩都是合成示范。',
          ],
          [
            'replay',
            '02',
            '用 Replay 选模型',
            '配置模型 Key 后，让真实模型答固定测试题。工具数据一致，便于查错和比较；完成的同条件结果才可排名。',
          ],
          [
            'live',
            '03',
            '用 Live 验证接入',
            '再加麦当劳 Token，查询官方实时营养或活动数据。保留真实证据，数据或单位不足时明确说明，独立展示。',
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
          <p className="eyebrow">本机验收记录</p>
          <h2>最近的助手对比</h2>
        </div>
        <Link to="/results">
          查看全部
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
                    {scenarioGuides[b.scenarioId]?.title ||
                      scenarios.find((s) => s.id === b.scenarioId)?.title ||
                      b.scenarioId}
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
          <Empty title="还没有验收记录">
            选一道任务，运行免密钥 Demo。<Link to="/arena">开始体验 →</Link>
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
