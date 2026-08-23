(()=>{
  const SUBJECT_LABEL={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};
  const SUBJECT_SHORT={ds:'DS',co:'CO',os:'OS',cn:'CN'};
  const seen=new WeakMap();

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function currentContext(box){
    if(box.matches('[data-question-content]')){
      const year=Number(document.querySelector('[data-modal-year]')?.textContent||0);
      const q=Number(document.querySelector('[data-modal-question]')?.textContent||0);
      return {year,q,kind:'modal'};
    }
    if(box.matches('.paper-question-content')){
      const year=Number(document.querySelector('[data-paper-year]')?.textContent||0);
      const q=Number(document.querySelector('[data-paper-current]')?.textContent||0);
      return {year,q,kind:'paper'};
    }
    return null;
  }
  async function enhance(box){
    const ctx=currentContext(box); if(!ctx?.year||!ctx?.q)return;
    const live=box.querySelector('.question-live'); if(!live)return;
    const key=`${ctx.year}-${ctx.q}`; if(seen.get(live)===key)return;
    seen.set(live,key);
    try{
      const r=await fetch(`/data/zhenti/${ctx.year}.json?v=20260824-media`,{cache:'no-store'}); if(!r.ok)return;
      const paper=await r.json(); const item=paper?.questions?.[String(ctx.q)];
      if(!item||item.verification?.status!=='verified')return;
      if(item.subject&&SUBJECT_LABEL[item.subject]){
        if(ctx.kind==='modal'){
          const tag=document.querySelector('[data-modal-point]'); if(tag)tag.textContent=SUBJECT_LABEL[item.subject];
          const type=document.querySelector('[data-modal-type]'); if(type)type.textContent=item.type==='single'?'选择题':'综合应用题';
        }else{
          const tag=document.querySelector('[data-paper-subject]'); if(tag)tag.textContent=`${SUBJECT_SHORT[item.subject]} ${SUBJECT_LABEL[item.subject]}`;
          const type=document.querySelector('[data-paper-type]'); if(type)type.textContent=item.type==='single'?'选择题':'综合应用题';
        }
      }
      if(Array.isArray(item.figures)&&item.figures.length&&!live.querySelector('.question-figures')){
        const wrap=document.createElement('div'); wrap.className='question-figures';
        wrap.innerHTML=item.figures.map(f=>`<figure class="question-figure"><img src="${esc(f.src)}" alt="${esc(f.alt||`${ctx.year}年第${ctx.q}题图`)}" loading="lazy">${f.caption?`<figcaption>${esc(f.caption)}</figcaption>`:''}</figure>`).join('');
        const stem=live.querySelector('.question-stem');
        if(stem)stem.insertAdjacentElement('afterend',wrap); else live.prepend(wrap);
      }
    }catch{}
  }
  const boxes=[document.querySelector('[data-question-content]'),document.querySelector('.paper-question-content')].filter(Boolean);
  boxes.forEach(box=>{
    const obs=new MutationObserver(()=>enhance(box));
    obs.observe(box,{childList:true,subtree:true});
    enhance(box);
  });
})();
