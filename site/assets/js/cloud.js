const cfg=window.EVERFLOW_CLOUD||{};
const enabled=Boolean(cfg.url&&cfg.publishableKey);
let client=null;
let readyResolve;
let syncing=false;
const ready=new Promise(r=>readyResolve=r);

const fromFocus=r=>({
  id:r.id,subject:r.subject,startedAt:r.started_at,endedAt:r.ended_at,
  durationSeconds:r.duration_seconds,note:r.note||'',deviceId:r.device_id||'',updatedAt:r.updated_at,syncState:'cloud'
});
const fromCourse=r=>({
  id:r.course_id,subject:r.subject,done:r.done,note:r.note||'',completedAt:r.completed_at,
  updatedAt:r.updated_at,deviceId:r.device_id||'',syncState:'cloud'
});
const toFocus=(r,userId)=>({
  id:r.id,user_id:userId,subject:r.subject,started_at:r.startedAt,ended_at:r.endedAt,
  duration_seconds:r.durationSeconds,note:r.note||'',device_id:r.deviceId||'',updated_at:r.updatedAt||new Date().toISOString()
});
const toCourse=(r,userId)=>({
  user_id:userId,course_id:r.id,subject:r.subject||'unknown',done:Boolean(r.done),note:r.note||'',
  completed_at:r.completedAt||null,device_id:r.deviceId||'',updated_at:r.updatedAt||new Date().toISOString()
});
const isRlsConflict=e=>/row-level security|violates row-level security|42501/i.test(`${e?.code||''} ${e?.message||''}`);

async function init(){
  if(!enabled){readyResolve(null);document.dispatchEvent(new CustomEvent('everflow:cloud-ready',{detail:{enabled:false}}));return null}
  try{
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm');
    client=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    client.auth.onAuthStateChange((event,session)=>{
      document.dispatchEvent(new CustomEvent('everflow:auth-change',{detail:{event,user:session?.user||null}}));
      if(session?.user&&navigator.onLine!==false)setTimeout(()=>syncAll().catch(()=>{}),0);
    });
    readyResolve(client);
    document.dispatchEvent(new CustomEvent('everflow:cloud-ready',{detail:{enabled:true}}));
    const {data}=await client.auth.getSession();
    if(data?.session?.user&&navigator.onLine!==false)syncAll().catch(()=>{});
    return client;
  }catch(err){
    console.error('Everflow cloud init failed',err);readyResolve(null);
    document.dispatchEvent(new CustomEvent('everflow:cloud-ready',{detail:{enabled:false,error:String(err)}}));
    document.dispatchEvent(new CustomEvent('everflow:cloud-error',{detail:{message:'云端初始化失败'}}));
    return null;
  }
}

async function getUser(){await ready;if(!client)return null;const {data,error}=await client.auth.getUser();if(error)return null;return data.user||null}
async function signIn(email,password){await ready;if(!client)throw new Error('云同步尚未配置');return client.auth.signInWithPassword({email,password})}
async function signUp(email,password){await ready;if(!client)throw new Error('云同步尚未配置');return client.auth.signUp({email,password})}
async function signInOtp(email){await ready;if(!client)throw new Error('云同步尚未配置');return client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}})}
async function signOut(){await ready;if(!client)return;return client.auth.signOut()}

async function pushLocal(userId){
  const local=await EveraStore.exportAll();
  const focusRows=local.focusSessions.map(r=>toFocus(r,userId));
  const courseRows=local.courseStates.map(r=>toCourse(r,userId));
  if(focusRows.length){const {error}=await client.from('focus_sessions').upsert(focusRows,{onConflict:'id'});if(error)throw error}
  if(courseRows.length){const {error}=await client.from('course_states').upsert(courseRows,{onConflict:'user_id,course_id'});if(error)throw error}
  return {focusRows,courseRows};
}

async function syncAll(){
  await ready;if(!client||!window.EveraStore)return {ok:false,reason:'disabled'};
  if(navigator.onLine===false)return {ok:false,reason:'offline'};
  if(syncing)return {ok:false,reason:'busy'};
  const user=await getUser();if(!user)return {ok:false,reason:'guest'};
  syncing=true;
  try{
    await EveraStore.init();
    const [remoteFocus,remoteCourse]=await Promise.all([
      client.from('focus_sessions').select('*').eq('user_id',user.id),
      client.from('course_states').select('*').eq('user_id',user.id)
    ]);
    if(remoteFocus.error)throw remoteFocus.error;if(remoteCourse.error)throw remoteCourse.error;

    const mapped={focusSessions:(remoteFocus.data||[]).map(fromFocus),courseStates:(remoteCourse.data||[]).map(fromCourse)};
    const scope=await EveraStore.prepareForUser?.(user.id,{remoteFocusCount:mapped.focusSessions.length,remoteCourseCount:mapped.courseStates.length});
    if(scope?.recoveredLegacy){
      document.dispatchEvent(new CustomEvent('everflow:cloud-recovery',{detail:{message:'检测到账户切换，已隔离上一账号的本机数据并载入当前账号。'}}));
    }else if(scope?.changed&&scope?.from){
      document.dispatchEvent(new CustomEvent('everflow:cloud-recovery',{detail:{message:'已切换本机数据空间，当前账号不会混入上一账号的数据。'}}));
    }

    await EveraStore.importAll(mapped);
    let pushed;
    try{pushed=await pushLocal(user.id)}catch(error){
      if(!isRlsConflict(error)||!EveraStore.recoverScopeConflict)throw error;
      await EveraStore.recoverScopeConflict(user.id,mapped);
      document.dispatchEvent(new CustomEvent('everflow:cloud-recovery',{detail:{message:'发现旧版跨账号本机记录，已安全隔离并恢复当前账号云端数据。'}}));
      pushed=await pushLocal(user.id);
    }

    const {error:profileError}=await client.from('profiles').upsert({user_id:user.id,last_seen_at:new Date().toISOString()},{onConflict:'user_id'});
    if(profileError)throw profileError;
    const out={ok:true,at:new Date().toISOString(),userId:user.id,focus:pushed.focusRows.length,courses:pushed.courseRows.length};
    localStorage.setItem('everflow-last-cloud-sync',JSON.stringify(out));
    localStorage.setItem('everflow-last-cloud-user-id-v2',user.id);
    document.dispatchEvent(new CustomEvent('everflow:cloud-sync',{detail:out}));
    return out;
  }catch(error){
    console.error('Everflow cloud sync failed',error);
    document.dispatchEvent(new CustomEvent('everflow:cloud-error',{detail:{message:error?.message||'同步失败'}}));
    throw error;
  }finally{syncing=false}
}

async function isOwner(){const u=await getUser();return Boolean(u?.app_metadata?.role==='owner')}
async function getOwnerOverview(){
  await ready;if(!client||!(await isOwner()))throw new Error('无管理权限');
  const [profiles,focus,courses,recent]=await Promise.all([
    client.from('profiles').select('*',{count:'exact',head:true}),
    client.from('focus_sessions').select('*',{count:'exact',head:true}),
    client.from('course_states').select('*',{count:'exact',head:true}),
    client.from('profiles').select('user_id,display_name,created_at,last_seen_at').order('last_seen_at',{ascending:false}).limit(20)
  ]);
  if(profiles.error)throw profiles.error;if(focus.error)throw focus.error;if(courses.error)throw courses.error;if(recent.error)throw recent.error;
  return {users:profiles.count||0,focus:focus.count||0,courses:courses.count||0,recent:recent.data||[]};
}

async function ownerUsers(action,payload={}){
  await ready;if(!client||!(await isOwner()))throw new Error('无管理权限');
  const {data,error}=await client.functions.invoke('owner-users',{body:{action,...payload}});
  if(error)throw error;if(data?.error)throw new Error(data.error);return data;
}

async function membership(action='status',payload={}){
  await ready;if(!client)throw new Error('云同步尚未配置');
  const user=await getUser();if(!user)throw new Error('login_required');
  const {data,error}=await client.functions.invoke('membership',{body:{action,...payload}});
  if(error)throw error;if(data?.error)throw new Error(data.error);return data;
}

async function getOwnerAudit(){
  await ready;if(!client||!(await isOwner()))throw new Error('无管理权限');
  const {data,error}=await client.from('admin_audit').select('id,actor_user_id,action,target_user_id,detail,created_at').order('created_at',{ascending:false}).limit(30);
  if(error)throw error;return data||[];
}

let syncTimer;
document.addEventListener('everflow:study-change',()=>{if(syncing)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncAll().catch(()=>{}),1200)});
addEventListener('online',()=>syncAll().catch(()=>{}));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)syncAll().catch(()=>{})});
setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)syncAll().catch(()=>{})},5*60*1000);

window.EveraCloud={enabled,ready,getUser,signIn,signUp,signInOtp,signOut,syncAll,isOwner,getOwnerOverview,ownerUsers,membership,getOwnerAudit};
init();
