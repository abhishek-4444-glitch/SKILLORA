import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import electivesCsv from './data/electives.csv?raw';
import studentsCsv from './data/students.csv?raw';
import { buildDataset } from './utils/dataValidator.js';
import { canonicalCareerKey, careerLabel } from './utils/careerPathways.js';
import { recommend } from './utils/recommendationEngine.js';
import { DEFAULT_WEIGHTS } from './utils/scoringEngine.js';
import { load, save } from './utils/storage.js';

export const SAMPLE_SOURCE = {
  kind: 'synthetic',
  label: 'Synthetic sample data',
  note: 'Demonstration data created for SKILLORA. It is not institutional data.',
};

export const CUSTOM_ID = '__custom__';

const AppContext = createContext(null);

/** Profile fields a student may edit. Preference fields persist; academic fields are session-only. */
const PERSISTED_FIELDS = ['goal', 'workload', 'targetSkills'];

const BLANK_STUDENT = {
  id: CUSTOM_ID,
  name: 'Custom profile',
  goal: '',
  cgpa: null,
  cleared: [],
  weak: [],
  workload: 'Medium',
  requirements: [],
  issues: [],
  valid: true,
  custom: true,
};

function applyOverrides(base, overrides = {}) {
  const student = { ...base, ...overrides };
  student.goalKey = student.goal ? canonicalCareerKey(student.goal) : '';
  student.goalLabel = student.goal ? careerLabel(student.goalKey, student.goal) : '';
  student.editedFields = Object.keys(overrides).filter((k) => JSON.stringify(overrides[k]) !== JSON.stringify(base[k]));
  return student;
}

function withRaw(electivesText, studentsText, source) {
  return { ...buildDataset({ electivesText, studentsText, source }), raw: { electivesText, studentsText } };
}

export function AppProvider({ children }) {
  const [dataset, setDataset] = useState(() => withRaw(electivesCsv, studentsCsv, SAMPLE_SOURCE));
  const [selectedId, setSelectedId] = useState(() => load('lastStudent', null));
  const [weights, setWeightsState] = useState(() => ({ ...DEFAULT_WEIGHTS, ...load('weights', {}) }));
  const [prefs, setPrefs] = useState(() => load('prefs', {}));
  const [sessionEdits, setSessionEdits] = useState({});
  const [saved, setSaved] = useState(() => load('saved', []));

  const baseStudent = useMemo(() => {
    if (selectedId === CUSTOM_ID) return BLANK_STUDENT;
    return dataset.students.find((s) => s.id === selectedId) || null;
  }, [dataset, selectedId]);

  const student = useMemo(() => {
    if (!baseStudent) return null;
    return applyOverrides(baseStudent, { ...(prefs[baseStudent.id] || {}), ...(sessionEdits[baseStudent.id] || {}) });
  }, [baseStudent, prefs, sessionEdits]);

  const result = useMemo(() => (student ? recommend(student, dataset.electives, { weights }) : null), [student, dataset, weights]);

  useEffect(() => {
    if (selectedId) save('lastStudent', selectedId);
  }, [selectedId]);

  const selectStudent = useCallback((id) => setSelectedId(id), []);

  const updateProfile = useCallback((field, value) => {
    if (!baseStudent) return;
    const id = baseStudent.id;
    if (PERSISTED_FIELDS.includes(field)) {
      setPrefs((p) => {
        const next = { ...p, [id]: { ...(p[id] || {}), [field]: value } };
        save('prefs', next);
        return next;
      });
    } else {
      setSessionEdits((e) => ({ ...e, [id]: { ...(e[id] || {}), [field]: value } }));
    }
  }, [baseStudent]);

  const resetProfile = useCallback(() => {
    if (!baseStudent) return;
    const id = baseStudent.id;
    setPrefs((p) => {
      const next = { ...p };
      delete next[id];
      save('prefs', next);
      return next;
    });
    setSessionEdits((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
  }, [baseStudent]);

  const setWeights = useCallback((next) => {
    setWeightsState(next);
    save('weights', next);
  }, []);

  const saveCombination = useCallback((name, electiveIds) => {
    if (!student) return;
    setSaved((list) => {
      const next = [{ id: `${Date.now()}`, studentId: student.id, name, electiveIds, savedAt: new Date().toISOString() }, ...list].slice(0, 30);
      save('saved', next);
      return next;
    });
  }, [student]);

  const removeSaved = useCallback((id) => {
    setSaved((list) => {
      const next = list.filter((s) => s.id !== id);
      save('saved', next);
      return next;
    });
  }, []);

  const loadDataset = useCallback((electivesText, studentsText, source) => {
    const next = withRaw(electivesText, studentsText, source);
    setDataset(next);
    setSessionEdits({});
    setSelectedId((id) => (id === CUSTOM_ID || next.students.some((s) => s.id === id) ? id : null));
    return next;
  }, []);

  const resetDataset = useCallback(() => loadDataset(electivesCsv, studentsCsv, SAMPLE_SOURCE), [loadDataset]);

  const value = {
    dataset,
    student,
    baseStudent,
    result,
    weights,
    setWeights,
    selectStudent,
    updateProfile,
    resetProfile,
    saved: saved.filter((s) => s.studentId === student?.id),
    saveCombination,
    removeSaved,
    loadDataset,
    resetDataset,
    persistedFields: PERSISTED_FIELDS,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
