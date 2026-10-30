import { generateCombinations } from './combinationGenerator.js';
import { DIFFICULTY_LABEL } from './dataValidator.js';
import { HOURS_PER_ELECTIVE, buildScoringContext, scoreCombination } from './scoringEngine.js';
import { clashes } from './timetableChecker.js';
import { mergeRequirements } from './recommendationEngine.js';
import { listToSentence, round1 } from './text.js';

/**
 * Explains, in plain language, why a subject is or is not part of the student's
 * top recommendations. Uses only the engine's own results; nothing is estimated.
 */
export function explainRecommendationGap(suit, result) {
  const e = suit.elective;
  const recs = result.recommendations;
  const inRanks = recs.filter((r) => r.electives.some((x) => x.key === e.key)).map((r) => r.rank);
  if (inRanks.length) {
    return {
      included: true,
      headline: `${e.name} is already in your recommendation${inRanks.length > 1 ? 's' : ''}: option ${listToSentence(inRanks.map(String))}.`,
      reasons: [],
      tips: ['Open the Recommendations page to see the full explanation for that option.'],
    };
  }

  const reasons = [];
  const tips = [];
  const failed = suit.checks.filter((c) => !c.pass);
  const entry = result.eligibility.find((x) => x.elective.key === e.key);

  if (suit.verdict === 'not-eligible') {
    for (const c of failed) {
      if (c.label === 'Counts toward your requirements') continue;
      reasons.push(`${FAILED_LABELS[c.label] || c.label}: ${c.detail}`);
    }
    if (entry?.missing.length) tips.push(`Clear ${listToSentence(entry.missing)} first; the subject becomes eligible in a later term.`);
    if (!e.offered) tips.push('Ask your department whether it will be offered next term.');
    tips.push('SKILLORA never relaxes a mandatory rule, so it cannot appear in recommendations until this changes.');
    return { included: false, headline: 'You are not eligible to take this subject right now, so it is never recommended.', reasons, tips };
  }

  const req = result.student.requirements.find((r) => r.typeKey === e.typeKey);
  if (!req) {
    reasons.push(`It is a ${e.type} elective, and your requirements (${result.student.requirements.map((r) => `${r.count} ${r.type}`).join(', ') || 'none set'}) include no ${e.type} places.`);
    reasons.push('A combination must fill each required category exactly, so an extra subject of another type would make it invalid.');
    tips.push(`If your programme really needs a ${e.type} elective, add it under "Electives required per type" on the Student Profile page.`);
    return { included: false, headline: `It does not count toward any of your required categories.`, reasons, tips };
  }

  const clashing = result.eligibility
    .filter((x) => x.status === 'eligible' && x.elective.key !== e.key && clashes(x.elective, e))
    .map((x) => x.elective);

  if (suit.verdict === 'no-fit') {
    reasons.push(`Every combination that includes it either breaks a timetable slot or leaves a category short, so no valid plan contains it.`);
    if (clashing.length) reasons.push(`It shares slot ${e.slots.join(', ')} with ${listToSentence(clashing.map((x) => x.name))}.`);
    tips.push('Ask whether another section of this subject runs in a different slot.');
    return { included: false, headline: 'You can take it, but it cannot fit into any valid timetable with your other required electives.', reasons, tips };
  }

  // Eligible and part of valid plans, but outranked.
  const best = suit.bestCombo;
  const last = recs[recs.length - 1];
  const headline = `It fits into ${suit.combosWithIt} valid plan${suit.combosWithIt > 1 ? 's' : ''}, but the best of them scores lower than your top ${recs.length}.`;
  if (best && last) {
    const gap = round1(last.score.total - best.score.total);
    const outranked = (result.allRanked || []).filter((c) => c.score.total > best.score.total).length;
    reasons.push(`The best plan with ${e.name} scores ${best.score.total}/100, ${gap} point${gap === 1 ? '' : 's'} below recommendation option ${last.rank} (${last.score.total})${outranked ? `; ${outranked} other valid plan${outranked > 1 ? 's' : ''} score higher` : ''}.`);

    const weaker = COMPONENT_LABELS
      .map(([key, label]) => ({ label, diff: round1(last.score.components[key] - best.score.components[key]), mine: best.score.components[key], theirs: last.score.components[key] }))
      .filter((d) => d.diff >= 5)
      .sort((a, b) => b.diff - a.diff);
    if (weaker.length) {
      reasons.push(`Where it loses: ${weaker.map((d) => `${d.label.toLowerCase()} ${Math.round(d.mine)} vs ${Math.round(d.theirs)}`).join(', ')}.`);
    }
  }

  // Which recommended subjects it would clash with or push out.
  const top = recs[0];
  if (top) {
    const clashWithTop = top.electives.filter((x) => clashes(x, e));
    if (clashWithTop.length) {
      reasons.push(`It clashes with ${listToSentence(clashWithTop.map((x) => `${x.name} (slot ${x.slots.join(', ')})`))} in your top recommendation, so both cannot be taken.`);
    } else {
      const sameType = top.electives.filter((x) => x.typeKey === e.typeKey);
      if (sameType.length) reasons.push(`Your ${req.count} ${req.type} place${req.count > 1 ? 's are' : ' is'} filled in option 1 by ${listToSentence(sameType.map((x) => x.name))}, which score${sameType.length > 1 ? '' : 's'} higher for your profile.`);
    }
  }
  if (suit.risks.length) reasons.push(`Its own drawbacks for you: ${suit.risks.map((r) => r.replace(/\.$/, '').toLowerCase()).join('; ')}.`);

  tips.push('Open the best plan in the simulator to compare it side by side with option 1.');
  tips.push('If this subject matters to you, you can still choose it: it is a valid option, just not one of the three highest-scoring.');
  return { included: false, headline, reasons, tips };
}

const FAILED_LABELS = {
  'Offered and complete record': 'Not available',
  'Not already cleared': 'Already completed',
  'Prerequisites cleared': 'Prerequisite not cleared',
};

const COMPONENT_LABELS = [
  ['career', 'Career alignment'],
  ['skill', 'Skill match'],
  ['workload', 'Workload fit'],
  ['difficulty', 'Difficulty suitability'],
  ['weak', 'Weak-subject safety'],
];

export const VERDICTS = {
  'not-eligible': { label: 'Not eligible', tone: 'critical', summary: 'A mandatory rule blocks this subject for you.' },
  'no-fit': { label: 'Eligible, but no valid plan', tone: 'high', summary: 'You may take it, but it cannot be part of any clash-free combination that meets your requirements.' },
  caution: { label: 'Take with caution', tone: 'medium', summary: 'Allowed, but it is a weak match or carries noticeable risks.' },
  suitable: { label: 'Suitable', tone: 'low', summary: 'A reasonable choice for your profile.' },
  high: { label: 'Highly suitable', tone: 'ok', summary: 'A strong match for your goal, skills and workload.' },
};

/**
 * How suitable one subject is for one student. Hard rules decide eligibility; the
 * same five-factor scoring used for combinations rates the fit of the subject alone;
 * and a constrained search finds the best valid combination that includes it.
 */
export function checkSuitability(rawStudent, elective, eligibility, catalog, weights) {
  const student = { ...rawStudent, requirements: mergeRequirements(rawStudent.requirements || []) };
  const context = buildScoringContext(student, catalog);
  const entry = eligibility.find((x) => x.elective.key === elective.key);
  const status = entry?.status || 'invalid-record';

  const checks = [];
  checks.push({ label: 'Offered and complete record', pass: elective.valid && elective.offered, detail: !elective.valid ? 'The catalogue record is incomplete.' : !elective.offered ? 'Not offered this term.' : 'Listed and offered.' });
  checks.push({ label: 'Not already cleared', pass: status !== 'already-cleared', detail: status === 'already-cleared' ? 'You have already completed it.' : 'Not in your cleared subjects.' });
  checks.push({ label: 'Prerequisites cleared', pass: !entry || entry.missing.length === 0, detail: entry?.missing.length ? `Missing ${listToSentence(entry.missing)}.` : elective.prerequisites.length ? `You cleared ${listToSentence(elective.prerequisites)}.` : 'No prerequisites.' });
  const req = student.requirements.find((r) => r.typeKey === elective.typeKey);
  checks.push({ label: 'Counts toward your requirements', pass: Boolean(req), detail: req ? `You need ${req.count} ${req.type} elective${req.count > 1 ? 's' : ''}.` : `You need no ${elective.type} electives.` });

  const score = scoreCombination([elective], student, context, weights);
  const fact = score.facts[0];
  const perElective = HOURS_PER_ELECTIVE[student.workload || 'Medium'];

  const factors = [
    {
      key: 'career',
      label: 'Career goal fit',
      value: score.components.career,
      detail: !student.goalKey ? 'No career goal set.' : fact.relation === 'exact' ? `Tagged ${student.goalLabel}.` : fact.relation === 'adjacent' ? `Tagged ${listToSentence(elective.careerTags)}, a pathway related to ${student.goalLabel}.` : `Tagged ${elective.careerTags.length ? listToSentence(elective.careerTags) : 'with no career'}; not linked to ${student.goalLabel}.`,
    },
    {
      key: 'skill',
      label: 'Skill match',
      value: elective.skillTags.length ? round1((fact.matchedSkills.length / elective.skillTags.length) * 100) : 0,
      detail: fact.matchedSkills.length ? `${fact.matchedSkills.length} of ${elective.skillTags.length} skills are goal skills: ${listToSentence(fact.matchedSkills)}.` : 'None of its skills are linked to your goal in the dataset.',
    },
    {
      key: 'workload',
      label: 'Workload fit',
      value: score.components.workload,
      detail: `${elective.hours} h/week against about ${perElective} h per elective for a ${student.workload || 'Medium'} preference.`,
    },
    {
      key: 'difficulty',
      label: 'Difficulty fit',
      value: score.components.difficulty,
      detail: `${DIFFICULTY_LABEL[elective.difficulty]} (${elective.difficulty}/3) against your estimated comfort level of ${context.capacity.toFixed(1)}/3${student.cgpa === null ? ' (CGPA unknown)' : ''}.`,
    },
    {
      key: 'weak',
      label: 'Foundation safety',
      value: score.components.weak,
      detail: fact.weakFoundation.length ? `Builds on ${listToSentence(fact.weakFoundation)}, which you marked as weak.` : 'Does not depend on any of your weak subjects.',
    },
  ];
  const fit = round1(score.total);

  // Best valid combination that includes this subject.
  let bestCombo = null;
  let combosWithIt = 0;
  if (status === 'eligible' && req) {
    const groups = student.requirements.map((r) => {
      const pool = eligibility
        .filter((x) => x.status === 'eligible' && x.elective.typeKey === r.typeKey && x.elective.key !== elective.key && !clashes(x.elective, elective))
        .map((x) => x.elective);
      return { ...r, count: r.typeKey === elective.typeKey ? r.count - 1 : r.count, pool };
    }).filter((g) => g.count > 0);
    generateCombinations(groups, {
      limit: 100000,
      onCombination(rest) {
        combosWithIt++;
        const combo = [elective, ...rest];
        const s = scoreCombination(combo, student, context, weights);
        if (!bestCombo || s.total > bestCombo.score.total) bestCombo = { electives: combo, score: s };
      },
    });
    if (groups.length === 0) {
      combosWithIt = 1;
      bestCombo = { electives: [elective], score };
    }
  }

  const risks = [];
  if (fact.difficultyGap > 0) risks.push(`It is ${round1(fact.difficultyGap)} levels above your estimated comfort; plan extra study time.`);
  if (fact.weakFoundation.length) risks.push(`Revise ${listToSentence(fact.weakFoundation)} before the term starts.`);
  if (elective.hours > perElective) risks.push(`At ${elective.hours} h/week it is heavier than your preferred ${perElective} h per elective.`);
  if (fact.relation === 'none' && student.goalKey) risks.push('It adds little toward your stated career goal.');

  let verdict;
  if (checks.slice(0, 3).some((c) => !c.pass)) verdict = 'not-eligible';
  else if (!req || combosWithIt === 0) verdict = 'no-fit';
  else if (fit >= 75 && risks.length <= 1) verdict = 'high';
  else if (fit >= 55) verdict = 'suitable';
  else verdict = 'caution';

  return { elective, verdict, ...VERDICTS[verdict], fit, factors, matchedSkills: fact.matchedSkills, checks, risks, combosWithIt, bestCombo, weightsUsed: score.weightsUsed };
}
