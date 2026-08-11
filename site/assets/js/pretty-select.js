(()=>{
  const chevron='<svg class="ui-icon sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6l6 -6"/></svg>';
  const check='<svg class="ui-icon sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5l10 -10"/></svg>';
  const hosts=new Set();

  function closeAll(except){hosts.forEach(h=>{if(h!==except)close(h)})}
  function close(host){host.classList.remove('open');const t=host.querySelector('.pretty-select-trigger');if(t)t.setAttribute('aria-expanded','false')}
  function open(host){closeAll(host);host.classList.add('open');const t=host.querySelector('.pretty-select-trigger');if(t)t.setAttribute('aria-expanded','true')}
  function sync(host){
    const select=host.querySelector('select');if(!select)return;
    const value=host.querySelector('.pretty-select-value-text');const options=[...host.querySelectorAll('.pretty-select-option')];
    const selected=select.options[select.selectedIndex];if(value)value.textContent=selected?.textContent||'请选择';
    options.forEach(btn=>{const yes=btn.dataset.value===select.value;btn.classList.toggle('is-selected',yes);btn.setAttribute('aria-selected',yes?'true':'false')});
  }
  function choose(host,value){
    const select=host.querySelector('select');if(!select)return;
    if(select.value!==value){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}))}
    sync(host);close(host);host.querySelector('.pretty-select-trigger')?.focus();
  }
  function build(select){
    if(select.dataset.prettyReady==='1')return;
    select.dataset.prettyReady='1';select.classList.add('pretty-select-native');
    const host=document.createElement('div');host.className='pretty-select-host';select.parentNode.insertBefore(host,select);host.appendChild(select);hosts.add(host);
    const trigger=document.createElement('button');trigger.type='button';trigger.className='pretty-select-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
    trigger.innerHTML=`<span class="pretty-select-value"><span class="pretty-select-value-text"></span></span><span class="pretty-select-chevron">${chevron}</span>`;
    const menu=document.createElement('div');menu.className='pretty-select-menu';menu.setAttribute('role','listbox');
    [...select.options].forEach(opt=>{
      const btn=document.createElement('button');btn.type='button';btn.className='pretty-select-option';btn.dataset.value=opt.value;btn.setAttribute('role','option');btn.disabled=opt.disabled;
      const label=document.createElement('span');label.textContent=opt.textContent;const mark=document.createElement('span');mark.className='pretty-select-check';mark.innerHTML=check;btn.append(label,mark);
      btn.addEventListener('click',()=>choose(host,opt.value));menu.appendChild(btn);
    });
    host.append(trigger,menu);sync(host);
    trigger.addEventListener('click',()=>host.classList.contains('open')?close(host):open(host));
    trigger.addEventListener('keydown',e=>{
      if(!['ArrowDown','ArrowUp','Enter',' '].includes(e.key))return;
      if(!host.classList.contains('open')){e.preventDefault();open(host)}
      const items=[...menu.querySelectorAll('.pretty-select-option:not(:disabled)')];let i=items.findIndex(x=>x.classList.contains('is-active'));if(i<0)i=items.findIndex(x=>x.classList.contains('is-selected'));
      if(e.key==='ArrowDown'){e.preventDefault();i=Math.min(items.length-1,i+1);items.forEach(x=>x.classList.remove('is-active'));items[i]?.classList.add('is-active');items[i]?.scrollIntoView({block:'nearest'})}
      if(e.key==='ArrowUp'){e.preventDefault();i=Math.max(0,i-1);items.forEach(x=>x.classList.remove('is-active'));items[i]?.classList.add('is-active');items[i]?.scrollIntoView({block:'nearest'})}
      if((e.key==='Enter'||e.key===' ')&&host.classList.contains('open')){const active=items.find(x=>x.classList.contains('is-active'))||items.find(x=>x.classList.contains('is-selected'));if(active){e.preventDefault();choose(host,active.dataset.value)}}
    });
    select.addEventListener('change',()=>sync(host));
  }
  function refresh(root=document){root.querySelectorAll?.('select[data-pretty-select]').forEach(select=>{build(select);const host=select.closest('.pretty-select-host');if(host)sync(host)})}
  document.addEventListener('click',e=>{if(!e.target.closest('.pretty-select-host'))closeAll()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
  new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1){if(n.matches?.('select[data-pretty-select]'))build(n);refresh(n)}}))).observe(document.documentElement,{childList:true,subtree:true});
  window.EveraPrettySelect={refresh};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh());else refresh();
})();
