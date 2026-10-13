# HTTP API

Default origin: `http://127.0.0.1:3001`. JSON request bodies are capped at 8KB. No auth/multi-user support; use locally. Invalid bodies / IDs return 400; unknown saved battles return 404; admission limit returns 429. Read-only routes never initiate model inference. Config may query providers' model listings.

| Method | Path                      | Purpose                                                                                                            |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/health`             | Local process health                                                                                               |
| GET    | `/api/config`             | Available model IDs, unavailable configuration reasons and mode availability; `?refresh=1` rechecks model metadata |
| GET    | `/api/scenarios`          | Six validated scene definitions                                                                                    |
| GET    | `/api/mcp/status`         | Last connection probe result; no inference or implicit connection                                                  |
| POST   | `/api/mcp/probe`          | Connect/list real MCP schemas (200 success, 503 failure); no tool write                                            |
| POST   | `/api/battles`            | Start one async battle (202)                                                                                       |
| GET    | `/api/battles`            | Latest 100 battles                                                                                                 |
| GET    | `/api/battles/:id`        | Saved state, two results and observable events                                                                     |
| GET    | `/api/battles/:id/events` | SSE history plus live updates; supports Last-Event-ID                                                              |
| GET    | `/api/battles/:id/report` | Download sanitized JSON report                                                                                     |

```bash
curl -fsS http://127.0.0.1:3001/api/battles \
  -H 'Content-Type: application/json' \
  -d '{"scenarioId":"scenario-001","agentA":"demo-careful","agentB":"demo-hasty","mode":"demo"}'
```

Provider choices are server-owned IDs (`provider-a`, `provider-b`). Demo choices are `demo-careful`, `demo-hasty`. The API strictly rejects extra fields, including user-supplied API Base URLs/MCP URLs. Replay requires configured models found in the provider's model listing. Live also requires the MCP Token. Recovery and safety reject Live regardless of credentials.

SSE types: battle_started, agent_started, model_requested, tool_called, tool_result, format_repair, agent_completed, judge_completed, battle_completed, battle_failed, battle_saved. Events have persistent numeric ID, battle sequence, Agent slot when relevant, timestamp and sanitized input/output. A per-Agent tool-attempt sequence is emitted as `step` on tool_called and in the tool record; the SSE envelope sequence numbers the whole battle.

`battle_completed` is an execution event; `battle_saved` confirms the final SQLite result snapshot is ready. Reconnect or fetch the saved battle to recover state. Report eligibility is explicit in `standardLeaderboardEligible`; null scores are not capability rankings.
