(function(){
'use strict';
// 2016 408 Q41: TCP slow-start and receiver-window interactive sequence.
// The demo is explanatory only; it does not read or alter answer progress.
const STYLE_ID='evera-tcp-2016-style';
if(!document.getElementById(STYLE_ID)){
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=[
    '.evera-tcp16{margin:18px 0 10px;padding:16px;border:1px solid var(--line,#d6d6d6);border-radius:16px;background:var(--card,#fff);color:var(--ink,#161616);font:inherit;line-height:1.55;min-width:0;max-width:100%;box-sizing:border-box}',
    '.evera-tcp16 *{box-sizing:border-box}',
    '.evera-tcp16 .tcp16-head{display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap;margin-bottom:10px}',
    '.evera-tcp16 .tcp16-head strong{font-size:17px;line-height:1.4}',
    '.evera-tcp16 .tcp16-muted{color:var(--muted,#626262);font-size:12px}',
    '.evera-tcp16 .tcp16-badge{font-size:12px;background:var(--soft,#f4f4f4);border-radius:999px;padding:5px 9px;white-space:normal}',
    '.evera-tcp16 .tcp16-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}',
    '.evera-tcp16 .tcp16-metric{border:1px solid var(--line,#ddd);border-radius:11px;padding:10px 8px;text-align:center;min-width:0}',
    '.evera-tcp16 .tcp16-metric span{display:block;font-size:12px;color:var(--muted,#666)}',
    '.evera-tcp16 .tcp16-metric b{display:block;font-size:19px;font-variant-numeric:tabular-nums;margin-top:2px}',
    '.evera-tcp16 .tcp16-controls,.evera-tcp16 .tcp16-rounds{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}',
    '.evera-tcp16 button{font:inherit;font-weight:650;font-size:13px;line-height:1.3;background:var(--card,#fff);color:var(--ink,#161616);border:1px solid var(--line,#ddd);border-radius:9px;min-height:43px;padding:9px 12px;cursor:pointer}',
    '.evera-tcp16 button:disabled{opacity:.42;cursor:default}',
    '.evera-tcp16 button:focus-visible,.evera-tcp16 input:focus-visible{outline:3px solid var(--cyan,#137d91);outline-offset:2px}',
    '.evera-tcp16 button[data-tcp16-action="next"]{background:var(--ink,#161616);color:var(--paper,#fff)}',
    '.evera-tcp16 .tcp16-rounds button{font-size:12px;min-height:40px;padding:7px 9px}',
    '.evera-tcp16 .tcp16-rounds button[aria-pressed="true"]{border-color:var(--cyan,#137d91);background:var(--soft,#eee)}',
    '.evera-tcp16 .tcp16-range-row{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--muted,#666)}',
    '.evera-tcp16 .tcp16-range{min-width:0;flex:1;width:100%;accent-color:var(--cyan,#137d91);min-height:35px}',
    '.evera-tcp16 .tcp16-counter{font-size:13px;color:var(--ink,#111);font-weight:700;min-width:52px;text-align:right}',
    '.evera-tcp16 .tcp16-board{border:1px solid var(--line,#ddd);border-radius:12px;background:var(--soft,#f8f8f8);overflow:hidden}',
    '.evera-tcp16 .tcp16-board-top{padding:9px 11px;border-bottom:1px solid var(--line,#ddd);font-size:12px;color:var(--muted,#666);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}',
    '.evera-tcp16 .tcp16-scroll{overflow-x:auto;overscroll-behavior-x:contain}',
    '.evera-tcp16 svg{width:100%;min-width:460px;height:auto;display:block}',
    '.evera-tcp16 .tcp16-detail{background:var(--soft,#f6f6f6);border-radius:12px;padding:12px;margin-top:12px}',
    '.evera-tcp16 .tcp16-detail-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}',
    '.evera-tcp16 .tcp16-detail p{font-size:13px;line-height:1.75;margin:8px 0}',
    '.evera-tcp16 .tcp16-formulas{display:flex;gap:8px;flex-wrap:wrap;font-size:13px;padding:8px 0}',
    '.evera-tcp16 .tcp16-formulas span{border:1px solid var(--line,#ddd);border-radius:8px;background:var(--card,#fff);padding:5px 9px}',
    '.evera-tcp16 .tcp16-note{font-size:12px;color:var(--muted,#666);border-top:1px dashed var(--line,#ddd);padding-top:10px;margin-top:12px}',
    '@media(max-width:480px){.evera-tcp16{padding:10px;margin:12px 0}.evera-tcp16 .tcp16-metric b{font-size:16px}.evera-tcp16 .tcp16-controls button{flex:1 1 42%}.evera-tcp16 .tcp16-head strong{font-size:15px}}'
  ].join('\n');
  document.head.appendChild(style);
}
const running=new Set();
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='hidden')running.forEach(function(stop){stop();});
});
const amounts=[1,2,4,8,5];
const boundaries=[0,1,3,7,15,20];
function escapeText(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function mount(host){
  if(!host||host.querySelector('.evera-tcp16'))return;
  const box=document.createElement('section');
  box.className='evera-tcp16';
  box.setAttribute('aria-label','2016年408第41题TCP慢开始交互时序图');
  box.innerHTML=[
    '<div class="tcp16-head"><div><strong>交互时序｜H3 ↔ S TCP 慢开始</strong><div class="tcp16-muted">2016 年 408 第 41 题 · 配合参考答案逐轮理解</div></div><span class="tcp16-badge">MSS 1KB · RTT 200ms</span></div>',
    '<p class="tcp16-muted">仿照课堂时序图：<b>H3 → S</b> 的实线表示数据段，<b>S → H3</b> 的虚线表示 ACK。每收到一个新的 ACK，cwnd 增加 1KB，S 的剩余缓存减少 1KB。</p>',
    '<div class="tcp16-metrics"><div class="tcp16-metric"><span>累计确认</span><b data-tcp16-count>0 段</b></div><div class="tcp16-metric"><span>拥塞窗口 cwnd</span><b data-tcp16-cwnd>1 KB</b></div><div class="tcp16-metric"><span>接收窗口 rwnd</span><b data-tcp16-rwnd>20 KB</b></div></div>',
    '<div class="tcp16-controls"><button type="button" data-tcp16-action="reset">↺ 重来</button><button type="button" data-tcp16-action="prev">← 上个 ACK</button><button type="button" data-tcp16-action="next">下个 ACK →</button><button type="button" data-tcp16-action="play">▶ 自动演示</button></div>',
    '<div class="tcp16-range-row"><label for="evera-tcp16-range">确认进度</label><input id="evera-tcp16-range" data-tcp16-range class="tcp16-range" type="range" min="0" max="20" step="1" value="0" aria-label="已经确认的数据段数量"><span class="tcp16-counter" data-tcp16-progress>0 / 20</span></div>',
    '<div class="tcp16-rounds" aria-label="跳转到传输轮次"><button type="button" data-tcp16-jump="1">第1轮</button><button type="button" data-tcp16-jump="3">第2轮</button><button type="button" data-tcp16-jump="7">第3轮</button><button type="button" data-tcp16-jump="15">第4轮</button><button type="button" data-tcp16-jump="20">第5轮</button></div>',
    '<div class="tcp16-board"><div class="tcp16-board-top"><span>TCP 数据/ACK 时序（时间向下）</span><span>小屏幕可横向滑动</span></div><div class="tcp16-scroll"><svg data-tcp16-svg viewBox="0 0 600 852" role="img" aria-label="H3和S之间的三次握手和五轮数据段及ACK交换过程"></svg></div></div>',
    '<div class="tcp16-detail" aria-live="polite"><div class="tcp16-detail-head"><strong data-tcp16-stage>准备第1轮</strong><span class="tcp16-muted" data-tcp16-time>0 ms</span></div><p data-tcp16-detail>H3 初始 SYN 序号为 100，消耗一个序号，因此应用层第一个字节的序号为 101。</p><div class="tcp16-formulas"><span>下一字节序号：<b data-tcp16-seq>101</b></span><span>窗口上限 min：<b data-tcp16-win>1KB</b></span></div><div class="tcp16-note"><b>真题结论：</b>第8个 ACK 后 rwnd=12KB、cwnd=9KB、发送窗口上限9KB；最终5轮发送 1、2、4、8、5KB，20KB÷(5×200ms)=20KB/s=163.84kb/s。<br><b>单位注意：</b>TCP 的 seq/ack 按字节编号，MSS=1KB 表示每个数据段携带1024B；窗口在本题用KB显示。实际在途数据会进一步限制当下可发送的数据量。</div></div>'
  ].join('');
  host.appendChild(box);
  const $=function(name){return box.querySelector('[data-tcp16-'+name+']');};
  const svg=$('svg');
  const range=$('range');
  let n=0,timer=null;
  function stop(){
    if(timer!==null){clearInterval(timer);timer=null;}
    running.delete(stop);
    const play=box.querySelector('[data-tcp16-action="play"]');
    if(play)play.textContent='▶ 自动演示';
  }
  function arrow(x1,y1,x2,y2,color,dashed,opacity){
    const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy);
    const ux=dx/L,uy=dy/L,px=x2-ux*10,py=y2-uy*10;
    return '<g opacity="'+opacity+'"><path d="M'+x1+' '+y1+' L'+px+' '+py+'" fill="none" stroke="'+color+'" stroke-width="2.5" '+(dashed?'stroke-dasharray="7 5"':'')+'/>'+
      '<path d="M'+x2+' '+y2+' L'+(px-uy*5)+' '+(py+ux*5)+' L'+(px+uy*5)+' '+(py-ux*5)+' Z" fill="'+color+'"/></g>';
  }
  function label(x,y,text,options){
    return '<text x="'+x+'" y="'+y+'" '+options+'>'+escapeText(text)+'</text>';
  }
  function roundOf(count){
    if(count===0)return -1;
    for(let i=0;i<5;i++)if(count<=boundaries[i+1])return i;
    return 4;
  }
  function draw(){
    const blue='var(--cyan,#357f9e)',purple='var(--red,#a65f62)',ink='var(--ink,#171717)',muted='var(--muted,#666)';
    let out='';
    out+=label(132,28,'H3（发送）','text-anchor="middle" font-size="19" font-weight="700" fill="'+ink+'"');
    out+=label(478,28,'S（接收）','text-anchor="middle" font-size="19" font-weight="700" fill="'+ink+'"');
    out+='<path d="M132 40V837 M478 40V837" stroke="var(--line,#ccc)" stroke-dasharray="5 6" stroke-width="1.5" fill="none"/>';
    out+=arrow(142,55,465,77,blue,false,1);
    out+=label(308,60,'① SYN · seq=100','text-anchor="middle" font-size="13" fill="'+ink+'"');
    out+=arrow(465,84,142,106,purple,true,1);
    out+=label(305,103,'② SYN+ACK · ack=101','text-anchor="middle" font-size="13" fill="'+ink+'"');
    out+=arrow(142,112,465,135,blue,false,1);
    out+=label(303,130,'③ ACK','text-anchor="middle" font-size="12" fill="'+ink+'"');
    for(let j=0;j<5;j++){
      const top=162+j*133;
      const before=boundaries[j],total=amounts[j],acked=Math.max(0,Math.min(total,n-before));
      const started=n>before,highlight=started&&n<=boundaries[j+1];
      out+='<rect x="6" y="'+top+'" width="588" height="125" rx="9" fill="var(--card,#fff)" stroke="'+(highlight?'var(--cyan,#1689a7)':'var(--line,#ddd)')+'" stroke-width="'+(highlight?'2':'1')+'" '+(!started?'stroke-dasharray="5 4"':'')+'/>';
      out+=label(16,top+19,'第'+(j+1)+'轮 · '+total+'段','font-size="13" font-weight="700" fill="'+ink+'"');
      out+=label(16,top+38,'cwnd '+(1+before+acked)+'KB','font-size="12" fill="'+blue+'"');
      out+=label(492,top+38,'rwnd '+(20-before-acked)+'KB','font-size="12" fill="'+purple+'"');
      out+=label(300,top+23,'H3 → S：'+total+'×1KB','font-size="13" text-anchor="middle" fill="'+ink+'"');
      for(let k=0;k<total;k++){
        const y=top+43+k*3.7;
        out+=arrow(143,y,465,y+12,blue,false,started?0.95:0.16);
      }
      out+=label(300,top+86,'S → H3：已确认 '+acked+'/'+total,'font-size="12" text-anchor="middle" fill="'+ink+'"');
      for(let k=0;k<total;k++){
        const y=top+91+k*2.8;
        out+=arrow(465,y,143,y+10,purple,true,k<acked?0.95:0.08);
      }
    }
    svg.innerHTML=out;
  }
  function render(){
    range.value=String(n);
    const rwnd=20-n,cwnd=1+n;
    $('count').textContent=n+' 段';
    $('cwnd').textContent=cwnd+' KB';
    $('rwnd').textContent=rwnd+' KB';
    $('progress').textContent=n+' / 20';
    $('seq').textContent=String(101+n*1024);
    $('win').textContent=Math.min(rwnd,cwnd)+' KB';
    box.querySelector('[data-tcp16-action="prev"]').disabled=n===0;
    box.querySelector('[data-tcp16-action="next"]').disabled=n===20;
    box.querySelectorAll('[data-tcp16-jump]').forEach(function(b){b.setAttribute('aria-pressed',String(Number(b.dataset.tcp16Jump)===n));});
    if(n===0){
      $('stage').textContent='握手完成，准备第1轮';
      $('time').textContent='t=0';
      $('detail').textContent='H3 的初始 SYN 序号是 100，S 第二次握手回复 ack=101。SYN 消耗一个序号，第一字节数据从 seq=101 开始。初始 cwnd=1KB，S 的可用缓存为 20KB。';
    }else{
      const j=roundOf(n),progress=n-boundaries[j],start=101+(n-1)*1024,next=start+1024;
      $('stage').textContent='第'+(j+1)+'轮 · 收到第'+progress+'/'+amounts[j]+'个 ACK';
      $('time').textContent=n===boundaries[j+1]?'约 '+((j+1)*200)+'ms':'该轮进行中';
      $('detail').textContent='本轮共发送 '+amounts[j]+' 个满载数据段；最新确认的段从字节 '+start+' 开始，包含1024B，S 回复 ack='+next+'。已累计确认 '+n+'KB，因此 cwnd=1+'+n+'='+cwnd+'KB，rwnd=20−'+n+'='+rwnd+'KB；窗口上限取较小者 '+Math.min(cwnd,rwnd)+'KB。'+(j===4?' 最后一轮只能发送5段，因为S只剩5KB缓存。':'');
    }
    draw();
  }
  function set(nNew){
    const v=Number(nNew);
    n=Number.isFinite(v)?Math.max(0,Math.min(20,Math.round(v))):0;
    render();
    if(n>=20)stop();
  }
  box.querySelectorAll('[data-tcp16-action]').forEach(function(b){
    b.addEventListener('click',function(){
      switch(b.dataset.tcp16Action){
        case 'reset':stop();set(0);break;
        case 'prev':stop();set(n-1);break;
        case 'next':stop();set(n+1);break;
        case 'play':
          if(timer!==null){stop();break;}
          if(n>=20)set(0);
          b.textContent='Ⅱ 暂停';
          running.add(stop);
          timer=setInterval(function(){
            if(!box.isConnected||document.visibilityState==='hidden'){stop();return;}
            set(n+1);
          },800);
          break;
      }
    });
  });
  range.addEventListener('input',function(e){stop();set(e.target.value);});
  box.querySelectorAll('[data-tcp16-jump]').forEach(function(b){
    b.addEventListener('click',function(){stop();set(b.dataset.tcp16Jump);});
  });
  // Keep site-wide question navigation shortcuts from firing while keyboard-operating the demo.
  box.addEventListener('keydown',function(e){if(['Enter',' ','ArrowLeft','ArrowRight','a','b','c','d','A','B','C','D'].includes(e.key))e.stopPropagation();});
  render();
}
window.EveraTcp2016={mount:mount};
})();
