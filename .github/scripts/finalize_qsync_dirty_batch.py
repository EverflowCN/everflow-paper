from pathlib import Path

q=Path('site/assets/js/question-cloud-sync-v2.js')
s=q.read_text(encoding='utf-8')

old="const CHANGE_DEBOUNCE_MS=15000;\nconst CROSS_TAB_DEBOUNCE_MS=5000;\nlet syncPromise=null,scheduleTimer=0,applying=false,patched=false;"
new="const PERIODIC_FLUSH_MS=2*60*1000;\nlet syncPromise=null,flushTimer=0,applying=false,patched=false,dirtySeq=0,syncedSeq=0;"
if old not in s: raise SystemExit('state constants block missing')
s=s.replace(old,new)

old="async function syncAll(options={}){if(syncPromise)return syncPromise;syncPromise=runSync(options).catch(error=>{console.error('Everflow question cloud sync failed',error);document.dispatchEvent(new CustomEvent('everflow:question-cloud-error',{detail:{message:error?.message||String(error)}}));throw error}).finally(()=>{syncPromise=null});return syncPromise}\nfunction schedule(delay=CHANGE_DEBOUNCE_MS,reason='change'){clearTimeout(scheduleTimer);scheduleTimer=setTimeout(()=>syncAll({reason}).catch(()=>{}),delay)}"
new="async function syncAll(options={}){if(syncPromise)return syncPromise;const targetSeq=dirtySeq;syncPromise=runSync(options).then(result=>{if(result?.ok)syncedSeq=Math.max(syncedSeq,targetSeq);return result}).catch(error=>{console.error('Everflow question cloud sync failed',error);document.dispatchEvent(new CustomEvent('everflow:question-cloud-error',{detail:{message:error?.message||String(error)}}));throw error}).finally(()=>{syncPromise=null});return syncPromise}\nfunction markDirty(){dirtySeq+=1}\nfunction hasDirty(){return dirtySeq>syncedSeq}\nasync function flushDirty(reason='batch'){if(!hasDirty())return{ok:true,skipped:true,reason};return syncAll({reason})}\nfunction scheduleFlush(delay=0,reason='batch'){clearTimeout(flushTimer);flushTimer=setTimeout(()=>flushDirty(reason).catch(()=>{}),delay)}"
if old not in s: raise SystemExit('sync/schedule block missing')
s=s.replace(old,new)

old="document.addEventListener('everflow:zhenti-records-change',()=>{if(!applying)schedule(CHANGE_DEBOUNCE_MS,'zhenti-change')});\ndocument.addEventListener('everflow:relax-records-change',event=>{if(applying)return;const id=idKey(event.detail?.id);if(id){const clocks=object(readJson(RELAX_CLOCK_KEY,{}));clocks[id]=nowIso();writeJson(RELAX_CLOCK_KEY,clocks)}if(event.detail?.reset)writeText(RELAX_RESET_KEY,nowIso());schedule(CHANGE_DEBOUNCE_MS,'relax-change')});\ndocument.addEventListener('everflow:zhenti-reset-all',()=>schedule(1200,'zhenti-reset'));\naddEventListener('online',()=>schedule(3000,'online'));\ndocument.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')schedule(0,'hidden-flush')});\naddEventListener('pagehide',()=>schedule(0,'pagehide-flush'));\naddEventListener('storage',event=>{if([...Object.values(ZHENTI_KEYS),...Object.values(RELAX_KEYS),RELAX_RESET_KEY,RELAX_CLOCK_KEY].includes(event.key))schedule(CROSS_TAB_DEBOUNCE_MS,'cross-tab')});\nsetInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)syncAll({reason:'interval'}).catch(()=>{})},5*60*1000);\nsetTimeout(()=>syncAll({reason:'boot'}).catch(()=>{}),1500);"
new="document.addEventListener('everflow:zhenti-records-change',()=>{if(!applying)markDirty()});\ndocument.addEventListener('everflow:relax-records-change',event=>{if(applying)return;const id=idKey(event.detail?.id);if(id){const clocks=object(readJson(RELAX_CLOCK_KEY,{}));clocks[id]=nowIso();writeJson(RELAX_CLOCK_KEY,clocks)}if(event.detail?.reset)writeText(RELAX_RESET_KEY,nowIso());markDirty()});\ndocument.addEventListener('everflow:zhenti-reset-all',()=>markDirty());\naddEventListener('online',()=>{if(hasDirty())scheduleFlush(3000,'online-flush');else setTimeout(()=>syncAll({reason:'online-pull'}).catch(()=>{}),3000)});\ndocument.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&hasDirty())scheduleFlush(0,'hidden-flush')});\naddEventListener('pagehide',()=>{if(hasDirty())flushDirty('pagehide-flush').catch(()=>{})});\naddEventListener('storage',event=>{if([...Object.values(ZHENTI_KEYS),...Object.values(RELAX_KEYS),RELAX_RESET_KEY,RELAX_CLOCK_KEY].includes(event.key))markDirty()});\nsetInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false&&hasDirty())flushDirty('batch-interval').catch(()=>{})},PERIODIC_FLUSH_MS);\nsetTimeout(()=>syncAll({reason:'boot'}).catch(()=>{}),1500);"
if old not in s: raise SystemExit('event lifecycle block missing')
s=s.replace(old,new)

old="window.EveraQuestionCloud={enabled,syncAll,trueSnapshot,relaxSnapshot};"
new="window.EveraQuestionCloud={enabled,syncAll,flushDirty,trueSnapshot,relaxSnapshot};"
if old not in s: raise SystemExit('public cloud object missing')
s=s.replace(old,new)
q.write_text(s,encoding='utf-8')

# qsync4 cache-bust on all loaders.
for path in [
    'site/assets/js/zhenti-entry.js',
    'site/assets/js/question-choice-qwer.js',
    'site/assets/js/account-auth-sync-v2.js',
    'site/zhenti/index.html',
    'site/zhenti/relax-reader/index.html',
    'site/graph/index.html',
]:
    p=Path(path); t=p.read_text(encoding='utf-8')
    t=t.replace('20260902-qsync3','20260902-qsync4')
    p.write_text(t,encoding='utf-8')

p=Path('site/account/index.html'); t=p.read_text(encoding='utf-8')
t=t.replace('account-auth-sync-v2.js?v=20260902-auth4','account-auth-sync-v2.js?v=20260902-auth5')
p.write_text(t,encoding='utf-8')

p=Path('site/sw.js'); t=p.read_text(encoding='utf-8')
t=t.replace('everflow-site-v45-course13-qsync-batched-release','everflow-site-v45-course14-qsync-dirty-batch')
p.write_text(t,encoding='utf-8')

# Replace the previous temporary 15-second guard with final dirty-queue architecture guard.
p=Path('site/tools/audit-bank-features.mjs'); t=p.read_text(encoding='utf-8')
old="assert(questionCloud.includes('CHANGE_DEBOUNCE_MS=15000')&&questionCloud.includes(\"schedule(CHANGE_DEBOUNCE_MS,'zhenti-change')\")&&questionCloud.includes(\"schedule(CHANGE_DEBOUNCE_MS,'relax-change')\"),'question cloud writes must stay batched instead of per-answer');\nassert(!questionCloud.includes('location.reload')&&!questionCloud.includes('question-cloud-toast'),'question cloud sync must never force-refresh active question pages');\nassert(questionCloud.includes(\"visibilityState==='hidden'\")&&questionCloud.includes('hidden-flush'),'question cloud hidden-page flush missing');"
new="assert(questionCloud.includes('PERIODIC_FLUSH_MS=2*60*1000')&&questionCloud.includes('dirtySeq=0')&&questionCloud.includes('function markDirty()')&&questionCloud.includes('function flushDirty('),'question cloud dirty-queue batching contract missing');\nassert(questionCloud.includes(\"everflow:zhenti-records-change',()=>{if(!applying)markDirty()\")&&questionCloud.includes('everflow:relax-records-change')&&questionCloud.includes('markDirty()'),'question answer changes must only mark dirty, never upload per answer');\nassert(!questionCloud.includes('CHANGE_DEBOUNCE_MS')&&!questionCloud.includes('location.reload')&&!questionCloud.includes('question-cloud-toast'),'question cloud must not restore per-answer debounce or forced refresh');\nassert(questionCloud.includes(\"visibilityState==='hidden'\")&&questionCloud.includes('hidden-flush')&&questionCloud.includes('batch-interval'),'question cloud background/periodic batch flush missing');"
if old not in t: raise SystemExit('old qsync audit guard missing')
t=t.replace(old,new)
p.write_text(t,encoding='utf-8')
