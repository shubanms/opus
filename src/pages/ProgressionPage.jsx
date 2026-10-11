import { Fragment } from 'react';
import { Swords } from 'lucide-react';
import { m } from '../motion/index.jsx';
import { useRPG } from '../hooks/useRPG.js';
import { useEffectiveXp } from '../hooks/useEffectiveXp.js';
import useSettingsStore from '../store/settingsStore.js';
import BackButton from '../components/layout/BackButton.jsx';
import { KanjiTile, PaperCard, SectionLabel, Seal } from '../components/ink/index.js';
import useInkMotion from '../components/ink/useInkMotion.js';
import { RANKS, prestigeXp, roman, PRESTIGE_STEP } from '../utils/rpg.js';
import { bossDesc, bossList } from '../utils/bosses.js';
import { rankSealKanji, UI_KANJI } from '../utils/kanji.js';
import '../styles/ink-journal.css';

// Ranks & prestige. Ten rank seals down a vertical scroll, the one you hold lit
// and the rest dimmed; a level-gate banner hangs where each boss gate stands
// (after levels 10, 20, 30, 40, 50) with its condition. Prestige sits below.
// All of it is the same data the page always read — level, rawLevel, gates.

const GATE_KANJI = { 10: '試', 20: '連', 30: '記', 40: '巨', 50: '頂' };

function Rank({ r, bandEnd, state, banked, bossTitle }) {
  const motionOn = useInkMotion();
  const lit = state === 'current';
  const reached = state === 'reached';
  const status = lit ? 'Your rank' : reached ? 'Reached' : banked ? 'XP banked' : 'Locked';
  return (
    <li className={`pr-rank pr-rank--${state}`} aria-current={lit ? 'step' : undefined}>
      <span className="pr-rank__mark">
        {state === 'locked' ? (
          <KanjiTile kanji={rankSealKanji(r.level).slice(0, 1)} state="locked" size={52} />
        ) : (
          <>
            {lit && motionOn ? <m.span aria-hidden className="pr-rank__glow" animate={{ opacity: [0.3, 0.75, 0.3] }} transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }} /> : null}
            {lit && !motionOn ? <span aria-hidden className="pr-rank__glow" style={{ opacity: 0.5 }} /> : null}
            <Seal kanji={rankSealKanji(r.level)} size={lit ? 60 : 52} rotate={lit ? -3 : 2} className={rankSealKanji(r.level).length > 1 ? 'pr-two' : ''} />
          </>
        )}
      </span>
      <span className="pr-rank__body">
        <span className="pr-rank__title">{r.title}</span>
        <span className="pr-rank__meta">
          {banked ? `Levels ${r.level}–${bandEnd} · XP banked behind ${bossTitle ?? 'a boss gate'}` : `Levels ${r.level}–${bandEnd}`}
        </span>
      </span>
      <span className="pr-rank__end">
        <span className="pr-rank__xp">{r.xp === 0 ? 'Start' : `${r.xp.toLocaleString()} XP`}</span>
        <span className="pr-rank__state">{status}</span>
      </span>
    </li>
  );
}

function Banner({ b, blocking, unit }) {
  const status = b.cleared ? 'Cleared' : blocking ? 'Blocking' : 'Locked';
  return (
    <li className={`pr-gate ${b.cleared ? 'is-cleared' : ''} ${blocking ? 'is-blocking' : ''}`}>
      <span className="pr-gate__pole" aria-hidden />
      <div className="pr-gate__flag rounded-xl">
        <KanjiTile kanji={GATE_KANJI[b.gate] ?? '試'} state={b.cleared ? 'paper' : blocking ? 'lit' : 'outline'} size={44} />
        <div className="pr-gate__body">
          <span className="pr-gate__eye">Boss gate · Level {b.gate}</span>
          <p className="pr-gate__title">{b.title}</p>
          <span className="pr-gate__cond">Level {b.gate} · {bossDesc(b, unit)}</span>
        </div>
        <span className="pr-gate__status">{status}</span>
      </div>
    </li>
  );
}

export default function ProgressionPage() {
  const { profile } = useRPG();
  const unit = useSettingsStore((s) => s.unit);
  // The same answer Home and Profile give: shield-aware XP, and the level a
  // boss gate actually lets you hold.
  const { effectiveXp, level, rawLevel, sealed, prestige, title, boss, bossStats, ready } = useEffectiveXp(profile);
  const bosses = bossList(bossStats);
  const banked = rawLevel - level;
  const tiers = [1, 2, 3, 4, 5];

  // This page is about the gates, so it waits for them rather than briefly
  // showing a sealed player the level the gate is holding back.
  if (!profile || !ready) return null;

  return (
    <div className="jr-page jr-page--pad">
      <header className="jr-head">
        <div className="jr-head__l">
          <BackButton fallback="/profile" label="" className="" />
          <div className="min-w-0">
            <h1 className="jr-title">Progression</h1>
            <p className="jr-sub">
              You are <b className="pr-you">{title}</b> · {effectiveXp.toLocaleString()} XP
            </p>
          </div>
        </div>
        <span className="jr-kanji" lang="ja" aria-hidden>{UI_KANJI.ranks}</span>
      </header>

      {/* Sealed, said plainly: which level you hold, what is holding it, and
          what is waiting behind the gate. */}
      {sealed && boss ? (
        <p className="pr-note">
          <Swords size={14} aria-hidden />
          <span>
            Level {level} · sealed by <strong>{boss.title}</strong> · {banked} level{banked === 1 ? '' : 's'} banked.{' '}
            {bossDesc(boss, unit)} to break the seal.
          </span>
        </p>
      ) : (
        <p className="pr-lvl">
          Level {level}
          {prestige > 0 ? ` · Prestige ${prestige}` : ''}
        </p>
      )}

      <SectionLabel as="h2" rule className="pr-sec">Ranks</SectionLabel>
      <p className="pr-intro">Each milestone level is sealed until you clear its challenge — XP alone won't pass it.</p>

      <ol className="pr-scroll" aria-label="Ranks and boss gates">
        {RANKS.map((r, i) => {
          const bandEnd = i < RANKS.length - 1 ? RANKS[i + 1].level - 1 : 50;
          const reached = level >= r.level || prestige > 0;
          const isCurrent = level >= r.level && level <= bandEnd && prestige === 0;
          // Earned on XP, held back by the gate.
          const isBanked = !reached && rawLevel >= r.level;
          const state = isCurrent ? 'current' : reached ? 'reached' : 'locked';
          const gate = bosses.find((b) => b.gate === bandEnd);
          return (
            <Fragment key={r.level}>
              <Rank r={r} bandEnd={bandEnd} state={state} banked={isBanked} bossTitle={boss?.title} />
              {gate ? <Banner b={gate} blocking={!gate.cleared && boss?.key === gate.key} unit={unit} /> : null}
            </Fragment>
          );
        })}
      </ol>

      <SectionLabel as="h2" rule className="pr-sec">Prestige</SectionLabel>
      <PaperCard className="pr-prestige">
        <p className="pr-prestige__t">Beyond level 50, every {PRESTIGE_STEP.toLocaleString()} XP earns a prestige tier.</p>
        <ul className="pr-tiers">
          {tiers.map((t) => {
            const st = prestige === t ? 'lit' : prestige > t ? 'paper' : 'locked';
            return (
              <li key={t} className="pr-tier">
                <KanjiTile kanji={rankSealKanji(50).slice(0, 1)} state={st} size={prestige === t ? 52 : 44} />
                <span className="pr-tier__body">
                  <span className="pr-tier__n">Magnum Opus {roman(t)}</span>
                  <span className="pr-tier__xp">{prestigeXp(t).toLocaleString()} XP</span>
                </span>
                <span className="pr-tier__state">{prestige === t ? 'Your tier' : prestige > t ? 'Reached' : 'Locked'}</span>
              </li>
            );
          })}
        </ul>
      </PaperCard>
    </div>
  );
}
