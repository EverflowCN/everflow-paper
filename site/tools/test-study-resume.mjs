import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/js/study-resume-v1.js',import.meta.url),'utf8');
const data=new Map();
const documentElements={
  entries:{innerHTML:''},
  button:{hidden:true,href:'',setAttribute(){}},
  status:{textContent:''}
};
const document={
  querySelector(selector){return {
    '[data-recent-entries]':documentElements.entries,
    '[data-recent-primary]':documentElements.button,
    '[data-recent-status]':documentElements.status
  }[selector]||null},
  addEventListener(){},
  dispatchEvent(){}
};
const localStorage={getItem(key){return data.get(key)||null},setItem(key,value){data.set(key,value)},removeItem(key){data.delete(key)}};
const age=milliseconds=>new Date(Date.now()-milliseconds).toISOString();
const window={
  EveraStore:{listCourseStates:async()=>[
    {id:'not-listed',updatedAt:age(10000)},
    {id:'unit-4',updatedAt:age(40000)}
  ]},
  EveraCourseCatalog:{load:async()=>({
    catalogs:[{id:'course-os',title:'操作系统强化'}],
    itemMap:new Map([['course-os',[{progress_id:'unit-4',title:'进程调度'}]]])
  })}
};
const context={window,document,localStorage,location:{origin:'https://evera.top'},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
  URL,Date,console,addEventListener(){},requestAnimationFrame:fn=>fn(),
  setTimeout,clearTimeout};
vm.runInNewContext(source,context,{filename:'study-resume-v1.js'});
const resume=window.EveraStudyRecent;
assert.equal(typeof resume?.mark,'function');

localStorage.setItem('everflow-408-zhenti-wall-v1',JSON.stringify({
  '2024-33':{answer:'B',updatedAt:age(90000)}
}));
localStorage.setItem('everflow-408-relax1000-records-v1',JSON.stringify({
  'os-2-82':{answer:'B',updatedAt:age(110000)}
}));
resume.mark('zhenti',{id:'2024-33',title:'真题',detail:'第33题',href:resume.zhentiHref(2024,33)});
resume.mark('relax',{id:'os-2-82',title:'Relax1000',detail:'第82题',href:resume.relaxHref('os-2-82')});
assert.equal(resume.read().zhenti.id,'2024-33');
assert.equal(resume.read().relax.id,'os-2-82');
resume.mark('relax',{id:'not-valid',href:'https://unknown.example/'});
assert.equal(resume.read().relax.id,'os-2-82');
await resume.refresh();
assert.match(documentElements.entries.innerHTML,/进程调度/);
assert.match(documentElements.entries.innerHTML,/第33题/);
assert.match(documentElements.entries.innerHTML,/第82题/);
assert.match(documentElements.entries.innerHTML,/\/408\/\?course=course-os&amp;item=unit-4/);
assert.equal(documentElements.button.hidden,false);

localStorage.setItem('everflow-408-question-cloud-user-v1','another-account');
assert.deepEqual(Object.keys(resume.read()),[],'account-specific navigation markers must not leak');

localStorage.removeItem('everflow-408-question-cloud-user-v1');
localStorage.removeItem('everflow-study-resume-v1');
localStorage.removeItem('everflow-408-zhenti-wall-v1');
localStorage.removeItem('everflow-408-relax1000-records-v1');
window.EveraStore.listCourseStates=async()=>[];
await resume.refresh();
assert.match(documentElements.entries.innerHTML,/还没有真题做题记录/);
assert.equal(documentElements.button.hidden,true);

console.log('Study resume regression checks passed.');
