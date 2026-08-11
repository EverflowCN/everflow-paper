import './cloud.js';

(()=>{
  const $=s=>document.querySelector(s);
  const msg=(text,bad=false)=>{const el=$('[data-account-message]');if(el){el.textContent=text;el.style.color=bad?'var(--red)':'var(--muted)'}};
  const planLabel=p=>p==='pro'?'Pro':p==='member'?'普通会员':'普通用户';

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
      if(status.active){localStorage.setItem('everflow-membership-nav-hidden-v1','1');document.dispatchEvent(new CustomEvent('everflow:membership-change',{detail:{active:true,plan:status.plan}}));}
    }catch{plan.textContent='普通用户';detail.textContent='会员状态暂时无法读取'}
  }

  async function renderAuth(){
    await EveraCloud.ready;
    const user=await EveraCloud.getUser();
    const status=$('[data-cloud-status]'),auth=$('[data-auth-state]'),guest=$('[data-auth-guest]'),signed=$('[data-auth-signed]'),setup=$('[data-cloud-setup]');
    if(status)status.textContent=EveraCloud.enabled?(navigator.onLine?'云端已配置 · 在线':'云端已配置 · 当前离线'):'本地模式 · 云端待配置';
    if(setup)setup.hidden=EveraCloud.enabled;
    if(guest)guest.hidden=Boolean(user);if(signed)signed.hidden=!user;
    if(auth)auth.textContent=user?`已登录 · ${user.email||user.id}`:'未登录 · 数据仅保存在本机';
    const email=$('[data-user-email]');if(email)email.textContent=user?.email||'';
    const role=$('[data-user-role]');if(role)role.textContent=user?.app_metadata?.role==='owner'?'Owner':'User';
    const sync=$('[data-last-sync]');if(sync){try{const x=JSON.parse(localStorage.getItem('everflow-last-cloud-sync')||'null');sync.textContent=x?.at?new Date(x.at).toLocaleString('zh-CN',{hour12:false}):'尚未同步'}catch{sync.textContent='尚未同步'}}
    await renderMembership(user);
  }

  function saveCloudConfig(){
    const url=$('[data-cloud-url]')?.value.trim().replace(/\/$/,'')||'';
    const publishableKey=$('[data-cloud-key]')?.value.trim()||'';
    if(!/^https:\/\//i.test(url)){msg('Project URL 必须是 https:// 地址。',true);return}
    if(publishableKey.length<20){msg('Publishable / anon key 看起来不完整。',true);return}
    localStorage.setItem('everflow-cloud-public-config',JSON.stringify({url,publishableKey}));
    msg('已保存公开云配置，正在重新载入…');
    setTimeout(()=>location.reload(),250);
  }

  function clearCloudConfig(){
    localStorage.removeItem('everflow-cloud-public-config');
    localStorage.removeItem('everflow-last-cloud-sync');
    msg('已清除本机测试云配置，正在重新载入…');
    setTimeout(()=>location.reload(),250);
  }

  async function authAction(type){
    const email=$('[data-auth-email]')?.value.trim(),password=$('[data-auth-password]')?.value||'';
    if(!EveraCloud.enabled){msg('请先连接 Supabase；本地学习功能仍可继续使用。',true);return}
    if(!email){msg('请填写邮箱。',true);return}
    try{
      if(type==='login'){
        if(!password){msg('请填写密码。',true);return}
        const {error}=await EveraCloud.signIn(email,password);if(error)throw error;msg('登录成功，正在合并本地与云端数据…');await EveraCloud.syncAll();
      }else if(type==='signup'){
        if(password.length<6){msg('密码至少 6 位。',true);return}
        const {error}=await EveraCloud.signUp(email,password);if(error)throw error;msg('注册请求已提交；如果项目开启邮箱确认，请先查看邮箱。');
      }else if(type==='otp'){
        const {error}=await EveraCloud.signInOtp(email);if(error)throw error;msg('登录链接 / 验证码已发送到邮箱。');
      }
      renderAuth();
    }catch(e){msg(e.message||String(e),true)}
  }

  async function exportData(){
    const data=await EveraStore.exportAll();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`everflow-study-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    msg('本地备份已导出。');
  }

  async function importData(file){
    try{const payload=JSON.parse(await file.text());await EveraStore.importAll(payload);msg('备份已合并到本机；登录后会继续同步到云端。');await EveraCloud.syncAll().catch(()=>{});renderAuth()}catch(e){msg(e.message||'导入失败',true)}
  }

  $('[data-cloud-save]')?.addEventListener('click',saveCloudConfig);
  $('[data-cloud-clear]')?.addEventListener('click',clearCloudConfig);
  $('[data-login]')?.addEventListener('click',()=>authAction('login'));
  $('[data-signup]')?.addEventListener('click',()=>authAction('signup'));
  $('[data-otp]')?.addEventListener('click',()=>authAction('otp'));
  $('[data-logout]')?.addEventListener('click',async()=>{await EveraCloud.signOut();msg('已退出登录，本地数据仍保留。');renderAuth()});
  $('[data-sync-now]')?.addEventListener('click',async()=>{try{msg('正在同步…');const r=await EveraCloud.syncAll();msg(r.ok?'同步完成。':r.reason==='guest'?'请先登录。':r.reason==='busy'?'同步正在进行。':'云端尚未配置。')}catch(e){msg(e.message||String(e),true)}renderAuth()});
  $('[data-export]')?.addEventListener('click',exportData);
  $('[data-import-file]')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importData(f)});
  document.addEventListener('everflow:auth-change',renderAuth);
  document.addEventListener('everflow:cloud-sync',renderAuth);
  document.addEventListener('everflow:membership-change',renderAuth);
  document.addEventListener('everflow:cloud-error',e=>msg(`云同步失败，本机数据仍安全：${e.detail?.message||'请稍后重试'}`,true));
  addEventListener('online',renderAuth);addEventListener('offline',renderAuth);
  Promise.resolve(window.EveraStore?.init()).then(renderAuth).catch(console.error);
})();
