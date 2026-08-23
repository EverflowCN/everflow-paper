import './cloud.js';

(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],ui=()=>window.EveraUI||{};
  const OTP_COOLDOWN_KEY='everflow-otp-cooldown-until-v1';
  let cooldownTimer=null,lastOtpEmail='';
  const planLabel=p=>p==='pro'?'Pro':p==='member'?'普通会员':'普通用户';
  const friendly=e=>{const s=String(e?.message||e||'操作失败');if(/invalid login credentials/i.test(s))return'邮箱或密码不正确。';if(/token.*expired|otp.*expired|expired/i.test(s))return'验证码已过期，请重新获取。';if(/invalid.*token|otp.*invalid/i.test(s))return'验证码不正确，请检查后重试。';if(/rate limit|too many|email rate|over_email_send_rate_limit|429/i.test(s))return'邮件服务当前达到发送频率限制，请稍后再试。已有验证码请直接使用；已有密码可直接登录。';if(/network|fetch/i.test(s))return'网络连接异常，请检查网络。';return s};
  const cooldownRemaining=()=>{try{return Math.max(0,Math.ceil((Number(localStorage.getItem(OTP_COOLDOWN_KEY)||0)-Date.now())/1000))}catch{return 0}};
  function setCooldown(seconds){try{localStorage.setItem(OTP_COOLDOWN_KEY,String(Date.now()+Math.max(0,Number(seconds)||0)*1000))}catch{}enforceCooldown()}
  function enforceCooldown(){
    clearInterval(cooldownTimer);cooldownTimer=null;
    const send=$('[data-otp-send]'),resend=$('[data-otp-resend]');
    const tick=()=>{
      const left=cooldownRemaining();
      if(left<=0){clearInterval(cooldownTimer);cooldownTimer=null;if(send){send.disabled=false;send.textContent='发送验证码'}if(resend){resend.disabled=false;resend.textContent='重新发送验证码'}return}
      if(send){send.disabled=true;send.textContent=`${left} 秒后可重发`}
      if(resend){resend.disabled=true;resend.textContent=`${left} 秒后重发`}
    };
    tick();if(cooldownRemaining()>0)cooldownTimer=setInterval(tick,1000);
  }
  function feedback(title,text,type='info',sel='[data-auth-feedback]'){const el=$(sel);if(!el)return;el.className=`auth-feedback show ${type}`;el.innerHTML='';const a=document.createElement('strong'),b=document.createElement('span');a.textContent=title;b.textContent=text;el.append(a,b)}
  function msg(text,bad=false){const el=$('[data-account-message]');if(el){el.textContent=text;el.style.color=bad?'var(--red)':'var(--muted)'}}
  async function renderMembership(user){const p=$('[data-account-membership]'),d=$('[data-account-membership-detail]');if(!p||!d)return;if(!user){p.textContent='普通用户';d.textContent='登录后可查看会员状态';return}try{const s=await EveraCloud.membership('status');p.textContent=planLabel(s.plan);const x=s.membership?.effective_expires_at;d.textContent=s.active?(x?`有效至 ${new Date(x).toLocaleDateString('zh-CN')}`:'当前有效'):'当前无有效会员';if(s.active){try{localStorage.setItem('everflow-membership-nav-hidden-v1','1')}catch{}document.dispatchEvent(new CustomEvent('everflow:membership-change',{detail:{active:true,plan:s.plan}}))}}catch{p.textContent='普通用户';d.textContent='会员状态暂时无法读取'}}
  async function renderOwner(user){const section=$('[data-owner-workspace]');if(!section)return;if(!user){section.hidden=true;return}try{section.hidden=!(await EveraCloud.isOwner())}catch{section.hidden=true}}
  async function renderAuth(){await EveraCloud.ready;const user=await EveraCloud.getUser();$('[data-auth-guest]')&&($('[data-auth-guest]').hidden=!!user);$('[data-auth-signed]')&&($('[data-auth-signed]').hidden=!user);const status=$('[data-cloud-status]');if(status)status.textContent=EveraCloud.enabled?(navigator.onLine?'云端在线':'当前离线'):'本地模式';if(user){$('[data-user-email]')&&($('[data-user-email]').textContent=user.email||'');$('[data-user-role]')&&($('[data-user-role]').textContent=user.app_metadata?.role==='owner'?'Owner':'User');try{const x=JSON.parse(localStorage.getItem('everflow-last-cloud-sync')||'null');$('[data-last-sync]')&&($('[data-last-sync]').textContent=x?.at?new Date(x.at).toLocaleString('zh-CN',{hour12:false}):'尚未同步')}catch{}await renderMembership(user)}await renderOwner(user)}
  function otpInputs(){return $$('[data-otp-boxes] input')}
  function otpValue(){return otpInputs().map(x=>x.value.replace(/\D/g,'')).join('').slice(0,6)}
  function fillOtp(value){const digits=String(value||'').replace(/\D/g,'').slice(0,6).split('');otpInputs().forEach((x,i)=>x.value=digits[i]||'');const next=otpInputs()[Math.min(digits.length,5)];next?.focus()}
  async function sendOtp(btn,resend=false){
    const email=($('[data-auth-email]')?.value||'').trim().toLowerCase(),left=cooldownRemaining();
    if(left>0){feedback('暂时不能重发',`请 ${left} 秒后再试；已有验证码可直接输入。`,'error');enforceCooldown();return}
    if(!/^\S+@\S+\.\S+$/.test(email)){feedback('邮箱格式不正确','请填写可以接收验证码的邮箱地址。','error');return}
    ui().setBusy?.(btn,true,'发送中…');
    let cooldown=15;
    try{
      try{localStorage.setItem(OTP_COOLDOWN_KEY,String(Date.now()+10000))}catch{}
      const {error}=await EveraCloud.signInOtp(email);if(error)throw error;
      cooldown=60;lastOtpEmail=email;$('[data-otp-stage]').hidden=false;fillOtp('');
      feedback('验证码已发送',`请查看 ${email} 的邮件，并在此页输入 6 位验证码。`,'success');
      ui().toast?.('验证码已发送，无需点击邮件中的登录链接。',{type:'success',title:resend?'已重新发送':'发送成功',duration:4500});
      setTimeout(()=>otpInputs()[0]?.focus(),100);
    }catch(e){
      const raw=String(e?.message||e||'');cooldown=/rate limit|too many|email rate|over_email_send_rate_limit|429/i.test(raw)?300:15;
      const t=friendly(e);feedback('发送失败',t,'error');ui().toast?.(t,{type:'error',title:'发送失败'});
    }finally{ui().setBusy?.(btn,false);setCooldown(cooldown)}
  }
  async function verifyOtp(btn){const email=lastOtpEmail||($('[data-auth-email]')?.value||'').trim().toLowerCase(),token=otpValue();if(token.length!==6){feedback('验证码不完整','请输入邮件中的 6 位验证码。','error');return}ui().setBusy?.(btn,true,'验证中…');try{const {error}=await EveraCloud.verifyOtp(email,token);if(error)throw error;ui().complete?.(btn,'登录成功');ui().toast?.('验证码验证成功，账号已登录。',{type:'success',title:'登录成功'});await EveraCloud.syncAll().catch(()=>{});await renderAuth();feedback('登录成功','408 打卡已切换到当前账号的数据空间。','success','[data-auth-feedback-signed]')}catch(e){const t=friendly(e);feedback('验证失败',t,'error');ui().toast?.(t,{type:'error',title:'验证失败'});ui().setBusy?.(btn,false)}}
  async function passwordLogin(btn){const email=($('[data-auth-email]')?.value||'').trim().toLowerCase(),password=$('[data-auth-password]')?.value||'';if(!email||!password){feedback('信息不完整','请输入邮箱和密码。','error');return}ui().setBusy?.(btn,true,'登录中…');try{const {error}=await EveraCloud.signIn(email,password);if(error)throw error;ui().toast?.('密码登录成功。',{type:'success',title:'登录成功'});await EveraCloud.syncAll().catch(()=>{});await renderAuth()}catch(e){const t=friendly(e);feedback('登录失败',t,'error');ui().toast?.(t,{type:'error',title:'登录失败'})}finally{ui().setBusy?.(btn,false)}}
  async function exportData(btn){ui().setBusy?.(btn,true,'导出中…');try{const data=await EveraStore.exportAll(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`everflow-408-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);msg('408 本地备份已导出。');ui().toast?.('JSON 备份已生成。',{type:'success',title:'导出成功'})}finally{ui().setBusy?.(btn,false)}}
  async function importData(file){try{const payload=JSON.parse(await file.text());await EveraStore.importAll(payload);msg('备份已合并到本机。');ui().toast?.('备份已合并。',{type:'success',title:'导入成功'});await EveraCloud.syncAll().catch(()=>{});renderAuth()}catch(e){const t=friendly(e);msg(t,true);ui().toast?.(t,{type:'error',title:'导入失败'})}}

  otpInputs().forEach((input,i)=>{input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(-1);if(input.value&&i<5)otpInputs()[i+1].focus();if(otpValue().length===6)$('[data-otp-verify]')?.focus()});input.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!input.value&&i>0)otpInputs()[i-1].focus();if(e.key==='ArrowLeft'&&i>0)otpInputs()[i-1].focus();if(e.key==='ArrowRight'&&i<5)otpInputs()[i+1].focus()});input.addEventListener('paste',e=>{const t=e.clipboardData?.getData('text')||'';if(/\d{4,}/.test(t)){e.preventDefault();fillOtp(t)}})});
  $('[data-otp-send]')?.addEventListener('click',e=>sendOtp(e.currentTarget));$('[data-otp-resend]')?.addEventListener('click',e=>sendOtp(e.currentTarget,true));$('[data-otp-verify]')?.addEventListener('click',e=>verifyOtp(e.currentTarget));$('[data-login-password]')?.addEventListener('click',e=>passwordLogin(e.currentTarget));
  [$('[data-auth-email]'),$('[data-auth-password]')].forEach(input=>input?.addEventListener('keydown',event=>{if(event.key!=='Enter'||!$('[data-auth-password]')?.value)return;event.preventDefault();$('[data-login-password]')?.click()}));
  $('[data-logout]')?.addEventListener('click',async e=>{ui().setBusy?.(e.currentTarget,true,'退出中…');await EveraCloud.signOut();ui().setBusy?.(e.currentTarget,false);ui().toast?.('已退出当前账号。',{type:'success',title:'已退出'});renderAuth()});
  $('[data-sync-now]')?.addEventListener('click',async e=>{const btn=e.currentTarget;ui().setBusy?.(btn,true,'同步中…');try{const r=await EveraCloud.syncAll();if(r.ok){feedback('同步完成',`已同步 ${r.courses} 条课程状态。`,'success','[data-auth-feedback-signed]');ui().complete?.(btn,'同步完成');ui().toast?.('本机与云端 408 打卡已合并。',{type:'success',title:'同步完成'})}else throw new Error(r.reason||'同步未完成')}catch(err){const t=friendly(err);feedback('同步失败',`${t} 本机数据仍然保留。`,'error','[data-auth-feedback-signed]');ui().setBusy?.(btn,false)}});
  $('[data-export]')?.addEventListener('click',e=>exportData(e.currentTarget));$('[data-import-file]')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importData(f)});
  document.addEventListener('everflow:auth-change',renderAuth);document.addEventListener('everflow:cloud-sync',renderAuth);document.addEventListener('everflow:membership-change',renderAuth);addEventListener('online',renderAuth);addEventListener('offline',renderAuth);addEventListener('storage',event=>{if(event.key===OTP_COOLDOWN_KEY)enforceCooldown()});
  enforceCooldown();Promise.resolve(window.EveraStore?.init()).then(renderAuth).catch(console.error);
})();
