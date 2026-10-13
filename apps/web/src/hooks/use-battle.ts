import { useCallback, useEffect, useState } from 'react';
import { api, type Battle, type StoredEvent } from '../lib/api';
const eventNames = [
  'battle_started',
  'agent_started',
  'model_requested',
  'tool_called',
  'tool_result',
  'format_repair',
  'agent_completed',
  'judge_completed',
  'battle_completed',
  'battle_failed',
  'battle_saved',
];
export function useBattle(id: string | undefined) {
  const [battle, setBattle] = useState<Battle>();
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const b = await api<Battle & { events: StoredEvent[] }>(`/battles/${id}`);
      setBattle(b);
      setEvents((prev) =>
        [...new Map([...prev, ...b.events].map((e) => [e.id, e])).values()].sort(
          (a, b) => a.id - b.id,
        ),
      );
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [id]);
  useEffect(() => {
    setBattle(undefined);
    setEvents([]);
    setError('');
    if (!id) return;
    void refresh();
    const source = new EventSource(`/api/battles/${id}/events`);
    const onEvent = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as StoredEvent;
        setEvents((prev) =>
          [...new Map([...prev, event].map((e) => [e.id, e])).values()].sort((a, b) => a.id - b.id),
        );
        if (['battle_saved', 'battle_completed', 'battle_failed'].includes(event.type))
          void refresh();
      } catch {
        setError('事件数据解析失败，将获取已保存状态。');
      }
    };
    eventNames.forEach((name) => source.addEventListener(name, onEvent as EventListener));
    source.onerror = () => {
      void refresh();
    };
    const poll = setInterval(() => {
      void refresh();
    }, 2000);
    return () => {
      source.close();
      clearInterval(poll);
    };
  }, [id, refresh]);
  return { battle, events, error, refresh };
}
