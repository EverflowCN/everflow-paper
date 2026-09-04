(()=>{
  'use strict';
  const CHECK_KEY='everflow-feedback-notification-check-v1';
  const CHECK_INTERVAL=5*60*1000;
  const readLastCheck=()=>{try{return Number(sessionStorage.getItem(CHECK_KEY))||0}catch{return 0}};
  const writeLastCheck=()=>{try{sessionStorage.setItem(CHECK_KEY,String(Date.now()))}catch{}};
  const entityLabel=row=>String(row?.entity_id||'题目').trim()||'题目';

  async function check(){
    if(navigator.onLine===false||Date.now()-readLastCheck()<CHECK_INTERVAL)return;
    try{
      await import('/assets/js/cloud-config.js?v=20260904-feedback1');
      await import('/assets/js/cloud.js?v=20260904-feedback1');
      await window.EveraCloud?.ready;
      const user=await window.EveraCloud?.getUser();
      if(!user){writeLastCheck();return}
      const result=await window.EveraCloud.contentFeedback('notifications');
      writeLastCheck();
      const rows=Array.isArray(result?.notifications)?result.notifications:[];
      if(!rows.length)return;
      const names=[...new Set(rows.map(entityLabel))];
      const subject=rows.length===1?`你反馈的 ${names[0]}`:`你提交的 ${rows.length} 条题目反馈`;
      const detail=rows.length===1&&rows[0].resolution_note?`：${rows[0].resolution_note}`:'，刷新题目后即可查看修正内容。';
      window.EveraUI?.toast?.(`${subject} 已修正${detail}`,{type:'success',title:'题目已修正',duration:7600});
    }catch(error){
      if(!['login_required','云同步尚未配置'].includes(String(error?.message||'')))console.warn('Everflow feedback notification unavailable',error);
    }
  }

  if('requestIdleCallback' in window)requestIdleCallback(check,{timeout:5000});else setTimeout(check,2200);
})();
