(()=>{
  let tries=0;
  const openDefault=()=>{
    const matrix=document.querySelector('[data-overview-matrix]');
    const drawer=document.querySelector('[data-question-drawer]');
    if(!matrix||!drawer)return false;
    const current=matrix.querySelector('.overview-cell.current');
    const fallback=matrix.querySelector('.overview-cell[data-key="2026-1"]')||matrix.querySelector('.overview-cell');
    const target=current||fallback;
    if(!target)return false;
    if(drawer.hidden)target.click();
    return true;
  };
  if(openDefault())return;
  const timer=setInterval(()=>{
    if(openDefault()||++tries>=40)clearInterval(timer);
  },50);
})();