const body=document.body;
if(body.dataset.view!=='graph')throw new Error('graph-source-switch loaded outside graph page');

const KEY='everflow-408-graph-source-v1';
const current=(()=>{try{return localStorage.getItem(KEY)==='relax1000'?'relax1000':'zhenti'}catch{return'zhenti'}})();
body.dataset.graphSource=current;

const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/question-bank-switch.css?v=20260824-graph6';document.head.appendChild(css);
const stage=document.querySelector('[data-graph-shell]');
const shell=document.createElement('section');shell.className='bank-source-shell graph-source-shell';shell.setAttribute('aria-label','图谱切换');
shell.innerHTML=`<div class="bank-source-inner"><span class="bank-source-label">图谱</span><div class="bank-source-segmented" role="tablist"><button type="button" data-graph-source="zhenti" class="${current==='zhenti'?'active':''}">408 真题</button><button type="button" data-graph-source="relax1000" class="${current==='relax1000'?'active':''}">Relax1000</button></div><span class="bank-source-note">${current==='relax1000'?'章节图谱 · 每行最多 45 格 · 放大 / 适应宽度':'历年真题图谱 · 放大 / 适应屏幕'}</span></div>`;
if(stage)stage.before(shell);else document.querySelector('header')?.after(shell);
shell.querySelectorAll('[data-graph-source]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.graphSource;if(next===current)return;try{localStorage.setItem(KEY,next)}catch{}location.reload()}));

function resetSharedStage(){
  if(!stage)return;
  stage.hidden=false;stage.classList.remove('drawer-open','graph-fit');stage.style.removeProperty('--cell-size');stage.style.removeProperty('--gap');stage.style.removeProperty('--year-col');
  stage.querySelector('[data-overview-matrix]')?.replaceChildren();
  const drawer=stage.querySelector('[data-question-drawer]');if(drawer){drawer.hidden=true;drawer.querySelector('[data-drawer-body]').innerHTML='<div class="drawer-loading">正在读取题目…</div>'}
  const reopen=stage.querySelector('[data-drawer-reopen]');if(reopen)reopen.hidden=true;
}
function syncViewport(){
  if(!stage)return;
  requestAnimationFrame(()=>{const top=stage.getBoundingClientRect().top;stage.style.height=`${Math.max(280,Math.floor(window.innerHeight-top))}px`});
}
resetSharedStage();syncViewport();
new ResizeObserver(syncViewport).observe(shell);window.addEventListener('resize',syncViewport,{passive:true});

async function loadTrueGraph(){
  stage.dataset.graphKind='zhenti';stage.dataset.fitCols='47';stage.dataset.fitRows='19';stage.dataset.fitLabel='适应屏幕';stage.dataset.fitKey='everflow-graph-fit-mode-v1';
  await import('/assets/js/zhenti-data-overlay.js?v=20260824-graph-unified1');
  await import('/assets/js/overall-graph.js?v=20260824-graph-unified1');
}
async function loadRelaxGraph(){
  stage.dataset.graphKind='relax1000';stage.dataset.fitCols='45';stage.dataset.fitLabel='适应宽度';stage.dataset.fitKey='everflow-408-relax-graph-fit-v2';
  await import('/assets/js/relax1000-graph.js?v=20260824-graph-unified1');
}

try{
  if(current==='relax1000')await loadRelaxGraph();else await loadTrueGraph();
  await import('/assets/js/overall-graph-keyboard.js?v=20260824-graph-unified1');
  await import('/assets/js/overall-graph-fit.js?v=20260824-graph-unified1');
  syncViewport();
}catch(error){
  console.error('Everflow graph failed',error);resetSharedStage();const frame=stage?.querySelector('.overview-frame');if(frame)frame.innerHTML='<div class="drawer-loading"><strong>图谱载入失败</strong><p>图谱数据暂时没有完整载入，请刷新后重试。</p></div>';
}
