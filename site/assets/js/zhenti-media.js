(()=>{
  const SUBJECT_LABEL={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};
  const SUBJECT_SHORT={ds:'DS',co:'CO',os:'OS',cn:'CN'};
  const CSYANKU_COMMIT='62a608c6b9103d11b5dc2d5ce8383d4adf0c49e9';
  const seen=new WeakMap();

  function currentContext(box){
    if(box.matches('[data-question-content]')){
      return {
        year:Number(document.querySelector('[data-modal-year]')?.textContent||0),
        q:Number(document.querySelector('[data-modal-question]')?.textContent||0),
        kind:'modal'
      };
    }
    if(box.matches('.paper-question-content')){
      return {
        year:Number(document.querySelector('[data-paper-year]')?.textContent||0),
        q:Number(document.querySelector('[data-paper-current]')?.textContent||0),
        kind:'paper'
      };
    }
    return null;
  }

  function safeSrc(src){
    const value=String(src||'').trim();
    if(!value)return'';
    if(value.startsWith('/data/zhenti/assets/'))return value;
    if(/^https:\/\/raw\.githubusercontent\.com\//i.test(value))return value;
    if(/^data:image\/(?:png|jpeg|webp|svg\+xml);/i.test(value))return value;
    return'';
  }

  function originalFallback(ctx){
    const q=String(ctx.q).padStart(2,'0');
    return `https://raw.githubusercontent.com/ogas1024/CSYanKu/${CSYANKU_COMMIT}/content/_images/qbank/408%E7%9C%9F%E9%A2%98/${ctx.year}/408%E7%9C%9F%E9%A2%98-${ctx.year}-T${q}.png`;
  }

  function applyMeta(item,kind){
    const subject=item?.subject;
    if(!subject||!SUBJECT_LABEL[subject])return;
    if(kind==='modal'){
      const point=document.querySelector('[data-modal-point]');
      const type=document.querySelector('[data-modal-type]');
      if(point)point.textContent=SUBJECT_LABEL[subject];
      if(type)type.textContent=item.type==='single'?'选择题':'综合应用题';
      return;
    }
    const point=document.querySelector('[data-paper-subject]');
    const type=document.querySelector('[data-paper-type]');
    if(point)point.textContent=`${SUBJECT_SHORT[subject]} ${SUBJECT_LABEL[subject]}`;
    if(type)type.textContent=item.type==='single'?'选择题':'综合应用题';
  }

  function makeFigure(fig,ctx,option=false){
    const src=safeSrc(fig?.src);
    if(!src)return null;
    const wrap=document.createElement(option?'div':'figure');
    wrap.className=option?'question-figure question-option-figure':'question-figure';
    wrap.dataset.mediaGenerated='1';

    const img=document.createElement('img');
    img.src=src;
    img.alt=String(fig?.alt||`${ctx.year}年第${ctx.q}题图`);
    img.loading='lazy';
    img.decoding='async';
    img.draggable=false;
    img.addEventListener('error',()=>{
      if(img.dataset.fallbackTried)return;
      img.dataset.fallbackTried='1';
      const fallback=originalFallback(ctx);
      if(fallback!==img.src)img.src=fallback;
    });
    wrap.appendChild(img);

    if(fig?.caption){
      const caption=document.createElement(option?'span':'figcaption');
      caption.className=option?'question-option-caption':'';
      caption.textContent=String(fig.caption);
      wrap.appendChild(caption);
    }
    return wrap;
  }

  function renderFigures(live,item,ctx){
    live.querySelectorAll('[data-media-generated="1"]').forEach(node=>node.remove());
    const figures=Array.isArray(item?.figures)?item.figures:[];
    if(!figures.length)return;

    let generalWrap=null;
    for(const fig of figures){
      const option=fig?.option?String(fig.option):'';
      const node=makeFigure(fig,ctx,Boolean(option));
      if(!node)continue;

      if(option){
        const button=[...live.querySelectorAll('[data-answer-option]')]
          .find(el=>String(el.dataset.answerOption||'')===option);
        if(button){button.appendChild(node);continue;}
      }

      if(!generalWrap){
        generalWrap=document.createElement('div');
        generalWrap.className='question-figures';
        generalWrap.dataset.mediaGenerated='1';
      }
      generalWrap.appendChild(node);
    }

    if(generalWrap?.childElementCount){
      const stem=live.querySelector('.question-stem');
      if(stem)stem.insertAdjacentElement('afterend',generalWrap);
      else live.prepend(generalWrap);
    }
  }

  async function loadPaper(year){
    if(window.EverflowZhentiData?.loadPaper)return window.EverflowZhentiData.loadPaper(String(year));
    const response=await fetch(`/data/zhenti/${year}.json?v=20260824-full5`,{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function enhance(box){
    const ctx=currentContext(box);
    const live=box.querySelector('.question-live');
    if(!ctx?.year||!ctx?.q||!live)return;

    const key=`${ctx.year}-${ctx.q}`;
    if(seen.get(live)===key)return;
    seen.set(live,key);

    try{
      let paper=await loadPaper(ctx.year);
      let item=paper?.questions?.[String(ctx.q)];
      if((!item||item.verification?.status!=='verified')&&window.EverflowZhentiData?.loadPaper){
        paper=await window.EverflowZhentiData.loadPaper(String(ctx.year),{force:true});
        item=paper?.questions?.[String(ctx.q)];
      }
      if(!item||item.verification?.status!=='verified')throw new Error('question unavailable');
      applyMeta(item,ctx.kind);
      renderFigures(live,item,ctx);
    }catch{
      seen.delete(live);
    }
  }

  const boxes=[
    document.querySelector('[data-question-content]'),
    document.querySelector('.paper-question-content')
  ].filter(Boolean);

  boxes.forEach(box=>{
    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(node.nodeType!==Node.ELEMENT_NODE)continue;
          if(node.matches?.('.question-live')||node.querySelector?.('.question-live')){
            enhance(box);
            return;
          }
        }
      }
    });
    observer.observe(box,{childList:true,subtree:true});
    enhance(box);
  });

  window.addEventListener('pageshow',()=>boxes.forEach(enhance));
})();