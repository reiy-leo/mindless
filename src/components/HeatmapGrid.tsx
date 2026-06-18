import { useMemo, useState } from 'react';

interface HeatmapGridProps {
  data: Record<string, number>;
  color?: string;
  weeks?: number;
}

const CELL_SIZE = 14;
const GAP = 3;

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

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HeatmapGrid({ data, color = '#3B82F6', weeks = 52 }: HeatmapGridProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { grid, maxCount } = useMemo(() => {
    const today = new Date();
    const todayDay = today.getDay();
    const daysToMonday = (todayDay + 6) % 7;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysToMonday);

    const max = Math.max(1, ...Object.values(data));

    const cells: { date: string; count: number; row: number; col: number }[] = [];

    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(thisMonday);
      weekStart.setDate(thisMonday.getDate() - w * 7);

      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(weekStart);
        cellDate.setDate(weekStart.getDate() + d);
        if (cellDate > today) continue;

        const key = formatDate(cellDate);
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

  const gridWidth = weeks * CELL_SIZE + (weeks - 1) * GAP;

  return (
    <div className="relative">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${weeks}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
          gap: `${GAP}px`,
          width: `${gridWidth}px`,
        }}
      >
        {grid.map((cell) => {
          const level = getIntensity(cell.count, maxCount);
          const bg = getColorForLevel(level, color);
          return (
            <div
              key={`${cell.col}-${cell.row}`}
              className="rounded-[2px] cursor-pointer transition-transform hover:scale-125"
              style={{
                backgroundColor: bg || '#f3f4f6',
                border: level === 0 ? '1px solid #e5e7eb' : 'none',
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
