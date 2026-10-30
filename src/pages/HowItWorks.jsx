import Icon from '../components/Icon.jsx';
import { Card, PageHeader, SectionTitle } from '../components/ui.jsx';
import { useApp } from '../store.jsx';
import { navigate } from '../router.js';
import { COMPONENTS, DEFAULT_WEIGHTS, normalizeWeights } from '../utils/scoringEngine.js';
import { ASSUMPTIONS, LIMITATIONS, MANDATORY_RULES } from '../utils/assumptions.js';

const COMPONENT_HELP = {
  career: 'Share of electives whose catalogue career tags match the goal (direct = 100, related pathway = 40).',
  skill: 'How many distinct goal-relevant skills the combination covers.',
  workload: 'Total weekly hours against the comfortable budget for the student\'s preference.',
  difficulty: 'How far each elective\'s difficulty sits above the comfort level estimated from CGPA.',
  weak: 'Penalises electives whose prerequisites are subjects the student marked as weak.',
};

function WeightEditor() {
  const { weights, setWeights } = useApp();
  const normalized = normalizeWeights(weights);
  const isDefault = COMPONENTS.every((c) => weights[c.key] === DEFAULT_WEIGHTS[c.key]);
  return (
    <Card className="card-pad">
      <SectionTitle icon="sliders" title="Scoring weights" description="Configurable assumptions. Changes re-rank every page instantly and are saved in this browser." right={!isDefault && <button className="btn-ghost btn-sm" onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}><Icon name="refresh" size={13} /> Default</button>} />
      <div className="space-y-5">
        {COMPONENTS.map((c) => (
          <div key={c.key}>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`w-${c.key}`} className="text-sm font-medium text-ink-900">{c.label}</label>
              <span className="text-sm font-semibold tabular-nums text-emerald-700">{Math.round(normalized[c.key] * 100)}%</span>
            </div>
            <input id={`w-${c.key}`} type="range" min="0" max="60" step="1" value={weights[c.key]} onChange={(e) => setWeights({ ...weights, [c.key]: Number(e.target.value) })} className="mt-2 w-full accent-emerald-500" />
            <p className="text-xs text-ink-500">{COMPONENT_HELP[c.key]}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-ink-500">Raw slider values are normalised to sum to 100%. Default: 35 / 25 / 15 / 15 / 10.</p>
    </Card>
  );
}

export default function HowItWorks() {
  const { dataset } = useApp();
  const electiveIssues = dataset.issues.filter((i) => i.entity === 'elective');
  const studentIssues = dataset.issues.filter((i) => i.entity === 'student');
  return (
    <>
      <PageHeader eyebrow="Transparency" title="How SKILLORA decides" description="A deterministic, rule-based engine. No AI model, no server, no hidden inputs. Every number on the dashboard can be traced back to the rules below." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[
          { n: '1', t: 'Filter', b: 'Electives that fail a prerequisite, are not offered, are incomplete, or are already cleared are removed for this student.' },
          { n: '2', t: 'Generate', b: 'A depth-first search builds only combinations with the exact count per category, pruning any branch the moment two picks share a slot.' },
          { n: '3', t: 'Score & explain', b: 'Each valid combination gets five 0–100 scores, a weighted total, and an independent re-validation before it can be shown.' },
        ].map((s) => (
          <Card key={s.n} className="card-pad">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-midnight-900 text-sm font-semibold text-emerald-400">{s.n}</span>
            <h3 className="mt-3 font-semibold">{s.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.b}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="card-pad">
            <SectionTitle icon="lock" title="Stage 1 · Mandatory rules" description="Never relaxed, even if that means fewer than three recommendations." />
            <ul className="space-y-3">
              {MANDATORY_RULES.map((r) => (
                <li key={r.title} className="flex gap-3">
                  <Icon name="checkCircle" size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div><p className="text-sm font-medium">{r.title}</p><p className="text-xs leading-relaxed text-ink-500">{r.body}</p></div>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="card-pad">
            <SectionTitle icon="info" title="Assumptions" description="Choices SKILLORA makes where the data is silent." />
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-700 marker:text-ink-300">{ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}</ul>
          </Card>
        </div>
        <div className="space-y-6">
          <WeightEditor />
          <Card className="card-pad">
            <SectionTitle icon="database" title="Data gaps in the loaded dataset" description="Detected automatically when the CSVs were parsed." />
            <p className="text-sm text-ink-700">{electiveIssues.length} elective note{electiveIssues.length === 1 ? '' : 's'} and {studentIssues.length} student note{studentIssues.length === 1 ? '' : 's'}. Records with errors are excluded or flagged, never patched with invented values.</p>
            <button className="btn-secondary btn-sm mt-4" onClick={() => navigate('data')}>Review data & run tests <Icon name="arrowRight" size={13} /></button>
          </Card>
          <Card className="card-pad">
            <SectionTitle icon="alert" title="Why requirements sometimes can't be met" />
            <ul className="space-y-2 text-sm leading-relaxed text-ink-700">
              <li><span className="font-medium">Too few eligible electives in a category:</span> missing prerequisites or courses not offered leave fewer options than the required count.</li>
              <li><span className="font-medium">Timetable congestion:</span> the eligible electives exist, but enough of them share slots that no clash-free set remains.</li>
              <li><span className="font-medium">Missing data:</span> a student record without per-type requirements cannot be validated at all.</li>
            </ul>
            <p className="mt-3 text-xs text-ink-500">In each case the dashboard names the blocking rule and lists what would unlock more options, clearly marked as not valid today.</p>
          </Card>
          <Card className="card-pad">
            <SectionTitle icon="shield" title="Limitations & privacy" />
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-700 marker:text-ink-300">
              {LIMITATIONS.map((l) => <li key={l}>{l}</li>)}
              <li>All parsing and scoring runs in your browser. localStorage keeps only the last selected student, preferences, weights and saved combinations.</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
