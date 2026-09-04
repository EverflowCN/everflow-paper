const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

const ITEM_MARKER=/^(?:（\d{1,2}）|\(\d{1,2}\)|[IVX]{1,4}[.．、]|[①②③④⑤⑥⑦⑧⑨⑩])/;

function structuredText(value){
  let text=String(value??'').replace(/\r\n?/g,'\n').trim();
  const fullNumbers=text.match(/(?:^|[：:；;。？！?\s])（\d{1,2}）/g)||[];
  if(fullNumbers.length>=2&&/（1）/.test(text)&&/（2）/.test(text))text=text.replace(/([：:；;。？！?])[ \t]*(（\d{1,2}）)/g,'$1\n$2');
  const halfNumbers=text.match(/(?:^|[：:；;。？！?\s])\(\d{1,2}\)/g)||[];
  if(halfNumbers.length>=2&&/\(1\)/.test(text)&&/\(2\)/.test(text))text=text.replace(/([：:；;。？！?])[ \t]*(\(\d{1,2}\))/g,'$1\n$2');
  const romans=text.match(/(?:^|[：:；;。？！?\s])(?:IV|IX|V?I{1,3}|X)[.．、]/g)||[];
  if(romans.length>=2){
    text=text.replace(/([：:；;。？！?])[ \t]*((?:IV|IX|V?I{1,3}|X)[.．、])/g,'$1\n$2');
    text=text.replace(/([。；])(?=正确的是|正确的有)/g,'$1\n');
  }
  const circles=text.match(/[①②③④⑤⑥⑦⑧⑨⑩]/g)||[];
  if(circles.length>=2)text=text.replace(/([：:；;。？！?])[ \t]*([①②③④⑤⑥⑦⑧⑨⑩])(?!的)/g,'$1\n$2');
  return text.replace(/\n{3,}/g,'\n\n');
}

function lineHtml(line){
  const clean=line.trim();
  if(!clean)return'';
  const marker=clean.match(ITEM_MARKER)?.[0]||'';
  if(!marker)return`<span class="question-text-line">${escapeHtml(clean)}</span>`;
  return`<span class="question-item-line"><b class="question-item-marker">${escapeHtml(marker)}</b><span>${escapeHtml(clean.slice(marker.length).trim())}</span></span>`;
}

function richText(value,{fallback=''}={}){
  const text=structuredText(value)||structuredText(fallback);
  if(!text)return'';
  return text.split(/\n{2,}/).map(block=>`<p>${block.split('\n').map(lineHtml).join('')}</p>`).join('');
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

const api=Object.freeze({escapeHtml,structuredText,richText,inlineText,verification});
window.EveraQuestionContent=api;
export{escapeHtml,structuredText,richText,inlineText,verification};
