"""GitHub OIDC worker: no persistent cloud/service key in repository secrets."""
import json,os,tempfile,time,urllib.request,urllib.parse
from pathlib import Path
ENDPOINT='https://xzodetdohinktagxuwhs.supabase.co/functions/v1/pdf-export'
def oidc():
    req=urllib.request.Request(os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']+'&audience=everflow-pdf-worker',headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
    with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)['value']
def call(action,body=None,job=None,pdf=None):
    url=ENDPOINT+'?action='+action
    if job:url+='&id='+job['id']+'&lease='+job['lease_token']
    data=pdf if pdf is not None else json.dumps(body or {}).encode()
    req=urllib.request.Request(url,data=data,headers={'Authorization':'Bearer '+oidc(),'Content-Type':'application/pdf' if pdf is not None else 'application/json'},method='POST')
    with urllib.request.urlopen(req,timeout=90) as r:return json.load(r)
def main():
    from render import resolve,render
    # Bound each run; expired leases safely recover after runner termination.
    until=time.monotonic()+1200
    for _ in range(30):
        if time.monotonic()>until:break
        result=call('claim');job=result.get('job')
        if not job:break
        try:
            questions=resolve(job['payload'],result['overrides'])
            call('update',{'status':'compiling'},job)
            with tempfile.TemporaryDirectory(prefix='exam-') as tmp:
                pdf=render(job['payload'],questions,Path(tmp))
                call('update',{'status':'storing'},job)
                call('upload',job=job,pdf=pdf.read_bytes())
            print('Completed',job['id'],len(questions))
        except Exception as e:
            print('Failed',job['id'],str(e)[:2500])
            call('update',{'status':'failed'},job)
if __name__=='__main__':main()
