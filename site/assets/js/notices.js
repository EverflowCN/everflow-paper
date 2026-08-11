import './cloud.js';

(()=>{
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>d?new Date(d).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'--';
  const label={info:'通知',important:'重要',update:'更新',event:'活动'};
  const icon={info:'i',important:'!',update:'↑',event:'★'};
  const md=input=>{
    let s=esc(input||'');
    s=s.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>');
    s=s.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');
    s=s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
    s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1 ↗</a>');
    return s.split(/\n{2,}/).map(b=>/^<(h1|h2|h3|blockquote)/.test(b)?b:`<p>${b.replace(/\n/g,'<br>')}</p>`).join('');
  };
  const card=n=>`<a class="notice-card" data-level="${esc(n.level||'info')}" href="/notice/?id=${encodeURIComponent(n.id)}"><span class="notice-mark">${icon[n.level]||'i'}</span><div><h3>${esc(n.title)}${n.pinned?'<span class="notice-pinned">置顶</span>':''}</h3><p>${esc(n.summary||'')}</p></div><time class="notice-meta">${fmt(n.published_at||n.created_at)}</time></a>`;

  async function renderHome(){
    const el=$('[data-recent-notices]');if(!el)return;
    try{const rows=await EveraCloud.listNotices({limit:4});el.innerHTML=rows.length?rows.map(card).join(''):'<div class="content-empty">暂时没有新通知。</div>'}
    catch(e){el.innerHTML='<div class="content-empty">通知暂时加载失败，请稍后刷新。</div>';console.error(e)}
  }
  async function renderArchive(){
    const el=$('[data-notice-list]');if(!el)return;
    try{const rows=await EveraCloud.listNotices({limit:100});el.innerHTML=rows.length?rows.map(card).join(''):'<div class="content-empty">暂时没有已发布通知。</div>'}
    catch(e){el.innerHTML='<div class="content-empty">通知暂时加载失败，请稍后刷新。</div>';console.error(e)}
  }
  async function renderDetail(){
    const el=$('[data-notice-detail]');if(!el)return;
    const id=new URLSearchParams(location.search).get('id');
    if(!id){el.innerHTML='<div class="page-head"><h1>通知不存在</h1><p>没有找到对应通知。</p></div>';return}
    try{
      const n=await EveraCloud.getNotice(id);
      if(!n){el.innerHTML='<div class="page-head"><h1>通知不存在</h1><p>这条通知可能尚未发布或已经删除。</p></div>';return}
      document.title=n.title+' · Everflow';
      el.innerHTML=`<div class="page-head"><div class="eyebrow">${esc(label[n.level]||'通知')} · ${fmt(n.published_at||n.created_at)}${n.pinned?' · 置顶':''}</div><h1>${esc(n.title)}</h1><p>${esc(n.summary||'')}</p></div><div class="notice-content">${md(n.content||n.summary||'')}</div>`;
    }catch(e){el.innerHTML='<div class="page-head"><h1>加载失败</h1><p>请稍后重新打开这条通知。</p></div>';console.error(e)}
  }

  Promise.resolve(EveraCloud.ready).then(()=>{const view=document.body.dataset.view;if(view==='home')renderHome();else if(view==='notices')renderArchive();else if(view==='notice')renderDetail()});
})();