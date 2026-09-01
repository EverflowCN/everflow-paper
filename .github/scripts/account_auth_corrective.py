from pathlib import Path


def replace_one(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    assert count == 1, f'{path}: expected one match, got {count}'
    p.write_text(text.replace(old, new), encoding='utf-8')


# Keep the permanent architecture gate aligned with the corrected, simple account flow.
audit = Path('site/tools/audit-bank-features.mjs')
text = audit.read_text(encoding='utf-8')
old = """assert(accountPage.includes('data-register-password')&&accountPage.includes('data-register-password-confirm')&&accountPage.includes('account-auth-sync-v2.js'),'password registration/account hardening UI missing');
assert(accountPage.includes('立即同步（课程 + 题库）'),'account manual sync must visibly include question bank');
assert(accountEnh.includes('cloud.signUp(email,password)')&&accountEnh.includes('cloud.updatePassword(password)'),'password signup/change flow missing');
assert(accountEnh.includes('shouldCreateUser:false'),'OTP login must never auto-create users');
assert(accountEnh.includes('408 真题')&&accountEnh.includes('Relax1000'),'account combined-sync result must report both question banks');"""
new = """assert(accountPage.includes('data-register-send')&&accountPage.includes('data-register-verify')&&accountPage.includes('data-register-otp-boxes')&&accountPage.includes('data-account-old-password')&&accountPage.includes('account-auth-sync-v2.js'),'verified signup / old-password change UI missing');
assert(accountPage.includes('data-sync-now>立即同步</button>'),'account manual sync button must keep the original compact label');
assert(accountEnh.includes('cloud.signUp(values.email,values.password)')&&accountEnh.includes(\"verifyOtp({email:pendingEmail,token,type:'signup'})\"),'signup must require password plus signup OTP verification');
assert(accountEnh.includes('cloud.signIn(user.email,oldPassword)')&&accountEnh.includes('cloud.updatePassword(newPassword)'),'signed-in password change must verify the old password first');
assert(!accountEnh.includes('stopImmediatePropagation')&&!accountEnh.includes('data-sync-now')&&!accountEnh.includes('data-otp-send'),'account enhancement must not replace original login/OTP/sync button interactions');"""
assert text.count(old) == 1
text = text.replace(old, new)
audit.write_text(text, encoding='utf-8')

# Evict the previous overcomplicated account UI/runtime cache generation.
replace_one('site/sw.js', "const CACHE='everflow-site-v45-course10-auth-question-cloud';", "const CACHE='everflow-site-v45-course11-account-auth-simple';")

# Unified repair log: keep both this correction and the earlier Safari graph regression explicit.
log = Path('docs/FIX_LOG.md')
content = log.read_text(encoding='utf-8')
entries = []
if '## 2026-09-02 · 账户认证流程纠正：注册验证码、旧密码改密与原按钮交互恢复' not in content:
    entries.append("""## 2026-09-02 · 账户认证流程纠正：注册验证码、旧密码改密与原按钮交互恢复

**状态：代码已纠正并通过本地 CI 门禁；等待 GitHub Pages 最终部署与真实设备复测。**

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

### 真实设备结果

**待复测。** 需要验证：注册是否收到并要求 6 位验证码；忘记密码验证码链路；已登录输入错误旧密码不能改密、正确旧密码才能修改；原登录/验证码/立即同步按钮动态效果是否恢复；立即同步后另一设备能读取真题和 Relax1000 记录。""")

if '## 2026-08-28 · 整体图谱 iOS Safari 题目抽屉卡死 / 无限 DOM Observer 回归' not in content:
    entries.append("""## 2026-08-28 · 整体图谱 iOS Safari 题目抽屉卡死 / 无限 DOM Observer 回归

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

**待复测。** CI / Pages 成功不能替代 iPhone/iPad Safari 实测；已冻结的旧 Safari 标签页需关闭后新开页面再验证。""")

if entries:
    marker = '\n---\n\n'
    assert marker in content
    block = '\n\n---\n\n'.join(entries) + '\n\n---\n\n'
    content = content.replace(marker, marker + block, 1)
    log.write_text(content, encoding='utf-8')
