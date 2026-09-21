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

def external_css_reference(value):
    """Return True when CSS/attribute text references anything outside this SVG."""
    text=html.unescape(str(value or ''))
    if re.search(r'@import\b',text,flags=re.I):return True
    for match in re.finditer(r'url\(\s*([^)]+?)\s*\)',text,flags=re.I):
        target=match.group(1).strip().strip('"\'').strip()
        if not re.fullmatch(r'#[A-Za-z0-9_.:-]+',target):return True
    return False

def pipe_table_block(block):
    lines=[line.strip() for line in str(block or '').splitlines() if line.strip()]
    return len(lines)>=2 and sum(line.count('|')>=2 for line in lines)>=2

def code_like_block(block):
    lines=[line.strip() for line in str(block or '').splitlines() if line.strip()]
    if len(lines)<2:return False
    code_hits=sum(bool(re.search(r'[{};]|\b(?:while|for|if|return|void|int|boolean)\b|(?:==|&&|\+\+|--)',line)) for line in lines)
    return code_hits>=2

def list_like_block(block):
    lines=[line.strip() for line in str(block or '').splitlines() if line.strip()]
    if len(lines)<2:return False
    marker=re.compile(r'^(?:\(?\d+[）).、]|[①②③④⑤⑥⑦⑧⑨⑩]|(?:I|II|III|IV|V|VI|VII|VIII|IX|X)[、.．:：\s])')
    return sum(bool(marker.match(line)) for line in lines)>=2

def normalize_soft_breaks(value):
    """Treat single OCR/Markdown newlines as spaces, but preserve real blocks."""
    text=str(value or '').replace('\r\n','\n').replace('\r','\n').strip()
    if not text:return ''
    blocks=re.split(r'\n[ \t]*\n+',text)
    normalized=[]
    for block in blocks:
        lines=[line.strip() for line in block.split('\n') if line.strip()]
        if not lines:continue
        if pipe_table_block(block) or code_like_block(block) or list_like_block(block):
            normalized.append('\n'.join(lines))
        else:
            joined=' '.join(lines)
            joined=re.sub(r'\s+([、，。；：！？）】])',r'\1',joined)
            joined=re.sub(r'([（【、，；：])\s+',r'\1',joined)
            normalized.append(joined)
    return '\n\n'.join(normalized)

def prepared_stem(q):
    """Clean imported override formatting without changing semantic content."""
    text=str(q.get('stem','') or '')
    if q.get('figures') and q.get('options'):
        blocks=re.split(r'\n[ \t]*\n+',text.replace('\r\n','\n').replace('\r','\n'))
        # Single-choice imports sometimes append an OCR pipe-table while the
        # canonical figure already contains that same table. Never print both.
        blocks=[block for block in blocks if not pipe_table_block(block)]
        text='\n\n'.join(blocks)
    return normalize_soft_breaks(text)

def flatten_image_white(im):
    """Flatten alpha/transparency onto white so transparent diagrams never turn black."""
    if im.mode in ('RGBA','LA') or 'transparency' in im.info:
        rgba=im.convert('RGBA')
        white=Image.new('RGBA',rgba.size,(255,255,255,255))
        white.alpha_composite(rgba)
        return white.convert('RGB')
    return im.convert('RGB')

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
        plain=[];cursor=0
        for match in re.finditer(r'（[ \t\u3000]*）|\([ \t\u3000]*\)',part):
            plain.append(escape(part[cursor:match.start()]).replace('\n',r'\par '))
            token=match.group(0)
            prefix=part[:match.start()].rstrip()
            function_like=token.startswith('(') and bool(re.search(r'(?:[A-Za-z_][A-Za-z0-9_]*)(?:\.[A-Za-z_][A-Za-z0-9_]*)*$',prefix))
            plain.append(escape(token) if function_like else r'\blank{}')
            cursor=match.end()
        plain.append(escape(part[cursor:]).replace('\n',r'\par '))
        rendered=''.join(plain)
        # Canonical exam subitems should start their own paragraphs even when the
        # source stores them inline, e.g. “：I ...；II ...” or “：①...；②...”.
        # Restrict the trigger to sentence/list boundaries so I/O and option
        # summaries such as “仅 I、II、III” remain inline.
        marker=r'(?:I|II|III|IV|V|VI|VII|VIII|IX|X)(?=[、.．:： \t\u3000])|[①②③④⑤⑥⑦⑧⑨⑩]'
        rendered=re.sub(r'(^|[：:；;。！？!?])([ \t\u3000]*)(?='+marker+r')',lambda m:m.group(1)+r'\par ',rendered)
        out.append(rendered)
    return ''.join(out)

def choice_rich(s):
    """Render one choice without paragraph tokens.

    \fourchoices is a non-long macro: a literal \par inside any argument makes
    TeX stop scanning that argument. Stems may use paragraph breaks, choices may
    not. Keep the text but flatten generated paragraph separators to spaces.
    """
    return rich(s).replace(r'\par ',' ').strip()

def render_pipe_table(block):
    """Render Markdown/OCR pipe tables as a real wrapping LaTeX table."""
    rows=[]
    for line in str(block or '').splitlines():
        line=line.strip()
        if line.count('|')<2:continue
        cells=[cell.strip() for cell in line.strip('|').split('|')]
        if len(cells)<2:continue
        if cells and all(re.fullmatch(r':?-{2,}:?',cell or '') for cell in cells):continue
        rows.append(cells)
    if len(rows)<2:return rich(block)
    columns=max(len(row) for row in rows)
    rows=[row+['']*(columns-len(row)) for row in rows]
    size=r'\scriptsize' if columns>=5 else r'\small'
    preamble='|*{'+str(columns)+r'}{>{\centering\arraybackslash}X|}'
    body=[]
    for row in rows:
        body.append(' & '.join(choice_rich(cell) for cell in row)+r' \\ \hline')
    return (r'\par\noindent\begingroup '+size+
            r'\renewcommand{\arraystretch}{1.18}\setlength{\tabcolsep}{3pt}'+
            r'\begin{tabularx}{\linewidth}{'+preamble+r'}\hline '+
            ' '.join(body)+r'\end{tabularx}\endgroup\par ')

def render_structured_text(value):
    """Render prose normally while converting imported pipe tables to LaTeX."""
    text=str(value or '')
    if not text:return ''
    blocks=re.split(r'\n[ \t]*\n+',text)
    rendered=[]
    for block in blocks:
        if not block.strip():continue
        rendered.append(render_pipe_table(block) if pipe_table_block(block) else rich(block))
    return r'\par '.join(rendered)

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
    def figure(src,source,choice=False):
        nonlocal nimage
        data=fetch(asset_url(src,source));nimage+=1
        if b'<svg' in data[:1000]:
            import cairosvg
            from defusedxml import ElementTree
            tree=ElementTree.fromstring(data)
            for element in tree.iter():
                for key,value in element.attrib.items():
                    if key.endswith('href') and not re.fullmatch(r'#[A-Za-z0-9_.:-]+',str(value).strip()):raise ValueError('External SVG reference')
                    if external_css_reference(value):raise ValueError('External SVG style')
                if element.tag.endswith('style') and external_css_reference(element.text or ''):raise ValueError('External SVG CSS')
            data=cairosvg.svg2png(bytestring=data,output_width=1600,background_color='#ffffff')
        with Image.open(io.BytesIO(data)) as im:
            if im.width*im.height>40000000:raise ValueError('Image too large')
            ratio=im.width/max(1,im.height)
            flatten_image_white(im).save(dest/f'figure-{nimage}.png')
        name='figure-'+str(nimage)+'.png'
        if choice:
            return r'\includegraphics[width=.72\linewidth,height=.18\textheight,keepaspectratio]{'+name+'}'
        if ratio>=1.8:
            geometry=r'width=.90\linewidth,height=.34\textheight'
        elif ratio>=1.1:
            geometry=r'width=.72\linewidth,height=.34\textheight'
        else:
            geometry=r'width=.58\linewidth,height=.38\textheight'
        return '\n'+r'\par\begin{center}\includegraphics['+geometry+']{'+name+r'}\end{center}'+'\n'
    for q in questions:
        source=q['_source']; options=q.get('options',{})
        if isinstance(options,list):options={str(v.get('key','ABCD'[i])):v.get('text','') for i,v in enumerate(options)}
        fallback=source=='relax' and q.get('questionImages') and (q.get('imageFallback') or any(re.search(r'\ufffd|\?\s*\?',str(v)) for v in [q.get('stem',''),*options.values()]))
        body='' if fallback else render_structured_text(prepared_stem(q))
        figs=q.get('figures',[]) if source=='zhenti' else [{'src':v} for v in q.get('questionImages',[])]
        option_figs={}
        for f in figs:
            is_option=bool(f.get('option') and f.get('option') in 'ABCD')
            try:img=figure(f['src'],source,choice=is_option)
            except Exception as error:raise ValueError(q['_id']+' figure '+str(f.get('src',''))+': '+str(error)) from error
            if is_option:option_figs[f['option']]=option_figs.get(f['option'],'')+img
            else:body+=img
        if not fallback and options:
            body+='\n'+r'\fourchoices'+''.join('{'+choice_rich(options.get(k,''))+option_figs.get(k,'')+'}' for k in 'ABCD')
        if not body.strip():raise ValueError('Empty question '+q['_id'])
        chunks.append(r'\begin{bbox}\qitem '+body+answer_space+'\n'+r'\end{bbox}')
    (dest/'questions.tex').write_text('\n\n'.join(chunks),encoding='utf8')
    for _ in range(2):
        result=subprocess.run(['xelatex','-no-shell-escape','-halt-on-error','-interaction=nonstopmode','paper.tex'],cwd=dest,env={**__import__('os').environ,'openin_any':'p','openout_any':'p'},capture_output=True,timeout=120)
        if result.returncode:
            raise RuntimeError(result.stdout.decode(errors='replace')[-2200:])
    return dest/'paper.pdf'
