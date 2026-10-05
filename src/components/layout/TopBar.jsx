import BackButton from './BackButton.jsx';

// `back` (a fallback path, or `true` for Home) adds the shared Back button —
// a 44 px target that still works when the page was opened by a deep link.
export default function TopBar({ title, right, back }) {
  return (
    <div className="flex items-center justify-between px-5 pt-6">
      <div className="flex min-w-0 items-center gap-1">
        {back && <BackButton fallback={typeof back === 'string' ? back : '/home'} label="" className="" />}
        <span className="truncate font-display text-2xl font-bold">{title}</span>
      </div>
      {right}
    </div>
  );
}
