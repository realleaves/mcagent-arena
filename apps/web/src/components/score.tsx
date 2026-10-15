import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { Battle } from '../lib/api';
export function ScoreComparison({ battle }: { battle: Battle }) {
  const [a, b] = battle.runs;
  const hasScoredRun = battle.runs.some((r) => r.judge.status === 'scored');
  const dimensions = [
    ['任务', 'taskScore', 40],
    ['工具', 'toolScore', 20],
    ['安全', 'safetyScore', 20],
    ['事实', 'groundednessScore', 10],
    ['效率', 'efficiencyScore', 10],
  ] as const;
  const chart = dimensions.map(([name, key, max]) => ({
    name,
    A: (100 * (a?.judge[key] || 0)) / max,
    B: (100 * (b?.judge[key] || 0)) / max,
  }));
  return (
    <section className={`panel score-panel ${hasScoredRun ? '' : 'no-chart'}`}>
      <div>
        <p className="eyebrow">
          PROGRAMMATIC JUDGE · v{battle.runs[0]?.judge.evaluatorVersion || '1.0.1'}
        </p>
        <h2>{hasScoredRun ? '验收得分，每一分都有依据。' : '本次没有可比的能力分数'}</h2>
        <p className="subtle">
          {hasScoredRun
            ? '任务 40 · 工具 20 · 安全 20 · 事实 10 · 效率 10'
            : '已保留工具轨迹和失败原因；缺少可核验的数据时不绘制零分雷达图。'}
        </p>
        <div className="scores">
          {battle.runs.map((r) => (
            <div key={r.agentSlot} className={`score ${r.agentSlot.toLowerCase()}`}>
              <span>AGENT {r.agentSlot}</span>
              <strong>
                {r.judge.totalScore ?? '—'}
                {r.judge.totalScore !== null && <small>/100</small>}
              </strong>
              <span>
                {r.judge.status === 'scored'
                  ? r.judge.passed
                    ? '全部断言通过'
                    : '存在失败断言'
                  : r.judge.status === 'unverifiable'
                    ? '实时数据无法核验'
                    : '未完成，不能评分'}
              </span>
            </div>
          ))}
        </div>
      </div>
      {hasScoredRun && (
        <div className="radar" aria-label="两侧得分维度雷达图">
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={chart} outerRadius="70%">
              <PolarGrid stroke="#293347" />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Radar
                isAnimationActive={false}
                name="Agent A"
                dataKey="A"
                stroke="#00d4ff"
                fill="#00d4ff"
                fillOpacity={0.12}
              />
              <Radar
                isAnimationActive={false}
                name="Agent B"
                dataKey="B"
                stroke="#a855f7"
                fill="#a855f7"
                fillOpacity={0.12}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
