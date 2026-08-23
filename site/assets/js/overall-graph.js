(()=>{
  const grid=document.querySelector('[data-overview-grid]');
  if(!grid)return;

  const STORAGE_KEY='everflow-408-zhenti-wall-v1';
  const CURRENT_KEY='everflow-408-graph-current-v1';

  function subjectFor(q){
    if((q>=1&&q<=10)||q===41||q===42)return'ds';
    if((q>=11&&q<=22)||q===43||q===44)return'co';
    if((q>=23&&q<=32)||q===45||q===46)return'os';
    return'cn';
  }

  function loadRecords(){
    try{
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      return value&&typeof value==='object'?value:{};
    }catch{return{}}
  }

  const records=loadRecords();
  let latest=null;
  for(const [key,record] of Object.entries(records)){
    const match=key.match(/^(\d{4})-(\d{1,2})$/);
    if(!match)continue;
    const q=Number(match[2]);
    if(q<1||q>47)continue;
    const time=Date.parse(record?.updatedAt||'')||0;
    if(!latest||time>latest.time)latest={q,time};
  }

  let current=Number(localStorage.getItem(CURRENT_KEY)||0);
  if(!(current>=1&&current<=47))current=latest?.q||0;

  function newestRecordForQuestion(q){
    let found=null;
    for(const [key,record] of Object.entries(records)){
      if(!key.endsWith(`-${q}`))continue;
      const match=key.match(/^(\d{4})-(\d{1,2})$/);
      if(!match||Number(match[2])!==q)continue;
      const time=Date.parse(record?.updatedAt||'')||0;
      if(!found||time>found.time)found={record,time};
    }
    return found?.record||null;
  }

  function render(){
    grid.replaceChildren();
    for(let q=1;q<=47;q++){
      const cell=document.createElement('button');
      cell.type='button';
      cell.className=`overview-cell ${subjectFor(q)}${q===current?' current':''}`;
      cell.setAttribute('aria-label',`第${q}题`);

      const record=newestRecordForQuestion(q);
      if(record?.status&&['mastered','fuzzy','weak'].includes(record.status)){
        const dot=document.createElement('span');
        dot.className=`overview-dot ${record.status}`;
        dot.setAttribute('aria-hidden','true');
        cell.appendChild(dot);
      }

      cell.addEventListener('click',()=>{
        current=q;
        try{localStorage.setItem(CURRENT_KEY,String(q))}catch{}
        render();
      });
      grid.appendChild(cell);
    }
  }

  render();
})();
