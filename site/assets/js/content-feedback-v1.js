(()=>{
  'use strict';
  if(window.__EVERFLOW_CONTENT_FEEDBACK__)return;window.__EVERFLOW_CONTENT_FEEDBACK__=true;
  const body=document.body,view=body.dataset.view||'';
  const visible=element=>Boolean(element&&!element.hidden&&element.getClientRects().length);
  const context=()=>{
    let bank='site',entityId='',title=document.title;
    if(view==='zhenti'){
      bank='zhenti';const modal=document.querySelector('[data-question-modal]'),paper=document.querySelector('[data-paper-session]');
      if(visible(modal)){const year=document.querySelector('[data-modal-year]')?.textContent?.trim(),question=document.querySelector('[data-modal-question]')?.textContent?.trim();entityId=year&&question?`${year}-${question}`:'';title=document.querySelector('#modal-title')?.textContent?.trim()||title}
      else if(visible(paper)){const year=document.querySelector('[data-paper-year]')?.textContent?.trim(),question=document.querySelector('[data-paper-current]')?.textContent?.trim();entityId=year&&question?`${year}-${question}`:'';title=`${year||''} 年第 ${question||''} 题`}
    }else if(view==='relax-reader'){bank='relax1000';entityId=new URLSearchParams(location.search).get('id')||'';title=document.querySelector('.relax-reader-meta strong')?.textContent?.trim()||title}
    else if(view==='relax'){bank=body.querySelector('[data-paper-builder]')?.dataset.feedbackBank||'site';entityId=body.querySelector('[data-paper-builder]')?.dataset.feedbackEntity||'';title=document.querySelector('[data-paper-title]')?.textContent?.trim()||title}
    else if(view==='graph'){bank=body.dataset.graphSource==='relax1000'?'relax1000':'zhenti';title=document.querySelector('[data-drawer-title]')?.textContent?.trim()||title;entityId=document.querySelector('[data-question-drawer]')?.dataset.feedbackEntity||title}
    return{bank,entityId,title,view,url:`${location.pathname}${location.search}`};
  };
  const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/css/content-feedback-v1.css?v=20260903-quality1';document.head.appendChild(style);
  const button=document.createElement('button');button.type='button';button.className='content-feedback-fab';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg><span>题目纠错</span>';button.setAttribute('aria-label','提交题目纠错');body.appendChild(button);
  const overlay=document.createElement('div');overlay.className='content-feedback-overlay';overlay.hidden=true;overlay.innerHTML=`<section class="content-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="content-feedback-title"><header><div><span>CONTENT FEEDBACK</span><h2 id="content-feedback-title">题目纠错</h2><p data-feedback-context></p></div><button type="button" data-feedback-close aria-label="关闭">×</button></header><form data-feedback-form><label><span>问题类型</span><select name="category"><option value="answer">答案有误</option><option value="stem">题干有误</option><option value="options">选项有误</option><option value="explanation">解析有误</option><option value="image">图片问题</option><option value="link">链接问题</option><option value="other">其他问题</option></select></label><label><span>具体说明</span><textarea name="description" rows="6" minlength="8" maxlength="2000" required placeholder="请描述哪里有问题，以及你认为正确的内容（至少 8 个字）"></textarea><small><b data-feedback-length>0</b> / 2000</small></label><p class="content-feedback-hint">提交时会附带当前题号和页面位置，便于管理员快速定位。</p><div class="content-feedback-actions"><button type="button" data-feedback-close>取消</button><button type="submit" class="primary">提交纠错</button></div><p class="content-feedback-message" data-feedback-message></p></form></section>`;body.appendChild(overlay);
  const form=overlay.querySelector('form'),description=form.elements.description,message=overlay.querySelector('[data-feedback-message]');let current=null;
  const close=()=>{overlay.hidden=true;document.documentElement.classList.remove('content-feedback-open');message.textContent='';message.className='content-feedback-message'};
  const open=()=>{current=context();overlay.querySelector('[data-feedback-context]').textContent=current.entityId?`${current.title} · ${current.entityId}`:current.title;overlay.hidden=false;document.documentElement.classList.add('content-feedback-open');setTimeout(()=>description.focus(),30)};
  button.addEventListener('click',open);overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-feedback-close]'))close()});
  description.addEventListener('input',()=>overlay.querySelector('[data-feedback-length]').textContent=String(description.value.length));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!overlay.hidden)close()});
  form.addEventListener('submit',async event=>{
    event.preventDefault();const submit=form.querySelector('[type="submit"]'),detail=description.value.trim();
    if(detail.length<8){message.textContent='请至少填写 8 个字，帮助管理员准确定位。';message.className='content-feedback-message error';return}
    submit.disabled=true;submit.textContent='提交中…';message.textContent='';
    try{
      await import('/assets/js/cloud-config.js?v=20260903-quality1');await import('/assets/js/cloud.js?v=20260903-quality1');await window.EveraCloud?.ready;
      const user=await window.EveraCloud?.getUser();if(!user)throw new Error('login_required');
      await window.EveraCloud.contentFeedback('create',{bank:current.bank,entityId:current.entityId,pagePath:current.url,category:form.elements.category.value,description:detail,context:{title:current.title,view:current.view,url:current.url}});
      description.value='';overlay.querySelector('[data-feedback-length]').textContent='0';close();window.EveraUI?.toast?.('纠错已提交，管理员会在工单中心处理。',{type:'success',title:'感谢反馈'})
    }catch(error){const key=String(error?.message||'');message.innerHTML=key==='login_required'?'请先登录后提交。<a href="/account/">前往登录</a>':key==='rate_limited'?'提交较频繁，请稍后再试。':'提交失败，请检查网络后重试。';message.className='content-feedback-message error'}finally{submit.disabled=false;submit.textContent='提交纠错'}
  });
})();
