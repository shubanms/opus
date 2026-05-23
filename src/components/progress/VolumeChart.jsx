import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const GOLD = '#C9A84C';
const ASH = '#8A8780';

export default function VolumeChart({ data, unit = 'kg' }) {
  if (!data || data.length === 0) {
    return (
      <p className="py-6 text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Log this exercise to see volume trends.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={ASH} strokeOpacity={0.15} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: ASH, fontSize: 10, fontFamily: 'DM Mono, monospace' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: ASH, fontSize: 10, fontFamily: 'DM Mono, monospace' }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ fill: GOLD, fillOpacity: 0.08 }}
          contentStyle={{
            background: '#2C2C2C',
            border: 'none',
            borderRadius: 12,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
          }}
          labelStyle={{ color: '#F7F5F2' }}
          itemStyle={{ color: GOLD }}
          formatter={(v) => [`${v.toLocaleString()} ${unit}`, 'Volume']}
        />
        <Bar dataKey="volume" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
