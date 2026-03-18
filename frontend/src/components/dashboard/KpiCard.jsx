import { useState } from 'react'
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme'

/**
 * KPI summary card used in dashboard and reports.
 */
export default function KpiCard({ label, value, change, up, icon, color = COLORS.primary }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: '20px 22px',
        border: `1px solid ${hovered ? color : COLORS.border}`,
        boxShadow: hovered ? SHADOWS.md : 'none',
        transition: 'all 0.22s ease',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.gray, lineHeight: 1.4 }}>{label}</span>
        <div style={{
          width: 36, height: 36, borderRadius: RADIUS.md,
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {icon}
        </div>
      </div>

      <div style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 800,
        fontSize: 26,
        color: COLORS.dark,
        marginBottom: 8,
        lineHeight: 1,
      }}>
        {value}
      </div>

      {change && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 12, color: up ? COLORS.success : COLORS.warning,
          fontWeight: 500,
        }}>
          <span>{up ? '▲' : '●'}</span>
          <span>{change}</span>
        </div>
      )}
    </div>
  )
}
