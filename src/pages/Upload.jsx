import Icon from '../components/Icon.jsx';
import CsvUploader from '../components/CsvUploader.jsx';
import { Card, PageHeader, SectionTitle } from '../components/ui.jsx';
import { useApp } from '../store.jsx';
import { navigate } from '../router.js';
import { ELECTIVE_FIELDS, STUDENT_FIELDS } from '../utils/csvParser.js';

const EXAMPLES = {
  electives: 'PE01,Machine Learning,Professional,A,Linear Algebra; Python Programming,Hard,6,AI/ML; Data Analytics,Python; Model Evaluation,Yes',
  students: 'S001,Aarav Sharma,AI/ML,8.7,Python Programming; Linear Algebra,Computer Networks,Medium,Professional:2; Open:1',
};

function FormatGuide({ title, spec, example, columns }) {
  return (
    <Card className="card-pad">
      <SectionTitle icon="file" title={title} description="Header names are flexible: “Weekly Hours”, “weekly_hours” and “hours” all work." />
      <ul className="space-y-1.5">
        {Object.entries(spec).map(([field, s]) => {
          const found = columns.mapping[field] || (field === 'requirements' && columns.requirementColumns?.length);
          return (
            <li key={field} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-700">{s.label}{s.required ? <span className="text-red-500"> *</span> : <span className="text-ink-400"> (optional)</span>}</span>
              <span className={`inline-flex items-center gap-1 text-xs ${found ? 'text-emerald-700' : s.required ? 'text-red-600' : 'text-ink-400'}`}>
                <Icon name={found ? 'check' : s.required ? 'x' : 'minus'} size={12} strokeWidth={2.5} />
                {found ? 'found in loaded file' : 'not found'}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="eyebrow mb-1.5 mt-5">Example row</p>
      <pre className="scrollbar-thin overflow-x-auto rounded-lg bg-midnight-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-300">{example}</pre>
    </Card>
  );
}

export default function Upload() {
  const { dataset } = useApp();
  const errors = dataset.issues.filter((i) => i.severity === 'error').length;
  return (
    <>
      <PageHeader
        eyebrow="Your data"
        title="Upload CSV files"
        description="Load your institution's two datasets. SKILLORA reads them in this browser, checks every record, and uses them for all recommendations."
        actions={<button className="btn-primary" onClick={() => navigate('profile')}>Choose a student <Icon name="arrowRight" size={16} /></button>}
      />
      <div className="space-y-6">
        <CsvUploader />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Electives loaded', dataset.electives.filter((e) => !e.duplicate).length],
            ['Students loaded', dataset.students.length],
            ['Data errors', errors],
            ['Data warnings', dataset.issues.length - errors],
          ].map(([k, v]) => (
            <Card key={k} className="p-4">
              <p className="eyebrow">{k}</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums">{v}</p>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <FormatGuide title="1 · Electives CSV" spec={ELECTIVE_FIELDS} example={EXAMPLES.electives} columns={dataset.columns.electives} />
          <FormatGuide title="2 · Students CSV" spec={STUDENT_FIELDS} example={EXAMPLES.students} columns={dataset.columns.students} />
        </div>
        <Card className="card-pad flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-700">Lists use “;” between items. Requirements look like <span className="font-mono">Professional:2; Open:1</span>, or one numeric column per type.</p>
          <button className="btn-secondary btn-sm shrink-0" onClick={() => navigate('data')}>See full validation report <Icon name="arrowRight" size={13} /></button>
        </Card>
      </div>
    </>
  );
}
