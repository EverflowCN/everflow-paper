/* Everflow preview sandbox. Read-only published questions; isolated localStorage only. */
export const YEARS=Array.from({length:18},(_,i)=>2026-i);
export const SUBJECTS={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};
export const SUBSHORT={ds:'DS',co:'CO',os:'OS',cn:'CN'};
export const SUBJECT_GROUPS=['ds','co','os','cn'];
const KEY='everflow-preview-lab-state-20261010-v1';
const cache=new Map();
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeImage(v){
 const raw=typeof v==='string'?v:v?.src||v?.url||v?.path||'';
 if(!raw)return'';
 try{const u=new URL(raw,location.origin);return u.origin===location.origin&&u.pathname.startsWith('/data/')?esc(u.pathname+u.search):''}catch{return''}
}
export function textHtml(v){return esc(v).replace(/\r\n?/g,'\n').replace(/\n/g,'<br>')}
export function mediaHtml(item){
 const figures=[...(Array.isArray(item?.figures)?item.figures:[]),...(Array.isArray(item?.questionImages)?item.questionImages:[])];
 return figures.map(img=>{const src=safeImage(img);if(!src)return'';return `<figure class="lab-figure"><a href="${src}" target="_blank" rel="noopener"><img src="${src}" loading="lazy" alt="${esc(img?.alt||'题目附图')}" onerror="this.closest('figure').classList.add('is-broken')"></a><figcaption>${esc(img?.caption||'点击可单独查看图片')}</figcaption></figure>`}).join('');
}
export function optionsFor(item){
 const obj=item?.options;
 if(Array.isArray(obj))return obj.map((v,i)=>({key:String(v?.key??'ABCD'[i]??i+1),text:String(v?.text??v?.label??'')})).filter(v=>/^[A-D]$/.test(v.key));
 return obj&&typeof obj==='object'?Object.entries(obj).filter(([k])=>/^[A-D]$/.test(k)).map(([key,text])=>({key,text:String(text??'')})):[];
}
function normalizeRaw(s){return s&&typeof s==='object'&&!Array.isArray(s)?s:{}}
export function state(){
 try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return normalizeRaw(x)}catch{return{}}
}
export function getRecord(source,id){
 return normalizeRaw(state()?.[source]?.records?.[id]);
}
export function getRecords(source){return normalizeRaw(state()?.[source]?.records)}
export function getNav(source){return normalizeRaw(state()?.[source]?.nav)}
export function saveNav(source,patch){
 if(!['zhenti','relax'].includes(source))return;
 try{const s=state();s[source]={...normalizeRaw(s[source]),nav:{...normalizeRaw(s[source]?.nav),...patch}};localStorage.setItem(KEY,JSON.stringify(s));dispatchEvent(new CustomEvent('lab:state'))}catch{}
}
export function patchRecord(source,id,patch){
 if(!['zhenti','relax'].includes(source)||!/^(?:20\d{2}-\d{1,2}|(?:ds|co|os|cn)-\d+-\d+)$/.test(String(id)))return;
 try{
  const s=state(),area=normalizeRaw(s[source]),records=normalizeRaw(area.records);
  records[id]={...normalizeRaw(records[id]),...patch,updatedAt:new Date().toISOString()};
  s[source]={...area,records};localStorage.setItem(KEY,JSON.stringify(s));dispatchEvent(new CustomEvent('lab:state',{detail:{source,id}}));
 }catch{}
}
export function statusOf(record){
 return ['mastered','fuzzy','weak'].includes(record?.status)?record.status:'unmarked';
}
export function progressOf(ids,source){
 let done=0,mastered=0,weak=0,wrong=0;for(const id of ids){const r=getRecord(source,id);if(r.answer||r.reviewed||r.status)done++;if(r.status==='mastered')mastered++;if(r.status==='weak'||r.status==='fuzzy')weak++;if(r.correct===false)wrong++}
 return{total:ids.length,done,mastered,weak,wrong,rate:ids.length?Math.round(done/ids.length*100):0};
}
export function sourceFromQuestion(q,subjectIndex){
 return Object.entries(subjectIndex||{}).find(([,questions])=>questions?.includes(q))?.[0]||(q<=10||q===41||q===42?'ds':q<=22||q===43||q===44?'co':q<=32||q===45||q===46?'os':'cn');
}
export async function getJson(url){
 if(cache.has(url))return cache.get(url);
 const request=fetch(url,{cache:'default'}).then(async r=>{if(!r.ok)throw new Error('HTTP '+r.status+'：'+url);return r.json()}).catch(e=>{cache.delete(url);throw e});
 cache.set(url,request);return request;
}
export async function yearData(year){
 if(!YEARS.includes(Number(year)))throw new Error('不支持的真题年份');
 const [basic,supp]=await Promise.all([
  getJson('/data/zhenti/'+year+'.json'),
  getJson('/data/zhenti/supplement/'+year+'.json').catch(()=>null)
 ]);
 return {...basic,questions:{...(basic.questions||{}),...(supp?.questions||{})}};
}
export const subjectIndex=()=>getJson('/data/zhenti/subject-index.json');
export const topicIndex=()=>getJson('/data/zhenti/topic-index.json');
export async function relaxData(){
 const data=await getJson('/data/relax1000/data/questions.json');
 if(!Array.isArray(data.questions)||!Array.isArray(data.subjects))throw new Error('Relax1000 题库格式错误');
 return data;
}
export function grade(source,id,item,answer){
 const correct=String(item?.answer??'').trim().toUpperCase()===String(answer||'').trim().toUpperCase();
 patchRecord(source,id,{answer,correct,reviewed:true});
 return correct;
}
export function questionHtml(item,{number='',subject='',source='zhenti',id='',reveal=false}={}){
 if(!item)return'<div class="lab-empty">当前题目没有可用内容。</div>';
 const record=getRecord(source,id),opts=optionsFor(item),isSubjective=!opts.length||Number(number)>40&&source==='zhenti',allowed=item?.verification?.status==='verified'||source==='relax';
 const selected=record.answer||record.draftAnswer||'';
 const options=opts.map(o=>`<button class="lab-choice ${selected===o.key?'is-selected':''} ${record.answer&&record.correct!==undefined?(o.key===item.answer?'is-correct':selected===o.key?'is-wrong':''):''}" type="button" data-choice="${esc(o.key)}"><b>${esc(o.key)}</b><span>${textHtml(o.text)}</span></button>`).join('');
 const analysis=allowed?`<div class="lab-analysis"><div><b>参考答案 ${esc(item.answer||'见解析')}</b><span>${item?.verification?.mode?.includes('paraphrase')?'题干为交叉核对转述':'已核对题目来源'}</span></div><p>${textHtml(item.analysis||item.explanation||'暂无解析')}</p></div>`:'<div class="lab-analysis is-pending">该题解析尚未核验，测试版不展示未核验答案。</div>';
 return `<div class="lab-question-headline"><span class="lab-kicker">${esc(subject)} / ${esc(number?'第 '+number+' 题':'章节练习')}</span><span class="lab-verification">${source==='relax'?'Relax1000':item?.verification?.status==='verified'?'已核验':'待核验'}</span></div><div class="lab-question-stem">${textHtml(item.stem||item.question||'题干暂未提供')}</div>${mediaHtml(item)}${opts.length?`<div class="lab-choices">${options}</div>`:''}${record.answer&&opts.length?`<p class="lab-answer-feedback ${record.correct?'good':'bad'}">${record.correct?'回答正确':'回答错误'} · 你的答案 ${esc(record.answer)}${allowed?' · 正确答案 '+esc(item.answer):''}</p>`:''}${isSubjective?'<p class="lab-hint">本题为应用题或开放题，请完成纸笔演算后标记掌握状态；测试版不自动判分。</p>':''}${reveal?analysis:''}`;
}
export function statusLabel(s){return({mastered:'熟练',fuzzy:'模糊',weak:'不会',unmarked:'未标记'})[s]||'未标记'}
export function localTestNote(){return'独立测试数据 · 不读取正式打卡记录，不写入云端';}
export function dateStamp(d){return d?new Date(d).toLocaleDateString('zh-CN',{month:'short',day:'numeric'}):'尚未作答'}
