import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { COLORS, FONTS, RADIUS, SHADOWS } from '../constants/theme'
import { callApi } from '../utils/api'

const STEPS = ['Account', 'Franchise' , "Welcome"]

export default function SignupPage() {
  const navigate          = useNavigate()
  const [step, setStep]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [showPw,  setShowPw]  = useState(false)
  const [errors,  setErrors]  = useState({})

  const [form, setForm] = useState({
    // Step 0 — Account
    name: '', email: '', phone_number: '', password: '', confirm: '',
    // Step 1 — Franchise
    frenchise_name: '', dtdc_frenchise_code: '', city: '', gst_number: '',
  })

  const set = k => e => {
    setForm(p => ({ ...p, [k]: e.target.value }))
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  const validateStep = () => {
    const e = {}
    if (step === 0) {
      if (!form.name)                               e.name     = 'Full name is required'
      if (!form.email)                              e.email    = 'Email is required'
      else if (!/\S+@\S+\.\S+/.test(form.email))   e.email    = 'Enter a valid email'
      if (!form.phone_number || form.phone_number.length < 10)    e.phone_number  = 'Enter a valid 10-digit mobile'
      if (!form.password || form.password.length < 6) e.password = 'Minimum 6 characters'
      if (form.password !== form.confirm)           e.confirm  = 'Passwords do not match'
    }
    if (step === 1) {
      if (!form.frenchise_name) e.frenchise_name = 'Franchise name is required'
      if (!form.city)          e.city          = 'City is required'
    }
    return e
  }

  const handleNext = () => {
    const e = validateStep()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    
      const e = validateStep()
      if (Object.keys(e).length) { setErrors(e); return }
  
      setErrors({})
      setLoading(true)

      const body_data = {
        name: form.name,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password,
        frenchise_name: form.frenchise_name,
        city: form.city,
        dtdc_frenchise_code: form.dtdc_frenchise_code,
        gst_number : form.gst_number
      }
      try {
        const res = await callApi({
          url:    '/api/signup',
          method: 'POST',
          body:   body_data,
        })
        if (res.access_token) {
          localStorage.setItem('access_token', res.access_token)
          localStorage.setItem('refresh_token', res.refresh_token)
          setStep(s => s + 1)
        } else {
          setErrors({ password: 'Invalid credentials. Please try again.' })
        }
      } catch (err) {
        console.error(err)
        setErrors({ password: err.message || 'Signup failed. Please try again.' })
      } finally {
        setLoading(false)
      }
      
    }
  




  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: FONTS.body }}>

      {/* ── Left Panel ── */}
      <div
        className="hide-mobile"
        style={{
          flex: '0 0 40%',
          background: COLORS.dark,
          display: 'flex', flexDirection: 'column',
          padding: '48px 52px',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Decorative */}
        <div style={{
          position: 'absolute', top: -120, right: -120, width: 440, height: 440,
          background: 'radial-gradient(circle, rgba(0,87,255,0.16) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80, width: 340, height: 340,
          background: 'radial-gradient(circle, rgba(255,90,31,0.10) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', zIndex: 1 }}>
          <div style={{
            width: 40, height: 40, borderRadius: RADIUS.md,
            background: COLORS.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>📦</div>
          <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 22, color: '#fff' }}>
            Courier<span style={{ color: '#5B8CFF' }}>Billing</span>
          </span>
        </Link>

        {/* Step indicator */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 1 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20, letterSpacing: '0.05em' }}>
            GETTING STARTED
          </p>
          {STEPS.map((s, i) => (
            <StepIndicator
              key={s}
              label={s}
              number={i + 1}
              status={i < step ? 'done' : i === step ? 'active' : 'pending'}
              isLast={i === STEPS.length - 1}
            />
          ))}

          <div style={{ marginTop: 52 }}>
            <h2 style={{
              fontFamily: FONTS.display, fontWeight: 800, fontSize: 32,
              color: '#fff', lineHeight: 1.2, marginBottom: 14,
            }}>
              {step === 0 && 'Create your account'}
              {step === 1 && 'Tell us about\nyour franchise'}
              {step === 2 && 'Welcome to Courier Billing'}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
              {step === 0 && 'Set up your login credentials. You can always change these later from settings.'}
              {step === 1 && 'Help us personalize your billing setup. Your DTDC franchise code links your account.'}
              {step === 2 && 'Start a easy billing and management journey...'}
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', zIndex: 1, lineHeight: 1.6 }}>
          By creating an account you agree to our{' '}
          <span style={{ color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>Terms of Service</span>{' '}
          and{' '}
          <span style={{ color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>Privacy Policy</span>.
        </p>
      </div>

      {/* ── Right Panel (Form) ── */}
      <div style={{
        flex: 1,
        background: COLORS.bgPage,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: step === 2 ? 680 : 440 }}>

          {/* Mobile logo */}
          <div className="hide-desktop" style={{ marginBottom: 28 }}>
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

          {/* Mobile step pills */}
          <div className="hide-desktop" style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 9999,
                background: i <= step ? COLORS.primary : COLORS.border,
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          {/* ── Step 0: Account ── */}
          {step === 0 && (
            <div style={{ animation: 'fadeInUp 0.35s ease' }}>
              <StepHeader
                step="Step 1 of 3"
                title="Create your account"
                subtitle="Start your journey today"
              />

              <FormField label="Full Name *"     type="text"     placeholder="Ramesh Gupta"            value={form.name}     onChange={set('name')}     error={errors.name}     icon="👤" />
              <FormField label="Email address *" type="email"    placeholder="ramesh@myfranchise.in"   value={form.email}    onChange={set('email')}    error={errors.email}    icon="✉️" />
              <FormField label="Mobile Number *" type="tel"      placeholder="98765 43210"              value={form.phone_number}    onChange={set('phone_number')}    error={errors.phone_number}    icon="📱" />
              <FormField
                label="Password *" type={showPw ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={form.password} onChange={set('password')} error={errors.password} icon="🔒"
                rightIcon={
                  <button onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: COLORS.gray }}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                }
              />
              <FormField label="Confirm Password *" type="password" placeholder="Re-enter password"   value={form.confirm}  onChange={set('confirm')}  error={errors.confirm}  icon="🔒" />

              <NextButton onClick={handleNext} label="Continue to Franchise Info →" />

              <p style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray, marginTop: 20 }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: COLORS.primary, fontWeight: 600, textDecoration: 'none' }}>
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* ── Step 1: Franchise ── */}
          {step === 1 && (
            <div style={{ animation: 'fadeInUp 0.35s ease' }}>
              <StepHeader
                step="Step 2 of 3"
                title="Your franchise details"
                subtitle="Used on your invoices and reports"
              />

              <FormField label="Franchise / Business Name *" type="text" placeholder="My Courier Franchise" value={form.frenchise_name} onChange={set('frenchise_name')} error={errors.frenchise_name} icon="🏪" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="City *"             type="text" placeholder="Jaipur"        value={form.city}     onChange={set('city')}     error={errors.city}  icon="📍" />
                <FormField label="DTDC Franchise Code" type="text" placeholder="DTC-JP-0042"  value={form.dtdc_frenchise_code} onChange={set('dtdc_frenchise_code')}               icon="🆔" />
              </div>

              <FormField label="GSTIN (optional)" type="text" placeholder="09ABCDE1234F1Z5" value={form.gst_number} onChange={set('gst_number')} icon="📋"
                helpText="You can add this later from Settings → Franchise Profile"
              />

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <BackButton onClick={() => { setStep(0); setErrors({}) }} />
                <NextButton onClick={handleSubmit} label="Continue to Signup →" flex />
              </div>
            </div>
          )}

          {/* ── Step 2: Welcome ── */}
{step === 2 && (
  <div style={{ animation: 'fadeInUp 0.35s ease', textAlign: 'center' }}>
    <StepHeader
      step="Step 3 of 3"
      title="Welcome aboard!"
      subtitle="Your franchise account has been successfully created."
    />

    <p style={{ fontSize: 16, color: COLORS.dark, marginBottom: 32 }}>
      🎉 You’re all set. Click below to go to your dashboard and start managing your franchise.
    </p>

    <button
      onClick={() => navigate('/app/bookings')}
      style={{
        padding: '14px 24px',
        fontSize: 16,
        fontWeight: 700,
        color: '#fff',
        background: COLORS.primary,
        border: 'none',
        borderRadius: RADIUS.md,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = COLORS.primaryDark}
      onMouseLeave={e => e.currentTarget.style.background = COLORS.primary}
    >
      Go to Account 🚀
    </button>
  </div>
)}

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepHeader({ step, title, subtitle }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{
        display: 'inline-block', fontSize: 11, fontWeight: 700,
        color: COLORS.primary, background: COLORS.primaryLight,
        padding: '4px 12px', borderRadius: 9999, marginBottom: 12,
        letterSpacing: '0.05em',
      }}>
        {step.toUpperCase()}
      </div>
      <h1 style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 28, color: COLORS.dark, marginBottom: 6 }}>
        {title}
      </h1>
      <p style={{ fontSize: 14, color: COLORS.gray }}>{subtitle}</p>
    </div>
  )
}

function FormField({ label, type, placeholder, value, onChange, error, icon, rightIcon, helpText }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.darkMuted, marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{ position: 'absolute', left: 12, fontSize: 14, pointerEvents: 'none', zIndex: 1 }}>{icon}</span>
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
            fontSize: 14, fontFamily: FONTS.body,
            color: COLORS.dark, background: COLORS.white,
            border: `1.5px solid ${error ? COLORS.danger : focused ? COLORS.primary : COLORS.border}`,
            borderRadius: RADIUS.md, outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? `0 0 0 3px ${COLORS.primary}18` : 'none',
          }}
        />
        {rightIcon && <div style={{ position: 'absolute', right: 12, zIndex: 1 }}>{rightIcon}</div>}
      </div>
      {error    && <p style={{ fontSize: 12, color: COLORS.danger,  marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><span>⚠️</span>{error}</p>}
      {helpText && !error && <p style={{ fontSize: 12, color: COLORS.gray, marginTop: 5 }}>{helpText}</p>}
    </div>
  )
}

function NextButton({ onClick, label, flex }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: flex ? 1 : undefined,
        width: flex ? undefined : '100%',
        padding: '13px 20px',
        background: hov ? COLORS.primaryDark : COLORS.primary,
        color: COLORS.white,
        border: 'none', borderRadius: RADIUS.md,
        fontSize: 15, fontWeight: 700,
        fontFamily: FONTS.body, cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hov ? 'translateY(-1px)' : 'none',
        boxShadow: hov ? SHADOWS.btn : 'none',
      }}
    >
      {label}
    </button>
  )
}

function BackButton({ onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '13px 20px',
        background: hov ? COLORS.grayLight : COLORS.white,
        color: COLORS.gray,
        border: `1.5px solid ${COLORS.border}`,
        borderRadius: RADIUS.md, fontSize: 14, fontWeight: 500,
        fontFamily: FONTS.body, cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      ← Back
    </button>
  )
}

function SubmitButton({ onClick, loading, label, flex }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: flex ? 1 : undefined,
        width: flex ? undefined : '100%',
        padding: '13px 20px',
        background: loading ? COLORS.primaryLight : hov ? COLORS.primaryDark : COLORS.primary,
        color: loading ? COLORS.primary : COLORS.white,
        border: 'none', borderRadius: RADIUS.md,
        fontSize: 15, fontWeight: 700,
        fontFamily: FONTS.body,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transform: hov && !loading ? 'translateY(-1px)' : 'none',
        boxShadow: hov && !loading ? SHADOWS.btn : 'none',
      }}
    >
      {loading ? (
        <>
          <div style={{
            width: 16, height: 16,
            border: `2px solid ${COLORS.primary}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          Creating your account...
        </>
      ) : label}
    </button>
  )
}

function StepIndicator({ label, number, status, isLast }) {
  const colors = {
    done:    { bg: COLORS.success, text: '#fff',                     line: COLORS.success },
    active:  { bg: COLORS.primary, text: '#fff',                     line: 'rgba(255,255,255,0.15)' },
    pending: { bg: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.35)', line: 'rgba(255,255,255,0.1)' },
  }
  const c = colors[status]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: isLast ? 0 : 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: c.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: c.text,
          flexShrink: 0,
          transition: 'all 0.3s',
        }}>
          {status === 'done' ? '✓' : number}
        </div>
        {!isLast && (
          <div style={{ width: 2, height: 32, background: c.line, borderRadius: 9999 }} />
        )}
      </div>
      <div style={{ paddingTop: 5 }}>
        <div style={{
          fontSize: 14, fontWeight: status === 'active' ? 700 : 500,
          color: status === 'pending' ? 'rgba(255,255,255,0.35)' : '#fff',
          transition: 'color 0.3s',
        }}>
          {label}
        </div>
      </div>
    </div>
  )
}

function PlanCard({ plan, selected, onSelect }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `${selected ? 2 : 1.5}px solid ${selected ? plan.color : hov ? COLORS.border : COLORS.border}`,
        borderRadius: RADIUS.lg, padding: '20px 18px',
        background: selected ? plan.color + '0D' : COLORS.white,
        cursor: 'pointer', transition: 'all 0.2s',
        transform: selected || hov ? 'translateY(-2px)' : 'none',
        boxShadow: selected ? `0 8px 24px ${plan.color}22` : hov ? SHADOWS.sm : 'none',
        position: 'relative',
      }}
    >
      {plan.tag && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          background: plan.color, color: '#fff',
          fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 9999,
          whiteSpace: 'nowrap',
        }}>
          {plan.tag}
        </div>
      )}

      {/* Selected radio */}
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        border: `2px solid ${selected ? plan.color : COLORS.border}`,
        background: selected ? plan.color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12, transition: 'all 0.2s',
      }}>
        {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
      </div>

      <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 16, color: COLORS.dark, marginBottom: 4 }}>
        {plan.label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 14 }}>
        <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 24, color: plan.color }}>{plan.price}</span>
        <span style={{ fontSize: 12, color: COLORS.gray }}>{plan.period}</span>
      </div>

      {plan.features.map(f => (
        <div key={f} style={{ display: 'flex', gap: 6, marginBottom: 7, fontSize: 12, color: COLORS.darkMuted }}>
          <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0 }}>✓</span>
          {f}
        </div>
      ))}
    </div>
  )
}
