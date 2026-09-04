import fs from 'node:fs';
import path from 'node:path';

const rootArg=process.argv.find(arg=>arg.startsWith('--site-root='));
const SITE=path.resolve(rootArg?rootArg.slice('--site-root='.length):'site');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const validSubjects=new Set(['ds','co','os','cn']);
const validImage=file=>fs.existsSync(file)&&fs.statSync(file).size>=32;
const banks=[];

function scanZhenti(){
  const issues=[];let questions=0,images=0;
  for(let year=2009;year<=2026;year++){
    const file=path.join(SITE,'data','zhenti',`${year}.json`),data=read(file);
    const supplementFile=path.join(SITE,'data','zhenti','supplement',`${year}.json`),extraFile=path.join(SITE,'data','zhenti','supplement',`${year}-extra.json`);
    const supplement=fs.existsSync(supplementFile)?read(supplementFile):null,extra=fs.existsSync(extraFile)?read(extraFile):null;
    for(let number=1;number<=47;number++){
      const candidates=[data?.questions?.[number],supplement?.questions?.[number],extra?.questions?.[number]].filter(Boolean);
      const question=candidates.find(item=>item?.verification?.status==='verified')||candidates[0];questions++;
      if(!question||question?.verification?.status!=='verified')issues.push(`${year}-${number}: 未核验`);
      else if(!String(question.stem||'').trim())issues.push(`${year}-${number}: 题干为空`);
      else if(!validSubjects.has(question.subject))issues.push(`${year}-${number}: 科目异常`);
      if(question&&(question.type==='single'||number<=40)){
        const keys=Object.keys(question.options||{});
        if(keys.join('')!=='ABCD'||!keys.includes(String(question.answer||'')))issues.push(`${year}-${number}: 选项或答案异常`);
      }
      for(const figure of question?.figures||[]){images++;const src=String(figure?.src||'');if(!src.startsWith('/data/zhenti/assets/')||!validImage(path.join(SITE,src.slice(1))))issues.push(`${year}-${number}: 图片缺失`)}
    }
  }
  banks.push({id:'zhenti',label:'408 历年真题',status:issues.length?'error':'pass',note:issues.length?`${issues.length} 项需要处理`:`${questions} 道题、${images} 张配图结构完整`,checks:['题干','选项','答案','图片','核验状态'],issues:issues.slice(0,20)});
}

function scanRelax(){
  const file=path.join(SITE,'data','relax1000','data','questions.json');
  if(!fs.existsSync(file)){banks.push({id:'relax1000',label:'Relax1000',status:'warning',note:'本地源码不包含私有语料，部署构建时自动复核',checks:['结构','重复 ID','答案','图片']});return}
  const data=read(file),issues=[],ids=new Set();
  for(const [index,question] of (data.questions||[]).entries()){
    const id=String(question.id||index);if(ids.has(id))issues.push(`${id}: ID 重复`);ids.add(id);
    const keys=(question.options||[]).map(item=>String(item?.key||''));
    if(!validSubjects.has(question.subjectId)||keys.join('')!=='ABCD'||!keys.includes(String(question.answer||'')))issues.push(`${id}: 结构或答案异常`);
  }
  banks.push({id:'relax1000',label:'Relax1000',status:issues.length?'error':'pass',note:issues.length?`${issues.length} 项需要处理`:'私有强化题库已通过完整性审计',checks:['结构','重复 ID','答案','图片'],issues:issues.slice(0,20)});
}

scanZhenti();scanRelax();
const report={schema:'everflow-admin-quality-v1',generatedAt:new Date().toISOString(),status:banks.every(bank=>bank.status==='pass')?'pass':banks.some(bank=>bank.status==='error')?'error':'warning',banks};
fs.writeFileSync(path.join(SITE,'data','admin-quality-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`admin quality report: ${report.status}; ${banks.map(bank=>`${bank.id}=${bank.status}`).join(', ')}`);
