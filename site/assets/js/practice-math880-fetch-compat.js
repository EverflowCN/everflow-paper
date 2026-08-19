(()=>{
'use strict';

// 880 · 24套仿真卷数据请求兼容层。
// 目的：不要再把 /data/... 固定到域名根目录。
// 当网站通过自定义域名、子目录或镜像发布时，绝对路径可能指向错误位置；
// 这里把仿真卷的数据请求改写为“相对当前页面回到站点根目录”的地址。
const nativeFetch=window.fetch.bind(window);
const siteRoot=new URL('../../../',window.location.href);
const PREFIX='/data/practice/';

window.__LL880_DATA_DEBUG__={
  build:'20260819-1124',
  page:window.location.href,
  siteRoot:siteRoot.href,
  rewritten:[]
};

window.fetch=function(input,init){
  try{
    const raw=(typeof input==='string'||input instanceof URL)
      ? String(input)
      : (input&&input.url)||'';

    if(raw.startsWith(PREFIX)){
      const target=new URL(raw.slice(1),siteRoot).href;
      window.__LL880_DATA_DEBUG__.rewritten.push({from:raw,to:target});

      if(typeof input==='string'||input instanceof URL){
        input=target;
      }else if(input instanceof Request){
        input=new Request(target,input);
      }
    }
  }catch(err){
    console.warn('LL880 fetch compatibility rewrite failed:',err);
  }
  return nativeFetch(input,init);
};
})();
