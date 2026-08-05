import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles, Dumbbell, Layers, Trophy, Clock } from 'lucide-react';
import { useWrapped } from '../hooks/useWrapped.js';
import { useRPG } from '../hooks/useRPG.js';
import useSettingsStore from '../store/settingsStore.js';
import { toDisplay, unitLabel } from '../utils/units.js';
import CountUp from '../components/fx/CountUp.jsx';
import ShareButton from '../components/share/ShareButton.jsx';

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="flex-1 rounded-xl p-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
      <Icon size={14} style={{ color: 'var(--color-gold)' }} />
      <p className="mt-1 font-mono text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
    </div>
  );
}

export default function WrappedPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('month');
  const [period, setPeriod] = useState(null);
  const { periods, data, period: active } = useWrapped(period);
  const unit = useSettingsStore((s) => s.unit);
  const effects = useSettingsStore((s) => s.effects);
  const { profile } = useRPG();

  const list = mode === 'month' ? periods.months : periods.years;
  const idx = Math.max(0, list.findIndex((p) => p.key === active?.key && p.kind === active?.kind));

  function switchMode(m) {
    setMode(m);
    const l = m === 'month' ? periods.months : periods.years;
    setPeriod(l[0] ?? null);
  }
  function step(delta) {
    const next = list[idx + delta];
    if (next) setPeriod(next);
  }

  const series = (data?.series ?? []).slice(-16);
  const peak = series.length ? Math.max(...series) : 1;

  const shareData = data && {
    name: profile?.name || 'Athlete',
    label: data.label,
    volumeKg: data.volumeKg,
    unit,
    sessions: data.sessions,
    sets: data.sets,
    prs: data.prs,
    hours: data.hours,
    xp: data.xp,
    topLift: data.topLift,
    busiestDay: data.busiestDay,
    series: data.series,
  };

  return (
    <div className="px-5 pb-8 pt-8">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      <h1 className="flex items-center gap-2 font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        <Sparkles size={26} style={{ color: 'var(--color-gold)' }} /> Wrapped
      </h1>

      {/* Month / Year toggle */}
      <div className="mt-5 flex gap-1 rounded-xl p-1" style={{ background: 'var(--color-ivory)' }}>
        {['month', 'year'].map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="flex-1 rounded-lg py-2 font-sans text-xs font-medium capitalize"
            style={{ background: mode === m ? 'var(--color-chalk)' : 'transparent', color: mode === m ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
          >
            {m === 'month' ? 'By month' : 'By year'}
          </button>
        ))}
      </div>

      {/* Period stepper */}
      <div className="mt-3 flex items-center justify-between rounded-xl px-2 py-2" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <button onClick={() => step(1)} disabled={idx >= list.length - 1} aria-label="Older" className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ opacity: idx >= list.length - 1 ? 0.3 : 1 }}>
          <ChevronLeft size={18} style={{ color: 'var(--color-text-primary)' }} />
        </button>
        <span className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{active?.label ?? data?.label ?? '—'}</span>
        <button onClick={() => step(-1)} disabled={idx <= 0} aria-label="Newer" className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ opacity: idx <= 0 ? 0.3 : 1 }}>
          <ChevronRight size={18} style={{ color: 'var(--color-text-primary)' }} />
        </button>
      </div>

      {!data || !data.hasData ? (
        <div className="mt-12 text-center">
          <Sparkles size={32} style={{ color: 'var(--color-ash)' }} className="mx-auto" />
          <p className="mt-3 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            No training logged in {data?.label ?? 'this period'} yet.
          </p>
        </div>
      ) : (
        <>
          {/* Headline */}
          <div className="mt-6 rounded-2xl p-5" style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-stone)' }}>
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>You lifted</p>
            <p className="mt-1 font-display text-5xl font-bold leading-none" style={{ color: 'var(--color-text-inverse)' }}>
              {effects ? <CountUp value={Math.round(toDisplay(data.volumeKg, unit))} /> : Math.round(toDisplay(data.volumeKg, unit)).toLocaleString()}
              <span className="ml-2 font-sans text-lg" style={{ color: 'var(--color-ash)' }}>{unitLabel(unit)}</span>
            </p>
            <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-ash)' }}>across {data.sessions} {data.sessions === 1 ? 'session' : 'sessions'}</p>

            {series.length > 1 && (
              <div className="mt-4 flex items-end gap-1" style={{ height: 56 }}>
                {series.map((v, i) => (
                  <div key={i} className="flex-1 rounded" style={{ height: `${Math.max(8, (v / peak) * 100)}%`, background: 'var(--color-gold)', opacity: 0.5 + 0.5 * (v / peak) }} />
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-3 flex gap-3">
            <Stat icon={Dumbbell} value={data.sessions} label="Sessions" />
            <Stat icon={Layers} value={data.sets} label="Sets" />
            <Stat icon={Trophy} value={data.prs} label="PRs" />
            <Stat icon={Clock} value={`${Math.round(data.hours)}h`} label="Trained" />
          </div>

          {(data.topLift || data.busiestDay) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.topLift && (
                <span className="rounded-full px-3 py-1.5 font-sans text-xs font-medium" style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}>
                  Top lift · {data.topLift}
                </span>
              )}
              {data.busiestDay && (
                <span className="rounded-full px-3 py-1.5 font-sans text-xs font-medium" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}>
                  Busiest · {data.busiestDay}
                </span>
              )}
              <span className="rounded-full px-3 py-1.5 font-mono text-xs font-medium" style={{ background: 'var(--color-ivory)', color: 'var(--color-gold)' }}>
                +{data.xp.toLocaleString()} XP
              </span>
            </div>
          )}

          <ShareButton
            data={shareData}
            kind="wrapped"
            filename="opus-wrapped.png"
            label="Share Wrapped"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-sans text-sm font-semibold"
            style={{ background: 'var(--color-obsidian)', color: 'var(--color-text-inverse)' }}
          />
        </>
      )}
    </div>
  );
}
