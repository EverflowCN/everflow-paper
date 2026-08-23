(()=>{
  const params=new URLSearchParams(location.search);
  const year=Number(params.get('year'));
  const q=Number(params.get('q'));
  if(year<2009||year>2026||q<1||q>47)return;

  const subject=((q>=1&&q<=10)||q===41||q===42)?'ds':((q>=11&&q<=22)||q===43||q===44)?'co':((q>=23&&q<=32)||q===45||q===46)?'os':'cn';

  function open(){
    const tab=document.querySelector(`[data-main-subject="${subject}"]`);
    if(!tab)return false;
    if(!tab.classList.contains('active'))tab.click();
    const target=document.querySelector(`.matrix-q[data-year="${year}"][data-q="${q}"]`);
    if(!target)return false;
    target.click();
    history.replaceState(null,'',location.pathname);
    return true;
  }

  if(open())return;
  let tries=0;
  const timer=setInterval(()=>{
    if(open()||++tries>=20)clearInterval(timer);
  },50);
})();
