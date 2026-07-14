// Minimal bar chart on react-native-svg — per-session volume, most recent on
// the right. Bars scale to the max; the last bar is gold, the rest muted.
import { View } from 'react-native';
import Svg, { Rect, Line as SvgLine } from 'react-native-svg';
import { Label } from '../../ui';
import { colors } from '../../theme';

export default function BarChart({ data = [], height = 120, width = 300, color = colors.gold }) {
  const values = data.map((d) => (typeof d === 'number' ? d : d?.value || 0));
  if (values.length === 0) {
    return (
      <View style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Label>No sessions yet</Label>
      </View>
    );
  }

  const padY = 8;
  const gap = 6;
  const w = Math.max(1, width);
  const max = Math.max(...values, 1);
  const bw = Math.max(2, (w - gap * (values.length - 1)) / values.length);
  const barH = (v) => Math.max(2, (height - padY * 2) * (v / max));

  return (
    <Svg width={w} height={height}>
      <SvgLine x1={0} y1={height - padY} x2={w} y2={height - padY} stroke={colors.ivory} strokeWidth={1} />
      {values.map((v, i) => {
        const bh = barH(v);
        return (
          <Rect
            key={i}
            x={i * (bw + gap)}
            y={height - padY - bh}
            width={bw}
            height={bh}
            rx={3}
            fill={i === values.length - 1 ? color : colors.ash}
            fillOpacity={i === values.length - 1 ? 1 : 0.5}
          />
        );
      })}
    </Svg>
  );
}
