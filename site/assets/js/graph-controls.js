(()=>{
  const shell=document.querySelector('[data-graph-shell]');
  const scroll=shell?.querySelector('.overview-scroll');
  const matrix=shell?.querySelector('[data-overview-matrix]');
  const legend=shell?.querySelector('.overview-legend');
  const drawer=shell?.querySelector('[data-question-drawer]');
  const drawerClose=shell?.querySelector('[data-drawer-close]');
  if(!shell||!scroll||!matrix||!legend)return;
  if(shell.dataset.controlsReady==='true')return;
  shell.dataset.controlsReady='true';

  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const editableTarget=target=>Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));
  const cols=()=>Math.max(1,Number(shell.dataset.fitCols)||47);
  const rows=()=>Math.max(1,Number(shell.dataset.fitRows)||19);
  const storageKey=()=>shell.dataset.fitKey||'everflow-graph-fit-mode-v1';
  let mode='fit',fitRaf=0,verifyRaf=0;
  try{mode=localStorage.getItem(storageKey())==='native'?'native':'fit'}catch{}

  legend.querySelector('[data-graph-fit]')?.remove();
  const fitButton=document.createElement('button');
  fitButton.type='button';
  fitButton.className='graph-fit-toggle';
  fitButton.dataset.graphFit='';
  fitButton.setAttribute('aria-label','切换图谱显示方式');
  legend.appendChild(fitButton);

  function clearFitVars(){
    for(const name of ['--cell-size','--gap','--year-col'])shell.style.removeProperty(name);
    shell.classList.remove('graph-fit-dense');
  }
  function applyFitVars(size,gap,indexWidth){
    shell.style.setProperty('--cell-size',`${size}px`);
    shell.style.setProperty('--gap',`${gap}px`);
    shell.style.setProperty('--year-col',`${indexWidth}px`);
    shell.classList.toggle('graph-fit-dense',size<=7);
  }
  function matrixFits(){
    return matrix.scrollWidth<=scroll.clientWidth+1&&matrix.scrollHeight<=scroll.clientHeight+1;
  }
  function verifyFit(size,gap,indexWidth,attempt=0){
    cancelAnimationFrame(verifyRaf);
    verifyRaf=requestAnimationFrame(()=>{
      if(matrixFits()||attempt>=18)return;
      let nextSize=size,nextGap=gap,nextIndex=indexWidth;
      if(nextSize>2)nextSize-=1;
      else if(nextGap>0)nextGap-=1;
      else if(nextIndex>26)nextIndex=Math.max(26,nextIndex-2);
      else return;
      applyFitVars(nextSize,nextGap,nextIndex);
      verifyFit(nextSize,nextGap,nextIndex,attempt+1);
    });
  }
  function applyFit(){
    const desktop=matchMedia('(min-width:1000px)').matches;
    const enabled=desktop&&mode==='fit';
    shell.classList.toggle('graph-fit',enabled);
    fitButton.textContent=enabled?'放大查看':'适应屏幕';
    fitButton.title=enabled?'恢复较大方格并允许滚动':'将当前图谱完整压入一个框内';
    if(!enabled){clearFitVars();return}

    cancelAnimationFrame(fitRaf);
    fitRaf=requestAnimationFrame(()=>{
      const c=cols(),r=rows();
      const availableWidth=Math.max(0,scroll.clientWidth-10);
      const availableHeight=Math.max(0,scroll.clientHeight-10);
      let gap=(c>=45||r>=30)?1:2;
      let indexWidth=r>=36?36:42;
      let widthSize=(availableWidth-indexWidth-gap*c-8)/c;
      let heightSize=(availableHeight-gap*Math.max(0,r-1)-8)/r;
      if(Math.min(widthSize,heightSize)<7){
        gap=0;
        indexWidth=34;
        widthSize=(availableWidth-indexWidth-8)/c;
        heightSize=(availableHeight-8)/r;
      }
      const size=Math.max(2,Math.min(25,Math.floor(Math.min(widthSize,heightSize))));
      applyFitVars(size,gap,indexWidth);
      verifyFit(size,gap,indexWidth);
    });
  }
  const scheduleFit=()=>{cancelAnimationFrame(fitRaf);fitRaf=requestAnimationFrame(applyFit)};

  fitButton.addEventListener('click',()=>{
    mode=mode==='fit'?'native':'fit';
    try{localStorage.setItem(storageKey(),mode)}catch{}
    applyFit();
  });

  if('ResizeObserver'in window){
    const observer=new ResizeObserver(scheduleFit);
    observer.observe(shell);
    observer.observe(scroll);
  }
  const attrObserver=new MutationObserver(scheduleFit);
  attrObserver.observe(shell,{attributes:true,attributeFilter:['class','data-fit-cols','data-fit-rows','data-fit-key']});
  window.addEventListener('resize',scheduleFit,{passive:true});
  document.addEventListener('everflow:graph-matrix-ready',event=>{
    if(event.detail?.cols)shell.dataset.fitCols=String(event.detail.cols);
    if(event.detail?.rows)shell.dataset.fitRows=String(event.detail.rows);
    scheduleFit();
  });

  const currentCell=()=>matrix.querySelector('.overview-cell.current')||matrix.querySelector('.overview-cell');
  function activate(target){
    if(!target)return false;
    target.click();
    target.classList.remove('keyboard-active');
    void target.offsetWidth;
    target.classList.add('keyboard-active');
    window.setTimeout(()=>target.classList.remove('keyboard-active'),180);
    requestAnimationFrame(()=>target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'}));
    return true;
  }
  function moveRelax(cell,key){
    if(cell?.dataset?.row==null||cell?.dataset?.col==null)return false;
    let row=Number(cell.dataset.row),col=Number(cell.dataset.col);
    if(key==='ArrowUp')row--;else if(key==='ArrowDown')row++;else if(key==='ArrowLeft')col--;else if(key==='ArrowRight')col++;else return false;
    if(row<0||col<0)return false;
    let target=matrix.querySelector(`.overview-cell[data-row="${row}"][data-col="${col}"]`);
    if(!target&&(key==='ArrowUp'||key==='ArrowDown')){
      const candidates=[...matrix.querySelectorAll(`.overview-cell[data-row="${row}"]`)];
      if(!candidates.length)return false;
      target=candidates.reduce((best,node)=>Math.abs(Number(node.dataset.col)-col)<Math.abs(Number(best.dataset.col)-col)?node:best,candidates[0]);
    }
    return target&&target!==cell?activate(target):false;
  }
  function moveTruePaper(cell,key){
    const match=String(cell?.dataset?.key||'').match(/^(\d{4})-(\d{1,2})$/);
    if(!match)return false;
    let year=Number(match[1]),question=Number(match[2]);
    if(key==='ArrowUp')year=clamp(year+1,2009,2026);
    else if(key==='ArrowDown')year=clamp(year-1,2009,2026);
    else if(key==='ArrowLeft')question=clamp(question-1,1,47);
    else if(key==='ArrowRight')question=clamp(question+1,1,47);
    else return false;
    const target=matrix.querySelector(`.overview-cell[data-key="${year}-${question}"]`);
    return target&&target!==cell?activate(target):false;
  }
  function onKeydown(event){
    if(editableTarget(event.target))return;
    if(event.key==='Escape'&&drawer&&!drawer.hidden){
      drawerClose?.click();
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
    const cell=currentCell();
    if(moveRelax(cell,event.key)||moveTruePaper(cell,event.key)){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  document.addEventListener('keydown',onKeydown,true);
  applyFit();
})();
