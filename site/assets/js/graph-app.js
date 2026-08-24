const body=document.body;
if(body.dataset.view!=='graph')throw new Error('graph-app loaded outside graph page');

const APP_VERSION='20260824-graph-r5';
const SOURCE_KEY='everflow-408-graph-source-v1';
const shell=document.querySelector('[data-graph-shell]');
const sourceHost=shell?.querySelector('[data-graph-source-host]');
const caption=shell?.querySelector('[data-graph-caption]');
if(!shell||!sourceHost||!caption)throw new Error('graph shell missing');

const SOURCES={
  zhenti:{
    label:'408 真题',kind:'zhenti',cols:47,rows:19,
    fitKey:'everflow-graph-fit-mode-v1',caption:'年份 × 题号 · 2009—2026',
    load:async()=>{
      await import(`/assets/js/zhenti-data-overlay.js?v=${APP_VERSION}`);
      await import(`/assets/js/overall-graph.js?v=${APP_VERSION}`);
    }
  },
  relax1000:{
    label:'Relax1000',kind:'relax1000',cols:45,rows:1,
    fitKey:'everflow-408-relax-graph-fit-v2',caption:'章节 × 题序 · 每行最多 45 题',
    load:async()=>import(`/assets/js/relax1000-graph.js?v=${APP_VERSION}`)
  }
};

function storedSource(){
  try{return localStorage.getItem(SOURCE_KEY)==='relax1000'?'relax1000':'zhenti'}catch{return'zhenti'}
}
function selectedSource(){
  const query=new URL(location.href).searchParams.get('source');
  return Object.hasOwn(SOURCES,query)?query:storedSource();
}
function rememberSource(source){try{localStorage.setItem(SOURCE_KEY,source)}catch{}}
function resetShell(){
  shell.hidden=false;
  shell.classList.remove('drawer-open','graph-fit','graph-fit-dense');
  shell.dataset.controlsReady='false';
  for(const name of ['--cell-size','--gap','--year-col'])shell.style.removeProperty(name);
  shell.querySelector('[data-overview-matrix]')?.replaceChildren();
  const drawer=shell.querySelector('[data-question-drawer]');
  if(drawer){
    drawer.hidden=true;
    const drawerBody=drawer.querySelector('[data-drawer-body]');
    if(drawerBody)drawerBody.innerHTML='<div class="drawer-loading">正在读取题目…</div>';
  }
  const reopen=shell.querySelector('[data-drawer-reopen]');
  if(reopen)reopen.hidden=true;
}
function configureShell(source){
  const config=SOURCES[source];
  body.dataset.graphSource=source;
  body.dataset.graphBuild=APP_VERSION;
  shell.dataset.graphKind=config.kind;
  shell.dataset.fitCols=String(config.cols);
  shell.dataset.fitRows=String(config.rows);
  shell.dataset.fitKey=config.fitKey;
  caption.textContent=config.caption;
}
function mountSourceSwitch(source){
  sourceHost.replaceChildren();
  const control=document.createElement('div');
  control.className='graph-source-inline';
  control.dataset.graphSourceSwitch='';
  control.setAttribute('aria-label','图谱来源');
  control.innerHTML=`<div class="graph-source-segmented" role="tablist">${Object.entries(SOURCES).map(([key,item])=>`<button type="button" role="tab" aria-selected="${key===source}" data-graph-source="${key}" class="${key===source?'active':''}">${item.label}</button>`).join('')}</div>`;
  sourceHost.appendChild(control);
  control.addEventListener('click',event=>{
    const button=event.target.closest('[data-graph-source]');
    if(!button)return;
    const next=button.dataset.graphSource;
    if(!Object.hasOwn(SOURCES,next)||next===source)return;
    rememberSource(next);
    const url=new URL(location.href);
    url.searchParams.set('source',next);
    location.assign(url.href);
  });
}
function showFatal(error){
  console.error('Everflow graph failed',error);
  resetShell();
  const frame=shell.querySelector('.overview-frame');
  if(frame)frame.innerHTML='<div class="drawer-loading"><div><strong>图谱载入失败</strong><p>数据或组件没有完整载入，请刷新后重试。</p></div></div>';
}

const source=selectedSource();
rememberSource(source);
resetShell();
configureShell(source);
mountSourceSwitch(source);

try{
  await SOURCES[source].load();
  await import(`/assets/js/graph-controls.js?v=${APP_VERSION}`);
  body.dataset.graphReady='true';
  document.dispatchEvent(new CustomEvent('everflow:graph-ready',{detail:{source,version:APP_VERSION}}));
}catch(error){
  body.dataset.graphReady='false';
  showFatal(error);
}
