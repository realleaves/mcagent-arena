# McAgent Arena V1.0 交付清单

当前可运行的 Demo 产品已实现并验收，真实麦当劳 MCP 已连接并调用成功。本机记录显示同一个真实模型在固定合成 Fixture 下完成过两次独立 Replay；真实双模型 Replay 与模型联动的 Live MCP 仍待验证。官方报名 Issue 已回复成功参赛；不宣称获奖或最终资格审核完成。

## 实际源文件目录树

以下从本机目录生成，省略依赖、构建输出、私有配置、数据库和本机工具目录。

```text
mcagent-arena/
  apps/
    api/
      src/
        db/
          store.ts
        events/
          bus.ts
        routes/
          api.ts
        services/
          battle-service.ts
        server.ts
      package.json
      tsconfig.build.json
    web/
      src/
        components/
          battle-takeaways.tsx
          meal-illustration.tsx
          layout.tsx
          score.tsx
          trace.tsx
          ui.tsx
        hooks/
          use-battle.ts
        lib/
          api.ts
          scenario-guide.ts
        pages/
          arena.tsx
          dashboard.tsx
          results.tsx
          traces.tsx
        styles/
          globals.css
        main.tsx
      index.html
      package.json
      vite.config.ts
  benchmarks/
    campaign/
      004.json
    nutrition/
      001.json
      002.json
      003.json
    recovery/
      005.json
    safety/
      006.json
  docs/
    official/
      activityGuidelines.md
    screenshots/
      arena.png
      dashboard.png
      mobile-arena.png
      mobile-dashboard.png
      results.png
      traces.png
    api.md
    architecture.md
    contest-submission.md
    verification-summary.json
    demo.md
    development-status.md
    scoring.md
  fixtures/
    synthetic/
      campaign-v1.json
      nutrition-v1.json
      recovery-v1.json
      safety-v1.json
  packages/
    benchmark/
      src/
        assertions.ts
        judge.ts
        scenario-loader.ts
        scoring.ts
      package.json
    mcp/
      src/
        fixture-provider.ts
        mcd-client.ts
        rate-limiter.ts
        tool-gateway.ts
      package.json
    runner/
      src/
        agent-runner.ts
        battle-runner.ts
        demo-adapter.ts
        provider-adapter.ts
      package.json
    shared/
      src/
        errors.ts
        redact.ts
        schemas.ts
        types.ts
      package.json
  scripts/
    browser-smoke.mjs
    dev.mjs
    run.ts
    smoke-test.ts
    verify-mcp.ts
    verify-provider.ts
  skills/
    mcagent-arena/
      SKILL.md
  tests/
    api.test.ts
    benchmark.test.ts
    health.test.ts
    mcp.test.ts
  .env.example
  .gitignore
  .npmrc
  .prettierignore
  .prettierrc.json
  CONTEST_DECLARATION.md
  LICENSE
  MCP_INTEGRATION.md
  README.md
  README_EN.md
  eslint.config.js
  mcp-config.example.json
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  tsconfig.base.json
  tsconfig.json
  vitest.config.ts
```

## 已实现和验证

四个页面、真实 SDK v2 MCP 客户端与只读网关、Chat/Responses Runner、六场景、固定 Fixture、程序化评分、双 Agent 独立运行、SSE、SQLite、JSON报告、免密钥Demo、CLI与Skill均已实现。53项自动化测试通过，浏览器的启动对战/轨迹筛选/结果/刷新恢复/390px手机检查通过。类型、Lint、格式和生产构建通过。执行命令、失败修正及证据见 [development-status.md](docs/development-status.md)。

## 本机启动

```bash
cd /home/real/Desktop/mcagent-arena
pnpm install
pnpm dev
```

浏览器打开 http://127.0.0.1:5173 。已有 `.env` 不要覆盖。生产构建可用 `pnpm build && pnpm start`，访问 http://127.0.0.1:3001 。服务仅绑定本机。安装需要可用网络；冷离线安装不保证全部包已经缓存。

## MCP Token 与模型 Key

本机 `.env` 保存配置，权限600，Git忽略。麦当劳 Token 在官方开放平台申请，MCD_MCP_TOKEN只填Token，不带Bearer前缀。两侧AGENT_*_API_KEY分别用于模型服务，Base URL和MODEL必须与该服务真实可用的接口和准确ID相符。密钥无需发到聊天。

当前 A 的模型名与官方 DeepSeek API ID 不一致；可用列表是 deepseek-flash / deepseek-v4-pro。B中转返回的模型列表没有 gpt-6.1-sol，Responses探测返回503。该配置未通过真实模型验证。模型替换方案已请求用户选择，尚未执行新的模型替换调用。

## 三种模式操作

Demo：Dashboard → Start Battle → Demo / Synthetic → Careful vs Hasty → 选择场景 → Start Battle。观察两侧轨迹、最终回答、v1.0.1评分及失败断言，再打开 Trace Explorer 或下载JSON。营养Demo当前100/50分是合成行为，不是真实模型成绩。

Replay：修正两侧真实模型配置并重启服务，选择Fixture Replay与可用Provider。也可运行 `pnpm arena:run --scenario scenario-001 --mode replay --agent-a provider-a --agent-b provider-b --out data/replay-report.json`。只有固定且一致条件的已评分Replay进入分组排行榜。

Live：先运行 `pnpm arena:verify-mcp --call`，再在界面选择Live启用场景001或004及真实模型。实际只读数据随时间改变，不进入Replay排名。不能解析明确单位/日期结构时返回无法验证，保持真实轨迹与空能力分数。005恢复与006安全场景仅使用Mock。

## 证据和已知限制

三个官方只读工具真实调用均成功。脱敏证据在本机 data/mcp-verification.json、data/mcp-nutrition-verification.json、data/mcp-campaign-verification.json；该目录不公开入库。真实双模型对战尚未验证成功，不能将Demo或直接MCP探测当成真实LLM Benchmark成功。

评分仅程序化验证结构化字段与证据，不完整验证任意自然语言。Live当前营养返回缺明确每份基准，严格评分器不强算正确。Node22内置SQLite有experimental提示。没有多用户认证、公网部署、真实下单/支付/兑换或WorkBuddy记录。项目 GitHub 入口已设置为 https://github.com/realleaves/mcagent-arena；发布与报名状态见 docs/contest-submission.md，公网部署未执行。

## 官方参赛文件检查

- README.md：中文产品、截图、安装、配置、三模式、安全、技术栈、Roadmap与参赛说明已准备。
- README_EN.md：英文介绍已准备。
- CONTEST_DECLARATION.md：官方原文件完整保留；本地SHA256记录在验证文档，未被格式化或重写。
- MCP_INTEGRATION.md：真实server/tools、鉴权、流程、边界、实际成功证据和未验证项已区分。
- mcp-config.example.json：仅环境变量占位符。
- skills/mcagent-arena/SKILL.md：校验通过，只引用实际命令/API。
- workbuddy.md：未创建，因没有真实使用WorkBuddy。
- 公开GitHub与Issue报名：见 [参赛记录](docs/contest-submission.md)，不宣称已通过最终资格审核。

参赛规则与项目任务书没有已发现的冲突。官方比赛榜按GitHub Star排名；本项目的标准排行榜只比较Fixture Replay结果，两者不同。
