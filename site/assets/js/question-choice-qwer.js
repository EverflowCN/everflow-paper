import('/assets/js/question-cloud-sync-v2.js?v=20260902-qsync2').catch(error=>console.warn('Question cloud sync unavailable',error));

(()=>{
  const ANSWER_BY_KEY={Q:'A',W:'B',E:'C',R:'D'};
  const editable=target=>Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));
  const enabled=button=>Boolean(button&&!button.disabled&&button.getAttribute('aria-disabled')!=='true');

  function readerAction(answer){
    if(document.body?.dataset?.view!=='relax-reader')return false;
    const button=document.querySelector(`[data-reader-option="${answer}"]`);
    if(enabled(button))button.click();
    return true;
  }

  function graphAction(answer){
    if(document.body?.dataset?.view!=='graph')return false;
    const drawer=document.querySelector('[data-question-drawer]');
    if(!drawer||drawer.hidden)return false;
    const button=drawer.querySelector(`[data-graph-choice="${answer}"]`);
    if(enabled(button))button.click();
    return true;
  }

  function reveal(){
    if(document.body?.dataset?.view==='relax-reader'){
      document.querySelector('[data-reader-analysis]')?.click();
      return true;
    }
    if(document.body?.dataset?.view==='graph'){
      const drawer=document.querySelector('[data-question-drawer]');
      if(!drawer||drawer.hidden)return false;
      const button=document.querySelector('[data-drawer-answer]');
      if(button&&!button.hidden&&!button.disabled)button.click();
      return true;
    }
    return false;
  }

  document.addEventListener('keydown',event=>{
    if(editable(event.target)||event.altKey||event.ctrlKey||event.metaKey)return;
    const key=String(event.key||'').toUpperCase();
    const answer=ANSWER_BY_KEY[key];
    if(answer){
      const active=readerAction(answer)||graphAction(answer);
      if(active){event.preventDefault();event.stopImmediatePropagation()}
      return;
    }
    if(key==='X'&&reveal()){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);

  // 模块脚本执行完成后再统一静态提示；不观察题目 DOM，避免 Safari 自触发循环。
  window.addEventListener('load',()=>{
    const tip=document.querySelector('.graph-shortcuts');
    if(tip)tip.textContent='方向键移动 · Enter 打开/提交 · Q/W/E/R→A/B/C/D · 1/2/3 状态 · X 解析 · Esc 关闭';
  },{once:true});
})();
