import { useState } from 'react';
import Icon from './Icon.jsx';
import { Card, DataSourceBadge, SectionTitle } from './ui.jsx';
import { useApp } from '../store.jsx';

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

const KINDS = [
  { kind: 'electives', title: 'Electives CSV', hint: 'Elective type, timetable slot, prerequisites, difficulty, weekly hours, career tags, skill tags' },
  { kind: 'students', title: 'Students CSV', hint: 'Career goal, CGPA, subjects cleared, weak subjects, workload preference, electives required per type' },
];

/** Upload area for the two dataset categories. Files are parsed in memory and never stored. */
export default function CsvUploader({ compact = false }) {
  const { dataset, loadDataset, resetDataset } = useApp();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(null);

  const onFile = async (kind, file) => {
    if (!file) return;
    setError('');
    setMessage('');
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setError(`${file.name} is not a .csv file.`);
      return;
    }
    try {
      const text = await readFile(file);
      const electivesText = kind === 'electives' ? text : dataset.raw.electivesText;
      const studentsText = kind === 'students' ? text : dataset.raw.studentsText;
      const files = { ...(dataset.source.files || {}), [kind]: file.name };
      const both = files.electives && files.students;
      const next = loadDataset(electivesText, studentsText, {
        kind: both ? 'uploaded' : 'mixed',
        label: both ? 'Uploaded CSV data' : 'Uploaded + synthetic sample',
        note: `Electives: ${files.electives || 'synthetic sample'} · Students: ${files.students || 'synthetic sample'}. Held in memory only.`,
        files,
      });
      const fileErrors = next.issues.filter((i) => i.entity === 'file');
      setMessage(`${file.name} loaded: ${next.electives.length} electives, ${next.students.length} students, ${next.issues.length} data notes${fileErrors.length ? `, ${fileErrors.length} file-level problems (see Data & Tests)` : ''}.`);
    } catch (e) {
      setError(`Could not read ${file.name}: ${e.message}`);
    }
  };

  return (
    <Card className="card-pad">
      <SectionTitle
        icon="upload"
        title="Upload your CSV files"
        description="Two files: the elective catalogue and the student records. Drop them below or click to browse. Files stay in this browser and are not saved."
        right={<DataSourceBadge source={dataset.source} />}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {KINDS.map(({ kind, title, hint }) => {
          const loaded = dataset.source.files?.[kind];
          return (
            <label
              key={kind}
              onDragOver={(e) => { e.preventDefault(); setDragging(kind); }}
              onDragLeave={() => setDragging(null)}
              onDrop={(e) => { e.preventDefault(); setDragging(null); onFile(kind, e.dataTransfer.files?.[0]); }}
              className={`flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed p-4 transition ${dragging === kind ? 'border-emerald-500 bg-emerald-50' : loaded ? 'border-emerald-300 bg-emerald-50/40' : 'border-ink-300 hover:border-emerald-400 hover:bg-emerald-50/40'}`}
            >
              <span className="flex items-center gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${loaded ? 'bg-emerald-500 text-white' : 'bg-surface-muted text-ink-500'}`}>
                  <Icon name={loaded ? 'check' : 'upload'} size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block truncate text-[11px] text-ink-500">{loaded || 'Using synthetic sample: click or drop a .csv'}</span>
                </span>
              </span>
              {!compact && <span className="text-[11px] leading-relaxed text-ink-500">{hint}</span>}
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { onFile(kind, e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          );
        })}
      </div>
      {message && <p className="mt-3 flex items-start gap-1.5 text-xs text-emerald-700"><Icon name="checkCircle" size={14} className="mt-px shrink-0" />{message}</p>}
      {error && <p className="mt-3 flex items-start gap-1.5 text-xs text-red-600"><Icon name="xCircle" size={14} className="mt-px shrink-0" />{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {dataset.source.kind !== 'synthetic' && <button className="btn-secondary btn-sm" onClick={() => { resetDataset(); setMessage('Restored the synthetic sample data.'); }}><Icon name="refresh" size={13} /> Use sample data</button>}
        <a className="btn-ghost btn-sm" href={URL.createObjectURL(new Blob([dataset.raw.electivesText], { type: 'text/csv' }))} download="electives.csv"><Icon name="download" size={13} /> Download current electives.csv</a>
        <a className="btn-ghost btn-sm" href={URL.createObjectURL(new Blob([dataset.raw.studentsText], { type: 'text/csv' }))} download="students.csv"><Icon name="download" size={13} /> Download current students.csv</a>
      </div>
    </Card>
  );
}
