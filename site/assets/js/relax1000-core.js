const RELAX_ASSET_BASE='/data/relax1000';
export const DATA_URL=`${RELAX_ASSET_BASE}/data/questions.json`;
export const RECORD_KEY='everflow-408-relax1000-records-v1';
export const SRS_KEY='everflow-408-relax-srs-v1';
export const RELAX_STORAGE_KEYS={
  records:RECORD_KEY,
  srs:SRS_KEY,
  seen:'relax-seen',
  mistakes:'relax-mistakes',
  everWrong:'relax-ever-wrong',
  bookmarks:'relax-bookmarks',
  subject:'everflow-408-relax-subject',
  graphCurrent:'everflow-408-relax-graph-current-v3',
  graphFit:'everflow-408-relax-graph-fit-v1'
};
const SUBJECT_NAME={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};
let dataPromise=null;
const readJson=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
export const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export const idKey=value=>String(value?.id??value??'');
export function assetUrl(value){
  const src=String(value||'').trim();
  if(!src)return'';
  if(src.startsWith('data:image/'))return src;
  if(src.startsWith(`${RELAX_ASSET_BASE}/`))return src;
  if(/^https?:\/\//i.test(src))return'';
  const clean=src.replace(/^\.\//,'').replace(/^\//,'');
  return `${RELAX_ASSET_BASE}/${clean}`;
}
export function hasBrokenSymbols(value){
  const text=String(value??'');
  return /\uFFFD/.test(text)||/\?\s*\?/.test(text)||/[锟斤拷�]/.test(text);
}
export function displayText(value,fallback=''){
  const text=String(value??'');
  return hasBrokenSymbols(text)?String(fallback??''):text;
}
export function optionEntries(question){
  const options=question?.options;
  let entries=[];
  if(Array.isArray(options))entries=options.map((item,index)=>({key:String(item?.key??'ABCD'[index]??index+1),text:String(item?.text??item?.label??'')}));
  else if(options&&typeof options==='object')entries=Object.entries(options).map(([key,text])=>({key:String(key),text:String(text??'')}));
  if(!entries.length)return entries;
  const hasImage=Array.isArray(question?.questionImages)&&question.questionImages.length>0;
  const damagedCount=entries.filter(item=>hasBrokenSymbols(item.text)||item.text.includes('?')).length;
  if(hasImage&&damagedCount>=2)return[];
  return entries.map(item=>hasBrokenSymbols(item.text)?{...item,text:''}:item);
}
export function subjectName(id,fallback=''){return SUBJECT_NAME[id]||fallback||id||'408'}
function sanitizeDisplayData(data){
  for(const question of data.questions||[]){
    const hasQuestionImage=Array.isArray(question?.questionImages)&&question.questionImages.length>0;
    const hasExplanationImage=Array.isArray(question?.explanationImages)&&question.explanationImages.length>0;
    if(hasQuestionImage&&hasBrokenSymbols(question?.stem))question.stem='';
    if(hasExplanationImage&&hasBrokenSymbols(question?.explanation))question.explanation='';
  }
  return data;
}
export async function loadRelaxData({force=false}={}){
  if(force)dataPromise=null;
  if(dataPromise)return dataPromise;
  dataPromise=fetch(DATA_URL,{cache:force?'no-store':'default'})
    .then(response=>{if(!response.ok)throw new Error(`Relax1000 data HTTP ${response.status}`);return response.json()})
    .then(data=>{
      if(!data||!Array.isArray(data.questions)||!Array.isArray(data.subjects))throw new Error('Relax1000 data schema invalid');
      return sanitizeDisplayData(data);
    })
    .catch(error=>{dataPromise=null;throw error});
  return dataPromise;
}
export function loadRecords(){const value=readJson(RECORD_KEY,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
export function saveRecords(records){writeJson(RECORD_KEY,records)}
export function patchRecord(rawId,patch){
  const records=loadRecords(),key=idKey(rawId),previous=records[key]||{};
  const next={...previous,...patch,updatedAt:new Date().toISOString()};
  Object.keys(next).forEach(name=>next[name]===undefined&&delete next[name]);
  const meaningful=Boolean(next.status||next.note||next.answer||next.draftAnswer||next.reviewed||next.favorite||next.attempts||next.correct===true||next.correct===false);
  if(meaningful)records[key]=next;else delete records[key];
  saveRecords(records);
  document.dispatchEvent(new CustomEvent('everflow:relax-records-change',{detail:{id:key}}));
  return records[key]||{};
}
export function compatArray(key){const value=readJson(key,[]);return Array.isArray(value)?value:[]}
export function compatHas(key,rawId){const target=idKey(rawId);return compatArray(key).some(value=>idKey(value)===target)}
export function setCompat(key,rawId,present){
  const target=idKey(rawId),next=compatArray(key).filter(value=>idKey(value)!==target);
  if(present)next.push(rawId);
  writeJson(key,next);
  return next;
}
export function clearCompat(...keys){for(const key of keys.flat())try{localStorage.removeItem(key)}catch{}}
export function clearRelaxStorage({keepPreferences=true}={}){
  const preserve=keepPreferences?new Set([RELAX_STORAGE_KEYS.subject,RELAX_STORAGE_KEYS.graphFit]):new Set();
  Object.values(RELAX_STORAGE_KEYS).forEach(key=>{if(!preserve.has(key))try{localStorage.removeItem(key)}catch{}});
  document.dispatchEvent(new CustomEvent('everflow:relax-records-change',{detail:{scope:'all',reset:true}}));
}
export function syncAnswerCompatibility(question,correct){
  const rawId=question?.id;
  setCompat(RELAX_STORAGE_KEYS.seen,rawId,true);
  setCompat(RELAX_STORAGE_KEYS.mistakes,rawId,!correct);
  if(!correct)setCompat(RELAX_STORAGE_KEYS.everWrong,rawId,true);
}
export function toggleBookmark(question){
  const rawId=question?.id,current=compatHas(RELAX_STORAGE_KEYS.bookmarks,rawId),next=!current;
  setCompat(RELAX_STORAGE_KEYS.bookmarks,rawId,next);
  patchRecord(rawId,{favorite:next||undefined});
  return next;
}
export function questionState(question,records=loadRecords()){
  const rec=records[idKey(question)]||{};
  const seen=Boolean(rec.answer)||compatHas(RELAX_STORAGE_KEYS.seen,question?.id);
  const wrong=rec.correct===false||compatHas(RELAX_STORAGE_KEYS.mistakes,question?.id);
  const favorite=Boolean(rec.favorite)||compatHas(RELAX_STORAGE_KEYS.bookmarks,question?.id);
  return{rec,seen,wrong,favorite};
}
export function questionNumber(question,index=0){return question?.number??question?.bookNumber??question?.index??index+1}
export function questionImages(question){return Array.isArray(question?.questionImages)?question.questionImages:[]}
export function explanationImages(question){return Array.isArray(question?.explanationImages)?question.explanationImages:[]}
