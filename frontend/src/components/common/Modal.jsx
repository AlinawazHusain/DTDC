import { useEffect } from 'react'
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme'
import Button from './Button'

/**
 * Generic modal overlay.
 * size: 'sm' | 'md' | 'lg' | 'xl'
 */
export default function Modal({ isOpen, onClose, title, children, size = 'md', footer = null }) {
  const widths = { sm: 400, md: 560, lg: 720, xl: 900 }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,15,30,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: COLORS.white,
          borderRadius: RADIUS.xl,
          width: '100%',
          maxWidth: widths[size],
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: SHADOWS.xl,
          animation: 'fadeInUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: RADIUS.md,
              background: COLORS.grayLight, border: 'none',
              cursor: 'pointer', fontSize: 18, color: COLORS.gray,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = COLORS.border}
            onMouseLeave={e => e.currentTarget.style.background = COLORS.grayLight}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '16px 24px',
            borderTop: `1px solid ${COLORS.border}`,
            display: 'flex', justifyContent: 'flex-end', gap: 12,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
