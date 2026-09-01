import fs from'node:fs';
import vm from'node:vm';
import assert from'node:assert/strict';

class StorageMock{constructor(){this.map=new Map()}getItem(k){return this.map.has(k)?this.map.get(k):null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}}
const localStorage=new StorageMock();
const basePayload={schema:'everflow-study-backup-v2',exportedAt:'2026-09-02T00:00:00.000Z',deviceId:'test',focusSessions:[],courseStates:[],legacy408:{}};
const context={console,localStorage,document:{dispatchEvent(){}},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},EveraStore:{async exportAll(){return structuredClone(basePayload)},async importAll(payload){assert(Array.isArray(payload.focusSessions));assert(Array.isArray(payload.courseStates));return true}}};
context.window=context;
vm.createContext(context);

localStorage.setItem('everflow-408-zhenti-wall-v1',JSON.stringify({'2017-4':{answer:'A',updatedAt:'2026-09-01T10:00:00.000Z'}}));
localStorage.setItem('everflow-408-srs-v1',JSON.stringify({version:1,settings:{dailyNew:20},cards:{},daily:{}}));
localStorage.setItem('everflow-408-srs-error-v1',JSON.stringify({version:1,cards:{},daily:{}}));
localStorage.setItem('everflow-408-relax1000-records-v1',JSON.stringify({'90':{answer:'B',correct:false,updatedAt:'2026-09-01T10:00:00.000Z'}}));
localStorage.setItem('relax-seen',JSON.stringify(['90']));
localStorage.setItem('relax-mistakes',JSON.stringify(['90']));
localStorage.setItem('relax-ever-wrong',JSON.stringify(['90']));
localStorage.setItem('relax-bookmarks',JSON.stringify(['90']));

const source=fs.readFileSync(new URL('../assets/js/local-backup-question-v2.js',import.meta.url),'utf8');
vm.runInContext(source,context,{filename:'local-backup-question-v2.js'});

const exported=await context.EveraStore.exportAll();
assert.equal(exported.schema,'everflow-study-backup-v3');
assert.equal(exported.questionBanks.zhenti.wall['2017-4'].answer,'A');
assert.equal(exported.questionBanks.relax1000.records['90'].answer,'B');
assert(exported.questionBanks.relax1000.bookmarks.includes('90'));

const newer=structuredClone(exported);
newer.questionBanks.zhenti.wall['2017-4']={answer:'C',updatedAt:'2026-09-02T10:00:00.000Z'};
newer.questionBanks.relax1000.records['90']={answer:'D',correct:true,favorite:true,updatedAt:'2026-09-02T10:00:00.000Z'};
newer.questionBanks.relax1000.clocks['90']='2026-09-02T10:00:00.000Z';
newer.questionBanks.relax1000.bookmarks=['90'];
await context.EveraStore.importAll(newer);
assert.equal(JSON.parse(localStorage.getItem('everflow-408-zhenti-wall-v1'))['2017-4'].answer,'C');
assert.equal(JSON.parse(localStorage.getItem('everflow-408-relax1000-records-v1'))['90'].answer,'D');

const older=structuredClone(exported);
older.questionBanks.zhenti.wall['2017-4']={answer:'B',updatedAt:'2026-08-01T10:00:00.000Z'};
await context.EveraStore.importAll(older);
assert.equal(JSON.parse(localStorage.getItem('everflow-408-zhenti-wall-v1'))['2017-4'].answer,'C');

await context.EveraStore.importAll(structuredClone(basePayload));
assert.equal(JSON.parse(localStorage.getItem('everflow-408-zhenti-wall-v1'))['2017-4'].answer,'C');
console.log('account local backup test OK: course + zhenti + relax1000, timestamp merge, legacy import');
