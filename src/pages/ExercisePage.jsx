import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import { useExerciseList } from '../hooks/useExercises.js';
import { queryWords } from '../utils/exerciseSearch.js';
import { MUSCLE_LABEL } from '../utils/muscleTargets.js';
import useSettingsStore from '../store/settingsStore.js';
import { Chip, SectionLabel, Seal } from '../components/ink/index.js';
import BodyPicker from '../components/exercise/BodyPicker.jsx';
import ExerciseSearch from '../components/exercise/ExerciseSearch.jsx';
import FormCard from '../components/exercise/FormCard.jsx';
import FormList from '../components/exercise/FormList.jsx';
import { FAMILIES, inFamily } from '../components/exercise/formMeta.js';
import { useFormStats } from '../components/exercise/useFormStats.js';
import Modal from '../components/ui/Modal.jsx';
import ExerciseForm from '../components/exercise/ExerciseForm.jsx';
import '../styles/ink-forms.css';

export default function ExercisePage() {
  const navigate = useNavigate();
  const unit = useSettingsStore((s) => s.unit);
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState(FAMILIES[0]);
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [bodyOpen, setBodyOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  // A query of only spaces is no query (an Android keyboard leaves one behind).
  const searching = queryWords(search).length > 0;

  // When searching: ignore the muscle filters so results span all groups.
  // `undefined` while loading, so the list shows a skeleton, not "No exercises".
  const catalogue = useExerciseList({});
  const found = useExerciseList({ muscleGroup: searching ? null : selectedMuscle, search });
  const stats = useFormStats();

  const exercises = useMemo(() => {
    if (!found) return found;
    let list = found;
    if (!searching && !selectedMuscle) list = list.filter((e) => inFamily(e, family));
    if (favoritesOnly) list = list.filter((e) => e.favorite);
    return list;
  }, [found, searching, selectedMuscle, family, favoritesOnly]);

  const total = catalogue ? catalogue.length : '…';
  const count = exercises ? exercises.length : '…';
  const filtered = !searching && (selectedMuscle || family.kanji || favoritesOnly);
  const endLabel = filtered || searching ? `${count} of ${total} forms` : `${total} forms`;

  const todayForms = useMemo(() => {
    if (!stats || !catalogue) return [];
    const byId = new Map(catalogue.map((e) => [e.id, e]));
    const planned = stats.todayIds.map((id) => byId.get(id)).filter(Boolean);
    if (planned.length) return planned;
    return Object.entries(stats.stats)
      .sort((a, b) => b[1].last - a[1].last)
      .map(([id]) => byId.get(Number(id)))
      .filter(Boolean)
      .slice(0, 6);
  }, [stats, catalogue]);
  const todayTitle = stats?.todayIds.length ? `Today's forms${stats.todayName ? ` · ${stats.todayName}` : ''}` : 'Recent forms';
  const showToday = !searching && !filtered && todayForms.length > 0;

  function pickFamily(f) {
    setFamily(f);
    setSelectedMuscle(null);
  }
  function pickMuscle(key) {
    setSelectedMuscle(key);
    if (key) setFamily(FAMILIES[0]);
  }

  return (
    <div className="forms-page">
      <header className="forms-head">
        <div className="forms-head__title">
          <Seal kanji="型" size={30} rotate={-3} />
          <h1>Forms</h1>
        </div>
        <div className="forms-head__end">
          <span>{endLabel}</span>
          <button type="button" onClick={() => setShowForm(true)} className="forms-icon-btn" aria-label="Add custom exercise">
            <Plus size={18} />
          </button>
        </div>
      </header>

      <div className="forms-search">
        <ExerciseSearch value={search} onChange={setSearch} placeholder={`Search ${total} forms`} />
        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          className="forms-icon-btn"
          style={{ border: 0 }}
          aria-label="Show favorites only"
          aria-pressed={favoritesOnly}
        >
          <Star size={18} fill={favoritesOnly ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Muscle filter, hidden while searching */}
      {!searching && (
        <>
          <fieldset className="forms-chips"><legend className="sr-only">Filter by muscle</legend>
            {FAMILIES.map((f) => (
              <Chip key={f.id} selected={!selectedMuscle && family.id === f.id} onClick={() => pickFamily(f)}>
                {f.label}
              </Chip>
            ))}
            <Chip selected={bodyOpen || Boolean(selectedMuscle)} onClick={() => setBodyOpen((v) => !v)}>
              {selectedMuscle ? (MUSCLE_LABEL[selectedMuscle] ?? selectedMuscle.replace(/-/g, ' ')) : 'Body'}
            </Chip>
          </fieldset>
          {(bodyOpen || selectedMuscle) && (
            <div className="forms-body">
              <BodyPicker selected={selectedMuscle} onSelect={pickMuscle} />
              {selectedMuscle && (
                <button type="button" onClick={() => setSelectedMuscle(null)} className="forms-more" style={{ marginTop: 10 }}>
                  Clear
                </button>
              )}
            </div>
          )}
        </>
      )}

      {showToday && (
        <section className="forms-today" aria-label={todayTitle}>
          <SectionLabel meta={todayForms.length}>{todayTitle}</SectionLabel>
          <div className="forms-carousel">
            {todayForms.map((ex, i) => (
              <FormCard key={ex.id} exercise={ex} stat={stats.stats[ex.id]} unit={unit} index={i} onTap={() => navigate(`/exercises/${ex.id}`)} />
            ))}
          </div>
        </section>
      )}

      <div className="forms-list">
        <FormList
          exercises={exercises}
          stats={stats?.stats}
          unit={unit}
          onSelect={(ex) => navigate(`/exercises/${ex.id}`)}
          // Only the full catalogue gets letter markers; a search is short.
          grouped={!searching}
        />
      </div>

      {/* Add custom exercise modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Exercise">
        <ExerciseForm onSave={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
