import { useState } from 'react';
import OpusMark from '../logo/OpusMark.jsx';
import { InkButton, PaperCard, Seal } from '../ink/index.js';
import SkyBackdrop from './SkyBackdrop.jsx';
import '../../styles/ink-system.css';
import useUserStore from '../../store/userStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { logBodyStat } from '../../utils/healthActions.js';
import { unitLabel } from '../../utils/units.js';
import { todayKey } from '../../utils/dateKey.js';
import { defaultBar, parseAge, parseBar, parseBodyweight, parseHeight } from '../../utils/profileFields.js';
import { useExercises } from '../../hooks/useExercises.js';
import { createWeek as saveWeek, ROUTINE_SOURCE } from '../../utils/templateActions.js';
import useUIStore from '../../store/uiStore.js';
import { makeRng } from '../../utils/routineGenerator.js';
import { planWeek, SPLIT_LIST } from '../../utils/weekPlanner.js';
import { requestPersistence } from '../../utils/storage.js';

const SEXES = ['Male', 'Female', 'Other'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const toAppDow = (d) => (d === 7 ? 0 : d); // planner 1=Mon…7=Sun → app 0=Sun…6=Sat

export default function Onboarding() {
  const updateProfile = useUserStore((s) => s.updateProfile);
  const setBarWeight = useSettingsStore((s) => s.setBarWeight);
  const setUnit = useSettingsStore((s) => s.setUnit);
  const markOnboarded = useSettingsStore((s) => s.completeOnboarding);
  const allExercises = useExercises();

  // Second (and best) chance to secure the database: browsers grant persistent
  // storage far more readily once the origin has real engagement, so we ask
  // again here rather than relying only on the quiet startup attempt.
  function completeOnboarding() {
    requestPersistence();
    markOnboarded();
  }

  const [step, setStep] = useState(0);
  const [unit, setUnitLocal] = useState('kg');
  const [name, setName] = useState('');
  const [bodyweight, setBodyweight] = useState('');
  const [height, setHeight] = useState('');
  const [sex, setSex] = useState(null);
  const [age, setAge] = useState('');
  const [bar, setBar] = useState(String(defaultBar('kg')));

  // Week-plan step
  const [splitKey, setSplitKey] = useState('ppl');
  const [days, setDays] = useState(6);
  const [level, setLevel] = useState('intermediate');
  const [busy, setBusy] = useState(false);
  const split = SPLIT_LIST.find((s) => s.key === splitKey);

  const lbl = unitLabel(unit);

  // The bar field is in the chosen unit. Switching to lbs left it at "20" —
  // saved as a 20 lb (9 kg) bar, so every plate calculation was wrong — unless
  // you noticed and retyped it. An untouched default follows the unit; a value
  // you typed yourself is left alone.
  function pickUnit(u) {
    if (u === unit) return;
    if (bar.trim() === '' || Number(bar) === defaultBar(unit)) setBar(String(defaultBar(u)));
    setUnitLocal(u);
  }

  async function saveProfile() {
    setUnit(unit);
    const ageField = parseAge(age);
    const heightField = parseHeight(height);
    await updateProfile({
      name: name.trim(),
      height: heightField.ok ? heightField.value : null,
      sex,
      birthYear: ageField.ok ? ageField.value : null,
    });
    const weight = parseBodyweight(bodyweight, unit);
    if (weight.ok) {
      // Today on the local calendar — the UTC date was "yesterday" for an
      // early-morning sign-up east of Greenwich.
      await logBodyStat({ date: todayKey(), weight: weight.value });
    }
    // A cleared or nonsense bar field means "the usual bar", never 0 kg.
    const barField = parseBar(bar, unit);
    setBarWeight(barField.ok ? barField.value : parseBar('', unit).value);
  }

  async function begin() {
    await saveProfile();
    setStep(1); // move to the optional "plan your week" step
  }

  function pickSplit(key) {
    const s = SPLIT_LIST.find((x) => x.key === key);
    setSplitKey(key);
    if (s && !s.days.includes(days)) setDays(s.days[s.days.length - 1]);
  }

  async function createWeek() {
    if (busy) return;
    setBusy(true);
    try {
      const week = planWeek({ split: splitKey, days, level, sessionMinutes: 60, rest: 'standard', exercises: allExercises, rng: makeRng(Date.now()) });
      // One transaction, tagged like Plan week's output: a failure part-way
      // can't leave half a week behind.
      await saveWeek(week.map((d) => ({ ...d, dayOfWeek: toAppDow(d.dayOfWeek) })), { source: ROUTINE_SOURCE.plan });
      completeOnboarding();
    } catch (e) {
      console.error('Plan week failed:', e);
      useUIStore.getState().showToast('Could not build the week — try again, or skip for now.', { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (step === 1) {
    return (
      <div data-testid="first-run-overlay" className="sy-stage z-[55]">
        <SkyBackdrop />
        <div className="sy-scroll">
          <PaperCard className="sy-card sy-card--enter" seal={<Seal kanji="練" size={36} rotate={4} />}>
            <h1 className="sy-title">Plan your week</h1>
            <p className="sy-sub">Pick a split and we'll build a full week of routines — fully editable after.</p>
            <div className="mt-4 flex flex-col gap-2">
              {SPLIT_LIST.map((s) => (
                <button key={s.key} type="button" onClick={() => pickSplit(s.key)} aria-pressed={s.key === splitKey} className="sy-option">
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{s.label}</span>
                    <span className="font-mono text-xs">{s.days.join('/')}d</span>
                  </span>
                  <small>{s.blurb}</small>
                </button>
              ))}
            </div>

            <span className="sy-label">Days per week</span>
            <div className="sy-seg">
              {split.days.map((d) => (
                <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d}>{d} days</button>
              ))}
            </div>

            <span className="sy-label">Experience</span>
            <div className="sy-seg">
              {LEVELS.map((l) => (
                <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={level === l}>{l}</button>
              ))}
            </div>

            <InkButton block className="mt-6" onClick={createWeek} disabled={busy}>Create my week</InkButton>
            <button type="button" onClick={completeOnboarding} className="sy-quiet mt-1">Skip for now</button>
          </PaperCard>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="first-run-overlay" className="sy-stage z-[55]">
      <SkyBackdrop />
      <div className="sy-scroll">
        <div className="sy-brand">
          <OpusMark size={64} animate />
        </div>
        <PaperCard className="sy-card sy-card--enter" seal={<Seal kanji="初" size={36} rotate={4} />}>
          <h1 className="sy-title">Welcome to OPUS</h1>
          <p className="sy-sub">Set up your character.</p>

          {/* Units */}
          <span className="sy-label">Units</span>
          <div className="sy-seg">
            {['kg', 'lbs'].map((u) => (
              <button key={u} type="button" onClick={() => pickUnit(u)} aria-pressed={unit === u}>{u}</button>
            ))}
          </div>

          <label htmlFor="onb-name" className="sy-label">Your name</label>
          <input id="onb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Athlete" className="sy-field" />

          <div className="sy-row">
            <div>
              <label htmlFor="onb-weight" className="sy-label">Bodyweight ({lbl})</label>
              <input id="onb-weight" value={bodyweight} onChange={(e) => setBodyweight(e.target.value)} type="number" inputMode="decimal" min="0" className="sy-field font-mono" />
            </div>
            <div>
              <label htmlFor="onb-height" className="sy-label">Height (cm)</label>
              <input id="onb-height" value={height} onChange={(e) => setHeight(e.target.value)} type="number" inputMode="decimal" min="100" max="250" className="sy-field font-mono" />
            </div>
          </div>

          <div className="sy-row">
            <div>
              <label htmlFor="onb-age" className="sy-label">Age</label>
              <input id="onb-age" value={age} onChange={(e) => setAge(e.target.value)} type="number" inputMode="numeric" min="13" max="100" className="sy-field font-mono" />
            </div>
            <div>
              <span className="sy-label">Sex</span>
              {/* A second tap clears it: once picked, "prefer not to say" used to
                  be impossible to get back to. */}
              <div className="sy-seg">
                {SEXES.map((s) => (
                  <button key={s} type="button" onClick={() => setSex(sex === s ? null : s)} aria-pressed={sex === s} aria-label={s}>{s[0]}</button>
                ))}
              </div>
            </div>
          </div>

          <label htmlFor="onb-bar" className="sy-label">Empty barbell weight ({lbl}) — for plate math</label>
          <input id="onb-bar" value={bar} onChange={(e) => setBar(e.target.value)} type="number" inputMode="decimal" min="0" placeholder={String(defaultBar(unit))} className="sy-field font-mono" />

          <InkButton block className="mt-6" onClick={begin}>Begin</InkButton>
        </PaperCard>
      </div>
    </div>
  );
}
