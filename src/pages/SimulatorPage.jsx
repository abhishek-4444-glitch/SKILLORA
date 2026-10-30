import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ComparisonView from '../components/ComparisonView.jsx';
import ScoreBreakdown from '../components/ScoreBreakdown.jsx';
import RiskAlert, { RiskList } from '../components/RiskAlert.jsx';
import { Card, DifficultyDots, NeedStudent, PageHeader, ScoreRing, SectionTitle } from '../components/ui.jsx';
import { useApp } from '../store.jsx';
import { evaluateSelection } from '../utils/recommendationEngine.js';
import { clashes } from '../utils/timetableChecker.js';
import { round1 } from '../utils/text.js';

const STATUS_LABEL = {
  eligible: null,
  'missing-prereq': { text: 'Missing prerequisite', className: 'border-orange-200 bg-orange-50 text-orange-700' },
  unavailable: { text: 'Not offered', className: 'border-red-200 bg-red-50 text-red-700' },
  'invalid-record': { text: 'Incomplete record', className: 'border-red-200 bg-red-50 text-red-700' },
  'already-cleared': { text: 'Already cleared', className: 'border-surface-line bg-surface-muted text-ink-500' },
  'not-required-type': { text: 'Type not required', className: 'border-surface-line bg-surface-muted text-ink-500' },
};

function initialSelection(catalog) {
  const query = window.location.hash.split('?')[1] || '';
  const ids = new URLSearchParams(query).get('combo');
  if (!ids) return null;
  const keys = ids.split(',').map(decodeURIComponent);
  return catalog.filter((e) => !e.duplicate && keys.includes(e.id)).map((e) => e.key);
}

function SimulatorBody() {
  const { student, result, dataset, weights, saved, saveCombination, removeSaved } = useApp();
  const catalog = useMemo(() => dataset.electives.filter((e) => !e.duplicate), [dataset]);
  const byKey = useMemo(() => new Map(catalog.map((e) => [e.key, e])), [catalog]);
  const statusByKey = useMemo(() => new Map(result.eligibility.map((x) => [x.elective.key, x])), [result]);

  const [selectedKeys, setSelectedKeys] = useState(() => initialSelection(catalog) ?? result.recommendations[0]?.electives.map((e) => e.key) ?? []);
  const [replacing, setReplacing] = useState(null);
  const [query, setQuery] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [compare, setCompare] = useState([]);
  const [savedFlash, setSavedFlash] = useState(false);

  const selection = selectedKeys.map((k) => byKey.get(k)).filter(Boolean);
  const evaluation = useMemo(() => evaluateSelection(student, selection, dataset.electives, weights), [student, selection.map((e) => e.key).join(), dataset, weights]); // eslint-disable-line react-hooks/exhaustive-deps
  const top = result.recommendations[0];

  const add = (key) => {
    if (replacing) {
      setSelectedKeys((ks) => ks.map((k) => (k === replacing ? key : k)));
      setReplacing(null);
    } else {
      setSelectedKeys((ks) => [...ks, key]);
    }
  };
  const remove = (key) => {
    setSelectedKeys((ks) => ks.filter((k) => k !== key));
    if (replacing === key) setReplacing(null);
  };

  const groups = useMemo(() => {
    const map = new Map();
    catalog
      .filter((e) => `${e.name} ${e.id} ${e.skillTags.join(' ')} ${e.careerTags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
      .filter((e) => !eligibleOnly || statusByKey.get(e.key)?.status === 'eligible')
      .forEach((e) => {
        if (!map.has(e.type)) map.set(e.type, []);
        map.get(e.type).push(e);
      });
    return [...map.entries()];
  }, [catalog, query, eligibleOnly, statusByKey]);

  const requirementRows = result.student.requirements.map((r) => ({ ...r, have: selection.filter((e) => e.typeKey === r.typeKey).length }));
  const score = evaluation.score;
  const delta = score && top ? round1(score.total - top.score.total) : null;

  const pin = () => {
    if (!selection.length) return;
    setCompare((c) => [...c.filter((x) => x.signature !== selectedKeys.slice().sort().join()), {
      id: `${Date.now()}`,
      signature: selectedKeys.slice().sort().join(),
      label: `Selection ${String.fromCharCode(65 + (c.length % 26))}`,
      electives: selection,
      evaluation,
    }].slice(-3));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      {/* Catalogue */}
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-surface-line p-4 sm:flex-row sm:items-center">
            <input className="input sm:max-w-xs" placeholder="Search electives, skills or careers" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search electives" />
            <label className="inline-flex items-center gap-2 text-xs text-ink-700">
              <input type="checkbox" className="h-4 w-4 accent-emerald-500" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} />
              Eligible only
            </label>
            {replacing && (
              <span className="chip border-violet-200 bg-violet-50 text-violet-700 sm:ml-auto">
                Replacing {byKey.get(replacing)?.name}: pick a substitute
                <button onClick={() => setReplacing(null)} className="ml-1" aria-label="Cancel replace"><Icon name="x" size={12} /></button>
              </span>
            )}
          </div>
          <div className="divide-y divide-surface-line">
            {groups.map(([type, list]) => (
              <div key={type} className="p-4">
                <p className="eyebrow mb-2">{type} <span className="normal-case tracking-normal text-ink-400">· {list.length}</span></p>
                <ul className="space-y-1.5">
                  {list.map((e) => {
                    const selected = selectedKeys.includes(e.key);
                    const st = statusByKey.get(e.key);
                    const badge = STATUS_LABEL[st?.status];
                    const clash = !selected && selection.find((s) => s.key !== replacing && clashes(s, e));
                    return (
                      <li key={e.key} className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center ${selected ? 'border-emerald-300 bg-emerald-50/50' : 'border-surface-line bg-white'}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-ink-900">{e.name}</span>
                            {badge && <span className={`chip ${badge.className}`} title={st.reason}>{badge.text}</span>}
                            {clash && <span className="chip border-red-200 bg-red-50 text-red-700">Clashes with {clash.name}</span>}
                          </div>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-500">
                            <span>{e.id}</span>
                            <span className="font-mono">Slot {e.slots.join(', ') || '—'}</span>
                            <span>{e.hours} h/wk</span>
                            <span className="inline-flex items-center gap-1"><DifficultyDots level={e.difficulty} /> {e.difficultyLabel}</span>
                            {st?.missing.length > 0 && <span className="text-orange-700">needs {st.missing.join(', ')}</span>}
                          </p>
                        </div>
                        {selected ? (
                          <button className="btn-secondary btn-sm" onClick={() => remove(e.key)}><Icon name="minus" size={13} /> Remove</button>
                        ) : (
                          <button className={replacing ? 'btn-dark btn-sm' : 'btn-secondary btn-sm'} onClick={() => add(e.key)}>
                            <Icon name={replacing ? 'swap' : 'plus'} size={13} /> {replacing ? 'Swap in' : 'Add'}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {groups.length === 0 && <p className="p-6 text-center text-sm text-ink-500">No elective matches these filters.</p>}
          </div>
        </Card>

        {compare.length > 0 && (
          <Card className="card-pad">
            <SectionTitle icon="scale" title="Compare selections" description="Pin up to three selections. The best value in each row is highlighted." right={<button className="btn-ghost btn-sm" onClick={() => setCompare([])}>Clear</button>} />
            <ComparisonView items={compare} onRemove={(id) => setCompare((c) => c.filter((x) => x.id !== id))} />
          </Card>
        )}
      </div>

      {/* Live evaluation */}
      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card className="card-pad">
          <div className="flex items-start gap-4">
            <ScoreRing value={score?.total ?? 0} size={72} label="Selection score" />
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Your selection</p>
              <p className={`mt-1 inline-flex items-center gap-1.5 text-sm font-semibold ${evaluation.valid ? 'text-emerald-700' : 'text-red-600'}`}>
                <Icon name={evaluation.valid ? 'checkCircle' : 'xCircle'} size={16} />
                {evaluation.valid ? 'Valid combination' : selection.length ? `${evaluation.violations.length} rule${evaluation.violations.length > 1 ? 's' : ''} broken` : 'Nothing selected'}
              </p>
              {delta !== null && (
                <p className="mt-1 text-xs text-ink-500">
                  {delta === 0 ? 'Same score as' : delta > 0 ? `${delta} above` : `${Math.abs(delta)} below`} recommended option 1 ({top.score.total})
                  {!evaluation.valid && ' · invalid selections are never recommended'}
                </p>
              )}
            </div>
          </div>

          <ul className="mt-5 space-y-1.5">
            {selection.map((e) => (
              <li key={e.key} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${replacing === e.key ? 'bg-violet-50 ring-1 ring-violet-200' : 'bg-surface-muted/70'}`}>
                <span className="min-w-0 flex-1 truncate"><span className="font-medium">{e.name}</span> <span className="text-[11px] text-ink-500">· {e.type} · {e.slots.join(',')}</span></span>
                <button className="rounded p-1 text-ink-500 hover:bg-white hover:text-ink-900" onClick={() => setReplacing(replacing === e.key ? null : e.key)} title="Replace" aria-label={`Replace ${e.name}`}><Icon name="swap" size={14} /></button>
                <button className="rounded p-1 text-ink-500 hover:bg-white hover:text-red-600" onClick={() => remove(e.key)} title="Remove" aria-label={`Remove ${e.name}`}><Icon name="x" size={14} /></button>
              </li>
            ))}
            {selection.length === 0 && <li className="rounded-lg border border-dashed border-surface-line p-4 text-center text-xs text-ink-500">Add electives from the catalogue.</li>}
          </ul>

          <div className="mt-5 space-y-2.5">
            <p className="eyebrow">Category requirements</p>
            {requirementRows.map((r) => (
              <div key={r.typeKey} className="flex items-center justify-between text-xs">
                <span className="text-ink-700">{r.type}</span>
                <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${r.have === r.count ? 'text-emerald-700' : 'text-red-600'}`}>
                  <Icon name={r.have === r.count ? 'check' : 'x'} size={12} strokeWidth={2.5} /> {r.have} / {r.count}
                </span>
              </div>
            ))}
          </div>

          {score && (
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs"><span className="eyebrow">Weekly workload</span><span className="tabular-nums text-ink-700">{score.hours} / {score.budget} h</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className={`h-full rounded-full transition-[width] duration-300 ${score.hours > score.budget ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (score.hours / Math.max(score.budget, 1)) * 100)}%` }} />
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn-secondary btn-sm" onClick={pin} disabled={!selection.length}><Icon name="scale" size={13} /> Pin to compare</button>
            <button className="btn-secondary btn-sm" disabled={!selection.length || savedFlash} onClick={() => { saveCombination(`Custom: ${selection.map((e) => e.name).join(' + ')}`, selection.map((e) => e.id)); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500); }}>
              <Icon name="bookmark" size={13} /> {savedFlash ? 'Saved' : 'Save locally'}
            </button>
            <button className="btn-ghost btn-sm" onClick={() => { setSelectedKeys([]); setReplacing(null); }} disabled={!selection.length}>Clear</button>
          </div>
        </Card>

        {evaluation.violations.length > 0 && (
          <Card className="card-pad">
            <SectionTitle icon="xCircle" title="Hard-rule violations" description="Any one of these makes the selection invalid." />
            <div className="space-y-2">{evaluation.violations.map((v, i) => <RiskAlert key={i} risk={v} compact />)}</div>
          </Card>
        )}

        {score && (
          <Card className="card-pad">
            <SectionTitle icon="grid" title="Score breakdown" />
            <ScoreBreakdown score={score} />
            <div className="mt-5">
              <p className="eyebrow mb-2">Soft risks</p>
              <RiskList risks={evaluation.risks} />
            </div>
          </Card>
        )}

        <Card className="card-pad">
          <SectionTitle icon="bookmark" title="Load a combination" />
          <div className="flex flex-wrap gap-2">
            {result.recommendations.map((r) => (
              <button key={r.key} className="btn-secondary btn-sm" onClick={() => setSelectedKeys(r.electives.map((e) => e.key))}>Option {r.rank}</button>
            ))}
            {result.recommendations.length === 0 && <p className="text-xs text-ink-500">No valid recommendation to load.</p>}
          </div>
          {saved.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {saved.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs">
                  <button className="min-w-0 flex-1 truncate text-left text-ink-700 hover:text-emerald-700" onClick={() => setSelectedKeys(catalog.filter((e) => s.electiveIds.includes(e.id)).map((e) => e.key))} title="Load">{s.name}</button>
                  <button className="rounded p-1 text-ink-400 hover:text-red-600" onClick={() => removeSaved(s.id)} aria-label={`Delete saved ${s.name}`}><Icon name="trash" size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function SimulatorPage() {
  const { student, result } = useApp();
  return (
    <>
      <PageHeader eyebrow="What-if" title="Elective simulator" description="Add, remove or swap electives and watch validity, workload and score recalculate instantly in your browser." />
      {student && result ? <SimulatorBody key={student.id} /> : <NeedStudent />}
    </>
  );
}
