import './cloud.js';

(()=>{
  const $=s=>document.querySelector(s);
  const ui=()=>window.EveraUI||{};
  const msg=(text,bad=false)=>{const el=$('[data-account-message]');if(el){el.textContent=text;el.style.color=bad?'var(--red)':'var(--muted)'}};
  const planLabel=p=>p==='pro'?'Pro':p==='member'?'普通会员':'普通用户';
  const friendlyError=e=>{
    const raw=String(e?.message||e||'操作失败');
    if(/invalid login credentials/i.test(raw))return '邮箱或密码错误，请检查后重试。';
    if(/email not confirmed/i.test(raw))return '邮箱还没有完成验证，请先打开验证邮件。';
    if(/user already registered/i.test(raw))return '这个邮箱已经注册，可以直接登录。';
    if(/rate limit|too many requests/i.test(raw))return '请求过于频繁，请稍后再试。';
    if(/network|fetch/i.test(raw))return '网络连接异常，本机数据仍然安全。';
    return raw;
  };
  function feedback(selector,title,text,type='info'){
    const el=$(selector);if(!el)return;
    el.className=`auth-feedback show ${type}`;
    el.innerHTML='';const strong=document.createElement('strong');strong.textContent=title;const span=document.createElement('span');span.textContent=text;el.append(strong,span);
  }
  function clearFeedback(selector){const el=$(selector);if(el){el.className='auth-feedback';el.textContent=''}}

  async function renderMembership(user){
    const plan=$('[data-account-membership]'),detail=$('[data-account-membership-detail]');
    if(!plan||!detail)return;
    if(!user){plan.textContent='普通用户';detail.textContent='登录后可查看会员状态';return}
    try{
      const status=await EveraCloud.membership('status');
      plan.textContent=planLabel(status.plan);
      const expiry=status.membership?.effective_expires_at;
      detail.textContent=status.active?(expiry?`有效至 ${new Date(expiry).toLocaleString('zh-CN',{hour12:false})}`:'当前有效'):'当前无有效会员';
      try{localStorage.setItem('everflow-membership-cache-v1',JSON.stringify({plan:status.plan,active:status.active,at:new Date().toISOString()}))}catch{}
      if(status.active){localStorage.setItem('everflow-membership-nav-hidden-v1','1');document.dispatchEvent(new CustomEvent('everflow:membership-change',{detail:{active:true,plan:status.plan}}))}
    }catch{plan.textContent='普通用户';detail.textContent='会员状态暂时无法读取'}
  }

  async function renderAuth(){
    await EveraCloud.ready;
    const user=await EveraCloud.getUser();
    const status=$('[data-cloud-status]'),auth=$('[data-auth-state]'),guest=$('[data-auth-guest]'),signed=$('[data-auth-signed]'),setup=$('[data-cloud-setup]');
    if(status)status.textContent=EveraCloud.enabled?(navigator.onLine?'云端已配置 · 在线':'云端已配置 · 当前离线'):'本地模式 · 云端待配置';
    if(setup)setup.hidden=EveraCloud.enabled;if(guest)guest.hidden=Boolean(user);if(signed)signed.hidden=!user;
    if(auth)auth.textContent=user?`已登录 · ${user.email||user.id}`:'未登录 · 数据仅保存在本机';
    const email=$('[data-user-email]');if(email)email.textContent=user?.email||'';
    const role=$('[data-user-role]');if(role)role.textContent=user?.app_metadata?.role==='owner'?'Owner':'User';
    const sync=$('[data-last-sync]');if(sync){try{const x=JSON.parse(localStorage.getItem('everflow-last-cloud-sync')||'null');sync.textContent=x?.at?new Date(x.at).toLocaleString('zh-CN',{hour12:false}):'尚未同步'}catch{sync.textContent='尚未同步'}}
    await renderMembership(user);
  }

  function saveCloudConfig(){
    const url=$('[data-cloud-url]')?.value.trim().replace(/\/$/,'')||'',publishableKey=$('[data-cloud-key]')?.value.trim()||'';
    if(!/^https:\/\//i.test(url)){msg('Project URL 必须是 https:// 地址。',true);return}
    if(publishableKey.length<20){msg('Publishable / anon key 看起来不完整。',true);return}
    localStorage.setItem('everflow-cloud-public-config',JSON.stringify({url,publishableKey}));ui().toast?.('云端公开配置已保存，页面即将重新载入。',{type:'success',title:'保存成功'});setTimeout(()=>location.reload(),450);
  }
  function clearCloudConfig(){localStorage.removeItem('everflow-cloud-public-config');localStorage.removeItem('everflow-last-cloud-sync');ui().toast?.('测试配置已清除。',{type:'success'});setTimeout(()=>location.reload(),400)}

  async function authAction(type,btn){
    const email=$('[data-auth-email]')?.value.trim(),password=$('[data-auth-password]')?.value||'';
    clearFeedback('[data-auth-feedback]');
    if(!EveraCloud.enabled){feedback('[data-auth-feedback]','云端未连接','本地课程打卡仍可继续使用。','error');return}
    if(!email){feedback('[data-auth-feedback]','需要邮箱','请先填写邮箱地址。','error');return}
    try{
      if(type==='login'){
        if(!password){feedback('[data-auth-feedback]','需要密码','请填写密码后再登录。','error');return}
        ui().setBusy?.(btn,true,'登录中…');
        const {error}=await EveraCloud.signIn(email,password);if(error)throw error;
        ui().toast?.(`已登录 ${email}`,{type:'success',title:'登录成功'});
        const r=await EveraCloud.syncAll().catch(()=>({ok:false,reason:'background'}));
        feedback('[data-auth-feedback-signed]','登录成功',r.ok?'本机与云端数据已经合并完成。':'已登录，数据正在后台同步。','success');
      }else if(type==='signup'){
        if(password.length<6){feedback('[data-auth-feedback]','密码太短','密码至少需要 6 位。','error');return}
        ui().setBusy?.(btn,true,'注册中…');
        const {data,error}=await EveraCloud.signUp(email,password);if(error)throw error;
        if(data?.session){
          feedback('[data-auth-feedback]','注册成功','账号已创建并登录，正在同步本机数据。','success');ui().toast?.('账号已创建并登录。',{type:'success',title:'注册成功'});await EveraCloud.syncAll().catch(()=>{});
        }else{
          feedback('[data-auth-feedback]','验证邮件已发送',`请打开 ${email} 的邮件，完成邮箱验证后再回来登录。`,'success');ui().toast?.(`请前往 ${email} 完成邮箱验证。`,{type:'success',title:'注册成功 · 待验证',duration:5200});
        }
      }else if(type==='otp'){
        ui().setBusy?.(btn,true,'发送中…');
        const {error}=await EveraCloud.signInOtp(email);if(error)throw error;
        feedback('[data-auth-feedback]','邮件已发送',`验证码 / 登录链接已发送到 ${email}，请查看收件箱和垃圾邮件。`,'success');ui().toast?.('验证码 / 登录链接已经发送。',{type:'success',title:'发送成功'});
      }
      await renderAuth();
    }catch(e){const text=friendlyError(e);feedback('[data-auth-feedback]','操作没有完成',text,'error');ui().toast?.(text,{type:'error',title:type==='login'?'登录失败':type==='signup'?'注册失败':'发送失败',duration:4800})}
    finally{ui().setBusy?.(btn,false)}
  }

  async function exportData(btn){
    ui().setBusy?.(btn,true,'导出中…');
    try{const data=await EveraStore.exportAll();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`everflow-study-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);msg('本地备份已导出。');ui().toast?.('JSON 备份已生成。',{type:'success',title:'导出成功'})}finally{ui().setBusy?.(btn,false)}
  }
  async function importData(file){
    try{const payload=JSON.parse(await file.text());await EveraStore.importAll(payload);msg('备份已合并到本机；登录后会继续同步到云端。');ui().toast?.('备份已经按更新时间合并。',{type:'success',title:'导入成功'});await EveraCloud.syncAll().catch(()=>{});renderAuth()}catch(e){const text=friendlyError(e);msg(text,true);ui().toast?.(text,{type:'error',title:'导入失败'})}
  }

  $('[data-cloud-save]')?.addEventListener('click',saveCloudConfig);$('[data-cloud-clear]')?.addEventListener('click',clearCloudConfig);
  $('[data-login]')?.addEventListener('click',e=>authAction('login',e.currentTarget));$('[data-signup]')?.addEventListener('click',e=>authAction('signup',e.currentTarget));$('[data-otp]')?.addEventListener('click',e=>authAction('otp',e.currentTarget));
  $('[data-logout]')?.addEventListener('click',async e=>{ui().setBusy?.(e.currentTarget,true,'退出中…');await EveraCloud.signOut();ui().setBusy?.(e.currentTarget,false);feedback('[data-auth-feedback]','已退出登录','当前设备上的本地数据仍会保留。','info');ui().toast?.('本机数据仍然保留。',{type:'success',title:'已退出'});renderAuth()});
  $('[data-sync-now]')?.addEventListener('click',async e=>{const btn=e.currentTarget;ui().setBusy?.(btn,true,'同步中…');try{const r=await EveraCloud.syncAll();if(r.ok){feedback('[data-auth-feedback-signed]','同步完成',`已同步 ${r.courses} 条课程状态。`,'success');ui().complete?.(btn,'同步完成 ✓');ui().toast?.('本机与云端数据已合并。',{type:'success',title:'同步完成'})}else if(r.reason==='busy'){feedback('[data-auth-feedback-signed]','正在同步','后台同步任务已经在运行。','info');ui().setBusy?.(btn,false)}else{throw new Error(r.reason||'同步未完成')}}catch(e){const text=friendlyError(e);feedback('[data-auth-feedback-signed]','同步失败',`${text} 本机数据仍然安全。`,'error');ui().toast?.(`${text} 本机数据仍然安全。`,{type:'error',title:'同步失败'});ui().setBusy?.(btn,false)}});
  $('[data-export]')?.addEventListener('click',e=>exportData(e.currentTarget));$('[data-import-file]')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importData(f)});
  document.addEventListener('everflow:auth-change',renderAuth);document.addEventListener('everflow:cloud-sync',renderAuth);document.addEventListener('everflow:membership-change',renderAuth);
  document.addEventListener('everflow:cloud-recovery',e=>{const text=e.detail?.message||'已安全切换账号数据空间。';feedback('[data-auth-feedback-signed]','账号数据已隔离',text,'success');ui().toast?.(text,{type:'success',title:'账号切换完成',duration:5200})});
  document.addEventListener('everflow:cloud-error',e=>{const text=friendlyError(e.detail?.message||'请稍后重试');msg(`云同步失败，本机数据仍安全：${text}`,true)});
  addEventListener('online',renderAuth);addEventListener('offline',renderAuth);Promise.resolve(window.EveraStore?.init()).then(renderAuth).catch(console.error);
})();
