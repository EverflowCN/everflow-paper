/* FocusPomo v3 hotfix: keep HD fruit roles through all render wrappers and make desktop ruler real. */
function FP6_forceHdFruitRoles(){
  FP2_FRUITS.tomato.src=FP5_HD_TOMATO;FP2_FRUITS.tomato.small=FP5_HD_TOMATO;
  FP2_FRUITS.pear.src=FP5_HD_PEAR;FP2_FRUITS.pear.small=FP5_HD_PEAR;
  tomatoImage.src=FP5_HD_TOMATO;FP2_pearImage.src=FP5_HD_PEAR;
  const desktopFruit=document.querySelector('.desktop-focus-fruit');if(desktopFruit)desktopFruit.src=FP5_HD_TOMATO;
}
FP6_forceHdFruitRoles();

const FP6_baseRenderTags=renderTags;
renderTags=function(){FP6_forceHdFruitRoles();FP6_baseRenderTags();FP6_forceHdFruitRoles()};
const FP6_baseRenderData=renderData;
renderData=function(){FP6_forceHdFruitRoles();FP6_baseRenderData();FP6_forceHdFruitRoles()};
const FP6_baseRenderStats=FP2_renderStats;
FP2_renderStats=function(){FP6_forceHdFruitRoles();FP6_baseRenderStats();FP6_forceHdFruitRoles()};
const FP6_baseFinished=finished;
finished=function(row){FP6_forceHdFruitRoles();return FP6_baseFinished(row)};

function FP6_updateDesktopRuler(){
  const ruler=document.querySelector('.desktop-ruler');if(!ruler)return;
  const minutes=Number(state.settings.minutes)||0,ticks=[...ruler.querySelectorAll('.desktop-ruler-ticks i')],marker=ruler.querySelector('.desktop-ruler-marker');
  ticks.forEach(t=>t.classList.remove('active'));
  if(minutes<=0){if(marker)marker.style.display='none';return}
  const clamped=Math.max(5,Math.min(65,Math.round(minutes))),index=clamped-5;
  ticks[index]?.classList.add('active');
  if(marker){marker.style.display='block';marker.style.left=`${index/60*100}%`}
}
const FP6_baseRenderTimer=renderTimer;
renderTimer=function(){FP6_forceHdFruitRoles();FP6_baseRenderTimer();FP6_updateDesktopRuler()};
const FP6_ruler=document.querySelector('.desktop-ruler');
if(FP6_ruler)FP6_ruler.addEventListener('click',event=>{
  if(state.active)return;
  const rect=FP6_ruler.getBoundingClientRect();if(!rect.width)return;
  const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
  const minutes=Math.max(5,Math.min(65,Math.round(5+ratio*60)));
  state.settings.minutes=minutes;durationChoice=minutes;
  $$('[data-min]').forEach(button=>button.classList.toggle('active',Number(button.dataset.min)===minutes));
  FP2_updateDurationPreview(minutes);changed();FP6_updateDesktopRuler();
});
FP6_updateDesktopRuler();
