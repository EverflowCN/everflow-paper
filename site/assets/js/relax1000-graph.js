import{loadRelaxData,loadRecords,patchRecord,questionState,questionNumber,questionImages,explanationImages,optionEntries,assetUrl,esc,subjectName,idKey}from'./relax1000-core.js';

const shell=document.querySelector('[data-graph-shell]');
const matrix=shell?.querySelector('[data-overview-matrix]');
const drawer=shell?.querySelector('[data-question-drawer]');
const drawerBody=shell?.querySelector('[data-drawer-body]');
const drawerTitle=shell?.querySelector('[data-drawer-title]');
const drawerMeta=shell?.querySelector('[data-drawer-meta]');
const drawerClose=shell?.querySelector('[data-drawer-close]');
const drawerReopen=shell?.querySelector('[data-drawer-reopen]');
const drawerAnswer=shell?.querySelector('[data-drawer-answer]');
const drawerStatuses=shell?[...shell.querySelectorAll('[data-drawer-status]')]:[];
if(!shell||!matrix||!drawer||!drawerBody||!drawerTitle||!drawerMeta||!drawerAnswer)throw new Error('shared graph shell missing');

const CURRENT_KEY='everflow-408-relax-graph-current-v4';
const MAX_COLS=45;
const SUBJECT_SHORT={ds:'DS',co:'CO',os:'OS',cn:'CN'};
let data=null,rows=[],selected=null,current='',answerVisible=false;
try{current=localStorage.getItem(CURRENT_KEY)||''}catch{}

shell.dataset.graphKind='relax1000';
shell.dataset.fitCols=String(MAX_COLS);
shell.dataset.fitKey='everflow-408-relax-graph-fit-v2';
matrix.setAttribute('aria-label','Relax1000 整体图谱');

function recordState(question,records=loadRecords()){
  const state=questionState(question,records),rec=state.rec||{};
  let answer='unmarked';
  if(state.wrong||rec.correct===false)answer='wrong';
  else if(rec.correct===true||(state.seen&&!state.wrong))answer='correct';
  else if(rec.reviewed)answer='reviewed';
  else if(rec.draftAnswer)answer='draft';
  return{...state,rec,answer};
}
function statusText(state){if(state.rec.status==='mastered')return'熟悉';if(state.rec.status==='fuzzy')return'模糊';if(state.rec.status==='weak')return'不会';return'未标记'}
function answerText(state){if(state.answer==='correct')return'答对';if(state.answer==='wrong')return'答错';if(state.answer==='reviewed')return'已查看';if(state.answer==='draft')return'作答中';return'未作答'}
function cellClasses(question,records){
  const state=recordState(question,records),classes=['overview-cell',question.subjectId||'ds',state.answer];
  if(state.rec.status)classes.push(`status-${state.rec.status}`);
  if(state.favorite)classes.push('is-bookmarked');
  if(idKey(question)===current)classes.push('current');
  return classes.join(' ');
}
function buildRows(){
  rows=[];
  for(const subj of data.subjects||[]){
    (subj.chapters||[]).forEach((chapter,index)=>{
      const questions=data.questions.filter(q=>q.subjectId===subj.id&&q.chapterId===chapter.id);
      const chunks=[];
      for(let start=0;start<questions.length;start+=MAX_COLS)chunks.push(questions.slice(start,start+MAX_COLS));
      (chunks.length?chunks:[[]]).forEach((chunk,chunkIndex)=>{
        const base=`${SUBJECT_SHORT[subj.id]||String(subj.id).toUpperCase()}·${index+1}`;
        rows.push({subjectId:subj.id,subject:subjectName(subj.id,subj.name),chapterId:chapter.id,chapter:chapter.name,chunkIndex,code:chunks.length>1?`${base}-${chunkIndex+1}`:base,questions:chunk});
      });
    });
  }
  shell.dataset.fitRows=String(rows.length+1);
}
function indexCell(text,className,title=''){
  const cell=document.createElement('div');cell.className=`overview-index ${className}`;cell.textContent=text;if(title)cell.title=title;cell.setAttribute('aria-hidden','true');return cell;
}
function renderMatrix({focus=false}={}){
  const records=loadRecords();
  matrix.style.gridTemplateColumns=`var(--year-col) repeat(${MAX_COLS},var(--cell-size))`;
  const fragment=document.createDocumentFragment();
  fragment.appendChild(indexCell('','overview-corner'));
  for(let col=1;col<=MAX_COLS;col++)fragment.appendChild(indexCell(String(col),'overview-q'));
  rows.forEach((row,rowIndex)=>{
    const start=row.chunkIndex*MAX_COLS+1,end=start+Math.max(0,row.questions.length-1);
    fragment.appendChild(indexCell(row.code,'overview-year',`${row.subject} · ${row.chapter}${row.chunkIndex?` · 第 ${start}—${end} 格`:''}`));
    for(let col=0;col<MAX_COLS;col++){
      const question=row.questions[col];
      if(!question){const blank=document.createElement('div');blank.className='overview-blank';blank.setAttribute('aria-hidden','true');fragment.appendChild(blank);continue}
      const state=recordState(question,records),button=document.createElement('button'),number=questionNumber(question,col);
      button.type='button';button.className=cellClasses(question,records);button.dataset.key=`relax:${idKey(question)}`;button.dataset.row=String(rowIndex);button.dataset.col=String(col);button.dataset.relaxId=idKey(question);button.setAttribute('role','gridcell');
      button.setAttribute('aria-label',`${row.subject}，${row.chapter}，第${number}题，${statusText(state)}，${answerText(state)}`);
      button.title=`${row.subject} · ${row.chapter} · 第 ${number} 题 · ${statusText(state)} · ${answerText(state)}`;
      button.addEventListener('click',()=>openQuestion(question));fragment.appendChild(button);
    }
  });
  matrix.replaceChildren(fragment);
  document.dispatchEvent(new CustomEvent('everflow:graph-matrix-ready',{detail:{source:'relax1000',cols:MAX_COLS,rows:rows.length+1}}));
  if(focus&&current)requestAnimationFrame(()=>matrix.querySelector(`[data-relax-id="${CSS.escape(current)}"]`)?.scrollIntoView({block:'nearest',inline:'center',behavior:'auto'}));
}
function selectCurrent(question){
  const id=idKey(question);
  if(current&&current!==id)matrix.querySelector(`[data-relax-id="${CSS.escape(current)}"]`)?.classList.remove('current');
  current=id;matrix.querySelector(`[data-relax-id="${CSS.escape(id)}"]`)?.classList.add('current');
  try{localStorage.setItem(CURRENT_KEY,id)}catch{}
}
function figureMarkup(src,index,label){const url=assetUrl(src);return url?`<figure class="drawer-figure"><img src="${esc(url)}" alt="${esc(label)} ${index+1}" loading="lazy" decoding="async" draggable="false"></figure>`:''}
function drawerMarkup(question){
  const images=questionImages(question),analysisImages=explanationImages(question),entries=optionEntries(question),state=recordState(question);
  const figures=images.length?`<div class="drawer-figures">${images.map((src,i)=>figureMarkup(src,i,'原题截图')).join('')}</div>`:'';
  const options=entries.length?`<div class="drawer-options">${entries.map(item=>`<div class="drawer-option ${answerVisible&&String(item.key)===String(question.answer)?'is-answer':''}"><b>${esc(item.key)}.</b><div>${esc(item.text)}</div></div>`).join('')}</div>`:(images.length?`<div class="drawer-options">${'ABCD'.split('').map(key=>`<div class="drawer-option ${answerVisible&&key===String(question.answer)?'is-answer':''}"><b>${key}.</b><div>以原题截图中的选项为准</div></div>`).join('')}</div>`:'');
  const answer=answerVisible?`<div class="drawer-answer-box"><strong>参考答案：${esc(question.answer||'')}</strong>${analysisImages.length?`<div class="drawer-figures">${analysisImages.map((src,i)=>figureMarkup(src,i,'解析截图')).join('')}</div>`:`<p>${esc(question.explanation||'暂无文字解析')}</p>`}</div>`:'';
  return `<p class="drawer-stem">${esc(question.stem||'题干以原题截图为准')}</p>${figures}${options}${answer}${state.favorite?'<p class="drawer-subnote">★ 已收藏</p>':''}`;
}
function syncDrawer(){
  if(!selected)return;
  const state=recordState(selected);
  drawerStatuses.forEach(button=>button.classList.toggle('active',button.dataset.drawerStatus===(state.rec.status||'')));
  drawerAnswer.textContent=answerVisible?'收起答案':'查看答案';
}
function showDrawer(){drawer.hidden=false;if(drawerReopen)drawerReopen.hidden=true;shell.classList.add('drawer-open')}
function hideDrawer(){drawer.hidden=true;shell.classList.remove('drawer-open');if(drawerReopen)drawerReopen.hidden=!selected}
function openQuestion(question){
  selected=question;answerVisible=false;selectCurrent(question);showDrawer();
  const row=rows.find(item=>item.questions.some(q=>idKey(q)===idKey(question)));
  drawerTitle.textContent=`${row?.code||SUBJECT_SHORT[question.subjectId]||'408'} · 第 ${questionNumber(question)} 题`;
  drawerMeta.textContent=`${subjectName(question.subjectId,question.subject)} · ${question.chapter||row?.chapter||''}`;
  drawerBody.innerHTML=drawerMarkup(question);drawerAnswer.hidden=false;syncDrawer();
}
function refreshSelected(){if(!selected)return;drawerBody.innerHTML=drawerMarkup(selected);syncDrawer()}

drawerClose?.addEventListener('click',hideDrawer);
drawerReopen?.addEventListener('click',()=>{if(selected){showDrawer();refreshSelected()}});
drawerAnswer.addEventListener('click',()=>{if(!selected)return;answerVisible=!answerVisible;if(answerVisible)patchRecord(selected.id,{reviewed:true});refreshSelected();renderMatrix()});
drawerStatuses.forEach(button=>button.addEventListener('click',()=>{if(!selected)return;patchRecord(selected.id,{status:button.dataset.drawerStatus||undefined});renderMatrix();refreshSelected()}));
document.addEventListener('everflow:relax-records-change',()=>{renderMatrix();if(selected)syncDrawer()});
window.addEventListener('storage',event=>{if([CURRENT_KEY,'everflow-408-relax1000-records-v1','relax-seen','relax-mistakes','relax-bookmarks'].includes(event.key)){renderMatrix();if(selected)refreshSelected()}});

data=await loadRelaxData();
buildRows();
if(!data.questions.some(q=>idKey(q)===current))current=idKey(data.questions[0]);
renderMatrix({focus:true});
