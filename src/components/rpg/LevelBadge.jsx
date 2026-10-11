import '../../styles/ink-components.css';

// Compact level chip: a vermilion seal with the level in Shippori. A prestige
// tier (> 0) adds a washi hairline frame so it reads as "ascended".
export default function LevelBadge({ level, size = 'md', prestige = 0, className = '' }) {
  const dim = size === 'sm' ? 28 : 36;
  const font = size === 'sm' ? 13 : 16;
  return (
    <span
      className={`ink-seal ${className}`}
      role="img"
      aria-label={`Level ${level}${prestige > 0 ? `, prestige ${prestige}` : ''}`}
      style={{
        width: dim,
        height: dim,
        fontSize: font,
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        transform: 'rotate(-3deg)',
        boxShadow: prestige > 0 ? '0 0 0 2px var(--ink-1), 0 0 0 3.5px var(--washi-2)' : undefined,
      }}
    >
      {level}
    </span>
  );
}
