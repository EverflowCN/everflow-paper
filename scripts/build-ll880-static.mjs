import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataPath = path.join(root, 'site/data/practice/math2-lilin880-24sets.json');
const htmlPath = path.join(root, 'site/study/practice/math-880/simulations.html');
const downloadDir = path.join(root, 'site/study/practice/math-880/downloads');
const downloadPath = path.join(downloadDir, 'll880-math2-24-papers.xls');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const sets = [...(data.sets || [])].sort((a, b) => a.number - b.number);

if (sets.length !== 24) throw new Error(`LL880: expected 24 sets, got ${sets.length}`);
for (const p of sets) {
  if ((p.questions || []).length !== 22) throw new Error(`LL880: paper ${p.number} expected 22 questions, got ${(p.questions || []).length}`);
}
if (sets.reduce((n, p) => n + p.questions.length, 0) !== 528) throw new Error('LL880: expected 528 mapped questions');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stripChapter = (s) => String(s || '').replace(/^第[一二三四五六七八九十]+章\s*/, '');

function searchText(p) {
  return [
    `第${p.number}套`, p.position, p.difficulty, p.relative, p.scoreRange, p.note,
    ...(p.questions || []).flatMap(q => [q.source, q.bPart, q.bSection, q.realExam, q.realType, q.method, q.level, q.qid])
  ].filter(Boolean).join(' ').toLowerCase();
}

function detailRows(p) {
  return p.questions.map(q => `<tr>
    <td>${esc(q.no)}</td>
    <td>${esc(q.source)}</td>
    <td>${esc(q.page)}</td>
    <td>${esc(q.bPart)}</td>
    <td>${esc(q.bSection)}</td>
    <td>${esc(q.realExam)}</td>
    <td>${esc(q.realType)}</td>
    <td>${esc(q.method)}</td>
    <td><span class="sim880-level">${esc(q.level)}</span></td>
    <td><code>${esc(q.qid)}</code></td>
  </tr>`).join('\n');
}

function cardHtml(p) {
  const tops = (p.topChapters || []).slice(0, 3).map(x => `<span>${esc(stripChapter(x.name))} ×${esc(x.count)}</span>`).join('');
  const abc = `A/B/C ${p.abc?.A ?? 0}/${p.abc?.B ?? 0}/${p.abc?.C ?? 0}`;
  return `<article class="sim880-card" data-paper="${esc(p.number)}" data-position="${esc(p.position)}" data-search="${esc(searchText(p))}">
    <header class="sim880-card-head">
      <div class="sim880-card-no"><span>PAPER ${String(p.number).padStart(2, '0')}</span><strong>第 ${String(p.number).padStart(2, '0')} 套</strong></div>
      <span class="sim880-difficulty">${esc(p.difficulty)}</span>
    </header>
    <div class="sim880-card-main"><h3>${esc(p.position)}</h3><p>${esc(p.relative)} · 合理得分 ${esc(p.scoreRange)}</p></div>
    <div class="sim880-score-band">
      <div><span>合格</span><strong>${esc(p.pass)}</strong></div>
      <div><span>目标</span><strong>${esc(p.target)}</strong></div>
      <div><span>优秀</span><strong>${esc(p.excellent)}</strong></div>
      <div><span>真题映射</span><strong>${esc(abc)}</strong></div>
    </div>
    <div class="sim880-card-tags"><span>B站 ${esc(p.bilibiliLocated)}</span><span>22题逐题回链</span>${tops}</div>
    <div class="sim880-record">
      <label class="sim880-field"><span>实得分</span><input inputmode="decimal" type="number" min="0" max="150" step="1" placeholder="—" data-score="${esc(p.number)}"></label>
      <label class="sim880-field"><span>用时/min</span><input inputmode="decimal" type="number" min="1" max="360" step="1" placeholder="—" data-time="${esc(p.number)}"></label>
    </div>
    <div class="sim880-eval" data-eval="${esc(p.number)}"><strong>未记录</strong><span>未记录</span></div>
    <details class="sim880-static-detail">
      <summary>查看 22 题逐题表</summary>
      <div class="sim880-detail-summary">
        <div><span>定位</span><strong>${esc(p.position)}</strong></div>
        <div><span>难度</span><strong>${esc(p.difficulty)}</strong></div>
        <div><span>合理得分</span><strong>${esc(p.scoreRange)}</strong></div>
        <div><span>合格 / 目标 / 优秀</span><strong>${esc(p.pass)} / ${esc(p.target)} / ${esc(p.excellent)}</strong></div>
        <div><span>真题映射 A/B/C</span><strong>${esc(p.abc?.A ?? 0)} / ${esc(p.abc?.B ?? 0)} / ${esc(p.abc?.C ?? 0)}</strong></div>
      </div>
      <div class="sim880-table-wrap"><table class="sim880-table">
        <thead><tr><th>#</th><th>880定位</th><th>书内页</th><th>B站</th><th>具体小节</th><th>真题对应</th><th>真题题型</th><th>具体考法</th><th>级别</th><th>QID</th></tr></thead>
        <tbody>${detailRows(p)}</tbody>
      </table></div>
    </details>
  </article>`;
}

let html = fs.readFileSync(htmlPath, 'utf8');
const cards = sets.map(cardHtml).join('\n');
const staticBlock = `<!-- LL880_STATIC_START -->\n${cards}\n<!-- LL880_STATIC_END -->`;
const dataJson = JSON.stringify({...data, sets}).replace(/</g, '\\u003c');
const dataBlock = `<!-- LL880_EMBED_START -->\n<script id="ll880-static-data" type="application/json">${dataJson}</script>\n<!-- LL880_EMBED_END -->`;

if (!html.includes('<!-- LL880_STATIC_START -->') || !html.includes('<!-- LL880_STATIC_END -->')) {
  throw new Error('LL880: simulations.html static markers missing');
}
if (!html.includes('<!-- LL880_EMBED_START -->') || !html.includes('<!-- LL880_EMBED_END -->')) {
  throw new Error('LL880: simulations.html embed markers missing');
}

html = html.replace(/<!-- LL880_STATIC_START -->[\s\S]*?<!-- LL880_STATIC_END -->/, staticBlock);
html = html.replace(/<!-- LL880_EMBED_START -->[\s\S]*?<!-- LL880_EMBED_END -->/, dataBlock);
fs.writeFileSync(htmlPath, html);

// Generate a static Excel-compatible SpreadsheetML file so downloading does not depend on browser JavaScript.
const xmlEsc = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cell = (v, style='') => `<Cell${style ? ` ss:StyleID="${style}"` : ''}><Data ss:Type="${typeof v === 'number' ? 'Number' : 'String'}">${xmlEsc(v)}</Data></Cell>`;
const row = (vals, header=false) => `<Row>${vals.map(v => cell(v, header ? 'Header' : '')).join('')}</Row>`;
const sheet = (name, rows) => `<Worksheet ss:Name="${xmlEsc(name)}"><Table>${rows.join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;

const detailHeader = ['卷号','卷内题号','QID','880定位','书内页码','B站分P','B站具体小节','真题对应','真题题型','具体考法','等级'];
const detailSheetRows = [row(detailHeader, true)];
sets.forEach(p => p.questions.forEach(q => detailSheetRows.push(row([p.number,q.no,q.qid,q.source,q.page,q.bPart,q.bSection,q.realExam,q.realType,q.method,q.level]))));
const paperSheetRows = [row(['卷号','定位','难度','相对真题','合理得分区间','合格线','目标分','优秀线','B站定位','A','B','C','高频章节','说明'], true), ...sets.map(p => row([p.number,p.position,p.difficulty,p.relative,p.scoreRange,p.pass,p.target,p.excellent,p.bilibiliLocated,p.abc?.A??0,p.abc?.B??0,p.abc?.C??0,(p.topChapters||[]).map(x=>`${x.name} ×${x.count}`).join('；'),p.note||'']))];
const scoreSheetRows = [row(['卷号','定位','难度','相对真题','合理得分区间','合格线','目标分','优秀线','说明'], true), ...sets.map(p => row([p.number,p.position,p.difficulty,p.relative,p.scoreRange,p.pass,p.target,p.excellent,p.note||'']))];
const examMap = new Map();
sets.forEach(p => p.questions.forEach(q => {
  const key = [q.realExam,q.realType,q.method,q.level].join('｜');
  const cur = examMap.get(key) || {realExam:q.realExam,realType:q.realType,method:q.method,level:q.level,count:0,papers:new Set(),qids:[]};
  cur.count++; cur.papers.add(p.number); cur.qids.push(q.qid); examMap.set(key,cur);
}));
const examSheetRows = [row(['真题对应','真题题型','具体考法','等级','映射次数','涉及套卷','QID'], true), ...[...examMap.values()].sort((a,b)=>b.count-a.count||String(a.realExam).localeCompare(String(b.realExam),'zh-CN')).map(x => row([x.realExam,x.realType,x.method,x.level,x.count,[...x.papers].sort((a,b)=>a-b).join('、'),x.qids.join('、')]))];

const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10"/></Style><Style ss:ID="Header"><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#EDEDED" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style></Styles>${sheet('01-24套逐题对照总表',detailSheetRows)}${sheet('02-24套卷画像',paperSheetRows)}${sheet('03-真题映射统计',examSheetRows)}${sheet('04-难度与分数标准',scoreSheetRows)}</Workbook>`;
fs.mkdirSync(downloadDir, {recursive:true});
fs.writeFileSync(downloadPath, '\ufeff' + xml, 'utf8');

console.log(`LL880 static build OK: ${sets.length} papers / ${sets.reduce((n,p)=>n+p.questions.length,0)} questions`);
console.log(`Wrote ${path.relative(root, htmlPath)}`);
console.log(`Wrote ${path.relative(root, downloadPath)}`);
