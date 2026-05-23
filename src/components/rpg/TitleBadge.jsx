// Earned-title chip. `accent` fills it gold, otherwise subtle.
export default function TitleBadge({ title, accent = true }) {
  return (
    <span
      className="rounded-full px-4 py-1 font-sans text-sm font-semibold"
      style={
        accent
          ? { background: 'var(--color-gold)', color: 'var(--color-obsidian)' }
          : { background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }
      }
    >
      {title}
    </span>
  );
}
