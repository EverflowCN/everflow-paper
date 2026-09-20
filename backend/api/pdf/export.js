import { handleOptions, json, requireTrustedOrigin } from '../../lib/common.js';
const EDGE='https://xzodetdohinktagxuwhs.supabase.co/functions/v1/pdf-export';
export default async function handler(req,res){
 if(handleOptions(req,res))return;
 if(!['GET','POST'].includes(req.method))return json(req,res,405,{error:'Method not allowed'});
 if(req.method==='POST'&&!requireTrustedOrigin(req,res))return;
 const authorization=String(req.headers.authorization||'');
 if(!authorization.startsWith('Bearer '))return json(req,res,401,{error:'请先登录后导出 PDF'});
 try{
  const id=String(req.query?.id||''),availability=String(req.query?.availability||''),admin=String(req.query?.admin||''),rawCount=String(req.query?.count||'40'),count=Math.max(1,Math.min(100,parseInt(rawCount,10)||40));
  const query=id?'?id='+encodeURIComponent(id):admin==='1'?'?admin=1':availability==='1'?('?availability=1&count='+count):'';
  const response=await fetch(EDGE+query,{
   method:req.method,headers:{Authorization:authorization,'Content-Type':'application/json'},
   ...(req.method==='POST'?{body:typeof req.body==='string'?req.body:JSON.stringify(req.body||{})}:{}),signal:AbortSignal.timeout(25000)
  });
  const body=await response.json();return json(req,res,response.status,body);
 }catch{return json(req,res,503,{error:'PDF 服务暂时不可用，请稍后重试'});}
}
