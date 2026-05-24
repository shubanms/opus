import { Award, Lock } from 'lucide-react';

export default function AchievementBadge({ item }) {
  const { unlocked, title, desc } = item;
  return (
    <div className="flex flex-col items-center text-center" title={desc}>
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: unlocked ? 'var(--color-gold)' : 'var(--color-ivory)', opacity: unlocked ? 1 : 0.6 }}
      >
        {unlocked
          ? <Award size={24} style={{ color: 'var(--color-obsidian)' }} />
          : <Lock size={16} style={{ color: 'var(--color-ash)' }} />}
      </div>
      <span
        className="mt-1.5 font-sans text-[10px] leading-tight"
        style={{ color: unlocked ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
      >
        {title}
      </span>
    </div>
  );
}
