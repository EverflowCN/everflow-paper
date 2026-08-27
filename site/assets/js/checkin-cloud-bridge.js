(()=>{
  const KEY='oxygen408-progress-v2';
  async function mergeCloudIntoLegacy(){
    if(!window.EveraStore)return;
    let local={};try{local=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
    const rows=await EveraStore.listCourseStates();let changed=0;
    rows.forEach(r=>{const old=local[r.id];if(!old||(!old.updatedAt&&r.updatedAt)||String(r.updatedAt||'')>String(old.updatedAt||'')){local[r.id]={done:Boolean(r.done),note:String(r.note||''),updatedAt:r.updatedAt||new Date().toISOString()};changed+=1}});
    if(changed){localStorage.setItem(KEY,JSON.stringify(local));document.dispatchEvent(new CustomEvent('everflow:course-state-merged',{detail:{changed}}))}
  }
  document.addEventListener('everflow:cloud-sync',()=>mergeCloudIntoLegacy().catch(console.error));
})();
