(()=>{
  const matrix=document.querySelector('[data-overview-matrix]');
  if(!matrix)return;

  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const editableTarget=target=>Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));

  function currentCell(){
    return matrix.querySelector('.overview-cell.current')||matrix.querySelector('.overview-cell');
  }

  function moveByKey(key){
    const cell=currentCell();
    const match=String(cell?.dataset?.key||'').match(/^(\d{4})-(\d{1,2})$/);
    if(!match)return false;

    let year=Number(match[1]);
    let question=Number(match[2]);
    if(key==='ArrowUp')year=clamp(year+1,2009,2026);
    else if(key==='ArrowDown')year=clamp(year-1,2009,2026);
    else if(key==='ArrowLeft')question=clamp(question-1,1,47);
    else if(key==='ArrowRight')question=clamp(question+1,1,47);
    else return false;

    const target=matrix.querySelector(`.overview-cell[data-key="${year}-${question}"]`);
    if(!target||target===cell)return false;
    target.click();
    requestAnimationFrame(()=>target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'}));
    return true;
  }

  document.addEventListener('keydown',event=>{
    if(editableTarget(event.target))return;
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
    if(moveByKey(event.key))event.preventDefault();
  });
})();
