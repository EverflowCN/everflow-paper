(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let timer=0,active=location.hash==='#pdf',loading=false;
  const statusLabel={queued:'排队',preparing:'准备',compiling:'编译',storing:'保存',completed:'完成',failed:'失败'};
  const layoutLabel=value=>value==='spacious'?'留空':'紧凑';
  const fmt=value=>value?new Date(value).toLocaleString('zh-CN',{hour12:false,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'--';
  const age=value=>{if(!value)return'从未';const seconds=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/1000));if(seconds<60)return seconds+' 秒前';if(seconds<3600)return Math.floor(seconds/60)+' 分钟前';return Math.floor(seconds/3600)+' 小时前'};
  async function cloud(){for(let i=0;i<100;i++){if(window.EveraAdminCloud)return window.EveraAdminCloud;await new Promise(r=>setTimeout(r,80))}throw new Error('管理服务加载超时')}
  function render(data){
    const nodes=Array.isArray(data.workers)?data.workers:[],healthy=nodes.filter(node=>node.healthy),capacity=healthy.reduce((sum,node)=>sum+(Number(node.capacity)||0),0),busy=healthy.reduce((sum,node)=>sum+(Number(node.active)||0),0),counts=data.counts||{};
    $('[data-pdf-admin-online]').textContent=healthy.length;
    $('[data-pdf-admin-capacity]').textContent=capacity;
    $('[data-pdf-admin-busy]').textContent=busy;
    $('[data-pdf-admin-queued]').textContent=Number(counts.queued)||0;
    $('[data-pdf-admin-failed]').textContent=Number(counts.failed)||0;
    $('[data-pdf-admin-mode]').textContent=healthy.length?'常驻节点在线':'仅兜底节点';
    $('[data-pdf-admin-mode]').className='pill '+(healthy.length?'ok':'bad');
    $('[data-pdf-admin-updated]').textContent=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const tokenMap=new Map((data.tokens||[]).map(token=>[token.id,token]));
    const workerRoot=$('[data-pdf-admin-workers]');
    workerRoot.innerHTML=nodes.length?nodes.map(node=>{
      const token=tokenMap.get(node.id);
      return `<div class="pdf-node ${node.healthy?'':'offline'}"><i></i><div><strong>${esc(node.id)}</strong><small>${node.kind==='persistent'?'常驻 XeLaTeX':'定时节点'} · 心跳 ${esc(age(node.updated_at))}${token?' · 认证 '+esc(age(token.lastUsedAt)):''}</small></div><span><b>${Number(node.active)||0} / ${Number(node.capacity)||0}</b>忙碌 / 容量</span></div>`;
    }).join(''):'<div class="quality-empty">当前没有注册的编译节点。</div>';
    const queue=$('[data-pdf-admin-queue]');
    const queueItems=[['排队',counts.queued],['准备',counts.preparing],['编译',counts.compiling],['保存',counts.storing],['完成',counts.completed],['失败',counts.failed]];
    queue.innerHTML=queueItems.map(([label,value])=>`<article><span>${label}</span><strong>${Number(value)||0}</strong></article>`).join('');
    const recent=Array.isArray(data.recent)?data.recent:[];
    $('[data-pdf-admin-recent-count]').textContent=recent.length+' 条';
    const tbody=$('[data-pdf-admin-recent]');
    tbody.innerHTML=recent.length?recent.map(job=>`<tr><td>${esc(fmt(job.createdAt))}</td><td><strong>${esc(job.title)}</strong><small>${esc(String(job.id).slice(0,8))} · ${Number(job.count)||0} 题${job.priorityEnabled?'<span class="pdf-admin-priority">优先</span>':''}</small></td><td>${esc(layoutLabel(job.layout))}</td><td><span class="pdf-admin-status ${esc(job.status)}">${esc(statusLabel[job.status]||job.status)}</span></td><td>${Number.isFinite(Number(job.elapsedSeconds))?Number(job.elapsedSeconds).toFixed(1)+'s':'--'}</td><td>${Number(job.attempts)||0}</td></tr>`).join(''):'<tr><td colspan="6">最近 24 小时没有 PDF 导出任务。</td></tr>';
  }
  function renderError(error){
    const root=$('[data-pdf-admin-workers]');if(root)root.innerHTML=`<div class="quality-empty">读取失败：${esc(error?.message||error)}</div>`;
    const row=$('[data-pdf-admin-recent]');if(row)row.innerHTML='<tr><td colspan="6">暂时无法读取编译任务。</td></tr>';
    const mode=$('[data-pdf-admin-mode]');if(mode){mode.textContent='连接异常';mode.className='pill bad'}
  }
  async function refresh(){
    if(!active||loading||document.hidden)return;loading=true;
    try{const c=await cloud();render(await c.pdfCompiler())}catch(error){console.error('PDF compiler center',error);renderError(error)}finally{loading=false}
  }
  function schedule(){
    clearInterval(timer);timer=0;
    if(active){void refresh();timer=setInterval(()=>void refresh(),5000)}
  }
  document.addEventListener('everflow:workspace-section',event=>{active=event.detail?.id==='pdf';schedule()});
  $('[data-pdf-admin-refresh]')?.addEventListener('click',()=>void refresh());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active)void refresh()});
  if(active)schedule();
})();