// Native share cards — 1080×1080 export images rendered with plain RN views and
// captured by react-native-view-shot. One card per web counterpart
// (src/components/share/*). Each takes { data, theme, scale }; every dimension
// is multiplied by `scale` so the same component renders both the small live
// preview and the full-size capture. Base canvas is 1080.
import { View, Text } from 'react-native';
import { units, shareCard } from '@opus/core';
import { fonts } from '../../theme';

export const CARD_BASE = 1080;

const { toDisplay, unitLabel } = units;
const { formatDuration, formatShareDate, DEFAULT_THEME } = shareCard;

// ── shared primitives ────────────────────────────────────────────────────────

// Roundel + OPUS wordmark used in every card header.
function Brand({ theme, s, prestige = 0 }) {
  const ring = 60 * s;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: ring, height: ring, borderRadius: ring / 2, borderWidth: 4 * s,
          borderColor: theme.accent, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <View style={{ width: 18 * s, height: 18 * s, borderRadius: 9 * s, backgroundColor: theme.accent }} />
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 52 * s, letterSpacing: 8 * s, color: theme.text, marginLeft: 22 * s }}>
        OPUS
      </Text>
      {prestige > 0 && (
        <View style={{ flexDirection: 'row', marginLeft: 14 * s }}>
          {Array.from({ length: Math.min(prestige, 5) }, (_, i) => (
            <View key={i} style={{ width: 16 * s, height: 16 * s, backgroundColor: theme.accent, transform: [{ rotate: '45deg' }], marginLeft: i ? 8 * s : 0 }} />
          ))}
        </View>
      )}
    </View>
  );
}

// The accent rule under the hero — a two-segment bar approximating the web's
// left-to-right accent→transparent gradient.
function Divider({ theme, s }) {
  return (
    <View style={{ flexDirection: 'row', height: 4 * s, marginTop: 44 * s, marginBottom: 44 * s }}>
      <View style={{ flex: 2, backgroundColor: theme.accent }} />
      <View style={{ flex: 3, backgroundColor: theme.accent, opacity: 0.14 }} />
    </View>
  );
}

// One big-number stat in the metrics row.
function Stat({ theme, s, value, label, size = 60 }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: fonts.monoMedium, fontSize: size * s, color: theme.text, lineHeight: size * s }}>{value}</Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 26 * s, color: theme.sub, marginTop: 10 * s }}>{label}</Text>
    </View>
  );
}

function Pill({ theme, s, children, outline = false }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start', borderRadius: 9999,
        paddingHorizontal: 30 * s, paddingVertical: 15 * s,
        backgroundColor: outline ? 'transparent' : theme.accent,
        borderWidth: outline ? 2 * s : 0, borderColor: theme.sub,
      }}
    >
      <Text style={{ fontFamily: fonts.sansSemi, fontSize: 28 * s, color: outline ? theme.text : '#111010' }}>{children}</Text>
    </View>
  );
}

function Tagline({ theme, s, text = 'Build your masterpiece.', size = 36 }) {
  return (
    <Text style={{ fontFamily: fonts.displaySemi, fontStyle: 'italic', fontSize: size * s, color: theme.sub }}>{text}</Text>
  );
}

// Square frame wrapping every card at scaled 1080.
function Frame({ theme, s, children }) {
  return (
    <View style={{ width: CARD_BASE * s, height: CARD_BASE * s, backgroundColor: theme.bg, padding: 88 * s }}>
      {children}
    </View>
  );
}

const nfmt = (n) => Math.round(n || 0).toLocaleString();

// ── ShareableCard — a single finished workout ────────────────────────────────
export function ShareableCard({ data = {}, theme = DEFAULT_THEME, scale = 1 }) {
  const s = scale;
  const unit = data.unit ?? 'kg';
  const ulabel = unitLabel(unit);
  const muscles = (data.muscles ?? []).slice(0, 4).map((m) => String(m).replace(/-/g, ' ')).join('   ·   ');

  return (
    <Frame theme={theme} s={s}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand theme={theme} s={s} />
        <View style={{ alignItems: 'flex-end' }}>
          {!!data.athlete && <Text style={{ fontFamily: fonts.sansSemi, fontSize: 30 * s, color: theme.text }}>{data.athlete}</Text>}
          <Text style={{ fontFamily: fonts.mono, fontSize: 28 * s, color: theme.sub }}>{formatShareDate(data.date)}</Text>
        </View>
      </View>

      <View style={{ marginTop: 'auto' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 100 * s, lineHeight: 102 * s, color: theme.text }}>{data.name || 'Workout'}</Text>
        {!!muscles && (
          <Text style={{ fontFamily: fonts.sans, fontSize: 30 * s, letterSpacing: 3 * s, textTransform: 'uppercase', color: theme.sub, marginTop: 18 * s }}>{muscles}</Text>
        )}
      </View>

      <Divider theme={theme} s={s} />

      <View style={{ flexDirection: 'row' }}>
        <Stat theme={theme} s={s} value={nfmt(toDisplay(data.totalVolume ?? 0, unit))} label={`Volume (${ulabel})`} />
        <Stat theme={theme} s={s} value={String(data.totalSets ?? 0)} label="Sets" />
        <Stat theme={theme} s={s} value={formatDuration(data.duration)} label="Duration" />
      </View>

      {!!data.pr && (
        <View style={{ marginTop: 48 * s }}>
          <Pill theme={theme} s={s}>
            PR · {data.pr.exercise ? `${data.pr.exercise} ` : ''}{Math.round(toDisplay(data.pr.value, unit) * 10) / 10} {ulabel}
          </Pill>
        </View>
      )}

      <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: fonts.monoMedium, fontSize: 40 * s, color: theme.text }}>LVL {data.level ?? 1}</Text>
          {data.xpEarned > 0 && (
            <Text style={{ fontFamily: fonts.monoMedium, fontSize: 40 * s, color: theme.accent, marginLeft: 18 * s }}>+{data.xpEarned} XP</Text>
          )}
        </View>
        <Tagline theme={theme} s={s} />
      </View>
    </Frame>
  );
}

// ── ProfileCard — identity, level, character stats, totals ───────────────────
export function ProfileCard({ data = {}, theme = DEFAULT_THEME, scale = 1 }) {
  const s = scale;
  const stats = data.stats ?? [];
  return (
    <Frame theme={theme} s={s}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand theme={theme} s={s} prestige={data.prestige} />
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 30 * s, color: theme.text }}>{data.name || 'ATHLETE'}</Text>
      </View>

      <View style={{ marginTop: 'auto' }}>
        <Text style={{ fontFamily: fonts.monoMedium, fontSize: 40 * s, letterSpacing: 2 * s, color: theme.accent }}>LEVEL {data.level ?? 1}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 104 * s, lineHeight: 106 * s, color: theme.text, marginTop: 6 * s }}>{data.title || 'First Rep'}</Text>
      </View>

      <Divider theme={theme} s={s} />

      <View style={{ gap: 20 * s }}>
        {stats.map((st) => (
          <View key={st.axis} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ width: 280 * s, fontFamily: fonts.sans, fontSize: 28 * s, color: theme.sub }}>{st.axis}</Text>
            <View style={{ flex: 1, height: 16 * s, borderRadius: 9999, backgroundColor: 'rgba(138,135,128,0.25)', overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(0, Math.min(100, st.value))}%`, height: '100%', backgroundColor: theme.accent, borderRadius: 9999 }} />
            </View>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 'auto', flexDirection: 'row' }}>
        <Stat theme={theme} s={s} size={56} value={String(data.workouts ?? 0)} label="Workouts" />
        <Stat theme={theme} s={s} size={56} value={String(data.streak ?? 0)} label="Day streak" />
        <Stat theme={theme} s={s} size={56} value={nfmt(data.totalXp)} label="Total XP" />
      </View>

      <View style={{ marginTop: 56 * s, alignItems: 'flex-end' }}>
        <Tagline theme={theme} s={s} />
      </View>
    </Frame>
  );
}

// ── ChallengeCard — "beat my numbers" ────────────────────────────────────────
export function ChallengeCard({ data = {}, theme = DEFAULT_THEME, scale = 1 }) {
  const s = scale;
  const unit = data.unit ?? 'kg';
  const ulabel = unitLabel(unit);
  return (
    <Frame theme={theme} s={s}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand theme={theme} s={s} />
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 30 * s, color: theme.text }}>{data.name || 'ATHLETE'}</Text>
      </View>

      <View style={{ marginTop: 'auto' }}>
        <Text style={{ fontFamily: fonts.monoMedium, fontSize: 38 * s, letterSpacing: 2 * s, color: theme.accent }}>LEVEL {data.level ?? 1} · {data.title || 'First Rep'}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 116 * s, lineHeight: 116 * s, color: theme.text, marginTop: 8 * s }}>Beat my numbers.</Text>
      </View>

      <Divider theme={theme} s={s} />

      <View style={{ flexDirection: 'row' }}>
        <Stat theme={theme} s={s} value={String(data.workouts ?? 0)} label="Workouts" />
        <Stat theme={theme} s={s} value={nfmt(toDisplay(data.volumeKg ?? 0, unit))} label={`Volume (${ulabel})`} />
        <Stat theme={theme} s={s} value={String(data.bestStreak ?? 0)} label="Best streak" />
      </View>

      <View style={{ marginTop: 'auto', alignItems: 'flex-end' }}>
        <Tagline theme={theme} s={s} text="Think you can take me? Build your masterpiece." size={34} />
      </View>
    </Frame>
  );
}

// ── WrappedCard — a month/year recap ─────────────────────────────────────────
export function WrappedCard({ data = {}, theme = DEFAULT_THEME, scale = 1 }) {
  const s = scale;
  const unit = data.unit ?? 'kg';
  const ulabel = unitLabel(unit);
  const series = (data.series ?? []).slice(-16);
  const peak = series.length ? Math.max(...series, 1) : 1;

  return (
    <Frame theme={theme} s={s}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand theme={theme} s={s} />
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 30 * s, color: theme.text }}>{data.name || 'ATHLETE'}</Text>
      </View>

      <View style={{ marginTop: 'auto' }}>
        <Text style={{ fontFamily: fonts.monoMedium, fontSize: 38 * s, letterSpacing: 2 * s, color: theme.accent }}>WRAPPED · {(data.label || '').toUpperCase()}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 104 * s, lineHeight: 106 * s, color: theme.text, marginTop: 6 * s }}>{nfmt(toDisplay(data.volumeKg ?? 0, unit))} {ulabel}</Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 28 * s, color: theme.sub, marginTop: 6 * s }}>lifted across {data.sessions ?? 0} {data.sessions === 1 ? 'session' : 'sessions'}</Text>
      </View>

      {series.length > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90 * s, marginTop: 36 * s }}>
          {series.map((v, i) => (
            <View
              key={i}
              style={{
                flex: 1, marginLeft: i ? 6 * s : 0,
                height: Math.max(6 * s, (v / peak) * 90 * s),
                backgroundColor: theme.accent, borderRadius: 4 * s,
                opacity: 0.55 + 0.45 * (v / peak),
              }}
            />
          ))}
        </View>
      )}

      <Divider theme={theme} s={s} />

      <View style={{ flexDirection: 'row' }}>
        <Stat theme={theme} s={s} size={56} value={String(data.sets ?? 0)} label="Sets" />
        <Stat theme={theme} s={s} size={56} value={String(data.prs ?? 0)} label="PRs" />
        <Stat theme={theme} s={s} size={56} value={`${Math.round(data.hours ?? 0)}h`} label="Trained" />
      </View>

      <View style={{ marginTop: 40 * s, flexDirection: 'row', flexWrap: 'wrap', gap: 14 * s }}>
        {!!data.topLift && <Pill theme={theme} s={s}>Top lift · {data.topLift}</Pill>}
        {!!data.busiestDay && <Pill theme={theme} s={s} outline>Busiest · {data.busiestDay}</Pill>}
      </View>

      <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {data.xp > 0 ? (
          <Text style={{ fontFamily: fonts.monoMedium, fontSize: 40 * s, color: theme.accent }}>+{nfmt(data.xp)} XP</Text>
        ) : <View />}
        <Tagline theme={theme} s={s} size={34} />
      </View>
    </Frame>
  );
}

// ── RecapCard — the current week ─────────────────────────────────────────────
export function RecapCard({ data = {}, theme = DEFAULT_THEME, scale = 1 }) {
  const s = scale;
  const unit = data.unit ?? 'kg';
  const ulabel = unitLabel(unit);
  return (
    <Frame theme={theme} s={s}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand theme={theme} s={s} />
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 30 * s, color: theme.text }}>{data.name || 'ATHLETE'}</Text>
      </View>

      <View style={{ marginTop: 'auto' }}>
        <Text style={{ fontFamily: fonts.monoMedium, fontSize: 38 * s, letterSpacing: 2 * s, color: theme.accent }}>MY WEEK</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 104 * s, lineHeight: 106 * s, color: theme.text, marginTop: 6 * s }}>{data.sessions ?? 0} {data.sessions === 1 ? 'session' : 'sessions'}</Text>
      </View>

      <Divider theme={theme} s={s} />

      <View style={{ flexDirection: 'row' }}>
        <Stat theme={theme} s={s} size={64} value={nfmt(toDisplay(data.volumeKg ?? 0, unit))} label={`Volume (${ulabel})`} />
        <Stat theme={theme} s={s} size={64} value={String(data.sets ?? 0)} label="Sets" />
        <Stat theme={theme} s={s} size={64} value={String(data.prs ?? 0)} label="PRs" />
      </View>

      {!!data.topLift && (
        <View style={{ marginTop: 48 * s }}>
          <Pill theme={theme} s={s}>Top lift · {data.topLift}</Pill>
        </View>
      )}

      <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {data.xp > 0 ? (
          <Text style={{ fontFamily: fonts.monoMedium, fontSize: 44 * s, color: theme.accent }}>+{nfmt(data.xp)} XP</Text>
        ) : <View />}
        <Tagline theme={theme} s={s} />
      </View>
    </Frame>
  );
}

// Registry so ShareSheet / callers can pick a card by key.
export const CARDS = {
  workout: ShareableCard,
  profile: ProfileCard,
  challenge: ChallengeCard,
  wrapped: WrappedCard,
  recap: RecapCard,
};
