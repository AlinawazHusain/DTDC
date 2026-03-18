import { useNavigate } from 'react-router-dom'
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../constants/theme'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/StatusBadge'
import { BOOKINGS } from '../../constants/data'

export default function HeroSection() {
  const navigate = useNavigate()

  return (
    <section style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #F8FAFF 0%, #EEF3FF 55%, #E8F0FF 100%)',
      display: 'flex', alignItems: 'center',
      padding: '120px 5% 80px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* BG blobs */}
      <div style={{
        position: 'absolute', top: -120, right: -120, width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(0,87,255,0.07) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -80, width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(255,90,31,0.05) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 64, alignItems: 'center',
        }}>
          {/* ── Left Copy ── */}
          <div className="fade-in-up">
            

            <h1 style={{
              fontFamily: FONTS.display, fontWeight: 800,
              fontSize: 'clamp(36px, 5vw, 60px)',
              lineHeight: 1.08, color: COLORS.dark, marginBottom: 24,
            }}>
              Courier Billing,{' '}
              <span style={{
                background: 'linear-gradient(90deg, #0057FF, #5B8CFF)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Simplified.
              </span>
            </h1>

            <p style={{ fontSize: 18, color: '#4B5563', lineHeight: 1.75, marginBottom: 40, maxWidth: 500 }}>
              The all-in-one billing & management software built exclusively for DTDC franchisees.
              Book consignments, generate GST invoices, track payments — from one dashboard.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 52 }}>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/app/dashboard')}
              >
                View Demo Dashboard
              </Button>
            </div>

          </div>

          {/* ── Right – Dashboard Preview ── */}
          <div style={{ position: 'relative' }} className="fade-in">
            <div style={{
              background: COLORS.white,
              borderRadius: RADIUS.xl,
              border: `1px solid ${COLORS.border}`,
              boxShadow: SHADOWS.lg,
              overflow: 'hidden',
              transform: 'perspective(1000px) rotateY(-4deg) rotateX(2deg)',
            }}>
              {/* Mac titlebar */}
              <div style={{ background: COLORS.dark, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 7 }}>
                {['#FF5F57', '#FEBC2E', '#28C840'].map(c => (
                  <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
                ))}
                <span style={{ color: '#6B7280', fontSize: 11, marginLeft: 8 }}>
                  courierbilling.in — Dashboard
                </span>
              </div>

              {/* KPI Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '14px 14px 0' }}>
                {[
                  { label: "Today's Revenue", value: '₹8,240', change: '+12%', up: true },
                  { label: 'Bookings',         value: '47',     change: '+5',   up: true },
                  { label: 'Pending Bills',    value: '₹3,180', change: '3 clients', up: false },
                ].map(k => (
                  <div key={k.label} style={{ background: COLORS.bgPage, borderRadius: RADIUS.md, padding: 12 }}>
                    <div style={{ fontSize: 10, color: COLORS.gray, marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 18, color: COLORS.dark }}>
                      {k.value}
                    </div>
                    <div style={{ fontSize: 10, color: k.up ? COLORS.success : COLORS.warning }}>
                      {k.up ? '▲' : '●'} {k.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini table */}
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.darkMuted, marginBottom: 8 }}>
                  Recent Consignments
                </div>
                {BOOKINGS.slice(0, 3).map(b => (
                  <div key={b.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 0', borderBottom: `1px solid ${COLORS.grayLight}`, fontSize: 11,
                  }}>
                    <span style={{ color: COLORS.primary, fontWeight: 700 }}>{b.id}</span>
                    <span style={{ color: COLORS.darkMuted }}>{b.client}</span>
                    <span style={{ color: COLORS.gray }}>{b.dest}</span>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <div style={{
              position: 'absolute', bottom: -22, left: -22,
              background: COLORS.white,
              borderRadius: RADIUS.lg,
              padding: '12px 18px',
              boxShadow: SHADOWS.xl,
              display: 'flex', alignItems: 'center', gap: 10,
              zIndex: 10,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: COLORS.successLight,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>✅</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.dark }}>Invoice Sent!</div>
                <div style={{ fontSize: 11, color: COLORS.gray }}>Spark Electronics — ₹673</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
