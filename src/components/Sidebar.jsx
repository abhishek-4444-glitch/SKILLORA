import { useState } from 'react';
import Icon from './Icon.jsx';
import { DataSourceBadge, Logo } from './ui.jsx';
import { useApp } from '../store.jsx';
import { navigate } from '../router.js';

export const NAV_ITEMS = [
  { route: 'upload', label: 'Upload CSV Files', icon: 'upload' },
  { route: 'profile', label: 'Student Profile', icon: 'user' },
  { route: 'dashboard', label: 'Recommendations', icon: 'grid' },
  { route: 'suitability', label: 'Subject Suitability', icon: 'target' },
  { route: 'simulator', label: 'What-If Simulator', icon: 'sliders' },
  { route: 'risks', label: 'Risk Detector', icon: 'shield' },
  { route: 'careers', label: 'Career Pathways', icon: 'compass' },
  { route: 'report', label: 'Academic Report', icon: 'file' },
];

export const SECONDARY_ITEMS = [
  { route: 'how-it-works', label: 'How It Works', icon: 'book' },
  { route: 'data', label: 'Data & Tests', icon: 'flask' },
];

function NavLink({ item, active, onClick }) {
  return (
    <a
      href={`#/${item.route}`}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${active ? 'bg-white/10 text-white' : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon name={item.icon} size={16} className={active ? 'text-emerald-400' : 'text-ink-500 group-hover:text-ink-300'} />
      {item.label}
    </a>
  );
}

function SidebarBody({ route, onNavigate }) {
  const { student, result, dataset } = useApp();
  return (
    <div className="flex h-full flex-col">
      <a href="#/" onClick={onNavigate} className="px-5 pb-6 pt-5"><Logo dark /></a>

      <button onClick={() => { navigate('profile'); onNavigate?.(); }} className="mx-3 mb-5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">Active student</p>
        {student ? (
          <>
            <p className="mt-1 truncate text-sm font-medium text-white">{student.name}</p>
            <p className="truncate text-xs text-ink-400">{student.goalLabel || 'No goal set'} · {result ? `${result.validCount} valid combos` : ''}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-400">None selected</p>
        )}
      </button>

      <nav className="space-y-0.5 px-3" aria-label="Main">
        {NAV_ITEMS.map((item) => <NavLink key={item.route} item={item} active={route === item.route} onClick={onNavigate} />)}
      </nav>
      <div className="mx-5 my-4 h-px bg-white/10" />
      <nav className="space-y-0.5 px-3" aria-label="Secondary">
        {SECONDARY_ITEMS.map((item) => <NavLink key={item.route} item={item} active={route === item.route} onClick={onNavigate} />)}
      </nav>

      <div className="mt-auto space-y-3 p-4">
        <div className="[&_.chip]:border-white/10 [&_.chip]:bg-white/5 [&_.chip]:text-amber-300"><DataSourceBadge source={dataset.source} /></div>
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-500">
          <Icon name="lock" size={13} className="mt-0.5 shrink-0" />
          All processing happens in this browser. Nothing is sent to a server.
        </p>
      </div>
    </div>
  );
}

export default function Sidebar({ route }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-midnight-900 lg:block">
        <SidebarBody route={route} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-midnight-900 px-4 py-3 lg:hidden">
        <a href="#/"><Logo dark /></a>
        <button className="rounded-lg p-2 text-white hover:bg-white/10" onClick={() => setOpen(true)} aria-label="Open navigation">
          <Icon name="menu" size={20} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-midnight-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade-up bg-midnight-900">
            <button className="absolute right-3 top-4 rounded-lg p-1.5 text-ink-400 hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)} aria-label="Close navigation">
              <Icon name="x" size={18} />
            </button>
            <SidebarBody route={route} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
