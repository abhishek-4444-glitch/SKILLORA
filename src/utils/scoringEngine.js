import { careerRelation } from './careerPathways.js';
import { checkPrerequisites } from './prerequisiteChecker.js';
import { clamp, normalizeKey, round1 } from './text.js';

/**
 * Stage 2 – soft scoring. Every component is on a 0–100 scale; the total is the
 * weighted mean. Weights are configurable assumptions (see How It Works).
 */
export const DEFAULT_WEIGHTS = { career: 35, skill: 25, workload: 15, difficulty: 15, weak: 10 };

export const COMPONENTS = [
  { key: 'career', label: 'Career alignment', short: 'Career' },
  { key: 'skill', label: 'Skill match', short: 'Skills' },
  { key: 'workload', label: 'Workload fit', short: 'Workload' },
  { key: 'difficulty', label: 'Difficulty suitability', short: 'Difficulty' },
  { key: 'weak', label: 'Weak-subject safety', short: 'Weak subj.' },
];

/** Comfortable weekly hours per elective for each workload preference (assumption). */
export const HOURS_PER_ELECTIVE = { Low: 4, Medium: 5.5, High: 7 };

/** Career credit per elective: exact pathway match, adjacent pathway, unrelated. */
export const CAREER_POINTS = { exact: 100, adjacent: 40, none: 0 };

export function workloadBudget(student, electiveCount) {
  const per = HOURS_PER_ELECTIVE[student.workload || 'Medium'];
  return per * electiveCount;
}

/**
 * Difficulty capacity on the 1–3 scale. CGPA 5.0 → 1.0 (easy), 9.5 → 3.0 (hard), linear
 * in between; a High workload preference adds 0.25, Low subtracts 0.25. CGPA is never
 * used to reject an elective, only to estimate how comfortable a hard course will be.
 */
export function difficultyCapacity(student) {
  const base = student.cgpa === null || student.cgpa === undefined ? 2 : 1 + ((clamp(student.cgpa, 5, 9.5) - 5) / 4.5) * 2;
  const adj = student.workload === 'High' ? 0.25 : student.workload === 'Low' ? -0.25 : 0;
  return clamp(round1(base + adj), 1, 3);
}

/**
 * The skills relevant to the student's goal. If the student typed target skills those are
 * used; otherwise they are derived from the dataset: every skill tag on an offered, valid
 * elective tagged with the goal pathway. Nothing is invented outside the CSV.
 */
export function targetSkillSet(student, electives) {
  if (student.targetSkills && student.targetSkills.length) {
    return { source: 'manual', skills: student.targetSkills.map((s) => ({ label: s, key: normalizeKey(s) })) };
  }
  const map = new Map();
  for (const e of electives) {
    if (!e.valid || !e.offered || !e.careerKeys.includes(student.goalKey)) continue;
    e.skillTags.forEach((s, i) => {
      const key = e.skillKeys[i];
      const entry = map.get(key) || { label: s, key, frequency: 0 };
      entry.frequency++;
      map.set(key, entry);
    });
  }
  return { source: 'dataset', skills: [...map.values()].sort((a, b) => b.frequency - a.frequency || a.label.localeCompare(b.label)) };
}

/** Per-elective facts reused by scoring, explanations and the simulator. */
export function electiveFacts(elective, student, context) {
  const relation = careerRelation(student.goalKey, elective.careerKeys);
  const prereq = checkPrerequisites(elective, student);
  const gap = elective.difficulty - context.capacity;
  const targetKeys = context.targetKeys;
  const matchedSkills = elective.skillTags.filter((_, i) => targetKeys.has(elective.skillKeys[i]));
  return {
    relation,
    careerPoints: CAREER_POINTS[relation],
    difficultyGap: round1(gap),
    difficultyPoints: gap <= 0 ? 100 : clamp(100 - 60 * gap, 0, 100),
    weakFoundation: prereq.weakFoundation,
    weakPoints: prereq.weakFoundation.length === 0 ? 100 : prereq.weakFoundation.length === 1 ? 40 : 0,
    matchedSkills,
  };
}

export function buildScoringContext(student, electives) {
  const target = targetSkillSet(student, electives);
  return {
    capacity: difficultyCapacity(student),
    target,
    targetKeys: new Set(target.skills.map((s) => s.key)),
  };
}

export function normalizeWeights(weights) {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const total = COMPONENTS.reduce((s, c) => s + Math.max(0, Number(w[c.key]) || 0), 0);
  const out = {};
  COMPONENTS.forEach((c) => {
    out[c.key] = total > 0 ? Math.max(0, Number(w[c.key]) || 0) / total : 1 / COMPONENTS.length;
  });
  return out;
}

/** Scores one combination. Pure and deterministic. */
export function scoreCombination(electives, student, context, weights = DEFAULT_WEIGHTS) {
  const n = electives.length;
  const facts = electives.map((e) => electiveFacts(e, student, context));
  const mean = (fn) => (n ? facts.reduce((s, f) => s + fn(f), 0) / n : 0);

  const career = mean((f) => f.careerPoints);

  // Skill match: unique goal-relevant skills covered, against a target of
  // min(|goal skills|, 2 per elective). Rewards coverage and diversity, not repetition.
  const matchedKeys = new Map();
  electives.forEach((e) => e.skillTags.forEach((s, i) => {
    if (context.targetKeys.has(e.skillKeys[i])) matchedKeys.set(e.skillKeys[i], s);
  }));
  const skillTarget = Math.min(context.target.skills.length, 2 * n);
  const skill = skillTarget > 0 ? clamp((matchedKeys.size / skillTarget) * 100, 0, 100) : 0;

  const hours = electives.reduce((s, e) => s + e.hours, 0);
  const budget = workloadBudget(student, n);
  const workload = hours <= budget ? 100 : clamp(100 - (200 * (hours - budget)) / budget, 0, 100);

  const difficulty = mean((f) => f.difficultyPoints);
  const weak = mean((f) => f.weakPoints);

  const components = { career, skill, workload, difficulty, weak };
  const w = normalizeWeights(weights);
  const total = COMPONENTS.reduce((s, c) => s + components[c.key] * w[c.key], 0);

  const allSkills = new Map();
  electives.forEach((e) => e.skillTags.forEach((s, i) => allSkills.set(e.skillKeys[i], s)));

  return {
    total: round1(total),
    components: Object.fromEntries(COMPONENTS.map((c) => [c.key, round1(components[c.key])])),
    weightsUsed: w,
    hours,
    budget,
    avgDifficulty: n ? round1(electives.reduce((s, e) => s + e.difficulty, 0) / n) : 0,
    matchedSkills: [...matchedKeys.values()],
    allSkills: [...allSkills.values()],
    skillTarget,
    facts,
  };
}
