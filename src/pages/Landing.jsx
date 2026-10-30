import { useMemo } from 'react';
import Icon from '../components/Icon.jsx';
import { Logo, DataSourceBadge } from '../components/ui.jsx';
import { useApp } from '../store.jsx';
import { navigate } from '../router.js';
import { recommend } from '../utils/recommendationEngine.js';
import { COMPONENTS } from '../utils/scoringEngine.js';

const VALUE_PROPS = [
  { icon: 'target', title: 'Personalised to you', body: 'Ranks combinations on your career goal, skills, workload preference, CGPA-based comfort level and weak subjects.' },
  { icon: 'checkCircle', title: 'Academically valid', body: 'Prerequisites, timetable clashes, category counts and availability are hard rules. Invalid options are never shown as recommendations.' },
  { icon: 'scale', title: 'Transparent trade-offs', body: 'Every recommendation explains what you gain, what you give up, the risks, and how each score was calculated.' },
];

/** A real, live preview: the engine's output for the first student in the loaded dataset. */
function DashboardPreview() {
  const { dataset, weights } = useApp();
  const preview = useMemo(() => {
    const s = dataset.students.find((x) => x.valid);
    return s ? recommend(s, dataset.electives, { weights }) : null;
  }, [dataset, weights]);
  if (!preview || !preview.recommendations.length) return null;
  const top = preview.recommendations[0];
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-2xl shadow-black/40">
      <div className="rounded-xl bg-surface p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Live preview · {preview.student.id}</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink-900">{preview.student.name} · {preview.student.goalLabel}</p>
          </div>
          <span className="chip-emerald shrink-0">{preview.validCount} valid combinations</span>
        </div>
        <div className="mt-4 space-y-2.5">
          {preview.recommendations.map((r) => (
            <div key={r.key} className="flex items-center gap-3 rounded-xl border border-surface-line bg-white p-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-semibold ${r.rank === 1 ? 'bg-emerald-500 text-white' : 'bg-surface-muted text-ink-700'}`}>{r.rank}</span>
              <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-900">{r.electives.map((e) => e.name).join(' · ')}</p>
              <span className="text-sm font-semibold tabular-nums text-ink-900">{r.score.total}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {COMPONENTS.map((c) => (
            <div key={c.key} className="rounded-lg bg-white p-2 ring-1 ring-surface-line">
              <p className="truncate text-[10px] text-ink-500">{c.short}</p>
              <p className="text-sm font-semibold tabular-nums text-ink-900">{Math.round(top.score.components[c.key])}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { dataset } = useApp();
  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden bg-midnight-900 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_10%,rgba(16,185,129,0.16),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Logo dark />
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#/how-it-works" className="hidden rounded-lg px-3 py-2 text-sm text-ink-300 hover:text-white sm:block">How it works</a>
            <a href="#/upload" className="hidden rounded-lg px-3 py-2 text-sm text-ink-300 hover:text-white sm:block">Upload CSV</a>
            <a href="#/suitability" className="hidden rounded-lg px-3 py-2 text-sm text-ink-300 hover:text-white md:block">Check a subject</a>
            <button className="btn btn-sm border border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => navigate('profile')}>Open app</button>
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-16">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Building skill-oriented futures
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              Building skill-oriented<br /><span className="text-emerald-400">futures.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-300">
              SKILLORA finds the three best elective combinations for your goals, checks every prerequisite and timetable slot, and explains exactly what each choice gains and costs you, before registration, not after.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn-primary px-5 py-3" onClick={() => navigate('profile')}>Find My Electives <Icon name="arrowRight" size={16} /></button>
              <button className="btn border border-white/15 bg-white/5 px-5 py-3 text-white hover:bg-white/10" onClick={() => navigate('how-it-works')}>Explore How It Works</button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-400">
              <span className="inline-flex items-center gap-1.5"><Icon name="lock" size={13} /> Runs 100% in your browser</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="checkCircle" size={13} /> Rule-based and deterministic</span>
              <span className="[&_.chip]:border-white/10 [&_.chip]:bg-white/5 [&_.chip]:text-amber-300"><DataSourceBadge source={dataset.source} /></span>
            </div>
          </div>
          <div className="animate-fade-up [animation-delay:120ms]">
            <DashboardPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Why SKILLORA</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Advice from seniors is a start. Evidence is better.</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">Elective choices shape grades, skills and workload for a whole semester. SKILLORA turns the catalogue and your record into a short, honest shortlist.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="card card-pad transition hover:shadow-lift">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Icon name={v.icon} size={20} /></span>
              <h3 className="mt-4 text-[15px] font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{v.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 rounded-2xl bg-midnight-900 p-6 text-white sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 className="text-lg font-semibold">Two stages, zero guesswork</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">Stage 1 discards every combination that breaks a prerequisite, clashes in the timetable, misses a category count or uses an unavailable course. Stage 2 scores what is left on five weighted, documented factors.</p>
          </div>
          <button className="btn-primary" onClick={() => navigate('profile')}>Get my recommendations <Icon name="arrowRight" size={16} /></button>
        </div>
      </section>

      <footer className="border-t border-surface-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>SKILLORA is an advisory tool. It is not affiliated with any institution's registration system and does not guarantee academic or career outcomes.</span>
          <span>Data stays in your browser.</span>
        </div>
      </footer>
    </div>
  );
}
