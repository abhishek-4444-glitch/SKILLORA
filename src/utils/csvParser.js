import Papa from 'papaparse';
import { normalizeKey } from './text.js';

/**
 * Canonical fields SKILLORA needs, with the header spellings it recognises.
 * Headers are compared after normalizeKey(), so "Weekly Hours", "weekly_hours"
 * and "WEEKLY-HOURS" all match "weeklyhours".
 */
export const ELECTIVE_FIELDS = {
  id: { required: false, label: 'Elective ID', aliases: ['electiveid', 'id', 'courseid', 'coursecode', 'code', 'electivecode', 'subjectcode'] },
  name: { required: true, label: 'Elective name', aliases: ['electivename', 'name', 'coursename', 'elective', 'course', 'title', 'subject', 'subjectname'] },
  type: { required: true, label: 'Elective type', aliases: ['electivetype', 'type', 'category', 'electivecategory', 'basket', 'group'] },
  slot: { required: true, label: 'Timetable slot', aliases: ['timetableslot', 'slot', 'timeslot', 'timetable', 'schedule', 'slotcode'] },
  prerequisites: { required: true, label: 'Prerequisites', aliases: ['prerequisites', 'prerequisite', 'prereqs', 'prereq', 'requiredsubjects', 'prerequisitesubjects'] },
  difficulty: { required: true, label: 'Difficulty', aliases: ['difficulty', 'difficultylevel', 'level', 'difficultyrating'] },
  hours: { required: true, label: 'Weekly hours', aliases: ['weeklyhours', 'hours', 'hoursperweek', 'workload', 'weeklyworkload', 'contacthours'] },
  careerTags: { required: true, label: 'Career tags', aliases: ['careertags', 'careertag', 'careers', 'career', 'careerpaths', 'careerpath'] },
  skillTags: { required: true, label: 'Skill tags', aliases: ['skilltags', 'skilltag', 'skills', 'skill'] },
  offered: { required: false, label: 'Offered', aliases: ['offered', 'available', 'availability', 'status', 'isoffered', 'active'] },
};

export const STUDENT_FIELDS = {
  id: { required: false, label: 'Student ID', aliases: ['studentid', 'id', 'rollno', 'rollnumber', 'regno', 'registrationnumber', 'usn'] },
  name: { required: false, label: 'Student name', aliases: ['studentname', 'name', 'fullname', 'student'] },
  goal: { required: true, label: 'Career goal', aliases: ['careergoal', 'goal', 'studentgoal', 'career', 'targetcareer', 'careerinterest'] },
  cgpa: { required: true, label: 'CGPA', aliases: ['cgpa', 'gpa', 'cpi', 'grade', 'cumulativegpa'] },
  cleared: { required: true, label: 'Subjects cleared', aliases: ['subjectscleared', 'clearedsubjects', 'cleared', 'completedsubjects', 'subjectspassed', 'passedsubjects', 'completedcourses'] },
  weak: { required: true, label: 'Weak subjects', aliases: ['weaksubjects', 'weak', 'weakareas', 'weaknesses', 'strugglingsubjects'] },
  workload: { required: true, label: 'Workload preference', aliases: ['workloadpreference', 'workload', 'preferredworkload', 'workloadpref', 'load'] },
  requirements: { required: false, label: 'Electives required per type', aliases: ['requiredelectives', 'electivesrequired', 'requirements', 'electiverequirements', 'requiredpertype', 'electivesrequiredpertype', 'categoryrequirements'] },
};

/** Per-type requirement columns such as "required_professional" or "open_electives_required". */
const REQUIREMENT_PREFIX = /^(?:required|req|numberof|noof|num|count)(.+)$/;
const REQUIREMENT_SUFFIX = /^(.+?)(?:required|count|req|needed)$/;

function detectRequirementColumn(header) {
  const key = normalizeKey(header);
  if (STUDENT_FIELDS.requirements.aliases.includes(key)) return null;
  const match = key.match(REQUIREMENT_PREFIX) || key.match(REQUIREMENT_SUFFIX);
  if (!match) return null;
  const typeKey = match[1].replace(/electives?$/, '');
  if (!typeKey || ['subjects', 'subject', 'hours', 'credits'].includes(typeKey)) return null;
  return typeKey;
}

/** Maps each canonical field to the first matching header in the file. */
export function detectColumns(headers, fieldSpec, { detectRequirementColumns = false } = {}) {
  const mapping = {};
  const used = new Set();
  for (const [field, spec] of Object.entries(fieldSpec)) {
    for (const alias of spec.aliases) {
      const header = headers.find((h) => !used.has(h) && normalizeKey(h) === alias);
      if (header) {
        mapping[field] = header;
        used.add(header);
        break;
      }
    }
  }
  const requirementColumns = [];
  if (detectRequirementColumns) {
    for (const header of headers) {
      if (used.has(header)) continue;
      const typeKey = detectRequirementColumn(header);
      if (typeKey) {
        requirementColumns.push({ header, typeKey });
        used.add(header);
      }
    }
  }
  const missing = Object.entries(fieldSpec)
    .filter(([field, spec]) => spec.required && !mapping[field])
    .map(([field]) => field);
  if (detectRequirementColumns && !mapping.requirements && requirementColumns.length === 0) {
    missing.push('requirements');
  }
  const unmapped = headers.filter((h) => !used.has(h));
  return { mapping, missing, unmapped, requirementColumns };
}

/** Parses CSV text into rows with trimmed headers. Never throws; problems are returned. */
export function parseCsvText(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { headers: [], rows: [], errors: [{ message: 'The file is empty.' }] };
  }
  const result = Papa.parse(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields || []).filter(Boolean);
  const errors = result.errors.map((e) => ({
    message: e.message,
    // +2: one for the header line, one to make the row number 1-based.
    row: typeof e.row === 'number' ? e.row + 2 : undefined,
  }));
  return { headers, rows: result.data, errors };
}
