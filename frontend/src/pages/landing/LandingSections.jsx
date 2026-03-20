import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../constants/theme'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { FEATURES, SAMPLE_INVOICE } from '../../constants/data'


// ── Features ──────────────────────────────────────────────────────────────────
export function FeaturesSection() {
  return (
    <section style={{ padding: '100px 5%', background: COLORS.white }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <Badge color={COLORS.primary}>Everything You Need</Badge>
          <h2 style={{
            fontFamily: FONTS.display, fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 46px)',
            color: COLORS.dark, margin: '16px 0',
          }}>
            Built for Courier Franchises
          </h2>
          <p style={{ fontSize: 17, color: COLORS.gray, maxWidth: 520, margin: '0 auto' }}>
            Every feature is crafted around the real daily workflow of DTDC franchise owners.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 22,
        }}>
          {FEATURES.map(f => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon, title, desc }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? COLORS.primaryMid : COLORS.bgPage,
        borderRadius: RADIUS.lg,
        padding: '28px 26px',
        border: `1px solid ${hovered ? COLORS.primary : COLORS.border}`,
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? SHADOWS.md : 'none',
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: 34, marginBottom: 16 }}>{icon}</div>
      <h3 style={{
        fontFamily: FONTS.display, fontWeight: 700,
        fontSize: 17, color: COLORS.dark, marginBottom: 10,
      }}>{title}</h3>
      <p style={{ fontSize: 14, color: COLORS.gray, lineHeight: 1.7 }}>{desc}</p>
    </div>
  )
}

// ── Invoice Preview ───────────────────────────────────────────────────────────
export function InvoicePreview() {
  const navigate = useNavigate()

  return (
    <section style={{
      padding: '100px 5%',
      background: 'linear-gradient(160deg, #F8FAFF 0%, #EEF3FF 100%)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 64, alignItems: 'center',
      }}>
        {/* Copy */}
        <div>
          <Badge color={COLORS.accent}>Invoice Generator</Badge>
          <h2 style={{
            fontFamily: FONTS.display, fontWeight: 800,
            fontSize: 'clamp(26px, 3.5vw, 44px)',
            color: COLORS.dark, margin: '16px 0 20px',
          }}>
            Professional Invoices in Seconds
          </h2>
          <p style={{ fontSize: 16, color: COLORS.gray, lineHeight: 1.75, marginBottom: 32 }}>
            Create GST-compliant, branded invoices with your franchise logo. Supports bulk printing,
            email delivery, and PDF export. Clients get notified automatically.
          </p>
          {[
            'Add your franchise logo & branding',
            'GST & tax calculations built-in',
            'One-click bulk billing for account clients',
            'Auto-email with PDF attachment',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: COLORS.primary, color: COLORS.white,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, flexShrink: 0,
              }}>✓</div>
              <span style={{ fontSize: 15, color: COLORS.darkMuted }}>{item}</span>
            </div>
          ))}

        </div>

        {/* Invoice Card */}
        <div style={{
          background: COLORS.white,
          borderRadius: RADIUS.xl,
          border: `1px solid ${COLORS.border}`,
          boxShadow: SHADOWS.lg,
          overflow: 'hidden',
        }}>
          <div style={{ background: COLORS.primary, padding: '22px 28px', color: COLORS.white }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 17 }}>
                  📦 My Courier Franchise
                </div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
                  DTDC Authorized • GST: 09ABCDE1234F1Z5
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, opacity: 0.75 }}>Invoice</div>
                <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 14 }}>
                  {SAMPLE_INVOICE.number}
                </div>
                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>{SAMPLE_INVOICE.date}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '18px 24px' }}>
            <div style={{ fontSize: 11, color: COLORS.gray, marginBottom: 3 }}>BILL TO</div>
            <div style={{ fontWeight: 600, color: COLORS.dark, marginBottom: 18 }}>{SAMPLE_INVOICE.client}</div>

            <table style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                  {['Description', 'Wt.', 'Rate', 'Amt'].map(h => (
                    <th key={h} style={{ padding: '6px 0', color: COLORS.gray, fontWeight: 600, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_INVOICE.items.map(item => (
                  <tr key={item.desc} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                    <td style={{ padding: '8px 0', color: COLORS.darkMuted }}>{item.desc}</td>
                    <td style={{ padding: '8px 0', color: COLORS.gray }}>{item.weight}</td>
                    <td style={{ padding: '8px 0', color: COLORS.gray }}>₹{item.rate}</td>
                    <td style={{ padding: '8px 0', fontWeight: 600, color: COLORS.dark }}>₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `2px solid ${COLORS.border}` }}>
              {[
                ['Subtotal', `₹${SAMPLE_INVOICE.subtotal}`],
                ['GST @ 18%', `₹${SAMPLE_INVOICE.gst.toFixed(2)}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.gray, marginBottom: 5 }}>
                  <span>{k}</span><span>{v}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: FONTS.display, fontWeight: 800, fontSize: 18,
                color: COLORS.primary, marginTop: 8,
              }}>
                <span>Total</span>
                <span>₹{SAMPLE_INVOICE.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


// ── CTA ───────────────────────────────────────────────────────────────────────
export function CTASection() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <section style={{
      padding: '100px 5%',
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -80, right: -80, width: 360, height: 360,
        background: 'rgba(255,255,255,0.05)', borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, left: '20%', width: 240, height: 240,
        background: 'rgba(255,255,255,0.04)', borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <h2 style={{
          fontFamily: FONTS.display, fontWeight: 800,
          fontSize: 'clamp(28px, 4vw, 50px)',
          color: COLORS.white, marginBottom: 20,
        }}>
          Ready to Streamline Your Franchise?
        </h2>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.78)', marginBottom: 44, lineHeight: 1.75 }}>
          Join and start saving hours every day.
          Start your journey.
        </p>
        <button
          onClick={() => navigate('/signup')}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: COLORS.white, color: COLORS.primary,
            border: 'none', borderRadius: RADIUS.lg,
            padding: '18px 48px', fontSize: 18, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.22s',
            transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
            boxShadow: hovered ? '0 20px 48px rgba(0,0,0,0.28)' : '0 8px 24px rgba(0,0,0,0.18)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Get Started →
        </button>
        
      </div>
    </section>
  )
}
