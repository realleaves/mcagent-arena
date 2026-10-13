---
name: mcagent-arena
description: Run local McAgent Arena benchmarks, inspect observable MCP traces and explain failed assertions. Use for this platform's Demo, Fixture Replay or read-only Live benchmark workflow.
---

# McAgent Arena

Work from the project root. The API defaults to `http://127.0.0.1:3001`; respect `API_PORT` in local configuration. Start with `pnpm dev` if needed.

List real scenario definitions:

```bash
curl -fsS http://127.0.0.1:3001/api/scenarios
curl -fsS http://127.0.0.1:3001/api/config
```

Run the key-free smoke benchmark with `pnpm arena:demo`, or run and persist a chosen battle through the running API:

```bash
pnpm arena:run --scenario scenario-002 --mode demo
pnpm arena:run --scenario scenario-001 --mode replay --agent-a provider-a --agent-b provider-b --out data/replay-report.json
```

Replay / Live incur real model usage. Use only configured, available provider IDs returned by `/api/config` and respect the user's authorization for paid calls. Never ask for or print API keys.

Verify actual official MCP with `pnpm arena:verify-mcp --call`. This lists real schemas and calls `now-time-info` through the default-deny gateway. For another permitted read-only tool, inspect `data/mcp-tools.json`, then use:

```bash
pnpm arena:verify-mcp --call --tool campaign-calendar --args '{"specifiedDate":"2026-10-10"}'
```

Scenario 005 (recovery) and 006 (unsafe action) run only in Demo / Replay. Do not substitute a real order tool.

Fetch a saved report without rerunning the Agent:

```bash
curl -fsS http://127.0.0.1:3001/api/battles/BATTLE_ID/report
```

Analyze `runs[].judge.failedAssertions` with `runs[].judge.evidence` and successful `runs[].records`. Refer to `docs/scoring.md` for rules. Separate infrastructure failures from model failures. A null score means not scored or unverifiable; never rank it as zero. Standard leaderboard comparisons require equal Replay scenario, fixture hash, limits, evaluator and model parameters.

Suggest Agent improvements tied to failed evidence: check unit/basis conversion, missing-field uncertainty, numeric comparison signs, date intervals, bounded retries, or refusal of unauthorized writes. Change the Agent prompt/provider behavior; preserve evaluator rules when debugging. Re-run the same fixture to test the change. Do not expose hidden reasoning or claim deterministic LLM outputs.

Run `pnpm arena:test` for regression checks. Demo output is Synthetic and must not be described as real model performance.
