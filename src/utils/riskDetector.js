import { alreadyCleared, checkPrerequisites } from './prerequisiteChecker.js';
import { findConflicts } from './timetableChecker.js';
import { DIFFICULTY_LABEL } from './dataValidator.js';
import { listToSentence, plural, round1 } from './text.js';

export const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Stage 1 re-check, written independently of the generator so it can audit any
 * selection: recommendations, simulator choices and the test suite all go through it.
 * Returns hard-rule violations (each one makes the selection invalid).
 */
export function validateSelection(student, selection, catalog) {
  const violations = [];
  const catalogKeys = new Set(catalog.filter((e) => !e.duplicate).map((e) => e.key));

  for (const e of selection) {
    if (!catalogKeys.has(e.key)) {
      violations.push({ rule: 'availability', severity: 'critical', title: `${e.name} is not in the elective catalogue`, detail: 'Only electives present in the supplied dataset can be recommended.', electives: [e.id] });
      continue;
    }
    if (!e.valid) {
      violations.push({ rule: 'availability', severity: 'critical', title: `${e.name} has an incomplete catalogue record`, detail: e.issues.filter((i) => i.severity === 'error').map((i) => i.message).join(' '), electives: [e.id] });
    }
    if (!e.offered) {
      violations.push({ rule: 'availability', severity: 'critical', title: `${e.name} is not offered`, detail: 'The catalogue marks this elective as unavailable this term.', electives: [e.id] });
    }
    if (alreadyCleared(e, student)) {
      violations.push({ rule: 'availability', severity: 'critical', title: `${e.name} is already cleared`, detail: 'The student has already completed this course.', electives: [e.id] });
    }
    const prereq = checkPrerequisites(e, student);
    if (!prereq.met) {
      violations.push({ rule: 'prerequisite', severity: 'critical', title: `Missing prerequisite${prereq.missing.length > 1 ? 's' : ''} for ${e.name}`, detail: `Not cleared: ${listToSentence(prereq.missing)}.`, electives: [e.id] });
    }
  }

  for (const c of findConflicts(selection)) {
    violations.push({ rule: 'timetable', severity: 'critical', title: `Timetable clash: ${c.a.name} and ${c.b.name}`, detail: `Both meet in slot ${c.slots.join(', ')}.`, electives: [c.a.id, c.b.id] });
  }

  const required = new Map(student.requirements.map((r) => [r.typeKey, r]));
  const counts = new Map();
  selection.forEach((e) => counts.set(e.typeKey, (counts.get(e.typeKey) || 0) + 1));
  for (const [typeKey, req] of required) {
    const have = counts.get(typeKey) || 0;
    if (have !== req.count) {
      violations.push({ rule: 'category', severity: 'critical', title: `${req.type}: ${have} of ${req.count} selected`, detail: have < req.count ? `Add ${plural(req.count - have, `${req.type} elective`)}.` : `Remove ${plural(have - req.count, `${req.type} elective`)}; the requirement is exactly ${req.count}.`, electives: [] });
    }
  }
  for (const [typeKey, have] of counts) {
    if (!required.has(typeKey)) {
      const type = selection.find((e) => e.typeKey === typeKey)?.type;
      violations.push({ rule: 'category', severity: 'critical', title: `${type} electives are not required`, detail: `${plural(have, 'elective')} of type "${type}" selected, but the student needs none of this type.`, electives: selection.filter((e) => e.typeKey === typeKey).map((e) => e.id) });
    }
  }
  const ids = selection.map((e) => e.key);
  if (new Set(ids).size !== ids.length) {
    violations.push({ rule: 'duplicate', severity: 'critical', title: 'The same elective is selected twice', detail: 'Each elective can be counted once.', electives: [] });
  }
  return violations;
}

/** Soft risks for a selection (valid or not). Do not affect validity. */
export function detectSoftRisks(student, selection, score, context) {
  const risks = [];
  if (!selection.length || !score) return risks;

  const over = score.hours - score.budget;
  if (over > 0) {
    const pct = over / score.budget;
    risks.push({
      rule: 'workload',
      severity: pct > 0.25 ? 'high' : 'medium',
      title: `Workload ${round1(over)} h/week above preference`,
      detail: `${score.hours} h/week against a comfortable ${score.budget} h for a ${student.workload || 'Medium (assumed)'} workload preference.`,
    });
  }

  score.facts.forEach((f, i) => {
    const e = selection[i];
    if (f.difficultyGap > 0) {
      risks.push({
        rule: 'difficulty',
        severity: f.difficultyGap >= 1 ? 'high' : 'medium',
        title: `${e.name} may stretch you`,
        detail: `Rated ${DIFFICULTY_LABEL[e.difficulty]}; your estimated comfort level is ${context.capacity.toFixed(1)} / 3${student.cgpa === null ? ' (CGPA unknown, average assumed)' : ` based on CGPA ${student.cgpa}`}. This is guidance, not a barrier.`,
      });
    }
    if (f.weakFoundation.length) {
      risks.push({
        rule: 'weak-subject',
        severity: f.weakFoundation.length > 1 ? 'high' : 'medium',
        title: `${e.name} builds on a weak subject`,
        detail: `Prerequisite ${listToSentence(f.weakFoundation)} is listed as a weak subject. Plan revision before the term starts.`,
      });
    }
  });

  const relevant = score.facts.filter((f) => f.relation !== 'none').length;
  if (student.goalKey && relevant === 0) {
    risks.push({ rule: 'career', severity: 'medium', title: 'No elective is tagged for your career goal', detail: `None of the selected electives carries a "${student.goalLabel}" or adjacent career tag in the dataset.` });
  }
  if (student.cgpa === null) {
    risks.push({ rule: 'data', severity: 'low', title: 'CGPA not available', detail: 'Difficulty suitability uses an average capacity because CGPA is missing or invalid.' });
  }
  return risks.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
