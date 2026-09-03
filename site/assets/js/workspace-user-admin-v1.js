(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validEmail=s=>/^\S+@\S+\.\S+$/.test(String(s||'').trim());

  function toast(text,type='success',title){
    const stack=$('[data-ws-toasts]');
    if(!stack)return;
    const el=document.createElement('div');
    el.className=`ws-toast ${type}`;
    el.innerHTML=`<strong>${esc(title||(type==='error'?'操作失败':'操作成功'))}</strong><span>${esc(text)}</span>`;
    stack.appendChild(el);
    setTimeout(()=>el.remove(),4200);
  }

  async function waitCloud(){
    for(let i=0;i<120;i++){
      if(window.EveraAdminCloud?.ownerUsers)return window.EveraAdminCloud;
      await new Promise(r=>setTimeout(r,70));
    }
    throw new Error('管理服务加载超时');
  }

  function installButton(){
    const intro=$('[data-ws-panel="users"] .ws-intro');
    if(!intro||intro.querySelector('[data-user-create-open]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='ws-btn primary';
    button.dataset.userCreateOpen='';
    button.textContent='新增账号';
    (intro.querySelector('.ws-intro-actions')||intro).appendChild(button);
  }

  function closeDrawer(){
    const drawer=$('[data-user-drawer]'),back=$('[data-user-drawer-backdrop]');
    if(drawer)drawer.hidden=true;
    if(back)back.hidden=true;
  }

  function openCreateDrawer(){
    const drawer=$('[data-user-drawer]'),back=$('[data-user-drawer-backdrop]');
    if(!drawer||!back)return;
    drawer.innerHTML=`
      <div class="ws-drawer-head">
        <div><div class="eyebrow">CREATE USER</div><h3>新增账号</h3><small>无需发送注册邮件，创建后可直接使用邮箱 + 临时密码登录。</small></div>
        <button class="ws-drawer-close" type="button" data-user-create-close>×</button>
      </div>
      <section class="ws-drawer-section">
        <h4>账号信息</h4>
        <label class="ws-field wide">登录邮箱<input type="email" inputmode="email" autocomplete="off" data-user-create-email placeholder="user@example.com"></label>
        <p style="font-size:10px;color:#7d838c;line-height:1.75;margin:10px 0 0">系统会创建已确认的普通账号，并自动生成唯一临时密码。创建过程不会发送邮件，因此不受验证码邮件限流影响。</p>
        <div class="ws-actions" style="justify-content:flex-start;margin-top:12px"><button class="primary" type="button" data-user-create-submit>创建账号</button></div>
        <div class="secret-box" data-user-create-result hidden></div>
      </section>
      <section class="ws-drawer-section">
        <h4>已有账号</h4>
        <p style="font-size:10px;color:#7d838c;line-height:1.75">已有账号无需重复创建。回到用户列表打开“详情”，可以重置临时密码、停用、恢复或删除该账号。</p>
      </section>`;
    drawer.hidden=false;
    back.hidden=false;
    setTimeout(()=>$('[data-user-create-email]')?.focus(),80);
  }

  function showCreated(result){
    const box=$('[data-user-create-result]');
    if(!box)return;
    const email=result?.user?.email||$('[data-user-create-email]')?.value||'';
    const password=result?.password||'';
    box.hidden=false;
    box.innerHTML=`<strong>账号创建成功</strong><div style="margin-top:7px">邮箱：<code>${esc(email)}</code></div><div style="margin-top:5px">临时密码：<code>${esc(password)}</code></div><p style="margin:8px 0 0;font-size:10px;color:#7d838c;line-height:1.65">请把邮箱和临时密码发给用户。用户可在账户页直接使用“密码登录”。</p><div class="ws-actions" style="justify-content:flex-start;margin-top:9px"><button type="button" data-user-create-copy data-email="${esc(email)}" data-password="${esc(password)}">复制登录信息</button><button type="button" data-user-create-done>完成并刷新</button></div>`;
  }

  async function createAccount(button){
    const email=String($('[data-user-create-email]')?.value||'').trim().toLowerCase();
    const box=$('[data-user-create-result]');
    if(!validEmail(email)){
      if(box){box.hidden=false;box.textContent='请输入有效邮箱地址。'}
      return;
    }
    const old=button.textContent;
    button.disabled=true;button.textContent='创建中…';
    try{
      const cloud=await waitCloud();
      const result=await cloud.ownerUsers('create',{email});
      showCreated(result);
      button.textContent='已创建';
      toast('账号已创建，并生成临时密码。');
    }catch(error){
      const raw=String(error?.message||error||'创建失败');
      const text=/user_already_exists|already.*registered|already.*exists/i.test(raw)?'这个邮箱已经存在，请在用户列表中打开详情管理该账号。':raw;
      if(box){box.hidden=false;box.textContent=text;}
      button.disabled=false;button.textContent=old;
      toast(text,'error','创建失败');
    }
  }

  document.addEventListener('click',async event=>{
    const target=event.target.closest('button');
    if(!target)return;
    if(target.hasAttribute('data-user-create-open')){openCreateDrawer();return;}
    if(target.hasAttribute('data-user-create-close')){closeDrawer();return;}
    if(target.hasAttribute('data-user-create-submit')){await createAccount(target);return;}
    if(target.hasAttribute('data-user-create-copy')){
      const email=target.dataset.email||'',password=target.dataset.password||'';
      const text=`Everflow 登录账号\n邮箱：${email}\n临时密码：${password}\n登录地址：https://evera.top/account/`;
      try{await navigator.clipboard.writeText(text);toast('登录信息已复制。');}
      catch{toast('复制失败，请手动复制邮箱和密码。','error');}
      return;
    }
    if(target.hasAttribute('data-user-create-done')){
      closeDrawer();
      const refresh=$('[data-ws-refresh]');
      if(refresh)refresh.click();else location.reload();
      return;
    }
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&event.target?.matches?.('[data-user-create-email]')){
      event.preventDefault();$('[data-user-create-submit]')?.click();
    }
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installButton,{once:true});else installButton();
  const observer=new MutationObserver(installButton);
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
