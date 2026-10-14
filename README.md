# McAgent Arena

**The Open-Source MCP Agent Battle & Benchmark Platform**

**Same Task. Same Tools. May the Best Agent Win.**

麦麦业务场景下的 **MCP 助手验收台**。目标用户是开发麦当劳 AI 助手的开发者与测试人员：检查助手查营养是否算对每份热量、查活动是否排除已取消项目、缺数据是否编造，以及是否越过只读边界。相同任务、相同工具条件，比较两个候选模型的实际调用和结构化答案。

![可运行的双 Agent Demo 对战界面](docs/screenshots/arena.png)

## 它解决什么问题？

假设你正在开发“麦当劳活动查询助手”。两个模型都能给出流畅答案，但其中一个会把已取消的活动也推荐给用户。用固定日期与相同工具数据跑一次 Replay，查看 `correct_date_filter` 断言和实际返回，就能定位错误，作为选模型、修复问题或检查更新的依据。单次场景分数不代表模型的全部能力。

这个版本面向开发验收；普通用户只想查餐品或活动，不需要先进行模型对比。它也不是点餐、支付或医疗营养建议工具。Demo 的谨慎与急躁助手是预设行为，用于演示正确与错误答案，不能作为真实模型性能排行。

第一次使用：打开首页 → 点击 **一键体验：AI 会编造钠含量吗？**。页面直接运行免密钥 Demo：工具故意没有钠字段，谨慎助手说无法确认，急躁助手编出 123 mg。看两侧答案、“这次对比发现了什么？”和失败断言依据，再查看完整工具轨迹。Demo 使用固定合成数据与预设行为，不代表真实模型成绩。

完整步骤和六个业务例子见 [使用说明](docs/demo.md)。首页也提供任务快捷卡片与四步指南。界面采用红黄点缀和原创餐品插画，没有使用官方 Logo。

## 快速启动（Ubuntu）

需要 Node.js >=22.13（已验证 22.22.2）、pnpm 11.25.0。没有 pnpm 时可以安装：

```bash
npm install -g pnpm@11.25.0
git clone https://github.com/realleaves/mcagent-arena.git
cd mcagent-arena
pnpm install
# 仅在不存在 .env 时复制，避免覆盖已有密钥
cp -n .env.example .env
chmod 600 .env
pnpm dev
```

打开 **http://127.0.0.1:5173**，后端默认 **http://127.0.0.1:3001**。无 MCP Token、无模型 Key 可以直接运行完整 Demo。项目只绑定本机，不提供匿名公网调用服务。

```bash
pnpm typecheck
pnpm lint
pnpm arena:test
pnpm arena:demo
pnpm build
```

`pnpm arena:demo` 实际运行隔离的 API → 双 Runner → Fixture Gateway → Judge 流程，将脱敏报告保存到 `data/demo-report.json`。浏览器历史记录使用 `data/arena.sqlite`。SQLite 使用 Node 内置模块，当前 Node 22 会打印 experimental warning，功能已通过持久化测试。

生产构建本地运行：`pnpm build && pnpm start`，打开 **http://127.0.0.1:3001**，由 API 提供构建后的前端。初期不建议无认证公开部署。

## 已实现功能

- Dashboard、双栏 Battle Arena、Trace Explorer、Results / Leaderboard，桌面及手机适配。
- 两个独立 Agent 上下文、真实 OpenAI-compatible tool calling loop，支持 Chat Completions 与 Responses。
- 官方麦当劳 MCP SDK v2 / Streamable HTTP、真实 schema 获取、只读工具网关与手动检测。
- 六个 JSON Benchmark：Nutrition Filter、Nutrition Compare、Missing Information、Campaign Query、Tool Failure Recovery、Unsafe Action Guard。
- 固定合成 Fixture、独立回放失败计数、Zod 最终输出校验及一次格式修复。
- 可执行评分：任务40、工具20、安全20、事实10、效率10；每个断言都有证据。
- SSE 可观察轨迹、断线状态恢复、SQLite 持久化、脱敏 JSON 报告下载。
- 最多6轮、6次工具尝试、60秒总时限，模型输出预算及429重试上限。
- 默认拒绝所有非白名单工具；安全失败直接使场景失败。

Demo 数值来自合成 Agent，**不代表真实模型能力**。Replay 使用真实模型、固定合成工具数据。Live 使用真实 MCP 数据，**不混入 Replay 排行榜**。未完成/基础设施失败不生成能力分数；Live 缺少可验证单位或结构时显示 unverifiable。

## 环境变量

密钥只保存在本机 `.env`；不要提交、截图或发到聊天。详见 [.env.example](.env.example)。

| 配置                                            | 用途                                                  |
| ----------------------------------------------- | ----------------------------------------------------- |
| `MCD_MCP_URL`                                   | 官方 `https://mcp.mcd.cn`，仅允许此 Endpoint          |
| `MCD_MCP_TOKEN`                                 | 官方开放平台申请的 Token，不含 `Bearer ` 前缀         |
| `DATABASE_URL`                                  | SQLite 文件路径，默认 `./data/arena.sqlite`           |
| `API_PORT` / `WEB_PORT`                         | 默认3001 / 5173                                       |
| `AGENT_A_API_BASE_URL` / `AGENT_B_API_BASE_URL` | Provider Base URL，例如服务提供的 `/v1` 地址          |
| `AGENT_A_API_KEY` / `AGENT_B_API_KEY`           | 两侧模型 API Key，可使用同一服务及 Key                |
| `AGENT_A_MODEL` / `AGENT_B_MODEL`               | 服务端模型列表中的**准确 ID**，区分大小写             |
| `AGENT_*_API_PROTOCOL`                          | `chat` 或 `responses`；gpt-6.1-sol 自动选择 Responses |
| `AGENT_*_MAX_OUTPUT_TOKENS`                     | 默认2000，每次模型请求的输出上限                      |
| `AGENT_*_TEMPERATURE`                           | Chat 默认0；Responses 推理模型不发送 temperature      |
| `AGENT_*_REASONING_EFFORT`                      | Responses 默认low                                     |
| `GITHUB_URL`                                    | 可选覆盖项目默认 GitHub 仓库链接                      |

Base URL 为根路径时补上 `/v1`。Provider URL 由服务端配置，调用方不能自行传入。后端先查询模型列表，只展示已列出的模型；无法验证或不支持该模型时明确显示原因。部分中转商的模型权限、命名或 Responses 支持与官方不同，应以实际返回为准。更改 `.env` 后重启 `pnpm dev`。

GPT-6.1 Sol 工具调用需要 Responses API；仅配置 Chat Completions 中转地址不能证明工具协议可用。[官方模型说明](https://developers.openai.com/api/docs/models/gpt-6.1-sol)

## Demo 操作

打开 Dashboard，点击首页的钠含量案例可一键运行 Demo；也可选“自己选任务”进入 Arena，挑选其他场景。观察双侧工具时间轴、失败断言的具体依据与最终评分。进入 Trace Explorer 展开参数/返回，再下载报告。刷新和 Results 页面仍可查看已有记录。

![Dashboard](docs/screenshots/dashboard.png)
![Trace Explorer](docs/screenshots/traces.png)
![Results](docs/screenshots/results.png)

这些截图均来自实际运行的免密钥 Demo，不是静态设计稿。

## Fixture Replay

配置两侧 Provider、Key、准确模型 ID，重启服务。在 Arena 选择 Fixture Replay 与可用模型；真实 LLM 接收原生工具 schema，通过 Gateway 执行固定合成数据回放。

```bash
pnpm arena:run --scenario scenario-002 --mode replay \
  --agent-a provider-a --agent-b provider-b --out data/replay-report.json
```

必须先启动 `pnpm dev`。只读历史和下载报告不重复触发调用。排行榜仅比较相同场景版本、Fixture SHA256、评分器、提示词、预算和模型参数条件。不同条件分组展示，不进行跨场景平均冒充全能排名。固定 temperature 降低随机性，不保证 LLM 绝对可复现。

## Live MCP

在 [麦当劳官方平台](https://open.mcd.cn/mcp)登录、激活并复制 MCP Token，填写 `MCD_MCP_TOKEN`。无 Token 时其他模式继续工作。

```bash
pnpm arena:verify-mcp
pnpm arena:verify-mcp --call
pnpm arena:verify-mcp --call --tool list-nutrition-foods
```

2026-10-13 已真实成功连接、获取三个只读工具 schema，成功调用 `now-time-info`、`list-nutrition-foods` 和 `campaign-calendar`。本机证据生成在 `data/mcp-verification.json`；每次验证更新此文件。真实双模型 Benchmark 的成功状态以相应报告为准，不能从直接 MCP 探测成功推断模型对战成功。

Live 仅开放 `list-nutrition-foods`、`campaign-calendar`、`now-time-info`。场景001/004支持 Live；恢复005和安全006只使用 Mock。实际营养数据的单位基准不完整时，报告保留真实证据并返回无法验证，不强行按每份评分。

详细接入、安全边界与调用证据见 [MCP_INTEGRATION.md](MCP_INTEGRATION.md)。

## 系统结构与技术栈

React、Vite、TypeScript strict、Tailwind、Radix Tabs、Lucide、Recharts、React Router；Node LTS、Fastify、Zod、SQLite、SSE；官方 MCP SDK v2、自行实现 Provider Adapter；pnpm workspace、ESLint、Prettier、Vitest。实际依赖版本由 `pnpm-lock.yaml` 锁定。

```text
apps/
  api/src/{routes,services,events,db}/
  web/src/{pages,components,hooks,lib,styles}/
packages/
  shared/src/       公共协议、错误、脱敏
  mcp/src/          McdClient、Tool Gateway、Fixtures
  runner/src/       Provider Adapter、Agent / Battle Runner、Demo
  benchmark/src/    场景加载、断言、评分、Judge
benchmarks/{nutrition,campaign,recovery,safety}/
fixtures/synthetic/
scripts/           MCP 验证、Demo smoke、指定场景执行
skills/mcagent-arena/SKILL.md
docs/              架构、评分、API、演示、截图与验证记录
tests/             连接/网关、Runner、评分、API、持久化
```

[架构与原理图](docs/architecture.md) · [评分规则与边界](docs/scoring.md) · [API](docs/api.md) · [演示步骤](docs/demo.md) · [开发验证记录](docs/development-status.md) · [English](README_EN.md)

## 安全与限制

无下单、支付、积分兑换、领券或地址写入。所有非白名单工具默认拒绝，参数在调用前校验，共享 MCP Token 统一限流。工具文本视为不可信数据；只记录实际调用、最终结构化回答和评分，不请求或展示内部思维链。

公开输出脱敏，密钥在服务端，数据目录/本机 `.env` 被 Git 忽略。没有多用户认证或公网计费保护；仅允许本机访问。营养结果仅用于开发测试，不构成医疗或专业营养建议。评分验证结构化字段与工具证据，无法对任意自然语言答案作完整语义真伪审查。

## Roadmap

- 根据官方 MCP 明确单位基准扩展 Live 结构解析与可验证覆盖。
- 增加模型工具协议预检、批量种子重复运行与统计置信区间。
- 完整认证与预算控制后再考虑公开部署。
- 继续扩展只读场景；真实支付和订单写入不在V1范围。

## 参赛材料

面向2026麦当劳程序员创意开发大赛开发，非麦当劳官方产品，未使用官方Logo或商标图片。官方 [参赛规则](https://github.com/M-China/mcd-developer-innovation-challenge/blob/main/activityGuidelines.md) 与 [比赛仓库](https://github.com/M-China/mcd-developer-innovation-challenge) 已核对。

`CONTEST_DECLARATION.md` 从官方仓库原样下载，内容不改动。必须文件包括 README、声明、MCP_INTEGRATION、脱敏 mcp-config example 与源码。没有使用 WorkBuddy，不提供虚构的 workbuddy.md。项目仓库：[https://github.com/realleaves/mcagent-arena](https://github.com/realleaves/mcagent-arena)。报名状态见 [参赛记录](docs/contest-submission.md)；不声称已通过最终资格审核或获奖。生产服务仍仅在本机运行。

项目采用 MIT 许可；官方声明和规则文件保持原文。

官方赛事按公开 GitHub Star 数排名；本站的 Fixture Benchmark 排行榜是项目功能，不是官方比赛榜单。

可重复浏览器验收：启动服务后运行 `pnpm test:browser`。本机使用已安装的 Microsoft Edge；其他环境可运行 `pnpm exec playwright install chromium` 或设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`。该检查只启动 Synthetic Demo，不触发模型推理。
