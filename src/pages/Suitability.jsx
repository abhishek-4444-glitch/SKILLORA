import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Card, DifficultyDots, NeedStudent, PageHeader, ScoreRing, SectionTitle, TypeChip, severityStyle } from '../components/ui.jsx';
import { useApp } from '../store.jsx';
import { navigate } from '../router.js';
import { checkSuitability, explainRecommendationGap } from '../utils/suitabilityChecker.js';

/** Plain-language answer to "why isn't the system suggesting this subject?" */
function WhyNotRecommended({ suit, result }) {
  const why = explainRecommendationGap(suit, result);
  return (
    <Card className={`card-pad ${why.included ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${why.included ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
          <Icon name={why.included ? 'checkCircle' : 'info'} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{why.included ? 'Recommended for you' : 'Why isn’t this subject recommended?'}</p>
          <p className="mt-1 text-[15px] font-semibold text-ink-900">{why.headline}</p>
          {why.reasons.length > 0 && (
            <ul className="mt-3 space-y-2">
              {why.reasons.map((r) => (
                <li key={r} className="flex gap-2 text-sm leading-relaxed text-ink-700"><Icon name="chevronRight" size={15} className="mt-1 shrink-0 text-amber-600" />{r}</li>
              ))}
            </ul>
          )}
          {why.tips.length > 0 && (
            <div className="mt-4 rounded-xl bg-white/70 p-3">
              <p className="eyebrow mb-1.5">What you can do</p>
              <ul className="space-y-1.5">
                {why.tips.map((t) => <li key={t} className="flex gap-2 text-sm text-ink-700"><Icon name="arrowRight" size={14} className="mt-1 shrink-0 text-emerald-600" />{t}</li>)}
              </ul>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {why.included
              ? <button className="btn-secondary btn-sm" onClick={() => navigate('dashboard')}>View recommendations <Icon name="arrowRight" size={13} /></button>
              : suit.bestCombo && <button className="btn-secondary btn-sm" onClick={() => navigate(`simulator?combo=${suit.bestCombo.electives.map((x) => encodeURIComponent(x.id)).join(',')}`)}><Icon name="sliders" size={13} /> Try it in the simulator</button>}
            {!why.included && suit.verdict !== 'not-eligible' && <button className="btn-ghost btn-sm" onClick={() => navigate('profile')}><Icon name="edit" size={13} /> Edit my profile</button>}
          </div>
        </div>
      </div>
    </Card>
  );
}

const VERDICT_ORDER = { high: 0, suitable: 1, caution: 2, 'no-fit': 3, 'not-eligible': 4 };

function VerdictChip({ result }) {
  const s = severityStyle(result.tone);
  return <span className={`chip ${s.chip}`}><Icon name={s.icon} size={12} strokeWidth={2} />{result.label}</span>;
}

function SuitabilityBody() {
  const { student, result, dataset, weights } = useApp();
  const catalog = useMemo(() => dataset.electives.filter((e) => !e.duplicate), [dataset]);
  const all = useMemo(
    () => catalog.map((e) => checkSuitability(student, e, result.eligibility, dataset.electives, weights))
      .sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || b.fit - a.fit),
    [catalog, student, result, dataset, weights],
  );
  const [selectedKey, setSelectedKey] = useState(() => all[0]?.elective.key);
  const [filter, setFilter] = useState('all');
  const current = all.find((x) => x.elective.key === selectedKey) || all[0];
  const list = all.filter((x) => filter === 'all' || (filter === 'ok' ? ['high', 'suitable'].includes(x.verdict) : x.verdict === filter));
  if (!current) return null;
  const e = current.elective;

  return (
    <div className="space-y-6">
      <Card className="card-pad">
        <label htmlFor="subject" className="label">Choose a subject to check</label>
        <select id="subject" className="input max-w-xl" value={current.elective.key} onChange={(ev) => setSelectedKey(ev.target.value)}>
          {[...new Set(catalog.map((c) => c.type))].map((type) => (
            <optgroup key={type} label={type}>
              {catalog.filter((c) => c.type === type).map((c) => <option key={c.key} value={c.key}>{c.name} ({c.id})</option>)}
            </optgroup>
          ))}
        </select>
      </Card>

      <WhyNotRecommended suit={current} result={result} />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card className="card-pad">
          <div className="flex items-start gap-4">
            <ScoreRing value={current.fit} size={76} label="Suitability" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><VerdictChip result={current} /><TypeChip type={e.type} /></div>
              <h2 className="mt-2 text-xl font-semibold leading-snug">{e.name}</h2>
              <p className="mt-1 text-sm text-ink-700">{current.summary}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
                <span>{e.id}</span>
                <span className="font-mono">Slot {e.slots.join(', ') || '—'}</span>
                <span>{e.hours} h/week</span>
                <span className="inline-flex items-center gap-1"><DifficultyDots level={e.difficulty} /> {e.difficultyLabel}</span>
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <p className="eyebrow">How it fits you</p>
            {current.factors.map((f) => (
              <div key={f.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-ink-700">{f.label}</span>
                  <span className="font-semibold tabular-nums text-ink-900">{Math.round(f.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div className={`h-full rounded-full transition-[width] duration-300 ${f.value >= 70 ? 'bg-emerald-500' : f.value >= 40 ? 'bg-amber-400' : 'bg-orange-500'}`} style={{ width: `${f.value}%` }} />
                </div>
                <p className="mt-1 text-xs text-ink-500">{f.detail}</p>
              </div>
            ))}
          </div>

          {e.skillTags.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow mb-2">Skills you would build</p>
              <div className="flex flex-wrap gap-1.5">
                {e.skillTags.map((s) => <span key={s} className={current.matchedSkills.includes(s) ? 'chip-emerald' : 'chip-neutral'}>{s}</span>)}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="card-pad">
            <SectionTitle icon="lock" title="Mandatory checks" />
            <ul className="space-y-2.5">
              {current.checks.map((c) => (
                <li key={c.label} className="flex gap-2.5">
                  <Icon name={c.pass ? 'checkCircle' : 'xCircle'} size={16} className={`mt-0.5 shrink-0 ${c.pass ? 'text-emerald-600' : 'text-red-600'}`} />
                  <div><p className="text-sm font-medium">{c.label}</p><p className="text-xs text-ink-500">{c.detail}</p></div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="card-pad">
            <SectionTitle icon="layers" title="Best plan that includes it" description={current.combosWithIt ? `${current.combosWithIt} valid combination${current.combosWithIt > 1 ? 's' : ''} include this subject.` : undefined} />
            {current.bestCombo ? (
              <>
                <ul className="space-y-1.5">
                  {current.bestCombo.electives.map((x) => (
                    <li key={x.key} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${x.key === e.key ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-surface-muted/70'}`}>
                      <span className="min-w-0 truncate">{x.name}</span><span className="shrink-0 text-[11px] text-ink-500">{x.type} · {x.slots.join(',')}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-ink-500">Plan score {current.bestCombo.score.total} · {current.bestCombo.score.hours} h/week</span>
                  <button className="btn-secondary btn-sm" onClick={() => navigate(`simulator?combo=${current.bestCombo.electives.map((x) => encodeURIComponent(x.id)).join(',')}`)}>Open in simulator</button>
                </div>
                {result.recommendations[0] && <p className="mt-2 text-[11px] text-ink-500">Your top recommendation scores {result.recommendations[0].score.total}.</p>}
              </>
            ) : <p className="text-sm text-ink-500">No valid combination can include this subject for your current profile.</p>}
          </Card>

          <Card className="card-pad">
            <SectionTitle icon="alert" title="Things to watch" />
            {current.risks.length ? (
              <ul className="space-y-1.5 text-sm text-ink-700">{current.risks.map((r) => <li key={r} className="flex gap-2"><Icon name="alert" size={14} className="mt-1 shrink-0 text-amber-600" />{r}</li>)}</ul>
            ) : <p className="text-sm text-emerald-700">No concerns for your profile.</p>}
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-surface-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Every subject, ranked for you</p>
            <p className="text-xs text-ink-500">Click a row to see its details above.</p>
          </div>
          <select className="input max-w-[220px] py-1.5" value={filter} onChange={(ev) => setFilter(ev.target.value)} aria-label="Filter subjects">
            <option value="all">All subjects ({all.length})</option>
            <option value="ok">Suitable or better</option>
            <option value="caution">Take with caution</option>
            <option value="no-fit">Eligible, no valid plan</option>
            <option value="not-eligible">Not eligible</option>
          </select>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-ink-400">
              <tr><th className="px-4 py-2 font-medium">Subject</th><th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Fit</th><th className="px-3 py-2 font-medium">Verdict</th><th className="px-4 py-2 font-medium">Main reason</th></tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.elective.key} onClick={() => { setSelectedKey(x.elective.key); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`cursor-pointer border-t border-surface-line transition hover:bg-surface-muted/60 ${x.elective.key === current.elective.key ? 'bg-emerald-50/50' : ''}`}>
                  <td className="px-4 py-2.5 font-medium text-ink-900">{x.elective.name}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-500">{x.elective.type}</td>
                  <td className="px-3 py-2.5 font-semibold tabular-nums">{Math.round(x.fit)}</td>
                  <td className="px-3 py-2.5"><VerdictChip result={x} /></td>
                  <td className="px-4 py-2.5 text-xs text-ink-500">{x.checks.find((c) => !c.pass)?.detail || x.risks[0] || x.factors[0].detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function Suitability() {
  const { student, result } = useApp();
  return (
    <>
      <PageHeader eyebrow="Subject check" title="Is this subject right for me?" description="Pick any subject to see whether you can take it, how well it fits your goal, skills, workload and CGPA, and the best plan that includes it." />
      {student && result ? <SuitabilityBody key={student.id} /> : <NeedStudent />}
    </>
  );
}
