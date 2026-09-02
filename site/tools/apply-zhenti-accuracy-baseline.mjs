import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'site', 'data', 'zhenti');
const BASELINE_FILE = path.join(DATA, 'accuracy-baseline.json');
const paperCache = new Map();

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isVerified(question) {
  return question?.verification?.status === 'verified';
}

function candidates(year) {
  return [
    path.join(DATA, `${year}.json`),
    path.join(DATA, 'supplement', `${year}.json`),
    path.join(DATA, 'supplement', `${year}-extra.json`)
  ].filter(fs.existsSync);
}

function locateQuestion(year, number) {
  const files = candidates(year);
  const loaded = files.map(file => {
    if (!paperCache.has(file)) paperCache.set(file, readJson(file));
    return { file, paper: paperCache.get(file) };
  });
  return (
    loaded.find(({ paper }) => isVerified(paper.questions?.[number])) ||
    loaded.find(({ paper }) => paper.questions?.[number]) ||
    null
  );
}

const baseline = readJson(BASELINE_FILE);
const changedFiles = new Map();

for (const [key, expected] of Object.entries(baseline.questions || {})) {
  const match = key.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) throw new Error(`invalid baseline key: ${key}`);
  const [, year, number] = match;
  const located = locateQuestion(year, number);
  if (!located) throw new Error(`question not found: ${key}`);

  const question = located.paper.questions[number];
  question.answer = expected.answer;
  question.options = { ...question.options, ...expected.options };
  question.verification = {
    ...question.verification,
    status: 'verified',
    mode: 'original-paper-corrected-transcription',
    sources: [...new Set([...(question.verification?.sources || []), 'neville408'])],
    accuracyBaseline: baseline.schema
  };
  changedFiles.set(located.file, located.paper);
}

for (const [file, paper] of changedFiles) {
  fs.writeFileSync(file, `${JSON.stringify(paper)}\n`, 'utf8');
  console.log(`updated ${path.relative(ROOT, file)}`);
}

console.log(`applied ${Object.keys(baseline.questions || {}).length} original-paper corrections`);
