import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const SITE=path.join(ROOT,'site');
const DATA=path.join(SITE,'data','zhenti');
const SOURCE_DIRS=[DATA,path.join(DATA,'supplement')];
const ALLOWED_HOSTS=new Set(['raw.githubusercontent.com']);

function jsonFiles(dir){
  if(!fs.existsSync(dir))return[];
  return fs.readdirSync(dir,{withFileTypes:true})
    .filter(ent=>ent.isFile()&&ent.name.endsWith('.json'))
    .map(ent=>path.join(dir,ent.name))
    .filter(file=>!file.endsWith('audit-report.json')&&!file.endsWith('manifest.json'));
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

const files=[...SOURCE_DIRS.flatMap(jsonFiles)];
const fileState=new Map();
const refs=[];
const unique=new Map();

for(const file of files){
  const text=fs.readFileSync(file,'utf8');
  let doc;
  try{doc=JSON.parse(text)}catch(error){throw new Error(`${path.relative(ROOT,file)} is invalid JSON: ${error.message}`)}
  fileState.set(file,{text,changed:false});
  const year=doc?.year||path.basename(file).match(/(20\d{2})/)?.[1];
  for(const [q,item] of Object.entries(doc?.questions||{})){
    for(const fig of Array.isArray(item?.figures)?item.figures:[]){
      const src=String(fig?.src||'').trim();
      if(!/^https:\/\//i.test(src))continue;
      const url=new URL(src);
      if(!ALLOWED_HOSTS.has(url.hostname))throw new Error(`unapproved external figure host: ${src}`);
      const hash=crypto.createHash('sha1').update(src).digest('hex').slice(0,12);
      const ext=extFor(src);
      const assetYear=sourceYear(src,year);
      const rel=`/data/zhenti/assets/${assetYear}/source-${hash}.${ext}`;
      const dest=path.join(SITE,rel.replace(/^\//,''));
      const ref={file,year:Number(year),q:Number(q),src,rel,dest};
      refs.push(ref);
      if(!unique.has(src))unique.set(src,ref);
    }
  }
}

console.log(`external figure references: ${refs.length}`);
console.log(`unique external figures: ${unique.size}`);

const failures=[];
let downloaded=0,existing=0;
const queue=[...unique.values()];
let cursor=0;

async function worker(){
  while(true){
    const index=cursor++;
    if(index>=queue.length)return;
    const ref=queue[index];
    fs.mkdirSync(path.dirname(ref.dest),{recursive:true});
    if(fs.existsSync(ref.dest)&&fs.statSync(ref.dest).size>100){existing++;continue;}
    try{
      const response=await fetch(ref.src,{redirect:'follow',headers:{'User-Agent':'Everflow-Zhenti-Vendor/1.0'}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length<100)throw new Error(`image too small: ${bytes.length} bytes`);
      fs.writeFileSync(ref.dest,bytes);
      downloaded++;
      console.log(`downloaded ${path.relative(ROOT,ref.dest)} (${bytes.length} bytes)`);
    }catch(error){
      failures.push({src:ref.src,error:String(error?.message||error)});
      console.error('DOWNLOADFAIL',ref.src,error?.message||error);
    }
  }
}

await Promise.all(Array.from({length:Math.min(8,queue.length||1)},()=>worker()));
if(failures.length){
  console.error(JSON.stringify(failures,null,2));
  process.exit(1);
}

for(const ref of refs){
  const state=fileState.get(ref.file);
  if(!state.text.includes(ref.src))continue;
  state.text=state.text.split(ref.src).join(ref.rel);
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

console.log(`downloaded=${downloaded} existing=${existing} changedFiles=${changedFiles} remainingExternal=${remaining}`);
if(remaining!==0)process.exit(1);
