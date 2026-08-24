(()=>{
  const session=document.querySelector('[data-paper-session]');
  const grid=document.querySelector('[data-paper-answer-grid]');
  const current=document.querySelector('[data-paper-current]');
  if(!session||!grid||!current)return;

  function isTyping(){
    const el=document.activeElement;
    if(!el)return false;
    return el.matches?.('input,textarea,select,[contenteditable="true"]');
  }

  function jump(delta){
    const q=Number(current.textContent||0);
    if(!Number.isInteger(q))return;
    const next=q+delta;
    if(next<1||next>47)return;
    const target=grid.querySelector(`[data-paper-jump="${next}"]`);
    if(!target)return;
    target.click();
    requestAnimationFrame(()=>target.scrollIntoView?.({block:'nearest',inline:'nearest'}));
  }

  document.addEventListener('keydown',event=>{
    if(session.hidden||isTyping()||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.key==='ArrowUp'){
      event.preventDefault();
      jump(-5);
    }else if(event.key==='ArrowDown'){
      event.preventDefault();
      jump(5);
    }
  });
})();
