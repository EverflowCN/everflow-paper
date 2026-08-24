import{loadRelaxData,loadRecords,patchRecord,questionState,questionNumber,questionImages,explanationImages,optionEntries,assetUrl,esc,subjectName,idKey}from'./relax1000-core.js';

const sourceBar=document.querySelector('.bank-source-shell');
const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/relax1000-overview.css?v=20260824-relax-overview1';document.head.appendChild(css);

const root=document.createElement('main');
root.className='overview-stage relax-overview-stage';
root.dataset.relaxOverview='';
root.innerHTML=`
  <section class="overview-frame">
    <div class="overview-legend" aria-label="掌握状态">
      <span><i class="mastered"></i>熟悉</span>
      <span><i class="fuzzy"></i>模糊</span>
      <span><i class="weak"></i>不会</span>
      <span><i class="unmarked"></i>未做</span>
      <span class="relax-overview-caption">Relax1000 · 行=章节 · 列=章节内题序</span>
    </div>
    <div class="overview-scroll" data-relax-overview-scroll>
      <div class="overview-matrix" data-relax-overview-matrix role="grid" aria-label="Relax1000 整体图谱"></div>
    </div>
  </section>
  <aside class="question-drawer" data-relax-drawer hidden aria-label="Relax1000 题目预览">
    <header class="drawer-head">
      <div class="drawer-title"><strong data-relax-drawer-title>Relax1000</strong><span data-relax-drawer-meta></span></div>
      <button class="drawer-close ui-icon-only" type="button" data-relax-drawer-close aria-label="隐藏题目侧栏"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </header>
    <div class="drawer-body" data-relax-drawer-body><div class="drawer-loading">正在读取题目…</div></div>
    <footer class="drawer-footer">
      <div class="drawer-status" aria-label="掌握状态">
        <button type="button" data-relax-status="mastered">熟悉</button>
        <button type="button" data-relax-status="fuzzy">模糊</button>
        <button type="button" data-relax-status="weak">不会</button>
        <button type="button" data-relax-status="">清除</button>
      </div>
      <button class="drawer-answer" type="button" data-relax-answer hidden>查看答案</button>
    </footer>
  </aside>
  <button class="drawer-reopen" type="button" data-relax-reopen hidden aria-label="展开题目侧栏">题目</button>`;
(sourceBar||document.querySelector('header'))?.after(root);

const matrix=root.querySelector('[data-relax-overview-matrix]');
const scroll=root.querySelector('[data-relax-overview-scroll]');
const drawer=root.querySelector('[data-relax-drawer]');
const drawerBody=root.querySelector('[data-relax-drawer-body]');
const drawerTitle=root.querySelector('[data-relax-drawer-title]');
const drawerMeta=root.querySelector('[data-relax-drawer-meta]');
const drawerClose=root.querySelector('[data-relax-drawer-close]');
const drawerReopen=root.querySelector('[data-relax-reopen]');
const drawerAnswer=root.querySelector('[data-relax-answer]');
const drawerStatuses=[...root.querySelectorAll('[data-relax-status]')];

const CURRENT_KEY='everflow-408-relax-graph-current-v3';
const SUBJECT_SHORT={ds:'DS',co:'CO',os:'OS',cn:'CN'};
let data=null,rows=[],selected=null,current='',answerVisible=false;
try{current=localStorage.getItem(CURRENT_KEY)||''}catch{}

function recordState(question,records=loadRecords()){
  const state=questionState(question,records),rec=state.rec||{};
  let answer='unmarked';
  if(state.wrong||rec.correct===false)answer='wrong';
  else if(rec.correct===true||(state.seen&&!state.wrong))answer='correct';
  else if(rec.reviewed)answer='reviewed';
  else if(rec.draftAnswer)answer='draft';
  return{...state,rec,answer};
}
function cellClasses(question,records){
  const state=recordState(question,records),classes=['overview-cell',question.subjectId||'ds',state.answer];
  if(state.rec.status)classes.push(`status-${state.rec.status}`);
  if(state.favorite)classes.push('is-bookmarked');
  if(idKey(question)===current)classes.push('current');
  return classes.join(' ');
}
function statusText(state){if(state.rec.status==='mastered')return'熟悉';if(state.rec.status==='fuzzy')return'模糊';if(state.rec.status==='weak')return'不会';return'未标记'}
function answerText(state){if(state.answer==='correct')return'答对';if(state.answer==='wrong')return'答错';if(state.answer==='reviewed')return'已查看';if(state.answer==='draft')return'作答中';return'未作答'}
function buildRows(){
  rows=[];
  for(const subj of data.subjects){
    (subj.chapters||[]).forEach((chapter,index)=>{
      const questions=data.questions.filter(q=>q.subjectId===subj.id&&q.chapterId===chapter.id);
      rows.push({subjectId:subj.id,subject:subjectName(subj.id,subj.name),chapterId:chapter.id,chapter:chapter.name,index:index+1,code:`${SUBJECT_SHORT[subj.id]||String(subj.id).toUpperCase()}·${index+1}`,questions});
    });
  }
}
function indexCell(text,className,title=''){
  const cell=document.createElement('div');cell.className=`overview-index ${className}`;cell.textContent=text;if(title)cell.title=title;cell.setAttribute('aria-hidden','true');return cell;
}
function renderMatrix({focus=false}={}){
  if(!data)return;
  const records=loadRecords(),maxCols=Math.max(1,...rows.map(row=>row.questions.length));
  matrix.style.gridTemplateColumns=`var(--year-col) repeat(${maxCols},var(--cell-size))`;
  const fragment=document.createDocumentFragment();
  fragment.appendChild(indexCell('','overview-corner'));
  for(let col=1;col<=maxCols;col++)fragment.appendChild(indexCell(String(col),'overview-q'));
  rows.forEach((row,rowIndex)=>{
    fragment.appendChild(indexCell(row.code,'overview-year relax-overview-row-label',`${row.subject} · ${row.chapter}`));
    for(let col=0;col<maxCols;col++){
      const question=row.questions[col];
      if(!question){const blank=document.createElement('div');blank.className='relax-overview-empty';blank.setAttribute('aria-hidden','true');fragment.appendChild(blank);continue}
      const state=recordState(question,records),button=document.createElement('button'),original=questionNumber(question,col);
      button.type='button';button.className=cellClasses(question,records);button.dataset.relaxId=idKey(question);button.dataset.row=String(rowIndex);button.dataset.col=String(col);button.setAttribute('role','gridcell');
      button.setAttribute('aria-label',`${row.subject}，${row.chapter}，第${original}题，${statusText(state)}，${answerText(state)}`);
      button.title=`${row.subject} · ${row.chapter} · 原册第 ${original} 题 · ${statusText(state)} · ${answerText(state)}`;
      button.addEventListener('click',()=>openQuestion(question));fragment.appendChild(button);
    }
  });
  matrix.replaceChildren(fragment);
  if(focus&&current)requestAnimationFrame(()=>matrix.querySelector(`[data-relax-id="${CSS.escape(current)}"]`)?.scrollIntoView({block:'nearest',inline:'center',behavior:'auto'}));
}
function selectCurrent(question){
  const id=idKey(question);if(current&&current!==id)matrix.querySelector(`[data-relax-id="${CSS.escape(current)}"]`)?.classList.remove('current');current=id;matrix.querySelector(`[data-relax-id="${CSS.escape(id)}"]`)?.classList.add('current');try{localStorage.setItem(CURRENT_KEY,id)}catch{}
}
function figureMarkup(src,index,label){const url=assetUrl(src);return url?`<figure class="drawer-figure"><a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(label)} ${index+1}" loading="lazy" decoding="async" draggable="false"></a></figure>`:''}
function drawerMarkup(question){
  const images=questionImages(question),analysisImages=explanationImages(question),entries=optionEntries(question),state=recordState(question);
  const figures=images.length?`<div class="drawer-figures">${images.map((src,i)=>figureMarkup(src,i,'原题截图')).join('')}</div>`:'';
  const options=entries.length?`<div class="drawer-options">${entries.map(item=>`<div class="drawer-option ${answerVisible&&String(item.key)===String(question.answer)?'relax-drawer-correct':''}"><b>${esc(item.key)}.</b><div>${esc(item.text)}</div></div>`).join('')}</div>`:'';
  const answer=answerVisible?`<div class="drawer-answer-box"><strong>参考答案：${esc(question.answer||'')}</strong>${analysisImages.length?`<div class="drawer-figures">${analysisImages.map((src,i)=>figureMarkup(src,i,'解析截图')).join('')}</div>`:`<p>${esc(question.explanation||'暂无文字解析')}</p>`}</div>`:'';
  const favorite=state.favorite?' · ★ 已收藏':'';
  return `<p class="drawer-stem">${esc(question.stem||'题干以原题截图为准')}</p>${figures}${options}${answer}<p class="drawer-subnote">Relax1000 原册题号：${esc(questionNumber(question))}${favorite}</p>`;
}
function syncDrawer(){
  if(!selected)return;const state=recordState(selected);drawerStatuses.forEach(button=>button.classList.toggle('active',button.dataset.relaxStatus===(state.rec.status||'')));drawerAnswer.textContent=answerVisible?'收起答案':'查看答案';
}
function showDrawer(){drawer.hidden=false;drawerReopen.hidden=true;root.classList.add('drawer-open')}
function hideDrawer(){drawer.hidden=true;root.classList.remove('drawer-open');drawerReopen.hidden=!selected}
function openQuestion(question){
  selected=question;answerVisible=false;selectCurrent(question);showDrawer();
  const row=rows.find(item=>item.chapterId===question.chapterId&&item.subjectId===question.subjectId);
  drawerTitle.textContent=`${row?.code||SUBJECT_SHORT[question.subjectId]||'408'} · 第 ${questionNumber(question)} 题`;
  drawerMeta.textContent=`${subjectName(question.subjectId,question.subject)} · ${question.chapter||row?.chapter||''}`;
  drawerBody.innerHTML=drawerMarkup(question);drawerAnswer.hidden=false;syncDrawer();
}
function refreshSelected(){if(!selected)return;drawerBody.innerHTML=drawerMarkup(selected);syncDrawer()}
function stepBy(deltaRow,deltaCol){
  if(!selected)return false;const cell=matrix.querySelector(`[data-relax-id="${CSS.escape(idKey(selected))}"]`);if(!cell)return false;
  let rowIndex=Number(cell.dataset.row),colIndex=Number(cell.dataset.col);rowIndex=Math.max(0,Math.min(rows.length-1,rowIndex+deltaRow));colIndex=Math.max(0,colIndex+deltaCol);
  if(deltaRow!==0)colIndex=Math.min(colIndex,Math.max(0,rows[rowIndex].questions.length-1));
  else colIndex=Math.min(colIndex,Math.max(0,rows[rowIndex].questions.length-1));
  const target=rows[rowIndex].questions[colIndex];if(!target||idKey(target)===idKey(selected))return false;openQuestion(target);requestAnimationFrame(()=>matrix.querySelector(`[data-relax-id="${CSS.escape(idKey(target))}"]`)?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'}));return true;
}

drawerClose.addEventListener('click',hideDrawer);drawerReopen.addEventListener('click',()=>{if(selected){showDrawer();refreshSelected()}});
drawerAnswer.addEventListener('click',()=>{if(!selected)return;answerVisible=!answerVisible;if(answerVisible)patchRecord(selected.id,{reviewed:true});refreshSelected();renderMatrix()});
drawerStatuses.forEach(button=>button.addEventListener('click',()=>{if(!selected)return;patchRecord(selected.id,{status:button.dataset.relaxStatus||undefined});renderMatrix();refreshSelected()}));
document.addEventListener('everflow:relax-records-change',()=>{renderMatrix();if(selected)syncDrawer()});
document.addEventListener('keydown',event=>{
  if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  if(event.key==='Escape'&&!drawer.hidden){event.preventDefault();event.stopImmediatePropagation();hideDrawer();return}
  const map={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]};const move=map[event.key];if(!move)return;
  if(stepBy(move[0],move[1])){event.preventDefault();event.stopImmediatePropagation()}
},true);
window.addEventListener('storage',event=>{if([CURRENT_KEY,'everflow-408-relax1000-records-v1','relax-seen','relax-mistakes','relax-bookmarks'].includes(event.key)){renderMatrix();if(selected)refreshSelected()}});

loadRelaxData().then(result=>{
  data=result;buildRows();
  if(!data.questions.some(q=>idKey(q)===current))current=idKey(data.questions[0]);
  renderMatrix({focus:true});
  const initial=data.questions.find(q=>idKey(q)===current)||data.questions[0];if(initial)openQuestion(initial);
}).catch(error=>{
  console.error(error);root.className='relax-bank-root relax-load-error';root.innerHTML=`<section class="relax-load-error"><strong>Relax1000 图谱载入失败</strong><p>${esc(error.message||error)}</p><button onclick="location.reload()">重新载入</button></section>`;
});
