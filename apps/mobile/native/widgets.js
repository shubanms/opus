import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { TodayWidget } from '../widgets/TodayWidget';
import { getTotals } from './db';

// Push current streak/workout numbers to any placed "Today" widget. Safe to
// call often (Home focus, after finishing a workout); no-ops if none placed.
export async function refreshWidgets() {
  try {
    const t = getTotals();
    await requestWidgetUpdate({
      widgetName: 'Today',
      renderWidget: () => <TodayWidget streak={t.streak || 0} workouts={t.workouts || 0} />,
      widgetNotFound: () => {},
    });
  } catch {
    // Widgets are best-effort; never let this break the UI.
  }
}
