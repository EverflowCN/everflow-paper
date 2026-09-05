import '/assets/js/admin-cloud.js';
const title=document.querySelector('#gateTitle'),copy=document.querySelector('#gateCopy'),gate=document.querySelector('#gate');
let client=null,frame=null,revision=0,pending=null,saving=false,blocked=false,retryTimer=null,wakeLock=null,wantAwake=false,lastSnapshot=null,authListener=null;
const message=data=>frame?.contentWindow?.postMessage(data,'*');
function locked(text='页面不存在或当前账号没有访问权限。'){
 blocked=true;pending=null;lastSnapshot=null;clearTimeout(retryTimer);frame?.remove();frame=null;wantAwake=false;wakeLock?.release().catch(()=>{});gate.hidden=false;title.textContent='私人空间';copy.textContent=text;document.querySelector('#gateActions').hidden=false;
}
async function invoke(action,extra={}){
 const {data,error}=await client.functions.invoke('owner-focus',{body:{action,...extra}});
 if(error){let payload;try{payload=await error.context?.clone().json()}catch{}const e=new Error(payload?.error||error.message);e.status=error.context?.status;throw e}
 if(data?.error)throw Error(data.error);return data;
}
async function boot(){
 try{
  gate.hidden=false;title.textContent='正在验证身份';copy.textContent='请稍候。';document.querySelector('#gateActions').hidden=true;
  client=await window.EveraAdminCloud.ready;if(!client)throw Error('连接暂时不可用，请稍后重试。');
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user)return locked('请先登录你的网站账号，再回到这里重新验证。');
  if(data.user.app_metadata?.role!=='owner')return locked();
  const result=await invoke('boot');revision=result.revision;blocked=false;pending=null;
  frame?.remove();frame=document.createElement('iframe');frame.title='我的番茄';frame.setAttribute('sandbox','allow-scripts allow-downloads');frame.setAttribute('allow','autoplay; accelerometer; gyroscope');frame.srcdoc=result.html;document.body.append(frame);gate.hidden=true;
  if(!authListener)authListener=client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(session?.user&&session.user.app_metadata?.role!=='owner'))locked()});
 }catch(e){locked(e.status===404?'页面不存在或当前账号没有访问权限。':'暂时无法打开，请稍后重新验证。')}
}
async function flush(){
 if(saving||!pending||blocked)return;saving=true;
 const snapshot=pending;pending=null;
 try{const result=await invoke('save',{revision,state:snapshot});revision=result.revision;message({type:'focus-save-status',status:'saved'})}
 catch(e){
  if(e.status===409||e.message==='conflict'){blocked=true;message({type:'focus-save-status',status:'conflict'})}
  else if(e.status===401||e.status===403||e.status===404){locked('登录已失效，请重新登录。')}
  else {pending=pending||snapshot;message({type:'focus-save-status',status:'error',message:'云端暂时没有保存成功，请保持页面打开，或先导出备份。'});retryTimer=setTimeout(()=>{retryTimer=null;flush()},5000)}
 }finally{saving=false;if(pending&&!blocked&&!retryTimer)flush()}
}
async function updateWake(){if(!wantAwake||document.hidden){await wakeLock?.release().catch(()=>{});wakeLock=null;return}if(!wakeLock&&navigator.wakeLock){try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>wakeLock=null)}catch{}}}
window.addEventListener('message',event=>{
 if(!frame||event.source!==frame.contentWindow)return;
 const data=event.data;if(!data||typeof data.type!=='string')return;
 if(data.type==='focus-save'&&!blocked){if(!data.state||JSON.stringify(data.state).length>2100000)return;lastSnapshot=data.state;pending=data.state;clearTimeout(retryTimer);retryTimer=null;wantAwake=!!data.state.active;updateWake();flush()}
 if(data.type==='focus-exit')location.assign('/');
 if(data.type==='focus-reload')location.reload();
 if(data.type==='focus-export'&&data.state){const url=URL.createObjectURL(new Blob([JSON.stringify(data.state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='我的番茄-备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
 if(data.type==='focus-awake'){wantAwake=!!data.active;updateWake()}
 if(data.type==='focus-notification-permission')document.querySelector('#permission').hidden=false;
 if(data.type==='focus-notify'&&'Notification' in window&&Notification.permission==='granted'){try{new Notification(String(data.title||'专注完成').slice(0,80),{body:String(data.body||'').slice(0,180),tag:'focus-complete'})}catch{}}
});
document.querySelector('#allowNotifications').onclick=async()=>{document.querySelector('#permission').hidden=true;let result='此浏览器暂不支持桌面提醒。';if('Notification' in window){try{result=await Notification.requestPermission()==='granted'?'完成提醒已开启；网页关闭后无法继续发送提醒。':'未获得提醒权限。'}catch{}}message({type:'focus-permission-result',message:result})};
document.querySelector('#cancelNotifications').onclick=()=>document.querySelector('#permission').hidden=true;
document.querySelector('#retry').onclick=boot;
window.addEventListener('beforeunload',e=>{if(pending||saving){e.preventDefault();e.returnValue=''}});
window.addEventListener('online',()=>{clearTimeout(retryTimer);retryTimer=null;flush()});
document.addEventListener('visibilitychange',()=>{updateWake();if(!document.hidden&&client){client.auth.getUser().then(({data,error})=>{if(error||data?.user?.app_metadata?.role!=='owner')locked()});clearTimeout(retryTimer);retryTimer=null;flush()}});
boot();
