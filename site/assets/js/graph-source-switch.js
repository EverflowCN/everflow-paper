const body=document.body;
if(body.dataset.view!=='graph')throw new Error('graph-source-switch loaded outside graph page');

const KEY='everflow-408-graph-source-v1';
const current=(()=>{try{return localStorage.getItem(KEY)==='relax1000'?'relax1000':'zhenti'}catch{return'zhenti'}})();
body.dataset.graphSource=current;
body.classList.toggle('relax1000-graph-active',current==='relax1000');

const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/question-bank-switch.css?v=20260824-graph5';document.head.appendChild(css);
const original=document.querySelector('[data-graph-shell]');
const shell=document.createElement('section');shell.className='bank-source-shell graph-source-shell';shell.setAttribute('aria-label','图谱切换');
shell.innerHTML=`<div class="bank-source-inner"><span class="bank-source-label">图谱</span><div class="bank-source-segmented" role="tablist"><button type="button" data-graph-source="zhenti" class="${current==='zhenti'?'active':''}">408 真题</button><button type="button" data-graph-source="relax1000" class="${current==='relax1000'?'active':''}">Relax1000</button></div><span class="bank-source-note">${current==='relax1000'?'章节图谱 · 每行最多 45 格 · 放大 / 适应宽度':'历年真题图谱 · 放大 / 适应屏幕'}</span></div>`;
if(original)original.before(shell);else document.querySelector('header')?.after(shell);
shell.querySelectorAll('[data-graph-source]').forEach(button=>button.addEventListener('click',()=>{
  const next=button.dataset.graphSource;if(next===current)return;
  try{localStorage.setItem(KEY,next)}catch{}
  location.reload();
}));

async function loadTrueGraph(){
  await import('/assets/js/zhenti-data-overlay.js?v=20260824-privacy3');
  await import('/assets/js/overall-graph.js?v=20260824-privacy3');
  await Promise.all([
    import('/assets/js/overall-graph-keyboard.js?v=20260824-privacy3'),
    import('/assets/js/overall-graph-fit.js?v=20260824-privacy3')
  ]);
}
async function loadRelaxGraph(){
  if(original)original.hidden=true;
  await import('/assets/js/relax1000-graph.js?v=20260824-graph45-4');
}

(current==='relax1000'?loadRelaxGraph():loadTrueGraph()).catch(error=>{
  console.error('Everflow graph failed',error);
  const fail=document.createElement('main');fail.className='relax-bank-root relax-load-failed';
  fail.innerHTML='<section><h1>图谱载入失败</h1><p>图谱数据暂时没有完整载入，请刷新后重试。</p></section>';
  shell.after(fail);
});
