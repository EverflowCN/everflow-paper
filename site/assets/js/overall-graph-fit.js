(()=>{
  const shell=document.querySelector('[data-graph-shell]');
  const scroll=document.querySelector('.overview-scroll');
  const matrix=document.querySelector('[data-overview-matrix]');
  const legend=document.querySelector('.overview-legend');
  if(!shell||!scroll||!matrix||!legend)return;

  const KEY='everflow-graph-fit-mode-v1';
  const COLS=47;
  const ROWS=19;
  let mode='fit';
  try{mode=localStorage.getItem(KEY)==='native'?'native':'fit'}catch{}

  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='graph-fit-toggle';
  toggle.setAttribute('aria-label','切换图谱显示方式');
  legend.appendChild(toggle);

  function clearVars(){
    shell.style.removeProperty('--cell-size');
    shell.style.removeProperty('--gap');
    shell.style.removeProperty('--year-col');
  }

  function fit(){
    const desktop=matchMedia('(min-width:1000px)').matches;
    const enabled=desktop&&mode==='fit';
    shell.classList.toggle('graph-fit',enabled);
    toggle.textContent=enabled?'放大查看':'适应屏幕';
    toggle.title=enabled?'恢复较大方格，可横向滚动':'一次性显示完整 2009—2026 年全部 47 题';
    if(!enabled){clearVars();return}

    requestAnimationFrame(()=>{
      const w=Math.max(0,scroll.clientWidth-8);
      const h=Math.max(0,scroll.clientHeight-8);
      const gap=w<760?1:2;
      const yearCol=w<760?36:42;
      const widthSize=(w-yearCol-gap*COLS)/COLS;
      const heightSize=(h-gap*(ROWS-1))/ROWS;
      const size=Math.max(9,Math.min(25,Math.floor(Math.min(widthSize,heightSize))));
      shell.style.setProperty('--cell-size',`${size}px`);
      shell.style.setProperty('--gap',`${gap}px`);
      shell.style.setProperty('--year-col',`${yearCol}px`);
    });
  }

  toggle.addEventListener('click',()=>{
    mode=mode==='fit'?'native':'fit';
    try{localStorage.setItem(KEY,mode)}catch{}
    fit();
  });

  let raf=0;
  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(fit)};
  new ResizeObserver(schedule).observe(shell);
  new ResizeObserver(schedule).observe(scroll);
  window.addEventListener('resize',schedule,{passive:true});
  fit();
})();
