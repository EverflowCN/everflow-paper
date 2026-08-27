# Everflow 统一修复记录

> 从 2026-08-28 起，网站所有故障修复与用户确认的功能修正统一追加到本文件。禁止再把修复说明散落到多个临时文档。
>
> 每条修复必须至少记录：时间、影响页面、用户现象/需求、根因或设计判断、实际改动、数据影响、提交、自动验证、部署结果、真实设备结果。CI 通过只表示自动检查通过；必须与真实设备复测结果分开记录。

---

## 2026-08-28 · Relax 阅读器左侧题号导航、状态色统一与氧气课程扩展

**状态：代码与课程数据已更新，GitHub Pages 自动部署成功；等待真实 iPad 对新导航 UI 复测。**

### 用户需求

在第 3 轮独立 Relax 阅读器已经能在 iPad 正常打开后，继续：

- 在阅读器左侧增加类似真题整套答题模式的题号/热力图导航；
- “熟悉”使用绿色，“模糊”使用黄色，“不会”使用红色；
- 课程打卡新增“氧气每日一题（已完结）”；
- 课程打卡新增“27代码打卡营（更新中）”；
- 所有修复继续记录在本文件。

### Relax 阅读器改动

- 新增 `site/assets/css/relax1000-reader-nav.css`。
- 独立阅读器改为两栏结构：左侧轻量题号导航，右侧仍是独立题目正文。
- 左侧只渲染当前筛选队列的题号，不重新加载整面 Relax 题库墙，因此不破坏第 3 轮解决 iPad 卡死时建立的“题库墙 / 阅读器隔离”边界。
- 题号状态颜色统一：
  - 未标记：灰/默认；
  - 熟悉（内部状态仍为 `mastered`）：绿色；
  - 模糊 `fuzzy`：黄色；
  - 不会 `weak`：红色；
  - 错题未掌握：红色；
  - 收藏：题号右上角显示星标；
  - 当前题：主题色描边。
- 点击左侧题号只切换独立阅读器当前题，不返回题库墙。
- 上一题/下一题切换时只刷新旧当前题和新当前题两个导航方块；答题、收藏、掌握状态只刷新当前方块，不重建整个题号导航。
- 阅读器状态按钮显示文案由“熟练”统一为“熟悉”，但内部数据值仍保持 `mastered`，所以历史掌握状态兼容。
- iPad 横屏保留左侧栏；窄屏/手机退化为横向题号条，避免挤压正文。
- 独立阅读器资源版本升级到 `20260828-reader4`；Service Worker 缓存升级到 `everflow-site-v45-course5-relax-nav-courses`。

### 新增课程目录与源核验

#### 氧气每日一题（已完结）

- catalog id：`oxygen-daily-question`
- 来源 UP：就是氧气11（MID 378777885）。
- 实际核验为 **63 个视频**，不是 83 个独立视频。
- 从 day1 开始，最终为 `day82&83`；存在跳号以及 day60&61、day76&77、day79&80、day82&83 等合并讲解。
- 状态：`completed`。
- 每个课时使用 `bvid:<BVID>` 作为稳定 `item_id` / `progress_id`。

#### 27代码打卡营（更新中）

- catalog id：`oxygen-code-camp`
- Bilibili UGC section：`27代码打卡营`
- section id：`9166773`
- 当前核验 **36 个课时（含使用指南）**。
- 当前最新已到第十二周习题-1“盛最多水的容器”。
- 状态：`updating`，36 是当前已确认基线，不是永久上限。
- 每个课时继续使用 `bvid:<BVID>` 作为稳定 ID；后续只能按 BVID 增量添加/更新，不得因标题或周次改变重编号旧进度。

### 课程维护策略

- 两套新课程已写入 Supabase `course_catalogs` / `course_catalog_items`，因此现有 `/408/` 和课程中心会通过公共课程目录自动出现，无需再把按钮写死到页面。
- 新增动态课程以 Supabase 为 canonical source，不复制成另一份持续漂移的 GitHub 静态真源。
- 原 `oxygen-reinforcement.json` 仍是四科强化静态完整基线，不受这两套新课程影响。
- `408 Course Sync` 已扩展：继续检查“27真题套卷讲解”，同时监控“27代码打卡营”；每日一题已完结，只做 63 条完整性检查；任何同步都不得修改 `course_states` 或四科强化基线。
- 详细课程长期规则同步写入 `docs/COURSE_CATALOG_MAINTENANCE.md`；本文件仍是唯一修复流水记录。

### 数据影响

- 新增课程目录及对应课程条目，不修改旧用户打卡数据。
- 操作前后 `course_states` 仍为 **1260** 条，非空笔记仍为 **1** 条。
- 当前活动课程条目：
  - `oxygen-past-papers`：5；
  - `oxygen-reinforcement`：123；
  - `oxygen-daily-question`：63；
  - `oxygen-code-camp`：36。
- 已用 `anon` 角色验证两套新目录公开可见：每日一题 63 条、代码打卡营 36 条。

### 提交

- Relax 左侧题号导航样式：`6fea379c2b73c4f91c553da69ca747e4b69b236e`
- Relax 阅读器轻量导航逻辑：`179ce67e51a419346f65d3ee4c34abb5c267c1c4`
- 阅读器加载 reader4 导航资源：`25e7a68e5046f0a61111a3d3634a45804ad67686`
- Service Worker 新资源缓存声明：`fd0eca3c7c6b55907401c9b60b6e6702c5f25d4b`
- 动态课程保持云端 canonical、移除不存在的静态快照依赖：`dfda7cff070ac0a939f610dd7f4f21089761553c`
- 课程维护文档更新：`7b6b61e7d8d27020190d576cdbcd7130a2c93136`

### 自动验证与部署

包含本轮全部前端功能代码与最终缓存策略的 GitHub Pages workflow **#178**（run `33111876602`）已完成，结论为 **success**。

最终用户端 UI 仍需真实 iPad 检查左侧导航的尺寸、颜色、滚动和切题流畅度；自动部署成功不等同于这一轮新 UI 已完成真实设备验收。

### 真实设备结果

**待复测本轮新增 UI。** 第 3 轮解决的“点 Relax 题号整页卡死”已经真实 iPad 验证成功；本轮只需确认新增左侧导航没有重新引入卡顿，以及绿/黄/红状态显示符合预期。

---

## 2026-08-28 · Relax1000 iPad 点题后整页卡死 · 第 3 轮

**状态：已解决；GitHub Pages 部署成功，并经真实 iPad 验证。**

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

**成功。** 用户在真实 iPad Safari 上提供照片确认：点击 Relax1000 题号后能够进入独立阅读页，题干、选项、掌握状态、收藏、提交答案、查看解析和笔记区域能够正常显示，页面不再出现此前“点击后整页卡死、无法操作、刷新困难”的现象。因此本轮正式标记为已解决。

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

以后所有 `fix(...)`、线上故障、用户反馈回归修复以及基于故障修复继续发生的交互改动，都继续追加到本文件；如果一次修复真实复测失败，必须将该条状态改为“未解决”，保留失败过程，不得删除或改写成成功。涉及课程数据时，长期基线与同步边界可同时维护在 `docs/COURSE_CATALOG_MAINTENANCE.md`，但修复发生过程仍只记录在本文件。
