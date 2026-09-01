from pathlib import Path
p=Path('docs/FIX_LOG.md')
text=p.read_text(encoding='utf-8')
heading='## 2026-09-02 · 题库云同步改为静默批处理，取消逐题上传与自动刷新'
if heading in text:
    raise SystemExit('entry already exists')
entry='''## 2026-09-02 · 题库云同步改为静默批处理，取消逐题上传与自动刷新

**状态：代码已部署成功；等待真实设备连续刷题复测。**

### 用户现象 / 需求

题库云同步接入后，用户反馈做题体验明显受影响：完成一题后很快触发云上传，并伴随页面刷新；连续刷题时会频繁打断当前题目和操作节奏。用户要求不能“做完一个题就上传一次、刷新一次”。

### 根因

`site/assets/js/question-cloud-sync-v2.js` 的初版策略存在两个直接问题：

- `everflow:zhenti-records-change` 与 `everflow:relax-records-change` 每次记录变化都使用约 `500ms` debounce，实际等价于用户停手半秒就进行一次完整云同步；
- 自动同步如果判断 `pulledRemote=true`，题库/整体图谱/Relax 阅读器会执行 `location.reload()`，因此云端合并可能直接刷新正在做题的页面。

这套策略适合后台数据工具，不适合高频答题场景。

### 实际改动

- 新增 `CHANGE_DEBOUNCE_MS=15000`：真题与 Relax 的普通做题变化只进入 15 秒静默批处理队列；连续作答会不断重置计时器，不再每题发一次请求；
- 跨标签页变化改为 5 秒 debounce；
- 网络恢复后延迟约 3 秒补同步；
- 页面切到后台 (`visibilityState === hidden`) 或 `pagehide` 时立即安排一次补同步，尽量在用户离开时落云；
- 真题整库 reset 改为短延迟补同步，而不是和单题作答共用逐题策略；
- 保留 5 分钟周期兜底同步和账户页“立即同步”的手动强制同步；
- **彻底删除题库云同步中的 `location.reload()`**；自动合并到远端新数据时只派发 `everflow:question-cloud-merged` 事件，不再强制刷新当前页面；
- 启动同步从约 350ms 延后到约 1.5 秒，降低进入题库时与首屏渲染争抢资源；
- 题库、Relax 阅读器、整体图谱、账户页相关入口统一升级到 `20260902-qsync3` cache-bust；
- Service Worker cache generation 升级为 `everflow-site-v45-course13-qsync-batched-release`，淘汰旧 qsync2 脚本缓存。

### 数据影响

- 无 Supabase 表迁移；
- `course_states`、`zhenti_sync_states` 表结构不变；
- 不删除、不重编号、不重置任何真题或 Relax1000 做题记录；
- 只调整同步时机和页面刷新策略；本地仍然是每题立即保存，云端改为延迟批量提交。

### 永久门禁

`site/tools/audit-bank-features.mjs` 新增检查：

- 必须保留 `CHANGE_DEBOUNCE_MS=15000`；
- 真题 / Relax 普通记录变化必须走批量 debounce；
- `question-cloud-sync-v2.js` 不得重新出现 `location.reload` 或旧的 question-cloud reload toast；
- 必须保留 hidden-page flush。

### 自动验证与部署

- corrective workflow run `33538034392`：patch、`node --check`、Architecture audit、qsync3/cache-bust 检查和 `git diff --check` 全部成功；
- 主功能提交：`c99ea07569b887bc51de1fcf42be28480c6c5ee6`；
- 最终发布提交：`b54b66e00ace496469153864c55b15aaf6377a8c`；
- GitHub Pages **#223**，run `33538129182`：**success**；
- quality：Architecture audit 与账户/资源/工作台/cache 脚本检查全部成功；
- deploy：课程目录、题库资源、算法可视化 build、Verify site、privacy artifact、Pages upload、Deploy to GitHub Pages 全部成功。

CI / Pages 成功只代表代码与发布链路成功，不能替代真实设备连续刷题体验验证。

### 真实设备结果

**待复测。** 重点验证：连续快速完成多道真题 / Relax1000 时页面不刷新、不跳题、不出现逐题网络等待；停止操作约 15 秒后允许后台静默批量同步；切后台或点账户页“立即同步”后云端仍能拿到最新题库记录。

---

'''
marker='---\n\n'
pos=text.find(marker)
if pos<0:
    raise SystemExit('top marker missing')
pos+=len(marker)
p.write_text(text[:pos]+entry+text[pos:],encoding='utf-8')
