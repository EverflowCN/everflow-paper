import fs from 'node:fs';
import path from 'node:path';

const rootArg=process.argv.find(arg=>arg.startsWith('--site-root='));
const SITE=path.resolve(rootArg?rootArg.slice('--site-root='.length):'site');
const FILE=path.join(SITE,'data','relax1000','data','questions.json');
if(!fs.existsSync(FILE))throw new Error(`missing Relax corpus: ${FILE}`);

const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
const byId=new Map((data.questions||[]).map(question=>[question.id,question]));
const option=(key,text)=>({key,text});
const patches={
  'ds-6-48':{
    options:[option('A','n+1'),option('B','n-1'),option('C','n × m'),option('D','见原题图中的表达式')]
  },
  'ds-7-55':{
    stem:'在做 m 路平衡归并排序的过程中，为实现输入、内部归并和输出并行处理，需要设置多少个输入缓冲区和输出缓冲区？',
    options:[
      option('A','输入 2 个，输出 2 个'),
      option('B','输入 m 个，输出 m 个'),
      option('C','输入 2m-1 个，输出 2m-1 个'),
      option('D','输入 2m 个，输出 2 个')
    ],
    answer:'D'
  },
  'co-4-27':{
    options:[option('A','D159H'),option('B','2025H'),option('C','4045H'),option('D','D134H')]
  },
  'co-4-28':{
    stem:'假设某指令的一个操作数采用变址寻址，变址寄存器中的值为 1000H，地址 1000H 中的内容为 0002H，指令给出的形式地址为 2022H，地址 2022H 中的内容为 2048H，那么该操作数的有效地址为（ ）。',
    options:[option('A','2050H'),option('B','3022H'),option('C','3048H'),option('D','204AH')]
  },
  'os-4-4':{
    options:[
      option('A','文件目录是索引节点的有序集合'),
      option('B','文件目录和索引节点无联系'),
      option('C','文件目录中分为文件名和索引节点'),
      option('D','索引节点中有文件的控制信息')
    ]
  },
  'cn-1-37':{
    stem:'TCP/IP 参考模型中，哪一组层次依次完成主机到主机通信、物理网络细节处理，以及提供 HTTP、FTP 等用户应用协议？',
    options:[
      option('A','应用层 / 运输层 / 网际层'),
      option('B','运输层 / 网际层 / 网络接口层'),
      option('C','网际层 / 网络接口层 / 应用层'),
      option('D','网络接口层 / 应用层 / 运输层')
    ],
    answer:'C'
  }
};

for(const [id,patch] of Object.entries(patches)){
  const question=byId.get(id);
  if(!question)throw new Error(`Relax normalization target missing: ${id}`);
  Object.assign(question,patch,{integrityFix:'everflow-20260825-bank1'});
}

for(const question of data.questions||[]){
  if(!Array.isArray(question.options))continue;
  const keys=new Set(question.options.map(item=>String(item?.key||'')));
  if(question.options.length===4&&keys.size===4&&[...keys].every(key=>'ABCD'.includes(key))){
    question.options.sort((left,right)=>'ABCD'.indexOf(left.key)-'ABCD'.indexOf(right.key));
  }
}

data.meta={...(data.meta||{}),integrityVersion:'20260825-bank1'};
fs.writeFileSync(FILE,`${JSON.stringify(data)}\n`,'utf8');
console.log(`Relax corpus normalized: ${Object.keys(patches).length} known option defects repaired`);
