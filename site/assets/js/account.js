import './cloud.js?v=20260824-reset2';

(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],ui=()=>window.EveraUI||{};
  const OTP_COOLDOWN_KEY='everflow-otp-cooldown-until-v1';
  const RECOVERY_COOLDOWN_KEY='everflow-recovery-cooldown-until-v1';
  const RECOVERY_KEY='everflow-password-recovery-v1';
  let cooldownTimer=null,recoveryCooldownTimer=null,lastOtpEmail='',recoveryEmail='',recoveryMode=false,recoveryStage='code';
  try{
    const saved=sessionStorage.getItem(RECOVERY_KEY),reset=new URLSearchParams(location.search).get('reset');
    if(saved||reset==='1'){
      recoveryMode=true;
      recoveryStage=(saved==='password'||reset==='1')?'password':'code';
    }
  }catch{}

  const planLabel=p=>p==='pro'?'Pro':p==='member'?'普通会员':'普通用户';
  const friendly=e=>{const s=String(e?.message||e||'操作失败');if(/invalid login credentials/i.test(s))return'邮箱或密码不正确。';if(/token.*expired|otp.*expired|expired/i.test(s))return'验证码已过期，请重新获取。';if(/invalid.*token|otp.*invalid/i.test(s))return'验证码不正确，请检查后重试。';if(/auth session missing|session.*missing/i.test(s))return'邮箱验证会话已失效，请重新获取验证码。';if(/password.*short|weak password|least .*characters/i.test(s))return'新密码不符合要求，请至少使用 8 位密码。';if(/same password|different from.*old/i.test(s))return'新密码不能与原密码相同。';if(/rate limit|too many|email rate|over_email_send_rate_limit|429/i.test(s))return'邮件服务当前达到发送频率限制，请稍后再试。已有验证码请直接使用；已有密码可直接登录。';if(/network|fetch/i.test(s))return'网络连接异常，请检查网络。';return s};
  const remaining=key=>{try{return Math.max(0,Math.ceil((Number(localStorage.getItem(key)||0)-Date.now())/1000))}catch{return 0}};
  const storeCooldown=(key,seconds)=>{try{localStorage.setItem(key,String(Date.now()+Math.max(0,Number(seconds)||0)*1000))}catch{}};

  function enforceCooldown(){
    clearInterval(cooldownTimer);cooldownTimer=null;
    const send=$('[data-otp-send]'),resend=$('[data-otp-resend]');
    const tick=()=>{
      const left=remaining(OTP_COOLDOWN_KEY);
      if(left<=0){clearInterval(cooldownTimer);cooldownTimer=null;if(send){send.disabled=false;send.textContent='发送验证码'}if(resend){resend.disabled=false;resend.textContent='重新发送验证码'}return}
      if(send){send.disabled=true;send.textContent=`${left} 秒后可重发`}
      if(resend){resend.disabled=true;resend.textContent=`${left} 秒后重发`}
    };
    tick();if(remaining(OTP_COOLDOWN_KEY)>0)cooldownTimer=setInterval(tick,1000);
  }
  function setCooldown(seconds){storeCooldown(OTP_COOLDOWN_KEY,seconds);enforceCooldown()}

  function enforceRecoveryCooldown(){
    clearInterval(recoveryCooldownTimer);recoveryCooldownTimer=null;
    const send=$('[data-recovery-send]'),resend=$('[data-recovery-resend]');
    const tick=()=>{
      const left=remaining(RECOVERY_COOLDOWN_KEY);
      if(left<=0){clearInterval(recoveryCooldownTimer);recoveryCooldownTimer=null;if(send){send.disabled=false;send.textContent='发送重置验证码'}if(resend){resend.disabled=false;resend.textContent='重新发送验证码'}return}
      if(send){send.disabled=true;send.textContent=`${left} 秒后可重发`}
      if(resend){resend.disabled=true;resend.textContent=`${left} 秒后重发`}
    };
    tick();if(remaining(RECOVERY_COOLDOWN_KEY)>0)recoveryCooldownTimer=setInterval(tick,1000);
  }
  function setRecoveryCooldown(seconds){storeCooldown(RECOVERY_COOLDOWN_KEY,seconds);enforceRecoveryCooldown()}

  function feedback(title,text,type='info',sel='[data-auth-feedback]'){const el=$(sel);if(!el)return;el.className=`auth-feedback show ${type}`;el.innerHTML='';const a=document.createElement('strong'),b=document.createElement('span');a.textContent=title;b.textContent=text;el.append(a,b)}
  function clearFeedback(sel){const el=$(sel);if(!el)return;el.className='auth-feedback';el.innerHTML=''}
  function msg(text,bad=false){const el=$('[data-account-message]');if(el){el.textContent=text;el.style.color=bad?'var(--red)':'var(--muted)'}}
  function enterRecoveryMode(stage='code',email=''){
    recoveryMode=true;recoveryStage=stage;if(email)recoveryEmail=email;
    try{sessionStorage.setItem(RECOVERY_KEY,stage)}catch{}
  }
  function leaveRecoveryMode(){recoveryMode=false;recoveryStage='code';recoveryEmail='';try{sessionStorage.removeItem(RECOVERY_KEY)}catch{}try{const u=new URL(location.href);u.searchParams.delete('reset');u.hash='';history.replaceState(null,'',u.href)}catch{}}

  async function renderMembership(user){const p=$('[data-account-membership]'),d=$('[data-account-membership-detail]');if(!p||!d)return;if(!user){p.textContent='普通用户';d.textContent='登录后可查看会员状态';return}try{const s=await EveraCloud.membership('status');p.textContent=planLabel(s.plan);const x=s.membership?.effective_expires_at;d.textContent=s.active?(x?`有效至 ${new Date(x).toLocaleDateString('zh-CN')}`:'当前有效'):'当前无有效会员';if(s.active){try{localStorage.setItem('everflow-membership-nav-hidden-v1','1')}catch{}document.dispatchEvent(new CustomEvent('everflow:membership-change',{detail:{active:true,plan:s.plan}}))}}catch{p.textContent='普通用户';d.textContent='会员状态暂时无法读取'}}
  async function renderOwner(user){const section=$('[data-owner-workspace]');if(!section)return;if(!user){section.hidden=true;return}try{section.hidden=!(await EveraCloud.isOwner())}catch{section.hidden=true}}
  async function renderAuth(){
    await EveraCloud.ready;
    const user=await EveraCloud.getUser(),guest=$('[data-auth-guest]'),signed=$('[data-auth-signed]'),recovery=$('[data-password-recovery]');
    if(recoveryMode){
      if(guest)guest.hidden=true;if(signed)signed.hidden=true;if(recovery)recovery.hidden=false;await renderOwner(null);
      const codeStage=$('[data-recovery-code-stage]'),passwordStage=$('[data-recovery-password-stage]'),copy=$('[data-recovery-copy]');
      const verified=recoveryStage==='password';
      if(codeStage)codeStage.hidden=verified;if(passwordStage)passwordStage.hidden=!verified;
      if(copy)copy.textContent=verified?'邮箱验证成功，请设置新的登录密码。':'验证码会发送到你的账号邮箱，验证后即可设置新密码。';
      if(recoveryEmail&&$('[data-recovery-email]'))$('[data-recovery-email]').value=recoveryEmail;
      if(verified&&!user)feedback('验证会话已失效','请返回登录页，重新获取重置验证码。','error','[data-recovery-feedback]');
      return;
    }
    if(recovery)recovery.hidden=true;if(guest)guest.hidden=!!user;if(signed)signed.hidden=!user;
    const status=$('[data-cloud-status]');if(status)status.textContent=EveraCloud.enabled?(navigator.onLine?'云端在线':'当前离线'):'本地模式';
    if(user){$('[data-user-email]')&&($('[data-user-email]').textContent=user.email||'');$('[data-user-role]')&&($('[data-user-role]').textContent=user.app_metadata?.role==='owner'?'Owner':'User');try{const x=JSON.parse(localStorage.getItem('everflow-last-cloud-sync')||'null');$('[data-last-sync]')&&($('[data-last-sync]').textContent=x?.at?new Date(x.at).toLocaleString('zh-CN',{hour12:false}):'尚未同步')}catch{}await renderMembership(user)}
    await renderOwner(user);
  }

  function otpInputs(){return $$('[data-otp-boxes] input')}
  function otpValue(){return otpInputs().map(x=>x.value.replace(/\D/g,'')).join('').slice(0,6)}
  function fillOtp(value){const digits=String(value||'').replace(/\D/g,'').slice(0,6).split('');otpInputs().forEach((x,i)=>x.value=digits[i]||'');otpInputs()[Math.min(digits.length,5)]?.focus()}
  function recoveryOtpInputs(){return $$('[data-recovery-otp-boxes] input')}
  function recoveryOtpValue(){return recoveryOtpInputs().map(x=>x.value.replace(/\D/g,'')).join('').slice(0,6)}
  function fillRecoveryOtp(value){const digits=String(value||'').replace(/\D/g,'').slice(0,6).split('');recoveryOtpInputs().forEach((x,i)=>x.value=digits[i]||'');recoveryOtpInputs()[Math.min(digits.length,5)]?.focus()}

  async function sendOtp(btn,resend=false){
    const email=($('[data-auth-email]')?.value||'').trim().toLowerCase(),left=remaining(OTP_COOLDOWN_KEY);
    if(left>0){feedback('暂时不能重发',`请 ${left} 秒后再试；已有验证码可直接输入。`,'error');enforceCooldown();return}
    if(!/^\S+@\S+\.\S+$/.test(email)){feedback('邮箱格式不正确','请填写可以接收验证码的邮箱地址。','error');return}
    ui().setBusy?.(btn,true,'发送中…');let cooldown=15;
    try{
      storeCooldown(OTP_COOLDOWN_KEY,10);
      const {error}=await EveraCloud.signInOtp(email);if(error)throw error;
      cooldown=60;lastOtpEmail=email;$('[data-otp-stage]').hidden=false;fillOtp('');
      feedback('验证码已发送',`请查看 ${email} 的邮件，并在此页输入 6 位验证码。`,'success');
      ui().toast?.('验证码已发送，无需点击邮件中的登录链接。',{type:'success',title:resend?'已重新发送':'发送成功',duration:4500});
      setTimeout(()=>otpInputs()[0]?.focus(),100);
    }catch(e){const raw=String(e?.message||e||'');cooldown=/rate limit|too many|email rate|over_email_send_rate_limit|429/i.test(raw)?300:15;const t=friendly(e);feedback('发送失败',t,'error');ui().toast?.(t,{type:'error',title:'发送失败'})}
    finally{ui().setBusy?.(btn,false);setCooldown(cooldown)}
  }
  async function verifyOtp(btn){const email=lastOtpEmail||($('[data-auth-email]')?.value||'').trim().toLowerCase(),token=otpValue();if(token.length!==6){feedback('验证码不完整','请输入邮件中的 6 位验证码。','error');return}ui().setBusy?.(btn,true,'验证中…');try{const {error}=await EveraCloud.verifyOtp(email,token);if(error)throw error;ui().complete?.(btn,'登录成功');ui().toast?.('验证码验证成功，账号已登录。',{type:'success',title:'登录成功'});await EveraCloud.syncAll().catch(()=>{});await renderAuth();feedback('登录成功','408 打卡已切换到当前账号的数据空间。','success','[data-auth-feedback-signed]')}catch(e){const t=friendly(e);feedback('验证失败',t,'error');ui().toast?.(t,{type:'error',title:'验证失败'});ui().setBusy?.(btn,false)}}
  async function passwordLogin(btn){const email=($('[data-auth-email]')?.value||'').trim().toLowerCase(),password=$('[data-auth-password]')?.value||'';if(!email||!password){feedback('信息不完整','请输入邮箱和密码。','error');return}ui().setBusy?.(btn,true,'登录中…');try{const {error}=await EveraCloud.signIn(email,password);if(error)throw error;ui().toast?.('密码登录成功。',{type:'success',title:'登录成功'});await EveraCloud.syncAll().catch(()=>{});await renderAuth()}catch(e){const t=friendly(e);feedback('登录失败',t,'error');ui().toast?.(t,{type:'error',title:'登录失败'})}finally{ui().setBusy?.(btn,false)}}

  async function sendRecoveryCode(btn,resend=false,forcedEmail=''){
    const email=(forcedEmail||$('[data-recovery-email]')?.value||'').trim().toLowerCase(),left=remaining(RECOVERY_COOLDOWN_KEY);
    if(left>0){feedback('暂时不能重发',`请 ${left} 秒后再试；已有验证码可直接输入。`,'error','[data-recovery-feedback]');enforceRecoveryCooldown();return}
    if(!/^\S+@\S+\.\S+$/.test(email)){feedback('邮箱格式不正确','请输入需要重置密码的账号邮箱。','error','[data-recovery-feedback]');$('[data-recovery-email]')?.focus();return}
    recoveryEmail=email;enterRecoveryMode('code',email);ui().setBusy?.(btn,true,'发送中…');let cooldown=15;
    try{
      storeCooldown(RECOVERY_COOLDOWN_KEY,10);
      const {error}=await EveraCloud.resetPassword(email);if(error)throw error;
      cooldown=60;if($('[data-recovery-otp-stage]'))$('[data-recovery-otp-stage]').hidden=false;fillRecoveryOtp('');
      feedback('重置验证码已发送',`请查看 ${email} 的邮件，输入 6 位验证码后设置新密码。`,'success','[data-recovery-feedback]');
      ui().toast?.('密码重置验证码已发送。',{type:'success',title:resend?'已重新发送':'请查看邮箱',duration:5000});
      setTimeout(()=>recoveryOtpInputs()[0]?.focus(),100);
    }catch(e){const raw=String(e?.message||e||'');cooldown=/rate limit|too many|email rate|over_email_send_rate_limit|429/i.test(raw)?300:15;const t=friendly(e);feedback('发送失败',t,'error','[data-recovery-feedback]');ui().toast?.(t,{type:'error',title:'发送失败'})}
    finally{ui().setBusy?.(btn,false);setRecoveryCooldown(cooldown)}
  }
  async function startPasswordReset(btn){
    const email=($('[data-auth-email]')?.value||'').trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(email)){feedback('先填写邮箱','请先在上方输入需要重置密码的邮箱地址。','error');$('[data-auth-email]')?.focus();return}
    enterRecoveryMode('code',email);clearFeedback('[data-recovery-feedback]');await renderAuth();
    if($('[data-recovery-otp-stage]'))$('[data-recovery-otp-stage]').hidden=true;
    await sendRecoveryCode($('[data-recovery-send]')||btn,false,email);
  }
  async function verifyRecoveryCode(btn){
    const email=(recoveryEmail||$('[data-recovery-email]')?.value||'').trim().toLowerCase(),token=recoveryOtpValue();
    if(token.length!==6){feedback('验证码不完整','请输入邮件中的 6 位重置验证码。','error','[data-recovery-feedback]');return}
    ui().setBusy?.(btn,true,'验证中…');
    try{
      const {error}=await EveraCloud.verifyRecoveryOtp(email,token);if(error)throw error;
      recoveryEmail=email;enterRecoveryMode('password',email);clearFeedback('[data-recovery-feedback]');await renderAuth();
      feedback('邮箱验证成功','现在可以设置新的登录密码。','success','[data-recovery-feedback]');
      ui().complete?.(btn,'验证成功');ui().toast?.('邮箱验证成功，请设置新密码。',{type:'success',title:'验证成功',duration:4000});
      setTimeout(()=>$('[data-recovery-password]')?.focus(),100);
    }catch(e){const t=friendly(e);feedback('验证失败',t,'error','[data-recovery-feedback]');ui().toast?.(t,{type:'error',title:'验证失败'});ui().setBusy?.(btn,false)}
  }
  async function saveNewPassword(btn){
    const password=$('[data-recovery-password]')?.value||'',confirm=$('[data-recovery-password-confirm]')?.value||'';
    if(password.length<8){feedback('密码太短','新密码至少需要 8 位。','error','[data-recovery-feedback]');return}
    if(password!==confirm){feedback('两次密码不一致','请重新确认两次输入的新密码。','error','[data-recovery-feedback]');return}
    ui().setBusy?.(btn,true,'保存中…');
    try{
      const user=await EveraCloud.getUser();if(!user)throw new Error('auth session missing');const email=user.email||recoveryEmail||'';
      const {error}=await EveraCloud.updatePassword(password);if(error)throw error;
      leaveRecoveryMode();await EveraCloud.signOut();
      if(email&&$('[data-auth-email]'))$('[data-auth-email]').value=email;if($('[data-auth-password]'))$('[data-auth-password]').value='';if($('[data-recovery-password]'))$('[data-recovery-password]').value='';if($('[data-recovery-password-confirm]'))$('[data-recovery-password-confirm]').value='';fillRecoveryOtp('');
      await renderAuth();feedback('密码已重置','请使用刚刚设置的新密码登录。','success');ui().toast?.('新密码已保存，请重新登录。',{type:'success',title:'重置成功',duration:5000});
    }catch(e){const t=friendly(e);feedback('重置失败',t,'error','[data-recovery-feedback]');ui().toast?.(t,{type:'error',title:'重置失败'})}
    finally{ui().setBusy?.(btn,false)}
  }

  async function exportData(btn){ui().setBusy?.(btn,true,'导出中…');try{const data=await EveraStore.exportAll(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`everflow-408-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);msg('408 本地备份已导出。');ui().toast?.('JSON 备份已生成。',{type:'success',title:'导出成功'})}finally{ui().setBusy?.(btn,false)}}
  async function importData(file){try{const payload=JSON.parse(await file.text());await EveraStore.importAll(payload);msg('备份已合并到本机。');ui().toast?.('备份已合并。',{type:'success',title:'导入成功'});await EveraCloud.syncAll().catch(()=>{});renderAuth()}catch(e){const t=friendly(e);msg(t,true);ui().toast?.(t,{type:'error',title:'导入失败'})}}

  function bindOtpGroup(inputs,valueFn,verifySelector){inputs.forEach((input,i)=>{input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(-1);if(input.value&&i<inputs.length-1)inputs[i+1].focus();if(valueFn().length===6)$(verifySelector)?.focus()});input.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!input.value&&i>0)inputs[i-1].focus();if(e.key==='ArrowLeft'&&i>0)inputs[i-1].focus();if(e.key==='ArrowRight'&&i<inputs.length-1)inputs[i+1].focus()});input.addEventListener('paste',e=>{const t=e.clipboardData?.getData('text')||'';if(/\d{4,}/.test(t)){e.preventDefault();const digits=t.replace(/\D/g,'').slice(0,inputs.length).split('');inputs.forEach((x,j)=>x.value=digits[j]||'');inputs[Math.min(digits.length,inputs.length-1)]?.focus()}})})}
  bindOtpGroup(otpInputs(),otpValue,'[data-otp-verify]');bindOtpGroup(recoveryOtpInputs(),recoveryOtpValue,'[data-recovery-verify]');

  $('[data-otp-send]')?.addEventListener('click',e=>sendOtp(e.currentTarget));$('[data-otp-resend]')?.addEventListener('click',e=>sendOtp(e.currentTarget,true));$('[data-otp-verify]')?.addEventListener('click',e=>verifyOtp(e.currentTarget));$('[data-login-password]')?.addEventListener('click',e=>passwordLogin(e.currentTarget));
  $('[data-forgot-password]')?.addEventListener('click',e=>startPasswordReset(e.currentTarget));$('[data-recovery-send]')?.addEventListener('click',e=>sendRecoveryCode(e.currentTarget));$('[data-recovery-resend]')?.addEventListener('click',e=>sendRecoveryCode(e.currentTarget,true));$('[data-recovery-verify]')?.addEventListener('click',e=>verifyRecoveryCode(e.currentTarget));$('[data-recovery-save]')?.addEventListener('click',e=>saveNewPassword(e.currentTarget));
  $('[data-recovery-cancel]')?.addEventListener('click',async()=>{leaveRecoveryMode();await EveraCloud.signOut().catch(()=>{});if($('[data-recovery-otp-stage]'))$('[data-recovery-otp-stage]').hidden=true;fillRecoveryOtp('');clearFeedback('[data-recovery-feedback]');await renderAuth();feedback('已返回登录','如需重置密码，可以再次点击“忘记密码 / 重置密码”。','info')});
  [$('[data-auth-email]'),$('[data-auth-password]')].forEach(input=>input?.addEventListener('keydown',event=>{if(event.key!=='Enter'||!$('[data-auth-password]')?.value)return;event.preventDefault();$('[data-login-password]')?.click()}));
  [$('[data-recovery-password]'),$('[data-recovery-password-confirm]')].forEach(input=>input?.addEventListener('keydown',event=>{if(event.key!=='Enter')return;event.preventDefault();$('[data-recovery-save]')?.click()}));
  $('[data-logout]')?.addEventListener('click',async e=>{ui().setBusy?.(e.currentTarget,true,'退出中…');await EveraCloud.signOut();ui().setBusy?.(e.currentTarget,false);ui().toast?.('已退出当前账号。',{type:'success',title:'已退出'});renderAuth()});
  $('[data-sync-now]')?.addEventListener('click',async e=>{const btn=e.currentTarget;ui().setBusy?.(btn,true,'同步中…');try{const r=await EveraCloud.syncAll();if(r.ok){feedback('同步完成',`已同步 ${r.courses} 条课程状态。`,'success','[data-auth-feedback-signed]');ui().complete?.(btn,'同步完成');ui().toast?.('本机与云端 408 打卡已合并。',{type:'success',title:'同步完成'})}else throw new Error(r.reason||'同步未完成')}catch(err){const t=friendly(err);feedback('同步失败',`${t} 本机数据仍然保留。`,'error','[data-auth-feedback-signed]');ui().setBusy?.(btn,false)}});
  $('[data-export]')?.addEventListener('click',e=>exportData(e.currentTarget));$('[data-import-file]')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importData(f)});
  document.addEventListener('everflow:auth-change',event=>{if(event.detail?.event==='PASSWORD_RECOVERY')enterRecoveryMode('password');renderAuth()});document.addEventListener('everflow:cloud-sync',renderAuth);document.addEventListener('everflow:membership-change',renderAuth);addEventListener('online',renderAuth);addEventListener('offline',renderAuth);addEventListener('storage',event=>{if(event.key===OTP_COOLDOWN_KEY)enforceCooldown();if(event.key===RECOVERY_COOLDOWN_KEY)enforceRecoveryCooldown()});
  enforceCooldown();enforceRecoveryCooldown();Promise.resolve(window.EveraStore?.init()).then(renderAuth).catch(console.error);
})();
