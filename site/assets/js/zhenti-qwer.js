(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;

  const CHOICE_KEYS={Q:'A',W:'B',E:'C',R:'D'};
  const DISPLAY_KEYS={A:'Q',B:'W',C:'E',D:'R'};

  function isTyping(){
    const el=document.activeElement;
    return Boolean(el&&(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.isContentEditable));
  }

  function activeContext(){
    const paper=document.querySelector('[data-paper-session]');
    if(paper&&!paper.hidden)return'paper';
    const modal=document.querySelector('[data-question-modal]');
    if(modal&&!modal.hidden)return'modal';
    return null;
  }

  function currentBox(context){
    return context==='paper'
      ? document.querySelector('.paper-question-content')
      : document.querySelector('[data-question-content]');
  }

  function choose(context,answer){
    const btn=currentBox(context)?.querySelector(`[data-answer-option="${answer}"]`);
    if(btn&&!btn.disabled)btn.click();
  }

  function reveal(context){
    if(context==='modal'){
      document.querySelector('[data-tool="analysis"]')?.click();
      return;
    }
    currentBox(context)?.querySelector('[data-answer-reveal]')?.click();
  }

  // 捕获阶段优先处理，避免 R 继续触发旧版“解析”快捷键。
  document.addEventListener('keydown',e=>{
    if(isTyping())return;
    const context=activeContext();
    if(!context)return;
    const upper=String(e.key||'').toUpperCase();
    if(CHOICE_KEYS[upper]){
      e.preventDefault();
      e.stopImmediatePropagation();
      choose(context,CHOICE_KEYS[upper]);
      return;
    }
    if(upper==='X'){
      e.preventDefault();
      e.stopImmediatePropagation();
      reveal(context);
    }
  },true);

  function refreshLabels(root=document){
    root.querySelectorAll?.('[data-answer-option]').forEach(btn=>{
      const answer=btn.dataset.answerOption;
      const kbd=btn.querySelector('kbd');
      if(kbd&&DISPLAY_KEYS[answer])kbd.textContent=DISPLAY_KEYS[answer];
    });

    root.querySelectorAll?.('.shortcut-inline').forEach(el=>{
      el.textContent=el.textContent
        .replace('A/B/C/D 选项','Q/W/E/R 对应 A/B/C/D')
        .replace('R 解析','X 解析');
    });

    const help=document.querySelector('.shortcut-help-card');
    if(help){
      help.querySelectorAll('.shortcut-grid>div').forEach(row=>{
        const kbd=row.querySelector('kbd');
        const text=row.querySelector('span')?.textContent||'';
        if(text.includes('选择答案')&&kbd){kbd.textContent='Q W E R';row.querySelector('span').textContent='对应 A B C D'}
        if(text.includes('查看解析')&&kbd)kbd.textContent='X';
      });
    }

    document.querySelectorAll('.shortcut-tip').forEach(tip=>{
      tip.innerHTML='电脑刷题：<b>Q/W/E/R</b> 对应 A/B/C/D，<b>Enter</b> 提交，<b>← →</b> 切题，按 <b>?</b> 查看全部快捷键。';
    });
  }

  refreshLabels();
  const observer=new MutationObserver(mutations=>{
    for(const m of mutations){
      if(m.addedNodes.length){refreshLabels();break}
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();