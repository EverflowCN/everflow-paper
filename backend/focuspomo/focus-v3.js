/* FocusPomo v3 — HD assets, timer semantics and three-device layout correction. */
const FP5_HD_TOMATO=typeof FP4_ASSETS!=='undefined'&&FP4_ASSETS.tomato?FP4_ASSETS.tomato:FP2_FRUITS.tomato.src;
const FP5_HD_PEAR='assets/pear-hd.svg';
FP2_FRUITS.tomato.src=FP5_HD_TOMATO;
FP2_FRUITS.tomato.small=FP5_HD_TOMATO;
FP2_FRUITS.pear.src=FP5_HD_PEAR;
FP2_FRUITS.pear.small=FP5_HD_PEAR;
tomatoImage.src=FP5_HD_TOMATO;
FP2_pearImage.src=FP5_HD_PEAR;

/* Original 5.2.2 only pauses count-up focus. Do not expose pause on countdown. */
togglePause=function(s,now=Date.now()){
  const a=s.active;if(!a||a.mode!=='focus'||a.kind!=='up')return false;
  if(!a.paused)a.elapsedMs=elapsed(a,now)*1000;
  a.resumedAt=now;a.paused=!a.paused;return true;
};
const FP5_baseRenderTimer=renderTimer;
renderTimer=function(){
  FP5_baseRenderTimer();
  const a=state.active;
  $('#pauseBtn')?.classList.toggle('hidden',!a||a.mode!=='focus'||a.kind!=='up');
  win.classList.toggle('focus-mode',page==='focus');
  const label=$('#focusMeta');
  if(label&&!a)label.textContent=`${visibleTomatoes().filter(reward).length} 个番茄`;
};

/* Use actual retina density. The previous 2x cap visibly softened 3x iPhone fruit art. */
resize=function(){
  const box=canvas.getBoundingClientRect();
  if(box.width<=0||box.height<=0)return;
  const oldW=Math.max(1,width),oldH=Math.max(1,height);
  width=box.width;height=box.height;
  const dpr=Math.min(Math.max(1,window.devicePixelRatio||1),3);
  canvas.width=Math.max(1,Math.round(width*dpr));
  canvas.height=Math.max(1,Math.round(height*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  for(const b of bodies){b.x=b.x/oldW*width;b.y=b.y/oldH*height}
  drawTrend();
};

/* Keep recovered duration sizing but render every fruit from the full-resolution master. */
syncBodies=function(){
  const rows=visibleTomatoes().slice(-300),old=new Map(bodies.map(b=>[b.id,b]));
  const now=performance.now();
  bodies=rows.map((row,i)=>{
    const found=old.get(row.id),side=FP2_durationSide(row.seconds);
    if(found){found.failed=row.outcome==='abandoned';found.fruitType=row.fruitType||'tomato';found.r=side/2;return found}
    return {id:row.id,x:side/2+hash(row.id)%Math.max(1,Math.floor(width-side)),y:-side-i*3,r:side/2,vx:0,vy:0,a:(hash(row.id)%60-30)/50,spin:0,failed:row.outcome==='abandoned',fruitType:row.fruitType||'tomato',bornAt:now};
  });
};

animate=function(now){
  const dt=Math.min(2,(now-last)/16.7);last=now;
  if(page==='focus'&&!document.hidden){
    ctx.clearRect(0,0,width,height);
    for(const b of bodies){
      if(drag?.body===b)continue;
      b.vx+=gravity.x*dt;b.vy+=gravity.y*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.spin*dt;b.spin*=.995;
      if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)*.5}
      if(b.x>width-b.r){b.x=width-b.r;b.vx=-Math.abs(b.vx)*.5}
      if(b.y>height-b.r){b.y=height-b.r;b.vy=-Math.abs(b.vy)*.25;b.vx*=.96}
      if(b.y< -200)b.y=-200;
    }
    const grid=new Map(),cell=120;
    for(const b of bodies){
      const gx=Math.floor(b.x/cell),gy=Math.floor(b.y/cell);
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const a of grid.get(`${gx+dx},${gy+dy}`)||[]){
        const x=b.x-a.x,y=b.y-a.y,d=Math.hypot(x,y),min=a.r+b.r;
        if(d>0&&d<min){const nx=x/d,ny=y/d,o=(min-d)*.51;if(drag?.body!==a){a.x-=nx*o;a.y-=ny*o}if(drag?.body!==b){b.x+=nx*o;b.y+=ny*o}const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(v<0){const imp=-v*.4;a.vx-=imp*nx;a.vy-=imp*ny;b.vx+=imp*nx;b.vy+=imp*ny}}
      }
      const key=`${gx},${gy}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(b);
    }
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    for(const b of bodies){
      let image;
      if(b.failed&&b.fruitType!=='pear'&&typeof FP3_failImages!=='undefined')image=FP3_failImages[hash(b.id)%FP3_failImages.length];
      else image=b.fruitType==='pear'?FP2_pearImage:tomatoImage;
      if(!image?.complete||!image.naturalWidth)continue;
      const fade=b.bornAt?Math.min(1,Math.max(0,(now-b.bornAt)/200)):1;
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.globalAlpha=(b.failed&&b.fruitType==='pear'?.38:1)*fade;ctx.drawImage(image,-b.r,-b.r,b.r*2,b.r*2);ctx.restore();
    }
  }
  requestAnimationFrame(animate);
};

/* Desktop-only reference ruler and controls. */
if(!document.querySelector('.desktop-focus-decor')){
  const decor=document.createElement('div');decor.className='desktop-focus-decor';
  decor.innerHTML=`<img class="desktop-focus-fruit" src="${typeof FP4_ASSETS!=='undefined'?(FP4_ASSETS.tomatoInterval||FP5_HD_TOMATO):FP5_HD_TOMATO}" alt="">
  <div class="desktop-ruler"><div class="desktop-ruler-labels">${[5,10,15,20,25,30,35,40,45,50,55,60,65].map(v=>`<span>${v}</span>`).join('')}</div><div class="desktop-ruler-line"></div><div class="desktop-ruler-ticks">${Array.from({length:61},(_,i)=>`<i class="${i%5===0?'major ':''}${i===30?'active':''}"></i>`).join('')}</div><i class="desktop-ruler-marker"></i></div>`;
  $('.page-focus')?.append(decor);
  const menu=document.createElement('button');menu.type='button';menu.className='desktop-menu-dot';menu.setAttribute('aria-label','菜单');menu.textContent='•••';menu.onclick=e=>{e.stopPropagation();$('#menuPopover')?.classList.toggle('hidden')};win.append(menu);
}

/* Duration UI must expose the selected preset on every device. */
function FP5_syncDurationUI(){
  const minutes=state.settings.minutes;
  $$('[data-min]').forEach(b=>b.classList.toggle('active',Number(b.dataset.min)===Number(minutes)));
  FP2_updateDurationPreview(minutes);
}
const FP5_oldTimerClick=$('#timerValue')?.onclick;
if($('#timerValue'))$('#timerValue').onclick=e=>{FP5_oldTimerClick?.call($('#timerValue'),e);FP5_syncDurationUI()};

const FP5_baseRenderSettings=FP2_renderSettings;
FP2_renderSettings=function(){FP5_baseRenderSettings();FP2_FRUITS.tomato.src=FP5_HD_TOMATO;FP2_FRUITS.tomato.small=FP5_HD_TOMATO;FP2_FRUITS.pear.src=FP5_HD_PEAR;FP2_FRUITS.pear.small=FP5_HD_PEAR;FP2_renderFruitChoices()};

const FP5_baseGo=go;
go=function(name){FP5_baseGo(name);win.classList.toggle('focus-mode',name==='focus');if(name==='focus')resize()};

FP5_syncDurationUI();
resize();syncBodies();render();
