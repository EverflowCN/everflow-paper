import './cloud.js';

(()=>{
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const absolute=url=>/^https?:\/\//i.test(url)?url:url.startsWith('/')?url:'/'+url;
  async function render(){
    const root=$('[data-resource-root]');if(!root)return;
    try{
      await EveraCloud.ready;
      const {settings,items}=await EveraCloud.getResourceHub();
      const title=settings?.title||'Everflow 资源导航',subtitle=settings?.subtitle||'把常用入口收拢到一个页面。',footer=settings?.footer_note||'Everflow · 彼时流年若水';
      const avatar=settings?.avatar_url?`<img src="${esc(settings.avatar_url)}" alt="">`:'<span class="fallback">EF</span>';
      const groups={};items.filter(x=>x.enabled!==false).forEach(x=>(groups[x.group_name||'常用入口']||(groups[x.group_name||'常用入口']=[])).push(x));
      const groupHtml=Object.entries(groups).map(([name,rows])=>`<section class="resource-group"><h2 class="resource-group-title">${esc(name)}</h2><div class="resource-links">${rows.map(x=>`<a class="resource-link" href="${esc(absolute(x.url))}" ${/^https?:\/\//i.test(x.url)?'target="_blank" rel="noopener"':''}><span class="resource-icon">${esc(x.icon||'↗')}</span><span><strong>${esc(x.title)}</strong><span>${esc(x.subtitle||'')}</span></span><b class="resource-arrow">›</b></a>`).join('')}</div></section>`).join('');
      root.innerHTML=`<section class="resource-profile"><div class="resource-avatar">${avatar}</div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></section>${groupHtml||'<div class="content-empty">后台还没有添加资源入口。</div>'}<div class="resource-footer">${esc(footer)}</div>`;
      document.title=title+' · Everflow';
    }catch(e){root.innerHTML='<div class="content-empty">资源导航暂时加载失败，请稍后刷新。</div>';console.error(e)}
  }
  render();
})();