export const defaults = () => ({version:1,tags:[{id:'focus',name:'专注',color:'#ef8b24',minutes:25,archived:false}],sessions:[],settings:{minutes:25,short:5,long:15,cycles:4,window:'week',showFailed:false,sound:true,noise:false,gravity:false},selectedTag:'focus',active:null,cycle:0,pendingRest:false});
export function validateState(s){
 if(!s||s.version!==1||!Array.isArray(s.tags)||!Array.isArray(s.sessions)||s.tags.length<1||s.tags.length>300||s.sessions.length>20000)throw Error('备份格式不正确或记录数量超限');
 const str=(v,n)=>typeof v==='string'&&v.length>0&&v.length<=n;
 const num=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 const tagIds=new Set();for(const t of s.tags){if(!str(t.id,100)||tagIds.has(t.id)||!str(t.name,80)||!/^#[a-fA-F0-9]{6}$/.test(t.color)||!num(t.minutes,0,180)||typeof t.archived!=='boolean')throw Error('标签格式不正确');tagIds.add(t.id)}
 if(!s.tags.some(t=>!t.archived)||!tagIds.has(s.selectedTag))throw Error('至少保留一个可用标签');
 const ids=new Set();for(const r of s.sessions){if(!str(r.id,100)||ids.has(r.id)||!tagIds.has(r.tagId)||!num(r.start,0,9e15)||!num(r.end,r.start,9e15)||!num(r.seconds,0,86400)||!['finished','abandoned'].includes(r.outcome)||typeof r.manual!=='boolean')throw Error('专注记录格式不正确');ids.add(r.id)}
 const p=s.settings;if(!p||!num(p.minutes,0,180)||!num(p.short,1,60)||!num(p.long,1,120)||!Number.isInteger(p.cycles)||!num(p.cycles,1,12)||!['week','lastweek','month','quarter'].includes(p.window)||!['showFailed','sound','noise','gravity'].every(k=>typeof p[k]==='boolean'))throw Error('设置格式不正确');
 if(!Number.isInteger(s.cycle)||!num(s.cycle,0,1e9)||typeof s.pendingRest!=='boolean')throw Error('循环状态不正确');
 if(s.active){const a=s.active;if(!str(a.id,100)||!tagIds.has(a.tagId)||!['focus','rest'].includes(a.mode)||!['up','down'].includes(a.kind)||!num(a.start,0,9e15)||!num(a.resumedAt,a.start,9e15)||!num(a.elapsedMs,0,86400000)||!num(a.targetSeconds,0,86400)||typeof a.paused!=='boolean')throw Error('计时状态不正确')}
 return s;
}
export const elapsed=(a,now=Date.now())=>a?Math.max(0,(a.elapsedMs+(a.paused?0:Math.max(0,now-a.resumedAt)))/1000):0;
export function start(s,{rest=false,minutes=s.settings.minutes,now=Date.now(),id=crypto.randomUUID()}={}){
 if(s.active)throw Error('请先结束当前计时');
 if(!Number.isFinite(minutes)||minutes<0||minutes>180)throw Error('时长不正确');
 s.pendingRest=false;s.active={id,tagId:s.selectedTag,start:now,resumedAt:now,elapsedMs:0,targetSeconds:minutes*60,mode:rest?'rest':'focus',kind:minutes===0?'up':'down',paused:false};return s.active;
}
export function togglePause(s,now=Date.now()){
 const a=s.active;if(!a||a.mode!=='focus'||a.kind!=='up')return false;
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
 const row={id:a.id,tagId:a.tagId,start:a.start,end:Math.max(a.start,end),seconds:Math.min(86400,seconds),outcome,manual:false};
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
