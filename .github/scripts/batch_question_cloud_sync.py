from pathlib import Path


def replace_one(path, old, new):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, got {count}: {old[:80]!r}')
    p.write_text(text.replace(old,new),encoding='utf-8')

q='site/assets/js/question-cloud-sync-v2.js'
p=Path(q)
text=p.read_text(encoding='utf-8')

text=text.replace(
    "let syncPromise=null,scheduleTimer=0,applying=false,patched=false;",
    "const CHANGE_DEBOUNCE_MS=15000;\nconst CROSS_TAB_DEBOUNCE_MS=5000;\nlet syncPromise=null,scheduleTimer=0,applying=false,patched=false;"
)

old="if(pulledRemote&&pageNeedsReload()&&!manual){sessionStorage.setItem('everflow-408-question-cloud-toast',accountChanged?'已切换到当前账户的云端题库进度。':'已载入云端最新题库进度。');setTimeout(()=>location.reload(),140)}return result}"
new="if(pulledRemote&&!manual){document.dispatchEvent(new CustomEvent('everflow:question-cloud-merged',{detail:{accountChanged,reason}}))}return result}"
if old not in text:
    raise SystemExit('reload branch not found')
text=text.replace(old,new)

old="function schedule(delay=700,reason='change'){clearTimeout(scheduleTimer);scheduleTimer=setTimeout(()=>syncAll({reason}).catch(()=>{}),delay)}"
new="function schedule(delay=CHANGE_DEBOUNCE_MS,reason='change'){clearTimeout(scheduleTimer);scheduleTimer=setTimeout(()=>syncAll({reason}).catch(()=>{}),delay)}"
if old not in text:
    raise SystemExit('schedule function not found')
text=text.replace(old,new)

old="document.addEventListener('everflow:zhenti-records-change',()=>{if(!applying)schedule(500,'zhenti-change')});"
new="document.addEventListener('everflow:zhenti-records-change',()=>{if(!applying)schedule(CHANGE_DEBOUNCE_MS,'zhenti-change')});"
if old not in text:
    raise SystemExit('zhenti listener not found')
text=text.replace(old,new)

old="if(event.detail?.reset)writeText(RELAX_RESET_KEY,nowIso());schedule(500,'relax-change')});"
new="if(event.detail?.reset)writeText(RELAX_RESET_KEY,nowIso());schedule(CHANGE_DEBOUNCE_MS,'relax-change')});"
if old not in text:
    raise SystemExit('relax listener not found')
text=text.replace(old,new)

old="document.addEventListener('everflow:zhenti-reset-all',()=>schedule(0,'zhenti-reset'));\naddEventListener('online',()=>schedule(250,'online'));\ndocument.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(500,'visible')});\naddEventListener('storage',event=>{if([...Object.values(ZHENTI_KEYS),...Object.values(RELAX_KEYS),RELAX_RESET_KEY,RELAX_CLOCK_KEY].includes(event.key))schedule(600,'cross-tab')});"
new="document.addEventListener('everflow:zhenti-reset-all',()=>schedule(1200,'zhenti-reset'));\naddEventListener('online',()=>schedule(3000,'online'));\ndocument.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')schedule(0,'hidden-flush')});\naddEventListener('pagehide',()=>schedule(0,'pagehide-flush'));\naddEventListener('storage',event=>{if([...Object.values(ZHENTI_KEYS),...Object.values(RELAX_KEYS),RELAX_RESET_KEY,RELAX_CLOCK_KEY].includes(event.key))schedule(CROSS_TAB_DEBOUNCE_MS,'cross-tab')});"
if old not in text:
    raise SystemExit('lifecycle listeners not found')
text=text.replace(old,new)

old="const reloadToast=sessionStorage.getItem('everflow-408-question-cloud-toast');if(reloadToast){sessionStorage.removeItem('everflow-408-question-cloud-toast');setTimeout(()=>window.EveraUI?.toast?.(reloadToast,{type:'success',title:'题库云同步',duration:3200}),450)}\nsetTimeout(()=>syncAll({reason:'boot'}).catch(()=>{}),350);"
new="setTimeout(()=>syncAll({reason:'boot'}).catch(()=>{}),1500);"
if old not in text:
    raise SystemExit('boot/reload toast block not found')
text=text.replace(old,new)

# pageNeedsReload is no longer part of sync policy.
text=text.replace("function pageNeedsReload(){return ['zhenti','graph','relax-reader'].includes(document.body?.dataset?.view||'')}\n","")

p.write_text(text,encoding='utf-8')

# Force fresh module URLs on every entry that can boot question sync.
for path in [
    'site/assets/js/zhenti-entry.js',
    'site/assets/js/question-choice-qwer.js',
    'site/assets/js/account-auth-sync-v2.js',
    'site/zhenti/index.html',
    'site/zhenti/relax-reader/index.html',
    'site/graph/index.html',
]:
    p=Path(path); s=p.read_text(encoding='utf-8')
    if '20260902-qsync2' in s:
        s=s.replace('20260902-qsync2','20260902-qsync3')
    p.write_text(s,encoding='utf-8')

# Account page must fetch the updated account-auth wrapper too.
p=Path('site/account/index.html'); s=p.read_text(encoding='utf-8')
s=s.replace('account-auth-sync-v2.js?v=20260902-auth3','account-auth-sync-v2.js?v=20260902-auth4')
p.write_text(s,encoding='utf-8')

# Cache generation bump.
p=Path('site/sw.js'); s=p.read_text(encoding='utf-8')
s=s.replace('everflow-site-v45-course12-account-backup-spacing','everflow-site-v45-course13-qsync-batched')
p.write_text(s,encoding='utf-8')

# Permanent architecture guard.
p=Path('site/tools/audit-bank-features.mjs'); s=p.read_text(encoding='utf-8')
needle="assert(questionCloud.includes('everflow:zhenti-records-change')&&questionCloud.includes('everflow:relax-records-change'),'question auto-sync event hooks missing');"
insert=needle+"\nassert(questionCloud.includes('CHANGE_DEBOUNCE_MS=15000')&&questionCloud.includes(\"schedule(CHANGE_DEBOUNCE_MS,'zhenti-change')\")&&questionCloud.includes(\"schedule(CHANGE_DEBOUNCE_MS,'relax-change')\"),'question cloud writes must stay batched instead of per-answer');\nassert(!questionCloud.includes('location.reload')&&!questionCloud.includes('question-cloud-toast'),'question cloud sync must never force-refresh active question pages');\nassert(questionCloud.includes(\"visibilityState==='hidden'\")&&questionCloud.includes('hidden-flush'),'question cloud hidden-page flush missing');"
if needle not in s:
    raise SystemExit('audit insertion point not found')
s=s.replace(needle,insert)
p.write_text(s,encoding='utf-8')
