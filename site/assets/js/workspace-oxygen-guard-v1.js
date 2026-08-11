(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  async function waitCloud(){for(let i=0;i<120;i++){if(window.EveraAdminCloud?.oxygen)return window.EveraAdminCloud;await new Promise(r=>setTimeout(r,80))}return null}
  function apply(status){
    const dispatch=$('[data-oxygen-dispatch]'),retry=$('[data-oxygen-retry]'),hint=$('[data-oxygen-secret]'),msg=$('[data-oxygen-message]');
    if(!dispatch||!retry)return;
    const ready=Boolean(status?.tokenConfigured);
    dispatch.disabled=!ready;
    retry.disabled=!ready;
    dispatch.setAttribute('aria-disabled',ready?'false':'true');
    retry.setAttribute('aria-disabled',ready?'false':'true');
    if(ready){
      dispatch.textContent='立即同步氧气11';
      retry.textContent='重试上次失败';
      dispatch.title='触发 GitHub Actions 立即抓取四科最新内容';
      retry.title='重新运行最近一次失败的 GitHub Actions 任务';
      if(hint)hint.textContent='GitHub 手动调度已启用，可以立即同步或重试失败任务。';
      if(msg&&/github_token_missing|non-2xx|未配置|手动触发暂不可用/i.test(msg.textContent||''))msg.textContent='手动同步已就绪。';
    }else{
      dispatch.textContent='手动同步未启用';
      retry.textContent='重试未启用';
      dispatch.title='缺少服务器端 EVERFLOW_GITHUB_TOKEN';
      retry.title='缺少服务器端 EVERFLOW_GITHUB_TOKEN';
      if(hint)hint.textContent='只读检测正常；服务器端尚未配置 GitHub 调度令牌，所以不能启动新的抓取任务。';
      if(msg)msg.textContent='当前可以刷新并查看课时/运行状态；要从工作区真正启动氧气11同步，需要先配置服务器端 GitHub 调度令牌。';
    }
  }
  async function refreshGuard(){
    const cloud=await waitCloud();if(!cloud)return;
    try{apply(await cloud.oxygen('status'))}catch(e){console.warn('oxygen guard status failed',e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshGuard,{once:true});else refreshGuard();
  document.addEventListener('click',e=>{if(e.target.closest('[data-oxygen-refresh]'))setTimeout(refreshGuard,900)});
})();