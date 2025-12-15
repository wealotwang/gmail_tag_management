# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-12-15
- 重写标签抓取为“基于 `data-tooltip` 的扁平化抓取”，降低对导航结构与 `role` 的依赖。
- 新增“快照日志”写入到 `chrome.storage.local`，当抓取为空时记录 tooltip 节点样本与上下文。
- 接入 Qwen/DeepSeek 兼容 API 路由与上下文提示词构建，避免返回不存在的标签。
- 弹窗状态增加 Provider/Model/Subject/AI建议 展示；交互式扫描与复制日志保持不变。
- 设置中心（Options）完善：Provider/Model/API Key 持久化与可视化；JSON 规则编辑器基础校验。
- 仅在详情页触发横幅与扫描，避免列表视图的性能影响。

## [0.1.0] - 2025-12-14
- 添加弹窗 UI（`popup.html`/`popup.js`）以展示日志、触发交互式扫描、复制日志。
- 在内容脚本中统一日志持久化到 `chrome.storage.local`（`LOG_KEY`、`LATEST_KEY`、`TRIGGER_KEY`）。
- 重构标签抓取选择器，适配新版 Gmail 导航（`div[role="treeitem"] a[href]` 与 `href` 片段解析）。
- 扫描前自动“展开更多”与轻滚动，提升虚拟化场景下的可见性与稳定性。
- 在邮件详情页下方注入横幅（Phase 1 示例逻辑）。

### Notes
- 当前仅使用 `storage` 权限，无后台 Service Worker；弹窗与内容脚本通过 storage 变更桥接。
- AI 推断尚未接入；可以直接复用 `getEmailContent()` 与采集到的 `labels` 作为模型上下文。

## [Unreleased]
- 更完备的 i18n 选择器兜底与 `href` 解析。
- 接入 LLM 标签建议与置信度输出，替换示例横幅逻辑。
- 最小化的测试与验证脚本；若提供 `npm run lint/typecheck` 我将集成到开发流程。
