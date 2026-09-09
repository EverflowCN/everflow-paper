const VERSION='20260909-math2-papers1';
export const CATALOG_URL=`/data/math-papers/catalog.json?v=${VERSION}`;
const PROGRESS_KEY='everflow-math-papers-progress-v1';
let bundlePromise=null;
let catalogRef=null;
export function setCatalogRef(value){catalogRef=value}
export const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
export const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
export const subjectName=()=> '数学二';
export const sectionName=id=>({choice:'选择题',fill:'填空题',solution:'解答题'}[id]||'题目');
const CIRCLED={1:'①',2:'②',3:'③',4:'④',5:'⑤',6:'⑥',7:'⑦',8:'⑧',9:'⑨'};
const replaceMathSegment=(source,pattern,transform)=>source.replace(pattern,(full,body)=>transform(body,full));
const cleanLatex=value=>{
  let source=String(value??'')
    .replace(/\\textcircled\s*\{([1-9])\}/g,(_,n)=>CIRCLED[n]||n)
    .replace(/\\NPEEQuestionContinuation\b/g,'\n')
    .replace(/\\par\b/g,'\n')
    .replace(/\\begin\{minipage\}\{[^}]*\}/g,'')
    .replace(/\\end\{minipage\}/g,'')
    .replace(/\\relax\b|\\mbox\s*\{\s*\}/g,'');
  const fixMath=body=>{
    let out=body
      .replace(/\\ExamBlank\b/g,'\\underline{\\hspace{3em}}')
      .replace(/\\ExamSelection\b/g,'')
      .replace(/\\(iint|iiint|oint)\s*(?!\\limits)_(?=\{|[A-Za-z]|\\)/g,'\\$1\\limits_');
    if(/\\(?:lim|sum|prod|int|iint|iiint|oint|max|min|sup|inf)\b/.test(out)&&!/\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle)\b/.test(out))out='\\displaystyle '+out.trim();
    return out;
  };
  source=replaceMathSegment(source,/\$([^$]*)\$/gs,(_,body)=>`$${fixMath(body)}$`);
  source=replaceMathSegment(source,/\\\(([\s\S]*?)\\\)/g,(_,body)=>`\\(${fixMath(body)}\\)`);
  source=replaceMathSegment(source,/\\\[([\s\S]*?)\\\]/g,(_,body)=>`\\[${fixMath(body)}\\]`);
  return source
    .replace(/\\ExamBlank\b/g,'______')
    .replace(/\\ExamSelection\b/g,'')
    .replace(/^\\\s*$/gm,'')
    .trim();
};
export const latexHtml=value=>esc(cleanLatex(value)).replace(/\n/g,'<br>');
export const svgDataUrl=value=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(String(value||''))}`;
export const percent=(done,total)=>total?Math.round(done/total*100):0;
export const formatTime=seconds=>{seconds=Math.max(0,Math.floor(seconds||0));const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return[h,m,s].map(v=>String(v).padStart(2,'0')).join(':')};

let mathJaxPromise=null;
function ensureMathJax(){
  if(window.MathJax?.typesetPromise)return Promise.resolve(window.MathJax);
  if(mathJaxPromise)return mathJaxPromise;
  window.MathJax={loader:{load:['[tex]/boldsymbol']},tex:{inlineMath:[['$','$'],['\\(','\\)']],displayMath:[['$$','$$'],['\\[','\\]']],processEscapes:true,packages:{'[+]':['ams','boldsymbol']}},svg:{fontCache:'global'},startup:{typeset:false}};
  mathJaxPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';script.async=true;script.onload=()=>resolve(window.MathJax);script.onerror=()=>reject(new Error('MathJax load failed'));document.head.appendChild(script)});
  return mathJaxPromise;
}
export async function typeset(node){try{const mj=await ensureMathJax();if(mj.typesetClear)mj.typesetClear([node]);await mj.typesetPromise([node])}catch(error){console.warn('[Everflow] 数学公式渲染不可用，保留原始 LaTeX。',error)}}

export function getProgress(){const value=readJson(PROGRESS_KEY,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
export function paperRecord(id){const all=getProgress();const raw=all[id]&&typeof all[id]==='object'?all[id]:{};return{answers:raw.answers||{},judgements:raw.judgements||{},visited:Array.isArray(raw.visited)?raw.visited:[],elapsed:Number(raw.elapsed)||0,...raw}}
export function savePaperRecord(id,record){const all=getProgress();all[id]={...record,updatedAt:new Date().toISOString()};writeJson(PROGRESS_KEY,all)}
export function answerDone(value){return typeof value==='string'?Boolean(value.trim()):value!==undefined&&value!==null&&value!==''}
export function answeredCount(record){return Object.values(record?.answers||{}).filter(answerDone).length}
export function judgementCount(record,value){return Object.values(record?.judgements||{}).filter(v=>v===value).length}

export function expandCatalog(doc){
  if(doc&&!Array.isArray(doc.papers)&&Array.isArray(doc.paper_rows)){
    const seriesMap=Object.fromEntries((doc.series||[]).map(item=>[item.key,item.name]));
    doc.papers=doc.paper_rows.map(row=>{const [year,series_key,paper_no,question_count,choice,fill,solution]=row;return{id:`${year}-math2-${series_key}-${paper_no}`,year,subject:'math2',subject_label:'数学二',series_key,series_name:seriesMap[series_key]||series_key,paper_no,question_count,counts:{choice,fill,solution}}});
  }
  return doc;
}
function expandCompactBundle(doc){
  if(!doc||!Array.isArray(doc.p)||!Array.isArray(doc.s))throw new Error('math2 compact bundle schema invalid');
  const seriesMap=Object.fromEntries((catalogRef?.series||[]).map(item=>[item.key,item.name]));
  const sectionMap={0:'choice',1:'fill',2:'solution'};
  const papers=doc.p.map(row=>{
    const [year,subjectCode,seriesIndex,paperNo,items]=row;
    if(subjectCode!==2)throw new Error('unexpected non-math2 paper');
    const seriesKey=doc.s[seriesIndex];
    const id=`${year}-math2-${seriesKey}-${paperNo}`;
    const questions=(items||[]).map(q=>({id:`${id}-q${q[0]}`,number:q[0],section:sectionMap[q[1]]||'solution',points:q[2]||0,latex:q[3]||'',choices:Array.isArray(q[4])?q[4]:[],subparts:Array.isArray(q[5])?q[5]:[],figures_svg:Array.isArray(q[6])?q[6]:[],choice_svgs:q[7]&&typeof q[7]==='object'?q[7]:{}}));
    const counts={choice:questions.filter(q=>q.section==='choice').length,fill:questions.filter(q=>q.section==='fill').length,solution:questions.filter(q=>q.section==='solution').length};
    return{id,year,subject:'math2',subject_label:'数学二',series_key:seriesKey,series_name:seriesMap[seriesKey]||seriesKey,paper_no:paperNo,question_count:questions.length,counts,questions};
  });
  if(papers.length!==107||papers.reduce((n,p)=>n+p.questions.length,0)!==2354)throw new Error('math2 bundle count mismatch');
  return{papers};
}

export async function fetchJson(url){const response=await fetch(url,{cache:'force-cache'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}
export async function loadBundle(){
  if(bundlePromise)return bundlePromise;
  bundlePromise=(async()=>{
    const parts=Array.isArray(catalogRef?.bundle_parts)?catalogRef.bundle_parts:[];if(!parts.length)throw new Error('数学套题压缩分片目录为空');
    const chunks=await Promise.all(parts.map(async url=>{const response=await fetch(`${url}?v=${VERSION}`,{cache:'force-cache'});if(!response.ok)throw new Error(`数学套题数据 HTTP ${response.status}`);return response.text()}));
    const encoded=chunks.join('').replace(/\s+/g,'');const binary=atob(encoded);const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));let text='';
    if('DecompressionStream' in window){const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));text=await new Response(stream).text()}
    else{await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';script.onload=resolve;script.onerror=reject;document.head.appendChild(script)});text=window.pako.ungzip(bytes,{to:'string'})}
    const compact=JSON.parse(text);return expandCompactBundle(compact);
  })().catch(error=>{bundlePromise=null;throw error});return bundlePromise;
}
