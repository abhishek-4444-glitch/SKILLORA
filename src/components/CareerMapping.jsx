import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CAREER_PATHWAYS, careerLabel } from '../utils/careerPathways.js';

/** Every pathway present in the catalogue (known ones plus any unknown CSV tags). */
export function pathwayCoverage(electives) {
  const map = new Map();
  const add = (key, label) => { if (!map.has(key)) map.set(key, { key, label, electives: [], offered: 0 }); };
  CAREER_PATHWAYS.forEach((p) => add(p.key, p.label));
  electives.filter((e) => e.valid && !e.duplicate).forEach((e) => {
    e.careerKeys.forEach((k, i) => {
      add(k, careerLabel(k, e.careerTags[i]));
      const entry = map.get(k);
      entry.electives.push(e);
      if (e.offered) entry.offered++;
    });
  });
  return [...map.values()].sort((a, b) => b.offered - a.offered || a.label.localeCompare(b.label));
}

function CoverageTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-surface-line bg-white px-3 py-2 text-xs shadow-lift">
      <p className="font-medium text-ink-900">{d.label}</p>
      <p className="text-ink-700">{d.offered} offered elective{d.offered === 1 ? '' : 's'} tagged</p>
      <p className="text-ink-700">{d.eligible} eligible for this student</p>
    </div>
  );
}

/** Horizontal bars: offered electives per pathway, selected pathway emphasised. */
export function CoverageChart({ coverage, selected, eligibleKeys, onSelect }) {
  const data = coverage.map((c) => ({ ...c, eligible: c.electives.filter((e) => eligibleKeys.has(e.key)).length }));
  return (
    <div style={{ height: Math.max(220, data.length * 34) }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid horizontal={false} stroke="#EEF0F4" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CoverageTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
          <Bar dataKey="offered" radius={[0, 4, 4, 0]} maxBarSize={16} onClick={(d) => onSelect(d.key)} className="cursor-pointer" label={{ position: 'right', fontSize: 11, fill: '#334155' }}>
            {data.map((d) => <Cell key={d.key} fill={d.key === selected ? '#10B981' : '#CBD5E1'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
