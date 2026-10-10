(() => {
  'use strict';
  const root=document.querySelector('[data-home-course-list]');
  if(!root)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const arrow='<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  function icon(c){
    if(c.kind==='past-paper')return'408';
    if(c.kind==='reinforcement')return'4科';
    const title=String(c.title||'');
    if(/数学|数二|高数/.test(title))return'∑';
    if(/英语/.test(title))return'EN';
    if(/政治/.test(title))return'政';
    return'课';
  }
  async function populate(){
    try{
      const data=await window.EveraCourseCatalog?.load?.();
      if(!Array.isArray(data?.catalogs)||!data.catalogs.length)return;
      const catalogs=data.catalogs.filter(c=>c&&c.id&&c.title).slice(0,4);
      if(!catalogs.length)return;
      root.innerHTML=catalogs.map(c=>{
        const count=data.itemMap?.get(c.id)?.length||0;
        const subtitle=count?`${count} 节课时 · 点击继续学习`:'打开课程与学习记录';
        const url=`../408/?course=${encodeURIComponent(String(c.id))}`;
        return `<a class="study-home-course-item" href="${url}"><span class="study-home-course-icon">${esc(icon(c))}</span><span class="study-home-course-copy"><strong>${esc(c.title)}</strong><small>${esc(subtitle)}</small></span>${arrow}</a>`;
      }).join('');
    }catch(error){
      // Keep the two working local course links on a network or catalog failure.
      console.warn('Everflow course list unavailable; keeping static links.',error);
    }
  }
  populate();
})();
