import { Seal } from '../ink/index.js';
import { formKanji, muscleKanji } from '../../utils/kanji.js';
import { bestLabel } from './formMeta.js';
import FormStillLife from './FormStillLife.jsx';
import '../../styles/ink-forms.css';

/** Carousel card: ink still-life of the equipment, the form kanji writing on, a muscle seal, name and best. */
export default function FormCard({ exercise, stat, unit, index = 0, onTap }) {
  const kanji = formKanji(exercise.name, exercise.muscleGroup);
  return (
    <button type="button" className="washi forms-card" onClick={onTap} aria-label={exercise.name}>
      <span className="forms-card__seal">
        <Seal kanji={muscleKanji(exercise.muscleGroup)} size={22} rotate={0} />
      </span>
      <FormStillLife kanji={kanji} equipment={exercise.equipment} label={`${exercise.name}: the character ${kanji} over an ink painting of ${exercise.equipment ?? 'equipment'}`} delay={index * 0.8} />
      <span className="forms-card__name">{exercise.name}</span>
      <span className="forms-card__meta">{bestLabel(stat, unit) ?? 'not yet learned'}</span>
    </button>
  );
}
