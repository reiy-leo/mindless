import { useMemo, useState } from 'react';

interface HeatmapGridProps {
  data: Record<string, number>;
  color?: string;
  weeks?: number;
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getMonthLabels(weeks: number): { label: string; col: number }[] {
  const today = new Date();
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - (weeks * 7 - 1) - ((startDay.getDay() + 6) % 7));

  const months: { label: string; col: number }[] = [];
  let lastMonth = -1;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let w = 0; w < weeks; w++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + w * 7);
    const m = d.getMonth();
    if (m !== lastMonth) {
      months.push({ label: monthNames[m], col: w });
      lastMonth = m;
    }
  }
  return months;
}

function getIntensity(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function getColorForLevel(level: number, baseColor: string): string {
  if (level === 0) return '';
  const opacity = [0, 0.25, 0.5, 0.75, 1][level];
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function HeatmapGrid({ data, color = '#3B82F6', weeks = 52 }: HeatmapGridProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { grid, maxCount } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (weeks * 7 - 1) - ((start.getDay() + 6) % 7));

    const max = Math.max(1, ...Object.values(data));

    const cells: { date: string; count: number; row: number; col: number }[] = [];

    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(start);
        cellDate.setDate(cellDate.getDate() + w * 7 + d);
        if (cellDate > today) continue;

        const key = cellDate.toISOString().slice(0, 10);
        cells.push({
          date: key,
          count: data[key] || 0,
          row: d,
          col: w,
        });
      }
    }

    return { grid: cells, maxCount: max };
  }, [data, weeks]);

  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks]);

  return (
    <div className="relative">
      {/* Month labels */}
      <div className="flex ml-6 mb-1" style={{ height: 14 }}>
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="text-[10px] text-gray-400 dark:text-gray-500 absolute"
            style={{ left: `${(m.col / weeks) * 100}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex gap-0">
        {/* Day labels */}
        <div className="flex flex-col mr-1.5 justify-between" style={{ paddingTop: 2 }}>
          {DAY_LABELS.map((label, i) => (
            <span key={i} className="text-[10px] text-gray-400 dark:text-gray-500 leading-3 h-3 flex items-center">
              {label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${weeks}, 1fr)`,
            gridTemplateRows: 'repeat(7, 1fr)',
          }}
        >
          {grid.map((cell) => {
            const level = getIntensity(cell.count, maxCount);
            const bg = getColorForLevel(level, color);
            return (
              <div
                key={`${cell.col}-${cell.row}`}
                className="w-3 h-3 rounded-[2px] cursor-pointer transition-transform hover:scale-125"
                style={{
                  backgroundColor: bg || undefined,
                  gridColumn: cell.col + 1,
                  gridRow: cell.row + 1,
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                    text: `${cell.date}: ${cell.count}`,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs rounded bg-gray-800 text-white shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}