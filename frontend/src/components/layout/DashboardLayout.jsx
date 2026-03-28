import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme'
import { SIDEBAR_MENU } from '../../constants/data'
import Button from '../common/Button'

export default function DashboardLayout({ children }) {
  const { sidebarOpen, toggleSidebar, toasts } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const [hover, setHover] = useState(false)

  const currentPage = SIDEBAR_MENU.find(m => location.pathname.startsWith(m.path))
  const pageTitle   = currentPage?.label ?? 'settings'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bgPage }}>
      <Sidebar />

      {/* Main area */}
      <div style={{
        flex: 1,
        marginLeft: sidebarOpen ? 230 : 64,
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}>
        {/* Top Bar */}
        <header style={{
          background: COLORS.white,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Toggle */}
            <button
              onClick={toggleSidebar}
              style={{
                width: 34, height: 34, borderRadius: RADIUS.md,
                background: COLORS.grayLight, border: 'none',
                cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark, fontFamily: "'Syne', sans-serif" }}>
                {pageTitle}
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                Wednesday, 18 March 2026
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>


            {/* Back to site */}
            <button
              onClick={() => {
                
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');

                navigate('/')
              }}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              // style={{
              //   background: 'none', border: `3px solid ${COLORS.warningLight}`,
              //   borderRadius: RADIUS.md, padding: '15px 20px',
              //   cursor: 'pointer', fontSize: 14, color: COLORS.dark,
              //   fontFamily: "'DM Sans', sans-serif",
              // }}
              style={{
                background: 'none',
                color: COLORS.dark,
                border: hover ? `3px solid ${COLORS.danger}` : `3px solid ${COLORS.warningLight}`,
                borderRadius: RADIUS.md,
                padding: '15px 20px',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.2s',
              }}
            >
              ← Logout
            </button>

            
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: 24, minWidth: 0 }}>
          {children}
        </main>
      </div>

      {/* Toast Notifications */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 9999,
      }}>
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </div>
  )
}

function Toast({ message, type }) {
  const colors = {
    success: { bg: COLORS.successLight, color: '#065F46', icon: '✅' },
    error:   { bg: COLORS.dangerLight,  color: '#7F1D1D', icon: '❌' },
    info:    { bg: COLORS.infoLight,    color: '#1E3A5F', icon: 'ℹ️' },
  }
  const s = colors[type] ?? colors.success
  return (
    <div style={{
      background: s.bg, color: s.color,
      padding: '12px 18px', borderRadius: RADIUS.lg,
      boxShadow: SHADOWS.md,
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 14, fontWeight: 500,
      minWidth: 260,
      animation: 'fadeInUp 0.3s ease',
    }}>
      <span>{s.icon}</span>
      {message}
    </div>
  )
}
