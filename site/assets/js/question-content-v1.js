const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

function richText(value,{fallback=''}={}){
  const text=String(value??'').replace(/\r\n?/g,'\n').trim()||fallback;
  if(!text)return'';
  return text.split(/\n{2,}/).map(block=>`<p>${escapeHtml(block).replace(/\n/g,'<br>')}</p>`).join('');
}

function inlineText(value,{fallback=''}={}){
  const text=String(value??'').replace(/\r\n?/g,'\n').trim()||fallback;
  return escapeHtml(text).replace(/\n/g,'<br>');
}

function verification(value){
  const status=String(value?.status||'');
  const mode=String(value?.mode||'').toLowerCase();
  if(status!=='verified')return{tier:'pending',label:'待核验',note:'题干与答案尚未完成来源核验'};
  if(/original-paper|original-scan|original-question-screenshot|public-paper-transcription|table-transcription|instruction-transcription/.test(mode))return{tier:'original',label:'原卷核验',note:'已按原卷、扫描件或原题截图核对'};
  if(/paraphrase/.test(mode))return{tier:'paraphrase',label:'转述核对',note:'答案已交叉核对，题干仍待原卷逐字复核'};
  return{tier:'structural',label:'结构核验',note:'题号、选项与答案结构已核对'};
}

const api=Object.freeze({escapeHtml,richText,inlineText,verification});
window.EveraQuestionContent=api;
export{escapeHtml,richText,inlineText,verification};
