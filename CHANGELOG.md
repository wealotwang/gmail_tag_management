# Changelog

All notable changes to this project will be documented in this file.

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
