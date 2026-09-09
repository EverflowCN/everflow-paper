const source=(()=>{try{const value=localStorage.getItem('everflow-408-bank-source-v1');return['zhenti','relax1000','math-papers'].includes(value)?value:'zhenti'}catch{return'zhenti'}})();
const mathMode=source==='math-papers';
document.body.dataset.questionBank=source;
document.body.classList.toggle('relax1000-active',source==='relax1000');
document.body.classList.toggle('math-papers-active',mathMode);
if(mathMode){
  document.body.dataset.view='math-papers';
  const style=document.createElement('style');style.dataset.mathEarlyHide='';style.textContent='body.math-papers-active>main[data-wall-root],body.math-papers-active>.question-modal,body.math-papers-active>.paper-session{display:none!important}';document.head.appendChild(style);
}
const runtime=import('/assets/js/site-runtime-v2.js?v=20260904-stable2');
await import('/assets/js/question-content-v1.js?v=20260904-editor1');
if(source==='zhenti'){
  await import('/assets/js/zhenti-data-overlay.js?v=20260904-editor1');
  await import('/assets/js/zhenti-wall.js?v=20260905-topics1');
}
await runtime;
if(mathMode){
  document.body.dataset.view='zhenti';
  await import('/assets/js/question-bank-switch.js?v=20260909-math2-papers1');
}else{
  await import('/assets/js/question-cloud-sync-v2.js?v=20260902-qsync4');
  if(source==='zhenti')await import('/assets/js/zhenti-deeplink.js?v=20260828-relaxfix1');
}
