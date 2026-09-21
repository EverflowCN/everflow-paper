#!/usr/bin/env python3
import csv, json, shutil, hashlib
from pathlib import Path

SRC = Path(".relax-source/站点")
OUT = Path("package/Relax1000-Everflow-Final")
DATA = SRC / "data" / "questions.json"
QIMG = SRC / "question-images"
EXPL = SRC / "explanations"

if not DATA.is_file():
    raise SystemExit(f"missing {DATA}")

raw = json.loads(DATA.read_text(encoding="utf-8"))
questions = raw.get("questions") or []
if not isinstance(questions, list) or not questions:
    raise SystemExit("questions.json has no questions")

def norm_paths(v):
    out=[]
    if isinstance(v,str):
        out=[v]
    elif isinstance(v,list):
        for x in v:
            if isinstance(x,str): out.append(x)
            elif isinstance(x,dict):
                for k in ("src","url","path","file"):
                    if isinstance(x.get(k),str):
                        out.append(x[k]); break
    elif isinstance(v,dict):
        for k in ("src","url","path","file"):
            if isinstance(v.get(k),str):
                out.append(v[k]); break
    return [x.replace("\\","/").lstrip("./") for x in out if x]

def resolve_asset(p):
    clean=p.split("?",1)[0].split("#",1)[0].lstrip("/")
    candidates=[
        SRC/clean,
        SRC/"question-images"/Path(clean).name,
        SRC/"explanations"/Path(clean).name,
    ]
    # common published prefix
    if clean.startswith("data/relax1000/"):
        candidates.insert(0, SRC/clean[len("data/relax1000/"):])
    for c in candidates:
        if c.is_file(): return c
    return None

OUT.mkdir(parents=True, exist_ok=True)
(OUT/"data").mkdir(exist_ok=True)
(OUT/"assets").mkdir(exist_ok=True)

if QIMG.exists():
    shutil.copytree(QIMG, OUT/"assets"/"question-images", dirs_exist_ok=True)
if EXPL.exists():
    shutil.copytree(EXPL, OUT/"assets"/"explanations", dirs_exist_ok=True)

normalized=[]
rows=[]
missing=[]
counts={
    "questions":len(questions),
    "with_answer":0,
    "with_explanation":0,
    "with_question_images":0,
    "with_explanation_images":0,
    "question_image_refs":0,
    "explanation_image_refs":0,
}
ids=set()
dupes=[]

for i,q in enumerate(questions,1):
    qid=str(q.get("id") or "")
    if qid in ids: dupes.append(qid)
    ids.add(qid)
    qi=norm_paths(q.get("questionImages"))
    ei=norm_paths(q.get("explanationImages"))
    if q.get("answer") not in (None,""): counts["with_answer"]+=1
    if str(q.get("explanation") or "").strip(): counts["with_explanation"]+=1
    if qi: counts["with_question_images"]+=1
    if ei: counts["with_explanation_images"]+=1
    counts["question_image_refs"]+=len(qi)
    counts["explanation_image_refs"]+=len(ei)

    q_missing=[]
    for kind,paths in (("question",qi),("explanation",ei)):
        for p in paths:
            resolved=resolve_asset(p)
            exists=bool(resolved)
            if not exists:
                q_missing.append({"kind":kind,"path":p})
                missing.append({"id":qid,"kind":kind,"path":p})
            rows.append({
                "id":qid,
                "subjectId":q.get("subjectId",""),
                "subject":q.get("subject",""),
                "chapterId":q.get("chapterId",""),
                "chapter":q.get("chapter",""),
                "number":q.get("number",""),
                "imageKind":kind,
                "imagePath":p,
                "exists":"yes" if exists else "no",
            })
    normalized.append({
        "id":qid,
        "subjectId":q.get("subjectId"),
        "subject":q.get("subject"),
        "chapterId":q.get("chapterId"),
        "chapter":q.get("chapter"),
        "number":q.get("number"),
        "stem":q.get("stem"),
        "options":q.get("options"),
        "answer":q.get("answer"),
        "explanation":q.get("explanation"),
        "questionPdfPage":q.get("questionPdfPage"),
        "answerPdfPage":q.get("answerPdfPage"),
        "questionImages":qi,
        "explanationImages":ei,
        "missingAssets":q_missing,
    })

payload={
    "schema":"everflow-relax1000-final-v1",
    "meta":{
        "title":raw.get("meta",{}).get("title") or raw.get("title") or "Relax1000",
        "questionCount":len(normalized),
        "description":"Everflow current Relax1000 corpus packaged with answers, explanations and referenced images.",
    },
    "questions":normalized,
}
(OUT/"data"/"questions_complete.json").write_text(
    json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8"
)
shutil.copy2(DATA, OUT/"data"/"questions_original.json")

with (OUT/"data"/"question_image_map.csv").open("w",encoding="utf-8-sig",newline="") as f:
    w=csv.DictWriter(f,fieldnames=["id","subjectId","subject","chapterId","chapter","number","imageKind","imagePath","exists"])
    w.writeheader(); w.writerows(rows)

all_asset_files=[]
for root in (OUT/"assets"/"question-images", OUT/"assets"/"explanations"):
    if root.exists():
        all_asset_files.extend([p for p in root.rglob("*") if p.is_file()])
image_ext={".png",".jpg",".jpeg",".webp",".gif",".svg",".bmp",".avif"}
image_files=[p for p in all_asset_files if p.suffix.lower() in image_ext]

audit={
    **counts,
    "duplicate_ids":dupes,
    "missing_asset_refs":missing,
    "packaged_asset_files":len(all_asset_files),
    "packaged_image_files":len(image_files),
}
(OUT/"data"/"audit_report.json").write_text(
    json.dumps(audit,ensure_ascii=False,indent=2),encoding="utf-8"
)

readme=f"""# Relax1000 · Everflow 最终整理包

本包从 Everflow 当前使用的 Relax1000 源语料整理生成，包含：

- data/questions_complete.json：题目、选项、答案、解析、题图/解析图引用
- data/questions_original.json：源题库 JSON 原样备份
- data/question_image_map.csv：每道题与题目图片/解析图片的对应关系
- data/audit_report.json：题目、答案、解析和图片完整性检查
- assets/question-images/：题目图片
- assets/explanations/：解析相关资源

统计：
- 题目：{counts['questions']}
- 有答案：{counts['with_answer']}
- 有解析：{counts['with_explanation']}
- 含题图题目：{counts['with_question_images']}
- 含解析图题目：{counts['with_explanation_images']}
- 题图引用：{counts['question_image_refs']}
- 解析图引用：{counts['explanation_image_refs']}
- 缺失图片引用：{len(missing)}
- 打包图片文件：{len(image_files)}

说明：这是 Everflow 当前源题库的整理包，不包含通过绕过 408os 登录/权限获取的受保护内容。
"""
(OUT/"README.md").write_text(readme,encoding="utf-8")

# hashes for integrity
hashes=[]
for p in sorted([x for x in OUT.rglob("*") if x.is_file()]):
    h=hashlib.sha256(p.read_bytes()).hexdigest()
    hashes.append(f"{h}  {p.relative_to(OUT).as_posix()}")
(OUT/"SHA256SUMS.txt").write_text("\n".join(hashes)+"\n",encoding="utf-8")

print(json.dumps(audit,ensure_ascii=False,indent=2))
