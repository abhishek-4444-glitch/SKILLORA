import { useState } from 'react';
import Icon from './Icon.jsx';
import ScoreBreakdown from './ScoreBreakdown.jsx';
import { RiskList } from './RiskAlert.jsx';
import { DifficultyDots, ScoreRing, TypeChip } from './ui.jsx';
import { SERIES_COLORS } from './WorkloadChart.jsx';
import { navigate } from '../router.js';

const RELATION = {
  exact: { label: 'Direct match', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  adjacent: { label: 'Related', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  none: { label: 'Not aligned', className: 'border-surface-line bg-surface-muted text-ink-500' },
};

function Check({ label }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
      <Icon name="check" size={12} strokeWidth={2.5} /> {label}
    </span>
  );
}

function Explain({ q, children }) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{q}</p>
      <div className="text-sm leading-relaxed text-ink-700">{children}</div>
    </div>
  );
}

export default function RecommendationCard({ rec, onSave, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [saved, setSaved] = useState(false);
  const { score, explanation } = rec;
  const color = SERIES_COLORS[rec.rank - 1];

  return (
    <article className="card overflow-hidden transition-shadow hover:shadow-lift">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <ScoreRing value={score.total} label={`Option ${rec.rank} score`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} /> Option {rec.rank}
              </span>
              {rec.rank === 1 && <span className="chip-emerald">Best match</span>}
            </div>
            <h3 className="mt-1 text-base font-semibold leading-snug text-ink-900">{rec.electives.map((e) => e.name).join(' + ')}</h3>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <Check label="Prerequisites met" />
              <Check label="No timetable clash" />
              <Check label="Category counts met" />
              <Check label="All offered" />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Weekly hours', `${score.hours} h`, `budget ${score.budget} h`],
            ['Avg difficulty', `${score.avgDifficulty} / 3`, score.avgDifficulty >= 2.5 ? 'Demanding' : score.avgDifficulty >= 1.7 ? 'Moderate' : 'Light'],
            ['Career relevance', `${Math.round(score.components.career)}`, `${score.facts.filter((f) => f.relation === 'exact').length}/${rec.electives.length} direct`],
            ['Skill relevance', `${Math.round(score.components.skill)}`, `${score.matchedSkills.length} goal skills`],
          ].map(([k, v, h]) => (
            <div key={k} className="rounded-xl bg-surface-muted/70 px-3 py-2.5">
              <p className="text-[11px] text-ink-500">{k}</p>
              <p className="text-[15px] font-semibold tabular-nums text-ink-900">{v}</p>
              <p className="truncate text-[11px] text-ink-500">{h}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-ink-400">
                <th className="py-2 pr-3 font-medium">Elective</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Slot</th>
                <th className="py-2 pr-3 font-medium">Difficulty</th>
                <th className="py-2 pr-3 font-medium">Hours</th>
                <th className="py-2 font-medium">Career</th>
              </tr>
            </thead>
            <tbody>
              {rec.electives.map((e, i) => {
                const rel = RELATION[score.facts[i].relation];
                return (
                  <tr key={e.key} className="border-t border-surface-line">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-ink-900">{e.name}</p>
                      <p className="text-[11px] text-ink-500">{e.id}{e.prerequisites.length ? ` · needs ${e.prerequisites.join(', ')}` : ' · no prerequisites'}</p>
                    </td>
                    <td className="py-2.5 pr-3"><TypeChip type={e.type} /></td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-ink-700">{e.slots.join(', ')}</td>
                    <td className="py-2.5 pr-3"><span className="inline-flex items-center gap-2 text-xs text-ink-700"><DifficultyDots level={e.difficulty} />{e.difficultyLabel}</span></td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink-700">{e.hours}</td>
                    <td className="py-2.5"><span className={`chip ${rel.className}`}>{rel.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink-700">{explanation.why}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <Icon name="chevronDown" size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} /> {open ? 'Hide' : 'Show'} full explanation
          </button>
          <button className="btn-ghost btn-sm" onClick={() => navigate(`simulator?combo=${rec.electives.map((e) => encodeURIComponent(e.id)).join(',')}`)}>
            <Icon name="sliders" size={14} /> Open in simulator
          </button>
          {onSave && (
            <button className="btn-ghost btn-sm" onClick={() => { onSave(rec); setSaved(true); }} disabled={saved}>
              <Icon name="bookmark" size={14} /> {saved ? 'Saved locally' : 'Save'}
            </button>
          )}
          {rec.risks.length > 0 && <span className="ml-auto text-xs text-ink-500">{rec.risks.length} risk note{rec.risks.length > 1 ? 's' : ''}</span>}
        </div>
      </div>

      {open && (
        <div className="grid animate-fade-up gap-6 border-t border-surface-line bg-surface/60 p-5 sm:p-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            <Explain q="1 · Why this combination">{explanation.why}</Explain>
            <Explain q="2 · Fit with your career goal">{explanation.career}</Explain>
            <Explain q="3 · Skills you will develop">
              <div className="flex flex-wrap gap-1.5">
                {explanation.skills.map((s) => <span key={s} className="chip-emerald">{s}</span>)}
                {explanation.otherSkills.map((s) => <span key={s} className="chip-neutral">{s}</span>)}
                {explanation.skills.length + explanation.otherSkills.length === 0 && <span className="text-ink-500">The dataset lists no skill tags for these electives.</span>}
              </div>
              <p className="mt-1.5 text-[11px] text-ink-500">Green: skills linked to your goal in the dataset. Grey: additional skills.</p>
            </Explain>
            <Explain q="4 · Weekly workload">{explanation.workload}</Explain>
            <div className="grid gap-5 sm:grid-cols-2">
              <Explain q="6 · What you gain">
                <ul className="space-y-1.5">{explanation.gains.map((g) => <li key={g} className="flex gap-2"><Icon name="plus" size={14} className="mt-1 shrink-0 text-emerald-600" />{g}</li>)}</ul>
              </Explain>
              <Explain q="7 · What you give up">
                <ul className="space-y-1.5">{explanation.sacrifices.map((g) => <li key={g} className="flex gap-2"><Icon name="minus" size={14} className="mt-1 shrink-0 text-orange-500" />{g}</li>)}</ul>
              </Explain>
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <p className="eyebrow mb-3">Score breakdown</p>
              <ScoreBreakdown score={score} />
            </div>
            <div>
              <p className="eyebrow mb-2">5 · Academic risks</p>
              <RiskList risks={rec.risks} empty="No soft risks: workload, difficulty and foundations all look comfortable." />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
