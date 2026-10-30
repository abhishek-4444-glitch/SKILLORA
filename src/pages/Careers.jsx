import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { CoverageChart, pathwayCoverage } from '../components/CareerMapping.jsx';
import { Card, NeedStudent, PageHeader, SectionTitle } from '../components/ui.jsx';
import { useApp } from '../store.jsx';
import { recommend } from '../utils/recommendationEngine.js';
import { careerRelation } from '../utils/careerPathways.js';
import { listToSentence } from '../utils/text.js';

function CareerBody() {
  const { student, result, dataset, weights, updateProfile } = useApp();
  const coverage = useMemo(() => pathwayCoverage(dataset.electives), [dataset]);
  const [selected, setSelected] = useState(student.goalKey || coverage[0]?.key);
  const pathway = coverage.find((c) => c.key === selected) || coverage[0];
  const eligibleKeys = useMemo(() => new Set(result.eligibility.filter((x) => x.status === 'eligible').map((x) => x.elective.key)), [result]);

  // Re-run the engine with this pathway as the goal (in memory only, profile unchanged).
  const pathwayResult = useMemo(() => {
    if (!pathway) return null;
    if (pathway.key === student.goalKey && !student.targetSkills?.length) return result;
    return recommend({ ...student, goal: pathway.label, goalKey: pathway.key, goalLabel: pathway.label, targetSkills: [] }, dataset.electives, { weights });
  }, [pathway, student, result, dataset, weights]);

  if (!pathway || !pathwayResult) return null;
  const skillSet = pathwayResult.context.target.skills;
  const top = pathwayResult.recommendations[0];
  const developed = new Set((top?.score.matchedSkills || []).map((s) => s.toLowerCase()));
  const reachable = new Set(pathway.electives.filter((e) => eligibleKeys.has(e.key)).flatMap((e) => e.skillTags.map((s) => s.toLowerCase())));
  const tagged = pathway.electives.filter((e) => e.offered);
  const eligibleTagged = tagged.filter((e) => eligibleKeys.has(e.key));
  const blocked = result.eligibility.filter((x) => x.status === 'missing-prereq' && careerRelation(pathway.key, x.elective.careerKeys) === 'exact');

  const gaps = [];
  if (tagged.length === 0) gaps.push('No offered elective in the dataset carries this career tag, so SKILLORA cannot recommend toward it.');
  else if (tagged.length < 3) gaps.push(`Only ${tagged.length} offered elective${tagged.length > 1 ? 's carry' : ' carries'} this tag; coverage of the pathway is thin.`);
  if (tagged.length > 0 && eligibleTagged.length === 0) gaps.push('None of the tagged electives is currently eligible for this student.');
  const requiredTypes = new Set(result.student.requirements.map((r) => r.typeKey));
  const typesCovered = new Set(tagged.map((e) => e.typeKey));
  const uncoveredTypes = result.student.requirements.filter((r) => !typesCovered.has(r.typeKey)).map((r) => r.type);
  if (uncoveredTypes.length && requiredTypes.size) gaps.push(`No ${listToSentence(uncoveredTypes, 'or')} elective is tagged for this pathway, so those places cannot add direct career relevance.`);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
      <Card className="card-pad">
        <SectionTitle icon="compass" title="Pathway coverage in the dataset" description="Offered electives per career tag. Click a bar to explore it." />
        <CoverageChart coverage={coverage} selected={pathway.key} eligibleKeys={eligibleKeys} onSelect={setSelected} />
        <p className="mt-3 text-[11px] leading-relaxed text-ink-500">Counts come directly from the Electives CSV career tags. SKILLORA does not add industry requirements or predict job outcomes.</p>
      </Card>

      <div className="space-y-6">
        <Card className="card-pad">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Selected pathway</p>
              <h2 className="mt-1 text-xl font-semibold">{pathway.label}</h2>
              <p className="mt-1 text-xs text-ink-500">{tagged.length} offered elective{tagged.length === 1 ? '' : 's'} tagged · {eligibleTagged.length} eligible for {student.name}</p>
            </div>
            {pathway.key === student.goalKey
              ? <span className="chip-emerald"><Icon name="target" size={12} /> Current goal</span>
              : <button className="btn-secondary btn-sm" onClick={() => updateProfile('goal', pathway.label)}>Set as my goal</button>}
          </div>

          <div className="mt-5">
            <p className="eyebrow mb-2">Skills in this pathway (from the dataset)</p>
            <div className="flex flex-wrap gap-1.5">
              {skillSet.map((s) => {
                const isDev = developed.has(s.label.toLowerCase());
                const canReach = reachable.has(s.label.toLowerCase());
                return (
                  <span key={s.key} className={`chip ${isDev ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : canReach ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-surface-line bg-surface-muted text-ink-500'}`} title={`Appears in ${s.frequency} elective(s)`}>
                    {isDev && <Icon name="check" size={11} strokeWidth={2.5} />}{s.label}
                  </span>
                );
              })}
              {skillSet.length === 0 && <span className="text-sm text-ink-500">No skills are tagged for this pathway.</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-500">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-400" />Developed by the top combination</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-sky-400" />Reachable via other eligible electives</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-ink-300" />Blocked or not offered</span>
            </div>
          </div>
        </Card>

        <Card className="card-pad">
          <SectionTitle icon="layers" title="Relevant elective combinations" description={`Top valid combinations when scored toward ${pathway.label}.`} />
          {pathwayResult.recommendations.length ? (
            <ol className="space-y-2">
              {pathwayResult.recommendations.map((r) => (
                <li key={r.key} className="flex items-center gap-3 rounded-xl border border-surface-line p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-muted text-xs font-semibold">{r.rank}</span>
                  <span className="min-w-0 flex-1 text-sm">{r.electives.map((e) => e.name).join(' + ')}</span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold tabular-nums">{r.score.total}</span>
                    <span className="block text-[11px] text-ink-500">career {Math.round(r.score.components.career)}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-ink-500">No valid combination exists for this student, regardless of pathway.</p>}
        </Card>

        <Card className="card-pad">
          <SectionTitle icon="alert" title="Coverage gaps" description="Where the dataset cannot fully support this pathway." />
          {gaps.length || blocked.length ? (
            <ul className="space-y-2 text-sm text-ink-700">
              {gaps.map((g) => <li key={g} className="flex gap-2"><Icon name="info" size={15} className="mt-0.5 shrink-0 text-amber-600" />{g}</li>)}
              {blocked.map((x) => <li key={x.elective.key} className="flex gap-2"><Icon name="lock" size={15} className="mt-0.5 shrink-0 text-orange-600" /><span><span className="font-medium">{x.elective.name}</span> is tagged {pathway.label} but needs {listToSentence(x.missing)}.</span></li>)}
            </ul>
          ) : <p className="text-sm text-emerald-700">The dataset covers this pathway well for this student.</p>}
        </Card>
      </div>
    </div>
  );
}

export default function Careers() {
  const { student, result } = useApp();
  return (
    <>
      <PageHeader eyebrow="Career mapping" title="Career pathways" description="How the electives' career and skill tags line up with each pathway, and what this student can realistically develop." />
      {student && result ? <CareerBody key={student.id} /> : <NeedStudent />}
    </>
  );
}
