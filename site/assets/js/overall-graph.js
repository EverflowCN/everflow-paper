(()=>{
  const matrix=document.querySelector('[data-overview-matrix]');
  if(!matrix)return;

  const YEARS=Array.from({length:18},(_,i)=>2026-i);
  const QUESTIONS=Array.from({length:47},(_,i)=>i+1);
  const STORAGE_KEY='everflow-408-zhenti-wall-v1';
  const CURRENT_KEY='everflow-408-graph-current-v2';

  function parseKey(key){
    const match=String(key||'').match(/^(\d{4})-(\d{1,2})$/);
    if(!match)return null;
    const year=Number(match[1]),q=Number(match[2]);
    return year>=2009&&year<=2026&&q>=1&&q<=47?{year,q}:null;
  }

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

  function latestKey(records){
    let found='',time=-1;
    for(const [key,record] of Object.entries(records)){
      if(!parseKey(key))continue;
      const next=Date.parse(record?.updatedAt||'')||0;
      if(next>time){time=next;found=key}
    }
    return found;
  }

  function stateFor(record){
    if(record?.correct===true)return'correct';
    if(record?.correct===false)return'wrong';
    if(record?.reviewed)return'reviewed';
    if(record?.draftAnswer)return'draft';
    return'unmarked';
  }

  function stateText(record){
    if(record?.correct===true)return'答对';
    if(record?.correct===false)return'答错';
    if(record?.reviewed)return'已查看';
    if(record?.draftAnswer)return'作答中';
    if(record?.status==='mastered')return'熟练';
    if(record?.status==='fuzzy')return'模糊';
    if(record?.status==='weak')return'不会';
    return'未做';
  }

  let records=loadRecords();
  let current='';
  try{current=localStorage.getItem(CURRENT_KEY)||''}catch{}
  if(!parseKey(current))current=latestKey(records);

  function indexCell(text,className){
    const cell=document.createElement('div');
    cell.className=`overview-index ${className}`;
    cell.textContent=text;
    cell.setAttribute('aria-hidden','true');
    return cell;
  }

  function questionCell(year,q){
    const key=`${year}-${q}`;
    const record=records[key]||{};
    const link=document.createElement('a');
    link.className=`overview-cell ${subjectFor(q)} ${stateFor(record)}${key===current?' current':''}`;
    link.href=`/zhenti/?year=${year}&q=${q}`;
    link.dataset.key=key;
    link.setAttribute('role','gridcell');
    link.setAttribute('aria-label',`${year}年第${q}题，${stateText(record)}`);
    link.title=`${year} · ${q} · ${stateText(record)}`;
    link.addEventListener('click',()=>{
      current=key;
      try{localStorage.setItem(CURRENT_KEY,key)}catch{}
    });

    if(['mastered','fuzzy','weak'].includes(record.status)){
      const dot=document.createElement('span');
      dot.className=`overview-dot ${record.status}`;
      dot.setAttribute('aria-hidden','true');
      link.appendChild(dot);
    }
    return link;
  }

  function render(){
    const fragment=document.createDocumentFragment();
    fragment.appendChild(indexCell('','overview-corner'));
    QUESTIONS.forEach(q=>fragment.appendChild(indexCell(String(q),'overview-q')));
    YEARS.forEach(year=>{
      fragment.appendChild(indexCell(String(year),'overview-year'));
      QUESTIONS.forEach(q=>fragment.appendChild(questionCell(year,q)));
    });
    matrix.replaceChildren(fragment);
  }

  function refresh(){
    records=loadRecords();
    try{current=localStorage.getItem(CURRENT_KEY)||current}catch{}
    if(!parseKey(current))current=latestKey(records);
    render();
  }

  window.addEventListener('pageshow',event=>{if(event.persisted)refresh()});
  window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===CURRENT_KEY)refresh()});
  render();
})();
