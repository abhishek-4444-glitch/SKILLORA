import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Card, NeedStudent, PageHeader, SectionTitle } from '../components/ui.jsx';
import { StudentSummary } from '../components/StudentProfile.jsx';
import { useApp } from '../store.jsx';
import { buildReport, reportFileName } from '../utils/reportGenerator.js';
import { collectAcademicRisks } from '../utils/academicRisks.js';

const SECTIONS = [
  'Student profile', 'Recommended combinations', 'Recommendation scores', 'Career alignment', 'Weekly workload',
  'Prerequisite validation', 'Timetable validation', 'Academic risks', 'Trade-offs', 'Unmet requirements', 'Assumptions and limitations',
];

export default function Report() {
  const { student, result, dataset } = useApp();
  const [status, setStatus] = useState(null);
  const risks = useMemo(() => (result ? collectAcademicRisks(result) : null), [result]);
  if (!student || !result) return <><PageHeader eyebrow="Report" title="Academic report" /><NeedStudent /></>;

  const download = () => {
    try {
      const doc = buildReport({ student, result, dataset });
      const name = reportFileName(student);
      const url = URL.createObjectURL(doc.output('blob'));
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (status?.url) URL.revokeObjectURL(status.url);
      setStatus({ ok: true, url, name, text: `${name} is ready (${doc.getNumberOfPages()} page${doc.getNumberOfPages() > 1 ? 's' : ''}). If the download did not start, open it below.` });
    } catch (e) {
      setStatus({ ok: false, text: `The PDF could not be generated: ${e.message}` });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Report"
        title="Final academic report"
        description="A PDF summary of this student's recommendations, validation, risks and trade-offs, generated in the browser."
        actions={<button className="btn-primary" onClick={download}><Icon name="download" size={16} /> Download PDF</button>}
      />
      {status && (
        <div className={`mb-4 flex flex-col gap-2 rounded-xl border p-3 text-sm sm:flex-row sm:items-center sm:justify-between ${status.ok ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800' : 'border-red-200 bg-red-50/60 text-red-700'}`}>
          <span className="flex items-start gap-2"><Icon name={status.ok ? 'checkCircle' : 'xCircle'} size={16} className="mt-0.5 shrink-0" />{status.text}</span>
          {status.url && (
            <span className="flex shrink-0 gap-2">
              <a className="btn-secondary btn-sm" href={status.url} target="_blank" rel="noreferrer">Open PDF</a>
              <a className="btn-secondary btn-sm" href={status.url} download={status.name}>Save again</a>
            </span>
          )}
        </div>
      )}
      <div className="space-y-6">
        <StudentSummary student={student} result={result} />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="card-pad">
            <SectionTitle icon="file" title="Report preview" description="What the PDF will contain for this student." />
            <div className="space-y-3">
              {result.recommendations.map((r) => (
                <div key={r.key} className="rounded-xl border border-surface-line p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Option {r.rank}</p>
                    <p className="text-sm font-semibold tabular-nums text-emerald-700">{r.score.total} / 100</p>
                  </div>
                  <p className="mt-1 text-sm text-ink-700">{r.electives.map((e) => e.name).join(' + ')}</p>
                  <p className="mt-1 text-xs text-ink-500">{r.score.hours} h/week · {r.explanation.sacrifices.length} trade-off{r.explanation.sacrifices.length === 1 ? '' : 's'} · {r.risks.length} risk note{r.risks.length === 1 ? '' : 's'}</p>
                </div>
              ))}
              {result.recommendations.length === 0 && <p className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-700">No valid combination. The report will explain the unmet requirements and possible ways forward.</p>}
              <p className="text-xs text-ink-500">Risk summary: {risks.counts.critical} critical, {risks.counts.high} high, {risks.counts.medium} medium, {risks.counts.low} low.</p>
            </div>
          </Card>
          <Card className="card-pad">
            <SectionTitle icon="checkCircle" title="Sections included" />
            <ul className="space-y-2">
              {SECTIONS.map((s) => <li key={s} className="flex items-center gap-2 text-sm text-ink-700"><Icon name="check" size={14} className="text-emerald-600" strokeWidth={2.25} /> {s}</li>)}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
