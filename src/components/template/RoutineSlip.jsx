import { Play, Pencil, Trash2, Copy, Shuffle, TrendingUp } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore.js';
import { stepLabel } from '../../utils/progression.js';
import { friendlyDate } from '../../utils/dateKey.js';
import { DAY_SHORT } from '../../utils/routineDays.js';
import { formKanji } from '../../utils/kanji.js';
import { KanjiTile, PaperCard } from '../ink/index.js';
import '../../styles/ink-journal.css';

// "Last done 28 Sep" / "Last done today".
function lastDoneLabel(key) {
  const f = friendlyDate(key);
  if (!f) return null;
  return `Last done ${f === 'Today' || f === 'Yesterday' ? f.toLowerCase() : f}`;
}

/**
 * A routine as a paper slip on the Routines page, led by the kanji of its main
 * (first) lift. Same actions and accessible names as TemplateCard, which stays
 * for the Workout page. `showDay` is false for a routine whose weekday a newer
 * routine has taken, so two slips never both claim Monday.
 */
export default function RoutineSlip({ template, onStart, onEdit, onDelete, onDuplicate, onShuffle, onRename, stale, busy = false, showDay = true }) {
  const unit = useSettingsStore((s) => s.unit);
  const name = template.name || 'Routine';
  const first = template.exercises[0];
  const kanji = formKanji(first?.name, first?.muscleGroup);
  const muscleGroups = [...new Set(template.exercises.map((e) => e.muscleGroup))].slice(0, 4);
  const scheme = template.progression;
  const auto = scheme?.mode === 'linear' || scheme?.mode === 'double';
  const missed = auto ? template.exercises.filter((e) => (e.misses ?? 0) > 0) : [];
  const deloadAt = scheme?.deloadAfterMisses ?? 2;
  const lastDone = template.lastDone ? lastDoneLabel(template.lastDone) : null;

  return (
    <PaperCard className="jr-slip jr-rt">
      <div className="jr-rt__top">
        <KanjiTile kanji={kanji} state="lit" size={48} />
        <div className="jr-rt__body">
          <div className="jr-rt__name">
            {template.color && <i className="jr-slip__swatch" style={{ background: template.color }} />}
            {onRename ? (
              <button type="button" onClick={() => onRename(template)} className="jr-rt__title" aria-label={`Rename ${name}`}>
                {name}
              </button>
            ) : (
              <p className="jr-rt__title">{name}</p>
            )}
            {showDay && template.dayOfWeek != null && <span className="jr-tag">{DAY_SHORT[template.dayOfWeek]}</span>}
          </div>
          <p className="jr-rt__meta">
            {template.exercises.length} exercise{template.exercises.length === 1 ? '' : 's'}
            {lastDone && <> · {lastDone}</>}
          </p>
        </div>
      </div>

      {(auto || muscleGroups.length > 0) && (
        <div className="jr-slip__tags jr-rt__tags">
          {auto && (
            <span
              className="jr-tag jr-tag--auto"
              title={scheme.mode === 'linear' ? `Linear progression — deloads after ${deloadAt} misses in a row` : 'Double progression — holds on a miss'}
            >
              <TrendingUp size={11} /> Auto {stepLabel(scheme.weightStep, unit)}
            </span>
          )}
          {muscleGroups.map((g) => (
            <span key={g} className="jr-tag">{g.replace(/-/g, ' ')}</span>
          ))}
        </div>
      )}

      {missed.length > 0 && (
        <p className="jr-rt__missed">
          Missed last time: {missed.map((e) => (scheme.mode === 'linear' ? `${e.name} (${e.misses}/${deloadAt})` : e.name)).join(', ')}
        </p>
      )}

      <div className="jr-rt__acts">
        {onShuffle && (
          <button type="button" onClick={() => onShuffle(template)} disabled={busy} className="jr-ib" aria-label={`Shuffle ${name}`}>
            <Shuffle size={15} />
          </button>
        )}
        {onDuplicate && (
          <button type="button" onClick={() => onDuplicate(template)} disabled={busy} className="jr-ib" aria-label={`Duplicate ${name}`}>
            <Copy size={15} />
          </button>
        )}
        {onEdit && (
          <button type="button" onClick={() => onEdit(template)} className="jr-ib" aria-label={`Edit ${name}`}>
            <Pencil size={15} />
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={() => onDelete(template)} className="jr-ib" aria-label={`Delete ${name}`}>
            <Trash2 size={15} />
          </button>
        )}
        {onStart && (
          <button type="button" onClick={() => onStart(template)} className="jr-ib jr-ib--go" aria-label={`Start ${name}`}>
            <Play size={15} fill="currentColor" />
          </button>
        )}
      </div>

      {stale && onShuffle && (
        <button type="button" onClick={() => onShuffle(template)} disabled={busy} className="jr-btn jr-btn--block">
          <Shuffle size={13} /> You've run this a while — shuffle it up?
        </button>
      )}
    </PaperCard>
  );
}
