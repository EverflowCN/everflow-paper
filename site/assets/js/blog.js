(()=>{
  const body=document.body;
  const root=body.dataset.root||'./';
  const view=body.dataset.view||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>{const p=String(d||'').split('-');return p.length===3?`${p[0]} · ${p[1]} · ${p[2]}`:esc(d)};
  const md=input=>{
    let s=esc(input||'');
    s=s.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>');
    s=s.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');
    s=s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
    const blocks=s.split(/\n{2,}/).map(b=>/^<(h1|h2|h3|blockquote)/.test(b)?b:`<p>${b.replace(/\n/g,'<br>')}</p>`);
    return blocks.join('');
  };
  async function load(){const r=await fetch(root+'data/posts.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('文章数据加载失败');return r.json()}
  async function run(){
    try{
      const posts=await load();
      if(view==='home'){
        const el=document.querySelector('[data-recent-posts]');if(!el)return;
        el.innerHTML=posts.slice(0,6).map(p=>`<a class="post" href="${root}post/?slug=${encodeURIComponent(p.slug)}"><time class="date">${fmt(p.date)}</time><div><h3>${esc(p.title)}</h3><p>${esc(p.excerpt||'')}</p></div><span class="tag">${esc((p.tags||[])[0]||'文章')}</span></a>`).join('')||'<p>还没有文章。</p>';
      }
      if(view==='archive'){
        const el=document.querySelector('[data-archive]');if(!el)return;
        const groups={};posts.forEach(p=>{const y=String(p.date||'').slice(0,4)||'其他';(groups[y]||(groups[y]=[])).push(p)});
        el.innerHTML=Object.keys(groups).sort((a,b)=>b.localeCompare(a)).map(y=>`<section><h2 class="archive-year">${esc(y)}</h2>${groups[y].map(p=>`<a class="archive-item" href="${root}post/?slug=${encodeURIComponent(p.slug)}"><time>${esc(String(p.date||'').slice(5).replace('-',' · '))}</time><strong>${esc(p.title)}</strong></a>`).join('')}</section>`).join('')||'<p>还没有文章。</p>';
      }
      if(view==='post'){
        const slug=new URLSearchParams(location.search).get('slug');const p=posts.find(x=>x.slug===slug);const article=document.querySelector('[data-post]');
        if(!p){document.title='文章不存在 · Everflow';article.innerHTML='<div class="page-head"><h1>文章不存在</h1><p>这篇文章可能已经被删除。</p></div>';return}
        document.title=p.title+' · Everflow';
        article.innerHTML=`<div class="page-head"><div class="eyebrow">${fmt(p.date)}${(p.tags||[]).length?' · '+esc((p.tags||[]).join(' · ')):''}</div><h1>${esc(p.title)}</h1><p>${esc(p.excerpt||'')}</p></div>${md(p.content||'')}`;
      }
    }catch(e){const el=document.querySelector('[data-recent-posts],[data-archive],[data-post]');if(el)el.innerHTML='<p>内容暂时加载失败，请稍后刷新。</p>';console.error(e)}
  }
  run();
})();
