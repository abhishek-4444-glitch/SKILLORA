import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Card, DataSourceBadge, PageHeader, SectionTitle, SeverityBadge } from '../components/ui.jsx';
import { FieldRow, Segmented, TagEditor } from '../components/StudentProfile.jsx';
import { CUSTOM_ID, useApp } from '../store.jsx';
import { navigate } from '../router.js';
import { CAREER_PATHWAYS, canonicalCareerKey, careerLabel } from '../utils/careerPathways.js';
import { normalizeKey } from '../utils/text.js';

function StudentPicker() {
  const { dataset, student, selectStudent } = useApp();
  const [query, setQuery] = useState('');
  const filtered = dataset.students.filter((s) => `${s.id} ${s.name} ${s.goalLabel}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Card className="flex max-h-[720px] flex-col overflow-hidden">
      <div className="border-b border-surface-line p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Students <span className="font-normal text-ink-500">({dataset.students.length})</span></p>
          <DataSourceBadge source={dataset.source} />
        </div>
        <input className="input" placeholder="Search by name, ID or goal" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search students" />
      </div>
      <ul className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {filtered.map((s) => {
          const active = student?.id === s.id;
          const errors = s.issues.filter((i) => i.severity === 'error').length;
          const warnings = s.issues.length - errors;
          return (
            <li key={s.id}>
              <button onClick={() => selectStudent(s.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-surface-muted'}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-semibold ${active ? 'bg-emerald-500 text-white' : 'bg-surface-muted text-ink-700'}`}>{s.id.slice(-3)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-900">{s.name}</span>
                  <span className="block truncate text-xs text-ink-500">{s.goalLabel || 'No goal'} · CGPA {s.cgpa ?? '—'}</span>
                </span>
                {errors > 0 ? <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" title={`${errors} data error(s)`} /> : warnings > 0 ? <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" title={`${warnings} data warning(s)`} /> : null}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-500">No student matches “{query}”.</li>}
      </ul>
      <div className="border-t border-surface-line p-3">
        <button onClick={() => selectStudent(CUSTOM_ID)} className={`btn-secondary w-full ${student?.id === CUSTOM_ID ? 'ring-2 ring-emerald-200' : ''}`}>
          <Icon name="edit" size={15} /> Enter a profile manually
        </button>
      </div>
    </Card>
  );
}

function RequirementsEditor({ value, onChange, types }) {
  const used = new Set(value.map((r) => r.typeKey));
  const available = types.filter((t) => !used.has(t.key));
  const set = (i, patch) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-xs text-red-600">No requirement set. Add at least one elective type.</p>}
      {value.map((r, i) => (
        <div key={r.typeKey} className="flex items-center justify-between gap-3 rounded-xl border border-surface-line px-3 py-2">
          <span className="text-sm font-medium">{r.type}</span>
          <div className="flex items-center gap-1.5">
            <button className="btn-ghost btn-sm px-2" onClick={() => (r.count <= 1 ? onChange(value.filter((_, j) => j !== i)) : set(i, { count: r.count - 1 }))} aria-label={`Decrease ${r.type}`}><Icon name="minus" size={14} /></button>
            <span className="w-6 text-center text-sm font-semibold tabular-nums">{r.count}</span>
            <button className="btn-ghost btn-sm px-2" onClick={() => set(i, { count: Math.min(6, r.count + 1) })} aria-label={`Increase ${r.type}`}><Icon name="plus" size={14} /></button>
          </div>
        </div>
      ))}
      {available.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {available.map((t) => (
            <button key={t.key} className="btn-secondary btn-sm" onClick={() => onChange([...value, { type: t.label, typeKey: t.key, count: 1 }])}>
              <Icon name="plus" size={12} /> {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileEditor() {
  const { student, baseStudent, dataset, updateProfile, resetProfile, persistedFields, result } = useApp();
  const edited = (f) => student.custom ? student[f] !== undefined && JSON.stringify(student[f]) !== JSON.stringify(baseStudent[f]) : student.editedFields.includes(f);
  const persisted = (f) => persistedFields.includes(f);

  const subjects = useMemo(() => {
    const map = new Map();
    dataset.electives.forEach((e) => e.prerequisites.forEach((p) => map.set(normalizeKey(p), p)));
    dataset.students.forEach((s) => s.cleared.forEach((p) => map.set(normalizeKey(p), p)));
    return [...map.values()].sort();
  }, [dataset]);

  const goalOptions = useMemo(() => {
    const map = new Map(CAREER_PATHWAYS.map((p) => [p.key, p.label]));
    dataset.electives.forEach((e) => e.careerTags.forEach((t) => { const k = canonicalCareerKey(t); if (!map.has(k)) map.set(k, careerLabel(k, t)); }));
    dataset.students.forEach((s) => { if (s.goal && !map.has(s.goalKey)) map.set(s.goalKey, s.goal); });
    return [...map.entries()];
  }, [dataset]);

  const types = useMemo(() => {
    const map = new Map();
    dataset.electives.filter((e) => e.valid).forEach((e) => map.set(e.typeKey, e.type));
    return [...map.entries()].map(([key, label]) => ({ key, label }));
  }, [dataset]);

  const skillSuggestions = useMemo(() => [...new Set(dataset.electives.flatMap((e) => e.skillTags))].sort(), [dataset]);
  const anyEdits = student.custom || student.editedFields.length > 0;

  return (
    <Card className="card-pad">
      <SectionTitle
        icon="user"
        title={student.custom ? 'Manual profile' : 'Academic profile'}
        description={student.custom ? 'Enter your details. Nothing here is sent anywhere.' : 'Values come from the Students CSV. Edits are labelled and never overwrite the original file.'}
        right={anyEdits && !student.custom && <button className="btn-ghost btn-sm" onClick={resetProfile}><Icon name="refresh" size={14} /> Restore CSV values</button>}
      />

      {student.issues.length > 0 && (
        <div className="mb-2 space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-semibold text-amber-900">Data notes for this record</p>
          {student.issues.map((i, k) => (
            <p key={k} className="flex items-start gap-2 text-xs text-amber-900"><SeverityBadge severity={i.severity === 'error' ? 'critical' : 'low'} /> <span className="pt-0.5">{i.message}</span></p>
          ))}
        </div>
      )}

      {student.custom && (
        <FieldRow label="Name" edited={false}>
          <input className="input" value={student.name} onChange={(e) => updateProfile('name', e.target.value || 'Custom profile')} />
        </FieldRow>
      )}

      <FieldRow label="Career goal" edited={edited('goal')} persisted={persisted('goal')} hint={student.goal && canonicalCareerKey(student.goal) !== normalizeKey(student.goal) ? `“${student.goal}” is matched to the ${student.goalLabel} pathway.` : undefined}>
        <select className="input" value={student.goalKey || ''} onChange={(e) => updateProfile('goal', goalOptions.find(([k]) => k === e.target.value)?.[1] || '')}>
          <option value="">Select a career goal</option>
          {goalOptions.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </FieldRow>

      <FieldRow label="Workload preference" edited={edited('workload')} persisted={persisted('workload')} hint="Comfortable hours per elective: Low 4 h · Medium 5.5 h · High 7 h (SKILLORA assumption).">
        <Segmented ariaLabel="Workload preference" value={student.workload || 'Medium'} onChange={(v) => updateProfile('workload', v)} options={[{ value: 'Low', label: 'Low' }, { value: 'Medium', label: 'Medium' }, { value: 'High', label: 'High' }]} />
      </FieldRow>

      <FieldRow label="CGPA (0–10)" edited={edited('cgpa')} hint="Used only to estimate comfort with difficult courses. It never makes an elective ineligible.">
        <input
          className="input max-w-[140px]"
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={student.cgpa ?? ''}
          placeholder="Not set"
          onChange={(e) => {
            const v = e.target.value === '' ? null : Number(e.target.value);
            updateProfile('cgpa', v === null || (Number.isFinite(v) && v >= 0 && v <= 10) ? v : student.cgpa);
          }}
        />
      </FieldRow>

      <FieldRow label="Subjects cleared" edited={edited('cleared')} hint="Prerequisites are checked against this list.">
        <TagEditor values={student.cleared} onChange={(v) => updateProfile('cleared', v)} suggestions={subjects} placeholder="Add a cleared subject" tone="good" />
      </FieldRow>

      <FieldRow label="Weak subjects" edited={edited('weak')} hint="Electives that build on these are flagged and scored lower, never excluded.">
        <TagEditor values={student.weak} onChange={(v) => updateProfile('weak', v)} suggestions={subjects} placeholder="Add a weak subject" tone="warn" />
      </FieldRow>

      <FieldRow label="Electives required per type" edited={edited('requirements')}>
        <RequirementsEditor value={result?.student.requirements || []} onChange={(v) => updateProfile('requirements', v)} types={types} />
      </FieldRow>

      <FieldRow label="Target skills (optional)" edited={edited('targetSkills')} persisted hint="Leave empty to use the skills the dataset associates with your career goal.">
        <TagEditor values={student.targetSkills || []} onChange={(v) => updateProfile('targetSkills', v)} suggestions={skillSuggestions} placeholder="e.g. Python, Docker" />
      </FieldRow>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-muted p-3 text-[11px] leading-relaxed text-ink-500">
        <Icon name="lock" size={13} className="mt-0.5 shrink-0" />
        Goal, workload and target skills are saved as preferences in this browser. CGPA, subjects and requirements edits last for this session only.
      </p>
    </Card>
  );
}

const STEPS = [
  { n: 1, title: 'Load data', body: 'Upload your two CSV files, or use the sample data.', route: 'upload' },
  { n: 2, title: 'Pick a student', body: 'Select a record below or enter a profile manually.' },
  { n: 3, title: 'View recommendations', body: 'See the top three valid combinations, with explanations.', route: 'dashboard' },
];

function GettingStarted({ hasStudent }) {
  const { dataset } = useApp();
  const done = { 1: true, 2: hasStudent, 3: false };
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      {STEPS.map((s) => (
        <button
          key={s.n}
          onClick={() => s.route && (s.n !== 3 || hasStudent) && navigate(s.route)}
          className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${done[s.n] ? 'border-emerald-200 bg-emerald-50/50' : 'border-surface-line bg-white'} ${s.route ? 'hover:shadow-card' : 'cursor-default'}`}
        >
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${done[s.n] ? 'bg-emerald-500 text-white' : 'bg-surface-muted text-ink-700'}`}>
            {done[s.n] ? <Icon name="check" size={14} strokeWidth={2.5} /> : s.n}
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink-900">{s.title}</span>
            <span className="block text-xs text-ink-500">{s.n === 1 ? `${dataset.source.label}: ${dataset.students.length} students, ${dataset.electives.filter((e) => !e.duplicate).length} electives.` : s.body}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Bottom summary with everything the engine will use, and the main call to action. */
function RecommendationLauncher() {
  const { student, result } = useApp();
  const top = result.recommendations[0];
  const statusText = {
    ok: `${result.validCount} valid combinations found. The top 3 are ready.`,
    partial: `Only ${result.recommendations.length} valid combination${result.recommendations.length > 1 ? 's' : ''} exist${result.recommendations.length > 1 ? '' : 's'}. We will explain why.`,
    none: 'No valid combination exists. We will show what blocks it and what you can do.',
    'invalid-profile': 'Elective requirements are missing. Add them above first.',
  }[result.status];
  const details = [
    ['Career goal', student.goalLabel || 'Not set'],
    ['Workload', student.workload || 'Medium (assumed)'],
    ['CGPA', student.cgpa ?? 'Not set'],
    ['Subjects cleared', student.cleared.length],
    ['Weak subjects', student.weak.length ? student.weak.join(', ') : 'None'],
    ['Required electives', result.student.requirements.map((r) => `${r.count} ${r.type}`).join(', ') || 'Not set'],
    ['Eligible electives', result.eligibility.filter((x) => x.status === 'eligible').length],
    ['Blocked by prerequisites', result.eligibility.filter((x) => x.status === 'missing-prereq').length],
  ];
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="eyebrow">Ready to recommend for {student.name}</p>
          <p className={`mt-1.5 text-sm font-medium ${result.status === 'ok' ? 'text-emerald-700' : result.status === 'partial' ? 'text-amber-700' : 'text-red-600'}`}>{statusText}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {details.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[11px] text-ink-500">{k}</dt>
                <dd className="truncate text-sm font-semibold text-ink-900" title={String(v)}>{v}</dd>
              </div>
            ))}
          </dl>
          {top && <p className="mt-4 text-xs text-ink-500">Best match preview: <span className="font-medium text-ink-900">{top.electives.map((e) => e.name).join(' + ')}</span> · score {top.score.total}/100</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <button className="btn-primary px-6 py-3 text-[15px]" onClick={() => navigate('dashboard')} disabled={result.status === 'invalid-profile'}>
            View recommendations <Icon name="arrowRight" size={16} />
          </button>
          <button className="btn-secondary" onClick={() => navigate('suitability')}><Icon name="target" size={15} /> Check a subject</button>
        </div>
      </div>
    </Card>
  );
}

export default function Profile() {
  const { student, result } = useApp();
  return (
    <>
      <GettingStarted hasStudent={Boolean(student)} />
      <PageHeader
        eyebrow="Step 1"
        title="Student profile"
        description="Pick a student from the dataset or enter a profile manually. Recommendations update instantly as you edit."
        actions={student && (
          <button className="btn-primary" onClick={() => navigate('dashboard')} disabled={!result}>
            View recommendations <Icon name="arrowRight" size={16} />
          </button>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <StudentPicker />
        {student ? <ProfileEditor key={student.id} /> : (
          <Card className="card-pad grid place-items-center py-16 text-center">
            <div>
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-surface-muted text-ink-500"><Icon name="user" size={20} /></span>
              <p className="mt-4 font-semibold">Select a student to begin</p>
              <p className="mt-1 text-sm text-ink-500">Their record from the Students CSV will appear here.</p>
            </div>
          </Card>
        )}
      </div>
      {student && result && <RecommendationLauncher />}
    </>
  );
}
