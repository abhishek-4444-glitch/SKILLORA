import { alreadyCleared, checkPrerequisites } from './prerequisiteChecker.js';
import { clashes, sharedSlots } from './timetableChecker.js';
import { comboKey, generateCombinations } from './combinationGenerator.js';
import { COMPONENTS, DEFAULT_WEIGHTS, buildScoringContext, electiveFacts, scoreCombination } from './scoringEngine.js';
import { detectSoftRisks, validateSelection } from './riskDetector.js';
import { choose, listToSentence, plural, round1 } from './text.js';

const KEEP_LIMIT = 400; // ranked combinations kept in memory (the counts still cover all of them)

/** Collapses duplicate requirement types ("Open:1; Open:1" → Open:2). */
export function mergeRequirements(requirements) {
  const map = new Map();
  for (const r of requirements) {
    const existing = map.get(r.typeKey);
    if (existing) existing.count += r.count;
    else map.set(r.typeKey, { ...r });
  }
  return [...map.values()];
}

/** Why each catalogue elective is or is not eligible for this student. */
export function analyseEligibility(student, catalog) {
  const requiredTypes = new Set(student.requirements.map((r) => r.typeKey));
  return catalog
    .filter((e) => !e.duplicate)
    .map((e) => {
      const prereq = checkPrerequisites(e, student);
      let status = 'eligible';
      let reason = 'All rules satisfied.';
      if (!e.valid) {
        status = 'invalid-record';
        reason = e.issues.filter((i) => i.severity === 'error').map((i) => i.message).join(' ');
      } else if (!e.offered) {
        status = 'unavailable';
        reason = 'Not offered this term.';
      } else if (alreadyCleared(e, student)) {
        status = 'already-cleared';
        reason = 'Already completed.';
      } else if (!prereq.met) {
        status = 'missing-prereq';
        reason = `Missing ${listToSentence(prereq.missing)}.`;
      } else if (!requiredTypes.has(e.typeKey)) {
        status = 'not-required-type';
        reason = `No ${e.type} electives are required.`;
      }
      return { elective: e, status, reason, missing: prereq.missing, weakFoundation: prereq.weakFoundation };
    });
}

function compareRanked(a, b) {
  return b.score.total - a.score.total || a.score.hours - b.score.hours || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
}

/**
 * Runs Stage 1 (hard filtering + generation) and Stage 2 (scoring + ranking).
 * Never relaxes a hard rule to fill the top three.
 */
export function recommend(rawStudent, catalog, { weights = DEFAULT_WEIGHTS, topN = 3 } = {}) {
  const student = { ...rawStudent, requirements: mergeRequirements(rawStudent.requirements || []) };
  const context = buildScoringContext(student, catalog);
  const eligibility = analyseEligibility(student, catalog);

  const base = { student, context, eligibility, topN, weights };

  if (student.requirements.length === 0) {
    return {
      ...base,
      status: 'invalid-profile',
      validCount: 0,
      recommendations: [],
      requirementAnalysis: [],
      diagnostics: [{ severity: 'critical', title: 'Elective requirements are missing', detail: 'The number of electives required per type is not available for this student, so no combination can be checked. Add the requirement on the Profile page.' }],
      alternatives: [],
      search: { explored: 0, pruned: 0, unconstrained: 0, truncated: false },
    };
  }

  const groups = student.requirements.map((r) => ({
    ...r,
    pool: eligibility.filter((x) => x.status === 'eligible' && x.elective.typeKey === r.typeKey).map((x) => x.elective),
  }));

  const requirementAnalysis = groups.map((g) => {
    const inType = eligibility.filter((x) => x.elective.typeKey === g.typeKey);
    return {
      type: g.type,
      typeKey: g.typeKey,
      required: g.count,
      eligible: g.pool.length,
      total: inType.length,
      blockedByPrereq: inType.filter((x) => x.status === 'missing-prereq').length,
      unavailable: inType.filter((x) => x.status === 'unavailable' || x.status === 'invalid-record').length,
      feasible: g.pool.length >= g.count,
    };
  });

  // Stage 1 + 2: generate clash-free combinations and score each as it is produced.
  let kept = [];
  const best = {};
  let validCount = 0;
  const { pruned, truncated } = generateCombinations(groups, {
    onCombination(electives) {
      validCount++;
      const score = scoreCombination(electives, student, context, weights);
      const entry = { electives, score, key: comboKey(electives) };
      for (const c of COMPONENTS) {
        if (!best[c.key] || score.components[c.key] > best[c.key].score.components[c.key]) best[c.key] = entry;
      }
      if (!best.hours || score.hours < best.hours.score.hours) best.hours = entry;
      kept.push(entry);
      if (kept.length > KEEP_LIMIT * 2) kept = kept.sort(compareRanked).slice(0, KEEP_LIMIT);
    },
  });
  kept.sort(compareRanked);
  kept = kept.slice(0, KEEP_LIMIT);

  // Independent audit: anything failing the hard rules is dropped, never shown.
  const audited = [];
  const auditFailures = [];
  const seen = new Set();
  for (const entry of kept) {
    if (audited.length === topN) break;
    const violations = validateSelection(student, entry.electives, catalog);
    if (violations.length || seen.has(entry.key)) {
      auditFailures.push({ key: entry.key, violations });
      continue;
    }
    seen.add(entry.key);
    audited.push(entry);
  }

  const unconstrained = groups.reduce((p, g) => p * choose(g.pool.length, g.count), 1);
  const recommendations = audited.map((entry, i) => buildRecommendation(entry, i + 1, { student, context, catalog, best, validCount, groups, eligibility }));

  const status = recommendations.length >= topN ? 'ok' : recommendations.length > 0 ? 'partial' : 'none';
  const { diagnostics, alternatives } = diagnose({ student, groups, requirementAnalysis, eligibility, validCount, unconstrained, truncated, topN, status, catalog });

  return {
    ...base,
    status,
    validCount,
    recommendations,
    allRanked: kept,
    requirementAnalysis,
    diagnostics,
    alternatives,
    auditFailures,
    search: { explored: validCount, pruned, unconstrained, truncated },
  };
}

/** Builds the narrative for one recommended combination. */
function buildRecommendation(entry, rank, { student, context, catalog, best, validCount, groups, eligibility }) {
  const { electives, score } = entry;
  const risks = detectSoftRisks(student, electives, score, context);
  const goal = student.goalLabel || 'your goal';

  const ranked = COMPONENTS.map((c) => ({ ...c, value: score.components[c.key] })).sort((a, b) => b.value - a.value);
  const strengths = ranked.filter((c) => c.value >= 70).slice(0, 2);
  const why = [
    `Ranked #${rank} of ${plural(validCount, 'valid combination')} with an overall score of ${score.total}/100.`,
    strengths.length ? `It is strongest on ${listToSentence(strengths.map((c) => `${c.label.toLowerCase()} (${Math.round(c.value)})`))}.` : `No single factor dominates; it is the most balanced valid option at this rank.`,
    `All prerequisites are cleared, no two electives share a timetable slot, and the category counts (${student.requirements.map((r) => `${r.count} ${r.type}`).join(', ')}) are met exactly.`,
  ].join(' ');

  const careerDetail = electives.map((e, i) => ({ elective: e, relation: score.facts[i].relation }));
  const exact = careerDetail.filter((d) => d.relation === 'exact').map((d) => d.elective.name);
  const adjacent = careerDetail.filter((d) => d.relation === 'adjacent').map((d) => d.elective.name);
  let careerText;
  if (!student.goalKey) careerText = 'No career goal is set, so career alignment could not be scored.';
  else if (exact.length === electives.length) careerText = `Every elective is tagged ${goal} in the catalogue.`;
  else {
    const parts = [];
    if (exact.length) parts.push(`${listToSentence(exact)} ${exact.length > 1 ? 'are' : 'is'} tagged ${goal}`);
    if (adjacent.length) parts.push(`${listToSentence(adjacent)} ${adjacent.length > 1 ? 'are' : 'is'} tagged with a closely related pathway (partial credit)`);
    const none = careerDetail.filter((d) => d.relation === 'none').map((d) => d.elective.name);
    if (none.length) parts.push(`${listToSentence(none)} ${none.length > 1 ? 'carry' : 'carries'} no related career tag`);
    careerText = `${parts.join('; ')}.`;
  }

  const workloadText = score.hours <= score.budget
    ? `${score.hours} hours per week, within the ${score.budget} h comfortable for a ${student.workload || 'Medium (assumed)'} workload preference.`
    : `${score.hours} hours per week, ${round1(score.hours - score.budget)} h above the ${score.budget} h comfortable for a ${student.workload || 'Medium (assumed)'} preference.`;

  const gains = [];
  if (score.matchedSkills.length) gains.push(`${plural(score.matchedSkills.length, 'goal-relevant skill')}: ${listToSentence(score.matchedSkills.slice(0, 6))}${score.matchedSkills.length > 6 ? '…' : ''}.`);
  if (exact.length) gains.push(`Direct ${goal} coverage from ${plural(exact.length, 'elective')}.`);
  if (score.hours <= score.budget) gains.push(`Manageable load with ${round1(score.budget - score.hours)} h/week of headroom.`);
  if (score.components.difficulty >= 90) gains.push('Difficulty sits within your estimated comfort level.');
  if (score.components.weak === 100) gains.push('No elective depends on a subject you marked as weak.');
  const extraSkills = score.allSkills.filter((s) => !score.matchedSkills.includes(s));
  if (extraSkills.length) gains.push(`Broader skills: ${listToSentence(extraSkills.slice(0, 4))}.`);

  const sacrifices = [];
  for (const c of COMPONENTS) {
    const top = best[c.key];
    if (!top || top.key === entry.key) continue;
    const diff = top.score.components[c.key] - score.components[c.key];
    if (diff >= 10) sacrifices.push(`${c.label}: ${Math.round(score.components[c.key])} here vs ${Math.round(top.score.components[c.key])} in the best valid option for that factor (${top.electives.map((e) => e.name).join(' + ')}).`);
  }
  if (best.hours && best.hours.key !== entry.key && score.hours - best.hours.score.hours >= 2) {
    sacrifices.push(`About ${round1(score.hours - best.hours.score.hours)} more hours per week than the lightest valid combination (${best.hours.score.hours} h).`);
  }
  // Strong individual electives left out, and the rule that kept them out.
  const chosenKeys = new Set(electives.map((e) => e.key));
  const strongOthers = eligibility
    .filter((x) => x.status === 'eligible' && !chosenKeys.has(x.elective.key))
    .map((x) => ({ e: x.elective, f: electiveFacts(x.elective, student, context) }))
    .filter((x) => x.f.relation === 'exact')
    .sort((a, b) => b.f.matchedSkills.length - a.f.matchedSkills.length || a.e.name.localeCompare(b.e.name))
    .slice(0, 2);
  for (const { e } of strongOthers) {
    const clash = electives.find((c) => clashes(c, e));
    if (clash) sacrifices.push(`Leaves out ${e.name} (a ${goal} elective): it clashes with ${clash.name} in slot ${sharedSlots(clash, e).join(', ')}.`);
    else {
      const group = groups.find((g) => g.typeKey === e.typeKey);
      sacrifices.push(`Leaves out ${e.name} (a ${goal} elective): the ${group?.count ?? ''} ${e.type} place${group?.count === 1 ? ' is' : 's are'} taken by options that score higher overall in this combination.`);
    }
  }
  const missed = context.target.skills.filter((s) => !score.matchedSkills.some((m) => m.toLowerCase() === s.label.toLowerCase())).slice(0, 4);
  if (missed.length && context.target.skills.length) sacrifices.push(`Does not cover ${listToSentence(missed.map((m) => m.label))} from the ${goal} skill set.`);
  if (sacrifices.length === 0) sacrifices.push('No significant trade-off against the other valid combinations was detected.');

  return {
    rank,
    key: entry.key,
    electives,
    score,
    risks,
    validation: { prerequisites: true, timetable: true, categories: true, availability: true },
    explanation: {
      why,
      career: careerText,
      careerDetail,
      skills: score.matchedSkills,
      otherSkills: extraSkills,
      workload: workloadText,
      gains,
      sacrifices,
    },
  };
}

function diagnose({ student, groups, requirementAnalysis, eligibility, validCount, unconstrained, truncated, topN, status }) {
  const diagnostics = [];
  const alternatives = [];

  for (const r of requirementAnalysis) {
    if (r.total === 0) {
      diagnostics.push({ severity: 'critical', title: `No "${r.type}" electives exist in the catalogue`, detail: `The student needs ${r.required}, but the dataset has no valid elective of this type. This requirement cannot be met with the supplied data.` });
    } else if (!r.feasible) {
      diagnostics.push({
        severity: 'critical',
        title: `${r.type}: ${r.eligible} eligible, ${r.required} required`,
        detail: `${plural(r.total, `${r.type} elective`)} in the catalogue: ${r.eligible} eligible, ${r.blockedByPrereq} blocked by missing prerequisites${r.unavailable ? `, ${r.unavailable} unavailable or incomplete` : ''}.`,
      });
    }
  }

  if (requirementAnalysis.every((r) => r.feasible) && validCount < topN) {
    const clashRejected = unconstrained - validCount;
    diagnostics.push({
      severity: validCount === 0 ? 'critical' : 'high',
      title: validCount === 0 ? 'Every candidate combination has a timetable clash' : `Only ${plural(validCount, 'valid combination')} exist${validCount === 1 ? 's' : ''}`,
      detail: `${plural(unconstrained, 'combination')} satisfy prerequisites and category counts, and ${clashRejected} of them ${clashRejected === 1 ? 'was' : 'were'} rejected for timetable clashes. SKILLORA does not relax clashes to fill ${topN} slots.`,
    });
  }
  if (truncated) {
    diagnostics.push({ severity: 'low', title: 'Search space capped', detail: 'The catalogue is very large; ranking covered the first 250,000 valid combinations.' });
  }

  // What would unlock more options (clearly labelled as not valid today).
  if (status !== 'ok') {
    const requiredTypes = new Set(groups.map((g) => g.typeKey));
    const unlocks = new Map();
    for (const x of eligibility) {
      if (x.status !== 'missing-prereq' || !requiredTypes.has(x.elective.typeKey)) continue;
      const key = x.missing.join(' + ');
      const entry = unlocks.get(key) || { subjects: x.missing, electives: [] };
      entry.electives.push(x.elective.name);
      unlocks.set(key, entry);
    }
    [...unlocks.values()]
      .sort((a, b) => a.subjects.length - b.subjects.length || b.electives.length - a.electives.length)
      .slice(0, 4)
      .forEach((u) => alternatives.push({ kind: 'prerequisite', title: `Clear ${listToSentence(u.subjects)}`, detail: `Would make ${listToSentence(u.electives)} eligible in a future term.` }));
    alternatives.push({ kind: 'advisor', title: 'Speak with your academic advisor', detail: 'Ask whether a prerequisite waiver, a different slot section, or a substitute category is available. SKILLORA cannot grant exceptions.' });
  }
  return { diagnostics, alternatives };
}

/** What-if simulator: validates and scores any manual selection instantly. */
export function evaluateSelection(rawStudent, selection, catalog, weights = DEFAULT_WEIGHTS) {
  const student = { ...rawStudent, requirements: mergeRequirements(rawStudent.requirements || []) };
  const context = buildScoringContext(student, catalog);
  const violations = validateSelection(student, selection, catalog);
  const score = selection.length ? scoreCombination(selection, student, context, weights) : null;
  const risks = detectSoftRisks(student, selection, score, context);
  return { valid: violations.length === 0 && selection.length > 0, violations, score, risks, context };
}
