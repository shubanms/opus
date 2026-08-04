// Shared screen content for every OPUS design direction.
// Real data from the app so each pitch shows the actual product, not lorem.

export const D = {
  athlete: 'Shuban',
  level: 12,
  title: 'Ironbound',
  xp: 184300,
  xpInto: 62,
  streak: 23,
  workouts: 148,
};

const icon = (paths, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`;

export const ICON = {
  home: icon('<path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  chart: icon('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  dumbbell: icon('<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>'),
  user: icon('<circle cx="12" cy="8" r="3.5"/><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/>'),
  flame: icon('<path d="M12 3c1 3.5 4.5 4.6 4.5 8.5A4.5 4.5 0 0 1 12 16a4.5 4.5 0 0 1-4.5-4.5C7.5 8.5 9 7 12 3z"/>'),
  trophy: icon('<path d="M7 4h10v5a5 5 0 0 1-10 0zM5 4v2a3 3 0 0 0 3 3M19 4v2a3 3 0 0 1-3 3M9 20h6M12 14v6"/>'),
  bolt: icon('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  swords: icon('<path d="M4 4l8 8M20 4l-8 8M6 20l4-4M18 20l-4-4"/>'),
  check: icon('<path d="M4 12.5 9.5 18 20 6"/>'),
  clock: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
  play: icon('<path d="M8 5.5v13l11-6.5z"/>'),
};

// ── Screen builders ─────────────────────────────────────────────────────────
// Each returns semantic markup with theme-agnostic class names. The direction's
// stylesheet does the character work.

export const screens = [
  {
    id: 'home',
    label: 'Home',
    note: 'Where the app opens. Identity, today’s intent, and the one thing to do next.',
    html: `
<div class="scr">
  <div class="topline"><span class="brand">OPUS</span><span class="tl-r">${ICON.flame}<b>23</b></span></div>

  <section class="hero">
    <div class="hero-row">
      <div class="lvl">${D.level}</div>
      <div class="hero-txt">
        <div class="eyebrow">Level ${D.level}</div>
        <h1 class="rank">${D.title}</h1>
      </div>
    </div>
    <div class="xpbar"><i style="width:62%"></i></div>
    <div class="xpmeta"><span>62% to Level 13</span><span class="num">184,300 XP</span></div>
  </section>

  <button class="cta">
    <span><b>Push Day A</b><i>4 exercises · ~52 min</i></span>
    <span class="cta-ico">${ICON.play}</span>
  </button>

  <section class="card dungeon">
    <div class="card-hd"><span class="tag">${ICON.swords} Daily dungeon</span><span class="iron">133</span></div>
    <h2>Leg Day Labyrinth</h2>
    <p class="sub">The Quad Colossus · Legs</p>
    <div class="objective">${ICON.check} Log 6+ working sets to clear</div>
    <div class="chips"><span class="chip">Precision</span><span class="chip">Iron Will +20%</span></div>
  </section>

  <section class="grid2">
    <div class="stat"><div class="stat-k">This week</div><div class="stat-v num">38,200</div><div class="stat-u">kg lifted</div></div>
    <div class="stat"><div class="stat-k">Sessions</div><div class="stat-v num">4</div><div class="stat-u">of 6 planned</div></div>
  </section>

  <section class="card">
    <div class="card-hd"><span class="tag">Recovery</span></div>
    <div class="bars">
      ${[['Chest', 90], ['Back', 62], ['Legs', 28], ['Shoulders', 74], ['Arms', 45]]
        .map(([m, v]) => `<div class="bar"><span>${m}</span><i><b style="width:${v}%"></b></i></div>`)
        .join('')}
    </div>
  </section>
  ${nav('home')}
</div>`,
  },

  {
    id: 'workout',
    label: 'Active workout',
    note: 'The screen you stare at between sets. Must be readable at arm’s length, sweaty, one-handed.',
    html: `
<div class="scr">
  <div class="topline wk"><span>Push Day A</span><span class="num live">42:18</span></div>

  <section class="ex active">
    <div class="ex-hd">
      <div><h3>Bench Press</h3><p class="sub">Chest · Barbell</p></div>
      <div class="ex-prog"><span class="num">3</span><i>/4</i></div>
    </div>
    <div class="sets">
      <div class="set done"><span class="sn">1</span><span class="num">80 kg × 10</span><span class="delta up">+5</span></div>
      <div class="set done"><span class="sn">2</span><span class="num">85 kg × 8</span><span class="delta up">+2.5</span></div>
      <div class="set done pr"><span class="sn">3</span><span class="num">102.5 kg × 5</span><span class="delta pr-tag">PR</span></div>
    </div>
    <div class="entry">
      <div class="field"><i>kg</i><span class="num">105</span></div>
      <span class="x">×</span>
      <div class="field"><i>reps</i><span class="num">5</span></div>
      <button class="log">${ICON.plus}</button>
    </div>
    <div class="hint">Last time: 100 kg × 5 · beat it by 5 kg</div>
  </section>

  <section class="ex">
    <div class="ex-hd"><div><h3>Incline DB Press</h3><p class="sub">Chest · Dumbbell</p></div><div class="ex-prog"><span class="num">0</span><i>/4</i></div></div>
  </section>
  <section class="ex">
    <div class="ex-hd"><div><h3>Cable Fly</h3><p class="sub">Chest · Cable</p></div><div class="ex-prog"><span class="num">0</span><i>/3</i></div></div>
  </section>

  <div class="rest">
    <div class="ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27"/><circle cx="32" cy="32" r="27" class="fg" stroke-dasharray="170" stroke-dashoffset="52"/></svg><span class="num">1:12</span></div>
    <div><b>Rest</b><i>Next: 105 kg × 5</i></div>
  </div>
  ${nav('workout')}
</div>`,
  },

  {
    id: 'progress',
    label: 'Progress',
    note: 'Eight months of training, legible in four seconds.',
    html: `
<div class="scr">
  <div class="topline"><span class="brand">Progress</span></div>
  <div class="segmented"><span class="on">Overview</span><span>By exercise</span><span>Body</span></div>

  <section class="kpis">
    <div class="kpi"><div class="kpi-v num">148</div><div class="kpi-k">Workouts</div></div>
    <div class="kpi"><div class="kpi-v num">1.28M</div><div class="kpi-k">kg lifted</div></div>
    <div class="kpi"><div class="kpi-v num">41</div><div class="kpi-k">PRs</div></div>
    <div class="kpi"><div class="kpi-v num">23</div><div class="kpi-k">Day streak</div></div>
  </section>

  <section class="card">
    <div class="card-hd"><span class="tag">Weekly volume</span><span class="up num">+18%</span></div>
    <div class="chart">
      <svg viewBox="0 0 300 110" preserveAspectRatio="none">
        <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" class="gs0"/><stop offset="100%" class="gs1"/></linearGradient></defs>
        <path class="area" d="M0,86 L37,74 L75,80 L112,58 L150,64 L187,40 L225,46 L262,22 L300,28 L300,110 L0,110 Z" fill="url(#g1)"/>
        <path class="line" d="M0,86 L37,74 L75,80 L112,58 L150,64 L187,40 L225,46 L262,22 L300,28"/>
        <circle class="dot" cx="300" cy="28" r="4"/>
      </svg>
    </div>
    <div class="axis"><span>Jun</span><span>Jul</span><span>Aug</span></div>
  </section>

  <section class="card">
    <div class="card-hd"><span class="tag">Consistency</span><span class="sub">12 weeks</span></div>
    <div class="heat">${Array.from({ length: 84 }, (_, i) => {
      const v = [0, 0, 1, 2, 3, 2, 1, 0, 2, 3, 3, 1, 0, 2][i % 14];
      return `<i data-v="${v}"></i>`;
    }).join('')}</div>
  </section>

  <section class="card">
    <div class="card-hd"><span class="tag">Recent records</span></div>
    <ul class="prs">
      <li><span>Bench Press</span><span class="num">102.5 kg</span></li>
      <li><span>Deadlift</span><span class="num">180 kg</span></li>
      <li><span>Back Squat</span><span class="num">160 kg</span></li>
    </ul>
  </section>
  ${nav('progress')}
</div>`,
  },

  {
    id: 'profile',
    label: 'Profile',
    note: 'The character sheet. This is where the RPG has to feel earned rather than bolted on.',
    html: `
<div class="scr">
  <div class="topline"><span class="brand">Profile</span></div>

  <section class="hero tall">
    <div class="hero-row">
      <div class="lvl big">${D.level}</div>
      <div class="hero-txt"><div class="eyebrow">${D.athlete} · Prestige II</div><h1 class="rank">${D.title}</h1></div>
    </div>
    <div class="xpbar"><i style="width:62%"></i></div>
  </section>

  <section class="card">
    <div class="card-hd"><span class="tag">Character</span></div>
    <div class="radar">
      <svg viewBox="0 0 200 200">
        ${[80, 60, 40, 20].map((r) => `<polygon class="web" points="${pent(100, 100, r)}"/>`).join('')}
        <polygon class="fill" points="${pent2([0.82, 0.61, 0.94, 0.73, 0.48])}"/>
        ${[0.82, 0.61, 0.94, 0.73, 0.48].map((v, i) => {
          const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          return `<circle class="pt" cx="${(100 + Math.cos(a) * 80 * v).toFixed(1)}" cy="${(100 + Math.sin(a) * 80 * v).toFixed(1)}" r="3"/>`;
        }).join('')}
      </svg>
      <div class="radar-lg">
        <span>Strength <b class="num">82</b></span><span>Endurance <b class="num">61</b></span>
        <span>Consistency <b class="num">94</b></span><span>Volume <b class="num">73</b></span><span>Variety <b class="num">48</b></span>
      </div>
    </div>
  </section>

  <section class="card">
    <div class="card-hd"><span class="tag">${ICON.trophy} Trophies</span><span class="sub num">14 / 19</span></div>
    <div class="trophies">
      ${['Centurion', 'Unbreakable', 'Heavy Hitter', 'Well Rounded', 'Night Owl', 'Relentless']
        .map((t, i) => `<div class="tro ${i < 4 ? 'on' : ''}"><span>${ICON.trophy}</span><i>${t}</i></div>`).join('')}
    </div>
  </section>

  <section class="card">
    <div class="card-hd"><span class="tag">Boss gate</span></div>
    <div class="boss"><b>The Iron Warden</b><p class="sub">Clear 50 PRs to unlock Level 30</p><div class="xpbar sm"><i style="width:82%"></i></div></div>
  </section>
  ${nav('profile')}
</div>`,
  },

  {
    id: 'exercises',
    label: 'Exercise library',
    note: 'A long list, browsed constantly. Density and filtering carry it.',
    html: `
<div class="scr">
  <div class="topline"><span class="brand">Exercises</span></div>
  <div class="search"><input placeholder="Search 74 exercises" readonly/></div>
  <div class="chiprow"><span class="chip on">All</span><span class="chip">Chest</span><span class="chip">Back</span><span class="chip">Legs</span><span class="chip">Arms</span><span class="chip">Core</span></div>
  <ul class="exlist">
    ${[
      ['Bench Press', 'Chest · Barbell', '102.5 kg', 'adv'],
      ['Back Squat', 'Legs · Barbell', '160 kg', 'adv'],
      ['Deadlift', 'Back · Barbell', '180 kg', 'adv'],
      ['Pull-up', 'Back · Bodyweight', '+25 kg', 'int'],
      ['Overhead Press', 'Shoulders · Barbell', '62.5 kg', 'int'],
      ['Concentration Curl', 'Arms · Dumbbell', '22.5 kg', 'beg'],
      ['Cable Fly', 'Chest · Cable', '32 kg', 'beg'],
    ].map(([n, m, pr, d]) => `<li><span class="dot-${d}"></span><div><b>${n}</b><i>${m}</i></div><span class="num pr-v">${pr}</span></li>`).join('')}
  </ul>
  ${nav('exercises')}
</div>`,
  },

  {
    id: 'history',
    label: 'History',
    note: 'The archive. Scanned for "what did I do last Tuesday".',
    html: `
<div class="scr">
  <div class="topline"><span class="brand">History</span></div>
  <div class="cal">
    <div class="cal-hd"><span>August 2026</span></div>
    <div class="cal-dow">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<i>${d}</i>`).join('')}</div>
    <div class="cal-grid">${Array.from({ length: 31 }, (_, i) => {
      const on = [1, 2, 4, 6, 8, 9, 11, 13, 15, 16, 18, 20, 22, 23, 25, 27, 29].includes(i + 1);
      return `<span class="${on ? 'on' : ''}${i + 1 === 29 ? ' today' : ''}">${i + 1}</span>`;
    }).join('')}</div>
  </div>
  <ul class="sessions">
    ${[
      ['Push Day A', 'Aug 29', '12,480 kg', '1h 15m', '1 PR'],
      ['Leg Day Labyrinth', 'Aug 27', '18,200 kg', '1h 32m', ''],
      ['Pull Day B', 'Aug 25', '11,050 kg', '58m', '2 PRs'],
      ['Push Day A', 'Aug 23', '11,900 kg', '1h 08m', ''],
    ].map(([n, d, v, t, pr]) => `<li>
      <div class="s-hd"><b>${n}</b><i>${d}</i></div>
      <div class="s-meta"><span class="num">${v}</span><span class="num">${t}</span>${pr ? `<span class="badge">${pr}</span>` : ''}</div>
    </li>`).join('')}
  </ul>
  ${nav('history')}
</div>`,
  },

  {
    id: 'quests',
    label: 'Quests & achievements',
    note: 'The reward loop. Progress has to be visible before it is claimed.',
    html: `
<div class="scr">
  <div class="topline"><span class="brand">Quests</span><span class="tl-r"><b class="num">133</b> Iron</span></div>
  <section class="card">
    <div class="card-hd"><span class="tag">${ICON.bolt} This week</span><span class="sub">Resets Monday</span></div>
    <ul class="quests">
      ${[
        ['Train 4 times', 4, 4, '+300 XP', true],
        ['Lift 30,000 kg', 38, 30, '+400 XP', true],
        ['Set a new PR', 1, 1, '+250 XP', true],
        ['Log 100 working sets', 96, 100, '+200 XP', false],
      ].map(([n, c, t, xp, done]) => `<li class="${done ? 'done' : ''}">
        <div class="q-hd"><b>${n}</b><span class="q-xp">${xp}</span></div>
        <div class="q-bar"><i style="width:${Math.min(100, (c / t) * 100)}%"></i></div>
        <div class="q-meta"><span class="num">${c} / ${t}</span>${done ? '<span class="claim">Claim</span>' : ''}</div>
      </li>`).join('')}
    </ul>
  </section>
  <section class="card">
    <div class="card-hd"><span class="tag">Vault</span></div>
    <div class="vault">
      <div class="v-item on"><span>⚔</span><i>Warlord</i></div>
      <div class="v-item on"><span>⚡</span><i>Voltage</i></div>
      <div class="v-item"><span>❄</span><i>150 Iron</i></div>
      <div class="v-item"><span>🛡</span><i>Rest token</i></div>
    </div>
  </section>
  ${nav('profile')}
</div>`,
  },

  {
    id: 'levelup',
    label: 'Level-up moment',
    note: 'The signature moment. Full-screen, three seconds, earned once every few weeks.',
    html: `
<div class="scr moment">
  <div class="moment-inner">
    <div class="m-eyebrow">Level up</div>
    <div class="m-lvl num">13</div>
    <h1 class="m-rank">Ironbound</h1>
    <p class="m-sub">You out-lifted last week by 18%.</p>
    <div class="m-stats">
      <span><b class="num">+640</b><i>XP</i></span>
      <span><b class="num">1</b><i>New PR</i></span>
      <span><b class="num">+25</b><i>Iron</i></span>
    </div>
    <div class="m-cta">Continue</div>
  </div>
</div>`,
  },

  {
    id: 'settings',
    label: 'Settings',
    note: 'Where "a serious team built this" is actually proven. Rows, switches, no drama.',
    html: `
<div class="scr">
  <div class="topline"><span class="brand">Settings</span></div>
  <div class="grp">Profile</div>
  <ul class="rows">
    <li><span>Units</span><span class="seg-sm"><i class="on">kg</i><i>lbs</i></span></li>
    <li><span>Bodyweight</span><span class="num val">80 kg</span></li>
    <li><span>Equipment &amp; plates</span><span class="chev">›</span></li>
  </ul>
  <div class="grp">Feel</div>
  <ul class="rows">
    <li><span>Animations</span><span class="sw on"><i></i></span></li>
    <li><span>Sound</span><span class="sw"><i></i></span></li>
    <li><span>Theme</span><span class="seg-sm"><i>Light</i><i class="on">Dark</i></span></li>
  </ul>
  <div class="grp">Data</div>
  <ul class="rows">
    <li><span>Storage</span><span class="ok">Protected</span></li>
    <li><span>Export backup</span><span class="chev">›</span></li>
    <li><span>Import backup</span><span class="chev">›</span></li>
  </ul>
  <div class="grp danger">Danger zone</div>
  <ul class="rows"><li class="danger"><span>Reset all data</span><span class="chev">›</span></li></ul>
  ${nav('profile')}
</div>`,
  },
];

function pent(cx, cy, r) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
}
function pent2(vals) {
  return vals.map((v, i) => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return `${(100 + Math.cos(a) * 80 * v).toFixed(1)},${(100 + Math.sin(a) * 80 * v).toFixed(1)}`;
  }).join(' ');
}

function nav(active) {
  const items = [
    ['home', ICON.home, 'Home'],
    ['progress', ICON.chart, 'Progress'],
    ['workout', ICON.plus, 'Workout'],
    ['exercises', ICON.dumbbell, 'Exercises'],
    ['profile', ICON.user, 'Profile'],
  ];
  return `<nav class="nav">${items
    .map(([id, ic, lb]) =>
      `<a class="${id === active ? 'on' : ''}${id === 'workout' ? ' fab' : ''}">${ic}<i>${lb}</i></a>`)
    .join('')}</nav>`;
}
