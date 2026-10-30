import { Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COMPONENTS } from '../utils/scoringEngine.js';

// Categorical slots 1–3 of the validated reference palette (identity of options #1–#3).
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a'];
const AXIS = { fontSize: 11, fill: '#64748B' };

function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-surface-line bg-white px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-medium text-ink-900">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink-700">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="font-semibold tabular-nums text-ink-900">{p.value}{unit}</span>
        </p>
      ))}
    </div>
  );
}

/** Weekly hours of each recommended option against the student's comfortable budget. */
export function WorkloadChart({ recommendations }) {
  const budget = recommendations[0]?.score.budget ?? 0;
  const data = recommendations.map((r) => ({ name: `Option ${r.rank}`, hours: r.score.hours, fill: SERIES_COLORS[r.rank - 1] }));
  const max = Math.max(budget, ...data.map((d) => d.hours)) + 4;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 12, left: -16, bottom: 0 }} barCategoryGap="35%">
          <CartesianGrid vertical={false} stroke="#EEF0F4" />
          <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[0, Math.ceil(max)]} unit="h" />
          <Tooltip content={<ChartTooltip unit=" h/week" />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
          <ReferenceLine y={budget} stroke="#0F172A" strokeDasharray="4 4" label={{ value: `Comfortable: ${budget} h`, position: 'insideTopRight', fontSize: 11, fill: '#334155' }} />
          <Bar dataKey="hours" name="Weekly hours" radius={[4, 4, 0, 0]} maxBarSize={56} label={{ position: 'top', fontSize: 11, fill: '#334155' }}>
            {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The five score components side by side for the recommended options. */
export function ComparisonChart({ recommendations }) {
  const data = COMPONENTS.map((c) => {
    const row = { name: c.short };
    recommendations.forEach((r) => { row[`o${r.rank}`] = Math.round(r.score.components[c.key]); });
    return row;
  });
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="#EEF0F4" />
          <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#334155', paddingTop: 8 }} />
          {recommendations.map((r) => (
            <Bar key={r.rank} dataKey={`o${r.rank}`} name={`Option ${r.rank}`} fill={SERIES_COLORS[r.rank - 1]} radius={[4, 4, 0, 0]} maxBarSize={18} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
