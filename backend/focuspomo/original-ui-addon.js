/* FocusPomo 5.2.2 — exact extracted asset role mapping for the private web page.
   Original PNGs are loaded from backend/focuspomo/assets and bundled as data URIs. */
const FP4_ASSETS={
 tomato:'assets/tomato.png',
 tomatoSmall:'assets/tomato-small.png',
 tomatoInterval:'assets/tomato-interval.png',
 tomatoData:'assets/tomato-data.png',
 tomatoConfig:'assets/tomato-config.png',
 failedData:'assets/fail-tomato-data.png',
 pause:'assets/pause.png',
 resume:'assets/continue.png',
 stop:'assets/stop.png',
 sound:'assets/sound.png',
 soundOff:'assets/sound-off.png',
 backData:'assets/back-data.png',
 prevData:'assets/prev-data.png',
 nextData:'assets/next-data.png',
 nextDataDisabled:'assets/next-data-disabled.png',
 tagArrow:'assets/tag-arrow.png',
 more:'assets/more.png',
 pickerSelect:'assets/picker-select.png',
 appIcon:'assets/app-icon.png'
};
const FP4_img=(src,cls='',alt='')=>`<img class="${cls}" src="${src}" alt="${alt}">`;

function FP4_applyStaticAssets(){
 const favicon=document.querySelector('link[rel="icon"]')||document.head.appendChild(Object.assign(document.createElement('link'),{rel:'icon'}));
 favicon.href=FP4_ASSETS.appIcon;
 const task=$('#focusTask');if(task){const arrow=task.querySelector('span');if(arrow)arrow.innerHTML=FP4_img(FP4_ASSETS.tagArrow,'original-chevron','')}
 const menu=$('#menuBtn');if(menu){menu.classList.add('has-original-more');menu.style.backgroundImage=`url("${FP4_ASSETS.more}")`;menu.textContent=''}
 const sound=$('#soundBtn');if(sound){const old=sound.querySelector('span');if(old)old.innerHTML=FP4_img(state.settings.sound?FP4_ASSETS.sound:FP4_ASSETS.soundOff,'menu-original-icon','')}
 const duration=$('#durationPopover');if(duration&&!duration.querySelector('.original-picker-marker'))duration.insertAdjacentHTML('beforeend',FP4_img(FP4_ASSETS.pickerSelect,'original-picker-marker',''));
 const total=$('.stats-total-card img');if(total)total.src=FP4_ASSETS.tomatoData;
 const statBack=FP2_stats?.querySelector('.stats-back');if(statBack)statBack.innerHTML=FP4_img(FP4_ASSETS.backData,'original-icon','返回');
 const statPrev=FP2_stats?.querySelector('[data-stats-shift="-1"]');if(statPrev)statPrev.innerHTML=FP4_img(FP4_ASSETS.prevData,'original-icon','上一天');
 const statNext=FP2_stats?.querySelector('[data-stats-shift="1"]');if(statNext)statNext.innerHTML=FP4_img(dayStart(FP2_statsAnchor)>=dayStart(Date.now())?FP4_ASSETS.nextDataDisabled:FP4_ASSETS.nextData,'original-icon','下一天');
 const failedCopy=$('#fp2Failed')?.closest('.settings-row')?.querySelector('small');if(failedCopy)failedCopy.textContent='显示原版黄色放弃番茄；统计使用专用失败番茄图标';
}

function FP4_applyTimerAssets(){
 const a=state.active,pauseIcon=$('#pauseIcon'),finish=$('#finishBtn span');
 if(pauseIcon){pauseIcon.classList.add('original-control-icon');pauseIcon.innerHTML=FP4_img(a?.paused?FP4_ASSETS.resume:FP4_ASSETS.pause,'original-icon',a?.paused?'继续':'暂停')}
 if(finish){finish.classList.add('original-control-icon');finish.innerHTML=FP4_img(FP4_ASSETS.stop,'original-icon','结束')}
 const sound=$('#soundBtn .menu-original-icon');if(sound)sound.src=state.settings.sound?FP4_ASSETS.sound:FP4_ASSETS.soundOff;
}

function FP4_applyFruitRoles(){
 // Normal home/physics fruit: original ic_tomato; data-center and picker each use their dedicated rendition.
 FP2_FRUITS.tomato.src=FP4_ASSETS.tomato;FP2_FRUITS.tomato.small=FP4_ASSETS.tomatoSmall;
 const durationImg=$('#fp2DurationFruit img');if(durationImg&&state.settings.defaultFruit!=='pear')durationImg.src=FP4_ASSETS.tomatoInterval;
 const choices=$('#fp2FruitChoices');if(choices){
  const tomato=choices.querySelector('[data-fruit-choice="tomato"] img');if(tomato)tomato.src=FP4_ASSETS.tomatoConfig;
  const random=choices.querySelector('[data-fruit-choice="random"] img');if(random)random.src=FP4_ASSETS.tomatoConfig;
 }
}

const FP4_baseRenderTimer=renderTimer;
renderTimer=function(){FP4_baseRenderTimer();FP4_applyTimerAssets();FP4_applyStaticAssets();FP4_applyFruitRoles()};
const FP4_baseRenderSettings=FP2_renderSettings;
FP2_renderSettings=function(){FP4_baseRenderSettings();FP4_applyStaticAssets();FP4_applyFruitRoles()};
const FP4_baseRenderStats=FP2_renderStats;
FP2_renderStats=function(){FP4_baseRenderStats();FP4_applyStaticAssets();FP4_applyFruitRoles()};
const FP4_baseDurationPreview=FP2_updateDurationPreview;
FP2_updateDurationPreview=function(value){FP4_baseDurationPreview(value);const img=$('#fp2DurationFruit img');if(img&&(state.settings.defaultFruit||'tomato')!=='pear')img.src=FP4_ASSETS.tomatoInterval};

FP4_applyStaticAssets();FP4_applyFruitRoles();FP4_applyTimerAssets();
