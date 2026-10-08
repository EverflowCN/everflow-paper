(function(){
'use strict';
const sheetId='evera-rtt-2025-styles';
if(!document.getElementById(sheetId)){
 const style=document.createElement('style');style.id=sheetId;style.textContent=`
 .evera-rtt-demo{margin:18px 0 8px;border:1px solid var(--line,#ddd);border-radius:16px;background:var(--card,#fff);color:var(--ink,#171717);padding:16px;font-family:inherit;max-width:100%;min-width:0;font-size:14px;line-height:1.5}
 .evera-rtt-demo *{box-sizing:border-box}
 .evera-rtt-demo .rtt-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}
 .evera-rtt-demo .rtt-head strong{font-size:17px;line-height:1.35}
 .evera-rtt-demo .rtt-sub{color:var(--muted,#666);font-size:12px;margin-top:4px}
 .evera-rtt-demo .rtt-badge{font-size:12px;color:var(--ink);padding:6px 10px;border-radius:99px;background:var(--soft,#eee);white-space:normal}
 .evera-rtt-demo .rtt-protocols{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
 .evera-rtt-demo button{font-family:inherit;cursor:pointer;border:1px solid var(--line,#ddd);border-radius:10px;background:var(--card,#fff);color:var(--ink,#111);font-size:14px;padding:10px 12px;min-height:42px;font-weight:650}
 .evera-rtt-demo button[aria-pressed="true"]{border-color:var(--cyan,#1689a7);background:color-mix(in srgb,var(--cyan,#1689a7) 12%,var(--card,#fff))}
 .evera-rtt-demo button:focus-visible,.evera-rtt-demo input:focus-visible{outline:3px solid var(--cyan,#1689a7);outline-offset:2px}
 .evera-rtt-demo .rtt-board{border:1px solid var(--line,#ddd);border-radius:13px;background:var(--soft,#fafafa);padding:12px;min-width:0}
 .evera-rtt-demo .rtt-board-top{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:6px}
 .evera-rtt-demo .rtt-board-top strong{font-size:14px}
 .evera-rtt-demo .rtt-clock{font-size:16px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
 .evera-rtt-demo .rtt-range{width:100%;accent-color:var(--cyan,#1689a7);margin:12px 0 0;min-height:27px}
 .evera-rtt-demo .rtt-svg{width:100%;height:auto;display:block;overflow:visible}
 .evera-rtt-demo .rtt-controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
 .evera-rtt-demo .rtt-main{background:var(--ink,#111);color:var(--paper,#fff)}
 .evera-rtt-demo .rtt-description{border-radius:12px;padding:12px;background:var(--soft,#fafafa);min-height:75px}
 .evera-rtt-demo .rtt-description strong{display:block;font-size:14px}
 .evera-rtt-demo .rtt-description p{margin:5px 0 0;color:var(--muted,#666);font-size:13px;line-height:1.65}
 .evera-rtt-demo .rtt-event-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:12px 0}
 .evera-rtt-demo .rtt-event-list button{text-align:left;font-size:12px;padding:9px;min-width:0;line-height:1.35}
 .evera-rtt-demo .rtt-event-list small{display:block;color:var(--muted,#666);font-size:11px;font-weight:400;margin-top:3px}
 .evera-rtt-demo .rtt-event-list button[aria-current="step"]{border-color:var(--cyan,#1689a7);background:color-mix(in srgb,var(--cyan,#1689a7) 10%,var(--card,#fff))}
 .evera-rtt-demo .rtt-note{margin:8px 0 0;border-top:1px dashed var(--line,#ddd);padding-top:11px;font-size:12px;color:var(--muted,#555)}
 .evera-rtt-demo .rtt-note b{color:var(--ink,#111)}
 @media(max-width:480px){.evera-rtt-demo{padding:10px;margin:12px 0}.evera-rtt-demo .rtt-board{padding:7px}.evera-rtt-demo .rtt-head strong{font-size:15px}.evera-rtt-demo .rtt-controls button{flex:1}.evera-rtt-demo .rtt-event-list{grid-template-columns:1fr 1fr}}
 @media(prefers-reduced-motion:reduce){.evera-rtt-demo button{transition:none}}
 `;document.head.appendChild(style);
}
const activeAnimations=new Set();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')for(const stop of [...activeAnimations])stop();});
const plans={
 UDP:{end:8,events:[
 {start:0,end:4,from:'c',name:'① UDP 时间请求',title:'客户端发送时间查询',body:'0 ms：UDP 不需要先建立连接。客户端直接发送请求，4 ms 时服务器收到。'},
 {start:4,end:8,from:'s',name:'② UDP 时间响应',title:'客户端收到时间结果',body:'4 ms：服务器立即回复；8 ms 时客户端收到响应。总共 1 RTT = 8 ms。'}
 ]},
 TCP:{end:16,events:[
 {start:0,end:4,from:'c',name:'① SYN',title:'第一次握手：发起连接',body:'0 ms：客户端发送 SYN；4 ms 时服务器收到。'},
 {start:4,end:8,from:'s',name:'② SYN + ACK',title:'第二次握手：同意连接',body:'4 ms：服务器回复 SYN + ACK；8 ms 时客户端收到。SYN → SYN+ACK 用去 1 RTT。'},
 {start:8,end:12,from:'c',name:'③ ACK + 时间请求',title:'第三次握手，同时请求时间',body:'8 ms：客户端把第三次握手 ACK 与时间查询请求一起发送；12 ms 时服务器收到。因此无需再单独等待一次往返。'},
 {start:12,end:16,from:'s',name:'④ 时间响应',title:'客户端收到时间结果',body:'12 ms：服务器回复查询结果；16 ms 客户端收到。总共 2 RTT = 16 ms。'}
 ]}
};
function safeText(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function mount(host){
 if(!host||host.querySelector('.evera-rtt-demo'))return;
 const box=document.createElement('section');box.className='evera-rtt-demo';box.setAttribute('aria-label','UDP 与 TCP RTT 时间查询交互示意图');
 box.innerHTML=`<div class="rtt-head"><div><strong>交互时序｜UDP 与 TCP 时间查询</strong><div class="rtt-sub">2025 年 408 第 39 题 · 参考答案 B</div></div><span class="rtt-badge">RTT = 8 ms</span></div>
 <div class="rtt-protocols" role="group" aria-label="协议"><button type="button" data-rtt-mode="UDP">UDP · 8 ms</button><button type="button" data-rtt-mode="TCP">TCP · 16 ms</button></div>
 <div class="rtt-board"><div class="rtt-board-top"><strong data-rtt-name>TCP 三次握手 + 查询响应</strong><span class="rtt-clock" data-rtt-time>0 / 16 ms</span></div><input class="rtt-range" data-rtt-range type="range" min="0" max="16" step="0.25" value="0" aria-label="时间进度，单位毫秒"><svg class="rtt-svg" data-rtt-svg viewBox="0 0 440 400" role="img" aria-label="客户端与服务器间的报文时序，时间从上到下"></svg></div>
 <div class="rtt-controls"><button class="rtt-main" type="button" data-rtt-play>▶ 播放</button><button type="button" data-rtt-next>下一事件 →</button><button type="button" data-rtt-reset>↺ 重播</button></div>
 <div class="rtt-description" aria-live="polite"><strong data-rtt-detail-title>开始建立 TCP 连接</strong><p data-rtt-detail>客户端准备发送 SYN。</p></div>
 <div class="rtt-event-list" data-rtt-events aria-label="跳转到报文事件"></div>
 <div class="rtt-note" data-rtt-note><b>关键：</b>TCP 三次握手有三条报文，但不是 3 RTT。第三次握手可同时携带查询请求（按本题最少时间的教材模型）。</div>`;
 host.appendChild(box);
 const $=s=>box.querySelector(s);
 let mode='TCP',ms=0,timer=null;
 const stop=()=>{if(timer!==null){clearInterval(timer);timer=null;}activeAnimations.delete(stop); $('[data-rtt-play]').textContent='▶ 播放';};
 function renderEvents(){
  $('[data-rtt-events]').innerHTML=plans[mode].events.map((e,i)=>'<button type="button" data-rtt-index="'+i+'"><b>'+safeText(e.name)+'</b><small>'+e.start+' → '+e.end+' ms</small></button>').join('');
 }
 function svgAt(t){
  const plan=plans[mode],top=64,unit=15.5,last=top+plan.end*unit,xC=92,xS=355;
  let s='<text x="'+xC+'" y="22" font-size="16" text-anchor="middle" fill="var(--ink)">客户端 C</text><text x="'+xS+'" y="22" font-size="16" text-anchor="middle" fill="var(--ink)">服务器 S</text>';
  s+='<path d="M'+xC+' 40V'+(last+19)+' M'+xS+' 40V'+(last+19)+'" fill="none" stroke="var(--muted)" stroke-dasharray="5 6" stroke-width="2" opacity=".68"/>';
  for(let n=0;n<=plan.end;n+=4){const y=top+n*unit;s+='<text x="4" y="'+(y+4)+'" font-size="12" fill="var(--muted)">'+n+'ms</text><path d="M60 '+y+'H400" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 6"/>';}
  plan.events.forEach((e,i)=>{const x1=e.from==='c'?xC:xS,x2=e.from==='c'?xS:xC,y1=top+e.start*unit,y2=top+e.end*unit;
   const p=Math.max(0,Math.min(1,(t-e.start)/(e.end-e.start))),x=x1+(x2-x1)*p,y=y1+(y2-y1)*p;
   const col=i%2?'#c38350':'#368aa2',opacity=t<e.start?.22:1;
   s+='<g opacity="'+opacity+'"><path d="M'+x1+' '+y1+'L'+x2+' '+y2+'" fill="none" stroke="var(--muted)" stroke-width="1.8" opacity=".35"/>';
   if(p>0)s+='<path d="M'+x1+' '+y1+'L'+x+' '+y+'" fill="none" stroke="'+col+'" stroke-width="3.3"/>';
   if(p>0&&p<1)s+='<circle cx="'+x+'" cy="'+y+'" r="6" fill="'+col+'" stroke="var(--card)" stroke-width="2"/>';
   if(p===1){const angle=Math.atan2(y2-y1,x2-x1),a=angle+.48,b=angle-.48;
    const ax=x2-11*Math.cos(a),ay=y2-11*Math.sin(a),bx=x2-11*Math.cos(b),by=y2-11*Math.sin(b);
    s+='<path d="M'+ax+' '+ay+'L'+x2+' '+y2+'L'+bx+' '+by+'" fill="none" stroke="'+col+'" stroke-width="3" stroke-linecap="round"/>';}
   const mid=(y1+y2)/2-9;
   s+='<rect x="137" y="'+(mid-17)+'" width="176" height="22" rx="5" fill="var(--card)" opacity=".96"/><text x="225" y="'+mid+'" text-anchor="middle" font-size="14" font-weight="650" fill="var(--ink)">'+safeText(e.name)+'</text></g>';
  });
  if(t>=plan.end)s+='<text x="225" y="'+(last+36)+'" text-anchor="middle" fill="var(--ink)" font-size="14" font-weight="700">✓ 已收到时间结果</text>';
  const svg=$('[data-rtt-svg]');svg.setAttribute('viewBox','0 0 440 '+(last+52));svg.innerHTML=s;
 }
 function render(){
  const plan=plans[mode];ms=Math.max(0,Math.min(plan.end,ms));
  $('[data-rtt-range]').max=String(plan.end);$('[data-rtt-range]').value=String(ms);
  $('[data-rtt-time]').textContent=(Number.isInteger(ms)?ms:ms.toFixed(2))+' / '+plan.end+' ms';
  $('[data-rtt-name]').textContent=mode==='UDP'?'UDP 直接查询（1 RTT）':'TCP 先握手再查询（2 RTT）';
  box.querySelectorAll('[data-rtt-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rttMode===mode)));
  const current=plan.events[Math.min(plan.events.length-1,Math.floor(ms/4))];
  $('[data-rtt-detail-title]').textContent=ms>=plan.end?'✓ 查询完成：'+plan.end+' ms':current.title;
  $('[data-rtt-detail]').textContent=ms>=plan.end?'客户端已收到服务器返回的时间。总耗时 '+(mode==='UDP'?'1 RTT':'2 RTT')+' = '+plan.end+' ms。':current.body;
  $('[data-rtt-note]').innerHTML=mode==='TCP'?'<b>关键：</b>第三次握手的 ACK 可以携带时间查询请求；3 次握手并不等于 3 RTT。':'<b>关键：</b>UDP 无连接，直接发送请求并收到响应，共一个往返。';
  box.querySelectorAll('[data-rtt-index]').forEach(b=>b.setAttribute('aria-current',Number(b.dataset.rttIndex)===plan.events.indexOf(current)?'step':'false'));
  svgAt(ms);
 }
 box.querySelectorAll('[data-rtt-mode]').forEach(button=>button.addEventListener('click',()=>{stop();mode=button.dataset.rttMode;ms=0;renderEvents();render();}));
 $('[data-rtt-play]').addEventListener('click',()=>{if(timer!==null){stop();return;}const end=plans[mode].end;if(ms>=end)ms=0;$('[data-rtt-play]').textContent='Ⅱ 暂停';activeAnimations.add(stop);timer=setInterval(()=>{if(!box.isConnected||!box.getClientRects().length){stop();return;}ms=Math.min(plans[mode].end,ms+.25);if(ms>=plans[mode].end)stop();render();},90);render();});
 $('[data-rtt-next]').addEventListener('click',()=>{stop();ms=Math.min(plans[mode].end,(Math.floor(ms/4)+1)*4);render();});
 $('[data-rtt-reset]').addEventListener('click',()=>{stop();ms=0;render();});
 $('[data-rtt-range]').addEventListener('input',e=>{stop();ms=Number(e.target.value)||0;render();});
 $('[data-rtt-events]').addEventListener('click',e=>{const btn=e.target.closest('[data-rtt-index]');if(!btn)return;const item=plans[mode].events[Number(btn.dataset.rttIndex)];if(!item)return;stop();ms=item.end;render();});
 box.addEventListener('keydown',e=>{if(['Enter','ArrowLeft','ArrowRight',' ','a','b','c','d','A','B','C','D'].includes(e.key))e.stopPropagation();});

 renderEvents();render();
}
window.EveraRtt2025={mount};
})();
