import { COLORS } from '../../constants/theme'

const STATUS_MAP = {
  Delivered:  { color: COLORS.success,  bg: COLORS.successLight, dot: true  },
  'In Transit':{ color: COLORS.primary,  bg: COLORS.primaryLight,  dot: true  },
  Booked:     { color: COLORS.warning,  bg: COLORS.warningLight, dot: false },
  Cancelled:  { color: COLORS.danger,   bg: COLORS.dangerLight,  dot: false },
  Paid:       { color: COLORS.success,  bg: COLORS.successLight, dot: true  },
  Unpaid:     { color: COLORS.warning,  bg: COLORS.warningLight, dot: false },
  Overdue:    { color: COLORS.danger,   bg: COLORS.dangerLight,  dot: false },
  Partial:    { color: COLORS.info,     bg: COLORS.infoLight,    dot: false },
}

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { color: COLORS.gray, bg: COLORS.grayLight, dot: false }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 9999,
        whiteSpace: 'nowrap',
      }}
    >
      {s.dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: s.color,
            flexShrink: 0,
          }}
        />
      )}
      {status}
    </span>
  )
}
