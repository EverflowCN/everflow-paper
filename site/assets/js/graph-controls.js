(()=>{
  const shell=document.querySelector('[data-graph-shell]');
  const scroll=shell?.querySelector('.overview-scroll');
  const matrix=shell?.querySelector('[data-overview-matrix]');
  const viewHost=shell?.querySelector('[data-graph-view-host]');
  const drawer=shell?.querySelector('[data-question-drawer]');
  const drawerClose=shell?.querySelector('[data-drawer-close]');
  if(!shell||!scroll||!matrix||!viewHost)return;
  if(shell.dataset.controlsReady==='true')return;
  shell.dataset.controlsReady='true';

  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const editableTarget=target=>Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));
  const cols=()=>Math.max(1,Number(shell.dataset.fitCols)||47);
  const rows=()=>Math.max(1,Number(shell.dataset.fitRows)||19);
  const storageKey=()=>shell.dataset.fitKey||'everflow-graph-fit-mode-v1';
  let fitRaf=0,verifyRaf=0;
  let mode=matchMedia('(max-width:760px)').matches?'native':'fit';
  try{const saved=localStorage.getItem(storageKey());if(saved==='fit'||saved==='native')mode=saved}catch{}

  viewHost.replaceChildren();
  const viewControl=document.createElement('div');
  viewControl.className='graph-view-segmented';
  viewControl.setAttribute('role','group');
  viewControl.setAttribute('aria-label','图谱显示方式');
  viewControl.innerHTML='<button type="button" data-graph-view="fit">适应</button><button type="button" data-graph-view="native">放大</button>';
  viewHost.appendChild(viewControl);
  const viewButtons=[...viewControl.querySelectorAll('[data-graph-view]')];

  function syncViewButtons(){
    viewButtons.forEach(button=>{
      const active=button.dataset.graphView===mode;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }
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
  function matrixFits(){return matrix.scrollWidth<=scroll.clientWidth+1&&matrix.scrollHeight<=scroll.clientHeight+1}
  function verifyFit(size,gap,indexWidth,attempt=0){
    cancelAnimationFrame(verifyRaf);
    verifyRaf=requestAnimationFrame(()=>{
      if(mode!=='fit'||matrixFits()||attempt>=26)return;
      let nextSize=size,nextGap=gap,nextIndex=indexWidth;
      if(nextSize>2)nextSize--;
      else if(nextGap>0)nextGap--;
      else if(nextIndex>24)nextIndex=Math.max(24,nextIndex-2);
      else return;
      applyFitVars(nextSize,nextGap,nextIndex);
      verifyFit(nextSize,nextGap,nextIndex,attempt+1);
    });
  }
  function applyFit(){
    const enabled=mode==='fit';
    shell.classList.toggle('graph-fit',enabled);
    syncViewButtons();
    if(!enabled){clearFitVars();return}

    cancelAnimationFrame(fitRaf);
    fitRaf=requestAnimationFrame(()=>{
      const c=cols(),r=rows();
      const availableWidth=Math.max(0,scroll.clientWidth-12);
      const availableHeight=Math.max(0,scroll.clientHeight-12);
      let gap=(c>=45||r>=30)?1:2;
      let indexWidth=r>=36?34:42;
      let widthSize=(availableWidth-indexWidth-gap*c-8)/c;
      let heightSize=(availableHeight-gap*Math.max(0,r-1)-8)/r;
      if(Math.min(widthSize,heightSize)<7){
        gap=0;indexWidth=32;
        widthSize=(availableWidth-indexWidth-8)/c;
        heightSize=(availableHeight-8)/r;
      }
      const size=Math.max(2,Math.min(25,Math.floor(Math.min(widthSize,heightSize))));
      applyFitVars(size,gap,indexWidth);
      verifyFit(size,gap,indexWidth);
    });
  }
  const scheduleFit=()=>{cancelAnimationFrame(fitRaf);fitRaf=requestAnimationFrame(applyFit)};

  viewControl.addEventListener('click',event=>{
    const button=event.target.closest('[data-graph-view]');
    if(!button)return;
    const next=button.dataset.graphView;
    if(next!=='fit'&&next!=='native')return;
    mode=next;
    try{localStorage.setItem(storageKey(),mode)}catch{}
    applyFit();
  });

  if('ResizeObserver'in window){
    const observer=new ResizeObserver(scheduleFit);
    observer.observe(shell);observer.observe(scroll);
  }
  new MutationObserver(scheduleFit).observe(shell,{attributes:true,attributeFilter:['class','data-fit-cols','data-fit-rows','data-fit-key']});
  window.addEventListener('resize',scheduleFit,{passive:true});
  document.addEventListener('everflow:graph-matrix-ready',event=>{
    if(event.detail?.cols)shell.dataset.fitCols=String(event.detail.cols);
    if(event.detail?.rows)shell.dataset.fitRows=String(event.detail.rows);
    scheduleFit();
  });

  const currentCell=()=>matrix.querySelector('.overview-cell.current')||matrix.querySelector('.overview-cell');
  function persistCurrent(target){
    try{
      if(shell.dataset.graphKind==='relax1000'&&target.dataset.relaxId)localStorage.setItem('everflow-408-relax-graph-current-v4',target.dataset.relaxId);
      else if(target.dataset.key&&/^\d{4}-\d{1,2}$/.test(target.dataset.key))localStorage.setItem('everflow-408-graph-current-v2',target.dataset.key);
    }catch{}
  }
  function activate(target,{openDetail=false}={}){
    if(!target)return false;
    matrix.querySelector('.overview-cell.current')?.classList.remove('current');
    target.classList.add('current');
    persistCurrent(target);
    if(openDetail)target.click();
    target.classList.remove('keyboard-active');
    void target.offsetWidth;
    target.classList.add('keyboard-active');
    window.setTimeout(()=>target.classList.remove('keyboard-active'),180);
    requestAnimationFrame(()=>target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'}));
    return true;
  }
  function moveRelax(cell,key){
    if(cell?.dataset?.row==null||cell?.dataset?.col==null)return null;
    let row=Number(cell.dataset.row),col=Number(cell.dataset.col);
    if(key==='ArrowUp')row--;else if(key==='ArrowDown')row++;else if(key==='ArrowLeft')col--;else if(key==='ArrowRight')col++;else return null;
    if(row<0||col<0)return null;
    let target=matrix.querySelector(`.overview-cell[data-row="${row}"][data-col="${col}"]`);
    if(!target&&(key==='ArrowUp'||key==='ArrowDown')){
      const candidates=[...matrix.querySelectorAll(`.overview-cell[data-row="${row}"]`)];
      if(candidates.length)target=candidates.reduce((best,node)=>Math.abs(Number(node.dataset.col)-col)<Math.abs(Number(best.dataset.col)-col)?node:best,candidates[0]);
    }
    return target&&target!==cell?target:null;
  }
  function moveTruePaper(cell,key){
    const match=String(cell?.dataset?.key||'').match(/^(\d{4})-(\d{1,2})$/);
    if(!match)return null;
    let year=Number(match[1]),question=Number(match[2]);
    if(key==='ArrowUp')year=clamp(year+1,2009,2026);
    else if(key==='ArrowDown')year=clamp(year-1,2009,2026);
    else if(key==='ArrowLeft')question=clamp(question-1,1,47);
    else if(key==='ArrowRight')question=clamp(question+1,1,47);
    else return null;
    const target=matrix.querySelector(`.overview-cell[data-key="${year}-${question}"]`);
    return target&&target!==cell?target:null;
  }
  function onKeydown(event){
    if(editableTarget(event.target))return;
    if(event.key==='Escape'&&drawer&&!drawer.hidden){
      drawerClose?.click();event.preventDefault();event.stopImmediatePropagation();return;
    }
    if(event.key==='Enter'||event.key===' '){
      const cell=currentCell();
      if(cell){cell.click();event.preventDefault();event.stopImmediatePropagation()}
      return;
    }
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
    const cell=currentCell();
    const target=moveRelax(cell,event.key)||moveTruePaper(cell,event.key);
    if(target){
      activate(target,{openDetail:Boolean(drawer&&!drawer.hidden)});
      event.preventDefault();event.stopImmediatePropagation();
    }
  }
  document.addEventListener('keydown',onKeydown,true);
  applyFit();
})();
