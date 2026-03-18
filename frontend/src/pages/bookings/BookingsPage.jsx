import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import Badge from '../../components/common/Badge'
import { COLORS, RADIUS } from '../../constants/theme'
import { BOOKINGS } from '../../constants/data'
import { useApp } from '../../context/AppContext'

const STATUSES = ['All', 'Booked', 'In Transit', 'Delivered', 'Cancelled']

export default function BookingsPage() {
  const { addToast } = useApp()
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    client: '', destination: '', origin: 'Jaipur', awb: '',
    weight: '', rate: '', type: 'Parcel',
  })

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const filtered = BOOKINGS.filter(b => {
    const matchSearch = b.client.toLowerCase().includes(search.toLowerCase()) ||
                        b.id.toLowerCase().includes(search.toLowerCase()) ||
                        b.dest.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || b.status === filter
    return matchSearch && matchFilter
  })

  const handleAdd = () => {
    if (!form.client || !form.awb) { addToast('Fill required fields.', 'error'); return }
    addToast(`Booking ${form.awb} added successfully!`, 'success')
    setShowModal(false)
    setForm({ client: '', destination: '', origin: 'Jaipur', awb: '', weight: '', rate: '', type: 'Parcel' })
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.dark, fontFamily: "'Syne', sans-serif" }}>
            Consignment Bookings
          </h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
            {BOOKINGS.length} total bookings — {BOOKINGS.filter(b => b.status === 'In Transit').length} in transit
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" icon="📤" size="sm">Export Excel</Button>
          <Button icon="+" onClick={() => setShowModal(true)}>New Booking</Button>
        </div>
      </div>

      {/* Summary Badges */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { label: 'Total', count: BOOKINGS.length,                                           color: COLORS.primary },
          { label: 'In Transit', count: BOOKINGS.filter(b=>b.status==='In Transit').length,   color: COLORS.info    },
          { label: 'Delivered',  count: BOOKINGS.filter(b=>b.status==='Delivered').length,    color: COLORS.success },
          { label: 'Booked',     count: BOOKINGS.filter(b=>b.status==='Booked').length,       color: COLORS.warning },
          { label: 'Cancelled',  count: BOOKINGS.filter(b=>b.status==='Cancelled').length,    color: COLORS.danger  },
        ].map(s => (
          <div key={s.label} style={{
            background: s.color + '12', borderRadius: RADIUS.md,
            padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: s.color }}>
              {s.count}
            </span>
            <span style={{ fontSize: 13, color: COLORS.gray }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: COLORS.white, borderRadius: RADIUS.lg,
        border: `1px solid ${COLORS.border}`, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${COLORS.grayLight}`,
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search AWB, client, destination..."
              style={{
                width: '100%', padding: '9px 12px 9px 34px', fontSize: 14,
                border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                outline: 'none', fontFamily: "'DM Sans', sans-serif", color: COLORS.dark,
              }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e  => e.target.style.borderColor = COLORS.border}
            />
          </div>

          {/* Status Filters */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '6px 14px', borderRadius: RADIUS.full,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  border: `1.5px solid ${filter === s ? COLORS.primary : COLORS.border}`,
                  background: filter === s ? COLORS.primary : 'transparent',
                  color: filter === s ? COLORS.white : COLORS.gray,
                  transition: 'all 0.15s',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.bgPage }}>
                {['AWB No.', 'Client', 'Origin', 'Destination', 'Type', 'Weight', 'Amount', 'Date', 'Status', 'Action'].map(h => (
                  <th key={h} style={{
                    padding: '11px 16px', textAlign: 'left',
                    color: COLORS.gray, fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 48, textAlign: 'center', color: COLORS.gray }}>
                    No bookings match your search.
                  </td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr
                    key={b.id}
                    style={{ borderTop: `1px solid ${COLORS.grayLight}` }}
                    onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 16px', color: COLORS.primary, fontWeight: 700 }}>{b.id}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.dark, fontWeight: 500 }}>{b.client}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{b.origin}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.darkMuted }}>{b.dest}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <Badge color={COLORS.purple} size="sm">{b.type}</Badge>
                    </td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{b.weight} kg</td>
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: COLORS.dark }}>₹{b.amount}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray, whiteSpace: 'nowrap' }}>{b.date}</td>
                    <td style={{ padding: '13px 16px' }}><StatusBadge status={b.status} /></td>
                    <td style={{ padding: '13px 16px' }}>
                      <button
                        onClick={() => addToast(`Invoice for ${b.id} sent!`, 'success')}
                        style={{
                          background: COLORS.primaryLight, color: COLORS.primary,
                          border: 'none', borderRadius: RADIUS.sm,
                          padding: '5px 10px', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination stub */}
        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${COLORS.grayLight}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 13, color: COLORS.gray,
        }}>
          <span>Showing {filtered.length} of {BOOKINGS.length} records</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['←', '1', '2', '3', '→'].map((p, i) => (
              <button key={i} style={{
                width: 30, height: 30, borderRadius: RADIUS.sm, border: `1px solid ${COLORS.border}`,
                background: p === '1' ? COLORS.primary : 'transparent',
                color: p === '1' ? COLORS.white : COLORS.gray,
                cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              }}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Add Booking Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Booking"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Create Booking</Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Client Name *" placeholder="e.g. Ravi Textiles" value={form.client} onChange={set('client')} required />
          </div>
          <Input label="AWB Number *"   placeholder="AWB001250" value={form.awb}         onChange={set('awb')}         required />
          <Input label="Parcel Type"    type="select" value={form.type} onChange={set('type')}
            options={['Document', 'Parcel', 'Heavy', 'Fragile', 'Express']} />
          <Input label="Origin"         placeholder="Jaipur"  value={form.origin}       onChange={set('origin')} />
          <Input label="Destination *"  placeholder="Mumbai"  value={form.destination}  onChange={set('destination')} required />
          <Input label="Weight (kg)"    type="number" placeholder="2.5"  value={form.weight} onChange={set('weight')} />
          <Input label="Rate (₹)"       type="number" placeholder="145"  value={form.rate}   onChange={set('rate')} />
        </div>
      </Modal>
    </DashboardLayout>
  )
}
