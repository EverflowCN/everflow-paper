# Everflow 统一修复记录

> 从 2026-08-28 起，网站所有故障修复与用户确认的功能修正统一追加到本文件。禁止再把修复说明散落到多个临时文档。
>
> 每条修复必须至少记录：时间、影响页面、用户现象/需求、根因或设计判断、实际改动、数据影响、提交、自动验证、部署结果、真实设备结果。CI 通过只表示自动检查通过；必须与真实设备复测结果分开记录。

---

## 2026-08-28 · Relax 导航章节分组、深色状态、桌面快捷键与整体图谱选择题作答

**状态：代码与 GitHub Pages 已部署成功；等待真实 iPad/电脑交互复测。**

### 用户需求

上一轮 Relax 独立阅读器左侧已经有轻量题号导航，但用户反馈：

- 左侧题号仍然像“一坨”，没有清楚区分章节；
- 熟悉/模糊/不会的题号底色太浅，需要明显加深；
- 电脑端需要真正可用、页面可见的快捷键；
- “整体图谱”中选择题只有查看题目/答案，不能像题库一样直接选择 A–D 并提交；综合应用题暂时可以保持只读。

### 数据层级核验

对当前 Relax1000 canonical 题源 `EverflowCN/408-exercise-paper-generator` 的 `站点/data/questions.json` 全量字段进行检查后确认：

- 题目有 `subjectId / subject`；
- 题目有 `chapterId / chapter`；
- 当前题源**没有可靠的 `section / sectionId` 字段**。

因此本轮导航使用真实存在的 **科目 → 第 N 章 · 章名 → 题号** 分组，不凭标题猜测或伪造“第几节”。以后题源真正补充 `section/sectionId` 时，可在章下面继续增加节层级；在数据不存在前，禁止前端自行推断节。

### Relax 独立阅读器改动

- `relax1000-reader.js` 新增 `chapterOrder()` 和 `navGroups()`，左侧导航按当前队列中的科目、章节分组。
- 每组显示科目、`第 N 章 · 章名`、本组题数和对应题号方块。
- 当前题仍然只在独立 reader 内切换，不把原题库墙重新加载进页面，继续遵守 v2 的“题库墙 / reader 隔离”规则。
- 新增 `relax1000-reader-nav-v2.css` 作为最终视觉覆盖层，状态色加深为：
  - 熟悉/mastered：`#24945d`，深绿色；
  - 模糊/fuzzy：`#e0a51d`，深黄色；
  - 不会/weak 与未掌握错题：`#d84b5f`，深红色；
  - 已看未标记：`#8a91a0`；
  - 当前题：额外紫色高对比描边。
- 触摸设备仍隐藏键帽提示；桌面端显示快捷键帮助。

### Relax 电脑快捷键

独立 reader 当前支持：

- `A / B / C / D`：选择对应选项；
- `Enter`：提交当前选择；
- `← / →`：上一题 / 下一题；
- `1`：熟悉；
- `2`：模糊；
- `3`：不会；
- `0`：清除掌握状态；
- `F`：收藏/取消收藏；
- `E`：展开/收起解析；
- `Esc`：返回题库墙。

输入笔记、文本框获得焦点或按下 Ctrl/Alt/Meta 时，快捷键不会劫持正常输入。

### 整体图谱选择题作答

新增共享增强层：

- `site/assets/js/graph-answer-enhancements.js`
- `site/assets/css/graph-answer-enhancements.css`

它不复制或替换 `zhenti-graph.js` / `relax1000-graph.js`，只增强两者共用的右侧题目 drawer，因此仍保持 v2 的“一个图谱 shell + 两个数据适配器”结构。

选择题判定与边界：

- 408 真题：只对第 1–40 题、`verification.status=verified`、存在 options 且正确答案为 A–D 的题启用作答；
- Relax1000：只对正确答案明确为 A–D 且存在文本选项或原题选项图的题启用作答；
- 综合应用题/大题继续保持原先只读/查看答案，不强行套 A–D。

可作答选择题现在支持：

- 点击选项；
- A–D 键选择；
- `Enter` 提交；
- 提交后显示回答正确/错误、你的答案和正确答案；
- `1 / 2 / 3 / 0` 修改熟悉/模糊/不会/清除；
- `E` 查看/收起解析；
- 原方向键移动和 Esc 关闭继续由共享 `graph-controls.js` 负责。

图谱选择题继续写回原有学习记录：真题使用 `everflow-408-zhenti-wall-v1`，Relax 使用原 `relax1000-core` 的记录与兼容同步；没有建立新的孤立答题数据库。

### 性能与 Safari 防护

- 图谱增强层的 MutationObserver 只负责在 drawer 内容被原适配器重建后重新挂上可交互属性。
- 回答结果使用 `data-state` 防重复写 DOM，避免 observer 因为自己写 `innerHTML` 再触发自己形成自循环。
- Relax 图谱增强层复用与 `relax1000-graph.js` 相同 URL 的 `relax1000-core.js`，避免再产生第二份 core runtime。
- 选择题增强不改变已经验证稳定的 Relax 独立阅读器路由架构。

### CI / 维护门禁修复

本轮首次提交后，Pages #190 在 `Architecture audit` 被阻止。诊断确认：

1. 新 reader 与 graph answer 两个 JS 单独 `node --check` 均成功；
2. 失败来自旧 `audit-bank-features.mjs` 把 Pages build 标识硬编码为 `20260825-bank1/2`；本轮正常升级为 `20260828-reader5-graph-answer1` 后被错误判失败；
3. 第一次更新审计后 #191 仍失败，是新审计错误地寻找图谱 CSS 中不存在的 `background:#24945d` 字面量，而实际深色语义通过 `--mastered / --fuzzy / --weak` 变量定义。

最终修复：

- v2 architecture audit 不再把某一天的 build 版本号当架构契约；
- 改为检查 build 标识格式、v2 生命周期边界、独立 reader、章节分组、桌面快捷键、choice-only 图谱作答层以及语义状态色变量；
- 以后正常升级资源版本不会再被旧日期字符串误伤；
- 为定位问题临时创建的 `debug-bank-audit.yml` 已在确认根因后删除，不留调试 workflow 污染仓库。

### 数据影响

- 无题目 ID 改写；
- 无历史答题记录清空；
- 无收藏/错题/掌握状态/笔记/SRS 迁移；
- 图谱选择题直接复用题库现有记录键，因此同一道题在题库与图谱中继续共享状态。

### 主要提交

- Relax 章节分组与桌面快捷键：`ee6c7be3b69af8077bb4cbb0590431a7afa4a211`
- Relax 深色分组导航样式：`21d7c3bb3548716e5440a6e1a5d6bf49ff47a21c`
- Reader5 资源发布：`76d607027688019b062e553d39e81a6ceafb9c61`
- 图谱可交互选择题样式：`41db1cf0e77407c9b05b0b245225cc912c236bd3`
- 图谱共享选择题作答入口：最终逻辑提交 `23a402245e0defb0469e6162c17d875269e54d28`
- 图谱页面加载增强层：`76a8c67ff02ea16eb70992e7d2678dee3849238a`
- Service Worker reader/graph-answer 新缓存：`bcf3b0f5f9e105e79ac77817a9f76ef203086ec6`
- Pages 新交互门禁：`232aa63f82d57bd04173e1507ff1ef4a4adae7e6`
- v2 审计从版本号硬编码改成语义契约：`5eb22af771a8ef40049dd739e006abe5024d856c`
- 图谱状态色审计修正：`e5e2ac8b30851c828b58adf1499c12922ca9d555`
- 临时诊断 workflow 删除：`b058e6b6bd329602a3560a47349606672ff8c745`

### 自动验证与部署

最终 GitHub Pages workflow **#192**（run `33113990096`）结论为 **success**：

- Architecture audit：成功；
- 新 JS 与原站点脚本语法校验：成功；
- Course catalogs：成功；
- Question assets checkout：成功；
- `struct-viz` typecheck / lint / test / build：成功；
- Verify site：成功；
- Privacy-safe static artifact：成功；
- Upload site artifact：成功；
- Deploy to GitHub Pages：成功；
- 最终部署完成：2026-08-27 20:35:33 UTC。

### 真实设备结果

**待复测。** 本轮需要分别验证：Relax 左栏章节分组/深色状态/桌面快捷键，以及整体图谱的真题选择题和 Relax 选择题能否正常点击 A–D 并提交。自动部署成功不替代真实设备结果。

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

---

## 2026-08-28 · 全局“熟悉”状态色统一为绿色

**状态：代码与 GitHub Pages 已部署成功；等待用户对全站颜色进行真实设备复测。**

### 用户现象

用户反馈：新 Relax 阅读器和新图谱中的“熟悉”已经显示为绿色，但题库墙、整套真题、整体图谱旧状态块等其他位置仍然不是绿色；“模糊”和“不会”颜色保持现状即可。

### 根因

全站真题/图谱共用的 canonical 状态样式 `site/assets/css/zhenti-status.css` 仍把 `mastered` 定义为旧蓝色：`#a9d9f7 / #75bde8 / #67add6`。此前只在新增的 Relax reader / graph enhancement 局部使用绿色，导致同一个 `mastered` 状态出现两套视觉语义。

### 实际改动

- 全局 `--status-mastered` 改为深绿色 `#24945d`；
- 全局 `--status-mastered-border` 改为 `#147845`；
- mastered 文字改为白色；
- 深色模式同样使用绿色，不再回退到蓝色；
- 真题题目弹层、整套答题状态按钮、整体图谱状态块和图例均通过公共变量继承绿色；
- `fuzzy` 黄色和 `weak` 红色保持原有全局值不变；
- Service Worker 缓存升级为 `everflow-site-v45-course8-status-green-global`，并把 `zhenti-status.css` 纳入 shell，避免设备继续命中旧蓝色缓存；
- Architecture audit 新增约束：`mastered` 必须保持 `#24945d` 绿色，旧 `#a9d9f7` 蓝色不得重新出现。

### 数据影响

无。仅修改展示层状态颜色，不修改题目 ID、答题记录、掌握状态值、错题、收藏、笔记或云端数据。内部状态仍为 `mastered`。

### 提交

- 全局 mastered 绿色：`49905d2b63e4db73d2ffa67cf0677f320e2838ee`
- Service Worker 缓存刷新：`2cd8bc239da59d0e65457244e807b4c702114605`
- Architecture audit 全局绿色门禁：`e0a9e8849e739a8d61481d859afbcbcd4ed18473`

### 自动验证与部署

GitHub Pages workflow **#199**（run `33128689288`）结论为 **success**。Architecture audit、站点脚本检查、课程目录、题库资源、`struct-viz` typecheck/lint/test/build、Verify site、隐私构建、Upload Pages artifact 和 Deploy Pages 全部成功。Deploy Pages 完成于 2026-08-28 00:08:44 UTC。

### 真实设备结果

**待复测本轮全局颜色。** CI 成功只说明公共状态样式和门禁通过，仍需用户确认题库墙、整套真题、整体图谱等实际页面中的“熟悉”均已显示为绿色。

### 补记：整体图谱 Safari 卡死热修

上一轮整体图谱选择题增强层曾因观察 `drawerBody` 子树并同时修改该子树，形成 MutationObserver 自触发循环，导致 iOS Safari 出现“正在读取题目…”、整页卡死和难以刷新。该循环已在 `5d88778056770480f6d634a7ef986aa5f237bfd3` 中移除，Pages #196 成功部署；用户随后真实设备复测回复“可以了”，因此该 Safari 卡死热修的真实设备结果正式记为 **成功**。
