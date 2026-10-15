# McDonald's official MCP integration

Server: `https://mcp.mcd.cn`, official documentation: [M-China/mcd-mcp-server](https://github.com/M-China/mcd-mcp-server), [MCP platform](https://open.mcd.cn/mcp). Transport is Streamable HTTP. Installed SDK is `@modelcontextprotocol/client` 2.0.0, with actual root exports `Client` and `StreamableHTTPClientTransport`. The v2 call signature is `callTool(params, options)`.

Credentials: local `MCD_MCP_TOKEN` becomes the server-side `Authorization: Bearer <token>` header. Templates use environment placeholders only. Keys and headers never enter the browser, reports or Git. The service loads `.env` only at startup; restart after changing credentials.

Real execution evidence on 2026-10-13:

- Official connect / initialize and listTools succeeded.
- Real schemas included `list-nutrition-foods`, `campaign-calendar`, `now-time-info`.
- `now-time-info` with `{}` succeeded, observed request duration 193ms.
- `list-nutrition-foods` with `{}` succeeded, observed request duration 546ms.
- `campaign-calendar` with schema-derived specifiedDate=2026-10-10 succeeded, observed request duration 569ms.
- These statements describe direct read-only MCP verification, not successful GPT/DeepSeek Live Agent battles. Model availability and true Agent benchmarks require separate evidence.

The input schemas were obtained from actual listTools before requests. The two no-argument tools reported empty properties with no required fields. The calendar reported optional `specifiedDate` (yyyy-MM-dd). Do not replace these schemas with assumed inputs. Missing tools, un-compilable schemas, invalid arguments, 401, 429 and network/timeout failures are explicit error states.

Verification commands:

```bash
pnpm arena:verify-mcp
pnpm arena:verify-mcp --call
pnpm arena:verify-mcp --call --tool list-nutrition-foods
pnpm arena:verify-mcp --call --tool campaign-calendar --args '{"specifiedDate":"2026-10-10"}'
```

The script writes sanitized real schemas to `data/mcp-tools.json` and the latest verification trace to `data/mcp-verification.json`. Each invocation overwrites the latest verification file; copy it locally if you need separate evidence files. A success requires `source=live` and a record with `status=success`, real server response and timestamp. Data directory is gitignored to avoid publishing personal/live payloads by accident. Battle JSON export provides per-Agent traces when real model execution is available.

Every Agent uses a default-deny Tool Gateway. Only the three readonly names can reach the official client; McdClient independently enforces the same whitelist. create-order, cancel-order, mall-create-order, party-order-create, draw-lottery, auto-bind-coupons, delivery-create-address and any unknown tool are blocked. Safety mock deliberately submits a prohibited name to prove blocking; it never reaches official MCP. There is no real order, payment, address or coupon mutation code path.

Gateway validates the supplied real schema, counts physical attempts (including retries), enforces six calls and tool timeout. A shared Live limiter spaces requests by at least 150ms; 429 retries twice with exponential delay and never exceeds the task call budget. The model runner caps six turns, 60 seconds and token budgets. Raw tool text is untrusted data; no server-returned text is promoted into system instructions.

Demo uses scripted synthetic Agents. Replay uses real LLMs with fixed synthetic tool outputs and independent fixture state. Live uses real data and is excluded from standard Replay ranking. For unsupported live nutrient bases/date structures, scoring explicitly returns unverifiable, preserving the trace rather than pretending accuracy.

Live task version `1.0.0-live` now uses complete source-field snapshots: official nutrition TOON/JSON is decoded with `@toon-format/toon` and validated with Zod; official calendar `dailyList` entries retain their listing dates and titles. The model receives every relevant row, with snapshot-local reference IDs and without duplicate MCP wrappers. Bounded answers contain up to three source energy-field candidates or calendar entries. Scoring checks exact source facts and explicit missing-basis/unknown-validity disclosure; it does not infer per-serving amounts or active/cancelled states. Raw sanitized output and SHA256 remain in the trace. The revised adapter has synthetic protocol tests and offline saved-official-data parsing evidence, but no additional paid end-to-end model run yet. Previous Live results remain unchanged.

Business value: developers can inspect where Agents choose the wrong tool, invent missing nutrition, mishandle units/date filters, fail bounded recovery or attempt unsafe actions. This provides observable evidence for improving read-only nutrition and campaign assistants.

Official competition requires real MCP use plus the required documents and a public repository. This project has direct MCP success evidence. The repository is https://github.com/realleaves/mcagent-arena; publication/registration status is recorded in [contest submission](docs/contest-submission.md). No final competition eligibility or reward is claimed. WorkBuddy was not used; no workbuddy.md is fabricated.

Model checks are separate from official MCP verification: `pnpm arena:verify-provider --provider provider-a` checks the configured model listing without generation; adding `--probe` sends one potentially billable native-tool-call request to that Provider (256 output Token cap, 15-second timeout, synthetic tool definition). On 2026-10-15, after the account was funded, the native tool-call probe succeeded. A local scenario-001 Replay then completed two independent `deepseek-flash` runs against a **synthetic Fixture**, with scores 90 (failed evidence assertions) and 100. A separate model-driven Live battle completed two successful official read-only `list-nutrition-foods` calls and structured answers. The actual response contained 160 nutrition rows in a string table without a verifiable per-serving basis; both runs were marked `unverifiable` with no capability score. Neither battle compares distinct models. The earlier 2026-10-14 HTTP 402 probe remains documented in the development record.

A public [verification summary](docs/verification-summary.json) contains only tool names, timestamps, durations and payload hashes from two saved real calls, without tool payloads or credentials. These metadata are an execution record, not independent proof of model performance.
