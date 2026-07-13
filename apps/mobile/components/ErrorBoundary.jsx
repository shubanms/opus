// Catches render/runtime errors anywhere in the tree and shows a readable
// message instead of a blank screen or a frozen splash. Also logs to console
// so the error is visible in `adb logcat` during CI/device testing.
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { colors } from '../theme';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.warn('OPUS crashed:', error?.message, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.obsidian, padding: 24, justifyContent: 'center' }}>
          <Text style={{ color: colors.gold, fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Something broke</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            <Text style={{ color: colors.textInverse, fontSize: 13 }}>{String(this.state.error?.message || this.state.error)}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
