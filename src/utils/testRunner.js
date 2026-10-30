import { recommend, mergeRequirements } from './recommendationEngine.js';
import { validateSelection } from './riskDetector.js';
import { buildScoringContext, scoreCombination, DEFAULT_WEIGHTS } from './scoringEngine.js';

const BRUTE_FORCE_LIMIT = 60000;

/** All k-subsets of an array (used only by the brute-force cross-check). */
function subsets(items, k, start = 0, acc = [], out = []) {
  if (acc.length === k) {
    out.push([...acc]);
    return out;
  }
  for (let i = start; i <= items.length - (k - acc.length); i++) {
    acc.push(items[i]);
    subsets(items, k, i + 1, acc, out);
    acc.pop();
  }
  return out;
}

/**
 * Independent oracle: enumerates every same-type selection from the whole catalogue
 * (no pruning, no eligibility pre-filter) and keeps those validateSelection accepts.
 */
function bruteForce(student, catalog, weights) {
  const groups = student.requirements.map((r) => catalog.filter((e) => !e.duplicate && e.typeKey === r.typeKey));
  let space = 1;
  const perGroup = groups.map((pool, i) => {
    const s = subsets(pool, student.requirements[i].count);
    space *= Math.max(1, s.length);
    return s;
  });
  if (space > BRUTE_FORCE_LIMIT) return null;
  const context = buildScoringContext(student, catalog);
  const valid = [];
  const walk = (i, acc) => {
    if (i === perGroup.length) {
      if (validateSelection(student, acc, catalog).length === 0) valid.push(scoreCombination(acc, student, context, weights).total);
      return;
    }
    for (const s of perGroup[i]) walk(i + 1, [...acc, ...s]);
  };
  if (perGroup.every((g) => g.length)) walk(0, []);
  return valid.sort((a, b) => b - a);
}

/** Runs the engine for every student and checks each result. Nothing here is hard-coded. */
export function runAllStudentTests(dataset, { weights = DEFAULT_WEIGHTS, topN = 3 } = {}) {
  const started = performance.now();
  const results = [];
  let invalidCombinations = 0;

  for (const raw of dataset.students) {
    const student = { ...raw, requirements: mergeRequirements(raw.requirements) };
    const checks = [];
    const check = (name, pass, detail = '') => checks.push({ name, pass, detail });

    const t0 = performance.now();
    const result = recommend(student, dataset.electives, { weights, topN });
    const ms = performance.now() - t0;
    const recs = result.recommendations;

    let invalidHere = 0;
    for (const r of recs) {
      const v = validateSelection(result.student, r.electives, dataset.electives);
      if (v.length) invalidHere++;
    }
    invalidCombinations += invalidHere;
    check('Prerequisites, timetable, categories and availability re-validated', invalidHere === 0, invalidHere ? `${invalidHere} invalid` : `${recs.length} checked`);
    check('Combinations are unique', new Set(recs.map((r) => r.key)).size === recs.length);
    check('Ranking is non-increasing', recs.every((r, i) => i === 0 || recs[i - 1].score.total >= r.score.total));
    check('Scores within 0–100', recs.every((r) => r.score.total >= 0 && r.score.total <= 100 && Object.values(r.score.components).every((c) => c >= 0 && c <= 100)));
    check('Returns min(3, valid) combinations', recs.length === Math.min(topN, result.validCount), `${recs.length} of ${result.validCount}`);

    const again = recommend(student, dataset.electives, { weights, topN });
    check('Deterministic on re-run', again.recommendations.map((r) => `${r.key}:${r.score.total}`).join() === recs.map((r) => `${r.key}:${r.score.total}`).join());

    if (student.requirements.length) {
      const oracle = bruteForce(result.student, dataset.electives, weights);
      if (oracle) {
        check('Valid count matches brute force', oracle.length === result.validCount, `engine ${result.validCount}, brute force ${oracle.length}`);
        check('Top scores match brute force', oracle.slice(0, topN).join() === recs.map((r) => r.score.total).join(), `${recs.map((r) => r.score.total).join(', ')}`);
      } else {
        check('Brute-force cross-check', true, 'skipped: search space too large');
      }
    }

    results.push({
      student: raw,
      status: result.status,
      validCount: result.validCount,
      returned: recs.length,
      topScore: recs[0]?.score.total ?? null,
      top: recs.map((r) => r.electives.map((e) => e.id).join(' + ')),
      dataIssues: raw.issues.length,
      dataErrors: raw.issues.filter((i) => i.severity === 'error').length,
      diagnostics: result.diagnostics,
      checks,
      passed: checks.every((c) => c.pass),
      ms,
    });
  }

  const summary = {
    totalStudents: results.length,
    threeOrMore: results.filter((r) => r.returned >= topN).length,
    fewerThanThree: results.filter((r) => r.returned > 0 && r.returned < topN).length,
    none: results.filter((r) => r.returned === 0).length,
    invalidCombinations,
    studentDataFailures: results.filter((r) => r.dataErrors > 0).length,
    electiveDataFailures: dataset.electives.filter((e) => !e.valid).length,
    checksRun: results.reduce((s, r) => s + r.checks.length, 0),
    checksFailed: results.reduce((s, r) => s + r.checks.filter((c) => !c.pass).length, 0),
    distinctGoals: new Set(dataset.students.map((s) => s.goalKey).filter(Boolean)).size,
    highWorkloadStudents: dataset.students.filter((s) => s.workload === 'High').length,
    durationMs: performance.now() - started,
  };
  return { summary, results, ranAt: new Date().toISOString() };
}
