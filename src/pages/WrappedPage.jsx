import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { m } from '../motion/index.jsx';
import { useWrapped } from '../hooks/useWrapped.js';
import { useRPG } from '../hooks/useRPG.js';
import useSettingsStore from '../store/settingsStore.js';
import { toDisplay, unitLabel } from '../utils/units.js';
import { STAT_KANJI, UI_KANJI } from '../utils/kanji.js';
import CountUp from '../components/fx/CountUp.jsx';
import ShareButton from '../components/share/ShareButton.jsx';
import BackButton from '../components/layout/BackButton.jsx';
import { BrushBar, InkTabs, Seal } from '../components/ink/index.js';
import useInkMotion from '../components/ink/useInkMotion.js';
import '../styles/ink-journal.css';

// The Season scroll: the chosen month or year painted on one long washi scroll,
// rolled on two rods. Everything on it is the period's real numbers; the share
// button renders the same data to the 1080 card.

function Stat({ kanji, value, label }) {
  return (
    <div className="wr-stat">
      <span className="wr-stat__k" lang="ja" aria-hidden>{kanji}</span>
      <span className="wr-stat__v">{value}</span>
      <span className="wr-stat__l">{label}</span>
    </div>
  );
}

export default function WrappedPage() {
  const [mode, setMode] = useState('month');
  const [period, setPeriod] = useState(null);
  const { periods, data, period: active } = useWrapped(period);
  const unit = useSettingsStore((s) => s.unit);
  const effects = useSettingsStore((s) => s.effects);
  const motionOn = useInkMotion();
  const { profile } = useRPG();

  const list = mode === 'month' ? periods.months : periods.years;
  const idx = Math.max(0, list.findIndex((p) => p.key === active?.key && p.kind === active?.kind));

  function switchMode(next) {
    setMode(next);
    const l = next === 'month' ? periods.months : periods.years;
    setPeriod(l[0] ?? null);
  }
  function step(delta) {
    const next = list[idx + delta];
    if (next) setPeriod(next);
  }

  const series = (data?.series ?? []).slice(-16);
  // A cardio-only period has weeks but no tonnage: every bar is 0, the peak is
  // 0, and v / peak is NaN. No lifting, no sparkline.
  const peak = series.length ? Math.max(...series) : 0;
  const showSpark = series.length > 1 && peak > 0;
  const volume = data ? Math.round(toDisplay(data.volumeKg, unit)) : 0;

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

  // Sections settle onto the scroll one after another; still when motion is off.
  const rise = (i) => (motionOn ? { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.1 + i * 0.09, ease: [0.16, 0.84, 0.3, 1] } } : {});

  return (
    <div className="jr-page jr-page--pad">
      <header className="jr-head">
        <div className="jr-head__l">
          <BackButton fallback="/profile" label="" className="" />
          <h1 className="jr-title">Wrapped</h1>
        </div>
        <span className="jr-kanji" lang="ja" aria-hidden>{UI_KANJI.season}</span>
      </header>

      <InkTabs
        label="Period"
        value={mode}
        onChange={switchMode}
        tabs={[
          { id: 'month', label: 'By month' },
          { id: 'year', label: 'By year' },
        ]}
      />

      <div className="wr-step">
        <button type="button" onClick={() => step(1)} disabled={idx >= list.length - 1} aria-label="Older" className="wr-step__b">
          <ChevronLeft size={18} />
        </button>
        <span className="wr-step__t">{active?.label || data?.label || '—'}</span>
        <button type="button" onClick={() => step(-1)} disabled={idx <= 0} aria-label="Newer" className="wr-step__b">
          <ChevronRight size={18} />
        </button>
      </div>

      {!data || !data.hasData ? (
        <div className="jr-none">
          <Sparkles size={32} aria-hidden />
          <p className="jr-none__b">No training logged in {data?.label || 'this period'} yet.</p>
        </div>
      ) : (
        <div className="wr-scroll">
          <span className="wr-rod wr-rod--top" aria-hidden />
          <div className="wr-paper washi">
            <m.div className="wr-sec wr-sec--head" {...rise(0)}>
              <p className="wr-eye">{data.label} · You lifted</p>
              <p className="wr-vol">
                {effects ? <CountUp value={volume} /> : volume.toLocaleString()}
                <span className="wr-vol__u">{unitLabel(unit)}</span>
              </p>
              <p className="wr-sub">across {data.sessions} {data.sessions === 1 ? 'session' : 'sessions'}</p>
              <span className="wr-seal"><Seal kanji={UI_KANJI.season} size={40} rotate={4} /></span>
            </m.div>

            {showSpark && (
              <m.div className="wr-sec" {...rise(1)}>
                <p className="wr-cap">Volume by week</p>
                <div className="wr-bars" role="img" aria-label={`Weekly volume, ${series.length} weeks`}>
                  {series.map((v, i) => (
                    // Weeks in a fixed order that never reorders: the index is the identity.
                    // biome-ignore lint/suspicious/noArrayIndexKey: positional series
                    <BrushBar key={i} ratio={Math.max(0.06, v / peak)} current={v === peak} delay={i * 0.03} />
                  ))}
                </div>
              </m.div>
            )}

            <m.div className="wr-sec wr-stats" {...rise(2)}>
              <Stat kanji={STAT_KANJI.sessions} value={data.sessions} label="Sessions" />
              <Stat kanji={STAT_KANJI.sets} value={data.sets} label="Sets" />
              <Stat kanji={STAT_KANJI.records} value={data.prs} label="PRs" />
              <Stat kanji={STAT_KANJI.time} value={`${Math.round(data.hours)}h`} label="Trained" />
            </m.div>

            <m.ul className="wr-sec wr-facts" {...rise(3)}>
              {data.topLift && (
                <li><span>Top lift</span><b>{data.topLift}</b></li>
              )}
              {data.busiestDay && (
                <li><span>Busiest</span><b>{data.busiestDay}</b></li>
              )}
              <li><span>XP earned</span><b>+{data.xp.toLocaleString()} XP</b></li>
            </m.ul>
          </div>
          <span className="wr-rod wr-rod--bot" aria-hidden />

          <ShareButton
            data={shareData}
            kind="wrapped"
            filename="opus-wrapped.png"
            label="Share Wrapped"
            className="ink-btn ink-btn--primary ink-btn--block wr-share"
          />
        </div>
      )}
    </div>
  );
}
