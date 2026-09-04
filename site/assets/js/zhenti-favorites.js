(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;

  const WALL_KEY='everflow-408-zhenti-wall-v1';
  const ACTIVE_KEY='everflow-408-favorites-active';
  const SRS_ACTIVE_KEY='everflow-408-srs-active';
  const DATA_BASE='/data/zhenti';
  const SUBJECTS={
    all:{name:'全部收藏',short:'ALL'},
    ds:{name:'数据结构',short:'DS'},
    co:{name:'计算机组成原理',short:'CO'},
    os:{name:'操作系统',short:'OS'},
    cn:{name:'计算机网络',short:'CN'}
  };

  if(!document.querySelector('link[href*="zhenti-favorites.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/zhenti-favorites.css?v=20260823a';document.head.appendChild(css)}

  const bar=document.querySelector('.wall-subject-bar');
  const wholeHome=document.querySelector('[data-full-paper-home]');
  const workspace=document.querySelector('[data-subject-workspace]');
  const srsHome=document.querySelector('[data-srs-home]');
  if(!bar||!wholeHome||!workspace)return;

  function readRecords(){
    try{const v=JSON.parse(localStorage.getItem(WALL_KEY)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}
  }
  function saveRecords(records){
    const value=JSON.stringify(records);localStorage.setItem(WALL_KEY,value);
    try{window.dispatchEvent(new StorageEvent('storage',{key:WALL_KEY,newValue:value,storageArea:localStorage}))}catch{}
  }
  function parseId(id){const m=String(id||'').match(/^(\d{4})-(\d+)$/);return m?{year:Number(m[1]),q:Number(m[2])}:null}
  function subjectForQ(q){if((q>=1&&q<=10)||q===41||q===42)return'ds';if((q>=11&&q<=22)||q===43||q===44)return'co';if((q>=23&&q<=32)||q===45||q===46)return'os';return'cn'}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
  function statusText(r){if(r.status==='mastered')return'熟练';if(r.status==='fuzzy')return'模糊';if(r.status==='weak')return'不会';return'未标记'}
  function answerText(r){if(r.correct===true)return'答对';if(r.correct===false)return'答错';if(r.draftAnswer)return'未提交';if(r.reviewed)return'已查看';return'未作答'}
  function meaningful(r){return Boolean(r.status||r.note||r.answer||r.draftAnswer||r.reviewed||r.favorite||r.attempts||r.correctCount||r.timeSpent)}

  let tab=bar.querySelector('[data-favorites-tab]');
  if(!tab){tab=document.createElement('button');tab.type='button';tab.className='subject-tab favorites-tab';tab.dataset.favoritesTab='';tab.dataset.count='0';tab.textContent='收藏夹';const divider=bar.querySelector('.subject-divider');if(divider)bar.insertBefore(tab,divider);else bar.appendChild(tab)}

  const home=document.createElement('section');
  home.className='favorites-home';home.dataset.favoritesHome='';home.hidden=true;
  home.innerHTML=`
    <section class="favorites-hero">
      <div><div class="eyebrow">FAVORITES · 408 PAST PAPERS</div><h1>我的收藏</h1><p>这里集中显示你在分科刷题、整套真题里按 ☆ 或快捷键 F 收藏的题。收藏状态与原题共用，不会复制题目。</p></div>
      <div class="favorites-stats"><div><strong data-fav-total>0</strong><span>收藏总数</span></div><div><strong data-fav-wrong>0</strong><span>其中答错</span></div><div><strong data-fav-weak>0</strong><span>其中薄弱</span></div></div>
    </section>
    <section class="favorites-toolbar">
      <div class="favorites-filters">${Object.entries(SUBJECTS).map(([k,v])=>`<button type="button" class="favorites-filter${k==='all'?' active':''}" data-fav-filter="${k}">${v.name}</button>`).join('')}</div>
      <label class="favorites-sort">排序 <select data-fav-sort><option value="recent">最近收藏</option><option value="year-desc">年份从新到旧</option><option value="year-asc">年份从旧到新</option><option value="wrong-first">答错优先</option></select></label>
    </section>
    <section class="favorites-list" data-fav-list><div class="favorites-loading">正在读取收藏题目…</div></section>`;
  const anchor=srsHome||wholeHome;anchor.after(home);

  const favList=home.querySelector('[data-fav-list]');
  const totalEl=home.querySelector('[data-fav-total]');
  const wrongEl=home.querySelector('[data-fav-wrong]');
  const weakEl=home.querySelector('[data-fav-weak]');
  const filters=[...home.querySelectorAll('[data-fav-filter]')];
  const sortSelect=home.querySelector('[data-fav-sort]');
  const cache=new Map();
  let filter='all',renderToken=0;

  function rows(){
    return Object.entries(readRecords()).flatMap(([id,r])=>{
      if(!r?.favorite)return[];const p=parseId(id);if(!p)return[];const subject=subjectForQ(p.q);return[{id,...p,subject,record:r}];
    });
  }
  async function paper(year){
    if(cache.has(year))return cache.get(year);
    const p=fetch(`${DATA_BASE}/${year}.json?v=20260823fav`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);cache.set(year,p);return p;
  }
  async function itemFor(row){const p=await paper(row.year);return p?.questions?.[String(row.q)]||null}

  function updateTabCount(){tab.dataset.count=String(rows().length)}
  function decorateMatrix(){
    const records=readRecords();document.querySelectorAll('.matrix-q[data-year][data-q]').forEach(btn=>{
      const id=`${btn.dataset.year}-${btn.dataset.q}`;btn.classList.toggle('is-favorite',Boolean(records[id]?.favorite));
    });
  }
  const matrixBody=document.querySelector('[data-matrix-body]');
  if(matrixBody){
    new MutationObserver(()=>decorateMatrix()).observe(matrixBody,{childList:true,subtree:true});
    decorateMatrix();
  }

  function sortRows(list){
    const mode=sortSelect.value;
    return list.sort((a,b)=>{
      if(mode==='year-desc')return b.year-a.year||b.q-a.q;
      if(mode==='year-asc')return a.year-b.year||a.q-b.q;
      if(mode==='wrong-first')return Number(b.record.correct===false)-Number(a.record.correct===false)||b.year-a.year||b.q-a.q;
      return new Date(b.record.updatedAt||0)-new Date(a.record.updatedAt||0)||b.year-a.year||b.q-a.q;
    });
  }

  function unfavorite(id){
    const records=readRecords(),r=records[id];if(!r)return;
    const next={...r,favorite:false,updatedAt:new Date().toISOString()};
    if(meaningful(next))records[id]=next;else delete records[id];
    saveRecords(records);updateTabCount();decorateMatrix();render();
    window.EveraUI?.toast?.('已从收藏夹移除',{type:'success',title:'收藏已更新',duration:1800});
  }

  function openOriginal(row){
    deactivate();
    localStorage.removeItem(SRS_ACTIVE_KEY);
    const subjectBtn=bar.querySelector(`[data-main-subject="${row.subject}"]`);
    subjectBtn?.click();
    document.querySelector('[data-range="all"]')?.click();
    const open=()=>{
      const btn=document.querySelector(`.matrix-q[data-year="${row.year}"][data-q="${row.q}"]`);
      if(btn)btn.click();else window.EveraUI?.toast?.('暂时无法定位这道题，请切到对应年份查看。',{type:'error',title:'定位失败'});
    };
    requestAnimationFrame(()=>setTimeout(open,40));
  }

  async function render(){
    const token=++renderToken,all=rows();updateTabCount();
    totalEl.textContent=String(all.length);wrongEl.textContent=String(all.filter(x=>x.record.correct===false).length);weakEl.textContent=String(all.filter(x=>x.record.status==='weak'||x.record.status==='fuzzy').length);
    let list=all.filter(x=>filter==='all'||x.subject===filter);list=sortRows(list);
    if(!list.length){favList.innerHTML=`<div class="favorites-empty"><div>☆</div><h2>${all.length?'这个科目还没有收藏':'还没有收藏题目'}</h2><p>打开任意已核验真题，点击“☆ 收藏”或按 <kbd>F</kbd>，这里就会自动出现。</p></div>`;return}
    favList.innerHTML='<div class="favorites-loading">正在读取收藏题目…</div>';
    const data=await Promise.all(list.map(async row=>({...row,item:await itemFor(row)})));if(token!==renderToken)return;
    favList.innerHTML=data.map(row=>{
      const item=row.item,verified=item?.verification?.status==='verified';
      const stem=verified?esc(item.stem):'该题当前未加载到已核验题干，可进入原题位置查看状态。';
      const note=row.record.note?`<div class="favorite-note">笔记：${esc(row.record.note)}</div>`:'';
      const attempts=Number(row.record.attempts||0),correctCount=Number(row.record.correctCount||0),wrong=Math.max(0,attempts-correctCount),errorRate=attempts?Math.round(wrong/attempts*100):null;
      return `<article class="favorite-card" data-fav-id="${row.id}"><header><div><span class="favorite-star">★</span><strong>${row.year} · 第 ${row.q} 题</strong><span class="favorite-subject">${SUBJECTS[row.subject].short} ${SUBJECTS[row.subject].name}</span></div><button type="button" class="favorite-remove" data-fav-remove="${row.id}" title="取消收藏">★ 已收藏</button></header><div class="favorite-stem">${stem}</div><div class="favorite-meta"><span class="${row.record.correct===false?'bad':row.record.correct===true?'good':''}">${answerText(row.record)}</span><span>${statusText(row.record)}</span>${errorRate==null?'':`<span>错误率 ${errorRate}% · ${wrong}/${attempts}</span>`}${row.record.favorite?'<span>收藏中</span>':''}</div>${note}<footer><button type="button" class="favorite-open" data-fav-open="${row.id}">打开原题 →</button></footer></article>`;
    }).join('');
    favList.querySelectorAll('[data-fav-remove]').forEach(btn=>btn.addEventListener('click',()=>unfavorite(btn.dataset.favRemove)));
    favList.querySelectorAll('[data-fav-open]').forEach(btn=>{const row=list.find(x=>x.id===btn.dataset.favOpen);btn.addEventListener('click',()=>row&&openOriginal(row))});
  }

  function activate(){
    localStorage.setItem(ACTIVE_KEY,'1');localStorage.removeItem(SRS_ACTIVE_KEY);
    bar.querySelectorAll('[data-main-subject]').forEach(btn=>btn.classList.remove('active'));
    bar.querySelector('[data-srs-tab]')?.classList.remove('active');tab.classList.add('active');
    workspace.hidden=true;wholeHome.hidden=true;if(srsHome)srsHome.hidden=true;home.hidden=false;
    render();
  }
  function deactivate(){localStorage.removeItem(ACTIVE_KEY);tab.classList.remove('active');home.hidden=true}

  tab.addEventListener('click',activate);
  bar.querySelectorAll('[data-main-subject]').forEach(btn=>btn.addEventListener('click',deactivate));
  bar.querySelector('[data-srs-tab]')?.addEventListener('click',deactivate);
  filters.forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.favFilter||'all';filters.forEach(x=>x.classList.toggle('active',x===btn));render()}));
  sortSelect.addEventListener('change',render);
  window.addEventListener('storage',e=>{if(e.key===WALL_KEY){updateTabCount();decorateMatrix();if(!home.hidden)render()}});

  updateTabCount();decorateMatrix();
  if(localStorage.getItem(ACTIVE_KEY)==='1')setTimeout(activate,0);
})();
