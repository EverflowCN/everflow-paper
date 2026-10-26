"""Persistent Everflow PDF worker.

Runs the same canonical renderer as GitHub Actions, but keeps XeLaTeX and fonts warm.
Authentication uses a dedicated shared worker secret; no Supabase service key is stored here.
"""
import concurrent.futures
import json
import os
import signal
import socket
import tempfile
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ENDPOINT=os.environ.get('EVERFLOW_PDF_ENDPOINT','https://xzodetdohinktagxuwhs.supabase.co/functions/v1/pdf-export')
WORKER_SECRET=os.environ.get('EVERFLOW_PDF_WORKER_SECRET','').strip()
CAPACITY=max(1,min(8,int(os.environ.get('PDF_WORKER_CAPACITY','2'))))
# Protect the Free-tier Edge Functions quota even when the host still provides 1.5s.
# Polling 1.5s while idle would exceed 1.7M invocations/month per worker.
POLL_SECONDS=max(20.0,float(os.environ.get('PDF_WORKER_POLL_SECONDS','30')))
HEARTBEAT_SECONDS=max(30.0,float(os.environ.get('PDF_WORKER_HEARTBEAT_SECONDS','30')))
MAX_IDLE_POLL_SECONDS=max(POLL_SECONDS,60.0)
RATE_LOCK=threading.Lock()
RATE_PAUSE_UNTIL=0.0
PORT=int(os.environ.get('PORT','8080'))
BUILD_SHA=os.environ.get('EVERFLOW_BUILD_SHA','unknown').strip() or 'unknown'
NODE_ID=os.environ.get('PDF_WORKER_NODE_ID','').strip() or socket.gethostname().replace(' ','-')[:64]
STOP=threading.Event()
STATE_LOCK=threading.Lock()
STATE={
    'active':0,
    'completed':0,
    'failed':0,
    'startedAt':time.time(),
    'lastClaimAt':None,
    'lastCompleteAt':None,
    'lastError':'',
}

def snapshot():
    with STATE_LOCK:
        return dict(STATE)

def update_state(**patch):
    with STATE_LOCK:
        STATE.update(patch)

def mark_job_started():
    with STATE_LOCK:
        STATE['active']=min(CAPACITY,STATE['active']+1)
        STATE['lastClaimAt']=time.time()
        return dict(STATE)

def mark_job_finished(success,error=''):
    with STATE_LOCK:
        STATE['active']=max(0,STATE['active']-1)
        if success:
            STATE['completed']+=1
            STATE['lastCompleteAt']=time.time()
            STATE['lastError']=''
        else:
            STATE['failed']+=1
            STATE['lastError']=str(error)[:1000]
        return dict(STATE)

def call(action,body=None,job=None,pdf=None):
    global RATE_PAUSE_UNTIL
    # During a provider-imposed restriction, skip the request entirely:
    # even rejected Edge Function invocations consume request traffic.
    with RATE_LOCK:
        retry_after=max(0.0,RATE_PAUSE_UNTIL-time.monotonic())
    if retry_after:
        raise RuntimeError(f'Backend temporarily restricted; retry in {retry_after:.0f}s')
    if not WORKER_SECRET:
        raise RuntimeError('EVERFLOW_PDF_WORKER_SECRET is required')
    url=ENDPOINT+'?action='+action
    if job:
        url+='&id='+job['id']+'&lease='+job['lease_token']
    data=pdf if pdf is not None else json.dumps(body or {}).encode()
    headers={
        'X-Everflow-Worker-Key':WORKER_SECRET,
        'Content-Type':'application/pdf' if pdf is not None else 'application/json',
    }
    req=urllib.request.Request(url,data=data,headers=headers,method='POST')
    try:
        with urllib.request.urlopen(req,timeout=90) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        if exc.code in (402,429):
            cooldown=3600.0 if exc.code==402 else 300.0
            with RATE_LOCK:
                RATE_PAUSE_UNTIL=max(RATE_PAUSE_UNTIL,time.monotonic()+cooldown)
            print(f'Worker paused after HTTP {exc.code} for {cooldown:.0f}s',flush=True)
        raise

def report_heartbeat(state=None):
    try:
        state=state or snapshot()
        call('heartbeat',{'id':NODE_ID,'capacity':CAPACITY,'active':state['active']})
    except Exception as exc:
        update_state(lastError=str(exc)[:1000])
        print('Heartbeat failed',str(exc)[:1200],flush=True)

def process(result):
    from render import resolve,render
    job=result['job']
    report_heartbeat(mark_job_started())
    try:
        questions=resolve(job['payload'],result['overrides'])
        call('update',{'status':'compiling'},job)
        with tempfile.TemporaryDirectory(prefix='exam-') as tmp:
            pdf=render(job['payload'],questions,Path(tmp))
            call('update',{'status':'storing'},job)
            call('upload',job=job,pdf=pdf.read_bytes())
        report_heartbeat(mark_job_finished(True))
        print('Completed',job['id'],len(questions),flush=True)
        return 0
    except Exception as exc:
        report_heartbeat(mark_job_finished(False,exc))
        print('Failed',job['id'],str(exc)[:2500],flush=True)
        try:
            call('update',{'status':'failed'},job)
        except Exception as update_error:
            print('Failed to mark job failed',job['id'],str(update_error)[:1200],flush=True)
        return 1

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path not in ('/','/healthz'):
            self.send_response(404);self.end_headers();return
        payload={
            'ok':True,
            'buildSha':BUILD_SHA,
            'capacity':CAPACITY,
            'uptimeSeconds':round(time.time()-STATE['startedAt']),
            **snapshot(),
        }
        data=json.dumps(payload,separators=(',',':')).encode()
        self.send_response(200)
        self.send_header('Content-Type','application/json')
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    def log_message(self,format,*args):
        return

def serve_health():
    server=ThreadingHTTPServer(('0.0.0.0',PORT),HealthHandler)
    server.timeout=1
    while not STOP.is_set():
        server.handle_request()
    server.server_close()

def heartbeat():
    while not STOP.is_set():
        report_heartbeat()
        STOP.wait(HEARTBEAT_SECONDS)

def shutdown(*_):
    STOP.set()

def main():
    if not WORKER_SECRET:
        raise SystemExit('EVERFLOW_PDF_WORKER_SECRET is required')
    signal.signal(signal.SIGTERM,shutdown)
    signal.signal(signal.SIGINT,shutdown)
    threading.Thread(target=serve_health,name='health',daemon=True).start()
    threading.Thread(target=heartbeat,name='heartbeat',daemon=True).start()
    next_cleanup=0.0
    print('Everflow persistent PDF worker online',{'node':NODE_ID,'buildSha':BUILD_SHA,'capacity':CAPACITY,'pollSeconds':POLL_SECONDS,'port':PORT},flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=CAPACITY,thread_name_prefix='pdf') as pool:
        futures=set()
        idle_delay=POLL_SECONDS
        while not STOP.is_set():
            done={f for f in futures if f.done()}
            for future in done:
                futures.remove(future)
                try:
                    future.result()
                except Exception as exc:
                    update_state(lastError=str(exc)[:1000])
                    print('Worker future crashed',str(exc)[:2000],flush=True)
            now=time.monotonic()
            with RATE_LOCK:
                paused_for=max(0.0,RATE_PAUSE_UNTIL-now)
            if paused_for:
                STOP.wait(min(paused_for,60.0))
                continue
            if now>=next_cleanup:
                try:
                    print('Cleanup',call('cleanup'),flush=True)
                except Exception as exc:
                    update_state(lastError=str(exc)[:1000])
                    print('Cleanup failed',str(exc)[:1200],flush=True)
                next_cleanup=now+1800
            claimed=False
            while len(futures)<CAPACITY and not STOP.is_set():
                try:
                    result=call('claim')
                except Exception as exc:
                    update_state(lastError=str(exc)[:1000])
                    print('Claim failed',str(exc)[:1200],flush=True)
                    break
                if not result.get('job'):
                    break
                claimed=True
                futures.add(pool.submit(process,result))
            if not claimed:
                idle_delay=min(MAX_IDLE_POLL_SECONDS,max(POLL_SECONDS,idle_delay*1.6))
                STOP.wait(idle_delay)
            else:
                idle_delay=POLL_SECONDS
        if futures:
            print('Shutdown requested; waiting for active PDF jobs',len(futures),flush=True)
            concurrent.futures.wait(futures,timeout=180)
    print('Everflow persistent PDF worker stopped',snapshot(),flush=True)

if __name__=='__main__':
    main()
