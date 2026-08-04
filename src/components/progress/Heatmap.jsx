function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 12-week training frequency grid (GitHub-style).
export default function Heatmap({ days }) {
  const weeks = 12;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = mondayOf(today);
  start.setDate(start.getDate() - (weeks - 1) * 7);

  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const iso = date.toISOString().slice(0, 10);
      col.push({ iso, trained: days.has(iso), future: date > today });
    }
    cols.push(col);
  }

  return (
    <div className="flex gap-1 overflow-x-auto">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-1">
          {col.map((cell) => (
            <div
              key={cell.iso}
              title={cell.iso}
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{
                background: cell.future
                  ? 'transparent'
                  : cell.trained
                  ? 'var(--color-gold)'
                  : 'var(--color-ivory)',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
