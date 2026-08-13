(()=>{
  function inject(){
    if(!location.pathname.startsWith('/workspace/'))return;
    const nav=document.querySelector('.ws-side .ws-nav');
    if(!nav||nav.querySelector('[data-ws-quota-entry]'))return;
    const link=document.createElement('a');
    link.href='./limits.html';
    link.dataset.wsQuotaEntry='1';
    link.innerHTML='▤ <span>额度中心</span>';
    const system=nav.querySelector('[data-ws-nav="system"]');
    if(system)system.insertAdjacentElement('beforebegin',link);else nav.appendChild(link);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});else inject();
  setTimeout(inject,220);
})();