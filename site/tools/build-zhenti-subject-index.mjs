import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const DATA=path.join(ROOT,'site','data','zhenti');
const OUTPUT=path.join(DATA,'subject-index.json');
const YEARS=Array.from({length:18},(_,index)=>2009+index);
const SUBJECTS=['ds','co','os','cn'];

function readJson(file,optional=false){
  if(!fs.existsSync(file)){
    if(optional)return null;
    throw new Error(`missing file: ${path.relative(ROOT,file)}`);
  }
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

const verified=question=>question?.verification?.status==='verified';
function resolveQuestion(base,supplement,extra){
  if(verified(base))return base;
  if(verified(supplement))return supplement;
  if(verified(extra))return extra;
  return base||supplement||extra||null;
}

const years={};
for(const year of YEARS){
  const base=readJson(path.join(DATA,`${year}.json`));
  const supplement=readJson(path.join(DATA,'supplement',`${year}.json`),true);
  const extra=readJson(path.join(DATA,'supplement',`${year}-extra.json`),true);
  const groups=Object.fromEntries(SUBJECTS.map(subject=>[subject,[]]));
  for(let number=1;number<=47;number++){
    const question=resolveQuestion(base?.questions?.[String(number)],supplement?.questions?.[String(number)],extra?.questions?.[String(number)]);
    if(!question||!SUBJECTS.includes(question.subject))throw new Error(`${year}-${number}: missing or invalid subject`);
    groups[question.subject].push(number);
  }
  years[String(year)]=groups;
}

const payload={schema:'everflow.zhenti.subject-index.v1',version:'20260825-bank1',years};
const serialized=`${JSON.stringify(payload)}\n`;
if(process.argv.includes('--check')){
  const current=fs.existsSync(OUTPUT)?fs.readFileSync(OUTPUT,'utf8'):'';
  if(current!==serialized)throw new Error('site/data/zhenti/subject-index.json is stale; run node site/tools/build-zhenti-subject-index.mjs');
  console.log(`408 subject index OK: ${YEARS.length} years`);
}else{
  fs.writeFileSync(OUTPUT,serialized,'utf8');
  console.log(`wrote ${path.relative(ROOT,OUTPUT)} (${YEARS.length} years)`);
}
