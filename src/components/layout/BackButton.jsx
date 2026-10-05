import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/** Whether there is an earlier entry of this app to go back to. */
export function canGoBack() {
  // React Router numbers the entries it creates; 0 is the one the app was
  // opened on. Anything before that belongs to some other page, or nothing.
  const idx = typeof window !== 'undefined' ? window.history.state?.idx : null;
  return typeof idx === 'number' && idx > 0;
}

/**
 * The sub-page "Back".
 *
 * Two faults, fixed once for every page that has one. It was a 20 px-tall text
 * link — the tap target was the word itself, on a phone. And `navigate(-1)`
 * does nothing at all when the page was opened directly (a home-screen
 * shortcut, a notification, a pasted link): there is nothing behind it in this
 * app's history. Then it goes *up* to `fallback` instead, replacing the entry,
 * so the next Back leaves the app rather than bouncing between the two.
 */
export default function BackButton({ fallback = '/home', label = 'Back', className = 'mb-1', onClick }) {
  const navigate = useNavigate();

  function back() {
    // A page with a better idea of "back" than history (a dead link that should
    // leave via its list) can say so.
    if (onClick) return onClick();
    if (canGoBack()) navigate(-1);
    else navigate(fallback, { replace: true });
  }

  return (
    <button
      type="button"
      onClick={back}
      aria-label={label ? undefined : 'Back'}
      className={`-ml-2 flex min-h-11 min-w-11 items-center gap-2 rounded-xl pl-2 pr-3 ${className}`}
    >
      <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
      {label && <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>}
    </button>
  );
}
