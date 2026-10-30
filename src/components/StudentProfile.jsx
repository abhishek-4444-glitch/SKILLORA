import { useId, useState } from 'react';
import Icon from './Icon.jsx';
import { normalizeKey } from '../utils/text.js';

/** Small label showing whether a value comes from the CSV or was edited by the student. */
export function OriginTag({ edited, persisted }) {
  if (!edited) return <span className="chip border-surface-line bg-white text-ink-500">CSV</span>;
  return (
    <span className="chip border-violet-200 bg-violet-50 text-violet-700" title={persisted ? 'Saved as a preference in this browser' : 'Edited for this session only'}>
      Edited{persisted ? ' · saved' : ' · session'}
    </span>
  );
}

export function FieldRow({ label, edited, persisted, children, hint }) {
  return (
    <div className="border-b border-surface-line py-4 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-700">{label}</p>
        <OriginTag edited={edited} persisted={persisted} />
      </div>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}

/** Chip list editor with suggestions. */
export function TagEditor({ values, onChange, suggestions = [], placeholder = 'Add…', tone = 'neutral' }) {
  const [draft, setDraft] = useState('');
  const listId = useId();
  const add = (raw) => {
    const value = raw.trim();
    if (!value) return;
    if (values.some((v) => normalizeKey(v) === normalizeKey(value))) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  };
  const chipClass = tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-800' : tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-surface-line bg-surface-muted text-ink-700';
  const remaining = suggestions.filter((s) => !values.some((v) => normalizeKey(v) === normalizeKey(s)));
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {values.length === 0 && <span className="text-xs text-ink-400">None listed</span>}
        {values.map((v) => (
          <span key={v} className={`chip ${chipClass} pr-1`}>
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="rounded-full p-0.5 hover:bg-black/5" aria-label={`Remove ${v}`}>
              <Icon name="x" size={11} strokeWidth={2.25} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="input py-1.5"
          list={listId}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
        />
        <datalist id={listId}>{remaining.map((s) => <option key={s} value={s} />)}</datalist>
        <button type="button" className="btn-secondary btn-sm shrink-0" onClick={() => add(draft)} disabled={!draft.trim()}>
          <Icon name="plus" size={14} /> Add
        </button>
      </div>
    </div>
  );
}

export function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="inline-flex rounded-xl bg-surface-muted p-1" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${value === o.value ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-900'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Compact summary used at the top of several pages. */
export function StudentSummary({ student, result }) {
  const items = [
    { label: 'CGPA', value: student.cgpa ?? '—', hint: student.cgpa === null ? 'Missing, average assumed' : 'out of 10' },
    { label: 'Career goal', value: student.goalLabel || '—', hint: student.goal && student.goal !== student.goalLabel ? `CSV: ${student.goal}` : 'Pathway' },
    { label: 'Workload', value: student.workload || 'Medium', hint: student.workload ? 'Preference' : 'Missing, Medium assumed' },
    { label: 'Required', value: result?.student.requirements.reduce((s, r) => s + r.count, 0) || 0, hint: result?.student.requirements.map((r) => `${r.count} ${r.type}`).join(' · ') || 'Not set' },
    { label: 'Valid combinations', value: result?.validCount ?? 0, hint: result?.search.unconstrained ? `of ${result.search.unconstrained} before clash check` : 'after hard rules', accent: true },
  ];
  return (
    <div className="card card-pad">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-3 md:w-56 md:shrink-0">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-midnight-900 text-sm font-semibold text-emerald-400">
            {student.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{student.name}</p>
            <p className="truncate text-xs text-ink-500">{student.custom ? 'Manual profile' : `${student.id} · row ${student.rowNumber}`}</p>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((i) => (
            <div key={i.label} className="min-w-0">
              <p className="eyebrow">{i.label}</p>
              <p className={`mt-1 truncate text-[15px] font-semibold tabular-nums ${i.accent ? 'text-emerald-600' : 'text-ink-900'}`}>{i.value}</p>
              <p className="truncate text-[11px] text-ink-500" title={i.hint}>{i.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
