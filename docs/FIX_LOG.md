# Everflow 统一修复记录

> 从 2026-08-28 起，网站所有故障修复统一追加到本文件。禁止再把修复说明散落到多个临时文档。
>
> 每条修复必须至少记录：时间、影响页面、用户现象、根因/判断、实际改动、数据影响、验证结果、部署结果。CI 通过只表示自动检查通过；必须与真实设备复测结果分开记录。

---

## 2026-08-28 · Relax1000 iPad 点题后整页卡死 · 第 3 轮

**状态：自动检查与线上部署已成功；等待真实 iPad 复测。**

### 用户现象

第 2 轮部署后真实 iPad 复测结果仍为 **B：点击题号后仍然整页卡死，什么都点不动，刷新也很困难**。

因此第 2 轮的“移除 `:has()` + 关闭 backdrop blur + 暂停题号墙绘制”并未解决实际设备问题。本轮不再继续叠加同页面 modal 性能补丁。

### 本轮判断

连续两轮针对同页面弹层的局部优化均未改善真实 iPad 症状，说明继续让“数百题题号墙 + 题目阅读器”处于同一个文档/渲染上下文风险过高。即使单独某个 CSS 或事件并非唯一根因，同页面 modal 架构仍会让 Safari 在点题瞬间同时处理题号墙、状态样式、图片、弹层和页面锁定。

第 3 轮采用结构性隔离：**题库墙只负责选题；题目阅读器进入独立页面。** 点击题号后不再创建 `.relax-question-modal`，原题号墙文档直接离开渲染路径。

### 实际改动

- 新增独立题目页面：`/zhenti/relax-reader/`。
- 新增 `site/assets/js/relax1000-reader.js`，只加载当前题目以及当前筛选结果中的上一题/下一题上下文。
- 新增 `site/assets/css/relax1000-reader-page.css`，阅读器为普通文档流，不使用全屏 modal、`backdrop-filter`、`body:has()` 或整页背景模糊。
- 重构 `site/assets/js/relax1000-wall.js`：删除题号墙中的 modal 创建、渲染、事件绑定和键盘 modal 逻辑；题号点击只保存轻量上下文并导航到独立阅读器。
- 题库墙使用 `sessionStorage` 保存当前科目、章节、筛选、搜索词和当前可见题目 ID，返回后继续原来的题目范围。
- 独立阅读器继续复用 `relax1000-core.js` 的 `patchRecord / questionState / syncAnswerCompatibility / toggleBookmark`，因此答题、错题、掌握状态、收藏和笔记仍使用原来的记录格式与题目 ID。
- 独立阅读器支持：A-D 选择、提交答案、解析、熟练/模糊/不会、收藏、笔记、上一题/下一题、键盘方向键和返回题库墙。
- 笔记输入增加短延迟写入，并在离开页面前强制 flush，减少连续 localStorage 写入。
- 修复独立阅读器顶部“返回题库墙”可能重复绑定导致连续返回两次的问题。
- `question-bank-switch.js` 版本升级为 `20260828-relaxreader3`，不再给题号墙加载第 2 轮的 modal safety CSS。
- Service Worker 缓存升级为 `everflow-site-v45-course4-relax-reader-route`，并把独立阅读器页面、JS、CSS 加入站点 shell。

### 数据影响

无数据迁移、无题目 ID 改写、无记录清空。

继续使用原有：

- `everflow-408-relax1000-records-v1`
- `relax-seen`
- `relax-mistakes`
- `relax-ever-wrong`
- `relax-bookmarks`
- 原 `question.id`

因此已有答题记录、错题、收藏、掌握状态、笔记和 SRS 数据保持兼容。

### 提交

- 独立阅读器页面：`312c255e7dbb778dfebd927d609ca12146241b20`
- 独立阅读器样式：`b7764372ec21ab89c11e7f23e2c77cc0a83fe465`
- 独立阅读器逻辑：`d0bddf59f4c54925cf6a97d023e8f1e11b50e08a`
- 题号墙改为独立路由：`eb735c0b970cde7d4205ef4a043832a43d8d551e`
- Relax runtime 升级到 reader v3：`16585fa2c38ac4409f9c7811f51c9e09951f1d42`
- Service Worker 独立阅读器缓存：`e91c84d4fcb97f73c0594b0a77bf3998a3c6d97c`
- 返回按钮重复绑定修复：`efa262e6098e4c842d51a63174414b5c58746f26`

### 自动验证与部署

- GitHub Pages workflow：**#173**，run `33109782790`。
- Architecture audit：成功。
- Account / resource hub / workspace / cache scripts：成功。
- Course catalogs：成功。
- Question assets checkout：成功。
- 408 algorithm visualizer build：成功。
- Verify site：成功。
- Privacy-safe static artifact：成功。
- Upload Pages artifact：成功。
- Deploy to GitHub Pages：成功。
- 部署完成时间：2026-08-27 19:44:04 UTC。

### 真实设备结果

**待复测。** 本轮只有用户在真实 iPad 上确认“点题后能稳定进入独立题目页且页面可正常操作”，才会改为“已解决”。

---

## 2026-08-28 · Relax1000 iPad 点题后整页卡死 · 第 2 轮

**状态：未解决；真实 iPad 复测失败；已被第 3 轮结构性隔离方案取代。**

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

**失败。** 用户复测结果为 **B**：仍然一点题号就整页卡死，什么都点不动，刷新也很困难。因此本轮正式标记为未解决。

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
