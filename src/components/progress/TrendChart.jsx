import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const GOLD = '#8B7DFF';
const ASH = '#7B83A6';

export default function TrendChart({ data, unit = '', empty = 'No data yet.' }) {
  if (!data || data.length === 0) {
    return (
      <p className="py-6 text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {empty}
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={ASH} strokeOpacity={0.15} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: ASH, fontSize: 10, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: ASH, fontSize: 10, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={40} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ background: '#161B2E', border: 'none', borderRadius: 12, fontFamily: 'DM Sans, sans-serif', fontSize: 12 }}
          labelStyle={{ color: '#F4F6FD' }}
          itemStyle={{ color: GOLD }}
          formatter={(v) => [`${v}${unit ? ` ${unit}` : ''}`, '']}
        />
        <Line type="monotone" dataKey="value" stroke={GOLD} strokeWidth={2.5} dot={{ fill: GOLD, r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
