import { NavLink } from 'react-router-dom'
import { COLORS, FONTS, RADIUS } from '../../constants/theme'
import { SIDEBAR_MENU } from '../../constants/data'
import { useApp } from '../../context/AppContext'

export default function Sidebar() {
  const { sidebarOpen } = useApp()

  return (
    <aside style={{
      width: sidebarOpen ? 230 : 64,
      background: COLORS.dark,
      transition: 'width 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 200,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '0 16px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid #1F2937',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: RADIUS.md,
          background: COLORS.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0,
        }}>📦</div>
        {sidebarOpen && (
          <span style={{
            fontFamily: FONTS.display, fontWeight: 800, fontSize: 17,
            color: COLORS.white, whiteSpace: 'nowrap',
          }}>
            Courier<span style={{ color: '#5B8CFF' }}>Billing</span>
          </span>
        )}
      </div>

      {/* Menu */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {SIDEBAR_MENU.map(item => (
          <SidebarItem key={item.label} item={item} collapsed={!sidebarOpen} />
        ))}
      </nav>

      {/* User Footer */}
      <div style={{
        padding: '14px 16px',
        borderTop: '1px solid #1F2937',
        display: 'flex', alignItems: 'center', gap: 10,
        overflow: 'hidden',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0057FF, #5B8CFF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: COLORS.white, flexShrink: 0,
        }}>RG</div>
        {sidebarOpen && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.white, whiteSpace: 'nowrap' }}>
              Ramesh Gupta
            </div>
            <div style={{ fontSize: 11, color: COLORS.gray, whiteSpace: 'nowrap' }}>
              DTDC Franchise, Jaipur
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function SidebarItem({ item, collapsed }) {
  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: RADIUS.md,
        marginBottom: 2,
        textDecoration: 'none',
        background: isActive ? COLORS.primary : 'transparent',
        transition: 'background 0.15s',
        overflow: 'hidden',
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = '#1F2937'
        }
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {({ isActive }) => (
        <>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
          {!collapsed && (
            <span style={{
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? COLORS.white : '#9CA3AF',
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
