import Icon from './Icon.jsx';
import { SeverityBadge, severityStyle } from './ui.jsx';

export default function RiskAlert({ risk, compact = false }) {
  const s = severityStyle(risk.severity);
  return (
    <div className={`relative flex gap-3 overflow-hidden rounded-xl border border-surface-line bg-white ${compact ? 'p-3' : 'p-4'}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} />
      <Icon name={s.icon} size={16} className="mt-0.5 shrink-0 text-ink-500" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-ink-900">{risk.title}</p>
          <SeverityBadge severity={risk.severity} />
        </div>
        {risk.detail && <p className="mt-1 text-xs leading-relaxed text-ink-500">{risk.detail}</p>}
      </div>
    </div>
  );
}

export function RiskList({ risks, empty = 'No risks detected.' }) {
  if (!risks.length) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-800">
        <Icon name="checkCircle" size={16} /> {empty}
      </p>
    );
  }
  return <div className="space-y-2">{risks.map((r, i) => <RiskAlert key={`${r.title}-${i}`} risk={r} compact />)}</div>;
}
