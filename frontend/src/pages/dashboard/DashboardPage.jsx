import { COLORS, RADIUS } from '../../constants/theme'
import DashboardLayout from '../../components/layout/DashboardLayout'
import KpiCard from '../../components/dashboard/KpiCard'
import RevenueChart from '../../components/dashboard/RevenueChart'
import RecentBookingsTable from '../../components/dashboard/RecentBookingsTable'
import QuickBookingForm from '../../components/dashboard/QuickBookingForm'
import { KPI_DATA, MONTHLY_REVENUE } from '../../constants/data'

export default function DashboardPage() {
  const weeklyTotal = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 1]

  return (
    <DashboardLayout>
      {/* KPI Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16, marginBottom: 22,
      }}>
        {KPI_DATA.map(k => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* Main content grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
        gap: 20, alignItems: 'start',
      }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <RevenueChart />
          <RecentBookingsTable />
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <QuickBookingForm />
          <WeeklySummary data={weeklyTotal} />
          <AlertsPanel />
        </div>
      </div>
    </DashboardLayout>
  )
}

function WeeklySummary({ data }) {
  return (
    <div style={{
      background: COLORS.primary,
      borderRadius: RADIUS.lg,
      padding: '20px',
      color: COLORS.white,
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 18 }}>
        This Month
      </div>
      {[
        ['Revenue',       `₹${data.revenue.toLocaleString()}`],
        ['Bookings',      data.bookings],
        ['Invoices Sent', '34'],
        ['Collections',   '₹1,12,300'],
      ].map(([k, v]) => (
        <div key={k} style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 13, marginBottom: 12,
          paddingBottom: 12,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.68)' }}>{k}</span>
          <span style={{ fontWeight: 700 }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

function AlertsPanel() {
  const alerts = [
    { icon: '⚠️', msg: 'Sun Pharma invoice overdue by 10 days', color: COLORS.danger },
    { icon: '📦', msg: 'Stationery low — POD bags below 20 units', color: COLORS.warning },
    { icon: '💰', msg: 'Gupta Brothers — ₹5,600 pending collection', color: COLORS.warning },
  ]
  return (
    <div style={{
      background: COLORS.white,
      borderRadius: RADIUS.lg,
      border: `1px solid ${COLORS.border}`,
      padding: '18px 20px',
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.dark, marginBottom: 14 }}>
        🔔 Alerts
      </div>
      {alerts.map((a, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 0',
          borderBottom: i < alerts.length - 1 ? `1px solid ${COLORS.grayLight}` : 'none',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
          <span style={{ fontSize: 13, color: COLORS.darkMuted, lineHeight: 1.5 }}>{a.msg}</span>
        </div>
      ))}
    </div>
  )
}
