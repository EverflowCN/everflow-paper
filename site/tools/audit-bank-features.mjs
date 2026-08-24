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
  bankSwitcher:'site/assets/js/question-bank-switch.js',
  graphSwitcher:'site/assets/js/graph-source-switch.js',
  relaxWall:'site/assets/js/relax1000-wall.js',
  relaxGraph:'site/assets/js/relax1000-graph.js',
  builder:'site/assets/js/paper-builder.js',
  cards:'site/assets/js/relax1000-cards.js',
  bank:'site/zhenti/index.html',
  graph:'site/graph/index.html',
  paper:'site/relax/index.html',
  manifest:'site/data/zhenti/manifest.json'
};
for(const p of Object.values(files))assert(fs.existsSync(path.join(root,p)),`missing ${p}`);

const nav=read(files.nav),runtime=read(files.runtime),bankSwitcher=read(files.bankSwitcher),graphSwitcher=read(files.graphSwitcher),relaxWall=read(files.relaxWall),relaxGraph=read(files.relaxGraph),builder=read(files.builder),cards=read(files.cards),bank=read(files.bank),graph=read(files.graph),paper=read(files.paper);

assert(nav.includes("label:'题库'"),'top nav must expose 题库');
assert(nav.includes("label:'组卷'"),'top nav must expose standalone 组卷');
assert(nav.includes("label:'整体图谱'"),'top nav must expose 整体图谱');
assert(!nav.includes("label:'真题墙'"),'top nav still exposes 真题墙');
assert(nav.includes("{href:'/zhenti/',label:'题库',match:p=>p.startsWith('/zhenti/')"),'题库 nav must only match /zhenti/');
assert(nav.includes("{href:'/relax/',label:'组卷',match:p=>p.startsWith('/relax/')"),'组卷 must be an independent nav page');

assert(bankSwitcher.includes('408 真题')&&bankSwitcher.includes('Relax1000'),'bank switch must contain both banks');
assert(!bankSwitcher.includes('data-bank-practice'),'bank switch must not contain group-paper entry');
assert(!bankSwitcher.includes('>组卷</button>'),'bank switch must not contain 组卷 button');
assert(bankSwitcher.includes('relax1000-wall.js'),'Relax1000 bank must load wall layout');
assert(!bankSwitcher.includes('relax1000-graph.js'),'Relax1000 graph must not be loaded inside bank');
assert(bankSwitcher.includes('relax1000-cards.js'),'Relax1000 cards module not loaded');
assert(relaxWall.includes('relax-wall-workspace')&&relaxWall.includes('relax-sidebar'),'Relax1000 bank wall layout missing');
assert(cards.includes('题库墙')&&cards.includes('速刷卡片'),'Relax1000 wall/cards subview missing');
assert(cards.includes("SRS_KEY='everflow-408-relax-srs-v1'"),'Relax1000 SRS state missing');

assert(graphSwitcher.includes("KEY='everflow-408-graph-source-v1'"),'graph must use independent source state');
assert(graphSwitcher.includes('408 真题')&&graphSwitcher.includes('Relax1000'),'graph switch must contain both graph sources');
assert(graphSwitcher.includes('relax1000-graph.js'),'Relax1000 graph loader missing');
assert(graph.includes('graph-source-switch.js'),'graph page must load graph source switcher');
assert(relaxGraph.includes('const MAX_COLS=45'),'Relax1000 graph row limit must be 45');
assert(relaxGraph.includes('start+=MAX_COLS'),'Relax1000 graph must split long chapters into 45-cell rows');
assert(relaxGraph.includes('graph-fit-toggle'),'Relax1000 graph zoom/fit toggle missing');
assert(relaxGraph.includes("FIT_KEY='everflow-408-relax-graph-fit-v1'"),'Relax1000 graph fit state missing');

assert(builder.includes("QUOTA={ds:11,co:11,os:10,cn:8}"),'408 simulation quota is not 11/11/10/8');
assert(paper.includes('data-source="zhenti"'),'408 true-paper source missing');
assert(paper.includes('data-source="relax"'),'Relax1000 paper source missing');
assert(paper.includes('data-mode="wrong"'),'wrong-paper mode missing');
assert(builder.includes('wrongPool()'),'cross-bank wrong pool missing');
assert(builder.includes('questionState'),'Relax legacy state compatibility missing');
assert(paper.includes('<title>组卷 · Everflow</title>'),'group-paper document title missing');
assert(!paper.includes('11 / 12 / 10 / 7'),'legacy wrong 408 quota still visible');

assert(bank.includes('<title>题库 · Everflow</title>'),'bank document title not updated');
assert(!bank.includes(' / 组卷'),'bank footer still advertises group-paper mode');
assert(bank.includes('20260824-bank10'),'bank page cache version not bumped');
assert(runtime.includes("ASSET_VERSION='20260824-bank10'"),'runtime cache version not bumped');
assert(runtime.includes("if(body.dataset.view==='zhenti')import(asset('/assets/js/question-bank-switch.js'))"),'runtime must load bank switch only on /zhenti/');

const manifest=JSON.parse(read(files.manifest));
const years=Object.keys(manifest.years||{}).sort();
assert(years.length===18&&years[0]==='2009'&&years.at(-1)==='2026','true-paper manifest must cover 2009-2026');
let verified=0,autoChoice=0;
for(const year of years){
  const meta=manifest.years[year],paperPath=path.join(root,`site/data/zhenti/${year}.json`);
  assert(fs.existsSync(paperPath),`missing ${year}.json`);
  const data=JSON.parse(fs.readFileSync(paperPath,'utf8')),nums=meta.verifiedQuestions||[];verified+=nums.length;
  for(const n of nums){const q=data.questions?.[String(n)];if(q?.verification?.status==='verified'&&q?.options&&/^[A-D]$/.test(String(q.answer||'')))autoChoice++}
}
assert(verified>=846,`verified true-paper corpus unexpectedly small: ${verified}`);
assert(autoChoice>=720,`auto-gradable true-paper choice pool unexpectedly small: ${autoChoice}`);

const jsFiles=[files.bankSwitcher,files.graphSwitcher,files.relaxWall,files.relaxGraph,files.builder,files.cards,files.runtime,files.nav];
for(const file of jsFiles){
  const tmp=path.join(os.tmpdir(),`everflow-audit-${path.basename(file,'.js')}.mjs`);
  fs.writeFileSync(tmp,read(file));
  const result=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
  fs.rmSync(tmp,{force:true});
  assert(result.status===0,`syntax check failed: ${file}\n${result.stderr||result.stdout}`);
}
console.log(`bank/graph/paper audit OK: ${years.length} years, ${verified} verified questions, ${autoChoice} auto-gradable choice questions`);
