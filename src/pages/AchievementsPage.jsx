import { useEffect, useMemo, useRef, useState } from 'react';
import { m } from '../motion/index.jsx';
import { useAchievements } from '../hooks/useAchievements.js';
import useSettingsStore from '../store/settingsStore.js';
import BackButton from '../components/layout/BackButton.jsx';
import { Seal } from '../components/ink/index.js';
import useInkMotion from '../components/ink/useInkMotion.js';
import { achievementDesc } from '../utils/achievements.js';
import { compactNumber } from '../utils/chartMath.js';
import { toDisplay } from '../utils/units.js';
import { achievementKanji, GOLD_ACHIEVEMENTS, toKanjiDate } from '../utils/kanji.js';
import '../styles/ink-seals.css';

// The Seal Book. Every one of the 19 achievements keeps its real unlock state,
// unlock date, progress and hidden flag:
//  - goshuin spread: latest earned seal (left) + next seal with progress (right)
//  - grid: every seal; earned lit, in reach dashed with progress, hidden "?"
//  - tapping a seal opens its page in the spread
const SEEN_KEY = 'opus_seals_seen';

function readSeen() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

const tilt = (i) => [0, 3, -2, 0, 4, -3, 2, -4][i % 8];

export default function AchievementsPage() {
  const { items, count, total } = useAchievements();
  const unit = useSettingsStore((s) => s.unit);
  const motionOn = useInkMotion();
  const [selected, setSelected] = useState(null);
  const seenRef = useRef(undefined);
  if (seenRef.current === undefined) seenRef.current = readSeen();

  const shown = (it, v) => compactNumber(it.metric === 'totalVolume' ? toDisplay(v, unit) : v);
  const secret = (it) => it.hidden && !it.unlocked;

  const earned = useMemo(() => items.filter((i) => i.unlocked), [items]);
  const latest = useMemo(
    () => earned.reduce((best, i) => (!best || (i.unlockedAt ?? 0) > (best.unlockedAt ?? 0) ? i : best), null),
    [earned],
  );
  const next = useMemo(
    () =>
      items
        .filter((i) => !i.unlocked && !i.hidden && i.progress)
        .sort((a, b) => b.progress.ratio - a.progress.ratio)[0] ?? null,
    [items],
  );
  const reach = items.filter((i) => !i.unlocked && !i.hidden && i.progress && i.progress.ratio >= 0.5).length;
  const hiddenLeft = items.filter(secret).length;
  const remaining = items.length - earned.length;

  const sel = items.find((i) => i.key === selected) ?? null;
  const left = sel?.unlocked ? sel : latest;
  const right = sel && !sel.unlocked ? sel : next;

  // Seals earned since the last visit stamp in; a first-ever visit stamps only the hero.
  const seen = seenRef.current;
  const isNew = (it) => (seen ? !seen.has(it.key) : it.key === latest?.key);
  useEffect(() => {
    if (!earned.length) return;
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(earned.map((i) => i.key)));
    } catch {
      /* storage unavailable */
    }
  }, [earned]);

  const kanjiOf = (it) => achievementKanji(it.key);

  return (
    <div className="seals-page">
      <div className="seals-head">
        <BackButton fallback="/profile" label="" className="" />
        <h1 className="seals-title">Seal Book</h1>
        <span className="seals-count">
          {count} of {total} seals
        </span>
      </div>

      <section className="seals-frame" aria-label="The latest seal and the next one to earn">
        <div className="seals-page-l">
          <div className="seals-vert seals-hd" lang="ja">奉拝</div>
          {left ? (
            <>
              <div className={`seals-big ${kanjiOf(left).length > 1 ? 'seals-big--two' : ''}`} lang="ja">
                {kanjiOf(left)}
              </div>
              <div className={`seals-stamp ${kanjiOf(left).length > 1 ? 'seals-stamp--two' : ''}`}>
                <Seal
                  key={left.key}
                  kanji={kanjiOf(left)}
                  size={58}
                  rotate={-6}
                  stamp={isNew(left) || Boolean(sel)}
                />
              </div>
              <div className="seals-vert seals-date" lang="ja">{toKanjiDate(left.unlockedAt)}</div>
              <div className="seals-foot">
                <div className="seals-name">{left.title}</div>
                <div className="seals-meta">{achievementDesc(left, unit)} · earned</div>
                {left.xp > 0 ? <div className="seals-note">+{left.xp} XP</div> : null}
              </div>
            </>
          ) : (
            <div className="seals-foot">
              <div className="seals-name">No seals yet</div>
              <div className="seals-meta">Your first seal is one workout away</div>
            </div>
          )}
        </div>
        <div className="seals-gutter" aria-hidden="true" />
        <div className="seals-page-r">
          <div className="seals-vert seals-hd seals-hd--next" lang="ja">次の印</div>
          {right ? (
            <>
              <svg
                className={`seals-ghost ${motionOn ? 'seals-ghost--pulse' : ''}`}
                viewBox="0 0 167 140"
                role="img"
                aria-label={`The next seal, ${secret(right) ? 'hidden' : right.title}, drawn as a dashed tracing guide`}
              >
                <text
                  x="83.5"
                  y="96"
                  lang="ja"
                  textAnchor="middle"
                  fontSize={kanjiOf(right).length > 1 ? 56 : 92}
                  style={{
                    fill: 'rgba(21,17,14,0.06)',
                    stroke: 'rgba(21,17,14,0.45)',
                    strokeWidth: 1,
                    strokeDasharray: '3 3',
                  }}
                >
                  {secret(right) ? '?' : kanjiOf(right)}
                </text>
                <rect
                  x="54.5"
                  y="76"
                  width="58"
                  height="58"
                  rx="4"
                  fill="none"
                  style={{ stroke: 'rgba(168,43,23,0.55)', strokeWidth: 1.4, strokeDasharray: '4 4' }}
                />
              </svg>
              <div className="seals-foot">
                <div className="seals-name">{secret(right) ? 'Hidden seal' : right.title}</div>
                <div className="seals-meta">
                  {secret(right) ? 'Keep training to reveal this one.' : achievementDesc(right, unit)}
                </div>
                {!secret(right) && right.progress ? (
                  <>
                    <div className="seals-track" aria-hidden="true">
                      <m.div
                        className="seals-fill"
                        initial={motionOn ? { scaleX: 0 } : false}
                        animate={{ scaleX: Math.max(0.02, right.progress.ratio) }}
                        transition={{ duration: 0.7, ease: [0.16, 0.84, 0.3, 1] }}
                      />
                    </div>
                    <div className="seals-note">
                      {shown(right, right.progress.current)} / {shown(right, right.progress.target)}
                      {right.progress.ratio < 1
                        ? ` · ${shown(right, right.progress.target - right.progress.current)} to go`
                        : ''}
                    </div>
                    {right.xp > 0 ? <div className="seals-note">+{right.xp} XP reward</div> : null}
                    <div className="seals-note">
                      {remaining} seals remain{hiddenLeft > 0 ? ` · ${hiddenLeft} hidden` : ''}
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <div className="seals-foot">
              <div className="seals-name">Every seal is yours</div>
              <div className="seals-meta">Nothing left to trace</div>
            </div>
          )}
        </div>
      </section>

      <section aria-label="All seals" style={{ marginTop: 20 }}>
        <div
          className="flex justify-between"
          style={{ fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--mute-2)' }}
        >
          <span>ALL SEALS</span>
          <span>
            {reach} within reach · {hiddenLeft} hidden
          </span>
        </div>
        <div className="seals-grid" lang="ja">
          {items.map((it, i) => {
            const k = kanjiOf(it);
            const gold = GOLD_ACHIEVEMENTS.includes(it.key);
            const hid = secret(it);
            const p = it.progress;
            const near = !it.unlocked && !hid && p && p.current > 0;
            const fs = k.length > 1 ? 17 : 24;
            let box;
            let cap = it.title;
            let capCls = '';
            if (it.unlocked && gold) {
              box = (
                <span className="seals-box seals-box--gold" style={{ fontSize: fs }}>
                  {k}
                </span>
              );
              capCls = 'seals-cap--gold';
            } else if (it.unlocked) {
              box = (
                <span className="seals-lit">
                  <Seal kanji={k} size={44} rotate={tilt(i)} stamp={isNew(it) && it.key !== latest?.key} />
                </span>
              );
            } else if (hid) {
              box = <span className="seals-box seals-box--hidden">?</span>;
              capCls = 'seals-cap--dim';
              cap = 'Hidden';
            } else {
              const cls = gold ? 'seals-box--gold-off' : near ? 'seals-box--reach' : 'seals-box--locked';
              box = (
                <span className={`seals-box ${cls}`} style={{ fontSize: fs }}>
                  {k}
                </span>
              );
              if (near) {
                capCls = 'seals-cap--reach';
                cap = `${shown(it, p.current)} / ${shown(it, p.target)}`;
              }
            }
            const status = it.unlocked
              ? 'earned'
              : hid
                ? 'hidden'
                : near
                  ? `${Math.round(p.ratio * 100)}% done`
                  : 'locked';
            return (
              <button
                key={it.key}
                type="button"
                className="seals-cell"
                aria-pressed={selected === it.key}
                aria-label={`${hid ? 'Hidden achievement' : it.title}, ${status}`}
                onClick={() => setSelected(selected === it.key ? null : it.key)}
              >
                <div className="flex justify-center">{box}</div>
                <div className={`seals-cap ${capCls}`} lang="en">
                  {cap}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
