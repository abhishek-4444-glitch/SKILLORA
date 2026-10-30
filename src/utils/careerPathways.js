import { normalizeKey } from './text.js';

/**
 * Career vocabulary. Each pathway lists spellings that mean the same thing so that a
 * student goal of "Machine Learning" matches an elective tag of "AI/ML".
 *
 * `adjacent` is an SKILLORA assumption (documented on the How It Works page): pathways that
 * share a substantial body of skills earn partial career credit. It never makes a
 * combination valid or invalid; it only affects the soft score.
 *
 * Tags found in the CSV that are not listed here still work: they match by exact
 * normalised text and simply have no aliases or adjacent pathways.
 */
export const CAREER_PATHWAYS = [
  {
    key: 'aiml',
    label: 'AI / Machine Learning',
    aliases: ['aiml', 'ai', 'ml', 'artificialintelligence', 'machinelearning', 'artificialintelligenceandmachinelearning', 'aiandml', 'datascience'],
    adjacent: ['dataanalytics'],
  },
  {
    key: 'softwaredevelopment',
    label: 'Software Development',
    aliases: ['softwaredevelopment', 'softwareengineering', 'sde', 'softwaredeveloper', 'webdevelopment', 'fullstack', 'appdevelopment'],
    adjacent: ['cloudcomputing', 'productmanagement'],
  },
  {
    key: 'cloudcomputing',
    label: 'Cloud Computing',
    aliases: ['cloudcomputing', 'cloud', 'devops', 'cloudengineering', 'sitereliabilityengineering', 'sre'],
    adjacent: ['softwaredevelopment', 'cybersecurity'],
  },
  {
    key: 'dataanalytics',
    label: 'Data Analytics',
    aliases: ['dataanalytics', 'analytics', 'dataanalysis', 'dataanalyst', 'businessanalytics', 'dataengineering'],
    adjacent: ['aiml'],
  },
  {
    key: 'cybersecurity',
    label: 'Cybersecurity',
    aliases: ['cybersecurity', 'security', 'informationsecurity', 'networksecurity', 'infosec'],
    adjacent: ['cloudcomputing'],
  },
  {
    key: 'embeddedsystems',
    label: 'Embedded Systems',
    aliases: ['embeddedsystems', 'embedded', 'iot', 'internetofthings', 'firmware'],
    adjacent: ['coreengineering'],
  },
  {
    key: 'coreengineering',
    label: 'Core Engineering',
    aliases: ['coreengineering', 'core', 'electronics', 'electrical', 'vlsi', 'mechanical'],
    adjacent: ['embeddedsystems'],
  },
  {
    key: 'productmanagement',
    label: 'Product Management',
    aliases: ['productmanagement', 'product', 'pm', 'productmanager', 'management'],
    adjacent: ['softwaredevelopment'],
  },
];

const ALIAS_INDEX = new Map();
for (const pathway of CAREER_PATHWAYS) {
  for (const alias of pathway.aliases) ALIAS_INDEX.set(alias, pathway.key);
}

/** Maps any career label or tag to a canonical key (falls back to its normalised text). */
export function canonicalCareerKey(text) {
  const key = normalizeKey(text);
  return ALIAS_INDEX.get(key) || key;
}

export function getPathway(key) {
  return CAREER_PATHWAYS.find((p) => p.key === key) || null;
}

export function careerLabel(key, fallback) {
  return getPathway(key)?.label || fallback || key;
}

/** 'exact' | 'adjacent' | 'none' for one elective's career keys against a goal key. */
export function careerRelation(goalKey, careerKeys) {
  if (!goalKey) return 'none';
  if (careerKeys.includes(goalKey)) return 'exact';
  const adjacent = getPathway(goalKey)?.adjacent || [];
  if (careerKeys.some((k) => adjacent.includes(k))) return 'adjacent';
  return 'none';
}
