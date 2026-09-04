import fs from'node:fs';
import path from'node:path';

const rootArg=process.argv.find(arg=>arg.startsWith('--site-root='));
const SITE=path.resolve(rootArg?rootArg.slice('--site-root='.length):'site');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const exists=file=>fs.existsSync(file)?read(file):null;
const verified=item=>item?.verification?.status==='verified';
const counters={questions:0,original:0,paraphrase:0,structural:0,shortAnalysis:0,longStem:0,withFigures:0,technicalNotation:0};
const problems=[];

function tier(question){
  const mode=String(question?.verification?.mode||'').toLowerCase();
  if(/original-paper|original-scan|original-question-screenshot|public-paper-transcription|table-transcription|instruction-transcription/.test(mode))return'original';
  if(/paraphrase/.test(mode))return'paraphrase';
  return'structural';
}

function choose(candidates){const rank=question=>question?({original:3,structural:2,paraphrase:1}[tier(question)]||0):0;return candidates.filter(verified).reduce((best,item)=>rank(item)>rank(best)?item:best,null)||candidates[0]}

for(let year=2009;year<=2026;year++){
  const root=path.join(SITE,'data','zhenti'),base=read(path.join(root,`${year}.json`));
  const supplement=exists(path.join(root,'supplement',`${year}.json`)),extra=exists(path.join(root,'supplement',`${year}-extra.json`));
  for(let number=1;number<=47;number++){
    const candidates=[base?.questions?.[number],supplement?.questions?.[number],extra?.questions?.[number]].filter(Boolean);
    const question=choose(candidates),id=`${year}-${number}`;
    if(!verified(question))continue;
    counters.questions++;counters[tier(question)]++;
    const fields=[question.stem,question.analysis,...Object.values(question.options||{})].map(value=>String(value??''));
    if(String(question.analysis||'').trim().length<25)counters.shortAnalysis++;
    if(String(question.stem||'').length>180)counters.longStem++;
    if((question.figures||[]).length)counters.withFigures++;
    if(fields.some(value=>/[\^_]|0x[0-9a-f]+|<[^>]{1,40}>/i.test(value)))counters.technicalNotation++;
    if(fields.some(value=>/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/.test(value)))problems.push(`${id}: 损坏字符`);
  }
}

const renderer=fs.readFileSync(path.join(SITE,'assets','js','question-content-v1.js'),'utf8');
if(!renderer.includes("'&':'&amp;'")||!renderer.includes("'<':'&lt;'"))problems.push('共享题目渲染器缺少 HTML 转义');
for(const token of ['question-item-line','fullNumbers.length>=2','romans.length>=2','circles.length>=2'])if(!renderer.includes(token))problems.push(`共享题目渲染器缺少分项规则: ${token}`);
if(problems.length){console.error(JSON.stringify({problems},null,2));process.exitCode=1}
else console.log(`question content audit OK: ${JSON.stringify(counters)}`);
