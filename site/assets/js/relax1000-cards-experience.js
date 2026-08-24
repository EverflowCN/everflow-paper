const bankRoot=document.querySelector('.relax-wall-root');
const cardsRoot=document.querySelector('.relax-cards-root');
const subbar=document.querySelector('.relax-subview-bar');
if(!bankRoot||!cardsRoot||!subbar)throw new Error('Relax1000 cards experience prerequisites missing');

const trigger=document.createElement('button');
trigger.type='button';trigger.className='relax-fullscreen-trigger';trigger.dataset.relaxFullscreen='';trigger.textContent='⛶ 畅享全屏';
const resetTrigger=subbar.querySelector('.relax-reset-trigger');
if(resetTrigger)subbar.insertBefore(trigger,resetTrigger);else subbar.appendChild(trigger);

function isNative(){return document.fullscreenElement===cardsRoot||document.webkitFullscreenElement===cardsRoot}
function isFallback(){return document.body.classList.contains('relax-cards-immersive-fallback')}
function isImmersive(){return isNative()||isFallback()}
function activeFilter(){return cardsRoot.querySelector('[data-card-filter].active')?.textContent?.trim()||'全部'}
function stat(index){return cardsRoot.querySelectorAll('.relax-cards-stats strong')[index]?.textContent?.trim()||'0'}
function reviewed(){
  const row=[...cardsRoot.querySelectorAll('.relax-cards-side-row')].find(item=>item.querySelector('span')?.textContent?.includes('今日已刷'));
  return row?.querySelector('b')?.textContent?.trim()||'0';
}
function ensureBar(){
  let bar=cardsRoot.querySelector('.relax-cards-immersive-bar');
  if(bar)return bar;
  bar=document.createElement('div');bar.className='relax-cards-immersive-bar';
  bar.innerHTML=`<div class="relax-immersive-title"><span>R1000</span><div><strong>速刷卡片 · 畅享全屏</strong><small data-relax-immersive-scope>全部科目</small></div></div><div class="relax-immersive-meta"><span>到期 <b data-relax-immersive-due>0</b></span><span>今日已刷 <b data-relax-immersive-reviewed>0</b></span></div><div class="relax-immersive-actions"><button type="button" data-relax-side-toggle>隐藏侧栏</button><button type="button" data-relax-exit-full>退出全屏</button></div>`;
  cardsRoot.prepend(bar);
  bar.querySelector('[data-relax-side-toggle]').addEventListener('click',()=>{cardsRoot.classList.toggle('relax-side-collapsed');sync()});
  bar.querySelector('[data-relax-exit-full]').addEventListener('click',exitImmersive);
  return bar;
}
function sync(){
  const bar=ensureBar(),active=isImmersive();
  document.body.classList.toggle('evera-immersive-open',active);
  trigger.textContent=active?'退出全屏':'⛶ 畅享全屏';
  bar.querySelector('[data-relax-immersive-scope]').textContent=`${activeFilter()} · Q/W/E/R 选项 · 1/2/3/4 评级`;
  bar.querySelector('[data-relax-immersive-due]').textContent=stat(0);
  bar.querySelector('[data-relax-immersive-reviewed]').textContent=reviewed();
  bar.querySelector('[data-relax-side-toggle]').textContent=cardsRoot.classList.contains('relax-side-collapsed')?'显示侧栏':'隐藏侧栏';
  const help=cardsRoot.querySelector('.relax-cards-help');
  if(help&&!help.dataset.fullscreenHelp){help.insertAdjacentHTML('beforeend','<br>Shift + F：畅享全屏');help.dataset.fullscreenHelp='1'}
  bar.hidden=!active;
  if(!active)cardsRoot.classList.remove('relax-side-collapsed');
}
async function enterImmersive(){
  document.querySelector('.mobile-panel')?.classList.remove('open');document.body.classList.remove('menu-open');
  if(window.innerWidth<=1100)cardsRoot.classList.add('relax-side-collapsed');
  ensureBar();
  try{
    const request=cardsRoot.requestFullscreen||cardsRoot.webkitRequestFullscreen;
    if(request){await request.call(cardsRoot);sync();return}
  }catch(error){console.warn('Relax1000 native fullscreen unavailable; using CSS fallback',error)}
  document.body.classList.add('relax-cards-immersive-fallback');sync();
}
async function exitImmersive(){
  document.body.classList.remove('relax-cards-immersive-fallback','evera-immersive-open');
  try{
    if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen();
    else if(document.webkitFullscreenElement&&document.webkitExitFullscreen)document.webkitExitFullscreen();
  }catch{}
  cardsRoot.classList.remove('relax-side-collapsed');sync();
}

trigger.addEventListener('click',()=>isImmersive()?exitImmersive():enterImmersive());
document.addEventListener('fullscreenchange',sync);document.addEventListener('webkitfullscreenchange',sync);
subbar.querySelectorAll('[data-relax-subview]').forEach(button=>button.addEventListener('click',()=>requestAnimationFrame(sync)));
const observer=new MutationObserver(()=>queueMicrotask(sync));observer.observe(cardsRoot,{childList:true});
window.addEventListener('keydown',event=>{
  if(cardsRoot.hidden)return;
  const el=document.activeElement;if(el&&(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.isContentEditable))return;
  if(event.shiftKey&&String(event.key).toUpperCase()==='F'){
    event.preventDefault();event.stopImmediatePropagation();isImmersive()?exitImmersive():enterImmersive();return;
  }
  if(isImmersive()&&event.key==='Escape'){
    event.stopImmediatePropagation();
    if(isFallback()){event.preventDefault();exitImmersive()}
  }
},true);
ensureBar();sync();
