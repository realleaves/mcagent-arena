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

Business value: developers can inspect where Agents choose the wrong tool, invent missing nutrition, mishandle units/date filters, fail bounded recovery or attempt unsafe actions. This provides observable evidence for improving read-only nutrition and campaign assistants.

Official competition requires real MCP use plus the required documents and a public repository. This project has direct MCP success evidence. The repository is https://github.com/realleaves/mcagent-arena; publication/registration status is recorded in [contest submission](docs/contest-submission.md). No final competition eligibility or reward is claimed. WorkBuddy was not used; no workbuddy.md is fabricated.

Model configuration checks are separate: `pnpm arena:verify-provider` lists availability without generation; `pnpm arena:verify-provider --probe` makes a bounded native-tool-call request to each configured model and may incur usage charges. Current configured model IDs were not matched in the provider listings; the direct probes did not establish working native tool calling. No successful real dual-model Replay or Live benchmark is claimed.

A public [verification summary](docs/verification-summary.json) contains only tool names, timestamps, durations and payload hashes from two saved real calls, without tool payloads or credentials. These metadata are an execution record, not independent proof of model performance.
