import { useNavigate } from 'react-router-dom'
import { COLORS, FONTS, RADIUS } from '../constants/theme'
import Button from '../components/common/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh', background: COLORS.bgPage,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 80, marginBottom: 24 }}>📦</div>
      <h1 style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 64, color: COLORS.primary, marginBottom: 8 }}>404</h1>
      <h2 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 24, color: COLORS.dark, marginBottom: 12 }}>
        Parcel Not Found
      </h2>
      <p style={{ fontSize: 16, color: COLORS.gray, maxWidth: 360, marginBottom: 36, lineHeight: 1.65 }}>
        The page you're looking for seems to have been lost in transit. Let's get you back on track.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button onClick={() => navigate('/')}>← Back to Home</Button>
        <Button variant="outline" onClick={() => navigate('/app/dashboard')}>Go to Dashboard</Button>
      </div>
    </div>
  )
}
