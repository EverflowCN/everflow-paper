(()=>{
  const matrix=document.querySelector('[data-overview-matrix]');
  if(!matrix)return;
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const editableTarget=target=>Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));
  const currentCell=()=>matrix.querySelector('.overview-cell.current')||matrix.querySelector('.overview-cell');

  function moveGrid(cell,key){
    if(cell?.dataset?.row==null||cell?.dataset?.col==null)return false;
    let row=Number(cell.dataset.row),col=Number(cell.dataset.col);
    if(key==='ArrowUp')row--;else if(key==='ArrowDown')row++;else if(key==='ArrowLeft')col--;else if(key==='ArrowRight')col++;else return false;
    if(row<0||col<0)return false;
    let target=matrix.querySelector(`.overview-cell[data-row="${row}"][data-col="${col}"]`);
    if(!target&&(key==='ArrowUp'||key==='ArrowDown')){
      const rowCells=[...matrix.querySelectorAll(`.overview-cell[data-row="${row}"]`)];
      if(!rowCells.length)return false;
      target=rowCells.reduce((best,node)=>Math.abs(Number(node.dataset.col)-col)<Math.abs(Number(best.dataset.col)-col)?node:best,rowCells[0]);
    }
    if(!target||target===cell)return false;target.click();requestAnimationFrame(()=>target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'}));return true;
  }

  function moveTruePaper(cell,key){
    const match=String(cell?.dataset?.key||'').match(/^(\d{4})-(\d{1,2})$/);if(!match)return false;
    let year=Number(match[1]),question=Number(match[2]);
    if(key==='ArrowUp')year=clamp(year+1,2009,2026);else if(key==='ArrowDown')year=clamp(year-1,2009,2026);else if(key==='ArrowLeft')question=clamp(question-1,1,47);else if(key==='ArrowRight')question=clamp(question+1,1,47);else return false;
    const target=matrix.querySelector(`.overview-cell[data-key="${year}-${question}"]`);if(!target||target===cell)return false;target.click();requestAnimationFrame(()=>target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'}));return true;
  }

  document.addEventListener('keydown',event=>{
    if(editableTarget(event.target)||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
    const cell=currentCell();if(moveGrid(cell,event.key)||moveTruePaper(cell,event.key))event.preventDefault();
  });
})();
