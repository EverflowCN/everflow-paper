import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = path.join(ROOT, 'site');
const DATA = path.join(SITE, 'data', 'zhenti');
const YEARS = Array.from({ length: 18 }, (_, i) => 2009 + i);
const VALID_SUBJECTS = new Set(['ds', 'co', 'os', 'cn']);

function readJson(file, optional = false) {
  if (!fs.existsSync(file)) {
    if (optional) return null;
    throw new Error(`missing file: ${path.relative(ROOT, file)}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isVerified(question) {
  return question?.verification?.status === 'verified';
}

// Base-year JSON is authoritative. A supplement is a whole-question fallback only
// when base does not yet contain a verified version of that question. Extra is the
// final fallback. This mirrors the frontend loader and prevents stale supplements
// from overriding newer verified base entries.
function resolveQuestion(baseQuestion, supplementQuestion, extraQuestion) {
  if (isVerified(baseQuestion)) return baseQuestion;
  if (isVerified(supplementQuestion)) return supplementQuestion;
  if (isVerified(extraQuestion)) return extraQuestion;
  return baseQuestion || supplementQuestion || extraQuestion || null;
}

function mergeQuestionSets(base, supplement, extra) {
  const merged = {};
  const numbers = new Set([
    ...Object.keys(base || {}),
    ...Object.keys(supplement || {}),
    ...Object.keys(extra || {})
  ]);
  for (const number of numbers) {
    const question = resolveQuestion(base?.[number], supplement?.[number], extra?.[number]);
    if (question) merged[number] = question;
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

const manifest = readJson(path.join(DATA, 'manifest.json'));
const report = {
  generatedAt: new Date().toISOString(),
  range: '2009-2026',
  expectedQuestions: YEARS.length * 47,
  checkedQuestions: 0,
  healthyQuestions: 0,
  years: {},
  failures: [],
  figureFailures: [],
  manifestFailures: [],
  externalFigures: []
};

for (const year of YEARS) {
  const base = readJson(path.join(DATA, `${year}.json`));
  const supplement = readJson(path.join(DATA, 'supplement', `${year}.json`), true);
  const extra = readJson(path.join(DATA, 'supplement', `${year}-extra.json`), true);

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
      if (isVerified(item)) verified++;
      else problems.push(issue(year, q, 'not-verified', String(item.verification?.status || 'missing')));

      if (!String(item.stem || '').trim()) {
        problems.push(issue(year, q, 'empty-stem', '题干为空'));
      }

      if (!VALID_SUBJECTS.has(item.subject)) {
        problems.push(issue(year, q, 'missing-or-invalid-subject', String(item.subject || 'missing')));
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

  const manifestYear = manifest?.years?.[String(year)];
  const expectedNumbers = Array.from({ length: 47 }, (_, i) => i + 1);
  const manifestProblems = [];
  if (!manifestYear) {
    manifestProblems.push({ year, code: 'manifest-year-missing' });
  } else {
    if (manifestYear.questionCount !== 47) {
      manifestProblems.push({ year, code: 'manifest-question-count', detail: String(manifestYear.questionCount) });
    }
    if (manifestYear.contentStatus !== 'verified' || manifestYear.paperStatus !== 'verified') {
      manifestProblems.push({ year, code: 'manifest-status', detail: `${manifestYear.paperStatus}/${manifestYear.contentStatus}` });
    }
    if (JSON.stringify(manifestYear.verifiedQuestions) !== JSON.stringify(expectedNumbers)) {
      manifestProblems.push({ year, code: 'manifest-verified-questions', detail: JSON.stringify(manifestYear.verifiedQuestions || []) });
    }
  }
  report.manifestFailures.push(...manifestProblems);

  report.years[String(year)] = {
    expected: 47,
    mergedCount: Object.keys(paper.questions || {}).length,
    verified,
    healthy,
    figures,
    failureCount: yearFailures.length,
    manifestFailureCount: manifestProblems.length,
    badQuestions: [...new Set(yearFailures.map(x => x.q))]
  };
}

report.summary = {
  allHealthy:
    report.healthyQuestions === report.expectedQuestions &&
    report.figureFailures.length === 0 &&
    report.manifestFailures.length === 0,
  healthy: report.healthyQuestions,
  unhealthy: report.expectedQuestions - report.healthyQuestions,
  failureEntries: report.failures.length,
  localFigureFailures: report.figureFailures.length,
  manifestFailures: report.manifestFailures.length,
  externalFigureRefs: report.externalFigures.length
};

const out = path.join(DATA, 'audit-report.json');
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`408 audit: ${report.healthyQuestions}/${report.expectedQuestions} healthy`);
for (const [year, info] of Object.entries(report.years)) {
  if (info.failureCount || info.manifestFailureCount) {
    console.log(`${year}: healthy=${info.healthy}/47 bad=${info.badQuestions.join(',')} manifest=${info.manifestFailureCount}`);
  }
}
console.log(`figure failures: ${report.figureFailures.length}`);
console.log(`manifest failures: ${report.manifestFailures.length}`);
console.log(`report: ${path.relative(ROOT, out)}`);

if (!report.summary.allHealthy) process.exitCode = 1;
