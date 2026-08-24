(()=>{
  if(!document.querySelector('link[data-interaction-guard]')){
    const guard=document.createElement('link');guard.rel='stylesheet';guard.href='/assets/css/interaction-guard.css?v=20260824-privacy2';guard.dataset.interactionGuard='';document.head.appendChild(guard);
  }
  const path=location.pathname.replace(/\/{2,}/g,'/');
  const items=[
    {href:'/',label:'首页',match:p=>p==='/'},
    {href:'/study/',label:'学习',match:p=>p.startsWith('/study/')||p.startsWith('/408/')},
    {href:'/zhenti/',label:'题库',match:p=>p.startsWith('/zhenti/')},
    {href:'/relax/',label:'组卷',match:p=>p.startsWith('/relax/')},
    {href:'/graph/',label:'整体图谱',match:p=>p.startsWith('/graph/')},
    {href:'/links/',label:'资源',match:p=>p.startsWith('/links/')},
    {href:'/archive/',label:'通知通告',match:p=>p.startsWith('/archive/')||p.startsWith('/notice/')||p.startsWith('/post/')},
    {href:'/account/',label:'账户',match:p=>p.startsWith('/account/')}
  ];
  const read=key=>{try{return localStorage.getItem(key)}catch{return null}};
  const write=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
  const membershipHidden=()=>read('everflow-membership-nav-hidden-v1')==='1';
  const closeIcon=()=>window.EveraIcons?.markup?.('close')||'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function build(container,mobile=false){
    if(!container)return;
    const theme=container.querySelector('[data-theme]');
    const frag=document.createDocumentFragment();
    for(const item of items){
      const a=document.createElement('a');
      a.href=item.href;a.textContent=item.label;
      if(item.match(path))a.classList.add('active');
      frag.appendChild(a);
    }
    if(theme)frag.appendChild(theme);
    container.replaceChildren(frag);

    const account=[...container.querySelectorAll('a')].find(a=>new URL(a.href,location.href).pathname.replace(/\/+$/,'')==='/account');
    if(!account)return;
    const wrap=document.createElement(mobile?'div':'span');
    wrap.className='membership-nav-entry'+(membershipHidden()?' is-hidden':'');
    const link=document.createElement('a');
    link.href='/membership/';link.textContent='购买会员';
    if(path.startsWith('/membership/'))link.classList.add('active');
    const close=document.createElement('button');
    close.type='button';close.className='membership-nav-close ui-icon-only';close.innerHTML=closeIcon();close.setAttribute('aria-label','关闭购买会员入口');close.title='关闭';
    close.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      write('everflow-membership-nav-hidden-v1','1');
      document.querySelectorAll('.membership-nav-entry').forEach(node=>node.classList.add('is-hidden'));
    });
    wrap.append(link,close);account.before(wrap);
  }

  build(document.querySelector('.links'));
  build(document.querySelector('.mobile-panel'),true);
  document.addEventListener('everflow:membership-change',event=>{
    if(!event.detail?.active)return;
    write('everflow-membership-nav-hidden-v1','1');
    document.querySelectorAll('.membership-nav-entry').forEach(node=>node.classList.add('is-hidden'));
  });
  document.dispatchEvent(new CustomEvent('everflow:navigation-ready'));
})();
