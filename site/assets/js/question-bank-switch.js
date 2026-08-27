const body=document.body;
if(body.dataset.view!=='zhenti')throw new Error('question-bank-switch loaded outside bank page');

document.title='题库 · Everflow';
const KEY='everflow-408-bank-source-v1';
const RELAX_VERSION='20260828-relaxreader2';
const RELAX_DATA_VERSION='20260825-bank2';
const current=(()=>{try{return localStorage.getItem(KEY)==='relax1000'?'relax1000':'zhenti'}catch{return'zhenti'}})();
body.dataset.questionBank=current;
body.classList.toggle('relax1000-active',current==='relax1000');

const css=document.createElement('link');
css.rel='stylesheet';css.href=`/assets/css/question-bank-switch.css?v=${RELAX_VERSION}`;document.head.appendChild(css);

const shell=document.createElement('section');
shell.className='bank-source-shell';shell.setAttribute('aria-label','题库切换');
shell.innerHTML=`<div class="bank-source-inner"><span class="bank-source-label">题库</span><div class="bank-source-segmented" role="tablist"><button type="button" data-bank-source="zhenti" class="${current==='zhenti'?'active':''}">408 真题</button><button type="button" data-bank-source="relax1000" class="${current==='relax1000'?'active':''}">Relax1000</button></div><span class="bank-source-note">${current==='relax1000'?'章节题库 · 题库墙 / 速刷卡片':'历年真题 · 真题墙 / 整套真题 / 速刷卡片'}</span></div>`;
const main=document.querySelector('main');
if(main)main.before(shell);else document.body.appendChild(shell);
shell.querySelectorAll('[data-bank-source]').forEach(button=>button.addEventListener('click',()=>{
  const next=button.dataset.bankSource;if(next===current)return;
  try{localStorage.setItem(KEY,next)}catch{}
  location.reload();
}));

if(current!=='relax1000'){
  const warmRelax=()=>fetch(`/data/relax1000/data/questions.json?v=${RELAX_DATA_VERSION}`,{cache:'force-cache'}).catch(()=>null);
  if('requestIdleCallback' in window)requestIdleCallback(warmRelax,{timeout:1800});else setTimeout(warmRelax,900);
}

if(current==='relax1000'){
  const controls=document.createElement('link');controls.rel='stylesheet';controls.href=`/assets/css/relax1000-controls.css?v=${RELAX_VERSION}`;document.head.appendChild(controls);
  const readerSafe=document.createElement('link');readerSafe.rel='stylesheet';readerSafe.href=`/assets/css/relax1000-reader-safe.css?v=${RELAX_VERSION}`;document.head.appendChild(readerSafe);
  import(`/assets/js/relax1000-wall.js?v=${RELAX_VERSION}`)
    .then(()=>import(`/assets/js/relax1000-cards.js?v=${RELAX_VERSION}`))
    .then(()=>import(`/assets/js/relax1000-reset.js?v=${RELAX_VERSION}`))
    .catch(error=>{
      console.error('Everflow Relax1000 bank failed',error);
      document.querySelector('.relax-bank-root')?.remove();
      const fail=document.createElement('main');fail.className='relax-bank-root relax-load-failed';
      fail.innerHTML='<section><h1>Relax1000 载入失败</h1><p>题库模块暂时没有完整载入，请刷新后重试。</p></section>';
      shell.after(fail);
    });
}
