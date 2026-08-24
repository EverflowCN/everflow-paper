import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const SITE=path.join(ROOT,'site');
const DATA=path.join(SITE,'data','zhenti');
const REPORT_FILE=path.join(DATA,'vendor-report.json');
const SOURCE_DIRS=[DATA,path.join(DATA,'supplement')];
const ALLOWED_HOSTS=new Set(['raw.githubusercontent.com']);

function jsonFiles(dir){
  if(!fs.existsSync(dir))return[];
  return fs.readdirSync(dir,{withFileTypes:true})
    .filter(ent=>ent.isFile()&&ent.name.endsWith('.json'))
    .map(ent=>path.join(dir,ent.name))
    .filter(file=>!file.endsWith('audit-report.json')&&!file.endsWith('vendor-report.json')&&!file.endsWith('manifest.json'));
}

function extFor(url){
  const pathname=new URL(url).pathname.toLowerCase();
  const match=pathname.match(/\.(png|jpe?g|webp|gif|svg)$/);
  if(!match)throw new Error(`unsupported image extension: ${url}`);
  return match[1]==='jpeg'?'jpg':match[1];
}

function sourceYear(url,fallback){
  const match=new URL(url).pathname.match(/\/(20\d{2})\//);
  return match?.[1]||String(fallback);
}

function candidates(src){
  const out=[src];
  const fallback=src.replace(/-fig\d+\.(?:jpe?g|png)$/i,'.png');
  if(fallback!==src)out.push(fallback);
  return out;
}

function writeReport(data){
  fs.writeFileSync(REPORT_FILE,`${JSON.stringify({generatedAt:new Date().toISOString(),...data},null,2)}\n`,'utf8');
}

const files=[...SOURCE_DIRS.flatMap(jsonFiles)];
const fileState=new Map();
const refs=[];
const unique=new Map();

for(const file of files){
  const text=fs.readFileSync(file,'utf8');
  let doc;
  try{doc=JSON.parse(text)}catch(error){
    writeReport({status:'failed',stage:'parse',file:path.relative(ROOT,file),error:error.message});
    throw new Error(`${path.relative(ROOT,file)} is invalid JSON: ${error.message}`);
  }
  fileState.set(file,{text,changed:false});
  const year=doc?.year||path.basename(file).match(/(20\d{2})/)?.[1];
  for(const [q,item] of Object.entries(doc?.questions||{})){
    for(const fig of Array.isArray(item?.figures)?item.figures:[]){
      const src=String(fig?.src||'').trim();
      if(!/^https:\/\//i.test(src))continue;
      const url=new URL(src);
      if(!ALLOWED_HOSTS.has(url.hostname)){
        writeReport({status:'failed',stage:'scan',error:`unapproved external figure host: ${src}`});
        throw new Error(`unapproved external figure host: ${src}`);
      }
      const ref={file,year:Number(year),q:Number(q),src};
      refs.push(ref);
      if(!unique.has(src))unique.set(src,ref);
    }
  }
}

console.log(`external figure references: ${refs.length}`);
console.log(`unique external figures: ${unique.size}`);

const failures=[];
const resolved=new Map();
let downloaded=0,existing=0,fallbacks=0;
const queue=[...unique.values()];
let cursor=0;

async function worker(){
  while(true){
    const index=cursor++;
    if(index>=queue.length)return;
    const ref=queue[index];
    let success=null,lastError='unknown error';

    for(const candidate of candidates(ref.src)){
      try{
        const response=await fetch(candidate,{redirect:'follow',headers:{'User-Agent':'Everflow-Zhenti-Vendor/1.0'}});
        if(!response.ok){lastError=`${candidate} -> HTTP ${response.status}`;continue;}
        const bytes=Buffer.from(await response.arrayBuffer());
        if(bytes.length<100){lastError=`${candidate} -> image too small: ${bytes.length} bytes`;continue;}
        const contentType=String(response.headers.get('content-type')||'');
        if(contentType&&!contentType.startsWith('image/')&&!contentType.includes('octet-stream')){
          lastError=`${candidate} -> unexpected content-type ${contentType}`;continue;
        }
        success={candidate,bytes};
        break;
      }catch(error){lastError=`${candidate} -> ${String(error?.message||error)}`;}
    }

    if(!success){
      const entry={year:ref.year,q:ref.q,src:ref.src,error:lastError};
      failures.push(entry);
      console.error('DOWNLOADFAIL',JSON.stringify(entry));
      continue;
    }

    const actual=success.candidate;
    const hash=crypto.createHash('sha1').update(ref.src).digest('hex').slice(0,12);
    const ext=extFor(actual);
    const assetYear=sourceYear(actual,ref.year);
    const rel=`/data/zhenti/assets/${assetYear}/source-${hash}.${ext}`;
    const dest=path.join(SITE,rel.replace(/^\//,''));
    fs.mkdirSync(path.dirname(dest),{recursive:true});

    if(fs.existsSync(dest)&&fs.statSync(dest).size>100){
      existing++;
    }else{
      fs.writeFileSync(dest,success.bytes);
      downloaded++;
    }
    if(actual!==ref.src)fallbacks++;
    resolved.set(ref.src,{rel,dest,fetchedFrom:actual,size:success.bytes.length});
    console.log(`resolved ${ref.year}-${ref.q}: ${actual===ref.src?'direct':'fallback'} -> ${path.relative(ROOT,dest)} (${success.bytes.length} bytes)`);
  }
}

await Promise.all(Array.from({length:Math.min(8,queue.length||1)},()=>worker()));
if(failures.length){
  writeReport({
    status:'failed',stage:'download',
    externalReferences:refs.length,uniqueExternalFigures:unique.size,
    downloaded,existing,fallbacks,failed:failures.length,failures,
    remainingExternal:refs.length
  });
  console.error(JSON.stringify(failures,null,2));
  process.exit(1);
}

for(const ref of refs){
  const target=resolved.get(ref.src);
  if(!target)throw new Error(`missing resolved target for ${ref.src}`);
  const state=fileState.get(ref.file);
  if(!state.text.includes(ref.src))continue;
  state.text=state.text.split(ref.src).join(target.rel);
  state.changed=true;
}

let changedFiles=0;
for(const [file,state] of fileState){
  if(!state.changed)continue;
  JSON.parse(state.text);
  fs.writeFileSync(file,state.text,'utf8');
  changedFiles++;
}

let remaining=0;
for(const file of files){
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const item of Object.values(doc?.questions||{})){
    for(const fig of Array.isArray(item?.figures)?item.figures:[]){
      if(/^https:\/\//i.test(String(fig?.src||'')))remaining++;
    }
  }
}

writeReport({
  status:remaining===0?'ok':'failed',stage:'complete',
  externalReferences:refs.length,uniqueExternalFigures:unique.size,
  downloaded,existing,fallbacks,failed:0,changedFiles,remainingExternal:remaining,
  localAssets:[...unique.values()].map(ref=>{
    const target=resolved.get(ref.src);
    return {year:ref.year,q:ref.q,source:ref.src,fetchedFrom:target?.fetchedFrom,local:target?.rel,size:target?.size};
  })
});

console.log(`downloaded=${downloaded} existing=${existing} fallbacks=${fallbacks} changedFiles=${changedFiles} remainingExternal=${remaining}`);
if(remaining!==0)process.exit(1);
