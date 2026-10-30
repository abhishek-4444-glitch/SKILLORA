import Icon from './Icon.jsx';
import { COMPONENTS } from '../utils/scoringEngine.js';

/** Side-by-side table of pinned selections. Best value per row is highlighted. */
export default function ComparisonView({ items, onRemove }) {
  if (!items.length) return null;
  const rows = [
    { label: 'Status', render: (x) => x.evaluation.valid ? <span className="chip-emerald">Valid</span> : <span className="chip border-red-200 bg-red-50 text-red-700">{x.evaluation.violations.length} rule{x.evaluation.violations.length > 1 ? 's' : ''} broken</span> },
    { label: 'Overall score', value: (x) => x.evaluation.score?.total ?? 0, best: 'max', fmt: (v) => v },
    ...COMPONENTS.map((c) => ({ label: c.label, value: (x) => x.evaluation.score?.components[c.key] ?? 0, best: 'max', fmt: (v) => Math.round(v) })),
    { label: 'Weekly hours', value: (x) => x.evaluation.score?.hours ?? 0, best: 'min', fmt: (v) => `${v} h` },
    { label: 'Goal skills covered', value: (x) => x.evaluation.score?.matchedSkills.length ?? 0, best: 'max', fmt: (v) => v },
    { label: 'Soft risks', value: (x) => x.evaluation.risks.length, best: 'min', fmt: (v) => v },
  ];
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr>
            <th className="w-40 py-2 pr-3 text-left text-[11px] font-medium uppercase tracking-wider text-ink-400">Metric</th>
            {items.map((x) => (
              <th key={x.id} className="px-3 py-2 text-left align-top">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold leading-snug text-ink-900">{x.label}</span>
                  <button onClick={() => onRemove(x.id)} className="rounded p-0.5 text-ink-400 hover:bg-surface-muted hover:text-ink-900" aria-label={`Remove ${x.label} from comparison`}><Icon name="x" size={13} /></button>
                </div>
                <p className="mt-0.5 text-[11px] font-normal leading-snug text-ink-500">{x.electives.map((e) => e.name).join(', ')}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const values = row.value ? items.map(row.value) : [];
            const target = row.best === 'max' ? Math.max(...values) : Math.min(...values);
            return (
              <tr key={row.label} className="border-t border-surface-line">
                <td className="py-2 pr-3 text-xs text-ink-500">{row.label}</td>
                {items.map((x, i) => (
                  <td key={x.id} className={`px-3 py-2 tabular-nums ${row.value && items.length > 1 && values[i] === target ? 'font-semibold text-emerald-700' : 'text-ink-900'}`}>
                    {row.render ? row.render(x) : row.fmt(values[i])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
