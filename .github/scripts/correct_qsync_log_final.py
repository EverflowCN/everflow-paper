from pathlib import Path
p=Path('docs/FIX_LOG.md')
text=p.read_text(encoding='utf-8')
heading='## 2026-09-02 · 题库云同步改为静默批处理，取消逐题上传与自动刷新'
start=text.index(heading)
end=text.index('\n---\n',start)
section=text[start:end]
old='''- 新增 `CHANGE_DEBOUNCE_MS=15000`：真题与 Relax 的普通做题变化只进入 15 秒静默批处理队列；连续作答会不断重置计时器，不再每题发一次请求；
- 跨标签页变化改为 5 秒 debounce；
- 网络恢复后延迟约 3 秒补同步；
- 页面切到后台 (`visibilityState === hidden`) 或 `pagehide` 时立即安排一次补同步，尽量在用户离开时落云；
- 真题整库 reset 改为短延迟补同步，而不是和单题作答共用逐题策略；
- 保留 5 分钟周期兜底同步和账户页“立即同步”的手动强制同步；
- **彻底删除题库云同步中的 `location.reload()`**；自动合并到远端新数据时只派发 `everflow:question-cloud-merged` 事件，不再强制刷新当前页面；
- 启动同步从约 350ms 延后到约 1.5 秒，降低进入题库时与首屏渲染争抢资源；
- 题库、Relax 阅读器、整体图谱、账户页相关入口统一升级到 `20260902-qsync3` cache-bust；
- Service Worker cache generation 升级为 `everflow-site-v45-course13-qsync-batched-release`，淘汰旧 qsync2 脚本缓存。'''
new='''- 最终采用 dirty queue，而不是“每题 debounce 上传”：新增 `dirtySeq / syncedSeq`，真题或 Relax 每次答题变化只执行 `markDirty()`，**不会发起任何云请求**；
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
- Service Worker cache generation 最终升级为 `everflow-site-v45-course14-qsync-dirty-batch-release`，淘汰旧同步脚本缓存。'''
assert old in section, 'old actual-change block missing'
section=section.replace(old,new)
old='''- 必须保留 `CHANGE_DEBOUNCE_MS=15000`；
- 真题 / Relax 普通记录变化必须走批量 debounce；
- `question-cloud-sync-v2.js` 不得重新出现 `location.reload` 或旧的 question-cloud reload toast；
- 必须保留 hidden-page flush。'''
new='''- 必须保留 2 分钟 dirty-queue 批处理契约、`markDirty()` 与 `flushDirty()`；
- 真题 / Relax 普通记录变化只能 `markDirty()`，不得恢复逐题 debounce 上传；
- `question-cloud-sync-v2.js` 不得重新出现 `CHANGE_DEBOUNCE_MS`、`location.reload` 或旧的 question-cloud reload toast；
- 必须保留 hidden/pagehide flush 与 `batch-interval`。'''
assert old in section, 'old audit block missing'
section=section.replace(old,new)
old='''- corrective workflow run `33538034392`：patch、`node --check`、Architecture audit、qsync3/cache-bust 检查和 `git diff --check` 全部成功；
- 主功能提交：`c99ea07569b887bc51de1fcf42be28480c6c5ee6`；
- 最终发布提交：`b54b66e00ace496469153864c55b15aaf6377a8c`；
- GitHub Pages **#223**，run `33538129182`：**success**；
- quality：Architecture audit 与账户/资源/工作台/cache 脚本检查全部成功；
- deploy：课程目录、题库资源、算法可视化 build、Verify site、privacy artifact、Pages upload、Deploy to GitHub Pages 全部成功。'''
new='''- 第一轮去刷新 corrective run `33538034392`：patch、`node --check`、Architecture audit 与 `git diff --check` 全部成功；该轮先采用 15 秒 debounce，但随后进一步收紧为真正 dirty queue；
- 最终 dirty-queue corrective run `33538684773`：`node --check`、Architecture audit、dirty queue / qsync4 / cache 检查和 `git diff --check` 全部成功；
- 最终功能提交：`6ccab52029bd11dd5efb0446fbb55a23bdedce2d`；
- 最终发布提交：`ed32397133e85609fa5d8d66c1b2bb18f7bd4b25`；
- GitHub Pages **#224**，run `33538744144`：**success**；
- quality：Architecture audit 与账户/资源/工作台/cache 脚本检查全部成功；
- deploy：课程目录、题库资源、算法可视化 build、Verify site、privacy artifact、Pages upload、Deploy to GitHub Pages 全部成功。'''
assert old in section, 'old deployment block missing'
section=section.replace(old,new)
old='''**待复测。** 重点验证：连续快速完成多道真题 / Relax1000 时页面不刷新、不跳题、不出现逐题网络等待；停止操作约 15 秒后允许后台静默批量同步；切后台或点账户页“立即同步”后云端仍能拿到最新题库记录。'''
new='''**待复测。** 重点验证：连续完成多道真题 / Relax1000 时页面不刷新、不跳题、也不会每完成一题就产生一次云请求；本地记录应立即保存；存在 dirty 数据时约每 2 分钟最多批量落云一次，切后台/离开页面或点账户页“立即同步”也能补交最新题库记录。'''
assert old in section, 'old real-device block missing'
section=section.replace(old,new)
text=text[:start]+section+text[end:]
p.write_text(text,encoding='utf-8')
