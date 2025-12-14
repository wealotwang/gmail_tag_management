## 关键信息
- 你的元素面板显示左侧标签链接形如 `a.J-Ke.n0`，`href` 为 `#^3u` 等非 `#label/` 模式。
- 标签文本出现在 `aria-label` 或 `data-tooltip` 中；父层存在 `role="navigation"`、`role="treeitem"` 等语义容器。
- 这解释了我们此前过滤 `href` 不含 `label` 时被排除，导致抓取为空。

## 改动要点
- 放宽筛选：不再要求 `href` 含 `label`；只要在左侧导航中存在 `aria-label`/`data-tooltip` 的可点击项即纳入候选。
- 扩展选择器：`a.J-Ke.n0`, `a[aria-label]`, `a[data-tooltip]`, 以及 `div[role="treeitem"] a[href]`，均限定在 `div[role="navigation"]` 范围内。
- 文本解析顺序：优先 `aria-label` → `data-tooltip` → `textContent`，统一清洗计数后缀（如 `(12)`）。
- 可靠过滤：与“标签”面板抓取结果做交集，确保仅返回用户自定义标签（避免系统文件夹如“收件箱/已加星”）。
- 就绪与展开：保留并强化“展开隐藏标签”“轻滚动触发虚拟化”的逻辑，抓取前进行一次。
- 日志增强：输出来源（nav/picker/交集）、原始数量与最终标签列表。

## 实施步骤
1) 将 `getUserLabels()` 拆分为 `getLabelsFromNav()` 与 `getLabelsFromPicker()`（现有 `readLabelsFromPicker()` 复用），增加交集合并函数。
2) 更新 `injectBanner()`：先展开/滚动与就绪等待 → 获取 nav/picker → 求交集 → 若仍为空，仅显示“未检测到左侧标签”。
3) 增加稳健的中文/英文 UI 匹配（“更多/隐藏部分标签/Show more/More”）。
4) 打印调试信息：`[Gmail Copilot] nav=..., picker=..., merged=...`。

## 产出
- 仅更新 `content.js` 中的抓取与合并逻辑，其余保持不变。

## 预期效果
- 在你的 UI 变体下，`Scraped Labels` 不为空；Banner 将随机选取真实标签。

## 请确认
- 我将按上述方案更新 `content.js`（无新增文件）。确认后立即提交修改并验证。