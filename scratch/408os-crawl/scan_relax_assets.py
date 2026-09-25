from __future__ import annotations
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path("crawl-output")
OUT.mkdir(exist_ok=True)
BASE="https://www.408os.cn/assets/"
CLIENT_ID="81801dbd7d3e4bf46db8f49e3ad633c7"
ASSETS=[
  "WdQuestionBankView-CgcCsQHd.js",
  "questionPoolKnowledge-BASYEiHs.js",
  "ExerciseView-CRQhg_W5.js",
  "questionQueue-B_qIMaUm.js",
  "wdQuestionContent-BjLFBb8n.js",
  "Home-Di1zkAr-.js",
  "question-DFXEhh1s.js",
  "index-nAlE06Kf.js",
]
KEYWORDS=[
  "relax1000","relax","sourceTypes","sourceType","题海","题库","1000题",
  "/api/zt/question-bank","/api/zt/question/","question-bank/wd",
  "requiredAnyFeature","wd_question_bank"
]
URL_RE=re.compile(r'https?://[^"\'\s)]+|/api/[A-Za-z0-9_?&=./:%{}$-]+')
report={"assets":[],"anonymous_gets":[]}

def snippets(txt,term,window=600,limit=20):
    out=[]; start=0; low=txt.lower(); needle=term.lower()
    while len(out)<limit:
        i=low.find(needle,start)
        if i<0: break
        out.append(txt[max(0,i-window):min(len(txt),i+len(term)+window)])
        start=i+len(term)
    return out

with sync_playwright() as p:
    req=p.request.new_context(extra_http_headers={
      "Accept":"application/json,text/plain,*/*",
      "Referer":"https://www.408os.cn/dashboard",
      "Origin":"https://www.408os.cn",
      "clientId":CLIENT_ID,
    })
    for name in ASSETS:
        item={"name":name,"url":BASE+name,"matches":{},"endpoints":[]}
        try:
            r=req.get(BASE+name,timeout=30000); txt=r.text()
            item["status"]=r.status; item["bytes"]=len(txt.encode("utf-8"))
            (OUT/f"static-{name}").write_text(txt,encoding="utf-8")
            item["endpoints"]=list(dict.fromkeys(URL_RE.findall(txt)))[:300]
            for k in KEYWORDS:
                ss=snippets(txt,k)
                if ss:item["matches"][k]=ss
        except Exception as e:item["error"]=repr(e)
        report["assets"].append(item)

    # Reproduce only normal anonymous read-only requests: public clientId, no cookie/token.
    tests=[
      ("wd_map_no_params","https://api.408os.cn/api/zt/question-bank/wd/map"),
      ("wd_map_relax1000","https://api.408os.cn/api/zt/question-bank/wd/map?sourceTypes=RELAX1000"),
      ("pool_no_params","https://api.408os.cn/api/zt/question-bank/pool"),
      ("pool_relax1000","https://api.408os.cn/api/zt/question-bank/pool?sourceTypes=RELAX1000"),
    ]
    for label,url in tests:
        row={"label":label,"url":url}
        try:
            r=req.get(url,timeout=20000); body=r.text()
            row.update({"status":r.status,"content_type":r.headers.get("content-type",""),"body":body[:4000]})
        except Exception as e:row["error"]=repr(e)
        report["anonymous_gets"].append(row)
    req.dispose()

(OUT/"relax-static-scan.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(report,ensure_ascii=False,indent=2))
