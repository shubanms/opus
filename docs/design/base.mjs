// Structural CSS shared by every direction. Colour, type, radius, depth and
// character all come from the direction's own token block + extra CSS.

export const BASE = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font-family:var(--font-b);
  -webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
.num{font-family:var(--font-n);font-variant-numeric:tabular-nums}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px}

/* ── page shell ─────────────────────────────────────────────── */
.wrap{max-width:1360px;margin:0 auto;padding:clamp(28px,5vw,72px) clamp(18px,4vw,48px) 96px}
.pitch{max-width:74ch}
.kicker{font-family:var(--font-n);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin:0 0 18px}
.pitch h1{font-family:var(--font-d);font-size:clamp(52px,10vw,116px);line-height:.92;margin:0 0 18px;
  letter-spacing:var(--dtrack);font-weight:var(--dweight);text-wrap:balance;color:var(--ink)}
.thesis{font-size:clamp(17px,2.1vw,21px);line-height:1.55;color:var(--ink2);margin:0 0 10px;max-width:62ch}
.thesis strong{color:var(--ink);font-weight:600}

.sec{margin-top:clamp(48px,7vw,96px)}
.sec-hd{display:flex;align-items:baseline;gap:14px;margin-bottom:22px;
  border-bottom:1px solid var(--line);padding-bottom:12px}
.sec-hd h2{font-family:var(--font-d);font-size:clamp(22px,3vw,30px);margin:0;font-weight:var(--dweight);letter-spacing:var(--dtrack)}
.sec-hd p{margin:0;color:var(--ink2);font-size:14px}

/* ── system panel ───────────────────────────────────────────── */
.sys{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px}
.sys-card{border:1px solid var(--line);border-radius:var(--r);padding:18px;background:var(--surface)}
.sys-card h3{margin:0 0 12px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink2);font-family:var(--font-n);font-weight:600}
.sw-row{display:flex;gap:8px;flex-wrap:wrap}
.sw{width:46px;height:46px;border-radius:var(--r-sm);border:1px solid var(--line)}
.sw-lbl{display:block;font-family:var(--font-n);font-size:10px;color:var(--ink2);margin-top:6px}
.spec-d{font-family:var(--font-d);font-size:38px;line-height:1;font-weight:var(--dweight);letter-spacing:var(--dtrack)}
.spec-b{font-family:var(--font-b);font-size:15px;line-height:1.5;color:var(--ink2);margin-top:8px}
.spec-n{font-family:var(--font-n);font-size:19px;margin-top:8px;letter-spacing:.02em}
.kv{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px dashed var(--line);font-size:13px}
.kv:last-child{border-bottom:0}
.kv span:last-child{font-family:var(--font-n);color:var(--ink2)}

/* ── screen gallery ─────────────────────────────────────────── */
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:clamp(20px,3vw,40px)}
.shot{min-width:0}
.shot-cap{margin:14px 2px 0}
.shot-cap b{display:block;font-family:var(--font-d);font-size:19px;font-weight:var(--dweight);letter-spacing:var(--dtrack)}
.shot-cap i{display:block;font-style:normal;color:var(--ink2);font-size:13px;line-height:1.5;margin-top:4px}

.phone{width:100%;aspect-ratio:320/660;border-radius:var(--pr);overflow:hidden;position:relative;
  background:var(--bg);border:var(--pborder);box-shadow:var(--pshadow)}
.phone>.scr{position:absolute;inset:0;width:320px;height:660px;transform-origin:top left;overflow:hidden}

/* ── in-app structure ───────────────────────────────────────── */
.scr{background:var(--bg);color:var(--ink);display:flex;flex-direction:column;gap:10px;padding:14px 14px 74px;font-size:13px}
.topline{display:flex;align-items:center;justify-content:space-between;padding:4px 2px 6px}
.brand{font-family:var(--font-d);font-size:20px;font-weight:var(--dweight);letter-spacing:var(--btrack);text-transform:var(--bcase)}
.tl-r{display:flex;align-items:center;gap:5px;color:var(--accent);font-family:var(--font-n);font-size:13px}
.tl-r svg{width:14px;height:14px}
.topline.wk .live{color:var(--accent)}

.hero{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px;display:flex;flex-direction:column;gap:10px}
.hero-row{display:flex;align-items:center;gap:12px}
.lvl{width:44px;height:44px;flex:0 0 44px;border-radius:var(--lvl-r);display:grid;place-items:center;
  background:var(--accent-fill);color:var(--on-accent);font-family:var(--font-n);font-size:18px;font-weight:700}
.lvl.big{width:56px;height:56px;flex-basis:56px;font-size:22px}
.eyebrow{font-family:var(--font-n);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
.rank{font-family:var(--font-d);font-size:28px;margin:2px 0 0;font-weight:var(--dweight);letter-spacing:var(--dtrack);line-height:1}
.xpbar{height:6px;border-radius:99px;background:var(--track);overflow:hidden}
.xpbar.sm{height:4px}
.xpbar i{display:block;height:100%;background:var(--accent-fill);border-radius:99px}
.xpmeta{display:flex;justify-content:space-between;font-size:11px;color:var(--ink2)}

.cta{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;
  background:var(--cta-bg);color:var(--cta-ink);border:var(--cta-border);border-radius:var(--r);padding:13px 14px;cursor:pointer;font:inherit}
.cta b{display:block;font-size:15px;font-weight:600}
.cta i{display:block;font-style:normal;font-size:11px;opacity:.66;margin-top:2px}
.cta-ico{width:34px;height:34px;border-radius:99px;display:grid;place-items:center;background:var(--cta-ico-bg);color:var(--cta-ico-ink);flex:0 0 34px}
.cta-ico svg{width:15px;height:15px}

.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:13px}
.card-hd{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.tag{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-n);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2)}
.tag svg{width:13px;height:13px;color:var(--accent)}
.card h2{font-family:var(--font-d);font-size:21px;margin:0;font-weight:var(--dweight);letter-spacing:var(--dtrack)}
.sub{color:var(--ink2);font-size:11px;margin:3px 0 0}
.iron{font-family:var(--font-n);font-size:13px;color:var(--accent)}
.objective{margin-top:9px;padding:8px 10px;border-radius:var(--r-sm);background:var(--inset);font-size:11px;display:flex;align-items:center;gap:7px;color:var(--ink2)}
.objective svg{width:13px;height:13px;color:var(--accent);flex:0 0 13px}
.chips{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}
.chip{font-size:10px;padding:4px 9px;border-radius:var(--r-pill);background:var(--inset);color:var(--ink2);border:1px solid var(--line)}
.chip.on{background:var(--accent-fill);color:var(--on-accent);border-color:transparent}

.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px}
.stat-k{font-family:var(--font-n);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2)}
.stat-v{font-family:var(--font-n);font-size:24px;margin:5px 0 1px;line-height:1}
.stat-u{font-size:10px;color:var(--ink2)}

.bars{display:flex;flex-direction:column;gap:7px}
.bar{display:flex;align-items:center;gap:9px;font-size:11px;color:var(--ink2)}
.bar span{width:66px;flex:0 0 66px}
.bar i{flex:1;height:6px;border-radius:99px;background:var(--track);overflow:hidden}
.bar b{display:block;height:100%;background:var(--accent-fill);border-radius:99px}

/* workout */
.ex{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px}
.ex.active{border-color:var(--accent-line);box-shadow:var(--active-glow)}
.ex-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.ex h3{margin:0;font-family:var(--font-d);font-size:17px;font-weight:var(--dweight);letter-spacing:var(--dtrack)}
.ex-prog{font-family:var(--font-n);font-size:11px;color:var(--ink2)}
.ex-prog .num{font-size:16px;color:var(--ink)}
.sets{display:flex;flex-direction:column;gap:5px;margin:10px 0}
.set{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:var(--r-sm);background:var(--inset);font-size:12px}
.set .sn{width:16px;color:var(--ink2);font-family:var(--font-n);font-size:10px}
.set .num{flex:1}
.delta{font-family:var(--font-n);font-size:10px;color:var(--good)}
.set.pr{background:var(--pr-bg)}
.pr-tag{background:var(--accent-fill);color:var(--on-accent);padding:2px 7px;border-radius:var(--r-pill);font-size:9px;letter-spacing:.08em}
.entry{display:flex;align-items:center;gap:7px;margin-top:9px}
.field{flex:1;background:var(--inset);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;display:flex;align-items:baseline;gap:6px}
.field i{font-style:normal;font-size:9px;color:var(--ink2);text-transform:uppercase;letter-spacing:.1em}
.field .num{font-size:16px}
.x{color:var(--ink2)}
.log{width:38px;height:38px;flex:0 0 38px;border-radius:var(--lvl-r);border:0;background:var(--accent-fill);color:var(--on-accent);display:grid;place-items:center;cursor:pointer}
.log svg{width:17px;height:17px}
.hint{margin-top:8px;font-size:10px;color:var(--ink2)}
.rest{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--accent-line);border-radius:var(--r);padding:11px}
.rest b{display:block;font-size:13px}
.rest i{display:block;font-style:normal;font-size:10px;color:var(--ink2);margin-top:2px}
.ring{position:relative;width:52px;height:52px;flex:0 0 52px}
.ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ring circle{fill:none;stroke:var(--track);stroke-width:5}
.ring .fg{stroke:var(--accent);stroke-linecap:round}
.ring span{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--font-n);font-size:12px}

/* progress */
.segmented{display:flex;gap:2px;background:var(--inset);border-radius:var(--r-sm);padding:3px}
.segmented span{flex:1;text-align:center;padding:6px;font-size:11px;color:var(--ink2);border-radius:calc(var(--r-sm) - 2px)}
.segmented .on{background:var(--seg-on);color:var(--seg-on-ink)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
.kpi{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:9px 7px;text-align:center}
.kpi-v{font-family:var(--font-n);font-size:16px;line-height:1}
.kpi-k{font-size:8px;color:var(--ink2);margin-top:4px;letter-spacing:.06em}
.chart{height:104px;margin:2px 0}
.chart svg{width:100%;height:100%;overflow:visible}
.chart .line{fill:none;stroke:var(--accent);stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
.chart .dot{fill:var(--accent)}
.gs0{stop-color:var(--accent);stop-opacity:.34}
.gs1{stop-color:var(--accent);stop-opacity:0}
.axis{display:flex;justify-content:space-between;font-family:var(--font-n);font-size:9px;color:var(--ink2)}
.up{color:var(--good);font-size:11px}
.heat{display:grid;grid-template-columns:repeat(12,1fr);gap:3px}
.heat i{aspect-ratio:1;border-radius:2px;background:var(--track)}
.heat i[data-v="1"]{background:var(--h1)}.heat i[data-v="2"]{background:var(--h2)}.heat i[data-v="3"]{background:var(--h3)}
.prs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.prs li{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:12px}
.prs li:last-child{border-bottom:0}
.prs .num{color:var(--accent)}

/* profile */
.radar{display:flex;align-items:center;gap:10px}
.radar svg{width:118px;height:118px;flex:0 0 118px}
.radar .web{fill:none;stroke:var(--line)}
.radar .fill{fill:var(--radar-fill);stroke:var(--accent);stroke-width:1.8}
.radar .pt{fill:var(--accent)}
.radar-lg{display:flex;flex-direction:column;gap:5px;font-size:10px;color:var(--ink2)}
.radar-lg b{color:var(--ink);font-size:11px}
.trophies{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.tro{background:var(--inset);border:1px solid var(--line);border-radius:var(--r-sm);padding:9px 5px;text-align:center;opacity:.42}
.tro.on{opacity:1;border-color:var(--accent-line);background:var(--pr-bg)}
.tro svg{width:17px;height:17px;color:var(--ink2)}
.tro.on svg{color:var(--accent)}
.tro i{display:block;font-style:normal;font-size:8px;margin-top:4px;color:var(--ink2)}
.boss b{font-family:var(--font-d);font-size:16px;font-weight:var(--dweight)}
.boss .xpbar{margin-top:8px}

/* exercises + history */
.search input{width:100%;background:var(--inset);border:1px solid var(--line);border-radius:var(--r-sm);
  padding:9px 11px;color:var(--ink);font:inherit;font-size:12px}
.search input::placeholder{color:var(--ink2)}
.chiprow{display:flex;gap:6px;overflow:hidden}
.exlist,.sessions,.rows,.quests{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--list-gap)}
.exlist li{display:flex;align-items:center;gap:9px;background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-sm);padding:9px 11px}
.exlist b{display:block;font-size:12px;font-weight:600}
.exlist i{display:block;font-style:normal;font-size:10px;color:var(--ink2);margin-top:1px}
.exlist div{flex:1;min-width:0}
.pr-v{font-size:11px;color:var(--accent)}
[class^="dot-"]{width:7px;height:7px;border-radius:99px;flex:0 0 7px}
.dot-beg{background:var(--good)}.dot-int{background:var(--accent)}.dot-adv{background:var(--warn)}
.cal{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px}
.cal-hd{font-family:var(--font-d);font-size:15px;margin-bottom:8px;font-weight:var(--dweight)}
.cal-dow,.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center}
.cal-dow i{font-style:normal;font-size:9px;color:var(--ink2)}
.cal-grid{margin-top:5px}
.cal-grid span{aspect-ratio:1;display:grid;place-items:center;font-family:var(--font-n);font-size:10px;
  border-radius:var(--r-sm);color:var(--ink2)}
.cal-grid .on{background:var(--accent-soft);color:var(--ink)}
.cal-grid .today{outline:1.5px solid var(--accent)}
.sessions li{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 11px}
.s-hd{display:flex;justify-content:space-between;align-items:baseline}
.s-hd b{font-size:13px}
.s-hd i{font-style:normal;font-size:10px;color:var(--ink2)}
.s-meta{display:flex;gap:9px;margin-top:5px;font-size:10px;color:var(--ink2);align-items:center}
.badge{background:var(--accent-fill);color:var(--on-accent);padding:2px 7px;border-radius:var(--r-pill);font-size:9px}

/* quests */
.quests li{background:var(--inset);border-radius:var(--r-sm);padding:9px 10px}
.quests li.done{background:var(--pr-bg)}
.q-hd{display:flex;justify-content:space-between;align-items:baseline;font-size:12px}
.q-xp{font-family:var(--font-n);font-size:10px;color:var(--accent)}
.q-bar{height:4px;background:var(--track);border-radius:99px;margin:7px 0 5px;overflow:hidden}
.q-bar i{display:block;height:100%;background:var(--accent-fill)}
.q-meta{display:flex;justify-content:space-between;align-items:center;font-size:9px;color:var(--ink2)}
.claim{background:var(--accent-fill);color:var(--on-accent);padding:3px 9px;border-radius:var(--r-pill);font-size:9px}
.vault{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;text-align:center}
.v-item{background:var(--inset);border:1px solid var(--line);border-radius:var(--r-sm);padding:9px 4px;opacity:.5}
.v-item.on{opacity:1;border-color:var(--accent-line)}
.v-item span{font-size:17px}
.v-item i{display:block;font-style:normal;font-size:8px;color:var(--ink2);margin-top:3px}

/* moment */
.moment{justify-content:center;align-items:center;text-align:center;background:var(--moment-bg);padding:20px}
.moment-inner{display:flex;flex-direction:column;align-items:center;gap:5px}
.m-eyebrow{font-family:var(--font-n);font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--accent)}
.m-lvl{font-family:var(--font-n);font-size:86px;line-height:1;color:var(--ink);margin:6px 0}
.m-rank{font-family:var(--font-d);font-size:34px;margin:0;font-weight:var(--dweight);letter-spacing:var(--dtrack)}
.m-sub{color:var(--ink2);font-size:12px;margin:6px 0 20px}
.m-stats{display:flex;gap:22px;margin-bottom:26px}
.m-stats span{display:flex;flex-direction:column;gap:3px}
.m-stats b{font-family:var(--font-n);font-size:19px;color:var(--accent)}
.m-stats i{font-style:normal;font-size:9px;color:var(--ink2);letter-spacing:.1em;text-transform:uppercase}
.m-cta{padding:11px 34px;border-radius:var(--r-pill);background:var(--accent-fill);color:var(--on-accent);font-size:13px;font-weight:600}

/* settings */
.grp{font-family:var(--font-n);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink2);margin:8px 2px 0}
.grp.danger{color:var(--warn)}
.rows li{display:flex;align-items:center;justify-content:space-between;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--r-sm);padding:11px;font-size:12px}
.rows li.danger{color:var(--warn);border-color:var(--warn)}
.val{color:var(--ink2)}
.chev{color:var(--ink2)}
.ok{color:var(--good);font-size:11px}
.seg-sm{display:flex;background:var(--inset);border-radius:var(--r-sm);padding:2px}
.seg-sm i{font-style:normal;font-size:10px;padding:3px 9px;border-radius:calc(var(--r-sm) - 2px);color:var(--ink2)}
.seg-sm .on{background:var(--seg-on);color:var(--seg-on-ink)}
.sw{position:relative;width:34px;height:19px;border-radius:99px;background:var(--track);border:0}
.sw i{position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:99px;background:var(--ink2)}
.sw.on{background:var(--accent-fill)}
.sw.on i{left:17px;background:var(--on-accent)}

/* nav */
.nav{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:space-around;
  background:var(--nav-bg);border-top:var(--nav-border);padding:9px 8px 11px;backdrop-filter:var(--nav-blur)}
.nav a{display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--ink2);flex:1}
.nav a svg{width:19px;height:19px}
.nav a i{font-style:normal;font-size:8px}
.nav a.on{color:var(--accent)}
.nav a.fab{background:var(--accent-fill);color:var(--on-accent);width:46px;height:46px;flex:0 0 46px;
  border-radius:var(--fab-r);justify-content:center;margin-top:-22px;box-shadow:var(--fab-shadow)}
.nav a.fab i{display:none}
.nav a.fab svg{width:22px;height:22px}

/* ── stack table ────────────────────────────────────────────── */
.stack{width:100%;border-collapse:collapse;font-size:14px}
.stack th{text-align:left;font-family:var(--font-n);font-size:10px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--ink2);font-weight:600;padding:0 14px 10px 0;border-bottom:1px solid var(--line)}
.stack td{padding:13px 14px 13px 0;border-bottom:1px solid var(--line);vertical-align:top;color:var(--ink2);line-height:1.5}
.stack td:first-child{color:var(--ink);font-weight:600;white-space:nowrap}
.stack td:last-child{font-family:var(--font-n);font-size:12px;white-space:nowrap}
.tbl-wrap{overflow-x:auto}
.verdict{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:22px}
.verdict div{border:1px solid var(--line);border-radius:var(--r);padding:16px;background:var(--surface)}
.verdict h4{margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-family:var(--font-n);color:var(--ink2)}
.verdict p{margin:0;font-size:14px;line-height:1.6;color:var(--ink2)}
.verdict strong{color:var(--ink)}
footer{margin-top:64px;padding-top:20px;border-top:1px solid var(--line);color:var(--ink2);font-size:13px;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between}

@media (prefers-reduced-motion:no-preference){
  .shot{animation:rise .6s cubic-bezier(.22,1,.36,1) both}
  @keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
}
`;

export function page({ theme, screensHtml, n }) {
  return `<title>OPUS — ${theme.name}</title>
<style>
:root{${theme.vars}}
${BASE}
${theme.css}
</style>
<div class="wrap">
  <header class="pitch">
    <p class="kicker">OPUS redesign · Direction ${n} of 5 · ${theme.tagline}</p>
    <h1>${theme.name}</h1>
    <p class="thesis">${theme.thesis}</p>
  </header>

  <section class="sec">
    <div class="sec-hd"><h2>The system</h2><p>Tokens every screen is built from.</p></div>
    <div class="sys">
      <div class="sys-card"><h3>Palette</h3><div class="sw-row">
        ${theme.palette.map((p) => `<div><div class="sw" style="background:${p[1]}"></div><span class="sw-lbl">${p[0]}</span></div>`).join('')}
      </div></div>
      <div class="sys-card"><h3>Type</h3>
        <div class="spec-d">${theme.typeSample}</div>
        <div class="spec-b">${theme.typeNote}</div>
        <div class="spec-n">102.5 kg · 1,284,000</div>
      </div>
      <div class="sys-card"><h3>Material &amp; motion</h3>
        ${theme.material.map((m) => `<div class="kv"><span>${m[0]}</span><span>${m[1]}</span></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="sec">
    <div class="sec-hd"><h2>Screens</h2><p>Nine surfaces, real OPUS data.</p></div>
    <div class="gallery">${screensHtml}</div>
  </section>

  <section class="sec">
    <div class="sec-hd"><h2>What it's built with</h2><p>From the shortlist you sent.</p></div>
    <div class="tbl-wrap"><table class="stack">
      <thead><tr><th>Library</th><th>Used for</th><th>Cost</th></tr></thead>
      <tbody>${theme.libs.map((l) => `<tr><td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td></tr>`).join('')}</tbody>
    </table></div>
    <div class="verdict">
      <div><h4>What you win</h4><p>${theme.win}</p></div>
      <div><h4>What it costs</h4><p>${theme.cost}</p></div>
      <div><h4>Biggest risk</h4><p>${theme.risk}</p></div>
    </div>
  </section>

  <footer><span>OPUS · ${theme.name} · ${theme.tagline}</span><span>Mockups use system typefaces — the shipped app keeps its licensed faces.</span></footer>
</div>
<script>
// Screens are authored at a fixed 320px and scaled to whatever the column is,
// so every direction is compared at identical proportions.
const fit = () => document.querySelectorAll('.phone').forEach((p) => {
  const s = p.clientWidth / 320;
  const scr = p.querySelector('.scr');
  if (scr) { scr.style.transform = 'scale(' + s + ')'; }
});
addEventListener('resize', fit); fit();
if (document.fonts) document.fonts.ready.then(fit);
</script>`;
}
