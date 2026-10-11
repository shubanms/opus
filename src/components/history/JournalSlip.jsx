import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkPlus, ChevronDown, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { AnimatePresence, m, SPRING, TWEEN } from '../../motion/index.jsx';
import { formatDuration } from '../../utils/duration.js';
import { useWorkoutDetail, useShareData } from '../../hooks/useWorkout.js';
import { deleteWorkout, restoreWorkout } from '../../utils/workoutActions.js';
import { saveWorkoutAsRoutine } from '../../utils/templateActions.js';
import { leavesSessionEmpty } from '../../utils/historyMath.js';
import { deleteWithUndo } from '../../utils/undoable.js';
import { confirmReplaceSession } from '../../utils/sessionGuard.js';
import { fmtVolume, toDisplay } from '../../utils/units.js';
import { avgRest, avgRestAcross, formatRest } from '../../utils/restStats.js';
import { workoutCalories } from '../../utils/calories.js';
import { friendlyDate, shortDate } from '../../utils/dateKey.js';
import { toKanjiDate, UI_KANJI } from '../../utils/kanji.js';
import { playChime } from '../../utils/sound.js';
import ShareButton from '../share/ShareButton.jsx';
import SetEditSheet from './SetEditSheet.jsx';
import WorkoutDetailsEditor from './WorkoutDetailsEditor.jsx';
import { PaperCard, Seal } from '../ink/index.js';
import useWorkoutStore from '../../store/workoutStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import useUIStore from '../../store/uiStore.js';
import '../../styles/ink-journal.css';

// One past session in the Journal, as a paper slip on the timeline. Same
// behaviour as the card it replaces on this page (expand, correct a set, add a
// set, repeat, save as routine, edit details, share, delete with undo); the
// seal on the corner appears only when a record fell in that session.

function setLabel(s, unit) {
  if (s.isCardio) {
    const min = Math.round((s.durationSec || 0) / 60);
    return s.distanceKm ? `${min}′ · ${Number(s.distanceKm).toFixed(1)}km` : `${min} min`;
  }
  return s.weight > 0 ? `${toDisplay(s.weight, unit)}×${s.reps}` : `${s.reps} reps`;
}

function SetChip({ s, unit, onEdit }) {
  const record = s.isRecord;
  return (
    <m.button
      type="button"
      layout
      transition={SPRING.layout}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      whileTap={{ scale: 0.94 }}
      onClick={() => onEdit(s)}
      aria-label={`${s.isWarmup ? 'Warm-up' : 'Set'} ${s.setNumber}: ${setLabel(s, unit)}${record ? ', holds a record' : ''}. Edit`}
      className={`jr-chip ${record ? 'jr-chip--rec' : ''} ${s.isWarmup ? 'jr-chip--warm' : ''}`}
    >
      {setLabel(s, unit)}
    </m.button>
  );
}

export default function JournalSlip({ workout, hasRecord = false }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(null);
  const [details, setDetails] = useState(false);
  const navigate = useNavigate();
  const repeatWorkout = useWorkoutStore((s) => s.repeatWorkout);
  const unit = useSettingsStore((s) => s.unit);

  const detail = useWorkoutDetail(expanded ? workout.id : null);
  const shareData = useShareData(expanded ? workout.id : null);
  const tags = workout.tags ?? [];
  const kcal = workoutCalories(workout);
  const sessionLabel = `${workout.name || 'Workout'} · ${shortDate(workout.date)}`;
  const allSets = detail.flatMap((ex) => ex.sets);
  const editSet = (ex) => (set) =>
    setEditing({ mode: 'edit', set, exercise: ex, sessionLabel, lastOfSession: leavesSessionEmpty(set, allSets) });

  async function handleRepeat(e) {
    e.stopPropagation();
    if (!(await confirmReplaceSession(`“${workout.name || 'Workout'}” again`))) return;
    await repeatWorkout(workout.id);
    navigate('/workout');
  }

  async function handleDelete(e) {
    e.stopPropagation();
    await deleteWithUndo({
      label: sessionLabel,
      remove: () => deleteWorkout(workout.id),
      restore: restoreWorkout,
    });
  }

  async function handleSaveRoutine() {
    const name = await useUIStore.getState().prompt({
      title: 'Save as routine',
      message: 'The lifts in this session, with its sets, reps and top weights as targets.',
      placeholder: 'Routine name',
      defaultValue: workout.name || 'Routine',
    });
    if (name == null) return;
    // `autoKey: null` — a routine saved from history is always a new one.
    const saved = await saveWorkoutAsRoutine({
      name: name.trim() || workout.name || 'Routine',
      autoKey: null,
      workout: { exercises: detail.map((ex) => ({ exerciseId: ex.exerciseId, sets: ex.sets })) },
    });
    if (!saved) return;
    playChime('success');
    useUIStore.getState().showToast(`Saved “${saved}” to Routines`, {
      type: 'success',
      action: { label: 'View', onAction: () => navigate('/templates') },
    });
  }

  const kanjiDate = toKanjiDate(workout.date);
  // Name first, then XP: the control reads as the session, like the card it replaces.
  const headLabel = `${workout.name || "Workout"}${workout.xpEarned > 0 ? ` +${workout.xpEarned} XP` : ""}, ${friendlyDate(workout.date)}, ${workout.totalSets} sets`;
  const facts = [
    workout.totalVolume > 0 ? fmtVolume(workout.totalVolume, unit) : null,
    `${workout.totalSets} sets`,
    formatDuration(workout.duration),
    kcal > 0 ? `${kcal} kcal` : null,
  ].filter(Boolean);

  return (
    <PaperCard
      className="jr-slip"
      seal={hasRecord ? <Seal kanji={UI_KANJI.new} size={30} rotate={5} label="A record fell in this session" /> : null}
    >
      <span className="jr-slip__dot" aria-hidden />
      <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} aria-label={headLabel} className="jr-slip__head">
        <span className="jr-slip__dates">
          <span className="jr-slip__kanji" lang="ja">{kanjiDate}</span>
          <span className="jr-slip__en">{friendlyDate(workout.date)}</span>
        </span>
        <span className="jr-slip__row">
          <span className="jr-slip__title">
            {workout.color && <i className="jr-slip__swatch" style={{ background: workout.color }} />}
            <span className="jr-slip__name">{workout.name}</span>
          </span>
          <ChevronDown size={16} aria-hidden className={`jr-slip__chev ${expanded ? 'is-open' : ''}`} />
        </span>
        <span className="jr-slip__facts">
          {facts.map((f, i) => (
            <span key={f}>
              {i > 0 ? <b aria-hidden> · </b> : null}
              {f}
            </span>
          ))}
          {workout.xpEarned > 0 && <span className="jr-slip__xp">+{workout.xpEarned} XP</span>}
        </span>
        {tags.length > 0 && (
          <span className="jr-slip__tags">
            {tags.map((t) => (
              <span key={t} className="jr-tag">{t}</span>
            ))}
          </span>
        )}
      </button>

      {expanded && (
        <m.div className="jr-slip__more" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={TWEEN.standard}>
          {detail.map((ex) => {
            const rest = ex.isCardio ? null : avgRest(ex.sets);
            const lastWorking = [...ex.sets].reverse().find((s) => !s.isWarmup && !s.isCardio) ?? ex.sets.at(-1);
            return (
              <div key={ex.exerciseId} className="jr-ex">
                <div className="jr-ex__head">
                  <p className="jr-ex__name">{ex.name}</p>
                  {rest != null && <span className="jr-ex__rest">rest {formatRest(rest)}</span>}
                </div>
                <div className="jr-ex__sets">
                  <AnimatePresence initial={false}>
                    {ex.sets.map((s) => (
                      <SetChip key={s.id} s={s} unit={unit} onEdit={editSet(ex)} />
                    ))}
                  </AnimatePresence>
                  {!ex.isCardio && (
                    <button
                      type="button"
                      onClick={() => setEditing({ mode: 'add', workoutId: workout.id, exercise: ex, template: lastWorking })}
                      aria-label={`Add a set to ${ex.name}`}
                      className="jr-chip jr-chip--add"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                {ex.sets.filter((s) => s.note).map((s) => (
                  <p key={s.id} className="jr-ex__note">· {s.note}</p>
                ))}
              </div>
            );
          })}

          {workout.verdict && <p className="jr-verdict">{workout.verdict}</p>}
          {workout.notes && <p className="jr-note">“{workout.notes}”</p>}

          <p className="jr-summary">
            {detail.length} exercise{detail.length === 1 ? '' : 's'} · {formatDuration(workout.duration)} total · avg rest{' '}
            {formatRest(avgRestAcross(detail.filter((e) => !e.isCardio).map((e) => e.sets)))}
          </p>

          <div className="jr-actions">
            <button type="button" onClick={handleRepeat} className="jr-btn jr-btn--primary jr-btn--grow">
              <RotateCcw size={14} /> Repeat
            </button>
            <button type="button" onClick={handleSaveRoutine} disabled={!detail.length} className="jr-btn jr-btn--grow">
              <BookmarkPlus size={15} /> Save as routine
            </button>
          </div>
          <div className="jr-actions">
            <button type="button" onClick={() => setDetails((v) => !v)} aria-expanded={details} className="jr-btn jr-btn--grow">
              <Pencil size={14} />
              <span className="jr-btn__label">Edit details</span>
              <ChevronDown size={15} className={`jr-slip__chev ${details ? 'is-open' : ''}`} />
            </button>
            <ShareButton data={shareData} label="" className="jr-btn jr-btn--icon" />
            <button type="button" onClick={handleDelete} className="jr-btn jr-btn--icon jr-btn--danger" aria-label="Delete workout">
              <Trash2 size={15} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {details && (
              <m.div
                key="details"
                className="jr-details"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={TWEEN.standard}
              >
                <WorkoutDetailsEditor workout={workout} />
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      )}

      {expanded && <SetEditSheet target={editing} onClose={() => setEditing(null)} />}
    </PaperCard>
  );
}
