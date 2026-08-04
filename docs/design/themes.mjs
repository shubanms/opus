// Five design directions for OPUS. Each is a committed visual world, not a
// recolour: type, radius, density, material and motion all move together.

const MONO = `ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace`;

export const themes = [
  // ────────────────────────────────────────────────────────── 1. FORGE
  {
    id: 'forge',
    name: 'Forge',
    tagline: 'Molten luxury',
    thesis:
      'A gym app that carries itself like a <strong>watch catalogue</strong>. Obsidian ground, hairline rules, a Didot headline — and gold treated as an actual metal with a gradient and a specular edge, not a flat swatch. Heat appears only where something was earned: a PR, a level, a cleared dungeon. Everything else stays cold and quiet, so the moments land.',
    palette: [
      ['obsidian', '#0E0D0C'], ['pitch', '#161413'], ['gold', '#C9A84C'],
      ['light gold', '#F2D98B'], ['ember', '#D4622A'], ['bone', '#EDE8DE'],
    ],
    typeSample: 'Ironbound',
    typeNote: 'High-contrast Didot for rank and headline, neutral grotesque for body, tabular mono for every number. Numbers are the hero of a gym app.',
    material: [
      ['Surface', 'Matte pitch + 1px hairline'],
      ['Accent', '3-stop metallic gradient'],
      ['Radius', '10px — restrained'],
      ['Depth', 'Inner light, no drop shadow'],
      ['Motion', 'Specular sweep on gain'],
      ['Signature', 'Gold only where earned'],
    ],
    vars: `
--page:#0A0908;--bg:#0E0D0C;--surface:#161413;--inset:#1C1917;--line:#2A2622;
--ink:#EDE8DE;--ink2:#8C857A;--accent:#D9BC63;--accent-fill:linear-gradient(135deg,#8A6E28,#E8CE7E 45%,#C9A84C);
--accent-line:#5C4A20;--accent-soft:rgba(201,168,76,.16);--on-accent:#100E0C;
--good:#7FA07E;--warn:#D4622A;--track:#231F1C;
--r:10px;--r-sm:7px;--r-pill:99px;--pr:26px;--pborder:1px solid #262220;--pshadow:0 24px 60px rgba(0,0,0,.5);
--font-d:'Didot','Bodoni 72',Georgia,'Times New Roman',serif;
--font-b:'Helvetica Neue',Helvetica,Arial,sans-serif;--font-n:${MONO};
--dweight:600;--dtrack:.01em;--btrack:.34em;--bcase:none;--lvl-r:8px;
--cta-bg:linear-gradient(135deg,#8A6E28,#E8CE7E 48%,#C9A84C);--cta-ink:#100E0C;--cta-border:0;
--cta-ico-bg:rgba(16,14,12,.22);--cta-ico-ink:#100E0C;
--active-glow:0 0 0 1px rgba(201,168,76,.24),0 8px 30px rgba(201,168,76,.09);
--pr-bg:rgba(201,168,76,.11);--seg-on:#2A2622;--seg-on-ink:#EDE8DE;
--h1:rgba(201,168,76,.26);--h2:rgba(201,168,76,.55);--h3:#C9A84C;
--radar-fill:rgba(201,168,76,.2);--nav-bg:rgba(12,11,10,.92);--nav-border:1px solid #211E1B;--nav-blur:blur(12px);
--fab-r:99px;--fab-shadow:0 8px 24px rgba(201,168,76,.28);--moment-bg:radial-gradient(120% 80% at 50% 30%,#2A2013,#0A0908 62%);
--list-gap:7px;`,
    css: `
body{background:
  radial-gradient(120% 70% at 12% -8%,rgba(201,168,76,.07),transparent 60%),var(--page)}
.wrap::before{content:'';position:fixed;inset:0;pointer-events-none;z-index:2;opacity:.5;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E")}
.pitch h1{background:linear-gradient(120deg,#8A6E28,#F2D98B 42%,#C9A84C 70%);-webkit-background-clip:text;
  background-clip:text;color:transparent}
.kicker{color:#C9A84C}
.brand{background:linear-gradient(120deg,#C9A84C,#F2D98B);-webkit-background-clip:text;background-clip:text;color:transparent}
.rank{background:linear-gradient(120deg,#EDE8DE,#F2D98B);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero{background:linear-gradient(160deg,#1A1715,#131110);position:relative;overflow:hidden}
.hero::after{content:'';position:absolute;top:0;left:-40%;width:36%;height:100%;
  background:linear-gradient(100deg,transparent,rgba(242,217,139,.09),transparent);transform:skewX(-18deg)}
.m-lvl{background:linear-gradient(120deg,#8A6E28,#F2D98B 45%,#C9A84C);-webkit-background-clip:text;background-clip:text;color:transparent}
.card,.ex,.stat,.rows li,.sessions li,.exlist li{background:linear-gradient(180deg,#171514,#141211)}
.sys-card{background:linear-gradient(180deg,#171514,#131110)}`,
    libs: [
      ['Paper Shaders', 'One persistent MeshGradient behind the shell — near-black with slow gold currents, driven by your existing ambient.sceneParams. Pauses when hidden.', '~6 KB'],
      ['Motion', 'Route transitions, list stagger, spring bottom sheets, the odometer number roll.', '~30 KB gz'],
      ['GSAP · Flip + SplitText', 'Card→detail shared-element morph; letter-by-letter reveal on the level-up title.', '~30 KB gz, lazy'],
      ['Magic UI', 'BorderBeam traces the active exercise panel. ShineBorder on a fresh PR.', 'copied source'],
      ['React Bits', 'GlassSurface + SpotlightCard for the trophy case; CountUp already replaced.', 'copied source'],
      ['Bklit UI', 'visx charts restyled with gradient fills and a specular endpoint.', 'copied source'],
    ],
    win: 'The most <strong>distinctive and premium</strong> of the five, and closest to the identity you already own — obsidian and gold are yours, this just stops treating gold as a flat hex. The signature moments (PR, level-up, dungeon clear) get somewhere to land.',
    cost: 'The heaviest build. A WebGL layer plus two animation engines is roughly <strong>70 KB gz</strong> added, and the shader needs a pause-on-hidden path and a static fallback under reduced motion.',
    risk: 'Metallic gradients look cheap when done at 90%. Gold-on-dark also has real contrast limits — the mono numerals must stay bone, never gold, or the data becomes hard to read in a bright gym.',
  },

  // ───────────────────────────────────────────────────────── 2. BRUTAL
  {
    id: 'brutal',
    name: 'Brutal',
    tagline: 'Data as typography',
    thesis:
      'Strip the chrome entirely. No cards, no shadows, no rounded corners — a <strong>hard grid, heavy rules, and enormous numerals</strong> doing all the work. Everything is ink on paper except one signal red, which appears only for the current set, a PR, and destructive actions. This is the direction that reads as "serious tool" from across the room, and it is the fastest to build.',
    palette: [
      ['paper', '#E8E6E1'], ['ink', '#111110'], ['signal', '#FF3B14'],
      ['graphite', '#5C5A55'], ['rule', '#C9C6BF'], ['wash', '#DEDBD4'],
    ],
    typeSample: 'IRONBOUND',
    typeNote: 'One grotesque at two extremes — 800 weight tightly tracked for display, 400 for body — plus a mono for data. Hierarchy comes from scale and weight, never colour.',
    material: [
      ['Surface', 'None — paper only'],
      ['Accent', 'Flat signal red, sparing'],
      ['Radius', '0 everywhere'],
      ['Depth', 'Rules, not shadows'],
      ['Motion', 'Snap cuts, no easing drift'],
      ['Signature', '2px black rules'],
    ],
    vars: `
--page:#DEDBD4;--bg:#E8E6E1;--surface:#E8E6E1;--inset:#DEDBD4;--line:#111110;
--ink:#111110;--ink2:#5C5A55;--accent:#FF3B14;--accent-fill:#FF3B14;
--accent-line:#111110;--accent-soft:#F2CFC6;--on-accent:#FFFFFF;
--good:#2E6B3E;--warn:#FF3B14;--track:#C9C6BF;
--r:0px;--r-sm:0px;--r-pill:0px;--pr:0px;--pborder:2px solid #111110;--pshadow:8px 8px 0 rgba(17,17,16,.14);
--font-d:'Helvetica Neue',Helvetica,Arial,sans-serif;
--font-b:'Helvetica Neue',Helvetica,Arial,sans-serif;--font-n:${MONO};
--dweight:800;--dtrack:-.035em;--btrack:.2em;--bcase:uppercase;--lvl-r:0px;
--cta-bg:#111110;--cta-ink:#E8E6E1;--cta-border:0;--cta-ico-bg:#FF3B14;--cta-ico-ink:#FFFFFF;
--active-glow:none;--pr-bg:#F2CFC6;--seg-on:#111110;--seg-on-ink:#E8E6E1;
--h1:#C9C6BF;--h2:#8C8981;--h3:#111110;
--radar-fill:rgba(255,59,20,.16);--nav-bg:#E8E6E1;--nav-border:2px solid #111110;--nav-blur:none;
--fab-r:0px;--fab-shadow:none;--moment-bg:#FF3B14;--list-gap:0px;`,
    css: `
.pitch h1{text-transform:uppercase}
.sec-hd{border-bottom:2px solid var(--line)}
.sys-card,.verdict div{border:2px solid var(--line)}
.card,.ex,.stat,.hero,.cal,.kpi{border-width:2px}
.ex.active{border-color:var(--accent);border-width:2px}
.rows li,.sessions li,.exlist li{border-width:0 0 1px 0;border-radius:0}
.rows,.sessions,.exlist{border:2px solid var(--line)}
.rows li:last-child,.sessions li:last-child,.exlist li:last-child{border-bottom:0}
.tag,.eyebrow,.stat-k,.grp,.m-eyebrow{font-weight:700}
.rank,.brand,.m-rank,.cal-hd,.ex h3,.card h2{text-transform:uppercase}
.lvl{border:2px solid var(--line);background:var(--accent);color:#fff}
.stat-v,.kpi-v,.m-lvl{font-weight:700;letter-spacing:-.04em}
.stat-v{font-size:30px}
.chip{border-width:2px}.chip.on{background:var(--ink);color:var(--bg)}
.set.pr{outline:2px solid var(--accent);outline-offset:-2px}
.pr-tag{background:var(--accent);color:#fff;font-weight:700}
.heat i{border-radius:0}
.nav a.fab{border:2px solid var(--line);margin-top:-20px}
.moment{color:#fff}
.moment .m-eyebrow,.moment .m-stats b{color:#fff}
.moment .m-lvl,.moment .m-rank{color:#fff;-webkit-text-fill-color:#fff}
.moment .m-sub,.moment .m-stats i{color:rgba(255,255,255,.78)}
.moment .m-cta{background:#111110;color:#fff}
.xpbar,.q-bar,.bar i{border-radius:0}
.xpbar i,.q-bar i,.bar b{border-radius:0;background:var(--ink)}
.log{border:2px solid var(--line)}`,
    libs: [
      ['Motion', 'Everything. Snap route cuts, list reordering, drag-to-dismiss sheets. No second engine needed.', '~30 KB gz'],
      ['Magic UI', 'NumberTicker for the big numerals — an odometer roll is the one flourish this direction allows.', 'copied source'],
      ['Bklit UI', 'visx charts as bare stroke + rule. No gradients, no glow.', 'copied source'],
      ['Kokonut UI', 'Switches, segmented controls, list rows — the settings furniture.', 'copied source'],
      ['GSAP', 'Not used. Flip morphs fight a design with no depth.', '—'],
      ['Paper Shaders', 'Not used. An ambient shader contradicts the whole thesis.', '—'],
    ],
    win: '<strong>Cheapest to build and hardest to get wrong.</strong> One dependency, no WebGL, no shader battery cost, and it stays perfectly legible in direct sunlight — which is where a phone in a gym actually lives.',
    cost: 'It abandons the obsidian-and-gold identity completely. The RPG layer has to be carried by typography and restraint rather than spectacle, so level-ups feel understated rather than cinematic.',
    risk: 'Brutalism is a fine line between confident and unfinished. Get the type scale or the rule weights slightly wrong and it reads as unstyled HTML rather than a deliberate choice.',
  },

  // ───────────────────────────────────────────────────────── 3. ARCADE
  {
    id: 'arcade',
    name: 'Arcade',
    tagline: 'The RPG, unapologetic',
    thesis:
      'Stop treating the game layer as a garnish. This direction makes OPUS look like <strong>a heads-up display</strong> — bracketed frames, monospace telemetry, plasma cyan on a violet-black void. Sets are readouts, quests are missions, the dungeon is the point. It is the only direction where the level-up screen feels like the reason you opened the app.',
    palette: [
      ['void', '#07060F'], ['panel', '#100E1E'], ['plasma', '#43E8FF'],
      ['magenta', '#FF3D9A'], ['amber', '#FFC24B'], ['haze', '#8B87B8'],
    ],
    typeSample: 'IRONBOUND',
    typeNote: 'Monospace as the display face — wide-tracked and uppercase for every label — with a neutral sans only for prose. The whole interface reads as instrumentation.',
    material: [
      ['Surface', 'Panel + 1px plasma edge'],
      ['Accent', 'Cyan glow, magenta alert'],
      ['Radius', '4px — machined'],
      ['Depth', 'Emissive glow'],
      ['Motion', 'Scanline sweep, type-on'],
      ['Signature', 'Bracketed corners'],
    ],
    vars: `
--page:#05040B;--bg:#07060F;--surface:#100E1E;--inset:#171432;--line:#241F45;
--ink:#E8E6FF;--ink2:#8B87B8;--accent:#43E8FF;--accent-fill:linear-gradient(135deg,#43E8FF,#5B7CFF);
--accent-line:#2E7C93;--accent-soft:rgba(67,232,255,.16);--on-accent:#04121A;
--good:#4BE8A8;--warn:#FF3D9A;--track:#1C1836;
--r:4px;--r-sm:3px;--r-pill:3px;--pr:20px;--pborder:1px solid #2A2456;--pshadow:0 24px 70px rgba(67,232,255,.1);
--font-d:${MONO};--font-b:system-ui,'Segoe UI',Roboto,sans-serif;--font-n:${MONO};
--dweight:700;--dtrack:.06em;--btrack:.4em;--bcase:uppercase;--lvl-r:4px;
--cta-bg:linear-gradient(135deg,#43E8FF,#5B7CFF);--cta-ink:#04121A;--cta-border:0;
--cta-ico-bg:rgba(4,18,26,.28);--cta-ico-ink:#04121A;
--active-glow:0 0 0 1px #43E8FF,0 0 26px rgba(67,232,255,.24);
--pr-bg:rgba(255,61,154,.14);--seg-on:#43E8FF;--seg-on-ink:#04121A;
--h1:rgba(67,232,255,.2);--h2:rgba(67,232,255,.5);--h3:#43E8FF;
--radar-fill:rgba(67,232,255,.18);--nav-bg:rgba(7,6,15,.94);--nav-border:1px solid #241F45;--nav-blur:blur(14px);
--fab-r:6px;--fab-shadow:0 0 26px rgba(67,232,255,.4);
--moment-bg:radial-gradient(110% 70% at 50% 34%,#2A1147,#07060F 66%);--list-gap:6px;`,
    css: `
body{background:
  radial-gradient(90% 55% at 84% -6%,rgba(255,61,154,.13),transparent 62%),
  radial-gradient(80% 50% at 6% 4%,rgba(67,232,255,.11),transparent 60%),var(--page)}
.wrap::after{content:'';position:fixed;inset:0;pointer-events-none;z-index:3;opacity:.28;
  background:repeating-linear-gradient(180deg,rgba(255,255,255,.045) 0 1px,transparent 1px 3px)}
.pitch h1{text-transform:uppercase;color:var(--accent);text-shadow:0 0 34px rgba(67,232,255,.42)}
.brand,.rank,.m-rank{text-transform:uppercase;letter-spacing:.08em}
.rank,.m-rank{color:var(--accent);text-shadow:0 0 18px rgba(67,232,255,.34)}
.card,.ex,.hero{position:relative}
.card::before,.card::after,.ex.active::before,.ex.active::after{content:'';position:absolute;width:9px;height:9px;border:1px solid var(--accent);opacity:.7}
.card::before,.ex.active::before{top:-1px;left:-1px;border-right:0;border-bottom:0}
.card::after,.ex.active::after{bottom:-1px;right:-1px;border-left:0;border-top:0}
.tag,.eyebrow,.stat-k,.grp,.m-eyebrow,.q-xp{text-transform:uppercase}
.lvl{box-shadow:0 0 20px rgba(67,232,255,.3)}
.m-lvl{color:var(--accent);text-shadow:0 0 46px rgba(67,232,255,.5)}
.set.pr{box-shadow:inset 0 0 0 1px var(--warn)}
.pr-tag{background:var(--warn);color:#fff}
.badge,.claim{background:var(--accent-fill);color:var(--on-accent)}
.chart .line{filter:drop-shadow(0 0 6px rgba(67,232,255,.55))}
.sys-card,.verdict div{position:relative}
.exlist li b,.s-hd b{letter-spacing:.02em}
.dot-adv{background:var(--warn)}.dot-int{background:var(--accent)}.dot-beg{background:var(--good)}`,
    libs: [
      ['Paper Shaders', 'Dithering + Warp behind the void; Godrays flare on a dungeon clear. This direction is what the library was built for.', '~8 KB'],
      ['Motion', 'HUD panels arm in on route change; telemetry values tick rather than fade.', '~30 KB gz'],
      ['React Bits', 'Decrypted / ScrambleText for stat readouts, Aurora + Dither backgrounds, Dock for the nav.', 'copied source'],
      ['Magic UI', 'BorderBeam on the active exercise, AnimatedList for set logging, Confetti on clear.', 'copied source'],
      ['GSAP · SplitText', 'Type-on effect for the level-up title and boss-gate reveal.', '~26 KB gz, lazy'],
      ['Anime.js', 'Optional — its spring + stagger suit HUD choreography, but it overlaps Motion. Pick one.', 'skip'],
    ],
    win: 'It <strong>commits</strong>. The XP, quests, dungeon and boss gates stop feeling bolted onto a fitness tracker and start feeling like the product. Also the most fun to build and the most memorable in a screenshot.',
    cost: 'Glow and scanlines are expensive on an OLED phone at 3 a.m. and cost battery. Every effect needs a hard gate behind your existing <code>effects</code> setting.',
    risk: 'The narrowest audience. Cyan-on-violet is beautiful at night and <strong>poor in daylight</strong>, and a HUD aesthetic can feel juvenile next to the maturity your current gold identity has. Hardest to walk back.',
  },

  // ──────────────────────────────────────────────────────── 4. ATELIER
  {
    id: 'atelier',
    name: 'Atelier',
    tagline: 'The printed journal',
    thesis:
      'The opposite bet. Training logs were paper for a century, and paper is <strong>calm, legible and permanent</strong> in a way glowing dashboards are not. Bone stock, old-style serif, ruled lines, ink-drawn charts. The RPG stays — but rendered as a hand-kept ledger with seals and marginalia rather than a game HUD. The only direction that feels quiet.',
    palette: [
      ['bone', '#F3EFE7'], ['leaf', '#FBF9F4'], ['ink', '#23201B'],
      ['sepia', '#8A7F6D'], ['seal', '#9C3B2E'], ['sage', '#5F7355'],
    ],
    typeSample: 'Ironbound',
    typeNote: 'Old-style serif throughout, including body — the way a printed book sets text. A typewriter mono handles data so numerals read as recorded, not computed.',
    material: [
      ['Surface', 'Paper, faint tooth'],
      ['Accent', 'Seal red, used once'],
      ['Radius', '3px — cut, not rounded'],
      ['Depth', 'None. Rules and space'],
      ['Motion', 'Page turn, ink draw-on'],
      ['Signature', 'Ruled baseline grid'],
    ],
    vars: `
--page:#EAE5DA;--bg:#F3EFE7;--surface:#FBF9F4;--inset:#F0EBE0;--line:#DCD5C6;
--ink:#23201B;--ink2:#8A7F6D;--accent:#9C3B2E;--accent-fill:#9C3B2E;
--accent-line:#C8A69C;--accent-soft:rgba(156,59,46,.12);--on-accent:#FBF9F4;
--good:#5F7355;--warn:#9C3B2E;--track:#E2DCCE;
--r:3px;--r-sm:3px;--r-pill:99px;--pr:14px;--pborder:1px solid #D2CBBB;--pshadow:0 18px 44px rgba(35,32,27,.14);
--font-d:'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif;
--font-b:'Iowan Old Style',Palatino,Georgia,serif;--font-n:${MONO};
--dweight:600;--dtrack:0;--btrack:.22em;--bcase:none;--lvl-r:99px;
--cta-bg:#23201B;--cta-ink:#FBF9F4;--cta-border:0;--cta-ico-bg:#9C3B2E;--cta-ico-ink:#FBF9F4;
--active-glow:inset 3px 0 0 #9C3B2E;--pr-bg:rgba(156,59,46,.09);
--seg-on:#23201B;--seg-on-ink:#FBF9F4;
--h1:#E2DCCE;--h2:#B9AE97;--h3:#8A7F6D;
--radar-fill:rgba(156,59,46,.13);--nav-bg:#FBF9F4;--nav-border:1px solid #DCD5C6;--nav-blur:none;
--fab-r:99px;--fab-shadow:none;--moment-bg:#F3EFE7;--list-gap:0px;`,
    css: `
body{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23p)' opacity='.045'/%3E%3C/svg%3E")}
.pitch h1{font-style:italic}
.kicker{font-style:normal}
.card,.hero,.ex,.stat,.cal{box-shadow:none}
.card-hd{border-bottom:1px solid var(--line);padding-bottom:7px}
.tag{letter-spacing:.2em}
.rank,.card h2,.ex h3{font-style:italic}
.lvl{background:transparent;color:var(--accent);border:1.5px solid var(--accent);font-family:var(--font-d);font-style:italic}
.m-lvl{color:var(--accent)}
.xpbar,.q-bar,.bar i{background:var(--track);height:3px}
.xpbar i,.q-bar i,.bar b{background:var(--ink)}
.rows,.exlist,.sessions{border-top:1px solid var(--line)}
.rows li,.exlist li,.sessions li{border:0;border-bottom:1px solid var(--line);background:transparent;border-radius:0}
.set{background:transparent;border-bottom:1px dotted var(--line);border-radius:0;padding-left:0;padding-right:0}
.set.pr{background:transparent}
.pr-tag{background:transparent;color:var(--accent);border:1px solid var(--accent)}
.ex.active{border-left:3px solid var(--accent)}
.trophies .tro.on{background:transparent}
.heat i{border-radius:1px}
.moment{border:0}
.m-rank{font-style:italic}
.m-cta{background:var(--ink);color:var(--bg)}
.nav a.fab{border:1px solid var(--ink);background:var(--ink);color:var(--bg)}
.chart .line{stroke-width:1.6}
.badge,.claim{background:transparent;color:var(--accent);border:1px solid var(--accent)}
.chip.on{background:var(--ink);color:var(--bg)}`,
    libs: [
      ['Motion', 'Page-turn route transitions and ink draw-on for charts. Restrained — this direction punishes excess motion.', '~30 KB gz'],
      ['GSAP · DrawSVG behaviour', 'Charts and the radar draw themselves like a pen stroke on first paint.', '~26 KB gz, lazy'],
      ['Bklit UI', 'visx line/area/radar as bare ink strokes — closest fit of any direction.', 'copied source'],
      ['Kokonut UI', 'List rows and switches, restyled flat.', 'copied source'],
      ['Paper Shaders', 'Only Grain, at very low opacity, for paper tooth. No animation.', '~4 KB'],
      ['Magic UI / React Bits', 'Largely unused — beams, glows and spotlights all fight the thesis.', '—'],
    ],
    win: 'The most <strong>legible in a real gym</strong>, the lightest on battery, and genuinely differentiated — no fitness app looks like this. Ages far better than any glow or glass trend.',
    cost: 'A light-first design needs its dark theme designed from scratch rather than inverted, which is real work. It also has the least room for the "wow" your standing rule asks for.',
    risk: 'Your stated preference is liveliness and wow factor, and this direction deliberately spends almost none of that budget. The RPG could end up feeling <strong>decorative rather than exciting</strong>.',
  },

  // ───────────────────────────────────────────────────────── 5. AURORA
  {
    id: 'aurora',
    name: 'Aurora',
    tagline: 'Depth and glass',
    thesis:
      'The most conventionally modern of the five and the most immediately likeable. Deep slate ground, <strong>frosted glass panels floating over soft aurora light</strong>, generous radii, humanist type. It reads as a well-funded consumer app — the look people already trust — and it is the safest direction to hand to someone who has never seen OPUS before.',
    palette: [
      ['slate', '#0B1020'], ['glass', 'rgba(255,255,255,.06)'], ['violet', '#8B7DFF'],
      ['teal', '#4FD8C4'], ['blush', '#FF8FA3'], ['mist', '#C7CCE5'],
    ],
    typeSample: 'Ironbound',
    typeNote: 'A humanist sans across the board, tightly tracked at display sizes. Warm, geometric, friendly — deliberately the least "designed-looking" type of the five.',
    material: [
      ['Surface', 'Frosted glass, 18px blur'],
      ['Accent', 'Violet→teal gradient'],
      ['Radius', '18px — generous'],
      ['Depth', 'Layered blur + soft shadow'],
      ['Motion', 'Spring physics throughout'],
      ['Signature', 'Light behind glass'],
    ],
    vars: `
--page:#080C18;--bg:#0B1020;--surface:rgba(255,255,255,.055);--inset:rgba(255,255,255,.04);
--line:rgba(255,255,255,.09);
--ink:#EEF1FA;--ink2:#9BA3C4;--accent:#9C90FF;--accent-fill:linear-gradient(135deg,#8B7DFF,#4FD8C4);
--accent-line:rgba(139,125,255,.42);--accent-soft:rgba(139,125,255,.18);--on-accent:#0A0E1C;
--good:#4FD8C4;--warn:#FF8FA3;--track:rgba(255,255,255,.09);
--r:18px;--r-sm:13px;--r-pill:99px;--pr:34px;--pborder:1px solid rgba(255,255,255,.1);
--pshadow:0 30px 70px rgba(0,0,0,.5);
--font-d:'Avenir Next',Avenir,'Segoe UI',system-ui,sans-serif;
--font-b:system-ui,'Segoe UI',Roboto,sans-serif;--font-n:${MONO};
--dweight:600;--dtrack:-.02em;--btrack:.16em;--bcase:none;--lvl-r:14px;
--cta-bg:linear-gradient(135deg,#8B7DFF,#4FD8C4);--cta-ink:#0A0E1C;--cta-border:0;
--cta-ico-bg:rgba(10,14,28,.24);--cta-ico-ink:#0A0E1C;
--active-glow:0 0 0 1px rgba(139,125,255,.4),0 10px 40px rgba(139,125,255,.18);
--pr-bg:rgba(139,125,255,.16);--seg-on:rgba(255,255,255,.14);--seg-on-ink:#EEF1FA;
--h1:rgba(139,125,255,.24);--h2:rgba(139,125,255,.55);--h3:#8B7DFF;
--radar-fill:rgba(139,125,255,.24);--nav-bg:rgba(11,16,32,.72);--nav-border:1px solid rgba(255,255,255,.08);
--nav-blur:blur(20px);--fab-r:18px;--fab-shadow:0 10px 30px rgba(139,125,255,.4);
--moment-bg:radial-gradient(120% 80% at 50% 26%,rgba(139,125,255,.4),rgba(11,16,32,0) 62%),#0B1020;
--list-gap:8px;`,
    css: `
body{background:
  radial-gradient(70% 46% at 78% 2%,rgba(139,125,255,.24),transparent 62%),
  radial-gradient(60% 44% at 12% 16%,rgba(79,216,196,.16),transparent 60%),
  radial-gradient(50% 40% at 50% 96%,rgba(255,143,163,.11),transparent 60%),var(--page)}
.phone{position:relative}
.phone::before{content:'';position:absolute;inset:0;z-index:0;pointer-events-none;
  background:radial-gradient(70% 40% at 76% 2%,rgba(139,125,255,.3),transparent 60%),
             radial-gradient(60% 36% at 10% 26%,rgba(79,216,196,.2),transparent 58%),
             radial-gradient(50% 30% at 46% 100%,rgba(255,143,163,.16),transparent 60%)}
.phone>.scr{background:transparent;z-index:1}
.card,.ex,.hero,.stat,.cal,.rows li,.sessions li,.exlist li,.kpi,.sys-card,.verdict div{
  backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.hero{background:linear-gradient(150deg,rgba(255,255,255,.11),rgba(255,255,255,.03))}
.pitch h1{background:linear-gradient(120deg,#EEF1FA,#8B7DFF 52%,#4FD8C4);-webkit-background-clip:text;
  background-clip:text;color:transparent}
.rank,.brand{background:linear-gradient(120deg,#EEF1FA,#C4BCFF);-webkit-background-clip:text;background-clip:text;color:transparent}
.m-lvl{background:linear-gradient(140deg,#8B7DFF,#4FD8C4);-webkit-background-clip:text;background-clip:text;color:transparent}
.lvl{box-shadow:0 8px 22px rgba(139,125,255,.32)}
.chart .line{stroke:#8B7DFF}
.gs0{stop-color:#8B7DFF;stop-opacity:.42}.gs1{stop-color:#4FD8C4;stop-opacity:0}
.chart .dot{fill:#4FD8C4}
.badge,.claim,.pr-tag{background:var(--accent-fill);color:var(--on-accent)}`,
    libs: [
      ['Motion', 'The core. Spring layout animations, shared-element route transitions, drag-to-dismiss glass sheets.', '~30 KB gz'],
      ['Paper Shaders', 'MeshGradient supplies the aurora light behind the glass — cheaper and better than animating CSS gradients.', '~6 KB'],
      ['Magic UI', 'MagicCard tilt/spotlight, BentoGrid for the Home deck, BlurFade page entries, NumberTicker.', 'copied source'],
      ['Kokonut UI', 'Its glass cards and toolbars are almost exactly this direction already — least adaptation of any pairing.', 'copied source'],
      ['React Bits', 'GlassSurface, Dock nav, SpotlightCard.', 'copied source'],
      ['Lenis', 'Considered and rejected — smooth-scroll hijacking fights Android pull-to-refresh in a PWA.', '—'],
    ],
    win: '<strong>Lowest risk, fastest to a polished result.</strong> Kokonut and Magic UI are already built in this idiom, so adaptation is minimal, and glass gives the depth the current flat UI lacks without inventing a new visual language.',
    cost: 'Heavy <code>backdrop-filter</code> is the single most expensive thing you can put on a mid-range Android GPU. It needs a blur-off fallback tied to your <code>effects</code> setting, not just reduced-motion.',
    risk: 'It is the <strong>least distinctive</strong>. This is the look every AI-era app converges on, and OPUS would lose the obsidian-and-gold identity that currently makes it recognisably yours.',
  },
];
