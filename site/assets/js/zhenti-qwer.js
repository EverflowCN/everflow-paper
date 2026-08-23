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

  function rewriteQuestionUi(root){
    if(!(root instanceof Element)&&root!==document)return;
    root.querySelectorAll?.('[data-answer-option]').forEach(btn=>{
      const answer=btn.dataset.answerOption;
      const wanted=DISPLAY_KEYS[answer];
      const kbd=btn.querySelector('kbd');
      if(kbd&&wanted&&kbd.textContent!==wanted)kbd.textContent=wanted;
    });

    root.querySelectorAll?.('.shortcut-inline').forEach(el=>{
      const next=el.textContent
        .replace('A/B/C/D 选项','Q/W/E/R 对应 A/B/C/D')
        .replace('R 解析','X 解析');
      if(next!==el.textContent)el.textContent=next;
    });
  }

  function rewriteStaticUi(){
    const toolbarHint=document.querySelector('.whole-toolbar>div:first-child span');
    if(toolbarHint){
      const next=toolbarHint.textContent.replace('A–D / Enter / ← →','Q/W/E/R→A/B/C/D / Enter / ← →');
      if(next!==toolbarHint.textContent)toolbarHint.textContent=next;
    }

    const help=document.querySelector('.shortcut-help-card');
    if(help){
      help.querySelectorAll('.shortcut-grid>div').forEach(row=>{
        const kbd=row.querySelector('kbd');
        const label=row.querySelector('span');
        const text=label?.textContent||'';
        if(text.includes('选择答案')&&kbd){
          if(kbd.textContent!=='Q W E R')kbd.textContent='Q W E R';
          if(label&&label.textContent!=='对应 A B C D')label.textContent='对应 A B C D';
        }
        if(text.includes('查看解析')&&kbd&&kbd.textContent!=='X')kbd.textContent='X';
      });
    }

    document.querySelectorAll('.shortcut-tip').forEach(tip=>{
      const html='电脑刷题：<b>Q/W/E/R</b> 对应 A/B/C/D，<b>Enter</b> 提交，<b>← →</b> 切题，按 <b>?</b> 查看全部快捷键。';
      if(tip.innerHTML!==html)tip.innerHTML=html;
    });
  }

  rewriteQuestionUi(document);
  rewriteStaticUi();
  setTimeout(rewriteStaticUi,120);

  // 只处理“新加入的元素节点”，且所有写入都做幂等检查。
  // 避免旧版全局 refreshLabels() 自己触发 MutationObserver，造成无限循环和页面卡死。
  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      mutation.addedNodes.forEach(node=>{
        if(node.nodeType===Node.ELEMENT_NODE)rewriteQuestionUi(node);
      });
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();