const body=document.body;
const view=body.dataset.view;
if(['zhenti','graph'].includes(view)){
  const KEY='everflow-408-bank-source-v1';
  const source=(()=>{try{return localStorage.getItem(KEY)||'zhenti'}catch{return'zhenti'}})();
  const current=source==='relax1000'?'relax1000':'zhenti';
  body.dataset.questionBank=current;
  body.classList.toggle('relax1000-active',current==='relax1000');

  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='/assets/css/question-bank-switch.css?v=20260824-relax2';
  document.head.appendChild(css);

  const shell=document.createElement('section');
  shell.className='bank-source-shell';
  shell.setAttribute('aria-label','题库切换');
  shell.innerHTML=`<div class="bank-source-inner"><span class="bank-source-label">题库</span><div class="bank-source-segmented" role="tablist"><button type="button" data-bank-source="zhenti" class="${current==='zhenti'?'active':''}">408 真题</button><button type="button" data-bank-source="relax1000" class="${current==='relax1000'?'active':''}">Relax1000</button></div><a class="bank-source-practice" href="/relax/">Relax组卷 →</a><span class="bank-source-note">${current==='relax1000'?'1576 道选择题 · 数据来自你的 Relax1000 仓库':'2009—2026 · 已核验真题'}</span></div>`;
  const main=document.querySelector('main');
  if(main)main.before(shell);else document.body.appendChild(shell);
  shell.querySelectorAll('[data-bank-source]').forEach(button=>button.addEventListener('click',()=>{
    const next=button.dataset.bankSource;
    if(next===current)return;
    try{localStorage.setItem(KEY,next)}catch{}
    location.reload();
  }));

  if(current==='relax1000'){
    import(`/assets/js/relax1000-${view}.js?v=20260824-relax1`).catch(error=>{
      console.error('Everflow Relax1000 view failed',error);
      const fail=document.createElement('main');
      fail.className='relax-bank-root relax-load-failed';
      fail.innerHTML='<section><h1>Relax1000 载入失败</h1><p>没有成功读取你仓库中的题库数据。请检查网络后刷新页面。</p></section>';
      shell.after(fail);
    });
  }
}
