const cfg=window.EVERFLOW_CLOUD||{};
const enabled=Boolean(cfg.url&&cfg.publishableKey);
let client=null;
let readyResolve;
const ready=new Promise(r=>readyResolve=r);

async function init(){
  if(!enabled){readyResolve(null);return null}
  try{
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm');
    client=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    readyResolve(client);return client;
  }catch(e){console.error('Everflow admin cloud init failed',e);readyResolve(null);return null}
}

async function getUser(){await ready;if(!client)return null;const {data,error}=await client.auth.getUser();if(error)return null;return data.user||null}
async function requireOwner(){const user=await getUser();if(!client||!user||user.app_metadata?.role!=='owner')throw new Error('owner_required');return user}
const ensure=res=>{if(res?.error)throw res.error;return res?.data??null};
const nowIso=()=>new Date().toISOString();

async function ownerUsers(action='list',payload={}){
  await requireOwner();
  const {data,error}=await client.functions.invoke('owner-users',{body:{action,...payload}});
  if(error)throw error;if(data?.error)throw new Error(data.error);return data;
}
async function membership(action='status',payload={}){
  await requireOwner();
  const {data,error}=await client.functions.invoke('membership',{body:{action,...payload}});
  if(error)throw error;if(data?.error)throw new Error(data.error);return data;
}

async function snapshot(){
  await requireOwner();
  const [profiles,courses,memberships,notices,resources,audit]=await Promise.all([
    client.from('profiles').select('user_id,display_name,created_at,last_seen_at').order('last_seen_at',{ascending:false}).limit(1000),
    client.from('course_states').select('user_id,course_id,subject,done,completed_at,updated_at').order('updated_at',{ascending:false}).limit(5000),
    client.from('memberships').select('user_id,plan,status,source,starts_at,expires_at,updated_at').limit(1000),
    client.from('notices').select('id,title,summary,content,level,pinned,published,published_at,created_at,updated_at').order('pinned',{ascending:false}).order('updated_at',{ascending:false}).limit(200),
    client.from('resource_hub_items').select('id,title,subtitle,url,icon,group_name,sort_order,enabled,created_at,updated_at').order('sort_order',{ascending:true}).limit(300),
    client.from('admin_audit').select('id,actor_user_id,action,target_user_id,detail,created_at').order('created_at',{ascending:false}).limit(100)
  ]);
  [profiles,courses,memberships,notices,resources,audit].forEach(ensure);
  return {profiles:profiles.data||[],courses:courses.data||[],memberships:memberships.data||[],notices:notices.data||[],resources:resources.data||[],audit:audit.data||[]};
}

function membershipActive(row,cfg){
  if(!row||row.status!=='active')return false;
  const expiry=row.expires_at||(row.source==='promo_exam_2027'?cfg?.pro_free_until:null);
  return !expiry||new Date(expiry)>new Date();
}

async function dashboard(){
  const [users,snap,codes,config,hub]=await Promise.all([
    ownerUsers('list',{page:1,perPage:100}),snapshot(),membership('list-codes'),getMembershipConfig(),getResourceSettings()
  ]);
  const now=Date.now(),week=7*864e5;
  const active7d=new Set(snap.profiles.filter(x=>x.last_seen_at&&now-new Date(x.last_seen_at).getTime()<=week).map(x=>x.user_id)).size;
  const activeMemberships=snap.memberships.filter(x=>membershipActive(x,config)).length;
  const publishedNotices=snap.notices.filter(x=>x.published).length;
  const enabledResources=snap.resources.filter(x=>x.enabled).length;
  const activeCodes=(codes.codes||[]).filter(x=>x.active).length;
  return {users:users.users||[],snap,codes:codes.codes||[],config,hub,metrics:{userCount:(users.users||[]).length,courseCount:snap.courses.length,active7d,activeMemberships,publishedNotices,enabledResources,activeCodes}};
}

async function getMembershipConfig(){await requireOwner();const {data,error}=await client.from('membership_config').select('id,pro_free_claim_enabled,pro_free_until,promo_title,promo_copy,updated_at').eq('id','default').single();if(error)throw error;return data}
async function saveMembershipConfig(input={}){
  await requireOwner();
  const row={pro_free_claim_enabled:Boolean(input.pro_free_claim_enabled),pro_free_until:input.pro_free_until||null,promo_title:String(input.promo_title||'').trim(),promo_copy:String(input.promo_copy||'').trim(),updated_at:nowIso()};
  const {data,error}=await client.from('membership_config').update(row).eq('id','default').select().single();if(error)throw error;return data;
}

async function listNotices(){await requireOwner();const {data,error}=await client.from('notices').select('id,title,summary,content,level,pinned,published,published_at,created_at,updated_at').order('pinned',{ascending:false}).order('updated_at',{ascending:false}).limit(200);if(error)throw error;return data||[]}
async function saveNotice(input={}){
  const user=await requireOwner();
  const row={title:String(input.title||'').trim(),summary:String(input.summary||''),content:String(input.content||''),level:['info','important','update','event'].includes(input.level)?input.level:'info',pinned:Boolean(input.pinned),published:Boolean(input.published),published_at:input.published?(input.published_at||nowIso()):null,updated_at:nowIso(),created_by:user.id};
  if(!row.title)throw new Error('通知标题不能为空');
  const q=input.id?client.from('notices').update(row).eq('id',input.id):client.from('notices').insert(row);
  const {data,error}=await q.select().single();if(error)throw error;return data;
}
async function deleteNotice(id){await requireOwner();const {error}=await client.from('notices').delete().eq('id',id);if(error)throw error;return true}

async function getResourceSettings(){await requireOwner();const {data,error}=await client.from('resource_hub_settings').select('id,title,subtitle,avatar_url,footer_note,updated_at').eq('id','default').maybeSingle();if(error)throw error;return data||null}
async function listResourceItems(){await requireOwner();const {data,error}=await client.from('resource_hub_items').select('id,title,subtitle,url,icon,group_name,sort_order,enabled,created_at,updated_at').order('sort_order',{ascending:true}).order('created_at',{ascending:true});if(error)throw error;return data||[]}
async function saveResourceSettings(input={}){const user=await requireOwner();const row={id:'default',title:String(input.title||'Everflow 资源导航'),subtitle:String(input.subtitle||''),avatar_url:String(input.avatar_url||''),footer_note:String(input.footer_note||''),updated_at:nowIso(),updated_by:user.id};const {data,error}=await client.from('resource_hub_settings').upsert(row,{onConflict:'id'}).select().single();if(error)throw error;return data}
async function saveResourceItem(input={}){const user=await requireOwner();const row={title:String(input.title||'').trim(),subtitle:String(input.subtitle||''),url:String(input.url||'').trim(),icon:String(input.icon||'↗').slice(0,12),group_name:String(input.group_name||'常用入口'),sort_order:Number(input.sort_order)||100,enabled:input.enabled!==false,updated_at:nowIso(),created_by:user.id};if(!row.title||!row.url)throw new Error('标题和链接不能为空');const q=input.id?client.from('resource_hub_items').update(row).eq('id',input.id):client.from('resource_hub_items').insert(row);const {data,error}=await q.select().single();if(error)throw error;return data}
async function deleteResourceItem(id){await requireOwner();const {error}=await client.from('resource_hub_items').delete().eq('id',id);if(error)throw error;return true}

async function audit(limit=100){await requireOwner();const {data,error}=await client.from('admin_audit').select('id,actor_user_id,action,target_user_id,detail,created_at').order('created_at',{ascending:false}).limit(Math.max(1,Math.min(200,Number(limit)||100)));if(error)throw error;return data||[]}

window.EveraAdminCloud={enabled,ready,getUser,requireOwner,ownerUsers,membership,snapshot,dashboard,getMembershipConfig,saveMembershipConfig,listNotices,saveNotice,deleteNotice,getResourceSettings,listResourceItems,saveResourceSettings,saveResourceItem,deleteResourceItem,audit};
init();