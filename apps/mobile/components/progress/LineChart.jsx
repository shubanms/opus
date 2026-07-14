// Minimal line + area chart on react-native-svg (no chart library, so it can't
// destabilize the APK build). Ports the PWA TrendChart look: a gold stroke over
// a soft gold area fill, flat-lining gracefully with 0–1 points.
import { View } from 'react-native';
import Svg, { Polyline, Polygon, Circle, Line as SvgLine } from 'react-native-svg';
import { Label } from '../../ui';
import { colors, space } from '../../theme';

export default function LineChart({ data = [], height = 120, color = colors.gold, width = 300 }) {
  const values = data.map((d) => (typeof d === 'number' ? d : d?.value || 0));
  const padX = 6;
  const padY = 10;
  const w = Math.max(1, width);
  const h = height;

  if (values.length < 2) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Label>Not enough data yet</Label>
      </View>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = (w - padX * 2) / (values.length - 1);
  const y = (v) => padY + (h - padY * 2) * (1 - (v - min) / span);
  const pts = values.map((v, i) => [padX + i * stepX, y(v)]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `${padX},${h - padY} ${line} ${padX + (values.length - 1) * stepX},${h - padY}`;

  return (
    <Svg width={w} height={h}>
      <SvgLine x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke={colors.ivory} strokeWidth={1} />
      <Polygon points={area} fill={color} fillOpacity={0.12} />
      <Polyline points={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 2.5} fill={color} />
      ))}
    </Svg>
  );
}
