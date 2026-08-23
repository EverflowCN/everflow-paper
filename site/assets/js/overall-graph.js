(()=>{
  const svg=document.querySelector('[data-graph-svg]');
  const world=document.querySelector('[data-graph-world]');
  const viewport=document.querySelector('[data-graph-viewport]');
  if(!svg||!world||!viewport)return;

  try{if(localStorage.getItem('everflow-theme')==='dark')document.body.classList.add('dark')}catch{}

  const NS='http://www.w3.org/2000/svg';
  const root={id:'408',label:'408',x:900,y:550};
  const subjects=[
    {id:'ds',short:'DS',label:'数据结构',color:'#e84b55',x:520,y:310,children:[
      ['ds_intro','绪论与复杂度',180,100],['ds_linear','线性表',420,90],['ds_stack','栈·队列·数组',660,120],['ds_string','串',160,250],['ds_tree','树与二叉树',700,250],['ds_graph','图',170,430],['ds_search','查找',420,500],['ds_sort','排序',690,440]
    ]},
    {id:'co',short:'CO',label:'计算机组成原理',color:'#df7a31',x:1280,y:310,children:[
      ['co_intro','系统概述',1140,120],['co_data','数据表示与运算',1380,90],['co_memory','存储系统',1620,100],['co_isa','指令系统',1100,250],['co_cpu','中央处理器',1640,250],['co_bus','总线',1110,440],['co_io','输入/输出系统',1380,500]
    ]},
    {id:'os',short:'OS',label:'操作系统',color:'#765ccf',x:520,y:790,children:[
      ['os_intro','操作系统概述',170,660],['os_process','进程与线程',420,610],['os_schedule','处理机调度',690,660],['os_sync','同步与互斥',160,820],['os_deadlock','死锁',700,820],['os_memory','内存管理',180,1000],['os_file','文件管理',420,1010],['os_io','I/O管理',690,980]
    ]},
    {id:'cn',short:'CN',label:'计算机网络',color:'#168ea5',x:1280,y:790,children:[
      ['cn_intro','体系结构',1110,650],['cn_phy','物理层',1380,610],['cn_link','数据链路层',1630,660],['cn_network','网络层',1100,830],['cn_transport','传输层',1380,970],['cn_app','应用层',1630,830]
    ]}
  ];

  const nodes=new Map([[root.id,root]]);
  subjects.forEach(s=>{nodes.set(s.id,s);s.children.forEach(([id,label,x,y])=>nodes.set(id,{id,label,x,y,subject:s.id,color:s.color}))});

  const make=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));return el};
  const curve=(a,b,bend=.16)=>{
    const dx=b.x-a.x,dy=b.y-a.y;
    const c1={x:a.x+dx*.45-dy*bend,y:a.y+dy*.45+dx*bend};
    const c2={x:a.x+dx*.55+dy*bend,y:a.y+dy*.55-dx*bend};
    return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
  };

  const edges=make('g',{'aria-hidden':'true'}),nodeLayer=make('g');
  world.append(edges,nodeLayer);

  subjects.forEach((s,index)=>{
    const p=make('path',{d:curve(root,s,index%2?-.035:.035),class:'graph-edge'});p.style.stroke=s.color;p.style.opacity='.42';p.style.strokeWidth='5';edges.appendChild(p);
    s.children.forEach(([id])=>{const child=nodes.get(id);const e=make('path',{d:curve(s,child,.035),class:'graph-edge'});e.style.stroke=s.color;e.style.opacity='.25';edges.appendChild(e)});
  });

  const crossLinks=[
    ['co_memory','os_memory'],
    ['co_io','os_io'],
    ['co_cpu','os_process'],
    ['ds_graph','cn_network']
  ];
  crossLinks.forEach(([aId,bId])=>{const a=nodes.get(aId),b=nodes.get(bId);edges.appendChild(make('path',{d:curve(a,b,.03),class:'graph-edge cross'}))});

  function rootNode(n){
    const g=make('g',{class:'graph-node root',transform:`translate(${n.x} ${n.y})`});
    g.appendChild(make('circle',{r:66}));
    const text=make('text',{x:0,y:2});text.textContent=n.label;g.appendChild(text);return g;
  }
  function subjectNode(n){
    const g=make('g',{class:'graph-node subject',transform:`translate(${n.x} ${n.y})`});
    const rect=make('rect',{x:-112,y:-44,width:224,height:88,rx:27});rect.style.fill=n.color;g.appendChild(rect);
    const short=make('text',{class:'short',x:0,y:-17});short.textContent=n.short;g.appendChild(short);
    const text=make('text',{x:0,y:14});text.textContent=n.label;g.appendChild(text);return g;
  }
  function leafNode(n){
    const width=Math.max(164,Math.min(224,n.label.length*26+42));
    const g=make('g',{class:'graph-node leaf',transform:`translate(${n.x} ${n.y})`});
    const rect=make('rect',{x:-width/2,y:-31,width,height:62,rx:20});rect.style.stroke=n.color;rect.style.strokeOpacity='.32';g.appendChild(rect);
    const text=make('text',{x:0,y:1});text.textContent=n.label;g.appendChild(text);return g;
  }

  nodeLayer.appendChild(rootNode(root));
  subjects.forEach(s=>{nodeLayer.appendChild(subjectNode(s));s.children.forEach(([id])=>nodeLayer.appendChild(leafNode(nodes.get(id))))});

  const HOME={x:0,y:0,w:1800,h:1100};
  let view={...HOME};
  const minW=620,maxW=3600;
  function apply(){svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`)}
  function clampWidth(w){return Math.max(minW,Math.min(maxW,w))}
  function zoomAt(clientX,clientY,factor){
    const rect=svg.getBoundingClientRect();
    const nx=(clientX-rect.left)/rect.width,ny=(clientY-rect.top)/rect.height;
    const worldX=view.x+nx*view.w,worldY=view.y+ny*view.h;
    const nextW=clampWidth(view.w*factor),ratio=nextW/view.w,nextH=view.h*ratio;
    view={x:worldX-nx*nextW,y:worldY-ny*nextH,w:nextW,h:nextH};apply();
  }
  function zoomCenter(factor){const r=svg.getBoundingClientRect();zoomAt(r.left+r.width/2,r.top+r.height/2,factor)}
  function fit(){view={...HOME};apply()}

  svg.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,Math.exp(e.deltaY*.0012))},{passive:false});

  const pointers=new Map();
  let dragStart=null,pinchStart=null;
  function resetGesture(){
    const values=[...pointers.values()];
    if(values.length===1){dragStart={p:{...values[0]},v:{...view}};pinchStart=null}
    else if(values.length>=2){
      const [a,b]=values;const dx=b.x-a.x,dy=b.y-a.y;
      const rect=svg.getBoundingClientRect();const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      const nx=(mx-rect.left)/rect.width,ny=(my-rect.top)/rect.height;
      pinchStart={dist:Math.hypot(dx,dy),v:{...view},worldX:view.x+nx*view.w,worldY:view.y+ny*view.h};dragStart=null;
    }else{dragStart=null;pinchStart=null;viewport.classList.remove('dragging')}
  }
  svg.addEventListener('pointerdown',e=>{svg.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});viewport.classList.add('dragging');resetGesture()});
  svg.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const values=[...pointers.values()],rect=svg.getBoundingClientRect();
    if(values.length===1&&dragStart){
      const p=values[0];view={...dragStart.v,x:dragStart.v.x-(p.x-dragStart.p.x)*dragStart.v.w/rect.width,y:dragStart.v.y-(p.y-dragStart.p.y)*dragStart.v.h/rect.height};apply();
    }else if(values.length>=2&&pinchStart){
      const [a,b]=values;const dist=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y));
      const nextW=clampWidth(pinchStart.v.w*pinchStart.dist/dist),ratio=nextW/pinchStart.v.w,nextH=pinchStart.v.h*ratio;
      const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,nx=(mx-rect.left)/rect.width,ny=(my-rect.top)/rect.height;
      view={x:pinchStart.worldX-nx*nextW,y:pinchStart.worldY-ny*nextH,w:nextW,h:nextH};apply();
    }
  });
  const release=e=>{pointers.delete(e.pointerId);resetGesture()};
  svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);svg.addEventListener('lostpointercapture',release);
  svg.addEventListener('dblclick',e=>zoomAt(e.clientX,e.clientY,.72));

  document.querySelector('[data-graph-in]')?.addEventListener('click',()=>zoomCenter(.78));
  document.querySelector('[data-graph-out]')?.addEventListener('click',()=>zoomCenter(1.28));
  document.querySelector('[data-graph-fit]')?.addEventListener('click',fit);
  document.querySelector('[data-graph-back]')?.addEventListener('click',()=>{if(history.length>1)history.back();else location.href='/study/'});
  apply();
})();
