import Icon from './Icon.jsx';
import { navigate } from '../router.js';

export function Logo({ dark = false, compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`grid h-8 w-8 place-items-center rounded-lg ${dark ? 'bg-white/10 ring-1 ring-white/15' : 'bg-midnight-900'}`}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M12.5 4.2C11.7 3 10.2 2 8.1 2 5.6 2 3.6 3.4 3.6 5.5c0 2.2 1.9 2.9 4.2 3.4 1.9.4 2.6.7 2.6 1.5 0 .8-.9 1.3-2.3 1.3-1.5 0-2.6-.6-3.3-1.7L3 11.7C3.9 13.1 5.7 14 8.1 14c2.7 0 4.7-1.4 4.7-3.6 0-2.3-1.9-3-4.3-3.5-1.8-.4-2.5-.7-2.5-1.4 0-.7.8-1.1 2-1.1 1.2 0 2.1.5 2.7 1.3z" fill="#10B981" /></svg>
      </span>
      {!compact && <span className={`text-[15px] font-semibold tracking-[0.14em] ${dark ? 'text-white' : 'text-ink-900'}`}>SKILLORA</span>}
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="h-page">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className = '', children, ...rest }) {
  return <div className={`card ${className}`} {...rest}>{children}</div>;
}

export function SectionTitle({ icon, title, description, right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-ink-700"><Icon name={icon} size={16} /></span>}
        <div>
          <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, hint, accent = false }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow">{label}</p>
      <p className={`mt-1.5 truncate text-xl font-semibold tabular-nums ${accent ? 'text-emerald-600' : 'text-ink-900'}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

const SEVERITY_STYLE = {
  critical: { chip: 'border-red-200 bg-red-50 text-red-700', bar: 'bg-red-500', icon: 'xCircle', label: 'Critical' },
  high: { chip: 'border-orange-200 bg-orange-50 text-orange-700', bar: 'bg-orange-500', icon: 'alert', label: 'High' },
  medium: { chip: 'border-amber-200 bg-amber-50 text-amber-800', bar: 'bg-amber-400', icon: 'alert', label: 'Medium' },
  low: { chip: 'border-sky-200 bg-sky-50 text-sky-700', bar: 'bg-sky-400', icon: 'info', label: 'Low' },
  ok: { chip: 'border-emerald-200 bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500', icon: 'checkCircle', label: 'OK' },
};

export function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLE[severity] || SEVERITY_STYLE.low;
  return (
    <span className={`chip ${s.chip}`}>
      <Icon name={s.icon} size={12} strokeWidth={2} />
      {s.label}
    </span>
  );
}

export function severityStyle(severity) {
  return SEVERITY_STYLE[severity] || SEVERITY_STYLE.low;
}

/** Circular score gauge. */
export function ScoreRing({ value, size = 64, stroke = 6, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label || 'Score'} ${value} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E8EE" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#10B981" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 400ms ease' }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold tabular-nums text-ink-900" style={{ fontSize: size < 56 ? 12 : 16 }}>{Math.round(value)}</span>
    </div>
  );
}

export function Meter({ value, className = '' }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-muted ${className}`}>
      <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function EmptyState({ icon = 'info', title, children, action }) {
  return (
    <Card className="card-pad flex flex-col items-center py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-muted text-ink-500"><Icon name={icon} size={20} /></span>
      <h3 className="mt-4 text-base font-semibold text-ink-900">{title}</h3>
      {children && <div className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function NeedStudent() {
  return (
    <EmptyState icon="user" title="Choose a student profile first" action={<button className="btn-primary" onClick={() => navigate('profile')}>Select a student <Icon name="arrowRight" size={16} /></button>}>
      Recommendations are calculated for one student at a time from their goal, CGPA, cleared subjects and elective requirements.
    </EmptyState>
  );
}

export function DataSourceBadge({ source }) {
  if (!source) return null;
  const synthetic = source.kind === 'synthetic';
  return (
    <span className={`chip ${synthetic ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} title={source.note}>
      <Icon name="database" size={12} strokeWidth={2} />
      {source.label}
    </span>
  );
}

export function TypeChip({ type }) {
  return <span className="chip-neutral">{type}</span>;
}

export function DifficultyDots({ level }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Difficulty ${level} of 3`}>
      {[1, 2, 3].map((i) => <span key={i} className={`h-1.5 w-3 rounded-full ${i <= level ? (level === 3 ? 'bg-orange-400' : level === 2 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-surface-line'}`} />)}
    </span>
  );
}
