"""Canonical question -> body-only XeLaTeX. No client-supplied TeX is executed."""
import html,json,re,shutil,subprocess,urllib.request,urllib.parse,urllib.error,io
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
SITE='https://evera.top'
CLOUD='https://xzodetdohinktagxuwhs.supabase.co'
MATH_COMMANDS=set('frac dfrac tfrac sqrt sum prod int iint iiint lim limits nolimits infty left right big Big bigg Bigg cdot times div pm mp le leq ge geq ne neq approx equiv sim cong in notin subset subseteq supset supseteq cup cap emptyset varnothing forall exists neg land lor to gets mapsto rightarrow leftarrow Rightarrow Leftrightarrow Longrightarrow iff implies dots cdots ldots vdots ddots alpha beta gamma delta epsilon varepsilon theta vartheta lambda mu nu pi rho sigma tau phi varphi chi psi omega Gamma Delta Theta Lambda Pi Sigma Phi Psi Omega log ln lg sin cos tan cot exp min max det rank dim gcd mod bmod pmod text mathrm mathbf mathit mathcal mathbb operatorname overline underline vec hat bar tilde dot ddot substack displaystyle textstyle quad qquad space begin end cases matrix pmatrix bmatrix vmatrix Vmatrix aligned array hline color'.split())
def fetch(url,limit=20000000):
    p=urllib.parse.urlparse(url)
    if p.scheme!='https' or p.netloc not in ('evera.top','xzodetdohinktagxuwhs.supabase.co'):raise ValueError('Untrusted asset host')
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*args):raise ValueError('Asset redirect refused')
    with urllib.request.build_opener(NoRedirect).open(url,timeout=40) as r:
        data=r.read(limit+1)
    if len(data)>limit:raise ValueError('Asset too large')
    return data

def escape(s):
    table={'\\':r'\textbackslash{}','{':r'\{','}':r'\}','$':r'\$','&':r'\&','#':r'\#','%':r'\%','_':r'\_','^':r'\textasciicircum{}','~':r'\textasciitilde{}'}
    symbols={'→':r'\ensuremath{\to}','←':r'\ensuremath{\leftarrow}','×':r'\ensuremath{\times}','μ':r'\ensuremath{\mu}','−':r'\ensuremath{-}','≤':r'\ensuremath{\le}','≥':r'\ensuremath{\ge}','∞':r'\ensuremath{\infty}','∈':r'\ensuremath{\in}','≠':r'\ensuremath{\ne}','√':r'\ensuremath{\surd}','Σ':r'\ensuremath{\Sigma}','α':r'\ensuremath{\alpha}','β':r'\ensuremath{\beta}','≫':r'\ensuremath{\gg}'}
    return ''.join(symbols.get(c,table.get(c,c)) for c in str(s))

def rich(s):
    s=html.unescape(str(s or ''))
    s=re.sub(r'<br\s*/?>|</p\s*>','\n',s,flags=re.I)
    s=re.sub(r'</?(?:p|div|span|b|strong|em|i|u)(?:\s[^>]*)?>','',s,flags=re.I)
    out=[]
    for part in re.split(r'(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))',s):
        if part.startswith(('$',r'\[',r'\(')):
            commands=re.findall(r'\\([A-Za-z]+)',part)
            # Reject unsafe commands, ^^ escapes and comments even in trusted corpus patches.
            if all(c in MATH_COMMANDS for c in commands) and '^^' not in part and '%' not in part and all(e in {'cases','matrix','pmatrix','bmatrix','vmatrix','Vmatrix','aligned','array'} for e in re.findall(r'\\(?:begin|end)\{([^}]+)\}',part)):
                out.append(part);continue
        plain=[]
        for token in re.split(r'(（[ \t\u3000]*）)',part):
            if token is None:
                continue
            if re.fullmatch(r'（[ \t\u3000]*）',token):
                plain.append(r'\blank{}')
            else:
                plain.append(escape(token).replace('\n',r'\par '))
        out.append(''.join(plain))
    return ''.join(out)

def evidence_rank(q):
    if q.get('verification',{}).get('status')!='verified':return 0
    mode=q.get('verification',{}).get('mode','').lower()
    if re.search('original-paper|original-scan|original-question-screenshot|public-paper-transcription|table-transcription|instruction-transcription',mode):return 3
    return 1 if 'paraphrase' in mode else 2

def merge_layers(layers):
    merged={}
    for layer in layers:
        for number,q in layer.get('questions',{}).items():
            if number not in merged or evidence_rank(q)>evidence_rank(merged[number]):merged[number]=q
    return {'questions':merged}

def load_year(year):
    layers=[json.loads(fetch(SITE+'/data/zhenti/'+year+'.json'))]
    for suffix in [year,year+'-extra']:
        try:layers.append(json.loads(fetch(SITE+'/data/zhenti/supplement/'+suffix+'.json')))
        except urllib.error.HTTPError as e:
            if e.code!=404:raise
    return merge_layers(layers)

def resolve(payload,overrides):
    cache={}; patches={(r['bank'],r['entity_id']):r['patch'] for r in overrides}; out=[]
    for ref in payload['questions']:
        source,id=ref['source'],ref['id']
        if source=='zhenti':
            year,number=id.split('-'); key='/data/zhenti/'+year+'.json'
            if key not in cache:cache[key]=load_year(year)
            q=cache[key]['questions'].get(number)
            if not q or q.get('verification',{}).get('status')!='verified':raise ValueError('Unverified question '+id)
            q={**q,**patches.get(('zhenti',id),{})}
        else:
            key='/data/relax1000/data/questions.json'
            if key not in cache:cache[key]={q['id']:q for q in json.loads(fetch(SITE+key))['questions']}
            if id not in cache[key]:raise ValueError('Unknown question '+id)
            q={**cache[key][id],**patches.get(('relax1000',id),{})}
        out.append({**q,'_source':source,'_id':id})
    return out

def asset_url(src,source):
    if src.startswith(CLOUD+'/storage/v1/object/public/question-assets/'):return src
    if src.startswith('https://evera.top/'):return src
    if src.startswith('/'):
        if not src.startswith(('/data/','/question-images/','/assets/')):raise ValueError('Invalid asset path')
        return SITE+src
    if source=='relax':return SITE+'/data/relax1000/'+src.removeprefix('./')
    raise ValueError('Invalid figure')

def render(payload,questions,dest):
    dest=Path(dest);shutil.copytree(ROOT/'tools/pdf/template',dest,dirs_exist_ok=True)
    gap='0.45\\baselineskip'
    answer_space='' if payload['layout']=='compact' else r'\par\vspace*{25mm}'
    (dest/'settings.tex').write_text(r'\def\PaperTitle{'+escape(payload['title'])+'}\n'+r'\def\EverflowExamQuestionGap{'+gap+'}\n',encoding='utf8')
    chunks=[];nimage=0
    def figure(src,source):
        nonlocal nimage
        data=fetch(asset_url(src,source));nimage+=1
        if b'<svg' in data[:1000]:
            import cairosvg
            from defusedxml import ElementTree
            tree=ElementTree.fromstring(data)
            for element in tree.iter():
                for key,value in element.attrib.items():
                    if key.endswith('href') and not value.startswith('#'):raise ValueError('External SVG reference')
                    if re.search(r'url\(\s*[\"\']?(?!#)',value):raise ValueError('External SVG style')
                if element.tag.endswith('style') and re.search(r'@import|url\(',element.text or ''):raise ValueError('External SVG CSS')
            data=cairosvg.svg2png(bytestring=data,output_width=1600)
        with Image.open(io.BytesIO(data)) as im:
            if im.width*im.height>40000000:raise ValueError('Image too large')
            im.convert('RGB').save(dest/f'figure-{nimage}.png')
        return '\n'+r'\par\begin{center}\includegraphics[width=.88\linewidth,height=.48\textheight,keepaspectratio]{figure-'+str(nimage)+r'.png}\end{center}'+'\n'
    for q in questions:
        source=q['_source']; options=q.get('options',{})
        if isinstance(options,list):options={str(v.get('key','ABCD'[i])):v.get('text','') for i,v in enumerate(options)}
        fallback=source=='relax' and q.get('questionImages') and (q.get('imageFallback') or any(re.search(r'\ufffd|\?\s*\?',str(v)) for v in [q.get('stem',''),*options.values()]))
        body='' if fallback else rich(q.get('stem',''))
        figs=q.get('figures',[]) if source=='zhenti' else [{'src':v} for v in q.get('questionImages',[])]
        option_figs={}
        for f in figs:
            img=figure(f['src'],source)
            if f.get('option') and f.get('option') in 'ABCD':option_figs[f['option']]=option_figs.get(f['option'],'')+img
            else:body+=img
        if not fallback and options:
            body+='\n'+r'\fourchoices'+''.join('{'+rich(options.get(k,''))+option_figs.get(k,'')+'}' for k in 'ABCD')
        if not body.strip():raise ValueError('Empty question '+q['_id'])
        chunks.append(r'\begin{bbox}\qitem '+body+answer_space+'\n'+r'\end{bbox}')
    (dest/'questions.tex').write_text('\n\n'.join(chunks),encoding='utf8')
    for _ in range(2):
        result=subprocess.run(['xelatex','-no-shell-escape','-halt-on-error','-interaction=nonstopmode','paper.tex'],cwd=dest,env={**__import__('os').environ,'openin_any':'p','openout_any':'p'},capture_output=True,timeout=120)
        if result.returncode:
            raise RuntimeError(result.stdout.decode(errors='replace')[-2200:])
    return dest/'paper.pdf'
