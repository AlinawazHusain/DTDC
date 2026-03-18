import DashboardLayout from '../../components/layout/DashboardLayout'
import { COLORS, RADIUS } from '../../constants/theme'
import { MONTHLY_REVENUE, BOOKINGS } from '../../constants/data'
import Button from '../../components/common/Button'

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: COLORS.dark }}>Reports & Analytics</h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>Business performance overview</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" size="sm">📅 Date Range</Button>
          <Button variant="outline" size="sm" icon="📤">Export PDF</Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Revenue (MTD)',  value: '₹1,24,500', change: '+18% vs last month', up: true,  color: COLORS.primary, icon: '💰' },
          { label: 'Total Bookings (MTD)', value: '589',        change: '+24% vs last month', up: true,  color: COLORS.success, icon: '📦' },
          { label: 'Avg. Per Booking',     value: '₹211',       change: '−3% vs last month',  up: false, color: COLORS.warning, icon: '📊' },
          { label: 'Collection Rate',      value: '91%',         change: '+2% vs last month',  up: true,  color: COLORS.purple,  icon: '✅' },
        ].map(k => (
          <div key={k.label} style={{
            background: COLORS.white, borderRadius: RADIUS.lg,
            border: `1px solid ${COLORS.border}`, padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: COLORS.gray }}>{k.label}</span>
              <span style={{ fontSize: 18 }}>{k.icon}</span>
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: k.color, marginBottom: 6 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: k.up ? COLORS.success : COLORS.warning }}>{k.up ? '▲' : '▼'} {k.change}</div>
          </div>
        ))}
      </div>

      {/* Two column charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
        <MonthlyRevenueTable />
        <DestinationBreakdown />
      </div>

      {/* DTDC Comparison Table */}
      <DtdcComparisonTable />
    </DashboardLayout>
  )
}

function MonthlyRevenueTable() {
  const max = Math.max(...MONTHLY_REVENUE.map(d => d.revenue))
  return (
    <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, padding: '20px 22px' }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.dark, marginBottom: 20 }}>
        Monthly Revenue Trend
      </div>
      {MONTHLY_REVENUE.map((d, i) => (
        <div key={d.month} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
            <span style={{ color: COLORS.darkMuted, fontWeight: 500 }}>{d.month} 2025</span>
            <span style={{ fontWeight: 700, color: COLORS.dark }}>₹{d.revenue.toLocaleString()}</span>
          </div>
          <div style={{ height: 6, background: COLORS.grayLight, borderRadius: RADIUS.full, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(d.revenue / max) * 100}%`,
              background: i === MONTHLY_REVENUE.length - 1
                ? `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryDark})`
                : COLORS.primary + '66',
              borderRadius: RADIUS.full,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DestinationBreakdown() {
  const destinations = BOOKINGS.reduce((acc, b) => {
    acc[b.dest] = (acc[b.dest] || 0) + 1
    return acc
  }, {})
  const sorted = Object.entries(destinations).sort((a, b) => b[1] - a[1])
  const total  = sorted.reduce((s, [, v]) => s + v, 0)
  const colors = [COLORS.primary, COLORS.accent, COLORS.success, COLORS.warning, COLORS.purple, COLORS.info]

  return (
    <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, padding: '20px 22px' }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.dark, marginBottom: 20 }}>
        Top Destinations
      </div>
      {sorted.map(([dest, count], i) => (
        <div key={dest} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
            <span style={{ color: COLORS.darkMuted, fontWeight: 500 }}>{dest}</span>
            <span style={{ fontWeight: 700, color: COLORS.dark }}>{count} bookings ({Math.round((count/total)*100)}%)</span>
          </div>
          <div style={{ height: 6, background: COLORS.grayLight, borderRadius: RADIUS.full, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(count / total) * 100}%`,
              background: colors[i % colors.length],
              borderRadius: RADIUS.full,
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DtdcComparisonTable() {
  const rows = [
    { service: 'Document (<500g)', yourRate: 45, dtdcRate: 62, saving: 17  },
    { service: 'Parcel (1kg)',     yourRate: 85, dtdcRate: 110, saving: 25 },
    { service: 'Parcel (2kg)',     yourRate: 130, dtdcRate: 165, saving: 35},
    { service: 'Parcel (5kg)',     yourRate: 260, dtdcRate: 320, saving: 60},
    { service: 'Express (1kg)',    yourRate: 120, dtdcRate: 145, saving: 25},
  ]
  return (
    <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '18px 22px', borderBottom: `1px solid ${COLORS.grayLight}` }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.dark }}>
          Your Rates vs DTDC MRP — Margin Analysis
        </div>
        <div style={{ fontSize: 13, color: COLORS.gray, marginTop: 3 }}>
          Estimated monthly saving at current booking volume
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.bgPage }}>
              {['Service', 'Your Rate (₹)', 'DTDC MRP (₹)', 'Client Saving (₹)', 'Saving %'].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', color: COLORS.gray, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.service} style={{ borderTop: `1px solid ${COLORS.grayLight}` }}
                onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '13px 18px', fontWeight: 500, color: COLORS.dark }}>{r.service}</td>
                <td style={{ padding: '13px 18px', fontWeight: 700, color: COLORS.primary }}>₹{r.yourRate}</td>
                <td style={{ padding: '13px 18px', color: COLORS.gray }}>₹{r.dtdcRate}</td>
                <td style={{ padding: '13px 18px', fontWeight: 700, color: COLORS.success }}>₹{r.saving}</td>
                <td style={{ padding: '13px 18px' }}>
                  <span style={{
                    background: COLORS.successLight, color: COLORS.success,
                    padding: '3px 10px', borderRadius: RADIUS.full,
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {Math.round((r.saving / r.dtdcRate) * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
