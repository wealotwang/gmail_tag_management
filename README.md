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
- 标签抓取（基于 data-tooltip 的扁平化策略）：
  - 全局扫描 `document.body` 下的 `div/a/span[data-tooltip]`，直接以 `data-tooltip` 为候选标签名。
  - 黑名单与长度过滤（排除系统保留词与异常长度），可选容器校验（`div.TK`/`role="navigation"`），但不作为硬性依赖。
  - 相关代码：
    - `content.js:67-94` `getLabelsFromLabelSection()`
    - `content.js:41-44` 日志工具（写入到 `chrome.storage.local`）
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
  - 在邮件主题下方显示建议标签；当配置了 API Key 时调用 Qwen/DeepSeek 获取建议，否则提示前往设置页配置。
  - 相关代码：
    - `content.js:184-283` `injectBanner()`

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
- 扁平化标签抓取（`data-tooltip`），降低对导航结构的依赖。
- 当抓取为空时，写入“快照日志”（tooltip 样本与上下文）到本地存储，便于弹窗查看与诊断。
- 弹窗日志面板（扫描、复制、实时展示最近扫描状态）。
- 内容脚本统一日志持久化到 `chrome.storage.local`。
- 自动“展开更多”与轻滚动触发渲染，提升采集稳定性。
- 详情页横幅注入；当有 Key 时调用 Qwen/DeepSeek 输出建议标签并更新弹窗状态。
- 设置中心（Provider/Model/API Key/规则编辑器）。

## 未解决问题与下一步路线
- 进一步适配不同语言与主题下的导航 DOM 差异（i18n 选择器兜底）。
- 为标签抓取添加更多 `href` 解析分支与边界处理（例如多账户视图、企业域名差异）。
- 将示例横幅替换为真实 AI 推断（DeepSeek/Qwen/Gemini），并引入“标签建议”策略与置信度。
- 增加最小化的测试与验证脚本；如提供 `npm run lint/typecheck` 命令，我会在修改后自动执行。
- 可考虑加入 Service Worker 与消息路由，以支持后台采集与更多交互（当前仅用 storage 变更做桥接，权限更轻）。

## 复盘（过程与关键决策）
- 2025-12-15（今日）：
  - 采集策略最终版：根据用户提供的 DOM 证据，重写为“基于 `data-tooltip` 的扁平化抓取”，并加入黑名单与长度阈值；可选容器校验仅作加分项，避免过度绑定导航结构。
  - 诊断强化：当采集为空时写入“快照日志”到本地存储，包含 tooltip 节点样本与上下文，弹窗即可查看，便于协作模型和人工分析。
  - 模型接入与上下文：完成 Qwen/DeepSeek 兼容路由与提示词构建，确保仅从用户现有标签中选择，降低幻觉风险。
  - UI 与交互：横幅状态按配置变化；弹窗展示 Provider/Model/Subject/AI建议；交互式扫描与复制日志稳定运行。
  - 详情页限制：观察器与路由监听均在详情页生效，避免列表页性能影响。
  - 版本记录：更新 CHANGELOG，准备版本标签与推送。
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
