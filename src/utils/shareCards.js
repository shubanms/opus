// The five 1080×1080 share cards, drawn with canvas 2D.
//
// Each renderer takes (ctx, data, theme) and paints the full card. They share
// the same skeleton — header, headline, accent rule, stat row, footer — which
// lives in the `draw*` helpers below.

import {
  CARD,
  DEFAULT_THEME,
  columns,
  fitFontSize,
  formatDuration,
  formatShareDate,
  groupNumber,
  muscleLine,
  pluralize,
  sparkBars,
} from './cardLayout.js';
import {
  FONT,
  drawDiamond,
  drawFadeRule,
  drawLogoMark,
  drawPill,
  drawText,
  fillRoundRect,
  measureText,
} from './canvasKit.js';
import { toDisplay, unitLabel } from './units.js';

const TAGLINE = 'Build your masterpiece.';

function drawBackground(ctx, theme) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, CARD.size, CARD.size);
}

/** Logo mark + wordmark on the left, identity on the right. */
function drawHeader(ctx, { theme, right, subRight, prestige = 0 }) {
  const cy = CARD.pad + 30;
  drawLogoMark(ctx, CARD.pad + 30, cy, 28, theme.accent, 4);

  const wordX = CARD.pad + 82;
  const wordWidth = drawText(ctx, 'OPUS', {
    x: wordX,
    y: cy,
    family: FONT.display,
    size: 52,
    weight: 700,
    tracking: 8,
    color: theme.text,
    baseline: 'middle',
  });

  for (let i = 0; i < Math.min(prestige, 5); i += 1) {
    drawDiamond(ctx, wordX + wordWidth + 28 + i * 24, cy, 16, theme.accent);
  }

  const rightX = CARD.size - CARD.pad;
  if (right) {
    drawText(ctx, right, {
      x: rightX,
      y: subRight ? cy - 16 : cy,
      family: FONT.sans,
      size: 30,
      weight: 600,
      color: theme.text,
      align: 'right',
      baseline: 'middle',
    });
  }
  if (subRight) {
    drawText(ctx, subRight, {
      x: rightX,
      y: cy + 20,
      family: FONT.mono,
      size: 28,
      color: theme.sub,
      align: 'right',
      baseline: 'middle',
    });
  }
}

/** Mono eyebrow above a large display headline that shrinks to fit. */
function drawHeadline(ctx, { theme, eyebrow, title, y, titleSize = 104, sub }) {
  let cursor = y;
  if (eyebrow) {
    drawText(ctx, eyebrow, {
      x: CARD.pad,
      y: cursor,
      family: FONT.mono,
      size: 38,
      weight: 500,
      tracking: 2,
      color: theme.accent,
    });
    cursor += 52;
  }

  const size = fitFontSize({
    measure: (s) => measureText(ctx, title, { family: FONT.display, size: s, weight: 700 }),
    maxWidth: CARD.inner,
    max: titleSize,
    min: 48,
  });
  drawText(ctx, title, {
    x: CARD.pad,
    y: cursor,
    family: FONT.display,
    size,
    weight: 700,
    color: theme.text,
  });
  cursor += size * 1.02;

  if (sub) {
    drawText(ctx, sub, {
      x: CARD.pad,
      y: cursor + 14,
      family: FONT.sans,
      size: 28,
      color: theme.sub,
    });
  }
  return cursor;
}

function drawRule(ctx, y, theme) {
  drawFadeRule(ctx, CARD.pad, y, CARD.inner, 4, theme.accent);
}

/**
 * Evenly spaced value/label pairs across the card's inner width.
 *
 * A big number (a million kg of lifetime volume) would otherwise overflow its
 * column, so the whole row shrinks to the largest size that fits every value —
 * one shared size, so the row still reads as a set rather than ransom-note
 * typography. Labels shrink too, since "Volume (lbs)" is wider than "Sets".
 */
function drawStats(ctx, y, items, theme, valueSize = 60) {
  const cols = columns(items.length);
  const gutter = 40; // keeps a wide value (1,284,000) clear of the next column

  const size = Math.min(
    ...items.map((item, i) =>
      fitFontSize({
        measure: (s) => measureText(ctx, item.value, { family: FONT.mono, size: s, weight: 500 }),
        maxWidth: cols[i].width - gutter,
        max: valueSize,
        min: 28,
      })
    )
  );

  const labelSize = Math.min(
    ...items.map((item, i) =>
      fitFontSize({
        measure: (s) => measureText(ctx, item.label, { family: FONT.sans, size: s, weight: 400 }),
        maxWidth: cols[i].width - gutter,
        max: 26,
        min: 18,
      })
    )
  );

  items.forEach((item, i) => {
    drawText(ctx, item.value, {
      x: cols[i].x,
      y,
      family: FONT.mono,
      size,
      weight: 500,
      color: theme.text,
    });
    drawText(ctx, item.label, {
      x: cols[i].x,
      y: y + valueSize + 14,
      family: FONT.sans,
      size: labelSize,
      color: theme.sub,
    });
  });
}

function drawFooter(ctx, { theme, left, leftAccent, tagline = TAGLINE, y = 948 }) {
  if (left) {
    drawText(ctx, left, {
      x: CARD.pad,
      y: y + 10,
      family: FONT.mono,
      size: 40,
      weight: 500,
      color: leftAccent ? theme.accent : theme.text,
    });
  }
  drawText(ctx, tagline, {
    x: CARD.size - CARD.pad,
    y: y + 14,
    family: FONT.display,
    size: 36,
    weight: 600,
    italic: true,
    color: theme.sub,
    align: 'right',
  });
}

// ── Cards ───────────────────────────────────────────────────────────────────

export function drawWorkoutCard(ctx, data, theme = DEFAULT_THEME) {
  const d = data ?? {};
  const unit = d.unit ?? 'kg';
  const ulabel = unitLabel(unit);

  drawBackground(ctx, theme);
  drawHeader(ctx, { theme, right: d.athlete, subRight: formatShareDate(d.date) });

  drawHeadline(ctx, {
    theme,
    title: d.name || 'Workout',
    y: 420,
    titleSize: 100,
  });

  const muscles = muscleLine(d.muscles);
  if (muscles) {
    drawText(ctx, muscles.toUpperCase(), {
      x: CARD.pad,
      y: 548,
      family: FONT.sans,
      size: 30,
      tracking: 3,
      color: theme.sub,
    });
  }

  drawRule(ctx, 604, theme);
  drawStats(
    ctx,
    660,
    [
      { value: groupNumber(toDisplay(d.totalVolume ?? 0, unit)), label: `Volume (${ulabel})` },
      { value: String(d.totalSets ?? 0), label: 'Sets' },
      { value: formatDuration(d.duration), label: 'Duration' },
    ],
    theme
  );

  if (d.pr) {
    const prValue = Math.round(toDisplay(d.pr.value, unit) * 10) / 10;
    const label = `PR · ${d.pr.exercise ? `${d.pr.exercise} ` : ''}${prValue} ${ulabel}`;
    drawPill(ctx, label, {
      x: CARD.pad,
      y: 812,
      fill: theme.accent,
      color: '#111010',
    });
  }

  const xp = d.xpEarned > 0 ? `  +${groupNumber(d.xpEarned)} XP` : '';
  drawFooter(ctx, { theme, left: `LVL ${d.level ?? 1}${xp}` });
}

export function drawProfileCard(ctx, data, theme = DEFAULT_THEME) {
  const d = data ?? {};
  const stats = d.stats ?? [];

  drawBackground(ctx, theme);
  drawHeader(ctx, { theme, right: d.name || 'ATHLETE', prestige: d.prestige ?? 0 });

  drawHeadline(ctx, {
    theme,
    eyebrow: `LEVEL ${d.level ?? 1}`,
    title: d.title || 'First Rep',
    y: 350,
    titleSize: 104,
  });

  drawRule(ctx, 560, theme);

  // Character radar axes, as labelled meters.
  const labelWidth = 280;
  const barX = CARD.pad + labelWidth + 20;
  const barWidth = CARD.size - CARD.pad - barX;
  stats.slice(0, 5).forEach((s, i) => {
    const y = 604 + i * 36;
    drawText(ctx, s.axis, {
      x: CARD.pad,
      y: y + 8,
      family: FONT.sans,
      size: 28,
      color: theme.sub,
      baseline: 'middle',
    });
    fillRoundRect(ctx, barX, y, barWidth, 16, 8, theme.sub, 0.25);

    const pct = Math.max(0, Math.min(100, Number(s.value) || 0));
    const w = (barWidth * pct) / 100;
    if (w > 0) fillRoundRect(ctx, barX, y, w, 16, 8, theme.accent);
  });

  drawStats(
    ctx,
    814,
    [
      { value: String(d.workouts ?? 0), label: 'Workouts' },
      { value: String(d.streak ?? 0), label: 'Day streak' },
      { value: groupNumber(d.totalXp ?? 0), label: 'Total XP' },
    ],
    theme,
    56
  );

  drawFooter(ctx, { theme, y: 948 });
}

export function drawRecapCard(ctx, data, theme = DEFAULT_THEME) {
  const d = data ?? {};
  const unit = d.unit ?? 'kg';
  const ulabel = unitLabel(unit);
  const sessions = d.sessions ?? 0;

  drawBackground(ctx, theme);
  drawHeader(ctx, { theme, right: d.name || 'ATHLETE' });

  drawHeadline(ctx, {
    theme,
    eyebrow: 'MY WEEK',
    title: `${sessions} ${pluralize(sessions, 'session')}`,
    y: 400,
    titleSize: 104,
  });

  drawRule(ctx, 604, theme);
  drawStats(
    ctx,
    660,
    [
      { value: groupNumber(toDisplay(d.volumeKg ?? 0, unit)), label: `Volume (${ulabel})` },
      { value: String(d.sets ?? 0), label: 'Sets' },
      { value: String(d.prs ?? 0), label: 'PRs' },
    ],
    theme,
    64
  );

  if (d.topLift) {
    drawPill(ctx, `Top lift · ${d.topLift}`, {
      x: CARD.pad,
      y: 812,
      fill: theme.accent,
      color: '#111010',
    });
  }

  drawFooter(ctx, {
    theme,
    left: d.xp > 0 ? `+${groupNumber(d.xp)} XP` : '',
    leftAccent: true,
  });
}

export function drawChallengeCard(ctx, data, theme = DEFAULT_THEME) {
  const d = data ?? {};
  const unit = d.unit ?? 'kg';
  const ulabel = unitLabel(unit);

  drawBackground(ctx, theme);
  drawHeader(ctx, { theme, right: d.name || 'ATHLETE' });

  drawHeadline(ctx, {
    theme,
    eyebrow: `LEVEL ${d.level ?? 1} · ${d.title || 'First Rep'}`,
    title: 'Beat my numbers.',
    y: 380,
    titleSize: 116,
  });

  drawRule(ctx, 604, theme);
  drawStats(
    ctx,
    660,
    [
      { value: String(d.workouts ?? 0), label: 'Workouts' },
      { value: groupNumber(toDisplay(d.volumeKg ?? 0, unit)), label: `Volume (${ulabel})` },
      { value: String(d.bestStreak ?? 0), label: 'Best streak' },
    ],
    theme
  );

  drawFooter(ctx, { theme, tagline: 'Think you can take me? Build your masterpiece.' });
}

export function drawWrappedCard(ctx, data, theme = DEFAULT_THEME) {
  const d = data ?? {};
  const unit = d.unit ?? 'kg';
  const ulabel = unitLabel(unit);
  const sessions = d.sessions ?? 0;

  drawBackground(ctx, theme);
  drawHeader(ctx, { theme, right: d.name || 'ATHLETE' });

  drawHeadline(ctx, {
    theme,
    eyebrow: `WRAPPED · ${(d.label || '').toUpperCase()}`,
    title: `${groupNumber(toDisplay(d.volumeKg ?? 0, unit))} ${ulabel}`,
    y: 300,
    titleSize: 104,
    sub: `lifted across ${sessions} ${pluralize(sessions, 'session')}`,
  });

  const bars = sparkBars((d.series ?? []).slice(-16), {
    x: CARD.pad,
    y: 520,
    width: CARD.inner,
    height: 90,
  });
  for (const b of bars) {
    fillRoundRect(ctx, b.x, b.y, b.width, b.height, 4, theme.accent, b.alpha);
  }

  drawRule(ctx, 650, theme);
  drawStats(
    ctx,
    700,
    [
      { value: String(d.sets ?? 0), label: 'Sets' },
      { value: String(d.prs ?? 0), label: 'PRs' },
      { value: `${Math.round(d.hours ?? 0)}h`, label: 'Trained' },
    ],
    theme,
    56
  );

  let pillX = CARD.pad;
  if (d.topLift) {
    pillX += drawPill(ctx, `Top lift · ${d.topLift}`, {
      x: pillX,
      y: 838,
      size: 28,
      height: 60,
      padX: 28,
      fill: theme.accent,
      color: '#111010',
    }) + 14;
  }
  if (d.busiestDay) {
    drawPill(ctx, `Busiest · ${d.busiestDay}`, {
      x: pillX,
      y: 838,
      size: 28,
      height: 60,
      padX: 28,
      border: theme.sub,
      color: theme.text,
    });
  }

  drawFooter(ctx, {
    theme,
    left: d.xp > 0 ? `+${groupNumber(d.xp)} XP` : '',
    leftAccent: true,
    tagline: TAGLINE,
    y: 954,
  });
}

/** Card kinds, keyed by the string consumers pass to <ShareButton kind="…" />. */
export const CARD_RENDERERS = {
  workout: drawWorkoutCard,
  profile: drawProfileCard,
  recap: drawRecapCard,
  challenge: drawChallengeCard,
  wrapped: drawWrappedCard,
};
