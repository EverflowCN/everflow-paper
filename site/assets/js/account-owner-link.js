(()=>{
  async function run(){
    for(let i=0;i<80&&!window.EveraCloud;i++)await new Promise(r=>setTimeout(r,75));
    const box=document.querySelector('[data-owner-workspace]');if(!box||!window.EveraCloud)return;
    try{await EveraCloud.ready;const user=await EveraCloud.getUser();box.hidden=!(user&&user.app_metadata?.role==='owner')}catch{box.hidden=true}
  }
  document.addEventListener('everflow:auth-change',()=>run());run();
})();