import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Youtube, Star, Pencil, SearchX } from 'lucide-react';
import { useExercise, useExerciseNote } from '../hooks/useExercises.js';
import { usePRs, useExerciseVolume, useExerciseOneRepMax, useExerciseBestOneRepMax } from '../hooks/useProgress.js';
import { E1RM_MAX_REPS } from '../utils/oneRepMax.js';
import { friendlyDate } from '../utils/dateKey.js';
import { deleteCustomExercise, restoreCustomExercise, toggleFavorite, setExerciseColor } from '../utils/exerciseActions.js';
import { deleteWithUndo } from '../utils/undoable.js';
import { setExerciseNote } from '../utils/noteActions.js';
import { findDemoImage } from '../utils/exerciseDemo.js';
import { toDisplay, unitLabel } from '../utils/units.js';
import useSettingsStore from '../store/settingsStore.js';
import VolumeChart from '../components/charts/VolumeChart.jsx';
import TrendChart from '../components/charts/TrendChart.jsx';
import { InkButton, PaperCard, SectionLabel, Seal } from '../components/ink/index.js';
import FormStillLife from '../components/exercise/FormStillLife.jsx';
import { formKanji, muscleKanji } from '../utils/kanji.js';
import { MUSCLE_LABEL } from '../utils/muscleTargets.js';
import '../styles/ink-forms.css';
import ColorPicker from '../components/ui/ColorPicker.jsx';
import Modal from '../components/ui/Modal.jsx';
import ExerciseForm from '../components/exercise/ExerciseForm.jsx';
import ExerciseHistory from '../components/exercise/ExerciseHistory.jsx';
import BackButton from '../components/layout/BackButton.jsx';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// The record plaque: the best set as the headline mark, the three records under it.
function RecordPlaque({ prs, unit }) {
  const weight = prs.find((p) => p.type === 'weight');
  const reps = prs.find((p) => p.type === 'reps');
  const volume = prs.find((p) => p.type === 'volume');
  const u = unitLabel(unit);

  if (!weight && !reps && !volume) {
    return (
      <div className="forms-plaque" style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--mute-2)' }}>
          No records yet. Log a set to start tracking.
        </p>
      </div>
    );
  }
  const fresh = prs.some((p) => p.achievedAt && Date.now() - p.achievedAt < WEEK_MS);
  const headline = weight ? toDisplay(weight.value, unit) : reps?.value;
  const headUnit = weight ? u : 'reps';

  return (
    <section className="forms-plaque" aria-label="Personal Records">
      <SectionLabel>Personal Records</SectionLabel>
      <div className="forms-plaque__top">
        <span className="forms-plaque__mark">
          {Math.round(headline * 10) / 10}
          <span className="forms-plaque__unit">{headUnit}</span>
        </span>
        {fresh && <Seal kanji="新" size={34} rotate={4} stamp label="New record this week" />}
      </div>
      <div className="forms-plaque__grid">
        {weight && (
          <span><span className="forms-plaque__k">Best weight</span><span className="forms-plaque__v">{toDisplay(weight.value, unit)} {u}</span></span>
        )}
        {reps && (
          <span><span className="forms-plaque__k">Best reps</span><span className="forms-plaque__v">{reps.value} reps</span></span>
        )}
        {volume && (
          <span><span className="forms-plaque__k">Best volume</span><span className="forms-plaque__v">{toDisplay(volume.value, unit)} {u}</span></span>
        )}
      </div>
    </section>
  );
}

export default function ExerciseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exerciseId = Number(id);
  // undefined while loading; null when there's no such exercise (deleted, or
  // a stale link — Android's back button after deleting lands here).
  const exercise = useExercise(exerciseId);
  const prs = usePRs(exerciseId);
  const volumeRaw = useExerciseVolume(exerciseId);
  const e1rmRaw = useExerciseOneRepMax(exerciseId);
  const note = useExerciseNote(exerciseId);
  const unit = useSettingsStore((s) => s.unit);
  const volume = volumeRaw.map((d) => ({ label: d.label, volume: Math.round(toDisplay(d.volume, unit)) }));
  const e1rm = e1rmRaw.map((d) => ({ label: d.label, value: Math.round(toDisplay(d.value, unit)) }));
  // All-time, not "the best of the last ten sessions" the chart happens to show
  // — an old peak should not quietly disappear once it scrolls off the chart.
  const bestE1rmRow = useExerciseBestOneRepMax(exerciseId);
  const bestE1rm = bestE1rmRow?.value ?? (e1rmRaw.length ? Math.max(...e1rmRaw.map((d) => d.value)) : 0);
  const [demoUrl, setDemoUrl] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  // "How to do it" picture from wger — best effort, silent when it can't.
  useEffect(() => {
    setDemoUrl(null);
    if (!exercise?.name) return;
    const ctrl = new AbortController();
    findDemoImage(exercise.name, { signal: ctrl.signal }).then((url) => {
      if (!ctrl.signal.aborted && url) setDemoUrl(url);
    });
    return () => ctrl.abort();
  }, [exercise?.name]);

  // Leave via the list, not history: going "back" from a dead link usually
  // means going back to the page that deleted it.
  const toList = () => navigate('/exercises', { replace: true });

  if (exercise === undefined) {
    return <div className="forms-empty">Loading…</div>;
  }

  if (exercise === null) {
    return (
      <div className="forms-detail">
        <BackButton onClick={toList} className="mb-5" />
        <PaperCard style={{ marginTop: 40, textAlign: 'center' }}>
          <SearchX size={28} style={{ color: 'var(--paper-ink-3)', margin: '0 auto' }} />
          <h1 style={{ margin: '12px 0 0', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--paper-ink-1)' }}>
            Exercise not found
          </h1>
          <p style={{ margin: '8px 0 20px', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--paper-ink-2)' }}>
            It may have been deleted. Your other exercises are all still there.
          </p>
          <InkButton onClick={toList}>Back to exercises</InkButton>
        </PaperCard>
      </div>
    );
  }

  const kanji = formKanji(exercise.name, exercise.muscleGroup);
  const muscleName = MUSCLE_LABEL[exercise.muscleGroup] ?? (exercise.muscleGroup ?? '').replace(/-/g, ' ');

  async function handleDelete() {
    const snapshot = await deleteWithUndo({
      label: exercise.name || 'Exercise',
      remove: () => deleteCustomExercise(exercise.id),
      restore: restoreCustomExercise,
      // Deleting from the detail page navigates away, so undoing has to bring
      // you back; otherwise the exercise returns and you are left staring at
      // a list wondering whether it worked.
      onUndo: () => navigate(`/exercises/${exercise.id}`),
    });
    if (snapshot) navigate('/exercises', { replace: true });
  }

  return (
    <div className="forms-detail">
      <BackButton fallback="/exercises" className="mb-5" />

      {/* Hero: ink still-life, the big form kanji writing on, name, equipment, muscles */}
      <PaperCard className="forms-hero" seal={<Seal kanji={muscleKanji(exercise.muscleGroup)} size={34} rotate={4} />}>
        <div className="forms-hero__tools">
          {exercise.isCustom && (
            <button type="button" onClick={() => setEditOpen(true)} className="forms-icon-btn" aria-label={`Edit ${exercise.name}`}>
              <Pencil size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleFavorite(exercise.id)}
            className="forms-icon-btn"
            aria-label="Toggle favorite"
            aria-pressed={Boolean(exercise.favorite)}
          >
            <Star size={18} fill={exercise.favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="forms-hero__art">
          <FormStillLife kanji={kanji} equipment={exercise.equipment} label={`${exercise.name}: the character ${kanji}`} fontSize={70} />
        </div>
        <h1>{exercise.name}</h1>
        <p className="forms-hero__meta">{muscleName} · {exercise.equipment}</p>
        <div className="forms-hero__tags">
          {exercise.difficulty && <span className="forms-tag">{exercise.difficulty}</span>}
          {exercise.isCustom && <span className="forms-tag forms-tag--custom">Custom</span>}
        </div>
      </PaperCard>

      <RecordPlaque prs={prs} unit={unit} />

      {/* Session-by-session history, the first thing you came here for. */}
      <div className="forms-section">
        <ExerciseHistory exerciseId={exercise.id} unit={unit} />
      </div>

      {/* Estimated 1RM */}
      {e1rmRaw.length > 0 && (
        <div className="forms-section">
          <SectionLabel rule>Estimated 1RM</SectionLabel>
          <div className="forms-panel">
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(toDisplay(bestE1rm, unit))} {unitLabel(unit)}
              <span style={{ marginLeft: 8, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 12, color: 'var(--mute-2)' }}>
                best{bestE1rmRow?.date ? ` · ${toDisplay(bestE1rmRow.weight, unit)}×${bestE1rmRow.reps} on ${friendlyDate(bestE1rmRow.date)}` : ''}
              </span>
            </p>
            <TrendChart data={e1rm} unit={unitLabel(unit)} empty="Log weighted sets to estimate." />
            <p style={{ marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--mute-2)' }}>
              Epley estimate from your best set of 1–{E1RM_MAX_REPS} reps each session; higher-rep sets overstate it.
            </p>
          </div>
        </div>
      )}

      {/* Volume history */}
      <div className="forms-section">
        <SectionLabel rule>Volume History</SectionLabel>
        <div className="forms-panel">
          <VolumeChart data={volume} unit={unitLabel(unit)} />
        </div>
      </div>

      {/* Coaching note + label colour */}
      <div className="forms-section">
        <SectionLabel rule>Coaching note</SectionLabel>
        <div className="forms-panel">
          <textarea
            key={note}
            defaultValue={note}
            onBlur={(e) => setExerciseNote(exercise.id, e.target.value)}
            placeholder="Cues you want every session, e.g. elbows tucked, brace, full ROM."
            aria-label="Coaching note"
            rows={2}
            className="forms-note"
          />
          <p className="forms-sublabel">Label colour</p>
          <ColorPicker value={exercise.color ?? null} onChange={(c) => setExerciseColor(exercise.id, c)} />
        </div>
      </div>

      {/* How to do it: always available via video; image when there is one */}
      <div className="forms-section">
        <SectionLabel rule>How to do it</SectionLabel>
        <div className="forms-panel">
          {demoUrl && (
            // The drawings are dark line art on transparent or white: they
            // need a light card under them to read on the dark ground.
            <div className="forms-demo anim-fade-in">
              <img src={demoUrl} alt={`${exercise.name} demo`} onError={() => setDemoUrl(null)} />
            </div>
          )}
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} proper form tutorial`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ink-btn ink-btn--secondary ink-btn--block"
          >
            <Youtube size={16} /> Watch how-to video
          </a>
        </div>
      </div>

      {exercise.isCustom && (
        <div className="forms-delete">
          <InkButton variant="secondary" block onClick={handleDelete}>
            <Trash2 size={15} /> Delete exercise
          </InkButton>
        </div>
      )}

      {exercise.isCustom && (
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Exercise">
          <ExerciseForm exercise={exercise} onSave={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
