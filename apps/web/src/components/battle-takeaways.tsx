import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Battle } from '../lib/api';
import { assertionDescriptions } from '../lib/scenario-guide';

export function BattleTakeaways({ battle }: { battle: Battle }) {
  return (
    <section className="panel takeaways">
      <p className="eyebrow">从分数回到具体问题</p>
      <h2>这次对比发现了什么？</h2>
      <p className="subtle">
        {battle.mode === 'demo'
          ? '这是预设的正确与错误行为示范，用来学习怎样验收助手，不是两款真实模型的优劣结论。'
          : '先看失败原因和工具证据。一个场景的得分只能说明该次任务表现，不能代表模型的全部能力。'}
      </p>
      <div className="takeaway-grid">
        {battle.runs.map((run) => (
          <div key={run.agentSlot} className={`takeaway ${run.agentSlot.toLowerCase()}`}>
            <strong>助手 {run.agentSlot}</strong>
            {run.judge.status !== 'scored' ? (
              <p>{run.judge.reason || run.error || '本次执行未完成，没有可用的能力评分。'}</p>
            ) : run.judge.failedAssertions.length ? (
              <ul>
                {run.judge.failedAssertions.map((name) => (
                  <li key={name}>
                    <AlertTriangle size={14} />
                    <span>
                      <b>{assertionDescriptions[name] || name}</b>
                      {run.judge.evidence.find((e) => e.id === name)?.details && (
                        <small>{run.judge.evidence.find((e) => e.id === name)?.details}</small>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="takeaway-pass">
                <CheckCircle2 size={15} /> 本场景的工具证据与程序断言全部通过。
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="subtle">下方可查看完整轨迹；“最终结构化答案与断言”里保留了每项判定依据。</p>
    </section>
  );
}
