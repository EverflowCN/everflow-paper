const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'apps/web/static/site/site.js');
if(!fs.existsSync(file)){console.log('[Everflow] Codespaces auth patch skipped: site.js not found.');process.exit(0)}
let s=fs.readFileSync(file,'utf8');

const originalApi="function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),2200)}\nasync function api(url,opt={}){const r=await fetch(url,{credentials:'same-origin',headers:{'content-type':'application/json',...(opt.headers||{})},...opt});let b={};try{b=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(b.error||`HTTP ${r.status}`),{status:r.status,body:b});return b}";
const v1Api="function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),2200)}\nconst codespacesAuthFallback=/\\.app\\.github\\.dev$/i.test(location.hostname)||/\\.githubpreview\\.dev$/i.test(location.hostname);\nfunction fallbackToken(){try{return codespacesAuthFallback?(sessionStorage.getItem('ef-codespace-session-token')||''):''}catch{return''}}\nfunction rememberAuthToken(result){try{if(codespacesAuthFallback&&result?.token)sessionStorage.setItem('ef-codespace-session-token',String(result.token))}catch{}}\nfunction forgetAuthToken(){try{sessionStorage.removeItem('ef-codespace-session-token')}catch{}}\nasync function api(url,opt={}){const headers={'content-type':'application/json',...(opt.headers||{})},token=fallbackToken();if(token&&!headers.authorization)headers.authorization=`Bearer ${token}`;const r=await fetch(url,{credentials:'same-origin',...opt,headers});let b={};try{b=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(b.error||`HTTP ${r.status}`),{status:r.status,body:b});return b}";
const v2Api="function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),2200)}\nconst codespacesAuthFallback=/\\.app\\.github\\.dev$/i.test(location.hostname)||/\\.githubpreview\\.dev$/i.test(location.hostname);\nfunction fallbackToken(){try{return codespacesAuthFallback?(sessionStorage.getItem('ef-codespace-session-token')||''):''}catch{return''}}\nfunction fallbackUser(){try{return codespacesAuthFallback?JSON.parse(sessionStorage.getItem('ef-codespace-session-user')||'null'):null}catch{return null}}\nfunction rememberAuthToken(result){try{if(!codespacesAuthFallback)return;if(result?.token)sessionStorage.setItem('ef-codespace-session-token',String(result.token));if(result?.user?.id)sessionStorage.setItem('ef-codespace-session-user',JSON.stringify(result.user))}catch{}}\nfunction forgetAuthToken(){try{sessionStorage.removeItem('ef-codespace-session-token');sessionStorage.removeItem('ef-codespace-session-user')}catch{}}\nasync function api(url,opt={}){const headers={'content-type':'application/json',...(opt.headers||{})},token=fallbackToken();if(token&&!headers.authorization)headers.authorization=`Bearer ${token}`;const r=await fetch(url,{credentials:'same-origin',...opt,headers});let b={};try{b=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(b.error||`HTTP ${r.status}`),{status:r.status,body:b});return b}";
const v3Api=v2Api;
if(s.includes(v1Api))s=s.replace(v1Api,v3Api);else if(s.includes(originalApi))s=s.replace(originalApi,v3Api);

const originalLoad="async function loadAccount(){try{const x=await api('/api/auth/me');me=x.user;quota=x.quota;return true}catch(e){if(e.status===401)return false;throw e}}";
const v2Load="async function loadAccount(){try{const x=await api('/api/auth/me'),u=x?.user||fallbackUser();if(!u?.id)return false;me=u;quota=x?.quota||null;return true}catch(e){if(e.status===401){forgetAuthToken();return false}const u=fallbackUser();if(codespacesAuthFallback&&u?.id){me=u;quota=null;return true}throw e}}";
const v3Load="async function loadAccount(){try{const x=await api('/api/auth/me'),u=x?.user||fallbackUser();if(!u?.id){forgetAuthToken();me=null;quota=null;return false}me=u;quota=x?.quota||null;try{if(codespacesAuthFallback)sessionStorage.setItem('ef-codespace-session-user',JSON.stringify(u))}catch{}return true}catch(e){if(e.status===401){forgetAuthToken();me=null;quota=null;return false}const u=fallbackUser();if(codespacesAuthFallback&&u?.id&&fallbackToken()){me=u;quota=null;return true}throw e}}";
if(s.includes(v2Load))s=s.replace(v2Load,v3Load);else if(s.includes(originalLoad))s=s.replace(originalLoad,v3Load);

const originalSubmit="try{await api(`/api/auth/${reg?'register':'login'}`,{method:'POST',body:JSON.stringify({email,password,displayName})});location.href=reg?'/onboarding':'/app'}catch(e){";
const patchedSubmit="try{const authResult=await api(`/api/auth/${reg?'register':'login'}`,{method:'POST',body:JSON.stringify({email,password,displayName})});rememberAuthToken(authResult);location.href=reg?'/onboarding':'/app'}catch(e){";
if(s.includes(originalSubmit))s=s.replace(originalSubmit,patchedSubmit);
const originalPasskey="try{await loginPasskey(email);location.href='/app'}catch(e){";
const patchedPasskey="try{const authResult=await loginPasskey(email);rememberAuthToken(authResult);location.href='/app'}catch(e){";
if(s.includes(originalPasskey))s=s.replace(originalPasskey,patchedPasskey);
const originalRecovery="const r=await api('/api/auth/recovery-code/login',{method:'POST',body:JSON.stringify({email:$('#recoveryEmail').value.trim(),code:$('#recoveryCodeLogin').value.trim()})});toast(`登录成功 · 剩余 ${r.recoveryCodesRemaining} 个恢复代码`);location.href='/app/settings/security'";
const patchedRecovery="const r=await api('/api/auth/recovery-code/login',{method:'POST',body:JSON.stringify({email:$('#recoveryEmail').value.trim(),code:$('#recoveryCodeLogin').value.trim()})});rememberAuthToken(r);toast(`登录成功 · 剩余 ${r.recoveryCodesRemaining} 个恢复代码`);location.href='/app/settings/security'";
if(s.includes(originalRecovery))s=s.replace(originalRecovery,patchedRecovery);
const originalLogout="await api('/api/auth/logout',{method:'POST'});location.href='/'";
const patchedLogout="await api('/api/auth/logout',{method:'POST'});forgetAuthToken();location.href='/'";
if(s.includes(originalLogout))s=s.replace(originalLogout,patchedLogout);

// Rendering must never crash just because account hydration is temporarily empty.
s=s.replaceAll('initials(me.displayName)','initials(me?.displayName||fallbackUser()?.displayName||\'E\')');
s=s.replaceAll('safe(me.displayName)','safe(me?.displayName||fallbackUser()?.displayName||\'用户\')');
s=s.replaceAll('safe(me.email)','safe(me?.email||fallbackUser()?.email||\'\')');
s=s.replaceAll("me.accountStatus==='normal'","(me?.accountStatus||'normal')==='normal'");
s=s.replaceAll("safe(me.accountStatus||'normal')","safe(me?.accountStatus||'normal')");

fs.writeFileSync(file,s);
console.log('[Everflow] Codespaces auth fallback v3 applied.');
