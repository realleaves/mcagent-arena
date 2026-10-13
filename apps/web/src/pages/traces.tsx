import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { Download, Activity } from 'lucide-react';
import { api, type Battle, date } from '../lib/api';
import { useBattle } from '../hooks/use-battle';
import { PageHeader, Empty, ErrorBox, ModeBadge } from '../components/ui';
import { TraceTimeline } from '../components/trace';
export function Traces() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { battle, events, error } = useBattle(id);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    api<Battle[]>('/battles')
      .then(setBattles)
      .catch((e) => setLoadError(e.message));
  }, []);
  return (
    <>
      <PageHeader
        eyebrow="OBSERVABILITY / NO HIDDEN CHAIN OF THOUGHT"
        title="Trace Explorer"
        description="可观察事件、脱敏参数、工具返回和评分依据。"
        action={
          battle && (
            <a className="button ghost" href={`/api/battles/${battle.id}/report`}>
              <Download size={16} />
              Export report
            </a>
          )
        }
      />
      <section className="panel trace-selector">
        <Activity size={20} />
        <select value={id || ''} onChange={(e) => navigate(`/traces/${e.target.value}`)}>
          <option value="">选择一场对战</option>
          {battles.map((b) => (
            <option key={b.id} value={b.id}>
              {b.scenarioId} · {b.mode} · {date(b.startedAt)}
            </option>
          ))}
        </select>
        {battle && <ModeBadge mode={battle.mode} />}
      </section>
      {(error || loadError) && <ErrorBox>{error || loadError}</ErrorBox>}
      {battle ? (
        <Tabs.Root defaultValue="all">
          <Tabs.List className="tabs">
            <Tabs.Trigger value="all">All events · {events.length}</Tabs.Trigger>
            <Tabs.Trigger value="A">Agent A</Tabs.Trigger>
            <Tabs.Trigger value="B">Agent B</Tabs.Trigger>
          </Tabs.List>
          {['all', 'A', 'B'].map((slot) => (
            <Tabs.Content key={slot} value={slot} className="panel full-trace">
              <TraceTimeline
                full
                events={events.filter((e) => slot === 'all' || e.agentSlot === slot)}
              />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      ) : (
        <div className="panel">
          <Empty title="Follow the evidence">
            先运行一场对战，再查看每个步骤的可观察轨迹。<Link to="/arena">Start a battle →</Link>
          </Empty>
        </div>
      )}
    </>
  );
}
