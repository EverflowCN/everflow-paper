const VERSION='20260904-editor1';
const BANKS=new Set(['zhenti','relax1000']);
const cache=new Map();

function cloud(){return window.EVERFLOW_CLOUD||{}}
function storagePrefix(){const base=String(cloud().url||'').replace(/\/$/,'');return base?`${base}/storage/v1/object/public/question-assets/`:''}
export function safeQuestionImageUrl(value,{allowData=true}={}){
  const src=String(value||'').trim();
  if(!src)return'';
  if(allowData&&/^data:image\/(?:png|jpeg|webp|gif|svg\+xml);/i.test(src))return src;
  if(/^\/(?:data\/|question-images\/|explanations\/|assets\/)/.test(src))return src;
  const prefix=storagePrefix();
  return prefix&&src.startsWith(prefix)?src:'';
}
async function ensureConfig(){
  if(window.EVERFLOW_CLOUD)return cloud();
  try{await import(`./cloud-config.js?v=${VERSION}`)}catch{}
  return cloud();
}
export async function loadQuestionOverrides(bank,{force=false}={}){
  const key=String(bank||'');
  if(!BANKS.has(key))return[];
  if(force)cache.delete(key);
  if(cache.has(key))return cache.get(key);
  const pending=(async()=>{
    const cfg=await ensureConfig();
    if(!cfg.url||!cfg.publishableKey)return[];
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
    try{
      const endpoint=`${String(cfg.url).replace(/\/$/,'')}/rest/v1/question_overrides?select=bank,entity_id,patch,revision,updated_at&bank=eq.${encodeURIComponent(key)}`;
      const response=await fetch(endpoint,{headers:{apikey:cfg.publishableKey},signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error(`Question overrides HTTP ${response.status}`);
      const rows=await response.json();
      return Array.isArray(rows)?rows:[];
    }catch(error){
      console.warn('[Everflow] 题目修正层暂不可用，继续使用静态题库。',error);
      return[];
    }finally{clearTimeout(timer)}
  })();
  cache.set(key,pending);
  return pending;
}
export function applyQuestionOverrideRows(bank,data,rows){
  if(!data||!Array.isArray(rows)||!rows.length)return data;
  const patches=new Map(rows.map(row=>[String(row?.entity_id||''),row?.patch&&typeof row.patch==='object'?row.patch:{}]));
  if(bank==='relax1000'&&Array.isArray(data.questions)){
    data.questions=data.questions.map(question=>patches.has(String(question?.id))?{...question,...patches.get(String(question.id))}:question);
  }
  if(bank==='zhenti'&&data.questions&&typeof data.questions==='object'){
    const year=String(data.year||data.meta?.year||'');
    data.questions=Object.fromEntries(Object.entries(data.questions).map(([number,question])=>{
      const patch=patches.get(`${year}-${number}`);
      return[number,patch?{...question,...patch}:question];
    }));
  }
  return data;
}
export async function applyRelaxOverrides(data,options){return applyQuestionOverrideRows('relax1000',data,await loadQuestionOverrides('relax1000',options))}
export async function applyZhentiOverrides(data,year,options){
  if(data&&!data.year)data.year=Number(year)||String(year||'');
  return applyQuestionOverrideRows('zhenti',data,await loadQuestionOverrides('zhenti',options));
}
export function clearQuestionOverrideCache(bank){if(bank)cache.delete(String(bank));else cache.clear()}

window.EveraQuestionOverrides={version:VERSION,loadQuestionOverrides,clearQuestionOverrideCache,safeQuestionImageUrl};
