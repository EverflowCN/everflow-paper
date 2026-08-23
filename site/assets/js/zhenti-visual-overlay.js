(()=>{
  const DATA_BASE='/data/zhenti';
  const SUBJECTS={
    ds:{name:'数据结构',short:'DS'},
    co:{name:'计算机组成原理',short:'CO'},
    os:{name:'操作系统',short:'OS'},
    cn:{name:'计算机网络',short:'CN'}
  };
  const cache=new Map();

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function safeSrc(src){
    const s=String(src||'').trim();
    if(!s)return'';
    if(s.startsWith('/data/zhenti/assets/'))return s;
    if(/^data:image\/(?:svg\+xml|png|jpeg|webp);/i.test(s))return s;
    return'';
  }
  async function paper(year){
    if(cache.has(year))return cache.get(year);
    const p=fetch(`${DATA_BASE}/${year}.json?v=20260824a`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
    cache.set(year,p);return p;
  }
  async function item(year,q){const p=await paper(year);return p?.questions?.[String(q)]||null}

  function figureHtml(fig,index){
    const src=safeSrc(fig?.src);if(!src)return'';
    const alt=esc(fig?.alt||`题目图 ${index+1}`),caption=fig?.caption?`<figcaption>${esc(fig.caption)}</figcaption>`:'';
    return `<figure class="question-figure" data-question-figure="${index}"><img src="${esc(src)}" alt="${alt}" loading="lazy" decoding="async">${caption}</figure>`;
  }
  function injectFigures(box,data){
    if(!box||!data||data.verification?.status!=='verified'||!Array.isArray(data.figures))return;
    box.querySelectorAll('[data-question-figure]').forEach(n=>n.remove());
    data.figures.forEach((fig,index)=>{
      const html=figureHtml(fig,index);if(!html)return;
      if(fig.option){
        const option=box.querySelector(`[data-answer-option="${CSS.escape(String(fig.option))}"]`);
        if(option)option.insertAdjacentHTML('beforeend',html);
      }else{
        const stem=box.querySelector('.question-stem');
        if(stem)stem.insertAdjacentHTML('beforeend',html);
      }
    });
  }
  function applyMeta(data,context){
    if(!data||data.verification?.status!=='verified')return;
    const sub=SUBJECTS[data.subject];
    if(context==='modal'){
      const point=document.querySelector('[data-modal-point]');
      const type=document.querySelector('[data-modal-type]');
      if(point&&sub)point.textContent=sub.name;
      if(type&&data.type)type.textContent=data.type==='single'?'选择题':'综合应用题';
    }else{
      const point=document.querySelector('[data-paper-subject]');
      const type=document.querySelector('[data-paper-type]');
      if(point&&sub)point.textContent=`${sub.short} ${sub.name}`;
      if(type&&data.type)type.textContent=data.type==='single'?'选择题':'综合应用题';
    }
  }
  async function syncModal(){
    const modal=document.querySelector('[data-question-modal]');if(!modal||modal.hidden)return;
    const year=Number(document.querySelector('[data-modal-year]')?.textContent),q=Number(document.querySelector('[data-modal-question]')?.textContent);
    if(!year||!q)return;const data=await item(year,q);if(!data)return;
    applyMeta(data,'modal');injectFigures(document.querySelector('[data-question-content]'),data);
  }
  async function syncPaper(){
    const session=document.querySelector('[data-paper-session]');if(!session||session.hidden)return;
    const year=Number(document.querySelector('[data-paper-year]')?.textContent),q=Number(document.querySelector('[data-paper-current]')?.textContent);
    if(!year||!q)return;const data=await item(year,q);if(!data)return;
    applyMeta(data,'paper');injectFigures(document.querySelector('.paper-question-content'),data);
  }
  let queued=false;
  function queueSync(){
    if(queued)return;queued=true;
    queueMicrotask(()=>{queued=false;syncModal();syncPaper()});
  }
  const observer=new MutationObserver(queueSync);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
  window.addEventListener('load',queueSync,{once:true});
})();
