from pathlib import Path

p=Path('docs/FIX_LOG.md')
text=p.read_text(encoding='utf-8')
heading='## 2026-09-02 · 账户页间距整理与本地备份纳入完整题库记录'
if heading in text:
    raise SystemExit('entry already exists')
entry='''## 2026-09-02 · 账户页间距整理与本地备份纳入完整题库记录

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

'''
marker='---\n\n'
pos=text.find(marker)
if pos<0:
    raise SystemExit('top marker missing')
pos+=len(marker)
p.write_text(text[:pos]+entry+text[pos:],encoding='utf-8')
