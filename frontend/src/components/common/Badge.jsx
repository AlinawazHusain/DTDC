import { COLORS } from '../../constants/theme'

/**
 * Pill badge used for labels and tags.
 * @param {string}  color   – hex color (defaults to primary blue)
 * @param {string}  size    – 'sm' | 'md'
 * @param {boolean} outline – outlined style variant
 */
export default function Badge({ children, color = COLORS.primary, size = 'md', outline = false }) {
  const sizes = {
    sm: { fontSize: 10, padding: '2px 8px' },
    md: { fontSize: 11, padding: '3px 12px' },
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: outline ? 'transparent' : color + '18',
        color,
        border: outline ? `1px solid ${color}40` : 'none',
        borderRadius: 9999,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...sizes[size],
      }}
    >
      {children}
    </span>
  )
}
