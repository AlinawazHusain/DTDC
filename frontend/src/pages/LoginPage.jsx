import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { COLORS, FONTS, RADIUS, SHADOWS } from '../constants/theme'
import { callApi } from '../utils/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ email: '', password: '', remember: false })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [showPw,  setShowPw]  = useState(false)

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.email)                             e.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email))  e.email    = 'Enter a valid email'
    if (!form.password)                          e.password = 'Password is required'
    else if (form.password.length < 6)           e.password = 'Minimum 6 characters'
    return e
  }

  // ── FIX: handleSubmit is properly INSIDE the component, and properly closed ──
  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setErrors({})
    setLoading(true)

    try {
      const res = await callApi({
        url:    '/api/login',
        method: 'POST',
        body:   { email: form.email, password: form.password },
      })

      if (res.token) {
        localStorage.setItem('jwt', res.token)
        navigate('/app/dashboard')
      } else {
        setErrors({ password: 'Invalid credentials. Please try again.' })
      }
    } catch (err) {
      console.error(err)
      setErrors({ password: err.message || 'Login failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }  // ← FIX 2: handleSubmit closes HERE, before return()

  // ── JSX is now correctly inside LoginPage(), after handleSubmit closes ──
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: FONTS.body }}>

      {/* ── Left Panel (Brand) ── */}
      <div
        className="hide-mobile"
        style={{
          flex: '0 0 45%',
          background: COLORS.dark,
          display: 'flex', flexDirection: 'column',
          padding: '48px 56px',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: -140, right: -140, width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(0,87,255,0.18) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -100, width: 380, height: 380,
          background: 'radial-gradient(circle, rgba(255,90,31,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        {/* Dot-grid texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', zIndex: 1 }}>
          <div style={{
            width: 40, height: 40, borderRadius: RADIUS.md, background: COLORS.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>📦</div>
          <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 22, color: '#fff' }}>
            Courier<span style={{ color: '#5B8CFF' }}>Billing</span>
          </span>
        </Link>

        {/* Mid copy */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,87,255,0.2)', borderRadius: 9999,
            padding: '6px 14px', marginBottom: 28, alignSelf: 'flex-start',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#5B8CFF' }} />
            <span style={{ fontSize: 12, color: '#5B8CFF', fontWeight: 600, letterSpacing: '0.05em' }}>
              TRUSTED BY 12,000+ FRANCHISES
            </span>
          </div>

          <h2 style={{
            fontFamily: FONTS.display, fontWeight: 800, fontSize: 40,
            color: '#fff', lineHeight: 1.15, marginBottom: 20,
          }}>
            Manage your<br />
            franchise billing<br />
            <span style={{ color: '#5B8CFF' }}>effortlessly.</span>
          </h2>

          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, maxWidth: 340 }}>
            Book consignments, generate GST invoices, track payments — all from one clean
            dashboard built for DTDC franchisees.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32, marginTop: 48 }}>
            {[
              { val: '12K+', label: 'Franchises' },
              { val: '99.9%', label: 'Uptime' },
              { val: '4.8★', label: 'Rating' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 22, color: '#fff' }}>{s.val}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: RADIUS.lg, padding: '20px 22px', zIndex: 1,
        }}>
          <div style={{ fontSize: 18, color: '#F59E0B', marginBottom: 10, letterSpacing: 2 }}>★★★★★</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 14 }}>
            "Billing that used to take 3 hours is now done in 20 minutes. The invoice module
            alone saved us ₹18,000 last month."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0057FF, #5B8CFF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
            }}>RG</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Ramesh Gupta</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>DTDC Franchise, Jaipur</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel (Form) ── */}
      <div style={{
        flex: 1, background: COLORS.bgPage,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Mobile logo */}
          <div className="hide-desktop" style={{ marginBottom: 32 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{
                width: 36, height: 36, borderRadius: RADIUS.md, background: COLORS.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>📦</div>
              <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 20, color: COLORS.dark }}>
                Courier<span style={{ color: COLORS.primary }}>Billing</span>
              </span>
            </Link>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 30, color: COLORS.dark, marginBottom: 8 }}>
              Welcome back 👋
            </h1>
            <p style={{ fontSize: 15, color: COLORS.gray }}>
              Sign in to your franchise account
            </p>
          </div>

          {/* Email field */}
          <FormField
            label="Email address"
            type="email"
            placeholder="ramesh@myfranchise.in"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            icon="✉️"
          />

          {/* Password field */}
          <FormField
            label="Password"
            type={showPw ? 'text' : 'password'}
            placeholder="Enter your password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            icon="🔒"
            rightIcon={
              <button
                onClick={() => setShowPw(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: COLORS.gray, padding: '0 2px' }}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            }
          />

          {/* Remember + Forgot */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 28, marginTop: -4,
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: COLORS.darkMuted }}>
              <input
                type="checkbox"
                checked={form.remember}
                onChange={e => setForm(p => ({ ...p, remember: e.target.checked }))}
                style={{ accentColor: COLORS.primary, width: 15, height: 15 }}
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              style={{ fontSize: 14, color: COLORS.primary, textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <SubmitButton onClick={handleSubmit} loading={loading} label="Sign In" />

          {/* Sign up link */}
          <p style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray, marginTop: 24 }}>
            Don't have an account?{' '}
            <Link
              to="/signup"
              style={{ color: COLORS.primary, fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}
            >
              Create one free →
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}  // ← LoginPage closes here (correctly, at the very end)

// ── Sub-components ────────────────────────────────────────────────────────────

function FormField({ label, type, placeholder, value, onChange, error, icon, rightIcon }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.darkMuted, marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{ position: 'absolute', left: 12, fontSize: 15, pointerEvents: 'none', zIndex: 1 }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: `11px 12px 11px ${icon ? '38px' : '14px'}`,
            paddingRight: rightIcon ? '42px' : '14px',
            fontSize: 14, fontFamily: FONTS.body, color: COLORS.dark,
            background: COLORS.white,
            border: `1.5px solid ${error ? COLORS.danger : focused ? COLORS.primary : COLORS.border}`,
            borderRadius: RADIUS.md, outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? `0 0 0 3px ${COLORS.primary}18` : 'none',
          }}
        />
        {rightIcon && (
          <div style={{ position: 'absolute', right: 12, zIndex: 1 }}>{rightIcon}</div>
        )}
      </div>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
          <span style={{ fontSize: 13 }}>⚠️</span>
          <span style={{ fontSize: 12, color: COLORS.danger }}>{error}</span>
        </div>
      )}
    </div>
  )
}

function SubmitButton({ onClick, loading, label }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', padding: '14px',
        background: loading ? COLORS.primaryLight : hov ? COLORS.primaryDark : COLORS.primary,
        color: loading ? COLORS.primary : COLORS.white,
        border: 'none', borderRadius: RADIUS.md,
        fontSize: 15, fontWeight: 700, fontFamily: FONTS.body,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        transform: hov && !loading ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hov && !loading ? SHADOWS.btn : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}
    >
      {loading ? (
        <>
          <span style={{
            width: 16, height: 16,
            border: `2px solid ${COLORS.primary}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            display: 'inline-block',
          }} />
          Signing in...
        </>
      ) : label}
    </button>
  )
}