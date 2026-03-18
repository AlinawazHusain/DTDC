import { useState } from 'react'
import { COLORS, FONTS, RADIUS } from '../../constants/theme'

export default function Footer() {
  const socialIcons = ['📱', '💬', '📧']

  return (
    <footer style={{ background: COLORS.dark, width: '100%', padding: '72px 5% 32px' }}>
      {/* Top Section: Brand + Social */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 40,
      }}>
        {/* Brand */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: RADIUS.md,
              background: COLORS.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}>
              📦
            </div>
            <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 18, color: COLORS.white }}>
              Courier<span style={{ color: '#5B8CFF' }}>Billing</span>
            </span>
          </div>
          <p style={{ fontSize: 14, color: COLORS.gray, lineHeight: 1.75 }}>
            The billing & management software built exclusively for DTDC franchise owners across India.
          </p>
        </div>

        {/* Social Icons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {socialIcons.map((icon, i) => (
            <SocialIcon key={i} icon={icon} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1F2937', marginTop: 56, paddingTop: 28 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ fontSize: 13, color: '#4B5563' }}>
            © 2026 CourierBilling. All rights reserved.
          </div>
          <div style={{ fontSize: 13, color: '#4B5563' }}>
            Made with ❤️ for Indian courier franchises
          </div>
        </div>
      </div>
    </footer>
  )
}

function SocialIcon({ icon }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        background: hovered ? COLORS.primary : '#1F2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {icon}
    </div>
  )
}