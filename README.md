# Gmail AI Copilot（Gmail 邮件自动打标签）

> 当前阶段：Phase 1（详情页横幅 + 标签抓取 + 弹窗日志）

## 快速开始
- 打开 `Chrome → 扩展程序 → 开发者模式`，选择“加载已解压的扩展”，目录指向本项目根目录。
- 进入 Gmail，打开任意邮件的“详情页”。
- 点击浏览器工具栏里的扩展图标，弹出日志面板：
  - 点击“扫描标签”触发一次交互式标签采集。
  - 点击“复制日志”快速复制最新日志，便于粘贴给协作模型进行诊断。
- 如需在控制台手动测试，可在 Gmail 页运行：
  - `window.GmailCopilot.scanLabels()` 返回当前页面解析到的左侧标签数组。

## 目录结构
- `manifest.json`：扩展配置（Manifest V3）。
- `content.js`：主内容脚本（标签抓取、横幅注入、日志收集、交互式扫描）。
- `styles.css`：横幅样式（贴近 Gmail 原生风格）。
- `popup.html`、`popup.js`：弹窗 UI（展示日志、触发扫描、复制日志）。

## 关键能力与实现
- 标签抓取（更稳健选择器）：
  - 以 `div[role="treeitem"] a[href]` 与 `href` 中的 `#label/`、`%23label%2F`、`label%3A` 片段为主进行解析，尽量适配新版 Gmail 导航结构与虚拟化渲染。
  - 黑名单过滤系统文件夹（如“收件箱/Inbox/已加星/Starred”等）。
  - 相关代码：
    - `content.js:67-90` `getLabelsFromLabelSection()`
    - `content.js:49-65` `extractLabelTextFromAnchor()`
- 导航可视化与渲染触发：
  - 自动“展开更多/Show more”，并进行轻微滚动以触发虚拟列表渲染。
  - 相关代码：
    - `content.js:97-109` `expandHiddenLabels()`
    - `content.js:115-120` `scrollNavLightly()`
    - `content.js:127-136` `waitForNavReady()`
- 日志持久化与弹窗展示：
  - 统一日志输出到 `chrome.storage.local`，弹窗实时读取与展示。
  - 关键存储键：
    - `LOG_KEY = 'gmail_copilot_logs'`（滚动日志，最多保留 200 条）
    - `LATEST_KEY = 'gmail_copilot_latestScan'`（最近一次扫描快照）
    - `TRIGGER_KEY = 'gmail_copilot_triggerScan'`（弹窗触发交互式扫描）
  - 相关代码：
    - `content.js:15-43` 日志工具与存储
    - `content.js:304-312` 监听 `TRIGGER_KEY` 触发扫描
    - `content.js:324-335` `runInteractiveScan()` 扫描流程
    - `popup.js:1-43` 弹窗展示与复制
- 详情页横幅注入：
  - 在邮件主题下方显示建议标签（当前为示例逻辑：从采集到的标签中随机选择；为空时展示“未检测到左侧标签”）。
  - 相关代码：
    - `content.js:184-233` `injectBanner()`

## 使用与诊断建议
- 弹窗日志面板：
  - 关注以下日志项，判断采集是否正常：
    - `LabelSection: navRootFound true` 表示找到左侧导航根节点。
    - `LabelSection: anchorCount > 0` 表示采集到候选锚点。
    - `LabelSection: parsedLabels [...]` 表示解析到的去重标签结果。
  - 若采集为空，可再次点击“扫描标签”，日志会包含“Interactive Scan”起止信息与结果。
- 控制台辅助：
  - `window.GmailCopilot.scanLabels()` 返回解析到的标签数组，便于快速对比。

## 已实现进度
- 弹窗日志面板（扫描、复制）。
- 内容脚本统一日志持久化到 `chrome.storage.local`。
- 标签选择器重构，适配新版 Gmail 导航结构与虚拟化。
- 自动“展开更多”与轻滚动触发渲染，提升采集稳定性。
- 详情页横幅注入（Phase 1 示例逻辑）。

## 未解决问题与下一步路线
- 进一步适配不同语言与主题下的导航 DOM 差异（i18n 选择器兜底）。
- 为标签抓取添加更多 `href` 解析分支与边界处理（例如多账户视图、企业域名差异）。
- 将示例横幅替换为真实 AI 推断（DeepSeek/Qwen/Gemini），并引入“标签建议”策略与置信度。
- 增加最小化的测试与验证脚本；如提供 `npm run lint/typecheck` 命令，我会在修改后自动执行。
- 可考虑加入 Service Worker 与消息路由，以支持后台采集与更多交互（当前仅用 storage 变更做桥接，权限更轻）。

## 复盘（过程与关键决策）
- 问题背景：用户反馈“拿不到 Gmail 标签”，日志显示 `containerFound: false, anchorCount: 0`。
- 决策与演进：
  - 抛弃类名强依赖，改用 `role` + `href` 解析为核心选择器，兼容新版导航结构。
  - 引入弹窗作为交互式诊断入口，避免用户必须打开 Console 才能查看日志。
  - 日志持久化并提供“一键复制”，降低协作成本。
  - 在采集前自动展开与轻滚动，尽量触发虚拟化渲染。
  - 保持最小权限（`storage`），暂不引入复杂的后台脚本。
- 风险与规避：
  - Gmail DOM 变动频繁：使用 `role` 与 `href` 片段降低耦合，保留黑名单过滤。
  - 广告拦截日志噪声：与采集无关，明确忽略。

## 协作模型交接须知（Gemini/Qwen/DeepSeek 等）
- 现状：标签采集与日志诊断链路已打通；AI 推断尚未接入。
- 操作指南：
  - 加载扩展 → 打开 Gmail 详情页 → 点击插件图标 → “扫描标签”。
  - 若采集为空，查看弹窗日志并再次触发扫描；也可在 Console 执行 `window.GmailCopilot.scanLabels()`。
- 研发接口：
  - 可将 `getEmailContent()`（`content.js:146-168`）与采集到的 `labels` 作为上下文，接入任意 LLM 做标签建议，并在 `injectBanner()` 渲染结果。
- 交接目标：
  - 在不改变现有存储键与弹窗交互的前提下，优先完善标签推断与异常兜底策略。
