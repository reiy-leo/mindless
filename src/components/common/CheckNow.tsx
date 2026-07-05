interface CheckNowProps {
  abandoned?: boolean
  checked: boolean
  className?: string
  color1: string
  color2?: string
  hasSteps: boolean
  onClick?: (e: React.MouseEvent) => void
  size?: number
}

export default function CheckNow({
  abandoned = false,
  checked,
  hasSteps,
  color1,
  color2,
  size = 16,
  onClick,
  className,
}: CheckNowProps) {
  const r = 4
  const pad = 4
  const defaultColor = 'oklch(92.8% 0.006 264.531)'

  return (
    <svg
      className={className}
      fill="none"
      height={size}
      onMouseDown={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>check now</title>
      {/* Outer rounded square */}
      <rect
        fill={`hsl(from ${color1} h s l / 30%)`}
        height="15"
        rx={r}
        stroke={color1 ?? defaultColor}
        strokeWidth={1}
        width="15"
        x="0.5"
        y="0.5"
      />

      {abandoned ? (
        <path
          d="M5 5L11 11M11 5L5 11"
          stroke={color1 ?? defaultColor}
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      ) : checked ? (
        <path
          d="M4 8.5L6.5 11L12 5"
          stroke={color1 ?? defaultColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      ) : hasSteps ? (
        <rect fill={color2 ?? defaultColor} height={16 - pad * 2} rx={2} width={16 - pad * 2} x={pad} y={pad} />
      ) : (
        <></>
      )}
    </svg>
  )
}
