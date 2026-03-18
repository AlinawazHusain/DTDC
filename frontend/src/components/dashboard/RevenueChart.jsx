import { COLORS, RADIUS } from '../../constants/theme'
import { MONTHLY_REVENUE } from '../../constants/data'

export default function RevenueChart() {
  const max = Math.max(...MONTHLY_REVENUE.map(d => d.revenue))

  return (
    <div style={{
      background: COLORS.white,
      borderRadius: RADIUS.lg,
      border: `1px solid ${COLORS.border}`,
      padding: '22px 24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: COLORS.dark }}>
            Revenue Overview
          </div>
          <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>Last 6 months</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Legend color={COLORS.primary} label="Revenue" />
          <Legend color={COLORS.primaryLight} label="Bookings" />
        </div>
      </div>

      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180 }}>
        {MONTHLY_REVENUE.map((d, i) => {
          const heightPct = (d.revenue / max) * 100
          const bookingsPct = (d.bookings / Math.max(...MONTHLY_REVENUE.map(x => x.bookings))) * 100
          const isLast = i === MONTHLY_REVENUE.length - 1

          return (
            <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
              {/* Revenue bar */}
              <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: '100%' }}>
                <div
                  title={`₹${d.revenue.toLocaleString()}`}
                  style={{
                    flex: 1,
                    height: `${heightPct}%`,
                    background: isLast
                      ? `linear-gradient(180deg, ${COLORS.primary}, ${COLORS.primaryDark})`
                      : `${COLORS.primary}55`,
                    borderRadius: `${RADIUS.sm}px ${RADIUS.sm}px 0 0`,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    minHeight: 4,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                />
                <div
                  title={`${d.bookings} bookings`}
                  style={{
                    flex: 1,
                    height: `${bookingsPct * 0.7}%`,
                    background: isLast ? `${COLORS.accent}cc` : `${COLORS.accent}33`,
                    borderRadius: `${RADIUS.sm}px ${RADIUS.sm}px 0 0`,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    minHeight: 4,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                />
              </div>
              <div style={{ fontSize: 11, color: COLORS.gray, fontWeight: 500 }}>{d.month}</div>
            </div>
          )
        })}
      </div>

      {/* Y-axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>
        <span style={{ fontSize: 11, color: COLORS.gray }}>Total Revenue</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark, fontFamily: "'Syne', sans-serif" }}>
          ₹{MONTHLY_REVENUE.reduce((s, d) => s + d.revenue, 0).toLocaleString()}
        </span>
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 12, color: COLORS.gray }}>{label}</span>
    </div>
  )
}
