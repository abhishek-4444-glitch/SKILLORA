import { COMPONENTS } from '../utils/scoringEngine.js';
import { round1 } from '../utils/text.js';

/** Component scores with their weights and weighted contribution to the total. */
export default function ScoreBreakdown({ score }) {
  return (
    <div className="space-y-3">
      {COMPONENTS.map((c) => {
        const value = score.components[c.key];
        const weight = score.weightsUsed[c.key];
        return (
          <div key={c.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-ink-700">{c.label} <span className="font-normal text-ink-400">× {Math.round(weight * 100)}%</span></span>
              <span className="tabular-nums text-ink-500"><span className="font-semibold text-ink-900">{Math.round(value)}</span>/100 · +{round1(value * weight)} pts</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${value}%` }} />
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between border-t border-surface-line pt-3 text-sm">
        <span className="font-medium text-ink-700">Weighted total</span>
        <span className="font-semibold tabular-nums text-ink-900">{score.total} / 100</span>
      </div>
    </div>
  );
}
