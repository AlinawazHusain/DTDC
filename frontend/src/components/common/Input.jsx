import { useState } from 'react'
import { COLORS, RADIUS } from '../../constants/theme'

/**
 * Reusable form input / select / textarea.
 * type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'search'
 */
export default function Input({
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  options = [],       // for type='select'
  rows = 3,           // for type='textarea'
  required = false,
  disabled = false,
  error = '',
  helpText = '',
  icon = null,
  style: extraStyle = {},
}) {
  const [focused, setFocused] = useState(false)

  const baseStyle = {
    width: '100%',
    padding: icon ? '10px 12px 10px 36px' : '10px 12px',
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: COLORS.dark,
    background: disabled ? COLORS.grayLight : COLORS.white,
    border: `1.5px solid ${error ? COLORS.danger : focused ? COLORS.primary : COLORS.border}`,
    borderRadius: RADIUS.md,
    outline: 'none',
    transition: 'border 0.2s',
    ...extraStyle,
  }

  const renderInput = () => {
    if (type === 'select') {
      return (
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          style={{ ...baseStyle, cursor: 'pointer' }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt =>
            typeof opt === 'string'
              ? <option key={opt} value={opt}>{opt}</option>
              : <option key={opt.value} value={opt.value}>{opt.label}</option>
          )}
        </select>
      )
    }

    if (type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          style={{ ...baseStyle, resize: 'vertical' }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      )
    }

    return (
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        style={baseStyle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.darkMuted }}>
          {label}
          {required && <span style={{ color: COLORS.danger, marginLeft: 3 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, pointerEvents: 'none',
          }}>
            {icon}
          </span>
        )}
        {renderInput()}
      </div>
      {error && <span style={{ fontSize: 12, color: COLORS.danger }}>{error}</span>}
      {helpText && !error && <span style={{ fontSize: 12, color: COLORS.gray }}>{helpText}</span>}
    </div>
  )
}
