import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Trophy, ArrowUpRight } from 'lucide-react';
import { api, type Battle, type Mode, date } from '../lib/api';
import { PageHeader, ModeBadge, Status, Empty, ErrorBox } from '../components/ui';
export function Results() {
  const [battles, setBattles] = useState<Battle[]>([]),
    [filter, setFilter] = useState<Mode | 'all'>('all'),
    [error, setError] = useState('');
  useEffect(() => {
    api<Battle[]>('/battles')
      .then(setBattles)
      .catch((e) => setError(e.message));
  }, []);
  const groups = new Map<
    string,
    { label: string; model: string; score: number; battleId: string }[]
  >();
  for (const b of battles.filter((b) => b.mode === 'replay' && b.status === 'completed'))
    for (const r of b.runs.filter(
      (r) => r.judge.status === 'scored' && r.judge.totalScore !== null,
    )) {
      const key = b.evaluationKey + JSON.stringify(r.modelParameters);
      groups.set(key, [
        ...(groups.get(key) || []),
        {
          label: `${b.scenarioId} · v${b.scenarioVersion}`,
          model: r.modelId,
          score: r.judge.totalScore!,
          battleId: b.id,
        },
      ]);
    }
  return (
    <>
      <PageHeader
        eyebrow="RESULTS / REPRODUCIBLE EVALUATION CONDITIONS"
        title="验收记录与模型排名"
        description="每一场对战都可追溯；标准排名仅比较相同 Fixture、版本、提示词和参数条件。"
      />
      {error && <ErrorBox>{error}</ErrorBox>}
      <section className="panel leaderboard">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIXTURE REPLAY ONLY</p>
            <h2>
              <Trophy size={21} />
              Standard benchmark groups
            </h2>
          </div>
          <span className="badge replay">Demo / Live excluded</span>
        </div>
        {groups.size ? (
          [...groups.entries()].map(([key, runs]) => (
            <div key={key} className="leaderboard-group">
              <h3>{runs[0]?.label}</h3>
              {runs
                .sort((a, b) => b.score - a.score)
                .map((r, i) => (
                  <Link
                    key={`${r.battleId}-${i}`}
                    to={`/arena/${r.battleId}`}
                    className="leaderboard-row"
                  >
                    <span className="mono muted">{String(i + 1).padStart(2, '0')}</span>
                    <strong>{r.model}</strong>
                    <span>{r.score}/100</span>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
            </div>
          ))
        ) : (
          <Empty title="等待真实模型 Replay 验收结果">
            Demo 演示和 Live 实时结果会保存在历史中，但不会进入标准排行榜。
          </Empty>
        )}
      </section>
      <div className="section-heading">
        <h2>助手验收历史</h2>
        <select
          className="filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Mode | 'all')}
        >
          <option value="all">All modes</option>
          <option value="demo">Demo / Synthetic</option>
          <option value="replay">Fixture Replay</option>
          <option value="live">Live MCP</option>
        </select>
      </div>
      <div className="panel table-wrap">
        {battles.length ? (
          <table>
            <thead>
              <tr>
                <th>Challenge / version</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Agent A / B</th>
                <th>Calls</th>
                <th>Duration</th>
                <th>Report</th>
              </tr>
            </thead>
            <tbody>
              {battles
                .filter((b) => filter === 'all' || b.mode === filter)
                .map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/arena/${b.id}`}>
                        {b.scenarioId}
                        <ArrowUpRight size={13} />
                      </Link>
                      <small>
                        v{b.scenarioVersion} · {date(b.startedAt)}
                      </small>
                    </td>
                    <td>
                      <ModeBadge mode={b.mode} />
                    </td>
                    <td>
                      <Status status={b.status} />
                    </td>
                    <td>
                      <strong className="cyan">{b.runs[0]?.judge.totalScore ?? '—'}</strong> /{' '}
                      <strong className="purple">{b.runs[1]?.judge.totalScore ?? '—'}</strong>
                      <small>
                        {b.runs
                          .map((r) =>
                            r.judge.passed
                              ? 'PASS'
                              : r.errorCode || r.judge.failedAssertions.join(', '),
                          )
                          .join(' / ')}
                      </small>
                    </td>
                    <td>{b.runs.map((r) => r.records.length).join(' / ') || '—'}</td>
                    <td>
                      {b.runs.map((r) => `${(r.totalDurationMs / 1000).toFixed(1)}s`).join(' / ') ||
                        '—'}
                    </td>
                    <td>
                      <a aria-label="下载对战JSON报告" href={`/api/battles/${b.id}/report`}>
                        <Download size={18} />
                      </a>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <Empty title="还没有验收记录">从免密钥 Demo 开始，结果会自动保存到本机 SQLite。</Empty>
        )}
      </div>
    </>
  );
}
