"""GitHub OIDC worker: no persistent cloud/service key in repository secrets."""
import concurrent.futures,json,os,tempfile,threading,time,urllib.request,urllib.parse
from pathlib import Path

ENDPOINT='https://xzodetdohinktagxuwhs.supabase.co/functions/v1/pdf-export'
CAPACITY=2
_oidc_token=''
_oidc_until=0.0
_oidc_lock=threading.Lock()

def oidc():
    global _oidc_token,_oidc_until
    with _oidc_lock:
        if _oidc_token and time.monotonic()<_oidc_until:
            return _oidc_token
        req=urllib.request.Request(
            os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']+'&audience=everflow-pdf-worker',
            headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']}
        )
        with urllib.request.urlopen(req,timeout=30) as r:
            _oidc_token=json.load(r)['value']
        _oidc_until=time.monotonic()+240
        return _oidc_token

def call(action,body=None,job=None,pdf=None):
    url=ENDPOINT+'?action='+action
    if job:url+='&id='+job['id']+'&lease='+job['lease_token']
    data=pdf if pdf is not None else json.dumps(body or {}).encode()
    req=urllib.request.Request(
        url,data=data,
        headers={'Authorization':'Bearer '+oidc(),'Content-Type':'application/pdf' if pdf is not None else 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req,timeout=90) as r:return json.load(r)

def process(result):
    from render import resolve,render
    job=result['job']
    try:
        questions=resolve(job['payload'],result['overrides'])
        call('update',{'status':'compiling'},job)
        with tempfile.TemporaryDirectory(prefix='exam-') as tmp:
            pdf=render(job['payload'],questions,Path(tmp))
            call('update',{'status':'storing'},job)
            call('upload',job=job,pdf=pdf.read_bytes())
        print('Completed',job['id'],len(questions),flush=True)
        return 0
    except Exception as e:
        print('Failed',job['id'],str(e)[:2500],flush=True)
        try:call('update',{'status':'failed'},job)
        except Exception as update_error:print('Failed to mark job failed',job['id'],str(update_error)[:1200],flush=True)
        return 1

def main():
    # Bound each run; expired leases safely recover after runner termination.
    until=time.monotonic()+1200
    failures=0
    processed=0
    with concurrent.futures.ThreadPoolExecutor(max_workers=CAPACITY,thread_name_prefix='pdf') as pool:
        while processed<30 and time.monotonic()<until:
            batch=[]
            for _ in range(min(CAPACITY,30-processed)):
                result=call('claim')
                if not result.get('job'):break
                batch.append(result)
            if not batch:break
            futures=[pool.submit(process,result) for result in batch]
            for future in concurrent.futures.as_completed(futures):
                try:failures+=int(future.result())
                except Exception as e:
                    failures+=1
                    print('Worker thread crashed',str(e)[:2500],flush=True)
            processed+=len(batch)
    print('Worker summary',{'processed':processed,'failures':failures,'capacity':CAPACITY},flush=True)
    if failures:raise SystemExit(f'{failures} PDF jobs failed')

if __name__=='__main__':main()
