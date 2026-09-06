/* FocusPomo v2.2 — recovered abandoned-tomato routing.
   Binary/resource evidence exposes fail_tomato1/2/3 + randomFailedIcon.
   Exact original selection probabilities are not recovered, so the web clone
   uses a stable task-id hash across the three dedicated failed variants. */
const FP3_FAILED_TOMATO_ASSETS=[
 'assets/fail_tomato1.svg',
 'assets/fail_tomato2.svg',
 'assets/fail_tomato3.svg'
];
const FP3_failedTomatoSrc=row=>FP3_FAILED_TOMATO_ASSETS[hash(row?.id||'failed')%FP3_FAILED_TOMATO_ASSETS.length];
const FP3_rowFruitSrc=(row,small=true)=>{
 if(row?.outcome==='abandoned'&&(row.fruitType||'tomato')==='tomato')return FP3_failedTomatoSrc(row);
 const fruit=FP2_fruit(row?.fruitType||'tomato');
 return small?fruit.small:fruit.src;
};
const FP3_failImages=FP3_FAILED_TOMATO_ASSETS.map(src=>{const image=new Image();image.src=src;return image});

const FP3_baseRenderTags=renderTags;
renderTags=function(){
 FP3_baseRenderTags();
 const root=$('#tagsTomatoField');if(!root)return;
 const fruits=visibleTomatoes().slice(-160);
 root.innerHTML=fruits.map((row,i)=>{
  const side=Math.max(20,Math.min(38,FP2_durationSide(row.seconds)*.34));
  const failed=row.outcome==='abandoned';
  return `<img src="${FP3_rowFruitSrc(row,true)}" class="${failed?'failed-fruit':''}" style="left:${(i*31)%97}%;bottom:${(i*47)%260}px;width:${side}px;height:${side}px;transform:rotate(${(hash(row.id)%42)-21}deg)" alt="${failed?'放弃':'完成'}">`;
 }).join('');
};

const FP3_baseRenderData=renderData;
renderData=function(){
 FP3_baseRenderData();
 if(!state.settings.showFailed)return;
 const wall=$('#tomatoWall');if(!wall)return;
 const failed=currentRows().filter(row=>!row.manual&&row.outcome==='abandoned');
 if(!failed.length)return;
 if(wall.querySelector('.empty'))wall.innerHTML='';
 wall.insertAdjacentHTML('beforeend',failed.map(row=>{
  const src=FP3_rowFruitSrc(row,true),size=FP2_durationSide(row.seconds);
  return `<button data-session="${FP2_escapeAttr(row.id)}" class="failed-session" title="放弃 · ${human(row.seconds)}" style="--detail-fruit:${Math.round(54+size/110*46)}%"><img src="${src}" alt="${esc(tag(row.tagId).name)} 放弃 ${human(row.seconds)}"></button>`;
 }).join(''));
 wall.querySelectorAll('.failed-session').forEach(button=>button.onclick=()=>editRecord(state.sessions.find(row=>row.id===button.dataset.session)));
};

/* Replace the alpha-only abandoned rendering with the recovered dedicated
   yellow failed-tomato family. Pear is a custom extension and has no recovered
   failed pear asset, so only that custom case keeps the dim fallback. */
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
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    for(const a of grid.get(`${gx+dx},${gy+dy}`)||[]){
     const x=b.x-a.x,y=b.y-a.y,d=Math.hypot(x,y),min=a.r+b.r;
     if(d>0&&d<min){
      const nx=x/d,ny=y/d,o=(min-d)*.51;
      if(drag?.body!==a){a.x-=nx*o;a.y-=ny*o}
      if(drag?.body!==b){b.x+=nx*o;b.y+=ny*o}
      const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(v<0){const imp=-v*.4;a.vx-=imp*nx;a.vy-=imp*ny;b.vx+=imp*nx;b.vy+=imp*ny}
     }
    }
   }
   const key=`${gx},${gy}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(b);
  }
  for(const b of bodies){
   let image;
   if(b.failed&&b.fruitType!=='pear')image=FP3_failImages[hash(b.id)%FP3_failImages.length];
   else image=b.fruitType==='pear'?FP2_pearImage:tomatoImage;
   if(!image.complete||!image.naturalWidth)continue;
   ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);
   ctx.globalAlpha=b.failed&&b.fruitType==='pear'?.38:1;
   ctx.drawImage(image,-b.r,-b.r,b.r*2,b.r*2);ctx.restore();
  }
 }
 requestAnimationFrame(animate);
};

render();
syncBodies();
// Keep this file as an explicit build trigger for failed-fruit recovery changes.
