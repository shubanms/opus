import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Streak / Today widget: shows the live streak + workout count. The app pushes
// fresh numbers via requestWidgetUpdate (native/widgets.js); the periodic task
// handler reads them straight from the DB as a fallback.
export function TodayWidget({ streak = 0, workouts = 0 }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#111010',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <TextWidget text="OPUS" style={{ fontSize: 13, fontWeight: '700', color: '#8A8780', letterSpacing: 2 }} />
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }}>
        <TextWidget text={`${streak}`} style={{ fontSize: 34, fontWeight: '700', color: '#C9A84C' }} />
        <TextWidget
          text={streak === 1 ? ' day streak' : ' day streak'}
          style={{ fontSize: 13, color: '#8A8780', marginBottom: 6, marginLeft: 4 }}
        />
      </FlexWidget>
      <TextWidget text={`${workouts} workouts logged`} style={{ fontSize: 12, color: '#8A8780', marginTop: 2 }} />
    </FlexWidget>
  );
}
