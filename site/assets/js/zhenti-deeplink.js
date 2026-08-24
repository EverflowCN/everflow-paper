(()=>{
  const arrowScript=document.createElement('script');
  arrowScript.src='/assets/js/zhenti-arrow-grid.js?v=20260824-arrows1';
  arrowScript.async=true;
  document.head.appendChild(arrowScript);

  const params=new URLSearchParams(location.search);
  const year=Number(params.get('year'));
  const q=Number(params.get('q'));
  if(year<2009||year>2026||q<1||q>47)return;

  let opened=false;
  function open(){
    if(opened||!window.EveraZhentiWall?.openQuestion)return false;
    opened=true;
    window.EveraZhentiWall.openQuestion(year,q);
    history.replaceState(null,'',location.pathname);
    return true;
  }

  document.addEventListener('everflow:zhenti-subject-index-ready',open,{once:true});
  let tries=0;
  const timer=setInterval(()=>{
    if(open()||++tries>=30)clearInterval(timer);
  },100);
})();
