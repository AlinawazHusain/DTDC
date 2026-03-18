import { useNavigate } from 'react-router-dom'
import { COLORS, RADIUS } from '../../constants/theme'
import { BOOKINGS } from '../../constants/data'
import StatusBadge from '../common/StatusBadge'

export default function RecentBookingsTable() {
  const navigate = useNavigate()

  return (
    <div style={{
      background: COLORS.white,
      borderRadius: RADIUS.lg,
      border: `1px solid ${COLORS.border}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 22px',
        borderBottom: `1px solid ${COLORS.grayLight}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: COLORS.dark }}>
          Recent Consignments
        </div>
        <span
          onClick={() => navigate('/app/bookings')}
          style={{ fontSize: 13, color: COLORS.primary, cursor: 'pointer', fontWeight: 500 }}
        >
          View all →
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.bgPage }}>
              {['AWB No.', 'Client', 'Destination', 'Weight', 'Amount', 'Status'].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left',
                  color: COLORS.gray, fontWeight: 600, whiteSpace: 'nowrap',
                  fontSize: 12,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BOOKINGS.slice(0, 6).map(b => (
              <tr
                key={b.id}
                style={{ borderTop: `1px solid ${COLORS.grayLight}`, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => navigate('/app/bookings')}
              >
                <td style={{ padding: '12px 16px', color: COLORS.primary, fontWeight: 600 }}>{b.id}</td>
                <td style={{ padding: '12px 16px', color: COLORS.darkMuted }}>{b.client}</td>
                <td style={{ padding: '12px 16px', color: COLORS.darkMuted }}>{b.dest}</td>
                <td style={{ padding: '12px 16px', color: COLORS.gray }}>{b.weight} kg</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: COLORS.dark }}>₹{b.amount}</td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
