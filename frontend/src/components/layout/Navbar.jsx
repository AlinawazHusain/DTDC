import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { COLORS, FONTS, RADIUS } from '../../constants/theme'
// import { NAV_LINKS } from '../../constants/data'
import Button from '../common/Button'

export default function Navbar() {
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Close mobile menu on route change / outside click
  useEffect(() => {
    if (!mobileOpen) return
    const close = () => setMobileOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [mobileOpen])

  return (
    <>
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
          background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(14px)' : 'none',
          borderBottom: scrolled ? `1px solid ${COLORS.border}` : 'none',
          transition: 'all 0.3s ease',
          padding: '0 5%',
        }}
      >
        <div
          style={{
            maxWidth: 1200, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: 72,
          }}
        >
          {/* ── Logo ── */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div
              style={{
                width: 38, height: 38, borderRadius: RADIUS.md,
                background: 'linear-gradient(135deg, #0057FF, #003FCC)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}
            >
              📦
            </div>
            <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 20, color: COLORS.dark }}>
              Courier<span style={{ color: COLORS.primary }}>Billing</span>
            </span>
          </Link>


          {/* ── Desktop Actions ── */}
          <div
            className="hide-mobile"
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            {/* <button
              onClick={() => navigate('/app/dashboard')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 500, color: COLORS.darkMuted,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Login
            </button> */}

            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent',
                border: `2px solid ${COLORS.primary}`,
                borderRadius: RADIUS.md,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.primary,
                fontFamily: "'DM Sans', sans-serif",
                padding: '6px 16px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = COLORS.primary
                e.currentTarget.style.color = COLORS.white
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = COLORS.primary
              }}
            >
              Login
            </button>
            <Button onClick={() => navigate('/signup')} size="md">
              Sign up →
            </Button>
          </div>

          {/* ── Mobile Hamburger ── */}
          <button
            className="hide-desktop"
            onClick={e => { e.stopPropagation(); setMobileOpen(prev => !prev) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, color: COLORS.dark,
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: RADIUS.md,
            }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* ── Mobile Dropdown Menu ── */}
      {mobileOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', top: 72, left: 0, right: 0, zIndex: 899,
            background: COLORS.white,
            borderBottom: `1px solid ${COLORS.border}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: '16px 5% 24px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}
        >

          {/* Divider */}
          <div style={{ height: 1, background: COLORS.border, margin: '12px 0' }} />

          {/* Auth actions */}
          {/* <button
            onClick={() => { navigate('/app/dashboard'); setMobileOpen(false) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 500, color: COLORS.darkMuted,
              padding: '10px 0', textAlign: 'left',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Login
          </button> */}
          <button
            onClick={() => navigate('/app/dashboard')}
            style={{
              background: 'transparent',
              border: `2px solid ${COLORS.primary}`,
              borderRadius: RADIUS.md,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.primary,
              fontFamily: "'DM Sans', sans-serif",
              padding: '6px 16px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = COLORS.primary
              e.currentTarget.style.color = COLORS.white
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = COLORS.primary
            }}
          >
            Login
          </button>
          <Button
            onClick={() => { navigate('/app/dashboard'); setMobileOpen(false) }}
            fullWidth
          >
            Sign up →
          </Button>
        </div>
      )}
    </>
  )
}
