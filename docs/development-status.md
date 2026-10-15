# Development and verification evidence

Verified on 2026-10-13 in `/home/real/Desktop/mcagent-arena`.

## Implemented phases

1. Workspace/API/React bootstrap: Node22.22.2, pnpm11.25.0; frontend and API started; initial typecheck and health test passed.
2. MCP: official v2.0.0 client, real schemas, default-deny gateway, schema validation, timeout, shared rate limiter, bounded429 retries and redaction. Initial16 tests passed. Actual official MCP connect, listTools and three read-only tools succeeded.
3. Runner/benchmark: native Chat Completions and Responses, independent contexts, bounded loop, one format repair, six JSON scenes and fixed synthetic fixtures. Initial36 tests passed. Real configured provider availability/protocol probes were attempted and failed as documented below.
4. Battle/API/SSE/SQLite: independent results, durable event history, safe IDs/body validation, report export, local Host/Origin guards and interrupted-state recovery. Initial41 tests passed.
5. UI: four working pages, live observable timelines, radar scores, trace filters, history, downloadable reports and mobile layout. Browser QA passed with zero page errors and no390px overflow. Production build passed.
6. Open-source artifacts: Chinese/English READMEs, original official declaration, MCP guide/config, architecture/scoring/API/demo docs, MIT license, real CLI scripts, validated Skill and screenshots. Local Git initialized. No public push/registration/deployment.

## Commands actually executed

| Command                                                                                         | Observed result                                                                                                                                              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `node --version`                                                                                | v22.22.2                                                                                                                                                     |
| `git --version`                                                                                 | 2.34.1                                                                                                                                                       |
| `pnpm --version`                                                                                | 11.25.0                                                                                                                                                      |
| `pnpm install --offline --store-dir /tmp/arena-pnpm-store`                                      | Installed/resolved locked dependencies after network download; esbuild allowed explicitly                                                                    |
| `pnpm install --offline` with existing modules                                                  | Returned Already up to date                                                                                                                                  |
| `pnpm typecheck`                                                                                | Passed                                                                                                                                                       |
| `pnpm lint`                                                                                     | Passed                                                                                                                                                       |
| `pnpm test`                                                                                     | 53 tests passed,4 files                                                                                                                                      |
| `pnpm build`                                                                                    | Vite frontend and strict TypeScript API build passed; split JS bundles about303KB each                                                                       |
| `pnpm format:check`                                                                             | Passed after formatting fixes                                                                                                                                |
| `pnpm arena:demo`                                                                               | Completed actual isolated Demo/API/runner/gateway/judge flow; evaluator1.0.1 nutrition scores100/50, both Synthetic                                          |
| `pnpm arena:run --scenario scenario-004 --mode demo --out data/campaign-demo-report.json`       | Persisted completed two-Agent battle; scores100/60, failed date-filter assertion for Hasty                                                                   |
| `pnpm arena:verify-mcp --call`                                                                  | Official connection and real now-time-info succeeded                                                                                                         |
| `pnpm arena:verify-mcp --call --tool list-nutrition-foods`                                      | Official nutrition call succeeded                                                                                                                            |
| `pnpm arena:verify-mcp --call --tool campaign-calendar --args '{"specifiedDate":"2026-10-10"}'` | Official calendar call succeeded                                                                                                                             |
| `pnpm arena:verify-provider --probe`                                                            | Current model IDs not listed; A request returned NETWORK/fetch failed; B Responses request returned HTTP503; no successful native model verification claimed |
| `pnpm test:browser`                                                                             | Synthetic battle, trace filter, results, refresh, mobile checks passed;0 page errors, no overflow                                                            |
| `API_PORT=3002 DATABASE_URL=/tmp/arena-production.sqlite pnpm start`                            | Production API/frontend started and browser Demo flow passed with isolated DB                                                                                |
| Skill quick_validate.py                                                                         | Skill is valid                                                                                                                                               |
| Public source/built output credential-value scan                                                | No real credential-value matches; .env/data/node_modules/tooling ignored by Git                                                                              |

## Prior failures and corrections

- On2026-10-11 the sandbox blocked terminal network and cache writes; pnpm was not globally available. Initial offline installation lacked dependencies. Work resumed after permissions were changed.
- pnpm11 build approval/settings and an initial store mismatch were resolved for scripts. The project uses explicit dependency installation instead of silently reinstalling before every script.
- A cold offline migration to the default store lacked cached tarballs; the existing dependency tree was restored. Adding Playwright used the original store. A fresh normal install may need network; a successful cold fully-offline reinstall is not claimed.
- Initial API NodeNext build encountered AJV CJS type interop; ESNext/Bundler build resolution fixed it, and production Node execution passed.
- Initial UI check used an ambiguous history selector after multiple battles; it now locates the newly created battle ID.
- Formatting warnings were fixed; the official declaration is excluded from formatting.
- Evaluator1.0.0 gave task points for a completed self-report;1.0.1 requires actual task assertions. Old saved Demo reports retain the original evaluator. New tests prevent unearned completion credit and fabricated no-tool ranking.
- Redaction was narrowed to preserve numeric token budgets and configured reasoning effort while removing credentials and hidden reasoning fields. Model-visible tool data and public model labels are sanitized too.
- Read-only calls outside a scenario are blocked as tool-scope errors; unlisted global tools are side-effect guard errors. Real MCP auth/network failure is distinguished from injected recovery-fixture failure.
- An Oct13 refresh download of the declaration and DeepSeek thinking-mode documentation timed out. No unverified new provider-specific option was added.

## Remaining external/model verification

The current `.env` has credentials, but model IDs were not matched in the actual listings. Official DeepSeek listed `deepseek-flash` and `deepseek-v4-pro`, while configured A is a different branded name. The configured relay listing did not include `gpt-6.1-sol`; its Responses probe returned503. A model combination choice was requested; no credential values or account details are recorded here.

Real dual-LLM Replay and Live benchmark success remain unverified. Correct the exact model IDs/provider permissions and restart the service, then run a bounded Replay and Live. The provider-specific DeepSeek thinking/tool-continuation behavior has not been validated with a correctly selected real model; error states remain explicit and unscored.

Current official nutrition data is compact text without sufficient explicit serving-basis metadata for the strict Live judge. Live remains separate and may be unverifiable. Arbitrary prose is not fully semantically checked; the scored contract is structured claims/evidence. Authentication, cloud hosting, real orders/payments/redemption and WorkBuddy use are outside V1.

## Official artifacts

CONTEST_DECLARATION.md was downloaded unchanged from the official raw file on2026-10-11. SHA256: `cd28101bcb29cc8fb24b372fe91ce6b42c4a1487a54e01f7ade0c8c6a84241b7`. Latest competition rules were browsed onOct13; no conflicting project requirement was found. Official contest ranking is based on public GitHub Stars, separate from the platform's Replay benchmark groups.

## Public release and contest submission — 2026-10-13

Published the 95-file initial implementation to the public [realleaves/mcagent-arena](https://github.com/realleaves/mcagent-arena) repository. Local and remote initial commit match (`b8fe27d`). All staged files were checked against local credential values: zero matches; `.env`, databases and raw execution data were excluded. Re-ran 53 tests, typecheck, lint, formatting and production build successfully. GitHub API confirms the required public documents are present; the official declaration was rechecked byte-for-byte against the current official file.

Submitted official registration [Issue #645](https://github.com/M-China/mcd-developer-innovation-challenge/issues/645) with the four-line README format. The first check showed no system acknowledgement yet; see [submission record](contest-submission.md) and the live Issue for subsequent status. Real dual-model benchmarking remains unverified; no award or final eligibility is claimed.

An independent fresh clone from the public repository was also verified without `.env`: online `pnpm install --frozen-lockfile --store-dir=/tmp/arena-pnpm-store`, typecheck, all 53 tests and `pnpm arena:demo` succeeded (Synthetic 100/50). The initial offline install failed because the local cache lacked tarballs; the subsequent network install completed successfully. This checks the published source rather than relying on the original workspace dependencies.

## McDonald's business-theme and walkthrough update — 2026-10-13

Reframed the interface as an acceptance-testing workspace for McDonald's MCP assistant developers. Added yellow/red accents and an original CSS meal illustration, Chinese navigation and controls, six scenario shortcuts, a four-step first-use guide, scene-specific business purpose and Demo hints, plain-language failed-assertion summaries and task-specific synthetic answers. No official logo or live fixture impersonation was introduced. Synthetic prompt version is now `demo-script-v2`; existing fixtures and evaluator weights are unchanged. Ordinary consumer food/activity lookup does not require model comparison; the docs explain this scope and do not claim a prompt-editing feature.

Typecheck, lint, 53 tests and build passed. Browser validation passed business scene navigation, cancelled-campaign detection, observable Demo calls, Chinese numeric-error explanations, trace filtering, result history, refresh recovery and 390px home/arena layout with no overflow or page errors. The first browser check matched the similarly titled homepage card before route completion; it was corrected to wait for the heading inside the actual Arena brief.

## First-use and evidence presentation update — 2026-10-14

The homepage now starts the missing-sodium Synthetic case with one click. Failed assertions show both a plain-language title and the executable judge's rationale. Selecting the same real model in both slots explicitly says these are two independent runs, not a two-model comparison; unavailable model configurations are available in a collapsed diagnostic panel.

The browser smoke script now writes routine screenshots to Git-ignored `data/browser-screenshots`. The committed documentation screenshots were regenerated against an isolated production server with an empty SQLite database and no model API keys or MCP Token; `GET /api/config` confirmed Demo was the only enabled mode. This prevents local Replay history from appearing in public screenshots. The isolated browser run passed one-click Demo, campaign shortcut, failed-assertion explanation, trace/history/reload and 390px viewport checks with zero page errors or horizontal overflow. Typecheck, lint, formatting, 53 tests, Demo CLI and production build passed. No paid model call was made during this update.

The official registration [Issue #645](https://github.com/M-China/mcd-developer-innovation-challenge/issues/645) now contains an official “成功参赛” reply. The latest read-only provider listing found `provider-a` listed and `provider-b` unlisted because its exact model ID was absent; a distinct two-model Replay/Live run remains unverified.

## Authorized single-provider probe — 2026-10-14

With the user's explicit authorization for one potentially billable request, ran `pnpm arena:verify-provider --provider provider-a --probe` once. The configured `deepseek-flash` ID was listed, but the generation endpoint returned HTTP 402 before any native tool call could be observed. The output was sanitized; no credential or response body was recorded. The script was not retried and no real MCP call was made as part of this probe. The precise account-side reason for HTTP 402 was not established; the user must check quota, balance or billing permissions with the provider. B remains unlisted.

Read-only inspection of the local SQLite history found a **separate, earlier** completed Replay (`scenario-001`, 2026-10-13T14:35:40Z): both slots ran `deepseek-flash` independently via Chat Completions, each made one native `list-nutrition-foods` tool call through a synthetic Fixture, then produced a final answer and programmatic score (50 and 90). The trace contains `model_requested`, `tool_called`, `tool_result`, `agent_completed`, `judge_completed`, and `battle_completed`; both tool results are marked `source=synthetic`. This confirms a local same-model Replay path, not a distinct-model comparison or model-driven Live MCP call. The local DB/report and provider relay are not independently attested by an external reviewer. Today's HTTP 402 does not erase the earlier record, and the earlier record does not prove current generation access.

The adapter now maps HTTP 402 to the infrastructure code `PROVIDER_BILLING` without retrying, and the Arena explains that a model appearing in `/models` does not prove generation access. A mocked test covers the error classification and single-attempt behavior.

## Funded provider and Replay verification — 2026-10-15

After the user reported adding funds, `pnpm arena:verify-provider --provider provider-a --probe` returned `listed=true` and `nativeToolCalling=true` for `deepseek-flash`. A read-only model listing still showed configured B (`gpt-6.1-sol`) absent. `pnpm check` passed 54 tests, typecheck, lint and build; `pnpm arena:demo` completed a synthetic 100/50 battle.

The first same-model scenario-001 Replay at a temporary 700 output-Token limit made successful fixture tool calls on both sides but neither final answer passed schema validation. A 2000-Token retry completed one run at 50 points and correctly marked the other unscored when output was truncated. The adapter now recognizes Chat Completions `finish_reason=length` as `OUTPUT_LIMIT` without a futile format repair, covered by a test. The Replay prompt now explicitly treats fixed synthetic fixture items as the benchmark universe while requiring answers to label them synthetic rather than official live menu data. Its version is `arena-system-v2`, included in the leaderboard grouping key; the default per-request output ceiling is 4000 Tokens and is configurable.

With a temporary 4000 output-Token limit, `pnpm arena:run --mode replay --scenario scenario-001 --agent-a provider-a --agent-b provider-a` completed battle `17aaa6c2-04ce-4323-a1fc-7cffab18e5fe`: both independent `deepseek-flash` runs made one native `list-nutrition-foods` call against a **synthetic Fixture**. A scored 90 but failed evidence assertions after citing an unverifiable missing energy value; B scored 100 and passed all assertions. This confirms the current same-model Replay loop, not distinct-model comparison or model-driven Live MCP. Provider output is stochastic; one completed battle does not establish stable model performance. No credentials or raw provider response were committed.

After the change, `pnpm check` passed 55 tests, typecheck, lint and production build. Browser smoke against the local production server passed one-click Demo, business scenario shortcut, trace filters, result history, reload recovery and 390px viewport with no page errors or horizontal overflow. Routine browser output remains Git-ignored under `data/browser-screenshots`.

## Live nutrition output boundary — 2026-10-15

The user ran Live scenario 001 against the official MCP endpoint. Both `deepseek-flash` slots successfully called `list-nutrition-foods`, but both final generations ended with `finish_reason=length` at the 4000 output-Token ceiling; battle `41c005ea-ab74-4fe7-97af-ed1f0416d2e3` was partial and unscored. Read-only inspection of its sanitized local trace showed a duplicated text/structured MCP response of about 13 KB. Its `structuredContent.data` is a 160-row string table with `productName`, `energyKcal` and other columns, but no explicit per-serving basis. The existing judge cannot treat that string as the normalized Fixture schema or safely infer per-serving units.

The runner now keeps the full sanitized real MCP output in the trace while giving the model one bounded `structuredContent` excerpt (max 1800 characters), an omitted-data marker and an instruction not to claim every row was checked. Error tool responses remain intact. A mocked end-to-end test verifies the model-facing excerpt is bounded, trace evidence remains full, and incomplete Live nutrition data is unscored. The UI labels these runs “数据无法核验” and does not draw a misleading zero radar chart.

One bounded model-driven Live retry completed battle `4896d10d-5c00-49cd-9643-548713f3be14`: both independent runs called the official read-only nutrition tool successfully, each completed in two model steps with a short structured answer, and both Judge results were `unverifiable` with `totalScore=null`. This proves a real model-to-official-MCP read-only loop ran locally, while **nutrition benchmark capability is not scored** because the returned data cannot establish the required per-serving facts. It is not a distinct-model comparison. Browser validation of this report found a clear unscored state, no radar chart, and no page errors. No raw tool response or credential was committed.

Later the user ran Live nutrition again and understandably read the amber “数据无法核验” status as an error, despite both tool calls and both Agent runs succeeding. The Arena now warns before a Live call that it may incur model fees and may remain unscored, points to Fixture Replay for comparable scores, and presents the result as a blue informational “已完成 · 无法评分” state. A read-only browser check of the latest saved Live battle verified the note and both statuses with no page errors; no new model or MCP request was made for this UI update.
