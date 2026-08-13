(()=>{
  'use strict';
  const KEY='everflow-otp-cooldown-until-v1';
  const $=s=>document.querySelector(s);
  let timer=null;

  const remaining=()=>Math.max(0,Math.ceil((Number(localStorage.getItem(KEY)||0)-Date.now())/1000));
  function setCooldown(seconds){
    localStorage.setItem(KEY,String(Date.now()+Math.max(1,Number(seconds)||1)*1000));
    enforce();
  }
  function clearCooldown(){localStorage.removeItem(KEY);enforce()}
  function enforce(){
    clearInterval(timer);
    const send=$('[data-otp-send]'),resend=$('[data-otp-resend]');
    const tick=()=>{
      const left=remaining();
      if(left<=0){
        clearInterval(timer);timer=null;
        if(send){send.disabled=false;send.textContent='发送验证码'}
        if(resend){resend.disabled=false;resend.textContent='重新发送验证码'}
        return;
      }
      if(send){send.disabled=true;send.textContent=`${left} 秒后可重发`}
      if(resend){resend.disabled=true;resend.textContent=`${left} 秒后重发`}
    };
    tick();
    if(remaining()>0)timer=setInterval(tick,1000);
  }

  async function wrapCloud(){
    for(let i=0;i<120;i++){
      if(window.EveraCloud?.signInOtp)break;
      await new Promise(r=>setTimeout(r,50));
    }
    const cloud=window.EveraCloud;
    if(!cloud?.signInOtp||cloud.signInOtp.__otpGuard)return;
    const original=cloud.signInOtp.bind(cloud);
    const guarded=async email=>{
      const left=remaining();
      if(left>0)throw new Error(`验证码发送仍在冷却中，请 ${left} 秒后再试。已有验证码可直接输入。`);
      setCooldown(10);
      try{
        const result=await original(email);
        if(result?.error)throw result.error;
        setCooldown(60);
        return result;
      }catch(error){
        const text=String(error?.message||error||'');
        if(/rate limit|too many|email rate|over_email_send_rate_limit|429/i.test(text)){
          setCooldown(300);
          throw new Error('邮件服务当前达到发送频率限制，请稍后再试。已有验证码请直接使用；已有密码可直接登录。若还没有账号，可联系 QQ 1504615378 免费人工增加账号。');
        }
        setCooldown(15);
        throw error;
      }
    };
    guarded.__otpGuard=true;
    cloud.signInOtp=guarded;
  }

  function bindPasswordEnter(){
    const email=$('[data-auth-email]'),password=$('[data-auth-password]'),button=$('[data-login-password]');
    [email,password].forEach(input=>input?.addEventListener('keydown',event=>{
      if(event.key!=='Enter')return;
      if(!password?.value)return;
      event.preventDefault();button?.click();
    }));
  }

  function boot(){enforce();wrapCloud().catch(console.warn);bindPasswordEnter()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  addEventListener('storage',e=>{if(e.key===KEY)enforce()});
})();