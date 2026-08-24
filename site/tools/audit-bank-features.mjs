import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{spawnSync}from'node:child_process';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const files={
  nav:'site/assets/js/site-nav-v2.js',runtime:'site/assets/js/site-runtime-v2.js',entry:'site/assets/js/zhenti-entry.js',
  bankSwitcher:'site/assets/js/question-bank-switch.js',graphApp:'site/assets/js/graph-app.js',graphControls:'site/assets/js/graph-controls.js',graphControlsCss:'site/assets/css/graph-controls.css',
  relaxCore:'site/assets/js/relax1000-core.js',relaxWall:'site/assets/js/relax1000-wall.js',relaxGraph:'site/assets/js/relax1000-graph.js',
  builder:'site/assets/js/paper-builder.js',cards:'site/assets/js/relax1000-cards.js',reset:'site/assets/js/relax1000-reset.js',experience:'site/assets/js/relax1000-cards-experience.js',
  zhentiMedia:'site/assets/js/zhenti-media.js',controls:'site/assets/css/relax1000-controls.css',interaction:'site/assets/css/interaction-guard.css',
  bank:'site/zhenti/index.html',graph:'site/graph/index.html',paper:'site/relax/index.html',admin:'site/admin/index.html',manifest:'site/data/zhenti/manifest.json',deploy:'.github/workflows/deploy-pages-v2.yml'
};
for(const p of Object.values(files))assert(exists(p),`missing ${p}`);
for(const p of ['site/assets/js/relax1000-practice.js','site/assets/css/relax1000-overview.css','site/assets/js/graph-source-switch.js','site/assets/js/overall-graph-fit.js','site/assets/js/overall-graph-keyboard.js','site/assets/css/overall-graph-fit.css'])assert(!exists(p),`obsolete file must stay deleted: ${p}`);

const text=Object.fromEntries(Object.entries(files).map(([key,p])=>[key,read(p)]));
const{nav,runtime,entry,bankSwitcher,graphApp,graphControls,graphControlsCss,relaxCore,relaxWall,relaxGraph,builder,cards,reset,experience,zhentiMedia,controls,interaction,bank,graph,paper,admin,deploy}=text;

assert(nav.includes("label:'题库'")&&nav.includes("label:'组卷'")&&nav.includes("label:'整体图谱'"),'top nav IA incomplete');
assert(!nav.includes("label:'真题墙'"),'legacy nav label remains');
assert(bank.includes('zhenti-entry.js')&&bank.includes('<title>题库 · Everflow</title>'),'bank entry/title invalid');
assert(entry.includes("source==='zhenti'")&&entry.includes('zhenti-wall.js'),'true-paper selected-only boot missing');
assert(bankSwitcher.includes('408 真题')&&bankSwitcher.includes('Relax1000')&&!bankSwitcher.includes('relax1000-graph.js'),'bank switch architecture invalid');
assert(cards.includes('题库墙')&&cards.includes('速刷卡片'),'Relax cards subview missing');
assert(experience.includes('⛶ 畅享全屏')&&experience.includes("event.shiftKey&&String(event.key).toUpperCase()==='F'"),'Relax fullscreen contract missing');
for(const choice of ['answers','status','favorites','today','srs','all'])assert(reset.includes(`data-relax-reset-choice="${choice}"`),`Relax reset missing ${choice}`);
assert(relaxCore.includes("RELAX_ASSET_BASE='/data/relax1000'")&&relaxCore.includes('RELAX_STORAGE_KEYS'),'Relax core/data contract missing');
assert(!/EverflowCN|408-exercise-paper-generator|raw\.githubusercontent\.com/i.test(relaxCore),'Relax runtime leaks repository identity/address');
assert(relaxWall.includes('relax-wall-workspace')&&relaxWall.includes('relax-sidebar'),'Relax wall layout missing');
assert(controls.includes('evera-modal-open')&&controls.includes('evera-immersive-open'),'Relax overlay locks missing');
assert(interaction.includes('--z-modal')&&interaction.includes('--z-toast')&&interaction.includes('button:disabled'),'shared interaction guard missing');

assert(graph.includes('graph-app.js')&&graph.includes('graph-controls.css'),'graph page must boot through the app/controller pair');
assert(!graph.includes('graph-source-switch.js')&&!graph.includes('overall-graph-fit.js')&&!graph.includes('overall-graph-keyboard.js'),'graph page references obsolete controllers');
assert(graph.includes('data-graph-caption')&&graph.includes('20260824-graph-r3'),'graph shell/build marker missing');
assert(graphApp.includes('const SOURCES=')&&graphApp.includes('zhenti:')&&graphApp.includes('relax1000:'),'graph source registry missing');
assert(graphApp.includes("SOURCE_KEY='everflow-408-graph-source-v1'")&&graphApp.includes('data-graph-source-switch'),'graph source state/switch missing');
assert(graphApp.includes('overall-graph.js')&&graphApp.includes('relax1000-graph.js')&&graphApp.includes('graph-controls.js'),'graph app loading pipeline incomplete');
assert(graphApp.includes("url.searchParams.set('source',next)")&&graphApp.includes('location.assign'),'source changes must restart one clean graph instance');
assert(graphApp.includes("shell.dataset.fitLabel='适应屏幕'")&&graphApp.includes('fitCols')&&graphApp.includes('fitRows'),'graph fit metadata missing');
assert(graphControls.includes('matrixFits()')&&graphControls.includes('verifyFit(')&&graphControls.includes('scroll.clientHeight'),'full-screen fit verification missing');
assert(graphControls.includes('Math.max(2')&&graphControls.includes('data-row')&&graphControls.includes('data-col')&&graphControls.includes('moveTruePaper'),'shared fit/keyboard controller incomplete');
assert(graphControls.includes('keyboard-active')&&graphControls.includes('stopImmediatePropagation'),'keyboard feedback/isolation missing');
assert(graphControlsCss.includes('.overview-cell.current{transform:scale(')&&graphControlsCss.includes('.graph-source-inline')&&graphControlsCss.includes('.graph-fit-toggle'),'graph controls CSS incomplete');
assert(relaxGraph.includes("document.querySelector('[data-graph-shell]')")&&relaxGraph.includes("querySelector('[data-overview-matrix]')")&&relaxGraph.includes("querySelector('[data-question-drawer]')"),'Relax graph must reuse shared shell/matrix/drawer');
assert(!relaxGraph.includes("document.createElement('main')")&&!relaxGraph.includes('relax-overview-stage'),'Relax graph creates a second graph UI');
assert(relaxGraph.includes('const MAX_COLS=45')&&relaxGraph.includes('start+=MAX_COLS')&&relaxGraph.includes("shell.dataset.fitRows=String(rows.length+1)"),'Relax 45-column/full-height fit contract missing');

assert(builder.includes("QUOTA={ds:11,co:11,os:10,cn:8}"),'simulation quota invalid');
assert(paper.includes('data-source="zhenti"')&&paper.includes('data-source="relax"')&&paper.includes('data-mode="wrong"'),'paper source/mode architecture invalid');
assert(builder.includes('wrongPool()')&&builder.includes('questionState'),'paper wrong/state compatibility missing');
assert(runtime.includes("if(body.dataset.view==='zhenti')import(asset('/assets/js/question-bank-switch.js'))"),'runtime bank isolation missing');
assert(!/raw\.githubusercontent\.com|github\.com/i.test(zhentiMedia),'true-paper media runtime exposes external repository fallback');
assert(!/GitHub账号|使用 GitHub|提交到 GitHub|GitHub Pages/.test(admin),'admin UI exposes provider/account details');

assert(deploy.includes('jobs:')&&deploy.includes('quality:')&&deploy.includes('deploy:'),'deploy/quality separation missing');
assert(deploy.includes('Checkout question assets')&&deploy.includes('Build privacy-safe static artifact'),'deploy build pipeline missing');
assert(deploy.includes('actions/upload-pages-artifact@v4')&&deploy.includes('actions/deploy-pages@v4'),'Pages artifact/deploy actions missing');
assert(deploy.includes('cancel-in-progress: true'),'latest-only Pages concurrency missing');
assert(deploy.includes('rm -rf site/tools')&&deploy.includes('Privacy audit failed'),'privacy/development cleanup missing');

const manifest=JSON.parse(read(files.manifest));
const years=Object.keys(manifest.years||{}).sort();
assert(years.length===18&&years[0]==='2009'&&years.at(-1)==='2026','true-paper corpus must cover 2009-2026');
let verified=0,autoChoice=0;
for(const year of years){
  const data=JSON.parse(read(`site/data/zhenti/${year}.json`)),nums=manifest.years[year].verifiedQuestions||[];
  verified+=nums.length;
  for(const n of nums){const q=data.questions?.[String(n)];if(q?.verification?.status==='verified'&&q?.options&&/^[A-D]$/.test(String(q.answer||'')))autoChoice++}
}
assert(verified>=846,`verified corpus unexpectedly small: ${verified}`);
assert(autoChoice>=720,`auto-gradable corpus unexpectedly small: ${autoChoice}`);

const jsFiles=[files.entry,files.bankSwitcher,files.graphApp,files.graphControls,files.relaxCore,files.relaxWall,files.relaxGraph,files.builder,files.cards,files.reset,files.experience,files.zhentiMedia,files.runtime,files.nav];
for(const file of jsFiles){
  const tmp=path.join(os.tmpdir(),`everflow-audit-${path.basename(file,'.js')}.mjs`);
  fs.writeFileSync(tmp,read(file));
  const result=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
  fs.rmSync(tmp,{force:true});
  assert(result.status===0,`syntax check failed: ${file}\n${result.stderr||result.stdout}`);
}
console.log(`architecture audit OK: graph-app + graph-controls, ${years.length} years, ${verified} verified, ${autoChoice} auto-gradable`);
