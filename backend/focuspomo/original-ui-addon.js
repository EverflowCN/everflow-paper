/* FocusPomo 5.2.2 — exact extracted asset role mapping for the private web page. */
const FP4_data=(key,fallback)=>FP_ORIGINAL_ASSET_DATA[key]||fallback;
const FP4_MORE='data:image/svg+xml;utf8,'+encodeURIComponent('<svg width="20" height="4" viewBox="0 0 20 4" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="2" cy="2" r="2" fill="white"/><circle cx="10" cy="2" r="2" fill="white"/><circle cx="18" cy="2" r="2" fill="white"/></svg>');
const FP4_ASSETS={
 tomato:FP4_data('tomato','assets/tomato.png'),
 tomatoSmall:FP4_data('tomatoSmall','assets/tomato-small.png'),
 tomatoInterval:FP4_data('tomatoInterval',FP4_data('tomatoConfig','assets/tomato.png')),
 tomatoData:FP4_data('tomatoData',FP4_data('tomatoSmall','assets/tomato-small.png')),
 tomatoConfig:FP4_data('tomatoConfig',FP4_data('tomatoSmall','assets/tomato-small.png')),
 failedData:FP4_data('failedData',FP4_data('fail1','assets/fail_tomato1.svg')),
 pauseButton:FP4_data('pauseButton',''),pauseButtonDark:FP4_data('pauseButtonDark',''),resumeButton:FP4_data('resumeButton',''),resumeButtonDark:FP4_data('resumeButtonDark',''),stopButton:FP4_data('stopButton',''),stopButtonDark:FP4_data('stopButtonDark',''),
 pause:FP4_data('pause','assets/home-pause.svg'),resume:FP4_data('resume','assets/home-continue.svg'),stop:FP4_data('stop','assets/home-stop.svg'),
 pauseDark:FP4_data('pauseDark',FP4_data('pause','assets/home-pause.svg')),resumeDark:FP4_data('resumeDark',FP4_data('resume','assets/home-continue.svg')),stopDark:FP4_data('stopDark',FP4_data('stop','assets/home-stop.svg')),
 sound:FP4_data('sound',''),soundOff:FP4_data('soundOff',''),
 backData:FP4_data('backData',''),prevData:FP4_data('prevData',''),nextData:FP4_data('nextData',''),nextDataDisabled:FP4_data('nextDataDisabled',''),
 tagArrow:FP4_data('tagArrow',''),tagArrowDark:FP4_data('tagArrowDark',FP4_data('tagArrow','')),pickerSelect:FP4_data('pickerSelect',''),
 more:FP4_data('more',FP4_MORE),appIcon:FP4_data('appIcon','assets/app-icon.png'),
 addTag:FP4_data('addTag',''),editTag:FP4_data('editTag',''),removeTag:FP4_data('removeTag',''),newSession:FP4_data('newSession','')
};
const FP4_img=(src,cls='',alt='')=>src?`<img class="${cls}" src="${src}" alt="${alt}">`:'';
/* The native rendition follows the page's semantic theme, not the OS theme.
   Mobile Focus is deliberately rendered as the native light/orange surface. */
const FP4_isDark=()=>{if(page==='focus'){const c=state.settings.focusBackground;if(c){const n=parseInt(c.slice(1),16);return ((n>>16)*.299+((n>>8)&255)*.587+(n&255)*.114)<140}return innerWidth>1100}return win.classList.contains('theme-dark')};

function FP4_applyStaticAssets(){
 const favicon=document.querySelector('link[rel="icon"]')||document.head.appendChild(Object.assign(document.createElement('link'),{rel:'icon'}));favicon.href=FP4_ASSETS.appIcon;
 const task=$('#focusTask');if(task){const arrow=task.querySelector('span');if(arrow)arrow.innerHTML=FP4_img(FP4_isDark()?FP4_ASSETS.tagArrowDark:FP4_ASSETS.tagArrow,'original-chevron','')||'›'}
 const menu=$('#menuBtn');if(menu){menu.classList.add('has-original-more');menu.style.backgroundImage=`url("${FP4_ASSETS.more}")`;menu.textContent=''}
 const sound=$('#soundBtn');if(sound){const old=sound.querySelector('span');if(old)old.innerHTML=FP4_img(state.settings.sound?FP4_ASSETS.sound:FP4_ASSETS.soundOff,'menu-original-icon','')||'♫'}
 const duration=$('#durationPopover');if(duration&&!duration.querySelector('.original-picker-marker')&&FP4_ASSETS.pickerSelect)duration.insertAdjacentHTML('beforeend',FP4_img(FP4_ASSETS.pickerSelect,'original-picker-marker',''));
 const total=$('.stats-total-card img');if(total)total.src=FP4_ASSETS.tomatoData;
 const statBack=FP2_stats?.querySelector('.stats-back');if(statBack&&FP4_ASSETS.backData)statBack.innerHTML=FP4_img(FP4_ASSETS.backData,'original-icon','返回');
 const statPrev=FP2_stats?.querySelector('[data-stats-shift="-1"]');if(statPrev&&FP4_ASSETS.prevData)statPrev.innerHTML=FP4_img(FP4_ASSETS.prevData,'original-icon','上一天');
 const statNext=FP2_stats?.querySelector('[data-stats-shift="1"]');if(statNext){const src=dayStart(FP2_statsAnchor)>=dayStart(Date.now())?FP4_ASSETS.nextDataDisabled:FP4_ASSETS.nextData;if(src)statNext.innerHTML=FP4_img(src,'original-icon','下一天')}
 const statAdd=FP2_stats?.querySelector('.stats-add');if(statAdd&&FP4_ASSETS.newSession){statAdd.classList.add('original-new-session');statAdd.innerHTML=FP4_img(FP4_ASSETS.newSession,'original-icon','添加记录')}
 const failedCopy=$('#fp2Failed')?.closest('.settings-row')?.querySelector('small');if(failedCopy)failedCopy.textContent='显示原版黄色放弃番茄；统计页使用专用失败番茄';
}
function FP4_applyTimerAssets(){
 const a=state.active,dark=FP4_isDark(),pauseIcon=$('#pauseIcon'),finish=$('#finishBtn span');
 if(pauseIcon){const src=a?.paused?(dark?FP4_ASSETS.resumeButtonDark:FP4_ASSETS.resumeButton):(dark?FP4_ASSETS.pauseButtonDark:FP4_ASSETS.pauseButton);pauseIcon.classList.add('original-control-icon');pauseIcon.innerHTML=FP4_img(src,'original-icon',a?.paused?'继续':'暂停')}
 if(finish){finish.classList.add('original-control-icon');finish.innerHTML=FP4_img(dark?FP4_ASSETS.stopButtonDark:FP4_ASSETS.stopButton,'original-icon','结束')}
 const sound=$('#soundBtn .menu-original-icon');if(sound){const src=state.settings.sound?FP4_ASSETS.sound:FP4_ASSETS.soundOff;if(src)sound.src=src}
}
function FP4_applyFruitRoles(){
 FP2_FRUITS.tomato.src=FP4_ASSETS.tomato;FP2_FRUITS.tomato.small=FP4_ASSETS.tomatoSmall;
 if(typeof tomatoImage!=='undefined'&&tomatoImage.src!==FP4_ASSETS.tomato)tomatoImage.src=FP4_ASSETS.tomato;
 const durationImg=$('#fp2DurationFruit img');if(durationImg&&state.settings.defaultFruit!=='pear')durationImg.src=FP4_ASSETS.tomatoInterval;
 const choices=$('#fp2FruitChoices');if(choices){const tomato=choices.querySelector('[data-fruit-choice="tomato"] img');if(tomato)tomato.src=FP4_ASSETS.tomatoConfig;const random=choices.querySelector('[data-fruit-choice="random"] img');if(random)random.src=FP4_ASSETS.tomatoConfig}
}
function FP4_applyDataCenterFailed(){
 const detail=$('#fp2FruitDetail');if(!detail)return;
 detail.querySelectorAll('[data-fp2-session]').forEach(button=>{const row=state.sessions.find(r=>r.id===button.dataset.fp2Session);if(row?.outcome==='abandoned'&&(row.fruitType||'tomato')==='tomato'){const img=button.querySelector('img');if(img)img.src=FP4_ASSETS.failedData}});
}
function FP4_refreshNativeAssets(){FP4_applyStaticAssets();FP4_applyFruitRoles();FP4_applyTimerAssets();FP4_applyDataCenterFailed()}
const FP4_baseRenderTimer=renderTimer;renderTimer=function(){FP4_baseRenderTimer();FP4_applyTimerAssets();FP4_applyStaticAssets();FP4_applyFruitRoles()};
const FP4_baseRenderSettings=FP2_renderSettings;FP2_renderSettings=function(){FP4_baseRenderSettings();FP4_applyStaticAssets();FP4_applyFruitRoles()};
const FP4_baseRenderStats=FP2_renderStats;FP2_renderStats=function(){FP4_baseRenderStats();FP4_applyStaticAssets();FP4_applyFruitRoles();FP4_applyDataCenterFailed()};
const FP4_baseDurationPreview=FP2_updateDurationPreview;FP2_updateDurationPreview=function(value){FP4_baseDurationPreview(value);const img=$('#fp2DurationFruit img');if(img&&(state.settings.defaultFruit||'tomato')!=='pear')img.src=FP4_ASSETS.tomatoInterval};
addEventListener('resize',FP4_refreshNativeAssets,{passive:true});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',FP4_refreshNativeAssets);
FP4_refreshNativeAssets();
