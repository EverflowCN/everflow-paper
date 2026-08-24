const body=document.body;
if(body.dataset.view==='graph'){
  const KEY='everflow-408-graph-source-v1';
  const current=(()=>{try{return localStorage.getItem(KEY)==='relax1000'?'relax1000':'zhenti'}catch{return'zhenti'}})();
  body.dataset.graphSource=current;
  body.classList.toggle('relax1000-graph-active',current==='relax1000');

  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='/assets/css/question-bank-switch.css?v=20260824-graph2';
  document.head.appendChild(css);

  const original=document.querySelector('[data-graph-shell]');
  const shell=document.createElement('section');
  shell.className='bank-source-shell graph-source-shell';
  shell.setAttribute('aria-label','图谱切换');
  shell.innerHTML=`<div class="bank-source-inner"><span class="bank-source-label">图谱</span><div class="bank-source-segmented" role="tablist"><button type="button" data-graph-source="zhenti" class="${current==='zhenti'?'active':''}">408 真题</button><button type="button" data-graph-source="relax1000" class="${current==='relax1000'?'active':''}">Relax1000</button></div><span class="bank-source-note">${current==='relax1000'?'1576 道题 · 每行最多 45 格 · 支持放大查看':'2009—2026 · 18 年 × 47 题'}</span></div>`;
  if(original)original.before(shell);else document.querySelector('header')?.after(shell);
  shell.querySelectorAll('[data-graph-source]').forEach(button=>button.addEventListener('click',()=>{
    const next=button.dataset.graphSource;
    if(next===current)return;
    try{localStorage.setItem(KEY,next)}catch{}
    location.reload();
  }));

  if(original)original.hidden=current==='relax1000';
  if(current==='relax1000'){
    import('/assets/js/relax1000-graph.js?v=20260824-graph45-1').catch(error=>{
      console.error('Everflow Relax1000 graph failed',error);
      const fail=document.createElement('main');
      fail.className='relax-bank-root relax-load-failed';
      fail.innerHTML='<section><h1>Relax1000 图谱载入失败</h1><p>没有成功读取题库数据，请刷新后重试。</p></section>';
      shell.after(fail);
    });
  }
}
