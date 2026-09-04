const source=(()=>{try{return localStorage.getItem('everflow-408-bank-source-v1')==='relax1000'?'relax1000':'zhenti'}catch{return'zhenti'}})();

if(source==='zhenti'){
  await import('/assets/js/zhenti-data-overlay.js?v=20260902-accuracy1');
  await import('/assets/js/zhenti-wall.js?v=20260902-accuracy1');
}

await import('/assets/js/site-runtime-v2.js?v=20260903-quality1');
await import('/assets/js/question-cloud-sync-v2.js?v=20260902-qsync4');

if(source==='zhenti')await import('/assets/js/zhenti-deeplink.js?v=20260828-relaxfix1');
