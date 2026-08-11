(()=>{
  const DB_NAME='everflow-study-v1';
  const DB_VERSION=1;
  const LEGACY_KEY='oxygen408-progress-v2';
  let dbPromise=null;

  const nowIso=()=>new Date().toISOString();
  const uuid=()=>{
    if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16));
  };

  function openDb(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains('focusSessions')){
          const s=db.createObjectStore('focusSessions',{keyPath:'id'});
          s.createIndex('endedAt','endedAt',{unique:false});
          s.createIndex('subject','subject',{unique:false});
        }
        if(!db.objectStoreNames.contains('courseStates')){
          const s=db.createObjectStore('courseStates',{keyPath:'id'});
          s.createIndex('subject','subject',{unique:false});
          s.createIndex('updatedAt','updatedAt',{unique:false});
        }
        if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
    return dbPromise;
  }

  async function getAll(store){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const req=db.transaction(store,'readonly').objectStore(store).getAll();
      req.onsuccess=()=>resolve(req.result||[]);
      req.onerror=()=>reject(req.error);
    });
  }

  async function getOne(store,key){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const req=db.transaction(store,'readonly').objectStore(store).get(key);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
  }

  async function put(store,value){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const t=db.transaction(store,'readwrite');
      t.objectStore(store).put(value);
      t.oncomplete=()=>resolve(value);
      t.onerror=()=>reject(t.error);
    });
  }

  async function migrateLegacy408(){
    const flag=await getOne('meta','legacy408-v1');
    if(flag)return;
    let legacy={};
    try{legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'{}')||{}}catch{}
    const entries=Object.entries(legacy);
    for(const [id,state] of entries){
      await put('courseStates',{
        id,
        subject:'unknown',
        done:Boolean(state?.done),
        note:String(state?.note||''),
        updatedAt:String(state?.updatedAt||nowIso()),
        source:'legacy-localStorage',
        deviceId:getDeviceId(),
        syncState:'local'
      });
    }
    await put('meta',{key:'legacy408-v1',migratedAt:nowIso(),count:entries.length});
  }

  async function init(){
    await openDb();
    await migrateLegacy408();
    return true;
  }

  async function putFocusSession(input={}){
    const start=input.startedAt?new Date(input.startedAt):new Date();
    const end=input.endedAt?new Date(input.endedAt):new Date();
    const duration=Math.max(0,Number(input.durationSeconds)||Math.round((end-start)/1000));
    const row={
      id:input.id||uuid(),
      subject:String(input.subject||'general'),
      startedAt:start.toISOString(),
      endedAt:end.toISOString(),
      durationSeconds:duration,
      note:String(input.note||''),
      deviceId:String(input.deviceId||getDeviceId()),
      updatedAt:String(input.updatedAt||nowIso()),
      syncState:input.syncState||'local'
    };
    await put('focusSessions',row);
    document.dispatchEvent(new CustomEvent('everflow:study-change',{detail:{type:'focus',row}}));
    return row;
  }

  async function putCourseState(input={}){
    if(!input.id)return null;
    const old=await getOne('courseStates',input.id);
    const subject=String(input.subject||old?.subject||'unknown');
    const done=Boolean(input.done);
    const note=String(input.note??old?.note??'');
    if(old&&old.subject===subject&&Boolean(old.done)===done&&String(old.note||'')===note)return old;
    const row={
      id:String(input.id),
      subject,
      done,
      note,
      completedAt:done?(input.completedAt||old?.completedAt||nowIso()):null,
      updatedAt:String(input.updatedAt||nowIso()),
      deviceId:String(input.deviceId||getDeviceId()),
      syncState:input.syncState||'local'
    };
    await put('courseStates',row);
    document.dispatchEvent(new CustomEvent('everflow:study-change',{detail:{type:'course',row}}));
    return row;
  }

  function getDeviceId(){
    const key='everflow-device-id';
    let id=localStorage.getItem(key);
    if(!id){id=uuid();localStorage.setItem(key,id)}
    return id;
  }

  async function listFocusSessions(){
    const rows=await getAll('focusSessions');
    return rows.sort((a,b)=>String(b.endedAt).localeCompare(String(a.endedAt)));
  }

  async function listCourseStates(){
    const rows=await getAll('courseStates');
    return rows.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  const dayKey=d=>{
    const x=new Date(d);
    const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };

  async function getSummary(){
    const focus=await listFocusSessions();
    const courses=await listCourseStates();
    const today=dayKey(new Date());
    const startWeek=new Date();startWeek.setHours(0,0,0,0);startWeek.setDate(startWeek.getDate()-6);
    const daily={};
    const subjects={ds:0,co:0,os:0,cn:0,general:0};
    let totalSeconds=0,todaySeconds=0,weekSeconds=0,longest=0;
    focus.forEach(s=>{
      const sec=Math.max(0,Number(s.durationSeconds)||0);
      const k=dayKey(s.endedAt||s.startedAt);
      daily[k]=(daily[k]||0)+sec;
      totalSeconds+=sec;
      if(k===today)todaySeconds+=sec;
      if(new Date(s.endedAt||s.startedAt)>=startWeek)weekSeconds+=sec;
      longest=Math.max(longest,sec);
      subjects[s.subject]=(subjects[s.subject]||0)+sec;
    });
    const activityDays=new Set(Object.entries(daily).filter(([,v])=>v>0).map(([k])=>k));
    courses.filter(c=>c.done&&c.completedAt).forEach(c=>activityDays.add(dayKey(c.completedAt)));
    let streak=0;const cursor=new Date();cursor.setHours(0,0,0,0);
    if(!activityDays.has(dayKey(cursor)))cursor.setDate(cursor.getDate()-1);
    while(activityDays.has(dayKey(cursor))){streak++;cursor.setDate(cursor.getDate()-1)}
    return {
      focus,courses,daily,subjects,totalSeconds,todaySeconds,weekSeconds,longestSeconds:longest,streak,
      completedCourses:courses.filter(c=>c.done).length
    };
  }

  async function exportAll(){
    return {
      schema:'everflow-study-backup-v1',
      exportedAt:nowIso(),
      deviceId:getDeviceId(),
      focusSessions:await listFocusSessions(),
      courseStates:await listCourseStates(),
      legacy408:(()=>{try{return JSON.parse(localStorage.getItem(LEGACY_KEY)||'{}')||{}}catch{return{}}})()
    };
  }

  async function importAll(payload={}){
    if(!payload||!Array.isArray(payload.focusSessions)||!Array.isArray(payload.courseStates))throw new Error('备份文件格式不正确');
    for(const row of payload.focusSessions){
      if(!row?.id)continue;
      const old=await getOne('focusSessions',row.id);
      if(!old||String(row.updatedAt||'')>=String(old.updatedAt||''))await put('focusSessions',{...row,syncState:row.syncState||'local'});
    }
    for(const row of payload.courseStates){
      if(!row?.id)continue;
      const old=await getOne('courseStates',row.id);
      if(!old||String(row.updatedAt||'')>=String(old.updatedAt||''))await put('courseStates',{...row,syncState:row.syncState||'local'});
    }
    if(payload.legacy408&&typeof payload.legacy408==='object')localStorage.setItem(LEGACY_KEY,JSON.stringify(payload.legacy408));
    document.dispatchEvent(new CustomEvent('everflow:study-change',{detail:{type:'import'}}));
    return true;
  }

  window.EveraStore={init,putFocusSession,putCourseState,listFocusSessions,listCourseStates,getSummary,exportAll,importAll,getDeviceId,dayKey};
  init().catch(console.error);
})();
