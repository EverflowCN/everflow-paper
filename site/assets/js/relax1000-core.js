const RAW_SITE='https://raw.githubusercontent.com/EverflowCN/408-exercise-paper-generator/main/%E7%AB%99%E7%82%B9';
export const DATA_URL=`${RAW_SITE}/data/questions.json`;
export const BANK_SOURCE_KEY='everflow-408-bank-source-v1';
export const RECORD_KEY='everflow-408-relax1000-records-v1';
export const SUBJECT_META={
  ds:{name:'数据结构',short:'DS'},
  co:{name:'计算机组成原理',short:'CO'},
  os:{name:'操作系统',short:'OS'},
  cn:{name:'计算机网络',short:'CN'}
};

let dataPromise=null;
const readJson=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
export const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export const idKey=value=>String(value?.id??value??'');
export function assetUrl(value){
  const src=String(value||'').trim();
  if(!src)return'';
  if(/^https?:\/\//i.test(src)||src.startsWith('data:'))return src;
  return `${RAW_SITE}${src.startsWith('/')?'':'/'}${src}`;
}
export function optionEntries(question){
  const options=question?.options;
  if(Array.isArray(options))return options.map((item,index)=>({key:String(item?.key??'ABCD'[index]??index+1),text:String(item?.text??item?.label??'')}));
  if(options&&typeof options==='object')return Object.entries(options).map(([key,text])=>({key:String(key),text:String(text??'')}));
  return [];
}
export function subjectName(id,fallback=''){return SUBJECT_META[id]?.name||fallback||id||'408'}
export async function loadRelaxData({force=false}={}){
  if(force)dataPromise=null;
  if(dataPromise)return dataPromise;
  dataPromise=fetch(DATA_URL,{cache:force?'no-store':'default'})
    .then(response=>{if(!response.ok)throw new Error(`Relax1000 data HTTP ${response.status}`);return response.json()})
    .then(data=>{
      if(!data||!Array.isArray(data.questions)||!Array.isArray(data.subjects))throw new Error('Relax1000 data schema invalid');
      return data;
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
export function syncAnswerCompatibility(question,correct){
  const rawId=question?.id;
  setCompat('relax-seen',rawId,true);
  setCompat('relax-mistakes',rawId,!correct);
  if(!correct)setCompat('relax-ever-wrong',rawId,true);
}
export function toggleBookmark(question){
  const rawId=question?.id,current=compatHas('relax-bookmarks',rawId),next=!current;
  setCompat('relax-bookmarks',rawId,next);
  patchRecord(rawId,{favorite:next||undefined});
  return next;
}
export function questionState(question,records=loadRecords()){
  const rec=records[idKey(question)]||{};
  const seen=Boolean(rec.answer)||compatHas('relax-seen',question?.id);
  const wrong=rec.correct===false||compatHas('relax-mistakes',question?.id);
  const favorite=Boolean(rec.favorite)||compatHas('relax-bookmarks',question?.id);
  return{rec,seen,wrong,favorite};
}
export function questionNumber(question,index=0){return question?.number??question?.bookNumber??question?.index??index+1}
export function questionImages(question){return Array.isArray(question?.questionImages)?question.questionImages:[]}
export function explanationImages(question){return Array.isArray(question?.explanationImages)?question.explanationImages:[]}
export function statusLabel(status){return({mastered:'熟练',fuzzy:'模糊',weak:'不会'}[status]||'未标记')}
