import { normalizeKey } from './text.js';

/**
 * Hard rule: every prerequisite must appear in the student's cleared subjects.
 * Matching is case/punctuation-insensitive and also accepts a cleared subject that is
 * written as the elective's ID or name.
 */
export function checkPrerequisites(elective, student) {
  const cleared = new Set(student.cleared.map(normalizeKey));
  const weak = new Set(student.weak.map(normalizeKey));
  const missing = [];
  const weakFoundation = [];
  elective.prerequisites.forEach((p, i) => {
    const key = elective.prereqKeys[i];
    if (!cleared.has(key)) missing.push(p);
    else if (weak.has(key)) weakFoundation.push(p);
  });
  return { met: missing.length === 0, missing, weakFoundation };
}

/** True when the student has already cleared this elective itself. */
export function alreadyCleared(elective, student) {
  const cleared = new Set(student.cleared.map(normalizeKey));
  return cleared.has(elective.nameKey) || cleared.has(elective.key);
}
