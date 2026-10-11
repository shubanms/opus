import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import useSettingsStore from '../../store/settingsStore.js';
import { InkButton, KanjiTile, PaperCard } from '../ink/index.js';
import SkyBackdrop from '../onboarding/SkyBackdrop.jsx';
import '../../styles/ink-system.css';

const STEPS = [
  { kanji: '記', title: 'Log your workouts', body: 'Tap the center ➕ to start. Add exercises — reorder them or chain supersets — and log sets with the plate calculator, RPE and rest timer. Get interrupted? Your session is saved.' },
  { kanji: '位', title: 'Level up', body: 'Every set earns XP. Climb from First Rep to Magnum Opus and into prestige tiers, and clear weekly quests for bonus XP.' },
  { kanji: '勝', title: 'Unlock achievements', body: 'Hit milestones to earn trophies. Some are hidden — find them on your Profile.' },
  { kanji: '録', title: 'Your exercise library', body: 'Browse, favorite ★, colour-code, and add coaching notes that show every time you train a movement.' },
  { kanji: '練', title: 'Routines & planning', body: 'Build reusable routines with targets, assign them to weekdays, and get a "today" suggestion on Home.' },
  { kanji: '息', title: 'Track recovery & progress', body: 'See which muscles are fresh on the body map, track steps & water, and chart volume, PRs, estimated 1RM and body metrics.' },
  { kanji: '印', title: 'Show it off', body: 'Share workout, profile, weekly-recap and Wrapped cards — your monthly & yearly stats — straight from the app.' },
  { kanji: '心', title: 'Make it yours', body: 'Sound, effects, dark mode and kg/lbs all live in Settings — and most start off. Open Settings to switch on what you like (you can replay this tour there anytime).' },
];

export default function Tour() {
  const setTourSeen = useSettingsStore((s) => s.setTourSeen);
  const navigate = useNavigate();
  const [i, setI] = useState(0);

  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  function finish(goSettings = false) {
    setTourSeen(true);
    if (goSettings) navigate('/settings');
  }

  return createPortal(
    <div data-testid="first-run-overlay" className="sy-stage z-[75]">
      <SkyBackdrop />
      <div className="sy-scroll">
        <PaperCard className="sy-card">
          <button type="button" onClick={() => finish(false)} className="sy-quiet sy-quiet--corner">
            Skip
          </button>

          <div key={i} className="sy-card--enter">
            <KanjiTile kanji={step.kanji} state="lit" size={56} />
            <h2 className="sy-title mt-4">{step.title}</h2>
            <p className="sy-body">{step.body}</p>
          </div>

          {/* Progress: short brush bars, the current one long */}
          <div className="sy-dots" aria-hidden="true">
            {STEPS.map((s, idx) => (
              <span key={s.title} className={idx === i ? 'is-on' : undefined} />
            ))}
          </div>

          <div className="sy-actions">
            {last ? (
              <InkButton variant="secondaryOnPaper" onClick={() => finish(false)}>Not now</InkButton>
            ) : (
              i > 0 && <InkButton variant="secondaryOnPaper" onClick={() => setI(i - 1)}>Back</InkButton>
            )}
            <InkButton onClick={() => (last ? finish(true) : setI(i + 1))}>{last ? 'Open Settings' : 'Next'}</InkButton>
          </div>
        </PaperCard>
      </div>
    </div>,
    document.body
  );
}
