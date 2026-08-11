(()=>{
  const path=location.pathname.replace(/\/{2,}/g,'/');
  const items=[
    {href:'/',label:'首页',match:p=>p==='/'},
    {href:'/study/',label:'学习',match:p=>p.startsWith('/study/')||p.startsWith('/408/')},
    {href:'/links/',label:'资源',match:p=>p.startsWith('/links/')},
    {href:'/archive/',label:'通知通告',match:p=>p.startsWith('/archive/')||p.startsWith('/notice/')||p.startsWith('/post/')},
    {href:'/account/',label:'账户',match:p=>p.startsWith('/account/')}
  ];
  const membershipHidden=()=>localStorage.getItem('everflow-membership-nav-hidden-v1')==='1';

  function build(container,mobile=false){
    if(!container)return;
    const theme=container.querySelector('[data-theme]');
    const frag=document.createDocumentFragment();
    for(const item of items){
      const a=document.createElement('a');a.href=item.href;a.textContent=item.label;
      if(item.match(path))a.classList.add('active');
      frag.appendChild(a);
    }
    if(theme)frag.appendChild(theme);
    container.replaceChildren(frag);
    const account=[...container.querySelectorAll('a')].find(a=>new URL(a.href,location.href).pathname.replace(/\/+$/,'')==='/account');
    if(account){
      const wrap=document.createElement(mobile?'div':'span');wrap.className='membership-nav-entry'+(membershipHidden()?' is-hidden':'');
      const link=document.createElement('a');link.href='/membership/';link.textContent='购买会员';if(path.startsWith('/membership/'))link.classList.add('active');
      const close=document.createElement('button');close.type='button';close.className='membership-nav-close';close.textContent='×';close.setAttribute('aria-label','关闭购买会员入口');close.title='关闭';
      close.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();localStorage.setItem('everflow-membership-nav-hidden-v1','1');document.querySelectorAll('.membership-nav-entry').forEach(x=>x.classList.add('is-hidden'))});
      wrap.append(link,close);account.before(wrap);
    }
  }

  build(document.querySelector('.links'),false);
  build(document.querySelector('.mobile-panel'),true);
  document.addEventListener('everflow:membership-change',e=>{if(e.detail?.active){localStorage.setItem('everflow-membership-nav-hidden-v1','1');document.querySelectorAll('.membership-nav-entry').forEach(x=>x.classList.add('is-hidden'))}});
  document.dispatchEvent(new CustomEvent('everflow:navigation-ready'));
})();