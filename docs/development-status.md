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
