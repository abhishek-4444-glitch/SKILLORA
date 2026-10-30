import Icon from '../components/Icon.jsx';
import RecommendationCard from '../components/RecommendationCard.jsx';
import RiskAlert from '../components/RiskAlert.jsx';
import { StudentSummary } from '../components/StudentProfile.jsx';
import { Card, NeedStudent, PageHeader, SectionTitle } from '../components/ui.jsx';
import { useApp } from '../store.jsx';
import { navigate } from '../router.js';
import { plural } from '../utils/text.js';

export function EligibilitySummary({ result }) {
  const counts = result.eligibility.reduce((acc, x) => ({ ...acc, [x.status]: (acc[x.status] || 0) + 1 }), {});
  return (
    <Card className="card-pad">
      <SectionTitle icon="layers" title="Academic eligibility" description="How the catalogue looks for this student after the hard rules." />
      <div className="space-y-3">
        {result.requirementAnalysis.map((r) => (
          <div key={r.typeKey}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-ink-700">{r.type} <span className="font-normal text-ink-400">· need {r.required}</span></span>
              <span className={`font-semibold tabular-nums ${r.feasible ? 'text-ink-900' : 'text-red-600'}`}>{r.eligible} / {r.total} eligible</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="bg-emerald-500" style={{ width: `${r.total ? (r.eligible / r.total) * 100 : 0}%` }} />
              <div className="bg-orange-300" style={{ width: `${r.total ? (r.blockedByPrereq / r.total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
        {result.requirementAnalysis.length === 0 && <p className="text-sm text-ink-500">No elective requirements set.</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Eligible {counts.eligible || 0}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-orange-300" />Missing prerequisite {counts['missing-prereq'] || 0}</span>
        <span>Not offered {counts.unavailable || 0}</span>
        <span>Incomplete record {counts['invalid-record'] || 0}</span>
        {counts['already-cleared'] ? <span>Already cleared {counts['already-cleared']}</span> : null}
      </div>
    </Card>
  );
}

export function UnmetPanel({ result }) {
  if (result.status === 'ok') return null;
  const tone = result.status === 'partial' ? 'border-amber-200 bg-amber-50/70' : 'border-red-200 bg-red-50/60';
  return (
    <Card className={`card-pad ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon name="alert" size={20} className={result.status === 'partial' ? 'text-amber-600' : 'text-red-600'} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink-900">
            {result.status === 'partial'
              ? `Only ${plural(result.recommendations.length, 'valid combination')} could be found (3 requested)`
              : result.status === 'invalid-profile' ? 'This profile cannot be evaluated yet' : 'No valid combination exists for this profile'}
          </h2>
          <p className="mt-1 text-sm text-ink-700">SKILLORA never relaxes a mandatory rule to fill the list. Here is exactly what blocks more options.</p>
          <div className="mt-4 space-y-2">{result.diagnostics.map((d, i) => <RiskAlert key={i} risk={d} compact />)}</div>
          {result.alternatives.length > 0 && (
            <div className="mt-5">
              <p className="eyebrow mb-2">Possible ways forward (not valid options today)</p>
              <ul className="space-y-1.5">
                {result.alternatives.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-700"><Icon name="arrowRight" size={14} className="mt-1 shrink-0 text-ink-400" /><span><span className="font-medium text-ink-900">{a.title}.</span> {a.detail}</span></li>
                ))}
              </ul>
            </div>
          )}
          {result.status === 'invalid-profile' && <button className="btn-primary mt-5" onClick={() => navigate('profile')}>Edit profile</button>}
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { student, result, saveCombination, saved } = useApp();
  if (!student || !result) return <><PageHeader eyebrow="Step 2" title="Recommendations" /><NeedStudent /></>;
  const recs = result.recommendations;

  return (
    <>
      <PageHeader
        eyebrow="Step 2"
        title="Your recommended combinations"
        description={`Ranked from ${plural(result.validCount, 'valid combination')}. Every option below has passed prerequisite, timetable, category and availability checks.`}
        actions={<>
          <button className="btn-secondary" onClick={() => navigate('profile')}><Icon name="edit" size={15} /> Edit profile</button>
          <button className="btn-dark" onClick={() => navigate('report')}><Icon name="download" size={15} /> Report</button>
        </>}
      />
      <div className="space-y-6">
        <StudentSummary student={student} result={result} />
        <UnmetPanel result={result} />

        {recs.length > 0 && (
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              {recs.map((rec) => (
                <RecommendationCard key={rec.key} rec={rec} defaultOpen={rec.rank === 1} onSave={(r) => saveCombination(`Option ${r.rank}: ${r.electives.map((e) => e.name).join(' + ')}`, r.electives.map((e) => e.id))} />
              ))}
            </div>
            <div className="space-y-6">
              <EligibilitySummary result={result} />
              {saved.length > 0 && (
                <Card className="card-pad">
                  <SectionTitle icon="bookmark" title="Saved in this browser" />
                  <ul className="space-y-1.5 text-xs text-ink-700">
                    {saved.slice(0, 5).map((s) => <li key={s.id} className="truncate">{s.name}</li>)}
                  </ul>
                  <button className="btn-ghost btn-sm mt-3 px-0" onClick={() => navigate('simulator')}>Manage in simulator <Icon name="arrowRight" size={13} /></button>
                </Card>
              )}
            </div>
          </div>
        )}
        {recs.length === 0 && <EligibilitySummary result={result} />}
      </div>
    </>
  );
}
