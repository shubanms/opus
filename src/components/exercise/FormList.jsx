import { Star } from 'lucide-react';
import { ListRow } from '../ink/index.js';
import { formKanji } from '../../utils/kanji.js';
import { masteryOf } from './useFormStats.js';
import { bestLabel, equipmentLabel, familyLabelOf } from './formMeta.js';
import '../../styles/ink-forms.css';

const SKELETON_ROWS = ['s1', 's2', 's3', 's4', 's5', 's6'];

function initialOf(exercise) {
  const c = (exercise?.name ?? '').trim().charAt(0).toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
}

function FormRow({ ex, stat, unit, onSelect }) {
  const sessions = stat?.sessions ?? 0;
  const best = bestLabel(stat, unit);
  const tile = stat?.recordWeek ? 'lit' : sessions > 0 ? 'paper' : 'locked';
  const meta = [familyLabelOf(ex.muscleGroup), equipmentLabel(ex.equipment), best ?? 'not yet learned']
    .filter(Boolean)
    .join(' · ');
  return (
    <ListRow
      as="button"
      type="button"
      className="forms-row"
      onClick={() => onSelect(ex)}
      kanji={formKanji(ex.name, ex.muscleGroup)}
      tileState={tile}
      title={
        <span className="forms-row__title">
          {ex.favorite && <Star size={12} fill="var(--ver-light)" style={{ color: 'var(--ver-light)', flex: 'none' }} aria-label="Favourite" />}
          <span>{ex.name}</span>
          {ex.color && <i className="forms-dot" style={{ background: ex.color }} aria-hidden />}
        </span>
      }
      meta={
        <>
          {meta}
          {stat?.recordWeek ? <span className="forms-new"> · new</span> : null}
        </>
      }
      mastery={masteryOf(sessions)}
    />
  );
}

/** The A–Z list of forms with circled letter markers. `exercises` undefined = loading. */
export default function FormList({ exercises, stats, unit, onSelect, grouped = true }) {
  if (exercises === undefined) {
    return (
      <div aria-busy="true" aria-label="Loading exercises">
        {SKELETON_ROWS.map((row, i) => (
          <div key={row} className="forms-skel" style={{ opacity: 1 - i * 0.12 }} />
        ))}
      </div>
    );
  }
  if (exercises.length === 0) return <p className="forms-empty">No exercises found.</p>;

  const row = (ex) => <FormRow key={ex.id} ex={ex} stat={stats?.[ex.id]} unit={unit} onSelect={onSelect} />;
  if (!grouped) return <div>{exercises.map(row)}</div>;

  const sections = [];
  const by = {};
  for (const ex of exercises) {
    const letter = initialOf(ex);
    if (!by[letter]) {
      by[letter] = { letter, items: [] };
      sections.push(by[letter]);
    }
    by[letter].items.push(ex);
  }
  return (
    <div>
      {sections.map((s) => (
        <section key={s.letter} aria-label={`Forms starting with ${s.letter}`}>
          <div className="forms-letter"><span className="forms-letter__mark" aria-hidden>{s.letter}</span></div>
          {s.items.map(row)}
        </section>
      ))}
    </div>
  );
}
