import { CAREER_POINTS, HOURS_PER_ELECTIVE } from './scoringEngine.js';

/** Single source for the assumptions shown on How It Works and printed in the PDF report. */
export const MANDATORY_RULES = [
  { title: 'Prerequisites', body: 'Every prerequisite listed for an elective must appear in the student\'s cleared subjects (case and punctuation are ignored when matching).' },
  { title: 'Timetable', body: 'No two selected electives may share a timetable slot code. Cells with several codes (e.g. "A; D") clash on any shared code.' },
  { title: 'Category counts', body: 'Each required elective type must be filled exactly: no more, no fewer, and no electives of types the student does not need.' },
  { title: 'Availability', body: 'Every elective must exist in the supplied catalogue, be marked as offered, have a complete record (name, type, slot, hours) and not already be cleared.' },
];

export const ASSUMPTIONS = [
  `Workload budget per elective: Low ${HOURS_PER_ELECTIVE.Low} h, Medium ${HOURS_PER_ELECTIVE.Medium} h, High ${HOURS_PER_ELECTIVE.High} h per week. Above the budget the workload score falls by 2 points per 1% overrun.`,
  'Difficulty is mapped to a 1–3 scale (Easy, Moderate, Hard; numeric 1–5 scales are bucketed). Comfort level = 1 + 2 × (CGPA − 5) / 4.5, clamped to 1–3, ±0.25 for High/Low workload preference.',
  'Each difficulty point above the comfort level costs 60 points on that elective\'s difficulty score. CGPA never makes an elective ineligible; the dataset defines no CGPA threshold.',
  `Career alignment per elective: ${CAREER_POINTS.exact} for a direct career-tag match, ${CAREER_POINTS.adjacent} for a closely related pathway (e.g. AI/ML ↔ Data Analytics), 0 otherwise. Related-pathway pairs are an SKILLORA assumption.`,
  'Goal skills are every skill tag on offered electives that carry the student\'s career tag, unless the student enters target skills. Skill score = unique goal skills covered ÷ min(goal skills, 2 × electives).',
  'Weak-subject safety per elective: 100 if no prerequisite is a weak subject, 40 for one, 0 for two or more.',
  'Ties are broken by fewer weekly hours, then by elective IDs, so results are fully deterministic.',
  'Missing CGPA is treated as average capacity; missing workload preference as Medium. Both are flagged, never silently invented.',
];

export const LIMITATIONS = [
  'Recommendations are only as complete as the CSV data. SKILLORA cannot see seat limits, instructor quality or grading history.',
  'Career and skill relevance come only from catalogue tags. SKILLORA does not guarantee academic success or employment outcomes.',
  'SKILLORA is not connected to any registration system and has no institutional approval. Confirm choices with your department.',
];
