import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = path.join(ROOT, 'site');
const DATA = path.join(SITE, 'data', 'zhenti');
const YEARS = Array.from({ length: 18 }, (_, i) => 2009 + i);
const EXTRA_YEARS = new Set([2010, 2011, 2012, 2013, 2014, 2017, 2018, 2020, 2021, 2022, 2025]);

function readJson(file, optional = false) {
  if (!fs.existsSync(file)) {
    if (optional) return null;
    throw new Error(`missing file: ${path.relative(ROOT, file)}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function mergeQuestionSets(...sources) {
  const merged = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [number, patch] of Object.entries(source)) {
      const previous = merged[number] || {};
      merged[number] = {
        ...previous,
        ...patch,
        verification: {
          ...(previous.verification || {}),
          ...(patch?.verification || {})
        }
      };
    }
  }
  return merged;
}

function issue(year, q, code, detail = '') {
  return { year, q, key: `${year}-${q}`, code, detail };
}

function localFigurePath(src) {
  if (!String(src || '').startsWith('/data/zhenti/assets/')) return null;
  return path.join(SITE, String(src).replace(/^\//, ''));
}

const report = {
  generatedAt: new Date().toISOString(),
  range: '2009-2026',
  expectedQuestions: YEARS.length * 47,
  checkedQuestions: 0,
  healthyQuestions: 0,
  years: {},
  failures: [],
  figureFailures: [],
  externalFigures: []
};

for (const year of YEARS) {
  const base = readJson(path.join(DATA, `${year}.json`));
  const supplement = readJson(path.join(DATA, 'supplement', `${year}.json`), true);
  const extra = EXTRA_YEARS.has(year)
    ? readJson(path.join(DATA, 'supplement', `${year}-extra.json`), true)
    : null;

  const paper = {
    ...base,
    questions: mergeQuestionSets(base?.questions, supplement?.questions, extra?.questions)
  };

  const yearFailures = [];
  let healthy = 0;
  let verified = 0;
  let figures = 0;

  for (let q = 1; q <= 47; q++) {
    report.checkedQuestions++;
    const item = paper.questions?.[String(q)];
    const problems = [];

    if (!item) {
      problems.push(issue(year, q, 'missing-question', '最终合并数据中不存在该题'));
    } else {
      if (item.verification?.status === 'verified') verified++;
      else problems.push(issue(year, q, 'not-verified', String(item.verification?.status || 'missing')));

      if (!String(item.stem || '').trim()) {
        problems.push(issue(year, q, 'empty-stem', '题干为空'));
      }

      const isChoice = item.type === 'single' || q <= 40;
      if (isChoice) {
        const options = item.options && typeof item.options === 'object' ? item.options : null;
        const keys = options ? Object.keys(options) : [];
        if (!options || keys.length < 4) {
          problems.push(issue(year, q, 'missing-options', `选项数=${keys.length}`));
        }
        const answer = String(item.answer || '').trim();
        if (!answer) {
          problems.push(issue(year, q, 'empty-answer', '选择题答案为空'));
        } else if (options && !(answer in options)) {
          problems.push(issue(year, q, 'invalid-answer', `答案=${answer}，但不在选项中`));
        }
      } else if (!String(item.answer || '').trim()) {
        problems.push(issue(year, q, 'empty-answer', '综合题参考答案为空'));
      }

      const figs = Array.isArray(item.figures) ? item.figures : [];
      for (const fig of figs) {
        figures++;
        const src = String(fig?.src || '').trim();
        if (!src) {
          const f = issue(year, q, 'empty-figure-src', 'figures 中 src 为空');
          problems.push(f);
          report.figureFailures.push(f);
          continue;
        }
        const local = localFigurePath(src);
        if (local) {
          if (!fs.existsSync(local)) {
            const f = issue(year, q, 'missing-local-figure', src);
            problems.push(f);
            report.figureFailures.push(f);
          }
        } else if (/^https:\/\//i.test(src)) {
          report.externalFigures.push({ year, q, key: `${year}-${q}`, src });
        } else if (!/^data:image\//i.test(src)) {
          const f = issue(year, q, 'unsupported-figure-src', src);
          problems.push(f);
          report.figureFailures.push(f);
        }
      }
    }

    if (problems.length === 0) {
      healthy++;
      report.healthyQuestions++;
    } else {
      yearFailures.push(...problems);
      report.failures.push(...problems);
    }
  }

  report.years[String(year)] = {
    expected: 47,
    mergedCount: Object.keys(paper.questions || {}).length,
    verified,
    healthy,
    figures,
    failureCount: yearFailures.length,
    badQuestions: [...new Set(yearFailures.map(x => x.q))]
  };
}

report.summary = {
  allHealthy: report.healthyQuestions === report.expectedQuestions && report.figureFailures.length === 0,
  healthy: report.healthyQuestions,
  unhealthy: report.expectedQuestions - report.healthyQuestions,
  failureEntries: report.failures.length,
  localFigureFailures: report.figureFailures.length,
  externalFigureRefs: report.externalFigures.length
};

const out = path.join(DATA, 'audit-report.json');
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`408 audit: ${report.healthyQuestions}/${report.expectedQuestions} healthy`);
for (const [year, info] of Object.entries(report.years)) {
  if (info.failureCount) console.log(`${year}: healthy=${info.healthy}/47 bad=${info.badQuestions.join(',')}`);
}
console.log(`report: ${path.relative(ROOT, out)}`);
