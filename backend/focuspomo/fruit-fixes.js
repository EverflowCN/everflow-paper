/* FocusPomo v2.1 interaction polish. Loaded after fruit-addon.js in the same module. */
const FP21_statsBack=FP2_stats?.querySelector('[data-go="focus"]');
if(FP21_statsBack)FP21_statsBack.onclick=()=>go('focus');

const FP21_baseRenderStats=FP2_renderStats;
FP2_renderStats=function(){
 FP21_baseRenderStats();
 const navLabel=FP2_stats?.querySelector('.stats-date-nav b');
 if(navLabel){
  const d=new Date(FP2_statsAnchor),today=dayStart(FP2_statsAnchor)===dayStart(Date.now());
  navLabel.textContent=today?'今天':`${d.getMonth()+1}月${d.getDate()}日`;
 }
};

/* Keep the full-screen duration picker visually tied to the chosen fruit. */
const FP21_baseDurationPreview=FP2_updateDurationPreview;
FP2_updateDurationPreview=function(value){
 FP21_baseDurationPreview(value);
 const box=$('#fp2DurationFruit');
 if(!box)return;
 const choice=state.settings.defaultFruit||'tomato';
 box.dataset.fruit=choice;
 box.setAttribute('aria-label',choice==='random'?'随机果物':FP2_fruit(choice).label);
};

/* Re-run once because the first add-on render happened before these final bindings. */
FP2_updateDurationPreview();
FP2_renderStats();
