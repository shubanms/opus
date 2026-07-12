import React from 'react';
import { QuickStartWidget } from './widgets/QuickStartWidget';
import { TodayWidget } from './widgets/TodayWidget';

// Read live totals for the Today widget in the (headless) task context. Guarded
// so a background render never crashes if the DB isn't reachable here.
function readTotals() {
  try {
    // Lazy require so the QuickStart-only path never touches SQLite.
    const { getTotals } = require('./native/db');
    const t = getTotals();
    return { streak: t.streak || 0, workouts: t.workouts || 0 };
  } catch {
    return { streak: 0, workouts: 0 };
  }
}

export async function widgetTaskHandler(props) {
  const name = props.widgetInfo?.widgetName;

  const render = () => {
    if (name === 'Today') {
      const { streak, workouts } = readTotals();
      props.renderWidget(<TodayWidget streak={streak} workouts={workouts} />);
    } else {
      props.renderWidget(<QuickStartWidget />);
    }
  };

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      render();
      break;
    default:
      break;
  }
}
