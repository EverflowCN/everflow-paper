const fs=require('fs');
const path=require('path');

const file=path.join(process.cwd(),'apps/web/static/site/site.js');
if(!fs.existsSync(file)){
  console.error('[Everflow] Codespaces auth patch failed: site.js not found.');
  process.exit(1);
}

let s=fs.readFileSync(file,'utf8');
const before=s;
const stats={api:0,load:0,submit:0,passkey:0,recovery:0,logout:0,render:0,quota:0};

function replaceOnce(label,from,to,{required=false}={}){
  if(s.includes(to)) return;
  if(s.includes(from)){
    s=s.replace(from,to);
    stats[label]++;
    return;
  }
  if(required) throw new Error(`AUTH_PATCH_${label.toUpperCase()}_ANCHOR_NOT_FOUND`);
}

const originalApi="function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),2200)}\nasync function api(url,opt={}){const r=await fetch(url,{credentials:'same-origin',headers:{'content-type':'application/json',...(opt.headers||{})},...opt});let b={};try{b=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(b.error||`HTTP ${r.status}`),{status:r.status,body:b});return b}";
const v1Api="function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),2200)}\nconst codespacesAuthFallback=/\\.app\\.github\\.dev$/i.test(location.hostname)||/\\.githubpreview\\.dev$/i.test(location.hostname);\nfunction fallbackToken(){try{return codespacesAuthFallback?(sessionStorage.getItem('ef-codespace-session-token')||''):''}catch{return''}}\nfunction rememberAuthToken(result){try{if(codespacesAuthFallback&&result?.token)sessionStorage.setItem('ef-codespace-session-token',String(result.token))}catch{}}\nfunction forgetAuthToken(){try{sessionStorage.removeItem('ef-codespace-session-token')}catch{}}\nasync function api(url,opt={}){const headers={'content-type':'application/json',...(opt.headers||{})},token=fallbackToken();if(token&&!headers.authorization)headers.authorization=`Bearer ${token}`;const r=await fetch(url,{credentials:'same-origin',...opt,headers});let b={};try{b=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(b.error||`HTTP ${r.status}`),{status:r.status,body:b});return b}";
const v3Api="function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),2200)}\nconst codespacesAuthFallback=/\\.app\\.github\\.dev$/i.test(location.hostname)||/\\.githubpreview\\.dev$/i.test(location.hostname);\nfunction fallbackToken(){try{return codespacesAuthFallback?(sessionStorage.getItem('ef-codespace-session-token')||''):''}catch{return''}}\nfunction fallbackUser(){try{return codespacesAuthFallback?JSON.parse(sessionStorage.getItem('ef-codespace-session-user')||'null'):null}catch{return null}}\nfunction rememberAuthToken(result){try{if(!codespacesAuthFallback)return;if(result?.token)sessionStorage.setItem('ef-codespace-session-token',String(result.token));if(result?.user?.id)sessionStorage.setItem('ef-codespace-session-user',JSON.stringify(result.user))}catch{}}\nfunction forgetAuthToken(){try{sessionStorage.removeItem('ef-codespace-session-token');sessionStorage.removeItem('ef-codespace-session-user')}catch{}}\nasync function api(url,opt={}){const headers={'content-type':'application/json',...(opt.headers||{})},token=fallbackToken();if(token&&!headers.authorization)headers.authorization=`Bearer ${token}`;const r=await fetch(url,{credentials:'same-origin',...opt,headers});let b={};try{b=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(b.error||`HTTP ${r.status}`),{status:r.status,body:b});return b}";
replaceOnce('api',v1Api,v3Api);
replaceOnce('api',originalApi,v3Api,{required:!s.includes('function fallbackUser()')});

const originalLoad="async function loadAccount(){try{const x=await api('/api/auth/me');me=x.user;quota=x.quota;return true}catch(e){if(e.status===401)return false;throw e}}";
const v2Load="async function loadAccount(){try{const x=await api('/api/auth/me'),u=x?.user||fallbackUser();if(!u?.id)return false;me=u;quota=x?.quota||null;return true}catch(e){if(e.status===401){forgetAuthToken();return false}const u=fallbackUser();if(codespacesAuthFallback&&u?.id){me=u;quota=null;return true}throw e}}";
const v3Load="async function loadAccount(){try{const x=await api('/api/auth/me'),u=x?.user||fallbackUser();if(!u?.id){forgetAuthToken();me=null;quota=null;return false}me=u;quota=x?.quota||null;try{if(codespacesAuthFallback)sessionStorage.setItem('ef-codespace-session-user',JSON.stringify(u))}catch{}return true}catch(e){if(e.status===401){forgetAuthToken();me=null;quota=null;return false}const u=fallbackUser();if(codespacesAuthFallback&&u?.id&&fallbackToken()){me=u;quota=null;return true}throw e}}";
replaceOnce('load',v2Load,v3Load);
replaceOnce('load',originalLoad,v3Load,{required:!s.includes('async function loadAccount(){try{const x=await api(\'/api/auth/me\'),u=x?.user||fallbackUser()')});

const originalSubmit="try{await api(`/api/auth/${reg?'register':'login'}`,{method:'POST',body:JSON.stringify({email,password,displayName})});location.href=reg?'/onboarding':'/app'}catch(e){";
const patchedSubmit="try{const authResult=await api(`/api/auth/${reg?'register':'login'}`,{method:'POST',body:JSON.stringify({email,password,displayName})});rememberAuthToken(authResult);location.href=reg?'/onboarding':'/app'}catch(e){";
replaceOnce('submit',originalSubmit,patchedSubmit);
const originalPasskey="try{await loginPasskey(email);location.href='/app'}catch(e){";
const patchedPasskey="try{const authResult=await loginPasskey(email);rememberAuthToken(authResult);location.href='/app'}catch(e){";
replaceOnce('passkey',originalPasskey,patchedPasskey);
const originalRecovery="const r=await api('/api/auth/recovery-code/login',{method:'POST',body:JSON.stringify({email:$('#recoveryEmail').value.trim(),code:$('#recoveryCodeLogin').value.trim()})});toast(`登录成功 · 剩余 ${r.recoveryCodesRemaining} 个恢复代码`);location.href='/app/settings/security'";
const patchedRecovery="const r=await api('/api/auth/recovery-code/login',{method:'POST',body:JSON.stringify({email:$('#recoveryEmail').value.trim(),code:$('#recoveryCodeLogin').value.trim()})});rememberAuthToken(r);toast(`登录成功 · 剩余 ${r.recoveryCodesRemaining} 个恢复代码`);location.href='/app/settings/security'";
replaceOnce('recovery',originalRecovery,patchedRecovery);
const originalLogout="await api('/api/auth/logout',{method:'POST'});location.href='/'";
const patchedLogout="await api('/api/auth/logout',{method:'POST'});forgetAuthToken();location.href='/'";
replaceOnce('logout',originalLogout,patchedLogout);

// Render defensively when account hydration is temporarily incomplete.
for(const [from,to] of [
  ['initials(me.displayName)',"initials(me?.displayName||fallbackUser()?.displayName||'E')"],
  ['safe(me.displayName)',"safe(me?.displayName||fallbackUser()?.displayName||'用户')"],
  ['safe(me.email)',"safe(me?.email||fallbackUser()?.email||'')"],
  ["me.accountStatus==='normal'","(me?.accountStatus||'normal')==='normal'"],
  ["safe(me.accountStatus||'normal')","safe(me?.accountStatus||'normal')"]
]){
  if(s.includes(from)){s=s.replaceAll(from,to);stats.render++}
}

// A cached Codespaces user can be available while /api/auth/me is temporarily
// unavailable. In that state quota is intentionally null. Make every direct
// quota property read null-safe so dashboard rendering cannot throw.
const quotaDirect=/\bquota\.([A-Za-z_$][\w$]*)/g;
s=s.replace(quotaDirect,(_,prop)=>{stats.quota++;return `quota?.${prop}`});

// Fail closed if the essential auth fallback did not end up in the expanded source.
const requiredMarkers=['codespacesAuthFallback','fallbackToken()','fallbackUser()','rememberAuthToken','async function loadAccount()'];
for(const marker of requiredMarkers){
  if(!s.includes(marker)) throw new Error(`AUTH_PATCH_VERIFY_FAILED:${marker}`);
}

fs.writeFileSync(file,s);
console.log(`[Everflow] Codespaces auth fallback applied: ${JSON.stringify(stats)}`);
if(before===s) console.log('[Everflow] Codespaces auth fallback already current.');
