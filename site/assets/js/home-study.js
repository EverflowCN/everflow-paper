(()=>{
  const $=s=>document.querySelector(s);
  const fmt=sec=>{const m=Math.round(Math.max(0,sec)/60);return m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m}m`};
  async function render(){
    if(!window.EveraStore)return;
    await EveraStore.init();const s=await EveraStore.getSummary();
    const values={
      '[data-home-focus]':fmt(s.todaySeconds),
      '[data-home-streak]':`${s.streak} 天`,
      '[data-home-week]':fmt(s.weekSeconds),
      '[data-home-sessions]':`${s.focus.length} 次`
    };
    Object.entries(values).forEach(([sel,v])=>{const el=$(sel);if(el)el.textContent=v});
  }
  document.addEventListener('everflow:study-change',()=>render().catch(()=>{}));
  document.addEventListener('everflow:cloud-sync',()=>render().catch(()=>{}));
  render().catch(console.error);
})();
