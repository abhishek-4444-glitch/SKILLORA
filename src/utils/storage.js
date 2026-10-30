// localStorage wrapper. Only preferences live here: last selected student ID, scoring
// weights, career/workload/target-skill preferences, and saved elective ID lists.
// Academic records (CGPA, cleared subjects, uploaded CSVs) are never written to storage.

const PREFIX = 'skillora:';

export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearAll() {
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => window.localStorage.removeItem(k));
    return true;
  } catch {
    return false;
  }
}
