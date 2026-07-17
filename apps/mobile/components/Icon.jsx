// SVG icon set (stroke-based, lucide-style) drawn with react-native-svg. We use
// this instead of @expo/vector-icons because the Ionicons GLYPH FONT does not
// render in our release APK (blank tabs/buttons on device), whereas
// react-native-svg renders reliably. Bonus: stroke icons match the web PWA's
// lucide-react look. Drop-in API: <Icon name="add" size={24} color="#fff" />.
import Svg, { Path, Circle, Line, Polyline, Polygon, Rect } from 'react-native-svg';

// Each icon is a list of primitives on a 24×24 grid. p=path, c=circle, l=line,
// pl=polyline, pg=polygon, r=rect. Filled shapes set fill:true.
const I = {
  // Tabs
  home: [['p', 'M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z']],
  'stats-chart': [['l', 6, 20, 6, 14], ['l', 12, 20, 12, 9], ['l', 18, 20, 18, 5]],
  'add-circle': [['c', 12, 12, 9], ['l', 12, 8, 12, 16], ['l', 8, 12, 16, 12]],
  barbell: [['l', 4, 9, 4, 15], ['l', 7, 6.5, 7, 17.5], ['l', 17, 6.5, 17, 17.5], ['l', 20, 9, 20, 15], ['l', 7, 12, 17, 12]],
  person: [['c', 12, 8, 3.6], ['p', 'M5 20c0-3.6 3-5.5 7-5.5s7 1.9 7 5.5']],
  settings: [['c', 12, 12, 3], ['l', 12, 2.5, 12, 5.5], ['l', 12, 18.5, 12, 21.5], ['l', 2.5, 12, 5.5, 12], ['l', 18.5, 12, 21.5, 12], ['l', 5.2, 5.2, 7.3, 7.3], ['l', 16.7, 16.7, 18.8, 18.8], ['l', 5.2, 18.8, 7.3, 16.7], ['l', 16.7, 7.3, 18.8, 5.2]],
  // Actions
  add: [['l', 12, 5, 12, 19], ['l', 5, 12, 19, 12]],
  close: [['l', 6, 6, 18, 18], ['l', 18, 6, 6, 18]],
  checkmark: [['pl', '20 6 9 17 4 12']],
  list: [['l', 9, 6, 20, 6], ['l', 9, 12, 20, 12], ['l', 9, 18, 20, 18], ['c', 4.5, 6, 1, 1], ['c', 4.5, 12, 1, 1], ['c', 4.5, 18, 1, 1]],
  search: [['c', 11, 11, 7], ['l', 20.5, 20.5, 16, 16]],
  trash: [['pl', '3 6 5 6 21 6'], ['p', 'M19 6v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'], ['p', 'M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2'], ['l', 10, 11, 10, 17], ['l', 14, 11, 14, 17]],
  play: [['pg', '7 4 20 12 7 20']],
  repeat: [['pl', '17 2 21 6 17 10'], ['p', 'M3 12V10a4 4 0 0 1 4-4h14'], ['pl', '7 22 3 18 7 14'], ['p', 'M21 12v2a4 4 0 0 1-4 4H3']],
  // Chevrons
  'chevron-back': [['pl', '15 18 9 12 15 6']],
  'chevron-forward': [['pl', '9 18 15 12 9 6']],
  'chevron-up': [['pl', '6 15 12 9 18 15']],
  'chevron-down': [['pl', '6 9 12 15 18 9']],
  // Glyphs
  flame: [['p', 'M12 3c2.5 3.5 5 5.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 3-6 .5 1.5 1.5 2 2 2 .5-1.5 0-3.5 0-5z', true]],
  flash: [['pg', '13 2 4 14 11 14 10 22 20 10 13 10 13 2', true]],
  calendar: [['r', 3, 5, 18, 16, 2], ['l', 3, 10, 21, 10], ['l', 8, 3, 8, 7], ['l', 16, 3, 16, 7]],
  time: [['c', 12, 12, 9], ['pl', '12 7 12 12 15 14']],
  walk: [['c', 13, 4, 2], ['p', 'M13 7l-1.5 5-3 4'], ['p', 'M11.5 12l3 2 1 5'], ['p', 'M8 9l3.5-1 3 1.5']],
  trophy: [['p', 'M6 4h12v4a6 6 0 0 1-12 0z'], ['p', 'M6 5H4v1a3 3 0 0 0 3 3'], ['p', 'M18 5h2v1a3 3 0 0 1-3 3'], ['l', 12, 14, 12, 17], ['l', 8, 21, 16, 21], ['l', 10, 17, 14, 17]],
  ribbon: [['c', 12, 8, 5], ['pl', '8.5 12.5 6 22 12 18.5 18 22 15.5 12.5']],
  sparkles: [['p', 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', true], ['c', 18, 5, 0.6, true], ['c', 6, 17, 0.6, true]],
  notifications: [['p', 'M18 8a6 6 0 0 0-12 0c0 6-3 8-3 8h18s-3-2-3-8'], ['p', 'M13.7 21a2 2 0 0 1-3.4 0']],
  'paper-plane': [['pg', '22 2 15 22 11 13 2 9']],
  'musical-notes': [['p', 'M9 18V5l11-2v11'], ['c', 6, 18, 3], ['c', 17, 16, 3]],
  'shield-checkmark': [['p', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'], ['pl', '9 12 11 14 15 10']],
  'lock-closed': [['r', 5, 11, 14, 10, 2], ['p', 'M8 11V7a4 4 0 0 1 8 0v4']],
  'trending-up': [['pl', '22 7 13.5 15.5 8.5 10.5 2 17'], ['pl', '16 7 22 7 22 13']],
  flash_outline: [['pg', '13 2 4 14 11 14 10 22 20 10 13 10 13 2']],
  ellipse: [['c', 12, 12, 8, true]],
  star: [['pg', '12 3 15 9.5 22 10 17 15 18.5 22 12 18.5 5.5 22 7 15 2 10 9 9.5', true]],
  layers: [['pg', '12 3 21 8 12 13 3 8'], ['pl', '3 13 12 18 21 13'], ['pl', '3 17 12 22 21 17']],
  share: [['c', 18, 5, 3], ['c', 6, 12, 3], ['c', 18, 19, 3], ['l', 8.6, 13.5, 15.4, 17.5], ['l', 15.4, 6.5, 8.6, 10.5]],
  book: [['p', 'M4 4h7v16H6a2 2 0 0 1-2-2z'], ['p', 'M20 4h-7v16h5a2 2 0 0 0 2-2z']],
  activity: [['pl', '22 12 18 12 15 21 9 3 6 12 2 12']],
  palette: [['p', 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2a1.5 1.5 0 0 1 1.5-1.5H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7z'], ['c', 7.5, 10.5, 1, true], ['c', 12, 7.5, 1, true], ['c', 16.5, 10.5, 1, true]],
  bulb: [['p', 'M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3z'], ['l', 9, 18, 15, 18], ['l', 10, 21, 14, 21]],
};

export default function Icon({ name, size = 24, color = '#000', style }) {
  const items = I[name] || I.ellipse;
  const common = { stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {items.map((it, idx) => {
        const [type, ...a] = it;
        const filled = it[it.length - 1] === true;
        const fill = filled ? color : 'none';
        const props = filled ? { ...common, fill, stroke: 'none' } : common;
        if (type === 'p') return <Path key={idx} d={a[0]} {...props} />;
        if (type === 'c') return <Circle key={idx} cx={a[0]} cy={a[1]} r={a[2]} {...props} />;
        if (type === 'l') return <Line key={idx} x1={a[0]} y1={a[1]} x2={a[2]} y2={a[3]} {...common} />;
        if (type === 'pl') return <Polyline key={idx} points={a[0]} {...common} fill="none" />;
        if (type === 'pg') return <Polygon key={idx} points={a[0]} {...props} />;
        if (type === 'r') return <Rect key={idx} x={a[0]} y={a[1]} width={a[2]} height={a[3]} rx={a[4] || 0} {...common} />;
        return null;
      })}
    </Svg>
  );
}
