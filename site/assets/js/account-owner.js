import './cloud.js';

(async()=>{
  const section=document.querySelector('[data-owner-workspace]');if(!section)return;
  await EveraCloud.ready;
  async function render(){const user=await EveraCloud.getUser();section.hidden=!(user&&await EveraCloud.isOwner())}
  document.addEventListener('everflow:auth-change',()=>render().catch(()=>{}));
  render().catch(()=>{section.hidden=true});
})();