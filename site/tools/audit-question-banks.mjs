import fs from 'node:fs';
import path from 'node:path';

const rootArg=process.argv.find(arg=>arg.startsWith('--site-root='));
const SITE=path.resolve(rootArg?rootArg.slice('--site-root='.length):'site');
const skipRelax=process.argv.includes('--skip-relax');
const failures=[];
const fail=(bank,id,code,detail='')=>failures.push({bank,id,code,detail});
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const validSubject=new Set(['ds','co','os','cn']);
const broken=value=>/\uFFFD|锟斤拷|�|\?\s*\?/.test(String(value??''));

function validImage(file){
  if(!fs.existsSync(file)||fs.statSync(file).size<32)return false;
  const head=fs.readFileSync(file).subarray(0,12);
  return head.subarray(0,4).toString()==='RIFF'&&head.subarray(8,12).toString()==='WEBP'
    ||head.subarray(1,4).toString()==='PNG'
    ||head[0]===0xff&&head[1]===0xd8
    ||path.extname(file).toLowerCase()==='.svg';
}

function auditZhenti(){
  const root=path.join(SITE,'data','zhenti');
  const verified=question=>question?.verification?.status==='verified';
  const optional=file=>fs.existsSync(file)?read(file):null;
  const rank=question=>{const mode=String(question?.verification?.mode||'').toLowerCase();if(!verified(question))return 0;if(/original-paper|original-scan|original-question-screenshot|public-paper-transcription|table-transcription|instruction-transcription/.test(mode))return 3;if(/paraphrase/.test(mode))return 1;return 2};
  const resolve=(base,supplement,extra)=>[base,supplement,extra].filter(verified).reduce((best,item)=>rank(item)>rank(best)?item:best,null)||base||supplement||extra||null;
  let questions=0,figures=0;
  for(let year=2009;year<=2026;year++){
    const base=read(path.join(root,`${year}.json`));
    const supplement=optional(path.join(root,'supplement',`${year}.json`));
    const extra=optional(path.join(root,'supplement',`${year}-extra.json`));
    for(let number=1;number<=47;number++){
      const id=`${year}-${number}`,question=resolve(base?.questions?.[String(number)],supplement?.questions?.[String(number)],extra?.questions?.[String(number)]);
      questions++;
      if(!verified(question)){fail('zhenti',id,'not-verified');continue}
      if(!String(question.stem||'').trim())fail('zhenti',id,'empty-stem');
      if(!validSubject.has(question.subject))fail('zhenti',id,'invalid-subject',question.subject);
      if(question.type==='single'||number<=40){
        const options=question.options&&typeof question.options==='object'&&!Array.isArray(question.options)?question.options:{};
        const keys=Object.keys(options);
        if(keys.join('')!=='ABCD')fail('zhenti',id,'invalid-option-keys',keys.join(','));
        for(const key of keys)if(!String(options[key]||'').trim())fail('zhenti',id,'empty-option',key);
        if(!keys.includes(String(question.answer||'')))fail('zhenti',id,'invalid-answer',question.answer);
      }
      for(const figure of question.figures||[]){
        figures++;
        const src=String(figure?.src||'');
        if(!src.startsWith('/data/zhenti/assets/')){fail('zhenti',id,'unsafe-figure-src',src);continue}
        const file=path.join(SITE,src.slice(1));
        if(!validImage(file))fail('zhenti',id,'missing-or-invalid-figure',src);
      }
    }
  }
  return{questions,figures};
}

function auditRelax(){
  const root=path.join(SITE,'data','relax1000');
  const data=read(path.join(root,'data','questions.json'));
  const ids=new Set();let figures=0;
  for(const [index,question] of (data.questions||[]).entries()){
    const id=String(question.id||`index-${index}`);
    if(ids.has(id))fail('relax',id,'duplicate-id');
    ids.add(id);
    if(!validSubject.has(question.subjectId))fail('relax',id,'invalid-subject',question.subjectId);
    if(!String(question.stem||'').trim()&&!question.questionImages?.length)fail('relax',id,'empty-stem-without-image');
    const options=Array.isArray(question.options)?question.options:[];
    if(options.length!==4)fail('relax',id,'invalid-option-count',String(options.length));
    const keys=options.map(item=>String(item?.key||''));
    if(keys.join('')!=='ABCD')fail('relax',id,'invalid-option-keys',keys.join(','));
    if(!keys.includes(String(question.answer||'')))fail('relax',id,'invalid-answer',question.answer);
    const damaged=[question.stem,...options.map(item=>item?.text)].some(broken);
    if(damaged&&!question.questionImages?.length)fail('relax',id,'damaged-ocr-without-question-image');
    for(const [kind,list] of [['question',question.questionImages],['explanation',question.explanationImages]]){
      for(const src of Array.isArray(list)?list:[]){
        figures++;
        const clean=String(src||'').replace(/^\.\//,'').replace(/^\//,'');
        const file=path.join(root,clean.replace(/^data\/relax1000\//,''));
        if(!validImage(file))fail('relax',id,`missing-or-invalid-${kind}-image`,src);
      }
    }
  }
  return{questions:(data.questions||[]).length,figures};
}

const zhenti=auditZhenti();
const relax=skipRelax?null:auditRelax();
if(failures.length){
  console.error(JSON.stringify({failures:failures.slice(0,100),failureCount:failures.length},null,2));
  process.exitCode=1;
}else console.log(`question-bank audit OK: zhenti=${zhenti.questions}/${zhenti.figures} figures${relax?`, relax=${relax.questions}/${relax.figures} figures`:''}`);
