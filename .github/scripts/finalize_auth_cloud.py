from pathlib import Path


def replace_one(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    assert count == 1, f'{path}: expected one match, got {count}: {old[:100]}'
    p.write_text(text.replace(old, new), encoding='utf-8')


def insert_before_line(path: str, target: str, additions: list[str]) -> None:
    p = Path(path)
    lines = p.read_text(encoding='utf-8').splitlines()
    matches = [i for i, line in enumerate(lines) if line == target]
    assert len(matches) == 1, f'{path}: expected one line {target!r}, got {len(matches)}'
    i = matches[0]
    lines[i:i] = additions
    p.write_text('\n'.join(lines) + '\n', encoding='utf-8')


# 1. Underlying OTP API is login-only. Even if UI interception regresses, OTP cannot create a new user.
replace_one('site/assets/js/cloud.js', 'shouldCreateUser:true', 'shouldCreateUser:false')

# 2. Force a fresh question-cloud boot instead of stale cached entry/QWER files.
replace_one('site/zhenti/index.html', 'zhenti-entry.js?v=20260828-relaxfix1', 'zhenti-entry.js?v=20260902-qsync2')
replace_one('site/zhenti/relax-reader/index.html', 'question-choice-qwer.js?v=20260828-qwer-strong1', 'question-choice-qwer.js?v=20260902-qsync2')
replace_one('site/graph/index.html', 'question-choice-qwer.js?v=20260828-qwer-strong1', 'question-choice-qwer.js?v=20260902-qsync2')

# 3. New SW generation; explicitly precache auth/question sync modules.
replace_one('site/sw.js', "const CACHE='everflow-site-v45-course9-qwer-strong-status';", "const CACHE='everflow-site-v45-course10-auth-question-cloud';")
replace_one('site/sw.js', "'/assets/js/cloud-config.js',", "'/assets/js/cloud-config.js','/assets/js/question-cloud-sync-v2.js','/assets/js/account-auth-sync-v2.js',")

# 4. Permanent bank architecture checks.
audit = Path('site/tools/audit-bank-features.mjs')
text = audit.read_text(encoding='utf-8')
old = "  qwer:'site/assets/js/question-choice-qwer.js',qwerCss:'site/assets/css/question-choice-qwer.css',relaxWallStrongCss:'site/assets/css/relax1000-wall-strong.css',"
new = "  qwer:'site/assets/js/question-choice-qwer.js',qwerCss:'site/assets/css/question-choice-qwer.css',accountPage:'site/account/index.html',accountEnh:'site/assets/js/account-auth-sync-v2.js',questionCloud:'site/assets/js/question-cloud-sync-v2.js',relaxWallStrongCss:'site/assets/css/relax1000-wall-strong.css',"
assert text.count(old) == 1
text = text.replace(old, new)
old = 'qwer,qwerCss,relaxWallStrongCss,'
new = 'qwer,qwerCss,accountPage,accountEnh,questionCloud,relaxWallStrongCss,'
assert text.count(old) == 1
text = text.replace(old, new)
anchor = "assert(!qwer.includes('MutationObserver'),'QWER compatibility layer must not observe/rewrite question DOM');"
insert = """assert(!qwer.includes('MutationObserver'),'QWER compatibility layer must not observe/rewrite question DOM');
assert(entry.includes('question-cloud-sync-v2.js'),'bank entry question-cloud boot missing');
assert(qwer.includes('question-cloud-sync-v2.js'),'reader/graph question-cloud boot missing');
assert(accountPage.includes('data-register-password')&&accountPage.includes('data-register-password-confirm')&&accountPage.includes('account-auth-sync-v2.js'),'password registration/account hardening UI missing');
assert(accountPage.includes('立即同步（课程 + 题库）'),'account manual sync must visibly include question bank');
assert(accountEnh.includes('cloud.signUp(email,password)')&&accountEnh.includes('cloud.updatePassword(password)'),'password signup/change flow missing');
assert(accountEnh.includes('shouldCreateUser:false'),'OTP login must never auto-create users');
assert(accountEnh.includes('408 真题')&&accountEnh.includes('Relax1000'),'account combined-sync result must report both question banks');
assert(questionCloud.includes(\"const TABLE='zhenti_sync_states'\")&&questionCloud.includes(\"const TRUE_SCOPE='snapshot:v1'\")&&questionCloud.includes(\"const RELAX_SCOPE='relax1000:v2'\"),'question cloud scopes/table contract missing');
assert(questionCloud.includes('everflow:zhenti-records-change')&&questionCloud.includes('everflow:relax-records-change'),'question auto-sync event hooks missing');
assert(questionCloud.includes('LAST_USER_KEY')&&questionCloud.includes('accountChanged'),'question cloud account-isolation guard missing');
assert(questionCloud.includes('cloud.syncAll=async function combinedSync'),'account syncAll question-bank upgrade missing');"""
assert text.count(anchor) == 1
text = text.replace(anchor, insert)
old = 'files.graphAnswer,files.qwer,files.trueGraph'
new = 'files.graphAnswer,files.qwer,files.accountEnh,files.questionCloud,files.trueGraph'
assert text.count(old) == 1
text = text.replace(old, new)
audit.write_text(text, encoding='utf-8')

# 5. Make the main Pages pipeline syntax-check and verify both new modules.
deploy = Path('.github/workflows/deploy-pages-v2.yml')
lines = deploy.read_text(encoding='utf-8').splitlines()
target = '            site/assets/js/cloud.js \\'
assert lines.count(target) == 1, f'cloud.js validation line missing: {lines.count(target)}'
i = lines.index(target) + 1
lines[i:i] = [
    '            site/assets/js/account-auth-sync-v2.js \\',
    '            site/assets/js/question-cloud-sync-v2.js \\',
]
target = '          test -s site/assets/js/graph-app.js'
assert lines.count(target) == 1
i = lines.index(target)
lines[i:i] = [
    '          test -s site/assets/js/account-auth-sync-v2.js',
    '          test -s site/assets/js/question-cloud-sync-v2.js',
]
# Privacy-safe artifact verification has a separate graph-answer check later.
target = '          test -s site/assets/js/graph-answer-enhancements.js'
indices = [i for i, line in enumerate(lines) if line == target]
assert len(indices) >= 1
# Insert only after the final occurrence to avoid duplicate tests in Verify site.
i = indices[-1] + 1
lines[i:i] = [
    '          test -s site/assets/js/account-auth-sync-v2.js',
    '          test -s site/assets/js/question-cloud-sync-v2.js',
]
text = '\n'.join(lines) + '\n'
text = text.replace("echo '{\"build\":\"20260828-reader5-graph-answer1\"}' > site/build.json", "echo '{\"build\":\"20260902-auth-question-cloud1\"}' > site/build.json")
deploy.write_text(text, encoding='utf-8')

# Never publish the superseded draft.
Path('site/assets/js/question-cloud-sync-v1.js').unlink(missing_ok=True)
