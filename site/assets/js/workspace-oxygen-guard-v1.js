(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  async function waitCloud(){for(let i=0;i<120;i++){if(window.EveraAdminCloud?.oxygen)return window.EveraAdminCloud;await new Promise(r=>setTimeout(r,80))}return null}
  function apply(status){
    const dispatch=$('[data-oxygen-dispatch]'),retry=$('[data-oxygen-retry]'),hint=$('[data-oxygen-secret]'),msg=$('[data-oxygen-message]');
    if(!dispatch||!retry)return;
    const ready=Boolean(status?.manualSyncEnabled);
    dispatch.disabled=!ready;
    retry.disabled=!ready;
    dispatch.setAttribute('aria-disabled',ready?'false':'true');
    retry.setAttribute('aria-disabled',ready?'false':'true');
    if(ready){
      dispatch.textContent='立即检查氧气11更新';
      retry.textContent='重新检查';
      dispatch.title='由 Supabase 服务端直接检查 B 站四科最新内容，不再依赖 GitHub Token';
      retry.title='重新执行一次 Supabase 原生四科同步';
      if(hint)hint.textContent='手动同步已启用：由 Supabase Edge Function 直接检查 B 站并更新云端课程目录，无需 GitHub Token。';
      if(msg&&/github_token_missing|non-2xx|未配置|手动触发暂不可用|手动同步未启用/i.test(msg.textContent||''))msg.textContent='手动同步已就绪。';
    }else{
      dispatch.textContent='手动同步暂不可用';
      retry.textContent='重新检查';
      dispatch.title='Supabase 原生同步服务暂不可用';
      retry.title='Supabase 原生同步服务暂不可用';
      if(hint)hint.textContent='当前只能读取状态，Supabase 原生同步服务暂未就绪。';
    }
  }
  async function refreshGuard(){
    const cloud=await waitCloud();if(!cloud)return;
    try{apply(await cloud.oxygen('status'))}catch(e){console.warn('oxygen guard status failed',e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshGuard,{once:true});else refreshGuard();
  document.addEventListener('click',e=>{if(e.target.closest('[data-oxygen-refresh]'))setTimeout(refreshGuard,900)});
})();