(()=>{
  const shell=document.querySelector('[data-graph-shell]');
  const scroll=shell?.querySelector('.overview-scroll');
  const matrix=shell?.querySelector('[data-overview-matrix]');
  const legend=shell?.querySelector('.overview-legend');
  if(!shell||!scroll||!matrix||!legend)return;

  const cols=()=>Math.max(1,Number(shell.dataset.fitCols)||47);
  const rows=()=>Math.max(1,Number(shell.dataset.fitRows)||19);
  const storageKey=()=>shell.dataset.fitKey||'everflow-graph-fit-mode-v1';
  const fitLabel=()=>shell.dataset.fitLabel||'适应屏幕';
  let mode='fit';
  try{mode=localStorage.getItem(storageKey())==='native'?'native':'fit'}catch{}

  const old=legend.querySelector('.graph-fit-toggle');
  if(old)old.remove();
  const toggle=document.createElement('button');
  toggle.type='button';toggle.className='graph-fit-toggle';toggle.setAttribute('aria-label','切换图谱显示方式');legend.appendChild(toggle);

  function clearVars(){shell.style.removeProperty('--cell-size');shell.style.removeProperty('--gap');shell.style.removeProperty('--year-col')}
  function fit(){
    const desktop=matchMedia('(min-width:1000px)').matches,enabled=desktop&&mode==='fit';
    shell.classList.toggle('graph-fit',enabled);
    toggle.textContent=enabled?'放大查看':fitLabel();
    toggle.title=enabled?'恢复较大方格，可横向滚动':`完整显示当前图谱的 ${cols()} 列`;
    if(!enabled){clearVars();return}
    requestAnimationFrame(()=>{
      const c=cols(),r=rows(),w=Math.max(0,scroll.clientWidth-8),h=Math.max(0,scroll.clientHeight-8),gap=w<760?1:2,yearCol=w<760?36:42;
      const widthSize=(w-yearCol-gap*c)/c,heightSize=(h-gap*Math.max(0,r-1))/r;
      const size=Math.max(8,Math.min(25,Math.floor(Math.min(widthSize,heightSize))));
      shell.style.setProperty('--cell-size',`${size}px`);shell.style.setProperty('--gap',`${gap}px`);shell.style.setProperty('--year-col',`${yearCol}px`);
    });
  }
  toggle.addEventListener('click',()=>{mode=mode==='fit'?'native':'fit';try{localStorage.setItem(storageKey(),mode)}catch{}fit()});
  let raf=0;const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(fit)};
  new ResizeObserver(schedule).observe(shell);new ResizeObserver(schedule).observe(scroll);window.addEventListener('resize',schedule,{passive:true});document.addEventListener('everflow:graph-matrix-ready',schedule);
  fit();
})();
