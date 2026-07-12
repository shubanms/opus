import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Basic home-screen widget: OPUS branding + tap-to-open (starts the app).
export function QuickStartWidget() {
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
      <TextWidget text="OPUS" style={{ fontSize: 24, fontWeight: '700', color: '#C9A84C' }} />
      <TextWidget text="Tap to start a workout" style={{ fontSize: 13, color: '#8A8780', marginTop: 4 }} />
    </FlexWidget>
  );
}
