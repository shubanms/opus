// Compact level chip for top bars / cards.
export default function LevelBadge({ level, size = 'md' }) {
  const dim = size === 'sm' ? 28 : 36;
  const font = size === 'sm' ? 12 : 15;
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full font-mono font-semibold"
      style={{
        width: dim,
        height: dim,
        fontSize: font,
        background: 'var(--color-gold)',
        color: 'var(--color-obsidian)',
      }}
    >
      {level}
    </div>
  );
}
