import { lazy, Suspense, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Settings, Pencil, ChevronRight, TrendingDown } from 'lucide-react';
import { db } from '../db/db.js';
import VaultModal from '../components/rpg/VaultModal.jsx';
import { cosmeticById } from '../utils/economy.js';
import { useRPG, useCharacterStats } from '../hooks/useRPG.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { useCurrentBodyweight, useLifetimeStats } from '../hooks/useProgress.js';
import { useEffectiveXp } from '../hooks/useEffectiveXp.js';
import { useIronBalance } from '../hooks/useIronBalance.js';
import { useStreak } from '../hooks/useStreak.js';
import { useAchievements } from '../hooks/useAchievements.js';
import { fmtWeight, toDisplay, unitLabel } from '../utils/units.js';
import { friendlyDate, todayKey } from '../utils/dateKey.js';
import { ageFromBirthYear } from '../utils/profileFields.js';
import { bossDesc } from '../utils/bosses.js';
import { getXPProgress, RANKS } from '../utils/rpg.js';
import { STAT_KANJI, UI_KANJI, rankSealKanji } from '../utils/kanji.js';
import { flairSeal } from '../utils/flairSeal.js';
import useSettingsStore from '../store/settingsStore.js';
import CharacterCard from '../components/rpg/CharacterCard.jsx';
import LevelBadge from '../components/rpg/LevelBadge.jsx';
import XPBar from '../components/rpg/XPBar.jsx';
import TrophyCase from '../components/rpg/TrophyCase.jsx';
import ShareButton from '../components/share/ShareButton.jsx';
import CountUp from '../components/fx/CountUp.jsx';
import Seal from '../components/ink/Seal.jsx';
import SectionLabel from '../components/ink/SectionLabel.jsx';
import useInkMotion from '../components/ink/useInkMotion.js';
import MascotBoundary from '../components/mascot/MascotBoundary.jsx';
import { hasWebGL } from '../components/mascot/webgl.js';
import '../styles/ink-components.css';
import '../styles/ink-you.css';

const Companion = lazy(() => import('../components/mascot/Companion.jsx'));

const LEAF = 'M0 6 C 3 0, 9 0, 12 6 C 9 12, 3 12, 0 6 Z';

/** The painted hero: ronin on a cliff edge, red sun, mist. Phase 5 swaps it for the 3D ronin. */
function HeroPainting() {
  return (
    <svg
      className="you-hero__svg"
      role="img"
      aria-label="Your ronin stands on a cliff edge, scarf in the wind, facing a red sun over misty mountains"
      viewBox="0 0 350 180"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="you-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ink-1)" />
          <stop offset="1" stopColor="var(--ver-deep)" stopOpacity="0.8" />
        </linearGradient>
        <radialGradient id="you-glow-g" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--ver-light)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--ver-light)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="you-mist-g" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--ver-soft)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--ver-soft)" stopOpacity="0" />
        </radialGradient>
        <g id="you-player">
          <g className="you-cloak">
            <path d="M30 34 C 14 38, -6 40, -34 36 C -26 44, -10 50, 6 50 C -8 56, -22 64, -30 72 C -12 66, 6 58, 26 48 Z" fill="var(--mute-1)" stroke="var(--ver-light)" strokeOpacity="0.3" strokeWidth="0.8" />
            <path d="M20 40 C 6 42, -12 42, -26 40 M14 48 C 2 54, -12 60, -24 68" fill="none" stroke="var(--mute-3)" strokeWidth="0.9" />
          </g>
          <path d="M4 102 L 68 102 L 82 172 L 46 172 L 37 124 L 30 172 L -6 172 Z" fill="var(--ink-3)" stroke="var(--ver-light)" strokeOpacity="0.35" strokeWidth="0.9" />
          <path d="M14 38 L 58 38 L 68 104 L 4 104 Z" fill="var(--ink-2)" stroke="var(--ver-light)" strokeOpacity="0.35" strokeWidth="0.9" />
          <path d="M20 50 C 22 70, 18 88, 12 100 M48 48 C 52 70, 56 88, 60 100" fill="none" stroke="var(--ink-line)" strokeWidth="1" />
          <circle cx="33" cy="60" r="6.5" fill="none" stroke="var(--mute-1)" strokeWidth="0.9" />
          <circle cx="33" cy="60" r="2.6" fill="var(--ver)" />
          <path d="M6 94 L 66 94 L 67 102 L 5 102 Z" fill="var(--ver-deep)" />
          <path d="M28 94 L 34 90 L 40 94 L 34 102 Z" fill="var(--ver-dark)" />
          <path d="M54 88 L 2 106 L 0 102 L 52 84 Z" fill="var(--ink-0)" stroke="var(--ver-light)" strokeOpacity="0.35" strokeWidth="0.6" />
          <path d="M2 106 L 0 102 L 3 101 L 5 105 Z" fill="var(--gold-leaf)" />
          <path d="M50 50 L 64 50 L 74 76 L 70 92 L 56 94 L 50 80 Z" fill="var(--ink-2)" stroke="var(--ver-light)" strokeOpacity="0.4" strokeWidth="0.8" />
          <ellipse cx="54" cy="88" rx="3.5" ry="5.5" fill="var(--gold-leaf)" />
          <path d="M28 26 L 44 26 L 42 38 L 30 38 Z" fill="var(--ink-3)" />
          <path d="M26 38 L 34 46 L 42 38" fill="none" stroke="var(--mute-1)" strokeWidth="1.2" />
          <path d="M2 26 Q 36 0 70 26 Q 36 32 2 26 Z" fill="var(--paper-ink-2)" />
          <path d="M36 5 L 8 25.5 M36 5 L 18 27.5 M36 5 L 28 28.6 M36 5 L 44 28.6 M36 5 L 54 27.5 M36 5 L 64 25.5" fill="none" stroke="var(--paper-ink-3)" strokeWidth="0.8" />
          <path d="M2 26 Q 36 32 70 26" fill="none" stroke="var(--ver-light)" strokeOpacity="0.6" strokeWidth="1.1" />
        </g>
      </defs>
      <rect width="350" height="180" fill="url(#you-sky)" />
      <circle className="you-glow" cx="250" cy="92" r="90" fill="url(#you-glow-g)" />
      <circle cx="250" cy="92" r="34" fill="var(--ver)" />
      <path d="M120 140 L 120 118 C 150 110, 170 104, 196 110 C 220 116, 236 104, 262 102 C 290 100, 316 112, 350 108 L 350 140 Z" fill="var(--ink-3)" />
      <ellipse className="you-mist" cx="250" cy="128" rx="160" ry="12" fill="url(#you-mist-g)" />
      <path d="M150 180 L 150 140 C 190 130, 230 132, 270 138 C 300 142, 326 140, 350 134 L 350 180 Z" fill="var(--ink-2)" />
      <path d="M0 180 L0 122 C 30 118, 70 120, 110 132 C 130 138, 150 152, 160 180 Z" fill="var(--ink-0)" />
      <g transform="translate(40 18) scale(0.62)"><use href="#you-player" /></g>
      <path d="M -20 60 C 60 52, 140 72, 220 62 S 330 50, 380 60" fill="none" stroke="var(--washi-2)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="40 400" />
    </svg>
  );
}

function Stat({ kanji, value, label }) {
  return (
    <div className="you-stat">
      <span className="you-stat__k" lang="ja" aria-hidden="true">{kanji}</span>
      <span className="you-stat__v">{value}</span>
      <span className="you-stat__l">{label}</span>
    </div>
  );
}

function Item({ kanji, title, meta, gold = false, onClick }) {
  return (
    <button type="button" className="you-item" onClick={onClick}>
      <Seal kanji={kanji} size={28} rotate={0} className={gold ? 'you-seal--gold' : ''} />
      <span className="you-item__title">{title}</span>
      {meta != null && meta !== '' ? <span className={`you-item__meta ${gold ? 'you-item__meta--gold' : ''}`}>{meta}</span> : null}
      <ChevronRight size={16} strokeWidth={1.8} aria-hidden style={{ color: 'var(--mute-3)' }} />
    </button>
  );
}

function Tile({ value, label, countTo }) {
  const effects = useSettingsStore((s) => s.effects);
  return (
    <div className="you-tile">
      <p className="you-tile__v">{countTo != null && effects ? <CountUp value={countTo} /> : value}</p>
      <p className="you-tile__l">{label}</p>
    </div>
  );
}

/** "today" / "yesterday" / "5 Aug" / "12 Mar 2025", for "Member since …". */
function sinceLabel(key) {
  const label = friendlyDate(key);
  return label === 'Today' || label === 'Yesterday' ? label.toLowerCase() : label;
}

/** "August", or "August 2024" when it was not this year. For "on the path since …". */
function pathSince(key) {
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleString('en-GB', { month: 'long' });
  return d.getFullYear() === new Date().getFullYear() ? month : `${month} ${d.getFullYear()}`;
}

/** Iron moved in the user's unit: tonnes (kg) or thousands of lb, compact. */
function fmtIron(kg, unit) {
  const total = kg ?? 0;
  if (unit === 'lb') {
    const lb = Math.round(toDisplay(total, unit));
    return lb >= 10000 ? `${Math.round(lb / 1000).toLocaleString()}k ${unitLabel(unit)}` : `${lb.toLocaleString()} ${unitLabel(unit)}`;
  }
  if (total >= 1000) {
    const t = total / 1000;
    return `${t >= 100 ? Math.round(t).toLocaleString() : Math.round(t * 10) / 10} t`;
  }
  return `${Math.round(total)} ${unitLabel(unit)}`;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const motionOn = useInkMotion();
  const { profile, loaded } = useRPG();
  const workouts = useWorkouts();
  const charStats = useCharacterStats();
  const bodyweight = useCurrentBodyweight();
  const life = useLifetimeStats();
  const unit = useSettingsStore((s) => s.unit);
  const equipped = useSettingsStore((s) => s.equipped);
  const { balance: ironBal, loaded: ironLoaded } = useIronBalance();
  const { count: sealsEarned, total: sealsTotal } = useAchievements();
  // The first session on record. A restore lands in a fresh profile whose
  // join date is the day of the restore, which would make a three-year
  // history read "Member since today".
  const firstSession = useLiveQuery(() => db.workouts.orderBy('date').first().then((w) => w?.date ?? null), []);
  const [vaultOpen, setVaultOpen] = useState(false);
  // Above the early return: hooks cannot live behind a conditional, and this
  // page returns null until the profile loads.
  const streak = useStreak();
  // Level, title and XP exactly as Home shows them: with the rest-token shield
  // and the boss-gate cap applied.
  const xp = useEffectiveXp(profile);

  if (!loaded || !profile) return null;

  const flairId = equipped?.titleFlair && cosmeticById(equipped.titleFlair) ? equipped.titleFlair : null;
  const totalXp = profile.totalXp ?? 0;
  const { effectiveXp, decaying, lost, level, rawLevel, sealed, prestige, title, boss } = xp;
  const banked = rawLevel - level;
  const { progress, nextLevelXP } = getXPProgress(effectiveXp);

  // One "best streak" for the whole app (achievements.computeStats): the larger
  // of the day and schedule definitions. It is never shown below the live
  // count — a best smaller than the streak you are on is a contradiction.
  const bestStreak = Math.max(xp.bossStats?.bestStreak ?? 0, streak.count);

  const age = ageFromBirthYear(profile.birthYear);
  const identity = [
    age ? `${age} yrs` : null,
    profile.sex || null,
    profile.height ? `${profile.height} cm` : null,
    bodyweight != null ? fmtWeight(bodyweight, unit) : null,
  ].filter(Boolean);

  const joined = profile.joinDate || todayKey();
  const since = firstSession && firstSession < joined ? firstSession : joined;
  const sinceMonth = pathSince(since);

  const nextRank = RANKS.find((r) => r.level > level);
  const rankMeta = nextRank ? `${nextRank.title} at ${nextRank.level}` : prestige > 0 ? `Prestige ${prestige}` : title;

  const subtitle = [
    title,
    `level ${level}`,
    prestige > 0 ? `prestige ${prestige}` : null,
    sealed ? 'sealed' : null,
    sinceMonth ? `on the path since ${sinceMonth}` : null,
  ].filter(Boolean).join(' · ');

  const profileShareData = {
    name: profile.name,
    level,
    prestige,
    title,
    stats: charStats,
    workouts: workouts.length,
    streak: streak.count,
    totalXp,
  };

  const challengeShareData = {
    name: profile.name,
    level,
    title,
    workouts: life.workouts,
    volumeKg: life.totalVolume,
    bestStreak,
    unit,
  };

  const magnum = level > 45;

  return (
    <div className={`you ${motionOn ? 'you-live' : ''}`}>
      <header className="you-head">
        {/* Your name and details are yours to change from here. */}
        <button type="button" onClick={() => navigate('/settings#profile')} className="you-id" aria-label="Edit your profile">
          <h1 className="you-name">
            {flairId ? <Seal kanji={flairSeal(flairId)} size={24} rotate={-4} /> : null}
            <span>{profile.name || 'Profile'}</span>
          </h1>
          <p className="you-sub">{subtitle}</p>
          <p className="you-meta">
            <span>{identity.length ? identity.join('  ·  ') : 'Add your details'}</span>
            <Pencil size={11} aria-hidden />
          </p>
        </button>
        <button type="button" onClick={() => navigate('/settings')} className="you-gear" aria-label="Settings">
          <Settings size={20} strokeWidth={1.6} aria-hidden />
        </button>
      </header>

      {/* Hero panel: the painting, the rank kanji, level and XP. */}
      <section className="you-hero" aria-label="Level and experience">
        <HeroPainting />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <svg className="you-leaf" viewBox="0 0 12 12" style={{ top: 50, width: 10, height: 10, animationDelay: '-2s' }}><path d={LEAF} /></svg>
          <svg className="you-leaf you-leaf--b" viewBox="0 0 12 12" style={{ top: 96, width: 8, height: 8 }}><path d={LEAF} /></svg>
        </div>
        <LevelBadge level={level} size="sm" prestige={prestige} className="you-hero__lv" />
        <div className={`you-hero__kanji ${magnum ? 'you-hero__kanji--gold' : ''}`} lang="ja" aria-hidden="true">
          {rankSealKanji(level, prestige)}
        </div>
        <div className="you-hero__foot">
          <div className="you-hero__row">
            <span>{sealed ? `Level ${level} · sealed` : `Level ${level} → ${level + 1}`}</span>
            <span>
              {sealed
                ? `${banked} level${banked === 1 ? '' : 's'} banked`
                : `${Math.round(effectiveXp).toLocaleString()} / ${nextLevelXP.toLocaleString()} XP`}
            </span>
          </div>
          <XPBar totalXp={effectiveXp} level={level} showLabel={false} />
        </div>
      </section>

      {decaying && (
        <div className="you-note">
          <TrendingDown size={15} aria-hidden style={{ color: 'var(--ver-light)', flex: 'none' }} />
          <span>
            Rank slipping from inactivity — <span style={{ color: 'var(--washi-2)' }}>−{lost.toLocaleString()} XP</span>. Train to recover it.
          </span>
        </div>
      )}

      {boss && (
        <button type="button" onClick={() => navigate('/progression')} className="you-gate">
          <span className="you-gate__k">Boss gate · Level {boss.gate}</span>
          <p className="you-gate__t">
            <b>{boss.title}</b> — {bossDesc(boss, unit)} to advance past level {boss.gate}.
          </p>
          {banked > 0 && (
            <p className="you-gate__s">{banked} level{banked === 1 ? '' : 's'} banked — they land the moment it falls.</p>
          )}
        </button>
      )}

      {/* Radar and the six stats */}
      <div className="you-sheet">
        <CharacterCard />
        <div className="you-stats">
          <Stat kanji={STAT_KANJI.sessions} value={life.workouts.toLocaleString()} label="sessions" />
          <Stat kanji={STAT_KANJI.sets} value={life.totalSets.toLocaleString()} label="sets struck" />
          <Stat kanji={STAT_KANJI.records} value={life.prCount.toLocaleString()} label="records" />
          <Stat kanji={STAT_KANJI.iron} value={fmtIron(life.totalVolume, unit)} label="iron moved" />
          <Stat kanji={STAT_KANJI.time} value={`${Math.round(life.hours)} h`} label="trained" />
          <Stat kanji={STAT_KANJI.streak} value={bestStreak.toLocaleString()} label="best streak" />
        </div>
      </div>

      {/* Menu */}
      <nav className="you-menu" aria-label="You">
        <Item kanji={UI_KANJI.seal} title="Seal book" meta={`${sealsEarned} of ${sealsTotal}`} onClick={() => navigate('/achievements')} />
        <Item kanji={UI_KANJI.chronicle} title="Hall of Records" meta={`${life.prCount} plaques`} onClick={() => navigate('/records')} />
        <Item kanji={UI_KANJI.ranks} title="Ranks & prestige" meta={rankMeta} onClick={() => navigate('/progression')} />
        <Item kanji={UI_KANJI.season} title="Season scroll" meta="Monthly & yearly" onClick={() => navigate('/wrapped')} />
        <Item
          kanji={UI_KANJI.vault}
          title="The Vault"
          gold
          meta={ironLoaded ? `${ironBal.toLocaleString()} Iron` : ''}
          onClick={() => setVaultOpen(true)}
        />
      </nav>

      <VaultModal isOpen={vaultOpen} onClose={() => setVaultOpen(false)} />

      {/* More: everything else the page has always held. */}
      <div className="you-more">
        <SectionLabel rule>More</SectionLabel>
        <div className="you-tiles">
          <Tile value={streak.count} countTo={streak.count} label="Current streak" />
          <Tile value={totalXp.toLocaleString()} countTo={totalXp} label="Total XP" />
        </div>
        <p className="you-since">Member since {sinceLabel(since)}</p>

        {/* Decoration must never cost the page: a WebGL context that can't be
            created, a model that fails to load, or the lazy chunk itself failing
            leaves Profile intact with no Magnus (components/mascot). */}
        {hasWebGL() && (
          <div style={{ marginTop: 12 }}>
            <MascotBoundary>
              <Suspense fallback={<div style={{ height: 150 }} />}>
                <Companion autoGreet={false} />
              </Suspense>
            </MascotBoundary>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <TrophyCase />
        </div>

        <ShareButton
          data={profileShareData}
          kind="profile"
          filename="opus-profile.png"
          label="Share profile"
          className="ink-btn ink-btn--primary you-share"
        />
        <ShareButton
          data={challengeShareData}
          kind="challenge"
          filename="opus-challenge.png"
          label="Challenge a friend"
          className="ink-btn ink-btn--secondary you-share"
        />
      </div>
    </div>
  );
}
