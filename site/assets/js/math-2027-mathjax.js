/* 2027-only formula renderer; does not import the archived 2022–2026 Math II paper library. */
let loader=null;
const CDNS=[
 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg-full.js',
 'https://unpkg.com/mathjax@3.2.2/es5/tex-svg-full.js'
];
function script(src){
 return new Promise((resolve,reject)=>{
  const el=document.createElement('script');el.src=src;el.async=true;
  el.onload=()=>resolve();el.onerror=()=>{el.remove();reject(new Error('MathJax unavailable from '+src))};
  document.head.appendChild(el);
 });
}
async function ready(){
 if(globalThis.MathJax?.typesetPromise)return globalThis.MathJax;
 if(loader)return loader;
 globalThis.MathJax={
  tex:{inlineMath:[['$','$'],['\\(','\\)']],displayMath:[['$$','$$'],['\\[','\\]']],processEscapes:true,packages:{'[+]':['ams','boldsymbol']}},
  svg:{fontCache:'global'},startup:{typeset:false}
 };
 loader=(async()=>{
  let last;for(const src of CDNS){try{await script(src);if(globalThis.MathJax?.typesetPromise)return globalThis.MathJax}catch(e){last=e}}
  throw last||new Error('MathJax could not initialize');
 })().catch(error=>{loader=null;throw error});
 return loader;
}
export async function typeset(node){
 if(!node||!node.isConnected)return;
 try{
  const mj=await ready();if(!node.isConnected)return;
  mj.typesetClear?.([node]);await mj.typesetPromise([node]);
  const width=node.clientWidth||0;
  if(width)node.querySelectorAll('mjx-container').forEach(el=>el.classList.toggle('math-wide-formula',el.getBoundingClientRect().width>width-4));
 }catch(error){if(node.isConnected)node.dataset.mathRenderError='true';console.warn('2027模拟卷 MathJax 渲染失败，已保留 LaTeX 原文',error)}
}
