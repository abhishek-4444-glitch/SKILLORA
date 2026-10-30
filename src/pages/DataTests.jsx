import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import CsvUploader from '../components/CsvUploader.jsx';
import { Card, PageHeader, SectionTitle, SeverityBadge, Stat } from '../components/ui.jsx';
import { useApp } from '../store.jsx';
import { ELECTIVE_FIELDS, STUDENT_FIELDS } from '../utils/csvParser.js';
import { runAllStudentTests } from '../utils/testRunner.js';
import { clearAll } from '../utils/storage.js';

function MappingTable({ title, spec, columns }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="overflow-hidden rounded-xl border border-surface-line">
        <table className="w-full text-xs">
          <tbody>
            {Object.entries(spec).map(([field, s]) => {
              const header = columns.mapping[field];
              const reqCols = field === 'requirements' && !header ? columns.requirementColumns : [];
              return (
                <tr key={field} className="border-b border-surface-line last:border-b-0">
                  <td className="w-1/2 px-3 py-2 text-ink-700">{s.label}{s.required && <span className="text-red-500"> *</span>}</td>
                  <td className="px-3 py-2 font-mono">
                    {header ? <span className="text-emerald-700">{header}</span>
                      : reqCols?.length ? <span className="text-emerald-700">{reqCols.map((c) => c.header).join(', ')}</span>
                        : <span className={s.required ? 'text-red-600' : 'text-ink-400'}>{s.required ? 'not found' : 'not present (optional)'}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {columns.unmapped.length > 0 && <p className="mt-1.5 text-[11px] text-ink-500">Ignored columns: {columns.unmapped.join(', ')}</p>}
    </div>
  );
}

function TestSuite() {
  const { dataset, weights } = useApp();
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);
  const run = () => {
    setRunning(true);
    // Yield one frame so the button state paints before the synchronous run.
    requestAnimationFrame(() => {
      setReport(runAllStudentTests(dataset, { weights }));
      setRunning(false);
    });
  };
  const s = report?.summary;
  return (
    <Card className="card-pad">
      <SectionTitle icon="flask" title="Test every student" description="Runs the engine for each student, re-validates every recommendation independently, and cross-checks valid counts and top scores against an unpruned brute-force search." right={<button className="btn-primary btn-sm" onClick={run} disabled={running}>{running ? 'Running…' : report ? 'Run again' : 'Run tests'}</button>} />
      {!report && <p className="text-sm text-ink-500">No results yet. Results are produced by actually executing the suite in this browser.</p>}
      {report && (
        <>
          <div className="grid grid-cols-2 gap-4 rounded-xl bg-surface-muted/70 p-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Students tested" value={s.totalStudents} />
            <Stat label="3 valid combos" value={s.threeOrMore} accent />
            <Stat label="Fewer than 3" value={s.fewerThanThree} />
            <Stat label="No valid combo" value={s.none} />
            <Stat label="Invalid shown" value={s.invalidCombinations} hint="must be 0" />
            <Stat label="Data failures" value={s.studentDataFailures + s.electiveDataFailures} hint={`${s.studentDataFailures} student · ${s.electiveDataFailures} elective`} />
          </div>
          <p className={`mt-3 flex items-center gap-2 text-sm ${s.checksFailed ? 'text-red-600' : 'text-emerald-700'}`}>
            <Icon name={s.checksFailed ? 'xCircle' : 'checkCircle'} size={16} />
            {s.checksRun - s.checksFailed} of {s.checksRun} checks passed · {s.distinctGoals} distinct career goals · {s.highWorkloadStudents} high-workload students · {Math.round(s.durationMs)} ms
          </p>
          <div className="mt-4 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-ink-400">
                <tr><th className="py-2 pr-3 font-medium">Student</th><th className="py-2 pr-3 font-medium">Goal</th><th className="py-2 pr-3 font-medium">Valid</th><th className="py-2 pr-3 font-medium">Returned</th><th className="py-2 pr-3 font-medium">Top score</th><th className="py-2 pr-3 font-medium">Checks</th><th className="py-2 font-medium">Outcome</th></tr>
              </thead>
              <tbody>
                {report.results.map((r) => (
                  <tr key={r.student.id} className="border-t border-surface-line align-top">
                    <td className="py-2 pr-3"><p className="font-medium text-ink-900">{r.student.id}</p><p className="text-ink-500">{r.student.name}</p></td>
                    <td className="py-2 pr-3 text-ink-700">{r.student.goalLabel || '—'}</td>
                    <td className="py-2 pr-3 tabular-nums">{r.validCount}</td>
                    <td className="py-2 pr-3 tabular-nums">{r.returned}</td>
                    <td className="py-2 pr-3 tabular-nums">{r.topScore ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <span className={r.passed ? 'text-emerald-700' : 'text-red-600'} title={r.checks.map((c) => `${c.pass ? '✓' : '✗'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`).join('\n')}>
                        {r.checks.filter((c) => c.pass).length}/{r.checks.length} passed
                      </span>
                    </td>
                    <td className="py-2 text-ink-700">{r.top[0] || r.diagnostics[0]?.title || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

export default function DataTests() {
  const { dataset } = useApp();
  const [cleared, setCleared] = useState(false);
  const errors = dataset.issues.filter((i) => i.severity === 'error');
  return (
    <>
      <PageHeader eyebrow="Data & testing" title="Data inspection and test suite" description="See how the CSVs were interpreted, every validation problem found, and verify the engine against every student." />
      <div className="space-y-6">
        <CsvUploader compact />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="card-pad">
            <SectionTitle icon="database" title="Detected columns" description="Header names are matched flexibly (case, spaces and underscores ignored)." />
            <div className="space-y-5">
              <MappingTable title={`Electives · ${dataset.electives.length} rows`} spec={ELECTIVE_FIELDS} columns={dataset.columns.electives} />
              <MappingTable title={`Students · ${dataset.students.length} rows`} spec={STUDENT_FIELDS} columns={dataset.columns.students} />
            </div>
            <div className="mt-5 rounded-xl bg-surface-muted p-3 text-[11px] leading-relaxed text-ink-500">
              <p><span className="font-medium text-ink-700">Formats understood:</span> lists separated by “;” or “|” (comma if neither), slots as codes (“A” or “A; D”), difficulty as words or numbers, requirements as “Type:Count; Type:Count” or one numeric column per type (e.g. <span className="font-mono">required_open</span>).</p>
            </div>
          </Card>
          <Card className="card-pad">
            <SectionTitle icon="alert" title="Validation report" description={`${errors.length} error${errors.length === 1 ? '' : 's'}, ${dataset.issues.length - errors.length} warning${dataset.issues.length - errors.length === 1 ? '' : 's'}.`} />
            <div className="scrollbar-thin max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {dataset.issues.length === 0 && <p className="text-sm text-emerald-700">No problems found.</p>}
              {dataset.issues.map((i, k) => (
                <div key={k} className="rounded-xl border border-surface-line p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <SeverityBadge severity={i.severity === 'error' ? 'critical' : 'low'} />
                    <span className="font-medium text-ink-900">{i.entity === 'file' ? i.id : `${i.entity} ${i.id}`}</span>
                    {i.row && <span className="text-ink-500">row {i.row}</span>}
                    <span className="font-mono text-ink-400">{i.field}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-700">{i.message}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <TestSuite />
        <Card className="card-pad flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Local browser data</p>
            <p className="text-xs text-ink-500">Removes saved preferences, weights, saved combinations and the last selected student from this browser.</p>
          </div>
          <button className="btn-secondary btn-sm" disabled={cleared} onClick={() => { if (clearAll()) setCleared(true); }}><Icon name="trash" size={13} /> {cleared ? 'Cleared. Reload to reset the session' : 'Clear local data'}</button>
        </Card>
      </div>
    </>
  );
}
