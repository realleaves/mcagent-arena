import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { BattleAgentRun } from '../../../../packages/runner/src/battle-runner.js';
import type { Mode } from '../../../../packages/shared/src/schemas.js';
import type { ObservableEvent } from '../../../../packages/shared/src/types.js';
import { redact } from '../../../../packages/shared/src/redact.js';
export interface Battle {
  id: string;
  scenarioId: string;
  scenarioVersion: string;
  fixtureHash: string;
  mode: Mode;
  status: 'running' | 'completed' | 'partial' | 'failed' | 'interrupted';
  startedAt: string;
  finishedAt?: string;
  agentA: string;
  agentB: string;
  runs: BattleAgentRun[];
  evaluationKey: string;
}
export interface StoredEvent extends ObservableEvent {
  id: number;
  battleId: string;
  timestamp: string;
  sequence: number;
}
export class BattleStore {
  readonly db: DatabaseSync;
  constructor(path = './data/arena.sqlite') {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS Battle(id TEXT PRIMARY KEY,scenarioId TEXT,scenarioVersion TEXT,mode TEXT,status TEXT,startedAt TEXT,finishedAt TEXT,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS AgentRun(id TEXT PRIMARY KEY,battleId TEXT NOT NULL REFERENCES Battle(id),agentSlot TEXT,providerId TEXT,modelId TEXT,modelParameters TEXT,status TEXT,finalAnswer TEXT,totalDurationMs INTEGER,payload TEXT);
 CREATE TABLE IF NOT EXISTS TraceEvent(id INTEGER PRIMARY KEY AUTOINCREMENT,battleId TEXT NOT NULL REFERENCES Battle(id),agentRunId TEXT,sequence INTEGER,type TEXT,toolName TEXT,sanitizedInput TEXT,sanitizedOutput TEXT,durationMs INTEGER,timestamp TEXT,payload TEXT);
 CREATE TABLE IF NOT EXISTS JudgeResult(id TEXT PRIMARY KEY,agentRunId TEXT REFERENCES AgentRun(id),totalScore INTEGER,dimensionScores TEXT,passed INTEGER,failedAssertions TEXT,evaluatorVersion TEXT,payload TEXT);
 CREATE INDEX IF NOT EXISTS trace_battle ON TraceEvent(battleId,id);`);
    for (const row of this.db.prepare("SELECT payload FROM Battle WHERE status='running'").all()) {
      const b = JSON.parse(String(row.payload)) as Battle;
      b.status = 'interrupted';
      b.finishedAt = new Date().toISOString();
      this.save(b);
      this.append(b.id, {
        type: 'battle_failed',
        status: 'interrupted',
        error: '服务重启导致中断；没有重新发起模型调用。',
      });
    }
  }
  save(b: Battle) {
    const safe = redact(b) as Battle;
    this.db
      .prepare(
        'INSERT INTO Battle VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,finishedAt=excluded.finishedAt,payload=excluded.payload',
      )
      .run(
        b.id,
        b.scenarioId,
        b.scenarioVersion,
        b.mode,
        b.status,
        b.startedAt,
        b.finishedAt || null,
        JSON.stringify(safe),
      );
  }
  saveRuns(b: Battle) {
    this.db.exec('BEGIN');
    try {
      for (const r of b.runs) {
        const id = `${b.id}-${r.agentSlot}`;
        const safe = redact(r);
        this.db
          .prepare('INSERT OR REPLACE INTO AgentRun VALUES(?,?,?,?,?,?,?,?,?,?)')
          .run(
            id,
            b.id,
            r.agentSlot,
            r.providerId,
            r.modelId,
            JSON.stringify(r.modelParameters),
            r.status,
            JSON.stringify(redact(r.finalAnswer)),
            r.totalDurationMs,
            JSON.stringify(safe),
          );
        const j = r.judge;
        this.db.prepare('INSERT OR REPLACE INTO JudgeResult VALUES(?,?,?,?,?,?,?,?)').run(
          randomUUID(),
          id,
          j.totalScore,
          JSON.stringify({
            task: j.taskScore,
            tool: j.toolScore,
            safety: j.safetyScore,
            groundedness: j.groundednessScore,
            efficiency: j.efficiencyScore,
          }),
          j.passed ? 1 : 0,
          JSON.stringify(j.failedAssertions),
          j.evaluatorVersion,
          JSON.stringify(j),
        );
      }
      this.save(b);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  append(battleId: string, event: ObservableEvent): StoredEvent {
    const sanitized = redact(event) as ObservableEvent;
    const timestamp = new Date().toISOString();
    const sequence =
      Number(
        this.db.prepare('SELECT COUNT(*) AS n FROM TraceEvent WHERE battleId=?').get(battleId)?.n ||
          0,
      ) + 1;
    const runId = event.agentSlot ? `${battleId}-${event.agentSlot}` : null;
    const r = this.db
      .prepare(
        'INSERT INTO TraceEvent(battleId,agentRunId,sequence,type,toolName,sanitizedInput,sanitizedOutput,durationMs,timestamp,payload) VALUES(?,?,?,?,?,?,?,?,?,?)',
      )
      .run(
        battleId,
        runId,
        sequence,
        event.type,
        event.toolName || null,
        JSON.stringify(sanitized.input ?? null),
        JSON.stringify(sanitized.output ?? null),
        event.durationMs || null,
        timestamp,
        JSON.stringify(sanitized),
      );
    return { ...sanitized, id: Number(r.lastInsertRowid), battleId, timestamp, sequence };
  }
  get(id: string): Battle | undefined {
    const row = this.db.prepare('SELECT payload FROM Battle WHERE id=?').get(id);
    return row ? (JSON.parse(String(row.payload)) as Battle) : undefined;
  }
  list(): Battle[] {
    return this.db
      .prepare('SELECT payload FROM Battle ORDER BY startedAt DESC LIMIT 100')
      .all()
      .map((r) => JSON.parse(String(r.payload)) as Battle);
  }
  events(id: string, after = 0): StoredEvent[] {
    return this.db
      .prepare(
        'SELECT id,battleId,sequence,timestamp,payload FROM TraceEvent WHERE battleId=? AND id>? ORDER BY id',
      )
      .all(id, after)
      .map((r) => ({
        ...JSON.parse(String(r.payload)),
        id: Number(r.id),
        battleId: String(r.battleId),
        sequence: Number(r.sequence),
        timestamp: String(r.timestamp),
      }));
  }
  close() {
    this.db.close();
  }
}
