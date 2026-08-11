import './cloud.js';

(()=>{
  const $=s=>document.querySelector(s);
  const setMsg=(text,bad=false)=>{const el=$('[data-membership-message]');if(!el)return;el.textContent=text;el.className='membership-message '+(bad?'bad':'good')};
  const planLabel=p=>p==='pro'?'Pro':p==='member'?'普通会员':'普通用户';
  const cacheStatus=status=>{
    try{localStorage.setItem('everflow-membership-cache-v1',JSON.stringify({plan:status.plan,active:status.active,at:new Date().toISOString()}))}catch{}
    if(status.active){localStorage.setItem('everflow-membership-nav-hidden-v1','1');document.dispatchEvent(new CustomEvent('everflow:membership-change',{detail:{active:true,plan:status.plan}}));}
  };

  async function load(){
    await EveraCloud.ready;
    const user=await EveraCloud.getUser();
    const statusEl=$('[data-membership-status]'),detail=$('[data-membership-detail]'),claim=$('[data-claim-pro]');
    if(!user){
      if(statusEl)statusEl.textContent='未登录';
      if(detail)detail.innerHTML='请先到 <a href="../account/">账户页登录</a>，再回来免费开通 Pro 或兑换会员码。';
      if(claim)claim.textContent='登录后免费开通 Pro';
      return;
    }
    try{
      const status=await EveraCloud.membership('status');cacheStatus(status);
      if(statusEl)statusEl.textContent=planLabel(status.plan);
      const expiry=status.membership?.effective_expires_at;
      if(detail)detail.textContent=status.active?(expiry?`有效至 ${new Date(expiry).toLocaleString('zh-CN',{hour12:false})}`:'当前有效'):'当前为普通用户，可免费开通 Pro 或使用兑换码。';
      if(claim){
        if(status.plan==='pro'&&status.active){claim.disabled=true;claim.textContent='已开通 Pro';}
        else if(status.promo?.enabled){claim.disabled=false;claim.textContent='¥0 免费开通 Pro';}
        else{claim.disabled=true;claim.textContent='限免活动已结束';}
      }
      const promo=$('[data-promo-copy]');if(promo&&status.promo?.copy)promo.textContent=status.promo.copy;
    }catch(e){setMsg('会员状态读取失败：'+(e.message||String(e)),true)}
  }

  async function claimPro(){
    const user=await EveraCloud.getUser();if(!user){location.href='../account/';return}
    const btn=$('[data-claim-pro]');if(btn)btn.disabled=true;setMsg('正在开通 Pro…');
    try{
      await EveraCloud.membership('claim-pro');
      const status=await EveraCloud.membership('status');cacheStatus(status);
      setMsg('Pro 已开通。会员入口将不再显示。');await load();
    }catch(e){setMsg(({promo_closed:'限免活动当前不可领取。',login_required:'请先登录。'})[e.message]||('开通失败：'+(e.message||String(e))),true);if(btn)btn.disabled=false}
  }

  async function redeem(){
    const input=$('[data-redeem-code]');const code=input?.value.trim()||'';
    if(!code){setMsg('请输入兑换码。',true);return}
    const user=await EveraCloud.getUser();if(!user){location.href='../account/';return}
    const btn=$('[data-redeem]');if(btn)btn.disabled=true;setMsg('正在核验兑换码…');
    try{
      await EveraCloud.membership('redeem',{code});
      const status=await EveraCloud.membership('status');cacheStatus(status);
      setMsg(`${planLabel(status.plan)} 已开通。会员入口将不再显示。`);if(input)input.value='';await load();
    }catch(e){
      const map={invalid_code:'兑换码无效。',code_expired:'兑换码已过期。',code_exhausted:'兑换码使用次数已用完。',login_required:'请先登录。'};
      setMsg(map[e.message]||('兑换失败：'+(e.message||String(e))),true)
    }finally{if(btn)btn.disabled=false}
  }

  $('[data-claim-pro]')?.addEventListener('click',claimPro);
  $('[data-redeem]')?.addEventListener('click',redeem);
  $('[data-redeem-code]')?.addEventListener('keydown',e=>{if(e.key==='Enter')redeem()});
  $('[data-membership-close]')?.addEventListener('click',()=>{
    localStorage.setItem('everflow-membership-nav-hidden-v1','1');
    if(history.length>1)history.back();else location.href='../account/';
  });
  document.addEventListener('everflow:auth-change',()=>load().catch(console.error));
  load().catch(console.error);
})();
