const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'apps/web/static/site/site.js');
if (!fs.existsSync(file)) {
  console.log('[Everflow] Codespaces auth patch skipped: site.js not found.');
  process.exit(0);
}

let s = fs.readFileSync(file, 'utf8');
if (s.includes('ef-codespace-session-token')) {
  console.log('[Everflow] Codespaces auth fallback already applied.');
  process.exit(0);
}

const oldApi = "function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),2200)}\nasync function api(url,opt={}){const r=await fetch(url,{credentials:'same-origin',headers:{'content-type':'application/json',...(opt.headers||{})},...opt});let b={};try{b=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(b.error||`HTTP ${r.status}`),{status:r.status,body:b});return b}";
const newApi = "function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),2200)}\nconst codespacesAuthFallback=/\\.app\\.github\\.dev$/i.test(location.hostname)||/\\.githubpreview\\.dev$/i.test(location.hostname);\nfunction fallbackToken(){try{return codespacesAuthFallback?(sessionStorage.getItem('ef-codespace-session-token')||''):''}catch{return''}}\nfunction rememberAuthToken(result){try{if(codespacesAuthFallback&&result?.token)sessionStorage.setItem('ef-codespace-session-token',String(result.token))}catch{}}\nfunction forgetAuthToken(){try{sessionStorage.removeItem('ef-codespace-session-token')}catch{}}\nasync function api(url,opt={}){const headers={'content-type':'application/json',...(opt.headers||{})},token=fallbackToken();if(token&&!headers.authorization)headers.authorization=`Bearer ${token}`;const r=await fetch(url,{credentials:'same-origin',...opt,headers});let b={};try{b=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(b.error||`HTTP ${r.status}`),{status:r.status,body:b});return b}";
if (!s.includes(oldApi)) throw new Error('AUTH_PATCH_API_ANCHOR_NOT_FOUND');
s = s.replace(oldApi, newApi);

const oldSubmit = "try{await api(`/api/auth/${reg?'register':'login'}`,{method:'POST',body:JSON.stringify({email,password,displayName})});location.href=reg?'/onboarding':'/app'}catch(e){";
const newSubmit = "try{const authResult=await api(`/api/auth/${reg?'register':'login'}`,{method:'POST',body:JSON.stringify({email,password,displayName})});rememberAuthToken(authResult);location.href=reg?'/onboarding':'/app'}catch(e){";
if (!s.includes(oldSubmit)) throw new Error('AUTH_PATCH_SUBMIT_ANCHOR_NOT_FOUND');
s = s.replace(oldSubmit, newSubmit);

const oldPasskey = "try{await loginPasskey(email);location.href='/app'}catch(e){";
const newPasskey = "try{const authResult=await loginPasskey(email);rememberAuthToken(authResult);location.href='/app'}catch(e){";
if (s.includes(oldPasskey)) s = s.replace(oldPasskey, newPasskey);

const oldRecovery = "const r=await api('/api/auth/recovery-code/login',{method:'POST',body:JSON.stringify({email:$('#recoveryEmail').value.trim(),code:$('#recoveryCodeLogin').value.trim()})});toast(`登录成功 · 剩余 ${r.recoveryCodesRemaining} 个恢复代码`);location.href='/app/settings/security'";
const newRecovery = "const r=await api('/api/auth/recovery-code/login',{method:'POST',body:JSON.stringify({email:$('#recoveryEmail').value.trim(),code:$('#recoveryCodeLogin').value.trim()})});rememberAuthToken(r);toast(`登录成功 · 剩余 ${r.recoveryCodesRemaining} 个恢复代码`);location.href='/app/settings/security'";
if (s.includes(oldRecovery)) s = s.replace(oldRecovery, newRecovery);

const oldLogout = "await api('/api/auth/logout',{method:'POST'});location.href='/'";
const newLogout = "await api('/api/auth/logout',{method:'POST'});forgetAuthToken();location.href='/'";
if (s.includes(oldLogout)) s = s.replace(oldLogout, newLogout);

fs.writeFileSync(file, s);
console.log('[Everflow] Codespaces auth fallback applied.');
