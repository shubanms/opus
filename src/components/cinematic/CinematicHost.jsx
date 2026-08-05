import { Component, useEffect } from 'react';
import { AnimatePresence } from '../../motion/index.jsx';
import useCinematicStore from '../../store/cinematicStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import useUIStore from '../../store/uiStore.js';
import { KIND, summarize } from '../../utils/cinematics.js';
import PRCinematic from './PRCinematic.jsx';
import LevelUpCinematic from './LevelUpCinematic.jsx';
import DungeonCinematic from './DungeonCinematic.jsx';
import AchievementCinematic from './AchievementCinematic.jsx';

/**
 * Plays the celebration queue, one item at a time.
 *
 * Mounted once in AppLayout rather than by the page that produced the event —
 * the old level-up screen was owned by `WorkoutPage`, which is precisely the
 * component about to unmount when a session ends.
 *
 * The cinematics have no skip button by design, which makes the timer here
 * load-bearing: it is the only thing that ends one. It deliberately lives in
 * the host, *outside* the error boundary below, so that a cinematic which
 * fails to render still advances the queue instead of freezing the app behind
 * a screen with no way out.
 */
export default function CinematicHost() {
  const item = useCinematicStore((s) => s.queue[0]);
  const advance = useCinematicStore((s) => s.advance);
  const effects = useSettingsStore((s) => s.effects);

  useEffect(() => {
    if (!item) return undefined;

    // Effects off is a real preference, and a full-screen takeover is exactly
    // what it is asking not to see. The celebration is optional; being told you
    // levelled up is not, so it degrades to a toast.
    if (!effects) {
      useUIStore.getState().showToast(summarize(item), { type: 'success' });
      advance();
      return undefined;
    }

    const timer = setTimeout(advance, item.duration);
    return () => clearTimeout(timer);
  }, [item, effects, advance]);

  return (
    <AnimatePresence>
      {effects && item && (
        <CinematicBoundary key={item.id}>
          <Cinematic item={item} />
        </CinematicBoundary>
      )}
    </AnimatePresence>
  );
}

// `scale` is the queue's pacing multiplier. It shortens each cinematic's entry
// schedule in step with its duration — without it, a sped-up cinematic still
// introduces its last line on a full-length delay and leaves before you read it.
function Cinematic({ item }) {
  const scale = item.scale ?? 1;
  switch (item.kind) {
    case KIND.PR:
      return <PRCinematic pr={item.pr} extra={item.extra} scale={scale} />;
    case KIND.LEVEL:
      return <LevelUpCinematic level={item.level} title={item.title} scale={scale} />;
    case KIND.DUNGEON:
      return (
        <DungeonCinematic
          name={item.name}
          iron={item.iron}
          xpBonus={item.xpBonus}
          scale={scale}
        />
      );
    case KIND.ACHIEVEMENT:
      return <AchievementCinematic achievements={item.achievements} />;
    default:
      return null;
  }
}

/** A cinematic that throws renders nothing; the host's timer still advances. */
class CinematicBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Cinematic failed to render (queue still advances):', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
