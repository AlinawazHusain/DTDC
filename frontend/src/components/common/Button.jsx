import { useState } from 'react'
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme'

/**
 * Multi-variant button.
 * variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * size:    'sm' | 'md' | 'lg'
 */
export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  type = 'button',
  icon = null,
  style: extraStyle = {},
}) {
  const [hovered, setHovered] = useState(false)

  const sizes = {
    sm: { padding: '7px 14px', fontSize: 13 },
    md: { padding: '10px 20px', fontSize: 14 },
    lg: { padding: '14px 32px', fontSize: 16 },
  }

  const variants = {
    primary: {
      background:  hovered ? COLORS.primaryDark : COLORS.primary,
      color:       COLORS.white,
      border:      'none',
      boxShadow:   hovered ? SHADOWS.btn : 'none',
    },
    secondary: {
      background:  hovered ? COLORS.primaryMid : COLORS.primaryLight,
      color:       COLORS.primary,
      border:      'none',
      boxShadow:   'none',
    },
    outline: {
      background:  hovered ? COLORS.primaryLight : 'transparent',
      color:       COLORS.primary,
      border:      `1.5px solid ${COLORS.primary}`,
      boxShadow:   'none',
    },
    ghost: {
      background:  hovered ? COLORS.grayLight : 'transparent',
      color:       COLORS.gray,
      border:      'none',
      boxShadow:   'none',
    },
    danger: {
      background:  hovered ? '#DC2626' : COLORS.danger,
      color:       COLORS.white,
      border:      'none',
      boxShadow:   'none',
    },
  }

  const v = variants[variant] ?? variants.primary

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        borderRadius: RADIUS.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        transform: hovered && !disabled ? 'translateY(-1px)' : 'translateY(0)',
        opacity: disabled ? 0.55 : 1,
        width: fullWidth ? '100%' : 'auto',
        ...sizes[size],
        ...v,
        ...extraStyle,
      }}
    >
      {icon && <span style={{ fontSize: size === 'sm' ? 14 : 16 }}>{icon}</span>}
      {children}
    </button>
  )
}
