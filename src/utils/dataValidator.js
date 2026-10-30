import { ELECTIVE_FIELDS, STUDENT_FIELDS, detectColumns, parseCsvText } from './csvParser.js';
import { canonicalCareerKey, careerLabel } from './careerPathways.js';
import { normalizeKey, splitList } from './text.js';

/** Difficulty is stored on a 1 (easy) – 3 (hard) internal scale. */
const DIFFICULTY_WORDS = {
  easy: 1, low: 1, beginner: 1, basic: 1,
  moderate: 2, medium: 2, intermediate: 2, average: 2,
  hard: 3, high: 3, difficult: 3, advanced: 3, challenging: 3,
};
export const DIFFICULTY_LABEL = { 1: 'Easy', 2: 'Moderate', 3: 'Hard' };

const WORKLOAD_WORDS = {
  low: 'Low', light: 'Low', minimal: 'Low',
  medium: 'Medium', moderate: 'Medium', balanced: 'Medium', normal: 'Medium', average: 'Medium',
  high: 'High', heavy: 'High', intense: 'High', maximum: 'High',
};

const NO_WORDS = new Set(['no', 'n', 'false', '0', 'notoffered', 'unavailable', 'closed', 'inactive', 'discontinued', 'cancelled']);

export function parseDifficulty(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const num = Number(text);
  if (Number.isFinite(num)) {
    // Numeric scales: 1–3 used directly, 1–5 and 1–10 bucketed into thirds.
    if (num >= 1 && num <= 3 && Number.isInteger(num)) return num;
    if (num >= 1 && num <= 5) return num <= 2 ? 1 : num < 4 ? 2 : 3;
    if (num > 5 && num <= 10) return num <= 4 ? 1 : num <= 7 ? 2 : 3;
    return null;
  }
  return DIFFICULTY_WORDS[normalizeKey(text)] ?? null;
}

export function parseWorkload(raw) {
  return WORKLOAD_WORDS[normalizeKey(raw)] ?? null;
}

/** "Professional:2; Open:1" / "Professional=2, Open=1" / "2 Professional" -> [{type, count}] */
export function parseRequirementString(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { requirements: [], errors: [] };
  const parts = text.split(/[;|,]/).map((p) => p.trim()).filter(Boolean);
  const requirements = [];
  const errors = [];
  for (const part of parts) {
    let match = part.match(/^(.+?)\s*[:=\-x×]\s*(\d+)$/i);
    let type;
    let count;
    if (match) {
      type = match[1].trim();
      count = Number(match[2]);
    } else if ((match = part.match(/^(\d+)\s*(?:x\s*)?(.+)$/i))) {
      count = Number(match[1]);
      type = match[2].trim();
    } else {
      errors.push(`Could not read requirement "${part}" (expected "Type:Count").`);
      continue;
    }
    type = type.replace(/\s*electives?$/i, '').trim();
    if (!type) {
      errors.push(`Requirement "${part}" has no elective type.`);
      continue;
    }
    requirements.push({ type, count });
  }
  return { requirements, errors };
}

function makeIssue(severity, entity, id, row, field, message) {
  return { severity, entity, id, row, field, message };
}

/** Builds clean elective records. Invalid records are kept (valid=false) so the UI can explain them. */
export function buildElectives(rows, columns) {
  const { mapping } = columns;
  const issues = [];
  const electives = [];
  const seenIds = new Map();
  const get = (row, field) => (mapping[field] ? String(row[mapping[field]] ?? '').trim() : '');

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const name = get(row, 'name');
    let id = get(row, 'id') || name;
    const recordIssues = [];
    const add = (severity, field, message) => recordIssues.push(makeIssue(severity, 'elective', id || `row ${rowNumber}`, rowNumber, field, message));

    if (!name) add('error', 'name', 'Elective name is missing.');
    if (!id) id = `ROW-${rowNumber}`;

    const type = get(row, 'type');
    if (!type) add('error', 'type', 'Elective type is missing, so it cannot count toward any category.');

    const slots = splitList(get(row, 'slot'));
    if (slots.length === 0) add('error', 'slot', 'Timetable slot is missing, so clashes cannot be checked. Excluded from recommendations.');

    const prerequisites = splitList(get(row, 'prerequisites'));

    const difficultyRaw = get(row, 'difficulty');
    const difficulty = parseDifficulty(difficultyRaw);
    if (difficulty === null) add('warning', 'difficulty', difficultyRaw ? `Unrecognised difficulty "${difficultyRaw}"; treated as Moderate.` : 'Difficulty is missing; treated as Moderate.');

    const hoursRaw = get(row, 'hours');
    const hours = Number(hoursRaw);
    const hoursValid = hoursRaw !== '' && Number.isFinite(hours) && hours > 0 && hours <= 40;
    if (!hoursValid) add('error', 'hours', hoursRaw ? `Weekly hours "${hoursRaw}" is not a valid number.` : 'Weekly hours are missing.');

    const careerTags = splitList(get(row, 'careerTags'));
    if (careerTags.length === 0) add('warning', 'careerTags', 'No career tags; career alignment will be 0 for this elective.');
    const skillTags = splitList(get(row, 'skillTags'));
    if (skillTags.length === 0) add('warning', 'skillTags', 'No skill tags; it contributes no skills to the skill-match score.');

    const offeredRaw = get(row, 'offered');
    const offered = !NO_WORDS.has(normalizeKey(offeredRaw));

    const idKey = normalizeKey(id);
    if (seenIds.has(idKey)) {
      add('error', 'id', `Duplicate elective ID "${id}" (first seen on row ${seenIds.get(idKey)}). Duplicate row ignored.`);
    } else {
      seenIds.set(idKey, rowNumber);
    }

    const valid = !recordIssues.some((i) => i.severity === 'error');
    issues.push(...recordIssues);
    electives.push({
      id,
      key: idKey,
      name: name || id,
      nameKey: normalizeKey(name),
      type: type || 'Unspecified',
      typeKey: normalizeKey(type),
      slots,
      slotKeys: slots.map(normalizeKey),
      prerequisites,
      prereqKeys: prerequisites.map(normalizeKey),
      difficulty: difficulty ?? 2,
      difficultyLabel: DIFFICULTY_LABEL[difficulty ?? 2],
      difficultyRaw,
      hours: hoursValid ? hours : 0,
      careerTags,
      careerKeys: [...new Set(careerTags.map(canonicalCareerKey))],
      skillTags,
      skillKeys: skillTags.map(normalizeKey),
      offered,
      valid,
      duplicate: seenIds.get(idKey) !== rowNumber,
      rowNumber,
      issues: recordIssues,
    });
  });
  return { electives, issues };
}

export function buildStudents(rows, columns) {
  const { mapping, requirementColumns } = columns;
  const issues = [];
  const students = [];
  const seenIds = new Set();
  const get = (row, field) => (mapping[field] ? String(row[mapping[field]] ?? '').trim() : '');

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    let id = get(row, 'id') || get(row, 'name') || `STUDENT-${rowNumber}`;
    const recordIssues = [];
    const add = (severity, field, message) => recordIssues.push(makeIssue(severity, 'student', id, rowNumber, field, message));

    if (seenIds.has(normalizeKey(id))) {
      add('warning', 'id', `Duplicate student ID "${id}"; renamed to keep both records.`);
      id = `${id}-row${rowNumber}`;
    }
    seenIds.add(normalizeKey(id));

    const goal = get(row, 'goal');
    if (!goal) add('warning', 'goal', 'Career goal is missing; career alignment cannot be scored until one is chosen.');

    const cgpaRaw = get(row, 'cgpa');
    let cgpa = null;
    if (cgpaRaw === '') {
      add('warning', 'cgpa', 'CGPA is missing; difficulty suitability assumes an average (Moderate) capacity.');
    } else {
      const value = Number(cgpaRaw);
      if (!Number.isFinite(value) || value < 0 || value > 10) {
        add('warning', 'cgpa', `CGPA "${cgpaRaw}" is not a number between 0 and 10; treated as missing.`);
      } else {
        cgpa = value;
      }
    }

    const cleared = splitList(get(row, 'cleared'));
    if (cleared.length === 0) add('warning', 'cleared', 'No cleared subjects listed; only electives without prerequisites are eligible.');
    const weak = splitList(get(row, 'weak'));

    const workloadRaw = get(row, 'workload');
    const workload = parseWorkload(workloadRaw);
    if (!workload) add('warning', 'workload', workloadRaw ? `Unrecognised workload preference "${workloadRaw}"; treated as Medium.` : 'Workload preference is missing; treated as Medium.');

    let requirements = [];
    if (mapping.requirements) {
      const parsed = parseRequirementString(get(row, 'requirements'));
      requirements = parsed.requirements;
      parsed.errors.forEach((e) => add('error', 'requirements', e));
    }
    for (const { header, typeKey } of requirementColumns || []) {
      const raw = String(row[header] ?? '').trim();
      if (raw === '') continue;
      const count = Number(raw);
      if (!Number.isInteger(count) || count < 0) {
        add('error', 'requirements', `"${header}" = "${raw}" is not a whole number.`);
        continue;
      }
      requirements.push({ type: header.replace(/[_-]+/g, ' '), typeKey, count });
    }
    requirements = requirements
      .map((r) => ({ ...r, typeKey: r.typeKey || normalizeKey(r.type) }))
      .filter((r) => r.count > 0);
    if (requirements.length === 0 && !recordIssues.some((i) => i.field === 'requirements')) {
      add('error', 'requirements', 'Number of electives required per type is missing; recommendations cannot be generated.');
    }

    const valid = !recordIssues.some((i) => i.severity === 'error');
    issues.push(...recordIssues);
    const goalKey = goal ? canonicalCareerKey(goal) : '';
    students.push({
      id,
      name: get(row, 'name') || id,
      goal,
      goalKey,
      goalLabel: goal ? careerLabel(goalKey, goal) : '',
      cgpa,
      cgpaRaw,
      cleared,
      weak,
      workload,
      workloadRaw,
      requirements,
      valid,
      rowNumber,
      issues: recordIssues,
    });
  });
  return { students, issues };
}

/**
 * Parses and validates both CSVs. Returns a dataset object; never throws.
 * `source` describes where the data came from (shown in the UI).
 */
export function buildDataset({ electivesText, studentsText, source }) {
  const electivesCsv = parseCsvText(electivesText);
  const studentsCsv = parseCsvText(studentsText);
  const electiveColumns = detectColumns(electivesCsv.headers, ELECTIVE_FIELDS);
  const studentColumns = detectColumns(studentsCsv.headers, STUDENT_FIELDS, { detectRequirementColumns: true });

  const fileErrors = [];
  electivesCsv.errors.forEach((e) => fileErrors.push(makeIssue('error', 'file', 'electives.csv', e.row, 'csv', e.message)));
  studentsCsv.errors.forEach((e) => fileErrors.push(makeIssue('error', 'file', 'students.csv', e.row, 'csv', e.message)));
  electiveColumns.missing.forEach((f) => fileErrors.push(makeIssue('error', 'file', 'electives.csv', undefined, f, `No column found for "${ELECTIVE_FIELDS[f].label}". Recognised headers: ${ELECTIVE_FIELDS[f].aliases.slice(0, 3).join(', ')}…`)));
  studentColumns.missing.forEach((f) => fileErrors.push(makeIssue('error', 'file', 'students.csv', undefined, f, `No column found for "${STUDENT_FIELDS[f].label}".`)));

  const fatal = electiveColumns.missing.includes('name') || electiveColumns.missing.includes('type') || electivesCsv.rows.length === 0 || studentsCsv.rows.length === 0;

  const { electives, issues: electiveIssues } = buildElectives(electivesCsv.rows, electiveColumns);
  const { students, issues: studentIssues } = buildStudents(studentsCsv.rows, studentColumns);

  // Requirement types that no elective in the catalogue belongs to.
  const typeKeys = new Set(electives.filter((e) => e.valid).map((e) => e.typeKey));
  const crossIssues = [];
  for (const student of students) {
    for (const req of student.requirements) {
      if (!typeKeys.has(req.typeKey)) {
        crossIssues.push(makeIssue('warning', 'student', student.id, student.rowNumber, 'requirements', `Requires ${req.count} "${req.type}" elective(s) but the catalogue has no valid electives of that type.`));
      }
    }
  }

  return {
    source,
    fatal,
    electives,
    students,
    columns: {
      electives: { headers: electivesCsv.headers, ...electiveColumns },
      students: { headers: studentsCsv.headers, ...studentColumns },
    },
    issues: [...fileErrors, ...electiveIssues, ...studentIssues, ...crossIssues],
    loadedAt: new Date().toISOString(),
  };
}
