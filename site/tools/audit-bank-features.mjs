import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{spawnSync}from'node:child_process';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const files={
  nav:'site/assets/js/site-nav-v2.js',
  runtime:'site/assets/js/site-runtime-v2.js',
  switcher:'site/assets/js/question-bank-switch.js',
  builder:'site/assets/js/paper-builder.js',
  cards:'site/assets/js/relax1000-cards.js',
  bank:'site/zhenti/index.html',
  paper:'site/relax/index.html',
  manifest:'site/data/zhenti/manifest.json'
};
for(const p of Object.values(files))assert(fs.existsSync(path.join(root,p)),`missing ${p}`);

const nav=read(files.nav),runtime=read(files.runtime),switcher=read(files.switcher),builder=read(files.builder),cards=read(files.cards),bank=read(files.bank),paper=read(files.paper);
assert(nav.includes("label:'题库'"),'top nav must expose 题库');
assert(!nav.includes("label:'真题墙'"),'top nav still exposes 真题墙');
assert(switcher.includes('>组卷</button>'),'bank switch missing 组卷');
assert(!switcher.includes('Relax组卷'),'bank switch still says Relax组卷');
assert(switcher.includes('relax1000-cards.js'),'Relax1000 cards module not loaded');
assert(builder.includes("QUOTA={ds:11,co:11,os:10,cn:8}"),'408 simulation quota is not 11/11/10/8');
assert(paper.includes('data-source="zhenti"'),'408 true-paper source missing');
assert(paper.includes('data-source="relax"'),'Relax1000 paper source missing');
assert(paper.includes('data-mode="wrong"'),'wrong-paper mode missing');
assert(builder.includes('wrongPool()'),'cross-bank wrong pool missing');
assert(builder.includes('questionState'),'Relax legacy state compatibility missing');
assert(cards.includes("SRS_KEY='everflow-408-relax-srs-v1'"),'Relax1000 SRS state missing');
assert(cards.includes('速刷卡片'),'Relax1000 quick-card UI missing');
assert(bank.includes('题库 · Everflow'),'bank document title not updated');
assert(bank.includes('20260824-bank8'),'bank page cache version not bumped');
assert(runtime.includes("ASSET_VERSION='20260824-bank8'"),'runtime cache version not bumped');
assert(!paper.includes('11 / 12 / 10 / 7'),'legacy wrong 408 quota still visible');

const manifest=JSON.parse(read(files.manifest));
const years=Object.keys(manifest.years||{}).sort();
assert(years.length===18&&years[0]==='2009'&&years.at(-1)==='2026','true-paper manifest must cover 2009-2026');
let verified=0,autoChoice=0;
for(const year of years){
  const meta=manifest.years[year],paperPath=path.join(root,`site/data/zhenti/${year}.json`);assert(fs.existsSync(paperPath),`missing ${year}.json`);const data=JSON.parse(fs.readFileSync(paperPath,'utf8'));const nums=meta.verifiedQuestions||[];verified+=nums.length;
  for(const n of nums){const q=data.questions?.[String(n)];if(q?.verification?.status==='verified'&&q?.options&&/^[A-D]$/.test(String(q.answer||'')))autoChoice++}
}
assert(verified>=846,`verified true-paper corpus unexpectedly small: ${verified}`);
assert(autoChoice>=720,`auto-gradable true-paper choice pool unexpectedly small: ${autoChoice}`);

const jsFiles=[files.switcher,files.builder,files.cards,files.runtime,files.nav];
for(const file of jsFiles){
  const tmp=path.join(os.tmpdir(),`everflow-audit-${path.basename(file,'.js')}.mjs`);fs.writeFileSync(tmp,read(file));const result=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});fs.rmSync(tmp,{force:true});assert(result.status===0,`syntax check failed: ${file}\n${result.stderr||result.stdout}`);
}
console.log(`bank audit OK: ${years.length} years, ${verified} verified questions, ${autoChoice} auto-gradable choice questions`);
