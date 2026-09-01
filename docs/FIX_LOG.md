# Everflow 统一修复记录

> 从 2026-08-28 起，网站所有故障修复与用户确认的功能修正统一追加到本文件。禁止再把修复说明散落到多个临时文档。
>
> 每条修复必须至少记录：时间、影响页面、用户现象/需求、根因或设计判断、实际改动、数据影响、提交、自动验证、部署结果、真实设备结果。CI 通过只表示自动检查通过；必须与真实设备复测结果分开记录。

---

## 2026-09-02 · 题库云同步改为静默批处理，取消逐题上传与自动刷新

**状态：代码已部署成功；等待真实设备连续刷题复测。**

### 用户现象 / 需求

题库云同步接入后，用户反馈做题体验明显受影响：完成一题后很快触发云上传，并伴随页面刷新；连续刷题时会频繁打断当前题目和操作节奏。用户要求不能“做完一个题就上传一次、刷新一次”。

### 根因

`site/assets/js/question-cloud-sync-v2.js` 的初版策略存在两个直接问题：

- `everflow:zhenti-records-change` 与 `everflow:relax-records-change` 每次记录变化都使用约 `500ms` debounce，实际等价于用户停手半秒就进行一次完整云同步；
- 自动同步如果判断 `pulledRemote=true`，题库/整体图谱/Relax 阅读器会执行 `location.reload()`，因此云端合并可能直接刷新正在做题的页面。

这套策略适合后台数据工具，不适合高频答题场景。

### 实际改动

- 最终采用 dirty queue，而不是“每题 debounce 上传”：新增 `dirtySeq / syncedSeq`，真题或 Relax 每次答题变化只执行 `markDirty()`，**不会发起任何云请求**；
- 固定批处理周期为 `PERIODIC_FLUSH_MS = 2 * 60 * 1000`：只有存在未同步 dirty 数据时，最多每 2 分钟统一合并上传一次；没有变化时不会做周期写入；
- 跨标签页题库变化也只标记 dirty，不立即上传；
- 网络恢复时：有 dirty 数据则延迟约 3 秒批量补交；没有 dirty 数据只做一次远端拉取；
- 页面切到后台 (`visibilityState === hidden`) 时，如果有 dirty 数据立即安排补同步；`pagehide` 时也尝试直接 flush；
- 真题整库 reset 同样只标 dirty，不再特殊触发逐题式网络请求；
- 账户页“立即同步”仍是显式强制同步，课程 + 408 真题 + Relax1000 一次完成；
- `syncAll()` 使用同步开始时的 dirty sequence 快照，成功后只确认该快照，避免同步过程中产生的新答题记录被误标记为“已上传”；
- **彻底删除题库云同步中的 `location.reload()`**；自动合并到远端新数据时只派发 `everflow:question-cloud-merged` 事件，不再强制刷新当前页面；
- 启动同步从约 350ms 延后到约 1.5 秒，降低进入题库时与首屏渲染争抢资源；
- 题库、Relax 阅读器、整体图谱、账户页相关入口最终统一升级到 `20260902-qsync4` cache-bust；
- Service Worker cache generation 最终升级为 `everflow-site-v45-course14-qsync-dirty-batch-release`，淘汰旧同步脚本缓存。

### 数据影响

- 无 Supabase 表迁移；
- `course_states`、`zhenti_sync_states` 表结构不变；
- 不删除、不重编号、不重置任何真题或 Relax1000 做题记录；
- 只调整同步时机和页面刷新策略；本地仍然是每题立即保存，云端改为延迟批量提交。

### 永久门禁

`site/tools/audit-bank-features.mjs` 新增检查：

- 必须保留 2 分钟 dirty-queue 批处理契约、`markDirty()` 与 `flushDirty()`；
- 真题 / Relax 普通记录变化只能 `markDirty()`，不得恢复逐题 debounce 上传；
- `question-cloud-sync-v2.js` 不得重新出现 `CHANGE_DEBOUNCE_MS`、`location.reload` 或旧的 question-cloud reload toast；
- 必须保留 hidden/pagehide flush 与 `batch-interval`。

### 自动验证与部署

- 第一轮去刷新 corrective run `33538034392`：patch、`node --check`、Architecture audit 与 `git diff --check` 全部成功；该轮先采用 15 秒 debounce，但随后进一步收紧为真正 dirty queue；
- 最终 dirty-queue corrective run `33538684773`：`node --check`、Architecture audit、dirty queue / qsync4 / cache 检查和 `git diff --check` 全部成功；
- 最终功能提交：`6ccab52029bd11dd5efb0446fbb55a23bdedce2d`；
- 最终发布提交：`ed32397133e85609fa5d8d66c1b2bb18f7bd4b25`；
- GitHub Pages **#224**，run `33538744144`：**success**；
- quality：Architecture audit 与账户/资源/工作台/cache 脚本检查全部成功；
- deploy：课程目录、题库资源、算法可视化 build、Verify site、privacy artifact、Pages upload、Deploy to GitHub Pages 全部成功。

CI / Pages 成功只代表代码与发布链路成功，不能替代真实设备连续刷题体验验证。

### 真实设备结果

**待复测。** 重点验证：连续完成多道真题 / Relax1000 时页面不刷新、不跳题、也不会每完成一题就产生一次云请求；本地记录应立即保存；存在 dirty 数据时约每 2 分钟最多批量落云一次，切后台/离开页面或点账户页“立即同步”也能补交最新题库记录。

---

## 2026-09-02 · 账户页间距整理与本地备份纳入完整题库记录

**状态：代码已部署成功；等待真实设备复测。**

### 用户反馈 / 需求

- 账户页面各卡片、折叠区、登录区和按钮之间的上下间距不统一，需要在不改变原有简洁风格和按钮动画的前提下整理；
- “本地备份”不能只包含课程/打卡数据，还必须包含题库做题记录；
- 导出与导入按钮继续使用原来的 `account.js` 交互、busy 动画、文件下载方式，不再截获按钮事件。

### 实际改动

- 新增 `site/assets/css/account-spacing-v2.css`，只对账户页做间距覆盖：统一 page head、账户/会员切换器、登录卡、折叠区、OTP 区、已登录指标卡、同步按钮、会员/管理卡和本地备份卡的垂直节奏；移动端使用更紧凑的间距；
- 新增 `site/assets/js/local-backup-question-v2.js`，在账户页加载后兼容增强 `EveraStore.exportAll/importAll`，不修改原导出/导入按钮事件；
- 本地备份 schema 升级为 `everflow-study-backup-v3`，继续保留旧的 `focusSessions / courseStates / legacy408` 字段，并新增 `questionBanks`；
- `questionBanks.zhenti` 包含真题 wall、SRS、错题 SRS/error、reset 时间；
- `questionBanks.relax1000` 包含 records、SRS、seen、mistakes、everWrong、bookmarks、reset 时间与题目级 clocks；
- 导入时按已有题目 `updatedAt / lastReviewAt / clocks` 合并，较旧备份不会覆盖较新的本机题目记录；reset 时间继续参与冲突判断；
- 旧版 `everflow-study-backup-v2`（没有 `questionBanks`）仍可导入；
- 导入完成后派发真题与 Relax 记录变化事件，若当前已登录，现有云同步层会继续把恢复后的题库数据同步到账户；
- 账户页“本地备份”说明改为“课程打卡、408 真题与 Relax1000 做题记录”；
- Service Worker cache generation 升级为 `everflow-site-v45-course12-account-backup-spacing`，并把新 CSS/JS 纳入 shell 缓存。

### 数据影响

- 无 Supabase 表迁移；
- 不删除或重编号任何题目；
- 不清空课程、408 真题、Relax1000 本地记录；
- 导入采用合并而不是整库覆盖；
- 已有旧版备份文件保持兼容。

### 自动验证

新增 `site/tools/test-account-local-backup.mjs`，实际使用模拟 localStorage 验证：

- 新备份包含课程基础结构、408 真题和 Relax1000；
- 较新的真题/Relax 备份记录可以恢复；
- 较旧真题记录不会覆盖本机较新记录；
- 旧版仅课程备份仍可正常导入。

一次性检查 workflow run `33536962557`：`node --check`、本地备份合并测试、账户页资源/文案检查、SW generation 检查与 `git diff --check` 全部成功。

### GitHub Pages 部署

- 最终站点提交：`57ed19c9c10a7fea9a2cd62b809d54929cdb4e7b`；
- GitHub Pages **#222**，run `33536945666`：**success**；
- quality：Architecture audit 与账户/资源/工作台/cache 脚本检查全部成功；
- deploy：课程目录、题库资源、算法可视化 build、Verify site、privacy artifact、Pages upload 和 Deploy to GitHub Pages 全部成功。

CI / Pages 成功只表示自动验证和部署完成，不能替代真实设备复测。

### 真实设备结果

**待复测。** 需要确认：账户页间距是否符合预期；导出的 JSON 中能看到 `questionBanks.zhenti` 与 `questionBanks.relax1000`；在另一浏览器/设备导入后，真题答案/状态和 Relax1000 做题记录、错题、收藏等能够恢复且不会覆盖更新的本机记录。

---

## 2026-09-02 · 账户认证流程纠正：注册验证码、旧密码改密与原按钮交互恢复

**状态：代码已纠正并部署成功；等待真实设备复测。**

### 用户反馈 / 需求

上一轮把“首次注册”改成直接邮箱 + 密码注册，并在已登录账户页直接提供“设置 / 更新密码”，同时新增脚本截获了原账户页的验证码、同步、退出按钮。用户指出：

- 首次注册必须有邮箱验证码；
- 重置/修改密码必须通过“邮箱验证码”或“旧密码”之一确认身份；
- 账户页应继续保持原先简洁结构，不要把所有认证操作同时铺开；
- 原账户按钮的动态 loading / 完成态交互不应被新增脚本替换；
- “立即同步”仍需同时同步课程与题库，但不需要把按钮文案改得很长。

### 设计纠正

- 登录：继续使用原来的邮箱 + 密码主入口。
- 验证码登录：仅已有账号可用，底层 `signInWithOtp` 继续保持 `shouldCreateUser:false`，不会因“登录验证码”自动创建用户。
- 首次注册：折叠在“注册新账号”中，填写邮箱 + 密码 + 确认密码后调用 Supabase `signUp`；只有输入邮件中的 6 位 signup OTP 并通过 `verifyOtp(... type:'signup')` 后才完成登录。
- 忘记密码：保持原有“邮箱 recovery 验证码 → 新密码”流程。
- 已登录修改密码：折叠在“修改密码”中，必须先用当前邮箱 + 旧密码重新校验，再调用 `updatePassword`；不允许仅凭已登录 session 直接覆盖密码。
- 账户主页面恢复为原先紧凑卡片结构；注册和修改密码均使用折叠区，不再新增大块安全/注册卡片。
- `account-auth-sync-v2.js` 不再监听/截获原 `data-otp-send`、`data-sync-now`、`data-logout` 按钮，不再使用 `stopImmediatePropagation`；原 `account.js` 的动态按钮、busy 状态、完成动画与 toast 继续负责这些交互。
- “立即同步”按钮文案恢复为原来的“立即同步”；底层 `EveraCloud.syncAll()` 仍由题库云同步层升级为“课程 + 408 真题 + Relax1000”统一同步。

### 数据影响

- 无 Supabase 表迁移；
- 不删除已有账户；
- 不清空课程、真题、Relax1000 做题记录；
- 继续复用 `course_states` 与 `zhenti_sync_states`；
- 登录验证码仍禁止自动创建用户；注册创建用户只发生在明确点击“注册新账号”的流程中。

### 本轮代码

- `site/account/index.html`：恢复简洁账户页结构，新增折叠式“注册新账号”和“修改密码”，同步按钮恢复原文案。
- `site/assets/js/account-auth-sync-v2.js`：只负责 signup OTP 注册与旧密码改密，并加载题库云同步；不再替换原按钮交互。
- `site/tools/audit-bank-features.mjs`：门禁改为检查“注册验证码 + 旧密码改密 + 原按钮归属”。
- `site/sw.js`：缓存 generation 升级为 `everflow-site-v45-course11-account-auth-simple`，清理上一版账户资源缓存。

### 前一轮发布过程中的失败保留

上一轮为了发布认证/题库云同步曾出现多次维护流程失败，均属于发布/门禁脚本问题而非真实设备成功：

- run `33533687405`：一次性 workflow YAML 未成功产生 job；
- run `33533841296`：保护脚本对主部署文件中重复定位行的假设错误，主动断言失败；
- run `33533943322`：业务代码语法和 architecture audit 均已通过，但 GitHub Actions token 无 workflows 权限，拒绝推送对主部署 workflow 的修改；
- run `33534232023`：改为只提交站点源文件后成功，生成 `cd1f28d2cd419cd8b95a4d17ffa6b62baec6cad5`。

这些失败不视为功能成功，也不删除历史记录。

### 自动验证

本轮 corrective workflow 会执行：

- `node --check site/assets/js/account-auth-sync-v2.js`；
- `node --check site/assets/js/question-cloud-sync-v2.js`；
- `node site/tools/audit-bank-features.mjs`；
- `git diff --check`。

### GitHub Pages 部署

- corrective workflow run `33535498735`：代码修正、architecture audit 与 `git diff --check` 全部成功；
- 最终发布提交：`21988ffadcb5e731b111598df97b687687e13153`；
- GitHub Pages **#217**，run `33535688124`：**success**；
- quality：Architecture audit、账户/资源/工作台/cache 脚本检查全部成功；
- deploy：课程目录、题库资源、算法可视化 build、Verify site、privacy artifact、Pages upload 与 Deploy to GitHub Pages 全部成功；
- workflow 完成时间：2026-09-01 17:06:10 UTC；
- 日志收尾 run `33535849040` 因一次性 workflow YAML 解析失败而未产生 job；该失败只影响文档收尾，不影响已经成功的 Pages #217，随后改用短 YAML + 独立 Python 脚本修正。

CI / Pages 成功只代表自动验证和部署完成，真实设备认证流程仍需用户复测。

### 真实设备结果

**待复测。** 需要验证：注册是否收到并要求 6 位验证码；忘记密码验证码链路；已登录输入错误旧密码不能改密、正确旧密码才能修改；原登录/验证码/立即同步按钮动态效果是否恢复；立即同步后另一设备能读取真题和 Relax1000 记录。

---

## 2026-08-28 · 整体图谱 iOS Safari 题目抽屉卡死 / 无限 DOM Observer 回归

**状态：代码修复并部署；等待真实 iPhone/iPad 复测。**

### 用户现象

真实 iPhone Safari 截图中，整体图谱打开 `2017 · 第 4 题` 后右侧抽屉长期停留在“正在读取题目…”，随后整个页面明显卡顿并出现无法正常刷新的情况。

### 根因

`graph-answer-enhancements.js` 曾对 `drawerBody` 使用 `childList + subtree` 的永久 MutationObserver。增强层自己写入选项/结果 DOM 时会再次触发该 observer；同时 `submit.textContent` 曾无条件赋值，继续制造 child mutation。在 iOS Safari 上形成高频自触发反馈环，主线程被占满。上一轮只给结果区增加 `data-state` guard，并没有切断 submit 文本和整个 drawer subtree 的自触发链路。

### 实际改动

- 删除 `drawerBody` subtree MutationObserver；
- 改为最多约 10 秒的有界 retry：`140ms × 72`，仅在 drawer 打开且当前题未准备好时轮询；
- 仅保留对 drawer `hidden` 属性的轻量 observer；
- submit label 改为内容变化时才写 `textContent`；
- drawer 答案、真题记录、Relax 记录变化显式触发一次增强；
- matrix 点击后用 `setTimeout(...,0)` 延迟到当前题切换完成再开始增强；
- `pagehide` 时立即取消 retry；
- 图谱资源 cache-bust 升级为 `20260828-graph-answer2`；
- Service Worker 升级到 `everflow-site-v45-course7-graph-answer2-safari` 并淘汰旧 graph-answer 缓存。

### 数据影响

无 Supabase 迁移、无题目 ID 改写、无答题记录删除；原真题与 Relax 本地记录结构保持不变。

### 主要提交

- `389d013ca9e6b4ad16180207ee4a2e14942b9427`
- `1872a5f4c1acbd8ac42ee800d5d1758b1540cdff`
- `54615d625dbb58d8e490e7c36f67e9efa60532f7`
- `5d88778056770480f6d634a7ef986aa5f237bfd3`

### 自动验证与部署

GitHub Pages **#196**，run `33114892864`，head `5d88778056770480f6d634a7ef986aa5f237bfd3`：quality 与 deploy 全部成功；Architecture audit、Verify site、Pages upload/deploy 均成功；部署完成于 2026-08-27 20:46:37 UTC。

### 真实设备结果

**待复测。** CI / Pages 成功不能替代 iPhone/iPad Safari 实测；已冻结的旧 Safari 标签页需关闭后新开页面再验证。

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


---

## 2026-08-28 · QWER 快捷键统一与 Relax 题号方块加深

**状态：代码与 GitHub Pages 已部署成功；等待电脑端真实交互与视觉复测。**

### 用户现象 / 需求

用户在电脑端 `/zhenti/` 的 Relax1000 题库墙实拍中指出：

- 不同答题页面的电脑选择题快捷键不统一，要求统一使用 `Q / W / E / R` 对应 `A / B / C / D`；
- Relax1000 题库墙外层题号方块仍使用偏浅的粉彩背景与细边框，熟悉/模糊/不会状态不够醒目，需要明显加重。

### 诊断与统一规则

核查后确认：

- 408 真题原有 `zhenti-qwer.js` 已采用 `Q/W/E/R → A/B/C/D`；
- Relax1000 速刷卡片也已经采用同一套 QWER；
- 不一致来自 Relax 独立阅读器和整体图谱，它们仍保留 `A/B/C/D` 直接选项，并占用 `E` 作为解析快捷键；
- 照片中偏浅的方块来自题库墙 `.relax-q-chip`，不是已经加深过的独立阅读器左侧章节导航。

本轮因此把桌面选择题主快捷键统一为：`Q→A`、`W→B`、`E→C`、`R→D`；由于 `E` 现在必须用于 C 选项，解析统一改用 `X`。`Enter` 提交、方向键切题、`1/2/3/0` 掌握状态、`F` 收藏和 `Esc` 返回/关闭继续保持原逻辑。

### 实际改动

- 新增 `site/assets/js/question-choice-qwer.js`，作为 Relax 独立阅读器与整体图谱的轻量键盘兼容层：
  - `Q/W/E/R` 映射 `A/B/C/D`；
  - `X` 打开/收起解析；
  - 输入框、文本域、select、contenteditable 或 Ctrl/Alt/Meta 场景不劫持按键；
  - 使用捕获阶段优先于旧快捷键执行，避免 `E` 继续被旧“解析”逻辑占用；
  - **不使用 MutationObserver，也不观察/重写题目子树**，保持上一轮 Safari 卡死热修建立的安全边界。
- 新增 `site/assets/css/question-choice-qwer.css`，把 Relax reader 与整体图谱选项旁的可见键帽统一显示为 Q/W/E/R，并把解析键帽显示为 X；触摸设备继续隐藏电脑键帽提示。
- Relax reader 与整体图谱都在原模块脚本之前加载共享 QWER 层；整体图谱 build 标识升级为 `20260828-graph-answer3-qwer`。
- 新增 `site/assets/css/relax1000-wall-strong.css`，专门覆盖照片中的 Relax 题库墙题号：
  - 默认未做题：2px 深灰边框与更明确灰底；
  - 已看未标记：深灰实底；
  - 熟悉/mastered：`#24945d` 深绿色 + `#147845` 边框；
  - 模糊/fuzzy：`#e0a51d` 深黄色 + `#b77a08` 边框；
  - 不会/weak：`#d84b5f` 深红色 + `#b52d43` 边框；
  - 答对/答错继续保留底部正确/错误提示，不把“答对”错误等价成“熟悉”。
- `question-bank-switch.js` 资源版本升级到 `20260828-qwer-strong1`，Relax 模式加载强状态覆盖层。
- Service Worker 缓存升级为 `everflow-site-v45-course9-qwer-strong-status`，并把 QWER JS/CSS 与强状态 CSS 纳入 shell，避免电脑继续命中旧浅色资源。
- `audit-bank-features.mjs` 增加永久门禁：QWER 映射、X 解析、加载顺序、禁止 QWER 层使用 MutationObserver，以及 Relax 墙 2px 深色绿/黄/红状态均成为架构契约。

### 数据影响

无数据迁移、无题目 ID 改写、无答题记录清空。收藏、错题、掌握状态、笔记、SRS、本地记录与云端课程数据均未改动；本轮只改变键盘入口、可见快捷键提示和题号视觉样式。

### 主要提交

- QWER 共享键盘层：`72329bd029034afbb8ae977f63f99bd44e0b898c`
- QWER 可见键帽样式：`1d650d838229c72ef0d94f11b171f83a97aaaf39`
- Relax 墙深色题号样式：`0c1feeeca2a3617b9e028bdc3e3b0973e226d21d`
- Relax 墙加载强状态覆盖：`1f3c112928419d0b6f1de08c1ed4519b15d09cf0`
- Relax reader 接入 QWER：`51aff06fd22f77b0353227d3b9bc18f41cf9719f`
- 整体图谱接入 QWER：`d55fc9015d4425b4b4672e0cb5f574c33ace3683`
- Service Worker 新缓存：`d8c68ba875c9650153413e4e64dea884be89b74e`
- Architecture audit QWER/深色门禁：`930fdcac0d6745ff90db1440ea612643b207f0e3`

### 自动验证与部署

最终 GitHub Pages workflow **#207**（run `33131238586`）结论为 **success**：Architecture audit（含新增 QWER、加载顺序、无 MutationObserver、深色墙门禁）、站点脚本检查、课程目录、题库资源、`struct-viz` typecheck/lint/test/build、Verify site、隐私构建、Upload Pages artifact 与 Deploy Pages 全部成功。Deploy Pages 完成于 2026-08-28 00:56:18 UTC。

### 真实设备结果

**待复测。** 用户当前实拍为修复前状态。需要在电脑端确认：Relax 独立阅读器与整体图谱使用 Q/W/E/R 能分别选择 A/B/C/D，X 能查看解析；并确认 `/zhenti/` Relax1000 题库墙的默认/已看/熟悉/模糊/不会题号方块已经明显加深。CI 成功不替代真实设备确认。
