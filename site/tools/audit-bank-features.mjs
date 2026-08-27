import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{spawnSync}from'node:child_process';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const files={
  nav:'site/assets/js/site-nav-v2.js',runtime:'site/assets/js/site-runtime-v2.js',entry:'site/assets/js/zhenti-entry.js',bankSwitcher:'site/assets/js/question-bank-switch.js',
  graph:'site/graph/index.html',graphApp:'site/assets/js/graph-app.js',graphControls:'site/assets/js/graph-controls.js',graphCss:'site/assets/css/graph.css',trueGraph:'site/assets/js/zhenti-graph.js',
  relaxCore:'site/assets/js/relax1000-core.js',relaxWall:'site/assets/js/relax1000-wall.js',relaxGraph:'site/assets/js/relax1000-graph.js',
  relaxReader:'site/assets/js/relax1000-reader.js',relaxReaderPage:'site/zhenti/relax-reader/index.html',relaxReaderNavCss:'site/assets/css/relax1000-reader-nav.css',
  builder:'site/assets/js/paper-builder.js',cards:'site/assets/js/relax1000-cards.js',reset:'site/assets/js/relax1000-reset.js',
  zhentiMedia:'site/assets/js/zhenti-media.js',paper:'site/relax/index.html',admin:'site/admin/index.html',manifest:'site/data/zhenti/manifest.json',deploy:'.github/workflows/deploy-pages-v2.yml'
};
for(const p of Object.values(files))assert(exists(p),`missing ${p}`);
for(const p of [
  'site/assets/js/relax1000-practice.js','site/assets/js/relax1000-cards-experience.js','site/assets/css/relax1000-overview.css','site/assets/js/graph-source-switch.js',
  'site/assets/js/overall-graph-fit.js','site/assets/js/overall-graph-keyboard.js','site/assets/css/overall-graph-fit.css',
  'site/assets/js/overall-graph.js','site/assets/css/overall-graph.css','site/assets/css/graph-controls.css'
])assert(!exists(p),`obsolete file must stay deleted: ${p}`);

const text=Object.fromEntries(Object.entries(files).map(([k,p])=>[k,read(p)]));
const{nav,runtime,entry,bankSwitcher,graph,graphApp,graphControls,graphCss,trueGraph,relaxCore,relaxWall,relaxGraph,relaxReader,relaxReaderPage,relaxReaderNavCss,builder,cards,reset,zhentiMedia,paper,admin,deploy}=text;

assert(nav.includes("label:'题库'")&&nav.includes("label:'组卷'")&&nav.includes("label:'整体图谱'"),'top nav IA incomplete');
assert(entry.includes("source==='zhenti'")&&entry.includes('zhenti-wall.js'),'true-paper selected-only boot missing');
assert(bankSwitcher.includes('408 真题')&&bankSwitcher.includes('Relax1000')&&!bankSwitcher.includes('relax1000-graph.js'),'bank switch architecture invalid');
assert(!bankSwitcher.includes('relax1000-cards-experience.js'),'broken Relax fullscreen module must stay retired');
assert(cards.includes('题库墙')&&cards.includes('速刷卡片'),'Relax cards subview missing');
for(const choice of ['answers','status','favorites','today','srs','all'])assert(reset.includes(`data-relax-reset-choice="${choice}"`),`Relax reset missing ${choice}`);
assert(relaxCore.includes("RELAX_ASSET_BASE='/data/relax1000'")&&relaxCore.includes('RELAX_STORAGE_KEYS'),'Relax core/data contract missing');
assert(!/EverflowCN|408-exercise-paper-generator|raw\.githubusercontent\.com/i.test(relaxCore),'Relax runtime leaks repository identity/address');
assert(relaxWall.includes('relax-wall-workspace')&&relaxWall.includes('relax-sidebar'),'Relax wall layout missing');
assert(relaxWall.includes('/zhenti/relax-reader/')&&!relaxWall.includes('relax-question-modal'),'Relax wall must route to isolated reader and must not recreate modal reader');
assert(relaxReaderPage.includes('relax1000-reader-nav.css')&&relaxReaderPage.includes('relax1000-reader.js'),'Relax standalone reader assets missing');
assert(relaxReader.includes('relax-reader-layout')&&relaxReader.includes('data-reader-jump')&&relaxReader.includes('refreshNavSelection'),'Relax reader lightweight navigation contract missing');
assert(relaxReader.includes("status==='mastered'")&&relaxReader.includes("status==='fuzzy'")&&relaxReader.includes("status==='weak'"),'Relax reader state mapping missing');
assert(!relaxReader.includes('relax-question-modal')&&!relaxReader.includes('backdrop-filter'),'Relax reader must remain independent document flow');
assert(relaxReaderNavCss.includes('.relax-reader-nav-item.is-mastered')&&relaxReaderNavCss.includes('.relax-reader-nav-item.is-fuzzy')&&relaxReaderNavCss.includes('.relax-reader-nav-item.is-weak'),'Relax reader heatmap state CSS missing');
assert(relaxReaderNavCss.includes('background:#e6f7ee')&&relaxReaderNavCss.includes('background:#fff4c9'),'Relax reader mastered/fuzzy colors must remain green/yellow');

assert(graph.includes('20260825-bank1')&&graph.includes('data-graph-source-host')&&graph.includes('data-graph-view-host'),'graph bank1 shell/build marker missing');
assert(graph.includes('graph-toolbar-primary')&&graph.includes('graph-toolbar-secondary')&&graph.includes('graph-status-legend'),'graph toolbar hierarchy missing');
assert(graph.includes('graph-app.js')&&graph.includes('graph.css')&&!graph.includes('overall-graph.css')&&!graph.includes('graph-controls.css'),'graph page must use one graph stylesheet');
assert(graphApp.includes("APP_VERSION='20260825-bank1'")&&graphApp.includes('const SOURCES=')&&graphApp.includes('zhenti:')&&graphApp.includes('relax1000:'),'graph source registry/version missing');
assert(graphApp.includes('zhenti-graph.js')&&!graphApp.includes('overall-graph.js'),'true graph adapter still uses obsolete name');
assert(graphApp.includes('data-graph-source-host')&&graphApp.includes("url.searchParams.set('source',next)")&&graphApp.includes('location.assign'),'graph source switch lifecycle incomplete');
assert(graphApp.includes('graph-controls.js'),'shared graph controls missing');
assert(graphControls.includes('graph-view-segmented')&&graphControls.includes("data-graph-view=\"fit\"")&&graphControls.includes("data-graph-view=\"native\""),'explicit fit/native view control missing');
assert(graphControls.includes('matrixFits()')&&graphControls.includes('verifyFit(')&&graphControls.includes('scroll.clientHeight'),'full matrix fit verification missing');
assert(graphControls.includes('Math.max(2')&&graphControls.includes('moveRelax')&&graphControls.includes('moveTruePaper'),'shared dense fit/keyboard navigation missing');
assert(graphControls.includes("event.key==='Enter'")&&graphControls.includes("event.key==='Escape'")&&graphControls.includes('keyboard-active'),'keyboard open/close/current feedback missing');
assert(graphCss.includes('.graph-toolbar-primary')&&graphCss.includes('.graph-toolbar-secondary')&&graphCss.includes('.graph-view-segmented'),'graph toolbar CSS missing');
assert(graphCss.includes('.question-drawer{position:absolute')&&!graphCss.includes('.overview-stage.drawer-open{grid-template-columns'),'drawer must overlay without old two-column layout');
assert(graphCss.includes('.overview-cell.current')&&graphCss.includes('graph-fit-dense'),'current-cell/dense fit styling missing');
assert(!trueGraph.includes("document.addEventListener('keydown'")&&!trueGraph.includes('openQuestion(initial.year,initial.q)'),'true graph adapter still owns global controls/initial drawer behavior');
assert(!/raw\.githubusercontent\.com/.test(trueGraph),'true graph exposes external media fallback');
assert(!trueGraph.includes('20260824-full4'),'true graph retains stale data cache tag');
assert(relaxGraph.includes("document.querySelector('[data-graph-shell]')")&&relaxGraph.includes("querySelector('[data-overview-matrix]')"),'Relax graph must reuse shared shell');
assert(!relaxGraph.includes("document.createElement('main')")&&!relaxGraph.includes('relax-overview-stage'),'Relax graph creates a second UI');
assert(relaxGraph.includes('const MAX_COLS=45')&&relaxGraph.includes('start+=MAX_COLS')&&relaxGraph.includes("shell.dataset.fitRows=String(rows.length+1)"),'Relax 45-column fit contract missing');
assert(!relaxGraph.includes('shell.dataset.graphKind')&&!relaxGraph.includes('shell.dataset.fitCols')&&!relaxGraph.includes('shell.dataset.fitKey'),'Relax adapter duplicates graph-app shell configuration');
assert(!relaxGraph.includes('适应宽度')&&!relaxGraph.includes('legacyCaption')&&!relaxGraph.includes('openQuestion(initial)'),'Relax adapter retains legacy control/caption/auto-open logic');

assert(builder.includes("QUOTA={ds:11,co:11,os:10,cn:8}"),'simulation quota invalid');
assert(paper.includes('data-source="zhenti"')&&paper.includes('data-source="relax"')&&paper.includes('data-mode="wrong"'),'paper source/mode architecture invalid');
assert(builder.includes('wrongPool()')&&builder.includes('questionState'),'paper wrong/state compatibility missing');
assert(runtime.includes("if(body.dataset.view==='zhenti')import(asset('/assets/js/question-bank-switch.js'))"),'runtime bank isolation missing');
assert(!/raw\.githubusercontent\.com|github\.com/i.test(zhentiMedia),'true-paper media runtime exposes external repository fallback');
assert(!/GitHub账号|使用 GitHub|提交到 GitHub|GitHub Pages/.test(admin),'admin UI exposes provider/account details');
assert(deploy.includes('quality:')&&deploy.includes('deploy:')&&deploy.includes('actions/upload-pages-artifact@v4')&&deploy.includes('actions/deploy-pages@v4'),'Pages quality/deploy pipeline incomplete');
assert(deploy.includes('site/assets/js/zhenti-graph.js')&&deploy.includes('site/assets/css/graph.css')&&/20260825-bank(?:1|2)/.test(deploy),'Pages must publish a compatible bank graph build');
assert(!deploy.includes("Path('site/assets/js/overall-graph.js')"),'deploy retains obsolete graph rewrite step');
assert(deploy.includes('cancel-in-progress: true')&&deploy.includes('Privacy audit failed'),'Pages concurrency/privacy gate missing');

const manifest=JSON.parse(read(files.manifest));
const years=Object.keys(manifest.years||{}).sort();
assert(years.length===18&&years[0]==='2009'&&years.at(-1)==='2026','true-paper corpus must cover 2009-2026');
let verified=0,autoChoice=0;
for(const year of years){const data=JSON.parse(read(`site/data/zhenti/${year}.json`)),nums=manifest.years[year].verifiedQuestions||[];verified+=nums.length;for(const n of nums){const q=data.questions?.[String(n)];if(q?.verification?.status==='verified'&&q?.options&&/^[A-D]$/.test(String(q.answer||'')))autoChoice++}}
assert(verified>=846,`verified corpus unexpectedly small: ${verified}`);
const autoFloor=Math.floor(verified*.70);
assert(autoChoice>=autoFloor,`auto-gradable corpus unexpectedly small: ${autoChoice}/${verified} (<70%)`);
for(const file of [files.entry,files.bankSwitcher,files.graphApp,files.graphControls,files.trueGraph,files.relaxCore,files.relaxWall,files.relaxReader,files.relaxGraph,files.builder,files.cards,files.reset,files.zhentiMedia,files.runtime,files.nav]){
  const tmp=path.join(os.tmpdir(),`everflow-audit-${path.basename(file,'.js')}.mjs`);
  fs.writeFileSync(tmp,read(file));
  const result=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
  fs.rmSync(tmp,{force:true});
  assert(result.status===0,`syntax check failed: ${file}\n${result.stderr||result.stdout}`);
}
console.log(`architecture audit OK: isolated Relax reader + lightweight heatmap nav; graph bank1 single CSS + shared controls; ${years.length} years, ${verified} verified, ${autoChoice} auto-gradable`);
