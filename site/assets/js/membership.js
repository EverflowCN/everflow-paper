import './cloud.js';

(()=>{
  const $=s=>document.querySelector(s);
  const ui=()=>window.EveraUI||{};
  const planLabel=p=>p==='pro'?'Pro':p==='member'?'普通会员':'普通用户';
  const setMsg=(title,text,bad=false)=>{
    const el=$('[data-membership-message]');if(!el)return;
    el.className='membership-message '+(bad?'bad':'good');el.innerHTML='';
    const strong=document.createElement('strong');strong.textContent=title;const span=document.createElement('span');span.textContent=text;el.append(strong,document.createElement('br'),span);
  };
  const friendlyError=e=>{
    const key=String(e?.message||e||'');
    return ({invalid_code:'兑换码无效，请检查后重试。',code_expired:'兑换码已经过期。',code_exhausted:'兑换码使用次数已用完。',promo_closed:'Pro 限免活动当前不可领取。',login_required:'请先登录账户。'})[key]||key||'操作没有完成。';
  };
  const cacheStatus=status=>{
    try{localStorage.setItem('everflow-membership-cache-v1',JSON.stringify({plan:status.plan,active:status.active,at:new Date().toISOString()}))}catch{}
    if(status.active){localStorage.setItem('everflow-membership-nav-hidden-v1','1');document.dispatchEvent(new CustomEvent('everflow:membership-change',{detail:{active:true,plan:status.plan}}))}
  };

  async function load(){
    await EveraCloud.ready;
    const user=await EveraCloud.getUser();
    const statusEl=$('[data-membership-status]'),detail=$('[data-membership-detail]'),claim=$('[data-claim-pro]');
    if(!user){
      if(statusEl)statusEl.textContent='未登录';
      if(detail){detail.classList.remove('active');detail.innerHTML='请先到 <a href="../account/">账户页登录</a>'}
      if(claim){claim.disabled=false;claim.textContent='登录后免费开通 Pro'}
      return;
    }
    try{
      const status=await EveraCloud.membership('status');cacheStatus(status);
      if(statusEl)statusEl.textContent=planLabel(status.plan);
      const expiry=status.membership?.effective_expires_at;
      if(detail){detail.classList.toggle('active',Boolean(status.active));detail.textContent=status.active?(expiry?`有效至 ${new Date(expiry).toLocaleDateString('zh-CN')}`:'会员当前有效'):'当前为普通用户'}
      if(claim){
        if(status.plan==='pro'&&status.active){claim.disabled=true;claim.textContent='Pro 已开通 ✓'}
        else if(status.promo?.enabled){claim.disabled=false;claim.textContent='¥0 免费开通 Pro'}
        else{claim.disabled=true;claim.textContent='限免活动已结束'}
      }
      const promo=$('[data-promo-copy]');if(promo&&status.promo?.copy)promo.textContent=status.promo.copy;
    }catch(e){const text=friendlyError(e);setMsg('会员状态读取失败',text,true);ui().toast?.(text,{type:'error',title:'读取失败'})}
  }

  async function claimPro(){
    const user=await EveraCloud.getUser();if(!user){ui().toast?.('请先登录，再回来免费开通 Pro。',{type:'info',title:'需要登录'});setTimeout(()=>location.href='../account/',500);return}
    const btn=$('[data-claim-pro]');ui().setBusy?.(btn,true,'开通中…');setMsg('正在开通','正在为当前账号开通 Pro，请稍候。');
    try{
      await EveraCloud.membership('claim-pro');
      const status=await EveraCloud.membership('status');cacheStatus(status);
      setMsg('Pro 开通成功','当前账号已经获得 Pro 权益；顶部购买会员入口会自动隐藏。');
      ui().complete?.(btn,'Pro 已开通 ✓',0);ui().toast?.('当前账号已经获得 Pro 权益。',{type:'success',title:'开通成功',duration:4500});await load();
    }catch(e){const text=friendlyError(e);setMsg('开通失败',text,true);ui().toast?.(text,{type:'error',title:'开通失败'});ui().setBusy?.(btn,false)}
  }

  async function redeem(){
    const input=$('[data-redeem-code]'),code=input?.value.trim()||'';
    if(!code){setMsg('需要兑换码','请输入兑换码后再提交。',true);ui().toast?.('请输入兑换码。',{type:'error',title:'无法兑换'});input?.focus();return}
    const user=await EveraCloud.getUser();if(!user){ui().toast?.('请先登录账户，再使用兑换码。',{type:'info',title:'需要登录'});setTimeout(()=>location.href='../account/',500);return}
    const btn=$('[data-redeem]');ui().setBusy?.(btn,true,'核验中…');setMsg('正在核验','正在检查兑换码，请不要重复点击。');
    try{
      await EveraCloud.membership('redeem',{code});
      const status=await EveraCloud.membership('status');cacheStatus(status);
      setMsg('兑换成功',`${planLabel(status.plan)} 已经开通，权益已绑定到当前账号。`);if(input)input.value='';ui().complete?.(btn,'兑换成功 ✓');ui().toast?.(`${planLabel(status.plan)} 已经开通。`,{type:'success',title:'兑换成功',duration:4500});await load();
    }catch(e){const text=friendlyError(e);setMsg('兑换失败',text,true);ui().toast?.(text,{type:'error',title:'兑换失败'});ui().setBusy?.(btn,false)}
  }

  $('[data-claim-pro]')?.addEventListener('click',claimPro);$('[data-redeem]')?.addEventListener('click',redeem);$('[data-redeem-code]')?.addEventListener('keydown',e=>{if(e.key==='Enter')redeem()});
  $('[data-focus-redeem]')?.addEventListener('click',()=>{document.querySelector('#redeem')?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>$('[data-redeem-code]')?.focus(),350)});
  $('[data-membership-close]')?.addEventListener('click',e=>{const btn=e.currentTarget;btn.disabled=true;localStorage.setItem('everflow-membership-nav-hidden-v1','1');ui().toast?.('购买会员入口已隐藏；以后仍可从账户页进入。',{type:'info',title:'已隐藏'});setTimeout(()=>{if(history.length>1)history.back();else location.href='../account/'},350)});
  document.addEventListener('everflow:auth-change',()=>load().catch(console.error));load().catch(console.error);
})();
