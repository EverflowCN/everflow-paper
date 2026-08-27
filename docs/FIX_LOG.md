# Everflow 统一修复记录

> 从 2026-08-28 起，网站所有故障修复统一追加到本文件。禁止再把修复说明散落到多个临时文档。
>
> 每条修复必须至少记录：时间、影响页面、用户现象、根因/判断、实际改动、数据影响、验证结果、部署结果。CI 通过只表示自动检查通过；必须与真实设备复测结果分开记录。

---

## 2026-08-28 · Relax1000 iPad 点题后整页卡死 · 第 2 轮

**状态：自动检查与线上部署已成功；等待真实 iPad 复测。**

### 用户现象

- 页面：`/zhenti/` → `Relax1000` → 题库墙。
- 点击任意题号后，题目阅读层没有正常显示。
- 随后整个页面几乎失去响应，其他按钮无法点击，刷新也非常困难。
- 第 1 轮修复部署成功后，真实 iPad 复测仍然完全相同，因此第 1 轮结论被判定为未解决。

### 本轮定位

点击题号时，Relax 阅读层同时触发了两个对 iPad Safari 非常重的全页面操作：

1. `interaction-guard.css` 使用 `body:has(.relax-question-modal:not([hidden]))` 来判断 Relax 弹层是否打开。题库墙包含数百个按钮，`hidden` 状态切换时会触发关系选择器对大 DOM 的样式失效/重算。
2. Relax 弹层背景使用整屏 `backdrop-filter: blur(...)`。在数百个题号仍需要绘制的情况下，Safari 需要持续合成和模糊整张背景层。

这两个操作都发生在“点击题号 → 显示 modal”的同一帧，符合“题还没显示，整页就先冻结”的实际症状。本轮不再改题号点击逻辑，而是移除这两个阅读层级的高成本机制。

### 实际改动

- Relax modal 不再依赖 `body:has(...)` 锁滚动，改用 JS 已经维护的 `body.evera-modal-open` 类。
- `body.evera-modal-open` 直接负责 `overflow:hidden` 和 `overscroll-behavior:none`。
- Relax modal 打开时，将后方 `.relax-wall-root` 设为 `visibility:hidden`：保留布局和学习状态，但停止绘制几百个题号，关闭弹层后立即恢复。
- Relax 背景层强制关闭 `backdrop-filter` / `-webkit-backdrop-filter`，只保留普通半透明遮罩。
- 降低粗指针/iPad 类设备上弹层的大面积阴影开销。
- `question-bank-switch.js` 将 Relax 资源版本升级为 `20260828-relaxreader2`，并在 Relax runtime 前加载专用安全层 `relax1000-reader-safe.css`。
- Service Worker 缓存从 `everflow-site-v45-course2-relax-v2` 升级为 `everflow-site-v45-course3-relax-reader`，确保旧的交互保护 CSS 不继续留在设备缓存。

### 数据影响

无。未修改题目 ID、答题记录、错题、收藏、掌握状态、笔记、SRS 或 Supabase 数据。

### 提交

- 统一修复记录：`7631bce0308fb99ee13138f7827304dd477a3411`
- iPad 阅读层安全 CSS：`9de18b1942308aebdaa571b4fbb885b456e951c6`
- 移除 Relax `body:has(...)` 关系锁：`27846c47e3d5b6925a16c10c76d2a3091faffcae`
- Relax runtime 加载安全层并升级资源版本：`3faa9d53318b27d80c616cc259733a26ec04f306`
- Service Worker 缓存刷新：`5bddf3302980886c814b6c639f207895b13d145b`

### 自动验证与部署

- GitHub Pages workflow：**#166**，run `33108940306`。
- Architecture audit：成功。
- Account / resource hub / workspace / cache scripts：成功。
- Course catalogs：成功。
- Question assets checkout：成功。
- 408 algorithm visualizer build：成功。
- Verify site：成功。
- Privacy-safe static artifact：成功。
- Upload Pages artifact：成功。
- Deploy to GitHub Pages：成功。

### 真实设备结果

**待复测。** 自动部署成功不能替代用户 iPad 的真实交互结果。如果仍卡死，本条状态将改为“未解决”，下一轮继续在本文件追加，不删除本轮过程。

---

## 2026-08-28 · Relax1000 iPad 点题后整页卡死 · 第 1 轮

**状态：未解决；已被第 2 轮取代。**

### 用户现象

点击 Relax1000 题号后题目不显示，页面严重卡顿。

### 当时判断

当时主要怀疑：

- 性能补丁把 v2 原本的题号直接绑定改成了 wall 级事件代理；
- Relax wall 与 cards/reset 一度通过不同 query URL 引用了 `relax1000-core.js`，可能造成两份 ES Module core 实例。

### 当时改动

- 恢复 Codex v2 的题号按钮直接 `openModal()` 路径。
- 重新统一 wall/cards/reset 的 core URL。
- 记录 `docs/QUESTION_BANK_V2_ARCHITECTURE.md`，明确 v2 隔离规则。
- Service Worker 从 `everflow-site-v45-course1` 升级到 `everflow-site-v45-course2-relax-v2`。

### 提交与部署

- 架构记录：`268c2ef3c14ccd752eecb5b370e703bf986fe001`
- 缓存刷新：`4bc3ec07b25593af553931e81c7d0d56c8a3d7cc`
- 恢复 v2 打开路径：`cb08abf6850ea2a9e1690b19b0b27d809090be99`
- GitHub Pages workflow #162：全部自动步骤成功。

### 真实设备结果

**失败。** 用户在 iPad 上复测后报告“还是一样卡顿，什么都点不动，刷新都很难刷新”。因此 CI 成功不能视为本问题已经修复。

---

## 维护规则

以后所有 `fix(...)`、线上故障、用户反馈回归修复，都继续追加到本文件；如果一次修复真实复测失败，必须将该条状态改为“未解决”，保留失败过程，不得删除或改写成成功。
