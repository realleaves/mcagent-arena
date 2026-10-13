# McAgent Arena

**The Open-Source MCP Agent Battle & Benchmark Platform**

**Same Task. Same Tools. May the Best Agent Win.**

A local acceptance-testing platform for developers building McDonald's MCP assistants. Compare two candidates on nutrition calculations, campaign dates, missing information and read-only safety. Inspect actual calls, evaluate structured claims with executable assertions, and export explainable reports. It is a developer testing tool; ordinary food/activity lookup does not require comparing agents.

![Running synthetic demonstration](docs/screenshots/arena.png)

## Run locally

Ubuntu, Node.js >=22.13 and pnpm 11.25.0:

```bash
npm install -g pnpm@11.25.0
git clone https://github.com/realleaves/mcagent-arena.git
cd mcagent-arena
pnpm install
cp -n .env.example .env
chmod 600 .env
pnpm dev
```

Open http://127.0.0.1:5173. The API defaults to port 3001. Demo requires no keys. `pnpm build && pnpm start` serves the production build at http://127.0.0.1:3001.

The UI now includes Chinese business-task shortcuts, a four-step walkthrough and plain-language failure explanations, with red/yellow accents and an original CSS meal illustration. Click **体验麦麦 Demo**, keep the Synthetic careful/hasty assistants, pick a scene and click **开始对比**. For example, the missing-sodium scene demonstrates honest uncertainty versus a fabricated 123 mg value. No Demo score represents real model performance.

## Modes and features

- **Demo / Synthetic:** scripted agents and fixed synthetic data. Demonstration scores never represent real model performance.
- **Fixture Replay:** real OpenAI-compatible LLMs with fixed synthetic MCP tool outputs. Comparable completed results enter grouped Replay leaderboards.
- **Live MCP:** real read-only McDonald's MCP data. Never mixed with Replay rankings. Incomplete units or unsupported data structures produce an explicit unverifiable result.

Four pages: dashboard, symmetric Battle Arena, trace explorer and results. Two independent contexts, six scenes, Zod final-output validation, one format repair, bounded retries, SSE, SQLite persistence and sanitized JSON downloads. Chat Completions and Responses adapters implement native tool calls. GPT-6.1 Sol needs Responses for tool calling; verify your provider supports it.

Scenarios: nutrition filtering, numeric comparison, missing information, campaign/date querying, temporary tool failure recovery and unauthorized-action refusal. Programmatic weights: task40, tools20, safety20, groundedness10, efficiency10. Safety failure fails the scene; unfinished infrastructure/model runs get null capability scores.

## Configure providers

Keep MCP/model credentials only in the ignored local `.env`. Set each `AGENT_*_API_BASE_URL`, `API_KEY` and exact `MODEL` from the provider's model listing. Configure `API_PROTOCOL=chat` or `responses`; GPT-6.1 Sol auto-selects Responses. The UI shows available configured models and explains unavailable ones. Restart after editing `.env`. Real model requests may incur charges.

```bash
pnpm arena:demo
pnpm arena:run --scenario scenario-004 --mode demo
pnpm arena:run --scenario scenario-001 --mode replay --agent-a provider-a --agent-b provider-b --out data/replay-report.json
pnpm arena:verify-mcp --call
pnpm arena:test
pnpm typecheck
pnpm lint
pnpm build
```

`arena:run` requires the local service running. `arena:demo` uses an isolated in-memory database and writes `data/demo-report.json`.

## Real MCP and safety

Official endpoint: https://mcp.mcd.cn, Streamable HTTP with a server-side Bearer token. Obtain a Token from https://open.mcd.cn/mcp. Installed SDK: `@modelcontextprotocol/client` 2.0.0. On 2026-10-13 the official handshake/tool schemas and real `now-time-info`/`list-nutrition-foods`/`campaign-calendar` calls succeeded. This direct integration evidence is separate from actual live model battle results.

The gateway and client only permit `list-nutrition-foods`, `campaign-calendar`, `now-time-info`. All other tools default to deny. No ordering, cancellation, payments, coupon claiming or address writes. Recovery and safety are mock-only. Shared token limiter, six model turns/tool attempts, 60-second total deadline and token bounds prevent unlimited local runs. The service binds to localhost and rejects arbitrary URLs and cross-origin requests. No multi-user/public deployment is provided.

Only observable calls, typed final output and evaluator evidence are recorded. Hidden reasoning is neither requested nor shown. Structured claims are checked; arbitrary free-text prose is not fully semantically judged. LLM output is not absolutely reproducible.

## Structure and documentation

`apps/web`: React/Vite/Tailwind/Radix/Lucide/Recharts. `apps/api`: Fastify/SQLite/SSE. `packages/runner`, `mcp`, `benchmark`, `shared`: isolated protocols and business logic. Versioned JSON scenes and synthetic fixtures live under `benchmarks` and `fixtures`. Tests use Vitest and TypeScript strict; dependencies are locked.

See [architecture](docs/architecture.md), [scoring](docs/scoring.md), [API](docs/api.md), [walkthrough](docs/demo.md), [MCP evidence](MCP_INTEGRATION.md), [development verification](docs/development-status.md) and the [agent skill](skills/mcagent-arena/SKILL.md).

Built for the 2026 McDonald's China developer innovation challenge; an independent, unofficial project. The contest declaration was downloaded unchanged from the official repository. WorkBuddy was not used. Repository: [realleaves/mcagent-arena](https://github.com/realleaves/mcagent-arena). See [submission record](docs/contest-submission.md) for registration status. Final contest eligibility and awards are not claimed. MIT license covers project code; official documents remain unchanged.
