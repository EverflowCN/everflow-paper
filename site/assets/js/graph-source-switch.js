const body=document.body;
if(body.dataset.view!=='graph')throw new Error('graph-source-switch loaded outside graph page');

const KEY='everflow-408-graph-source-v1';
const current=(()=>{try{return localStorage.getItem(KEY)==='relax1000'?'relax1000':'zhenti'}catch{return'zhenti'}})();
body.dataset.graphSource=current;

const stage=document.querySelector('[data-graph-shell]');
const legend=stage?.querySelector('.overview-legend');
if(!stage||!legend)throw new Error('shared graph shell missing');

const switcher=document.createElement('div');
switcher.className='graph-source-inline';
switcher.setAttribute('aria-label','图谱切换');
switcher.innerHTML=`<span class="graph-source-label">图谱</span><div class="graph-source-segmented" role="tablist"><button type="button" data-graph-source="zhenti" class="${current==='zhenti'?'active':''}">408 真题</button><button type="button" data-graph-source="relax1000" class="${current==='relax1000'?'active':''}">Relax1000</button></div>`;
const statusItems=[...legend.children].filter(node=>node.matches?.('span')&&node.querySelector?.('i')).slice(0,4);
const statusTail=statusItems.at(-1);
if(statusTail)statusTail.after(switcher);else legend.prepend(switcher);
switcher.querySelectorAll('[data-graph-source]').forEach(button=>button.addEventListener('click',()=>{
  const next=button.dataset.graphSource;if(next===current)return;
  try{localStorage.setItem(KEY,next)}catch{}
  location.reload();
}));

function resetSharedStage(){
  stage.hidden=false;
  stage.classList.remove('drawer-open','graph-fit','graph-fit-dense');
  stage.style.removeProperty('--cell-size');
  stage.style.removeProperty('--gap');
  stage.style.removeProperty('--year-col');
  stage.querySelector('[data-overview-matrix]')?.replaceChildren();
  const drawer=stage.querySelector('[data-question-drawer]');
  if(drawer){drawer.hidden=true;drawer.querySelector('[data-drawer-body]').innerHTML='<div class="drawer-loading">正在读取题目…</div>'}
  const reopen=stage.querySelector('[data-drawer-reopen]');if(reopen)reopen.hidden=true;
}
resetSharedStage();

async function loadTrueGraph(){
  stage.dataset.graphKind='zhenti';
  stage.dataset.fitCols='47';
  stage.dataset.fitRows='19';
  stage.dataset.fitLabel='适应屏幕';
  stage.dataset.fitKey='everflow-graph-fit-mode-v1';
  await import('/assets/js/zhenti-data-overlay.js?v=20260824-graph-unified2');
  await import('/assets/js/overall-graph.js?v=20260824-graph-unified2');
}
async function loadRelaxGraph(){
  stage.dataset.graphKind='relax1000';
  stage.dataset.fitCols='45';
  stage.dataset.fitLabel='适应屏幕';
  stage.dataset.fitKey='everflow-408-relax-graph-fit-v2';
  await import('/assets/js/relax1000-graph.js?v=20260824-graph-unified2');
  stage.dataset.fitLabel='适应屏幕';
}

try{
  if(current==='relax1000')await loadRelaxGraph();else await loadTrueGraph();
  await import('/assets/js/overall-graph-keyboard.js?v=20260824-graph-unified2');
  await import('/assets/js/overall-graph-fit.js?v=20260824-graph-unified2');
}catch(error){
  console.error('Everflow graph failed',error);
  resetSharedStage();
  const frame=stage.querySelector('.overview-frame');
  if(frame)frame.innerHTML='<div class="drawer-loading"><strong>图谱载入失败</strong><p>图谱数据暂时没有完整载入，请刷新后重试。</p></div>';
}