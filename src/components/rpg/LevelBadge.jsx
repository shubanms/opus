// Compact level chip for top bars / cards. A prestige tier (> 0) adds a
// bright outer halo ring so it reads as "ascended".
export default function LevelBadge({ level, size = 'md', prestige = 0 }) {
  const dim = size === 'sm' ? 28 : 36;
  const font = size === 'sm' ? 12 : 15;
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-mono font-semibold"
      style={{
        width: dim,
        height: dim,
        fontSize: font,
        background: 'var(--color-gold)',
        color: 'var(--color-obsidian)',
        boxShadow: prestige > 0 ? '0 0 0 2px var(--color-stone), 0 0 0 3.5px #C4BCFF' : undefined,
      }}
    >
      {level}
    </div>
  );
}
