export function makeId(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`}
const FRUITS=new Set(['tomato','pear']),FRUIT_CHOICES=new Set(['tomato','pear','random']);
const fruitHash=value=>{let n=2166136261;for(const c of String(value)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
export const resolveFruit=(choice='tomato',seed='')=>choice==='random'?(fruitHash(seed)%2?'pear':'tomato'):(FRUITS.has(choice)?choice:'tomato');
export const fruitSide=seconds=>Math.max(36,Math.floor(Math.min(110,(Math.max(0,Number(seconds)||0)/60)*0.4228571428571429+33.885714285714286)));
export const defaults = () => ({version:1,tags:[{id:'focus',name:'专注',color:'#ef8b24',minutes:25,archived:false}],sessions:[],settings:{minutes:25,short:5,long:15,cycles:4,window:'week',showFailed:false,sound:true,noise:false,gravity:false,defaultFruit:'tomato'},selectedTag:'focus',active:null,cycle:0,pendingRest:false});
export function validateState(s){
 if(!s||s.version!==1||!Array.isArray(s.tags)||!Array.isArray(s.sessions)||s.tags.length<1||s.tags.length>300||s.sessions.length>20000)throw Error('备份格式不正确或记录数量超限');
 const str=(v,n)=>typeof v==='string'&&v.length>0&&v.length<=n;
 const num=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 const tagIds=new Set();for(const t of s.tags){if(!str(t.id,100)||tagIds.has(t.id)||!str(t.name,80)||!/^#[a-fA-F0-9]{6}$/.test(t.color)||!num(t.minutes,0,180)||typeof t.archived!=='boolean')throw Error('标签格式不正确');tagIds.add(t.id)}
 if(!s.tags.some(t=>!t.archived)||!tagIds.has(s.selectedTag))throw Error('至少保留一个可用标签');
 for(const r of s.sessions)if(r&&r.fruitType==null)r.fruitType='tomato';
 const ids=new Set();for(const r of s.sessions){if(!str(r.id,100)||ids.has(r.id)||!tagIds.has(r.tagId)||!num(r.start,0,9e15)||!num(r.end,r.start,9e15)||!num(r.seconds,0,86400)||!['finished','abandoned'].includes(r.outcome)||typeof r.manual!=='boolean'||!FRUITS.has(r.fruitType))throw Error('专注记录格式不正确');ids.add(r.id)}
 const p=s.settings;if(p&&p.defaultFruit==null)p.defaultFruit='tomato';
 if(!p||!num(p.minutes,0,180)||!num(p.short,1,60)||!num(p.long,1,120)||!Number.isInteger(p.cycles)||!num(p.cycles,1,12)||!['week','lastweek','month','quarter'].includes(p.window)||!['showFailed','sound','noise','gravity'].every(k=>typeof p[k]==='boolean')||!FRUIT_CHOICES.has(p.defaultFruit))throw Error('设置格式不正确');
 if(!Number.isInteger(s.cycle)||!num(s.cycle,0,1e9)||typeof s.pendingRest!=='boolean')throw Error('循环状态不正确');
 if(s.active){
  const a=s.active;if(a.fruitType==null)a.fruitType=a.mode==='rest'?'tomato':resolveFruit(p.defaultFruit,a.id);
  if(!str(a.id,100)||!tagIds.has(a.tagId)||!['focus','rest'].includes(a.mode)||!['up','down'].includes(a.kind)||!num(a.start,0,9e15)||!num(a.resumedAt,a.start,9e15)||!num(a.elapsedMs,0,86400000)||!num(a.targetSeconds,0,86400)||typeof a.paused!=='boolean'||!FRUITS.has(a.fruitType))throw Error('计时状态不正确')
 }
 return s;
}
export const elapsed=(a,now=Date.now())=>a?Math.max(0,(a.elapsedMs+(a.paused?0:Math.max(0,now-a.resumedAt)))/1000):0;
export function start(s,{rest=false,minutes=s.settings.minutes,now=Date.now(),id=makeId()}={}){
 if(s.active)throw Error('请先结束当前计时');
 if(!Number.isFinite(minutes)||minutes<0||minutes>180)throw Error('时长不正确');
 const fruitType=rest?'tomato':resolveFruit(s.settings.defaultFruit,id);
 s.pendingRest=false;s.active={id,tagId:s.selectedTag,start:now,resumedAt:now,elapsedMs:0,targetSeconds:minutes*60,mode:rest?'rest':'focus',kind:minutes===0?'up':'down',paused:false,fruitType};return s.active;
}
export function togglePause(s,now=Date.now()){
 const a=s.active;if(!a||a.mode!=='focus')return false;
 if(!a.paused)a.elapsedMs=elapsed(a,now)*1000;
 a.resumedAt=now;a.paused=!a.paused;return true;
}
export function stop(s,{outcome='finished',natural=false,now=Date.now()}={}){
 const a=s.active;if(!a)return null;
 const limit=a.kind==='up'?86400:a.targetSeconds;
 const seconds=Math.floor(natural?Math.min(elapsed(a,now),limit):elapsed(a,now));
 const end=natural?now-Math.max(0,elapsed(a,now)-limit)*1000:now;
 s.active=null;
 if(a.mode==='rest'){s.pendingRest=false;return {rest:true}}
 const row={id:a.id,tagId:a.tagId,start:a.start,end:Math.max(a.start,end),seconds:Math.min(86400,seconds),outcome,manual:false,fruitType:a.fruitType||'tomato'};
 s.sessions.push(row);if(outcome==='finished'){s.cycle++;s.pendingRest=true}else s.pendingRest=false;
 return row;
}
export function advance(s,now=Date.now()){
 const a=s.active;if(!a||a.paused)return null;
 if(elapsed(a,now)>=(a.kind==='up'?86400:a.targetSeconds))return stop(s,{natural:true,now});return null;
}
export const nextBreak=s=>s.cycle>0&&s.cycle%s.settings.cycles===0?s.settings.long:s.settings.short;
export const dayStart=value=>{const d=new Date(value);d.setHours(0,0,0,0);return d.getTime()};
export function range(period='M',anchor=Date.now()){
 const d=new Date(dayStart(anchor));let end;
 if(period==='D'){end=new Date(d);end.setDate(end.getDate()+1)}
 else if(period==='W'){d.setDate(d.getDate()-(d.getDay()+6)%7);end=new Date(d);end.setDate(end.getDate()+7)}
 else if(period==='Y'){d.setMonth(0,1);end=new Date(d);end.setFullYear(end.getFullYear()+1)}
 else{d.setDate(1);end=new Date(d);end.setMonth(end.getMonth()+1)}
 return {start:d.getTime(),end:end.getTime()};
}
export const inRange=(rows,r)=>rows.filter(x=>x.start>=r.start&&x.start<r.end);
export const reward=r=>!r.manual&&r.seconds>=60&&r.outcome==='finished';
