import { SEVERITY_ORDER } from './riskDetector.js';
import { listToSentence, plural } from './text.js';

/**
 * Collects every academic risk for a student into one severity-ranked list,
 * grouped by category, for the Risk Detector page and the PDF report.
 */
export function collectAcademicRisks(result) {
  const { student, eligibility, requirementAnalysis, recommendations } = result;
  const requiredTypes = new Set(student.requirements.map((r) => r.typeKey));
  const groups = [];

  const category = [];
  if (student.requirements.length === 0) {
    category.push({ severity: 'critical', title: 'No elective requirements set', detail: 'Without the number of electives per type, no combination can be validated.' });
  }
  for (const r of requirementAnalysis) {
    if (!r.feasible) category.push({ severity: 'critical', title: `${r.type} requirement cannot be met`, detail: `${r.required} required, ${r.eligible} eligible of ${r.total} in the catalogue.` });
    else if (r.eligible === r.required) category.push({ severity: 'medium', title: `No flexibility in ${r.type}`, detail: `Exactly ${r.required} eligible ${r.type} elective${r.required > 1 ? 's' : ''}; every valid combination must include ${r.required > 1 ? 'all of them' : 'it'}.` });
  }
  if (result.status !== 'ok' && result.status !== 'invalid-profile' && requirementAnalysis.every((r) => r.feasible)) {
    category.push({ severity: result.status === 'none' ? 'critical' : 'high', title: `Only ${plural(result.validCount, 'valid combination')}`, detail: 'Timetable clashes eliminate the remaining candidates.' });
  }
  groups.push({ key: 'category', title: 'Unmet category requirements', icon: 'layers', items: category, emptyText: 'Every required category has enough eligible electives.' });

  const prereq = eligibility
    .filter((x) => x.status === 'missing-prereq' && requiredTypes.has(x.elective.typeKey))
    .map((x) => ({ severity: 'high', title: `${x.elective.name} (${x.elective.type})`, detail: `Missing prerequisite${x.missing.length > 1 ? 's' : ''}: ${listToSentence(x.missing)}.` }));
  groups.push({ key: 'prereq', title: 'Missing prerequisites', icon: 'lock', items: prereq, emptyText: 'No elective in a required category is blocked by prerequisites.' });

  const unavailable = eligibility
    .filter((x) => (x.status === 'unavailable' || x.status === 'invalid-record') && requiredTypes.has(x.elective.typeKey))
    .map((x) => ({ severity: x.status === 'unavailable' ? 'medium' : 'low', title: `${x.elective.name} is ${x.status === 'unavailable' ? 'not offered' : 'excluded (incomplete record)'}`, detail: x.reason }));
  groups.push({ key: 'availability', title: 'Unavailable elective options', icon: 'xCircle', items: unavailable, emptyText: 'Every elective in your required categories is offered and complete.' });

  // Timetable hotspots: slots shared by several eligible electives.
  const slotMap = new Map();
  eligibility.filter((x) => x.status === 'eligible').forEach((x) => x.elective.slots.forEach((s) => {
    if (!slotMap.has(s)) slotMap.set(s, []);
    slotMap.get(s).push(x.elective.name);
  }));
  const timetable = [...slotMap.entries()]
    .filter(([, names]) => names.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([slot, names]) => ({ severity: names.length >= 3 ? 'medium' : 'low', title: `Slot ${slot}: ${names.length} eligible electives compete`, detail: `${listToSentence(names)}. You can take at most one of these.` }));
  groups.push({ key: 'timetable', title: 'Timetable conflicts', icon: 'calendar', items: timetable, emptyText: 'No two eligible electives share a slot.' });

  const workload = [];
  const difficulty = [];
  const weak = [];
  for (const rec of recommendations) {
    for (const r of rec.risks) {
      const item = { ...r, title: `Option ${rec.rank}: ${r.title}` };
      if (r.rule === 'workload') workload.push(item);
      else if (r.rule === 'difficulty') difficulty.push(item);
      else if (r.rule === 'weak-subject') weak.push(item);
    }
  }
  groups.push({ key: 'workload', title: 'Excessive workload', icon: 'clock', items: workload, emptyText: 'All recommended options fit your workload preference.' });
  groups.push({ key: 'difficulty', title: 'Difficulty mismatches', icon: 'alert', items: [...difficulty, ...weak], emptyText: 'Recommended electives sit within your estimated comfort level and avoid weak foundations.' });

  const data = student.issues.map((i) => ({ severity: i.severity === 'error' ? 'high' : 'low', title: `Data: ${i.field}`, detail: i.message }));
  groups.push({ key: 'data', title: 'Data quality', icon: 'database', items: data, emptyText: 'This student record is complete.' });

  groups.forEach((g) => g.items.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]));
  const all = groups.flatMap((g) => g.items);
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  all.forEach((r) => { counts[r.severity]++; });
  return { groups, counts, total: all.length };
}
