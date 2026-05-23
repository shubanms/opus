export default function TopBar({ title, right }) {
  return (
    <div className="flex items-center justify-between px-5 pt-6">
      <span className="font-display text-2xl font-bold">{title}</span>
      {right}
    </div>
  );
}
