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
  bankSwitcher:'site/assets/js/question-bank-switch.js',graphSwitcher:'site/assets/js/graph-source-switch.js',
  graphFit:'site/assets/js/overall-graph-fit.js',graphKeyboard:'site/assets/js/overall-graph-keyboard.js',
  relaxCore:'site/assets/js/relax1000-core.js',relaxWall:'site/assets/js/relax1000-wall.js',relaxGraph:'site/assets/js/relax1000-graph.js',
  builder:'site/assets/js/paper-builder.js',cards:'site/assets/js/relax1000-cards.js',reset:'site/assets/js/relax1000-reset.js',experience:'site/assets/js/relax1000-cards-experience.js',
  zhentiMedia:'site/assets/js/zhenti-media.js',controls:'site/assets/css/relax1000-controls.css',interaction:'site/assets/css/interaction-guard.css',
  bank:'site/zhenti/index.html',graph:'site/graph/index.html',paper:'site/relax/index.html',admin:'site/admin/index.html',
  manifest:'site/data/zhenti/manifest.json',deploy:'.github/workflows/deploy-pages-v2.yml'
};
for(const p of Object.values(files))assert(exists(p),`missing ${p}`);
assert(!exists('site/assets/js/relax1000-practice.js'),'obsolete relax1000-practice.js must stay deleted');
assert(!exists('site/assets/css/relax1000-overview.css'),'obsolete Relax-specific graph stylesheet must stay deleted');

const text=Object.fromEntries(Object.entries(files).map(([key,p])=>[key,read(p)]));
const{nav,runtime,entry,bankSwitcher,graphSwitcher,graphFit,graphKeyboard,relaxCore,relaxWall,relaxGraph,builder,cards,reset,experience,zhentiMedia,controls,interaction,bank,graph,paper,admin,deploy}=text;

assert(nav.includes("label:'题库'")&&nav.includes("label:'组卷'")&&nav.includes("label:'整体图谱'"),'top nav IA incomplete');
assert(!nav.includes("label:'真题墙'"),'top nav still exposes 真题墙');
assert(nav.includes("{href:'/zhenti/',label:'题库',match:p=>p.startsWith('/zhenti/')"),'题库 nav route mismatch');
assert(nav.includes("{href:'/relax/',label:'组卷',match:p=>p.startsWith('/relax/')"),'组卷 must be independent');
assert(nav.includes('interaction-guard.css'),'site-wide interaction guard not loaded');
assert(nav.includes('everaActionAt')&&nav.includes('stopImmediatePropagation'),'rapid duplicate action guard missing');
assert(nav.includes('topLayerOpen')&&nav.includes('dismissMenu'),'mobile menu/top-layer exclusion missing');

assert(bank.includes('<title>题库 · Everflow</title>'),'bank document title not updated');
assert(bank.includes('zhenti-entry.js'),'bank must boot through selected-only entry');
assert(!bank.includes('<script src="../assets/js/zhenti-wall.js')&&!bank.includes('<script src="../assets/js/zhenti-data-overlay.js')&&!bank.includes('<script src="../assets/js/site-runtime-v2.js'),'bank still statically double-boots scripts');
assert(entry.includes("source==='zhenti'")&&entry.indexOf('zhenti-wall.js')<entry.indexOf('site-runtime-v2.js'),'true bank base must initialize before runtime enhancements');
assert(entry.includes('site-runtime-v2.js')&&entry.includes('zhenti-deeplink.js'),'bank entry missing runtime/deeplink');
assert(bankSwitcher.includes('408 真题')&&bankSwitcher.includes('Relax1000'),'bank switch must contain both banks');
assert(!bankSwitcher.includes('data-bank-practice')&&!bankSwitcher.includes('>组卷</button>'),'bank switch must not contain paper builder');
assert(bankSwitcher.includes('relax1000-wall.js')&&!bankSwitcher.includes('relax1000-graph.js'),'Relax bank must use wall, not graph');
assert(bankSwitcher.includes('relax1000-cards.js')&&bankSwitcher.includes('relax1000-reset.js')&&bankSwitcher.includes('relax1000-cards-experience.js'),'Relax bank enhancements missing');
assert(bankSwitcher.indexOf('relax1000-reset.js')<bankSwitcher.indexOf('relax1000-cards-experience.js'),'reset must mount before fullscreen controls');
assert(relaxWall.includes('relax-wall-workspace')&&relaxWall.includes('relax-sidebar'),'Relax wall layout missing');
assert(relaxWall.includes("classList.add('evera-modal-open')")&&relaxWall.includes('stopImmediatePropagation'),'Relax modal isolation missing');
assert(relaxWall.includes('focusSearch'),'Relax search focus preservation missing');
assert(cards.includes('题库墙')&&cards.includes('速刷卡片'),'Relax wall/cards subview missing');
assert(cards.includes("SRS_KEY='everflow-408-relax-srs-v1'"),'Relax SRS state missing');

assert(relaxCore.includes("RELAX_ASSET_BASE='/data/relax1000'"),'Relax data must be same-origin');
assert(!/github\.com|raw\.githubusercontent\.com|EverflowCN|408-exercise-paper-generator/i.test(relaxCore),'Relax runtime leaks repository/source address');
assert(relaxCore.includes('RELAX_STORAGE_KEYS'),'central Relax storage map missing');
for(const choice of ['answers','status','favorites','today','srs','all'])assert(reset.includes(`data-relax-reset-choice="${choice}"`),`Relax reset missing ${choice}`);
assert(experience.includes('⛶ 畅享全屏'),'Relax immersive fullscreen button missing');
assert(experience.includes('requestFullscreen')&&experience.includes('relax-cards-immersive-fallback'),'fullscreen native/fallback support missing');
assert(experience.includes("event.shiftKey&&String(event.key).toUpperCase()==='F'"),'Relax fullscreen shortcut must match true-paper Shift+F');
assert(experience.includes('insertBefore(trigger,resetTrigger)'),'Relax fullscreen/reset control order mismatch');
assert(controls.includes('evera-modal-open')&&controls.includes('evera-immersive-open'),'Relax overlay scroll locks missing');
assert(controls.includes('--z-dialog')&&controls.includes('--z-immersive'),'Relax overlay z-index contract missing');
assert(interaction.includes('--z-modal')&&interaction.includes('--z-toast')&&interaction.includes('button:disabled'),'shared overlay/button guardrails missing');
assert(interaction.includes(':has(.question-modal:not([hidden]))')&&interaction.includes(':has(.paper-session:not([hidden]))'),'true-paper background lock missing');

assert(graphSwitcher.includes("KEY='everflow-408-graph-source-v1'"),'graph must use independent source state');
assert(graphSwitcher.includes('loadTrueGraph')&&graphSwitcher.includes('loadRelaxGraph'),'graph selected-only boot missing');
assert(graphSwitcher.includes('overall-graph.js')&&graphSwitcher.includes('relax1000-graph.js'),'graph implementations missing');
assert(graphSwitcher.includes('overall-graph-keyboard.js')&&graphSwitcher.includes('overall-graph-fit.js'),'shared graph controls must load for both sources');
assert(graphSwitcher.includes('resetSharedStage')&&graphSwitcher.includes('syncViewport'),'shared graph shell reset/viewport guard missing');
assert(!graphSwitcher.includes('original.hidden=true'),'graph switch must not hide one graph under a second graph instance');
assert(graph.includes('graph-source-switch.js'),'graph page must load graph source switcher');
assert(!graph.includes('<script src="../assets/js/overall-graph.js')&&!graph.includes('<script src="../assets/js/zhenti-data-overlay.js'),'graph page still double-boots hidden implementation');
assert(relaxGraph.includes("document.querySelector('[data-graph-shell]')"),'Relax graph must reuse the true-paper graph shell');
assert(relaxGraph.includes("querySelector('[data-overview-matrix]')")&&relaxGraph.includes("querySelector('[data-question-drawer]')"),'Relax graph must reuse shared matrix and drawer');
assert(!relaxGraph.includes("document.createElement('main')")&&!relaxGraph.includes('relax-overview-stage'),'Relax graph must not create a second graph stage');
assert(relaxGraph.includes('const MAX_COLS=45')&&relaxGraph.includes('start+=MAX_COLS'),'Relax graph must split rows at 45 cells');
assert(relaxGraph.includes("shell.dataset.fitCols=String(MAX_COLS)")&&relaxGraph.includes("shell.dataset.fitRows=String(rows.length+1)"),'Relax graph must delegate 45-column fit dimensions to shared fitter');
assert(graphFit.includes("shell.dataset.fitCols")&&graphFit.includes("shell.dataset.fitRows")&&graphFit.includes("shell.dataset.fitLabel"),'shared fit module must be data-driven');
assert(graphKeyboard.includes("data-row")&&graphKeyboard.includes("data-col"),'shared keyboard must support Relax matrix coordinates');

assert(builder.includes("QUOTA={ds:11,co:11,os:10,cn:8}"),'408 simulation quota is not 11/11/10/8');
assert(paper.includes('data-source="zhenti"')&&paper.includes('data-source="relax"'),'paper sources missing');
assert(paper.includes('data-mode="wrong"')&&builder.includes('wrongPool()'),'cross-bank wrong-paper mode missing');
assert(builder.includes('questionState'),'Relax state compatibility missing');
assert(paper.includes('<title>组卷 · Everflow</title>'),'group-paper title missing');
assert(!paper.includes('11 / 12 / 10 / 7'),'legacy wrong 408 quota visible');
assert(runtime.includes("if(body.dataset.view==='zhenti')import(asset('/assets/js/question-bank-switch.js'))"),'runtime must load bank switch only on /zhenti/');
assert(!/raw\.githubusercontent\.com|github\.com/i.test(zhentiMedia),'true-paper media runtime exposes external repository fallback');

const privateFrontend=[bankSwitcher,graphSwitcher,relaxCore,relaxWall,relaxGraph,paper,admin,zhentiMedia,experience,cards,entry];
for(const source of privateFrontend){assert(!/EverflowCN|408-exercise-paper-generator/i.test(source),'frontend leaks private repository identity/address');assert(!/1576/.test(source),'frontend leaks exact Relax corpus count')}
assert(!/GitHub账号|使用 GitHub|提交到 GitHub|GitHub Pages/.test(admin),'admin UI exposes provider/account details');

assert(deploy.includes('Checkout question assets'),'deploy must vendor Relax assets server-side');
assert(deploy.includes('Build privacy-safe static artifact'),'deploy privacy build missing');
assert(deploy.includes('site/data/relax1000'),'same-origin Relax artifact missing');
assert(deploy.includes('Privacy audit failed'),'deploy privacy gate missing');
assert(deploy.includes('rm -rf site/tools'),'development tools must not ship publicly');
assert(deploy.includes("data.pop('policy',None)")&&deploy.includes("p.unlink()"),'public source/audit metadata scrubbing missing');

const manifest=JSON.parse(read(files.manifest));
const years=Object.keys(manifest.years||{}).sort();
assert(years.length===18&&years[0]==='2009'&&years.at(-1)==='2026','true-paper manifest must cover 2009-2026');
let verified=0,autoChoice=0;
for(const year of years){
  const meta=manifest.years[year],paperPath=path.join(root,`site/data/zhenti/${year}.json`);assert(exists(`site/data/zhenti/${year}.json`),`missing ${year}.json`);
  const data=JSON.parse(fs.readFileSync(paperPath,'utf8')),nums=meta.verifiedQuestions||[];verified+=nums.length;
  for(const n of nums){const q=data.questions?.[String(n)];if(q?.verification?.status==='verified'&&q?.options&&/^[A-D]$/.test(String(q.answer||'')))autoChoice++}
}
assert(verified>=846,`verified true-paper corpus unexpectedly small: ${verified}`);assert(autoChoice>=720,`auto-gradable true-paper choice pool unexpectedly small: ${autoChoice}`);

const jsFiles=[files.entry,files.bankSwitcher,files.graphSwitcher,files.graphFit,files.graphKeyboard,files.relaxCore,files.relaxWall,files.relaxGraph,files.builder,files.cards,files.reset,files.experience,files.zhentiMedia,files.runtime,files.nav];
for(const file of jsFiles){const tmp=path.join(os.tmpdir(),`everflow-audit-${path.basename(file,'.js')}.mjs`);fs.writeFileSync(tmp,read(file));const result=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});fs.rmSync(tmp,{force:true});assert(result.status===0,`syntax check failed: ${file}\n${result.stderr||result.stdout}`)}
console.log(`privacy/interaction/unified-graph audit OK: ${years.length} years, ${verified} verified, ${autoChoice} auto-gradable; Relax reuses true-paper graph shell`);
