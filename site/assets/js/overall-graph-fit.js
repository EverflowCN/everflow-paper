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
  let mode='fit',raf=0,verifyRaf=0;
  try{mode=localStorage.getItem(storageKey())==='native'?'native':'fit'}catch{}

  legend.querySelector('.graph-fit-toggle')?.remove();
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='graph-fit-toggle';
  toggle.setAttribute('aria-label','切换图谱显示方式');
  legend.appendChild(toggle);

  function clearVars(){
    shell.style.removeProperty('--cell-size');
    shell.style.removeProperty('--gap');
    shell.style.removeProperty('--year-col');
    shell.classList.remove('graph-fit-dense');
  }
  function applyVars(size,gap,yearCol){
    shell.style.setProperty('--cell-size',`${size}px`);
    shell.style.setProperty('--gap',`${gap}px`);
    shell.style.setProperty('--year-col',`${yearCol}px`);
    shell.classList.toggle('graph-fit-dense',size<=7);
  }
  function matrixFits(){
    return matrix.scrollWidth<=scroll.clientWidth+1&&matrix.scrollHeight<=scroll.clientHeight+1;
  }
  function verify(size,gap,yearCol,attempt=0){
    cancelAnimationFrame(verifyRaf);
    verifyRaf=requestAnimationFrame(()=>{
      if(matrixFits()||attempt>=12)return;
      let nextSize=size,nextGap=gap,nextYear=yearCol;
      if(nextSize>3)nextSize--;
      else if(nextGap>0)nextGap--;
      else if(nextYear>28)nextYear=Math.max(28,nextYear-2);
      else return;
      applyVars(nextSize,nextGap,nextYear);
      verify(nextSize,nextGap,nextYear,attempt+1);
    });
  }
  function fit(){
    const desktop=matchMedia('(min-width:1000px)').matches;
    const enabled=desktop&&mode==='fit';
    shell.classList.toggle('graph-fit',enabled);
    toggle.textContent=enabled?'放大查看':fitLabel();
    toggle.title=enabled?'恢复较大方格，可横向/纵向滚动':'将当前图谱完整压入一个框内';
    if(!enabled){clearVars();return}

    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      const c=cols(),r=rows();
      const w=Math.max(0,scroll.clientWidth-10),h=Math.max(0,scroll.clientHeight-10);
      let gap=(c>=45||r>=30)?1:2;
      let yearCol=r>=36?36:42;
      let widthSize=(w-yearCol-gap*c-8)/c;
      let heightSize=(h-gap*Math.max(0,r-1)-8)/r;
      if(Math.min(widthSize,heightSize)<7){gap=0;yearCol=34;widthSize=(w-yearCol-8)/c;heightSize=(h-8)/r}
      const size=Math.max(3,Math.min(25,Math.floor(Math.min(widthSize,heightSize))));
      applyVars(size,gap,yearCol);
      verify(size,gap,yearCol);
    });
  }

  toggle.addEventListener('click',()=>{
    mode=mode==='fit'?'native':'fit';
    try{localStorage.setItem(storageKey(),mode)}catch{}
    fit();
  });

  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(fit)};
  new ResizeObserver(schedule).observe(shell);
  new ResizeObserver(schedule).observe(scroll);
  new MutationObserver(schedule).observe(shell,{attributes:true,attributeFilter:['class','data-fit-cols','data-fit-rows','data-fit-label']});
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('everflow:graph-matrix-ready',event=>{
    if(event.detail?.cols)shell.dataset.fitCols=String(event.detail.cols);
    if(event.detail?.rows)shell.dataset.fitRows=String(event.detail.rows);
    schedule();
  });
  fit();
})();