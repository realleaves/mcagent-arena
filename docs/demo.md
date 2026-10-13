# Local walkthrough

1. `pnpm install`, then `cp .env.example .env` only if no `.env` exists.
2. `pnpm dev`; open `http://127.0.0.1:5173`.
3. Dashboard → Start Battle; leave Demo / Synthetic selected.
4. Choose Careful vs Hasty, pick one of six scenes and click Start Battle.
5. Watch two independent tool timelines, final typed outputs, score comparison and failed assertions.
6. Open Trace Explorer to expand sanitized arguments/results, or download the JSON report.
7. Refresh the Arena or open Results; SQLite retains history. Synthetic scores never enter the standard leaderboard.

`pnpm arena:demo` runs an isolated API/gateway/runner/judge smoke battle with no credentials and saves `data/demo-report.json`; it does not populate the web service's database. For a persisted web battle use `pnpm arena:run --scenario scenario-004 --mode demo` with the service running.

Replay: set each configured Provider's API Base URL, API Key and exact model ID in your local `.env`; restart `pnpm dev`. Select Fixture Replay and available models. Real LLM tool calls receive fixed synthetic outputs and are scored. The same provider can be selected for both slots; contexts remain independent.

Live: configure the official MCP Token, run `pnpm arena:verify-mcp --call`, then select a Live-enabled scene (001 or 004). Gateway permits only the three read-only tools. Recovery/safety remain mock-only. If Live data cannot be verified by explicit units/date structure, the report shows why and no numeric ability score is generated.

Screenshots in `docs/screenshots` come from actual key-free browser runs, not design mockups. Browser QA covered starting a battle, observable events, trace filtering, result history, refresh recovery and a 390px mobile viewport. An isolated headless browser was used because no app-controlled browser was connected.

Re-run browser QA with `pnpm test:browser` while the service runs. Optional environment: ARENA_WEB_URL (default http://127.0.0.1:5173), ARENA_SCREENSHOT_DIR, PLAYWRIGHT_CHROMIUM_EXECUTABLE. The project includes Playwright; install its Chromium browser with `pnpm exec playwright install chromium` if there is no existing Edge executable.
