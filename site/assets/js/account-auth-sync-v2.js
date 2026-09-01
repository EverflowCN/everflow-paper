// Everflow account auth corrective release: verified signup + old-password change; original account.js owns primary button interactions.
import './question-cloud-sync-v2.js?v=20260902-qsync2';
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm';

const cloud=window.EveraCloud;
const cfg=window.EVERFLOW_CLOUD||{};
const verifyClient=cfg.url&&cfg.publishableKey?createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const ui=()=>window.EveraUI||{};
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim());
const friendly=error=>{const raw=String(error?.message||error||'');if(/invalid login credentials/i.test(raw))return'旧密码不正确。';if(/already registered|already been registered|user already registered/i.test(raw))return'该邮箱已经注册，请直接登录或使用“忘记密码”。';if(/token.*expired|otp.*expired|expired/i.test(raw))return'验证码已过期，请重新获取。';if(/invalid.*token|otp.*invalid/i.test(raw))return'验证码不正确，请检查后重试。';if(/password/i.test(raw)&&/weak|short|least/i.test(raw))return'密码强度不足，请至少使用 8 位密码。';if(/rate limit|too many|429/i.test(raw))return'请求过于频繁，请稍后再试。';if(/signup_email_confirmation_disabled/i.test(raw))return'当前邮箱验证配置异常，已停止自动登录，请检查 Supabase 邮箱确认设置。';return raw||'操作失败，请稍后重试。'};
function feedback(selector,title,message,type='info'){const node=$(selector);if(!node)return;node.className=`auth-feedback show ${type}`;node.innerHTML='';const a=document.createElement('strong'),b=document.createElement('span');a.textContent=title;b.textContent=message;node.append(a,b)}
function otpInputs(){return $$('[data-register-otp-boxes] input')}
function otpValue(){return otpInputs().map(node=>node.value.replace(/\D/g,'')).join('').slice(0,6)}
function clearOtp(){otpInputs().forEach(node=>node.value='')}
function bindOtp(){const inputs=otpInputs();inputs.forEach((input,index)=>{input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(-1);if(input.value&&index<inputs.length-1)inputs[index+1].focus();if(otpValue().length===6)$('[data-register-verify]')?.focus()});input.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!input.value&&index>0)inputs[index-1].focus();if(event.key==='ArrowLeft'&&index>0)inputs[index-1].focus();if(event.key==='ArrowRight'&&index<inputs.length-1)inputs[index+1].focus()});input.addEventListener('paste',event=>{const raw=event.clipboardData?.getData('text')||'';if(!/\d{4,}/.test(raw))return;event.preventDefault();const digits=raw.replace(/\D/g,'').slice(0,6).split('');inputs.forEach((node,i)=>node.value=digits[i]||'');inputs[Math.min(digits.length,5)]?.focus()})})}

let pendingEmail='',pendingPassword='',registerTimer=0,registerLeft=0;
function renderCountdown(){const resend=$('[data-register-resend]');if(!resend)return;resend.disabled=registerLeft>0;resend.textContent=registerLeft>0?`${registerLeft} 秒后重发`:'重新发送'}
function startCountdown(){clearInterval(registerTimer);registerLeft=60;renderCountdown();registerTimer=setInterval(()=>{registerLeft--;renderCountdown();if(registerLeft<=0)clearInterval(registerTimer)},1000)}
function readRegistration(){return{email:($('[data-register-email]')?.value||'').trim().toLowerCase(),password:$('[data-register-password]')?.value||'',confirm:$('[data-register-password-confirm]')?.value||''}}
function validateRegistration(values){if(!validEmail(values.email))return'请输入有效邮箱。';if(values.password.length<8)return'密码至少需要 8 位。';if(values.password!==values.confirm)return'两次输入的密码不一致。';return''}

async function sendRegistration(event,{resend=false}={}){
  const button=event?.currentTarget||$('[data-register-send]');
  if(!verifyClient){feedback('[data-register-feedback]','暂时无法注册','云端认证尚未就绪。','error');return}
  let values=readRegistration();
  if(resend&&pendingEmail&&pendingPassword)values={...values,email:pendingEmail,password:pendingPassword,confirm:pendingPassword};
  const invalid=validateRegistration(values);if(invalid){feedback('[data-register-feedback]','信息不完整',invalid,'error');return}
  ui().setBusy?.(button,true,resend?'重新发送中…':'发送中…');
  try{
    if(resend){const {error}=await verifyClient.auth.resend({type:'signup',email:values.email});if(error)throw error}
    else{
      const {data,error}=await cloud.signUp(values.email,values.password);if(error)throw error;
      if(data?.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){feedback('[data-register-feedback]','邮箱已注册','请直接密码登录；忘记密码可使用邮箱验证码重置。','info');return}
      if(data?.session){await cloud.signOut().catch(()=>{});throw new Error('signup_email_confirmation_disabled')}
      pendingEmail=values.email;pendingPassword=values.password;
    }
    const stage=$('[data-register-otp-stage]');if(stage)stage.hidden=false;clearOtp();startCountdown();
    feedback('[data-register-feedback]','验证码已发送',`请查看 ${values.email} 的邮件并输入 6 位注册验证码。`,'success');
    ui().toast?.('注册验证码已发送。',{type:'success',title:'请验证邮箱',duration:4200});
    setTimeout(()=>otpInputs()[0]?.focus(),80);
  }catch(error){feedback('[data-register-feedback]','发送失败',friendly(error),'error')}
  finally{ui().setBusy?.(button,false)}
}

async function verifyRegistration(event){
  const button=event.currentTarget,token=otpValue();
  if(!pendingEmail||!pendingPassword){feedback('[data-register-feedback]','请先发送验证码','需要先填写邮箱和密码并发送注册验证码。','error');return}
  if(token.length!==6){feedback('[data-register-feedback]','验证码不完整','请输入邮件中的 6 位验证码。','error');return}
  ui().setBusy?.(button,true,'验证中…');
  try{
    const {error}=await verifyClient.auth.verifyOtp({email:pendingEmail,token,type:'signup'});if(error)throw error;
    const login=await cloud.signIn(pendingEmail,pendingPassword);if(login.error)throw login.error;
    await cloud.syncAll().catch(()=>{});
    ui().complete?.(button,'注册成功');feedback('[data-register-feedback]','注册成功','邮箱已验证，账号已创建并登录。','success');ui().toast?.('邮箱验证完成，账号已注册。',{type:'success',title:'注册成功'});setTimeout(()=>location.reload(),450);
  }catch(error){feedback('[data-register-feedback]','验证失败',friendly(error),'error');ui().setBusy?.(button,false)}
}

async function changePassword(event){
  const button=event.currentTarget,oldPassword=$('[data-account-old-password]')?.value||'',newPassword=$('[data-account-new-password]')?.value||'',confirm=$('[data-account-new-password-confirm]')?.value||'';
  if(!oldPassword){feedback('[data-account-password-feedback]','需要旧密码','请先输入当前旧密码。','error');return}
  if(newPassword.length<8){feedback('[data-account-password-feedback]','密码太短','新密码至少需要 8 位。','error');return}
  if(newPassword!==confirm){feedback('[data-account-password-feedback]','两次密码不一致','请重新确认新密码。','error');return}
  if(oldPassword===newPassword){feedback('[data-account-password-feedback]','密码未变化','新密码不能与旧密码相同。','error');return}
  ui().setBusy?.(button,true,'验证旧密码…');
  try{
    const user=await cloud.getUser({fresh:true});if(!user?.email)throw new Error('auth session missing');
    const login=await cloud.signIn(user.email,oldPassword);if(login.error)throw login.error;
    ui().setBusy?.(button,true,'保存新密码…');const updated=await cloud.updatePassword(newPassword);if(updated.error)throw updated.error;
    $('[data-account-old-password]').value='';$('[data-account-new-password]').value='';$('[data-account-new-password-confirm]').value='';
    ui().complete?.(button,'修改成功');feedback('[data-account-password-feedback]','密码已修改','下次请使用新密码登录。','success');ui().toast?.('登录密码已修改。',{type:'success',title:'账户安全'});
  }catch(error){feedback('[data-account-password-feedback]','修改失败',friendly(error),'error');ui().setBusy?.(button,false)}
}

await cloud.ready;
bindOtp();
$('[data-register-send]')?.addEventListener('click',event=>sendRegistration(event));
$('[data-register-resend]')?.addEventListener('click',event=>sendRegistration(event,{resend:true}));
$('[data-register-verify]')?.addEventListener('click',verifyRegistration);
$('[data-account-password-save]')?.addEventListener('click',changePassword);
[$('[data-register-password]'),$('[data-register-password-confirm]')].forEach(input=>input?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('[data-register-send]')?.click()}}));
[$('[data-account-old-password]'),$('[data-account-new-password]'),$('[data-account-new-password-confirm]')].forEach(input=>input?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('[data-account-password-save]')?.click()}}));
