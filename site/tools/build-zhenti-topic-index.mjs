import fs from 'node:fs';
import vm from 'node:vm';

// Use the same complete-question selection as the reader, including original-source priority.
const overlay=fs.readFileSync('site/assets/js/zhenti-data-overlay.js','utf8');
const resolver=overlay.slice(overlay.indexOf('  function isVerified('),overlay.indexOf('  function mergeQuestionSets('));
const resolve=vm.runInNewContext(`${resolver};resolveQuestion`);
const rules={
  ds:[['排序',/排序|快排|归并|冒泡|希尔/],['查找',/查找|散列|哈希|B\s*[+＋-]?\s*树|平衡二叉|AVL|红黑树/],['串',/KMP|模式匹配|字符串匹配|next\s*\[/i],['图',/有向图|无向图|邻接|最短路径|最短路|生成树|拓扑|Dijkstra|Prim|Kruskal|顶点|弧数/],['树与二叉树',/二叉树|森林|哈夫曼|Huffman|树的|树中|孩子|叶结点/],['栈、队列和数组',/队列|栈|数组|矩阵|三元组/],['线性表',/链表|线性表|顺序表|链式/],['绪论与复杂度',/复杂度|算法|循环|递归/]],
  co:[['总线',/总线|仲裁/],['输入/输出系统',/DMA|中断|外设|I\/O|输入.*输出|磁盘|打印机/i],['中央处理器',/流水|数据通路|控制信号|单周期|多周期|微程序|冒险|CPI/i],['存储系统',/cache|缓存|主存|存储器|DRAM|SRAM|页表|虚拟地址|交叉编址|TLB/i],['指令系统',/指令|寻址|操作码|寄存器/],['数据的表示和运算',/补码|原码|反码|移码|浮点|IEEE|溢出|加法|乘法|除法|short|int\b|小端|大端|符号扩展/i],['计算机系统概述',/计算机|性能|机器语言|编译|解释|字长/]],
  os:[['同步与互斥',/信号量|互斥|同步|临界区|管程|生产者|消费者|哲学家|P\s*\(|V\s*\(/],['死锁',/死锁|银行家|安全序列/],['处理机调度',/调度|时间片|周转时间|短作业|优先级/],['内存管理',/页|内存|分段|段表|TLB|LRU|地址转换|工作集/i],['文件管理',/文件|目录|inode|i-node|FCB|FAT|磁盘块/i],['I/O 管理',/磁盘|设备|缓冲|SPOOL|I\/O|输入.*输出/i],['进程与线程',/进程|线程|fork|PCB/i],['操作系统概述',/操作系统|系统调用|内核|中断|异常|用户态|核心态/]],
  cn:[['应用层',/HTTP|DNS|FTP|SMTP|POP3|邮件|域名|万维网/i],['网络层',/路由|子网|IP地址|IP 地址|IPv[46]|NAT|CIDR|ARP|ICMP|OSPF|RIP|数据报.*分片/i],['传输层',/TCP|UDP|拥塞|端口|三次握手/i],['数据链路层',/以太网|CSMA|MAC|交换机|网桥|帧|海明|CRC|检错|纠错|后退.*N|选择重传/i],['物理层',/奈奎斯特|香农|波特|码元|调制|信噪比|曼彻斯特|物理层/i],['计算机网络体系结构',/分组交换|电路交换|协议|体系|OSI|时延|传播|带宽/i]]
};
const years={};
let classified=0,pending=0;
for(let year=2009;year<=2026;year++){
  const read=suffix=>{const p=`site/data/zhenti/${suffix}.json`;return fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')).questions:{};};
  const layers=[read(year),read(`supplement/${year}`),read(`supplement/${year}-extra`)];
  years[year]={};
  for(let q=1;q<=47;q++){
    const item=resolve(...layers.map(layer=>layer[q]));
    const text=String(item?.stem||'');
    const explicit=item?.chapter;
    const chapter=rules[item?.subject]?.find(([name,re])=>explicit?name===explicit:re.test(text))?.[0]||(!explicit?rules[item?.subject]?.find(([,re])=>re.test(String(item?.analysis||'')))?.[0]:null)||'待归类';
    years[year][q]=chapter;
    chapter==='待归类'?pending++:classified++;
  }
}
const output=JSON.stringify({schema:'everflow.zhenti.topic-index.v1',version:'20260905-topics1',method:'stem-rules-reviewable',years})+'\n';
const file='site/data/zhenti/topic-index.json';
if(process.argv.includes('--check')){
  if(fs.readFileSync(file,'utf8')!==output)throw new Error('Topic index is stale');
}else fs.writeFileSync(file,output);
console.log(`Topic index: ${classified} rule-classified, ${pending} pending review, ${classified+pending} total`);
