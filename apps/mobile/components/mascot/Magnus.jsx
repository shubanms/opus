// Magnus — a 2D SVG training companion drawn with react-native-svg. The web app
// renders a 3D RobotExpressive GLB via react-three-fiber; native has no GLB
// pipeline (and expo-gl is heavy), so we ship a charming stroke/fill robot in
// the same obsidian + gold palette. The dialogue + gesture *logic* is shared
// from @opus/core/mascot; the animation lives in Companion.jsx.
import Svg, { Rect, Circle, Line, Path, Ellipse } from 'react-native-svg';
import { useColors } from '../../native/ThemeProvider';

export default function Magnus({ size = 150, blink = false }) {
  const colors = useColors();
  const gold = colors.gold;
  const obsidian = colors.obsidian;
  const eye = blink ? colors.obsidian : gold;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* soft ground shadow */}
      <Ellipse cx={50} cy={93} rx={22} ry={4} fill={obsidian} opacity={0.18} />

      {/* antenna */}
      <Line x1={50} y1={20} x2={50} y2={9} stroke={gold} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={50} cy={7} r={3.5} fill={gold} />

      {/* head */}
      <Rect x={28} y={19} width={44} height={34} rx={12} fill={obsidian} stroke={gold} strokeWidth={2.5} />
      {/* visor */}
      <Rect x={33} y={27} width={34} height={18} rx={9} fill={gold} opacity={0.12} />
      {/* eyes */}
      <Circle cx={42} cy={36} r={blink ? 1 : 4} fill={eye} />
      <Circle cx={58} cy={36} r={blink ? 1 : 4} fill={eye} />
      {/* smile */}
      <Path d="M43 44 Q50 49 57 44" stroke={gold} strokeWidth={2} strokeLinecap="round" fill="none" />

      {/* neck */}
      <Rect x={46} y={53} width={8} height={5} fill={gold} opacity={0.5} />

      {/* body */}
      <Rect x={30} y={57} width={40} height={30} rx={10} fill={obsidian} stroke={gold} strokeWidth={2.5} />
      {/* chest gem */}
      <Path d="M50 64 l5 6 -5 6 -5 -6 z" fill={gold} />

      {/* arms */}
      <Line x1={30} y1={64} x2={20} y2={72} stroke={gold} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={19} cy={73} r={3} fill={gold} />
      <Line x1={70} y1={64} x2={80} y2={72} stroke={gold} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={81} cy={73} r={3} fill={gold} />
    </Svg>
  );
}
