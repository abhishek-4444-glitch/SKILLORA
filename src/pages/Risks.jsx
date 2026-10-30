import { useMemo } from 'react';
import Icon from '../components/Icon.jsx';
import { RiskList } from '../components/RiskAlert.jsx';
import { Card, NeedStudent, PageHeader, SectionTitle, severityStyle } from '../components/ui.jsx';
import { useApp } from '../store.jsx';
import { collectAcademicRisks } from '../utils/academicRisks.js';

export default function Risks() {
  const { student, result } = useApp();
  const risks = useMemo(() => (result ? collectAcademicRisks(result) : null), [result]);
  if (!student || !result) return <><PageHeader eyebrow="Risk detector" title="Academic risk detector" /><NeedStudent /></>;

  return (
    <>
      <PageHeader
        eyebrow="Risk detector"
        title="Academic risk detector"
        description="Everything that could block or strain this student's elective plan, ranked by severity. CGPA alone never blocks an elective; it only informs difficulty guidance."
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {['critical', 'high', 'medium', 'low'].map((sev) => {
          const s = severityStyle(sev);
          return (
            <Card key={sev} className="relative overflow-hidden p-4">
              <span className={`absolute inset-x-0 top-0 h-1 ${s.bar}`} />
              <p className="eyebrow flex items-center gap-1.5"><Icon name={s.icon} size={13} /> {s.label}</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums">{risks.counts[sev]}</p>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {risks.groups.map((g) => (
          <Card key={g.key} className="card-pad">
            <SectionTitle icon={g.icon} title={g.title} right={<span className="chip-neutral tabular-nums">{g.items.length}</span>} />
            <RiskList risks={g.items} empty={g.emptyText} />
          </Card>
        ))}
      </div>
    </>
  );
}
