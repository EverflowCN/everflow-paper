const gate=document.querySelector('#englishGate'),title=document.querySelector('#englishGateTitle'),copy=document.querySelector('#englishGateCopy'),actions=document.querySelector('#englishGateActions'),root=document.querySelector('[data-english-root]');
const STATE_KEY='eng2_v8';let frame=null,client=null,authListener=null;
function readState(){try{const x=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return {}}}
function safeJson(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')}
function locked(message='页面不存在或当前账号没有访问权限。'){frame?.remove();frame=null;gate.hidden=false;title.textContent='英语写作训练';copy.textContent=message;actions.hidden=false}
function saveState(value){if(!value||typeof value!=='object')return;let raw='';try{raw=JSON.stringify(value)}catch{return}if(raw.length>1500000)return;try{localStorage.setItem(STATE_KEY,raw)}catch{}}
async function boot(){
 try{
  gate.hidden=false;title.textContent='正在验证管理员身份';copy.textContent='英语写作训练内容仅管理员可见。验证通过后才会加载正文。';actions.hidden=true;
  await import('/assets/js/cloud-config.js?v=20260924-1');
  await import('/assets/js/admin-cloud.js?v=20260924-1');
  client=await window.EveraAdminCloud?.ready;if(!client)throw Error('cloud_unavailable');
  const {data,error}=await client.auth.getUser();const role=String(data?.user?.app_metadata?.role||'').toLowerCase();
  if(error||!data?.user)return locked('请先登录网站账号，再回到这里重新验证。');
  if(!['owner','admin'].includes(role))return locked();
  const {data:result,error:fnError}=await client.functions.invoke('owner-english-writing',{body:{action:'boot'}});
  if(fnError||!result?.html)throw Object.assign(Error('function_failed'),{status:fnError?.context?.status});
  const injected=result.html.replace('__ENGLISH_STATE__',()=>safeJson(readState()));
  frame=document.createElement('iframe');frame.className='english-frame';frame.title='英语二写作 23+ 训练系统';frame.setAttribute('sandbox','allow-scripts allow-downloads');frame.srcdoc=injected;root.appendChild(frame);gate.hidden=true;
  if(!authListener)authListener=client.auth.onAuthStateChange((event,session)=>{const nextRole=String(session?.user?.app_metadata?.role||'').toLowerCase();if(event==='SIGNED_OUT'||(session?.user&&!['owner','admin'].includes(nextRole)))locked()});
 }catch(e){console.error('English writing boot failed',e);locked(e?.status===404?'页面不存在或当前账号没有访问权限。':'暂时无法打开英语写作训练，请稍后重新验证。')}
}
window.addEventListener('message',event=>{if(!frame||event.source!==frame.contentWindow)return;const data=event.data;if(data?.type==='evera-english-writing-save')saveState(data.state)});
document.querySelector('#englishRetry').addEventListener('click',boot);
document.addEventListener('visibilitychange',()=>{if(document.hidden||!client)return;client.auth.getUser().then(({data,error})=>{const role=String(data?.user?.app_metadata?.role||'').toLowerCase();if(error||!data?.user||!['owner','admin'].includes(role))locked()})});
boot();
