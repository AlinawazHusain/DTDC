import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import { COLORS, RADIUS } from '../../constants/theme'
import { CLIENTS } from '../../constants/data'
import { useApp } from '../../context/AppContext'

export default function ClientsPage() {
  const { addToast } = useApp()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', city: '', gstin: '', hlcode: '' })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // Filter clients by search only
  const filtered = CLIENTS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = () => {
    if (!form.name) {
      addToast('Company Name is required.', 'error');
      return;
    }
    if (form.hlcode && !form.hlcode.startsWith('HL')) {
      addToast('HL Code must start with HL.', 'error');
      return;
    }

    addToast(`Client "${form.name}" added!`, 'success');
    setShowModal(false);
    setForm({ name: '', phone: '', email: '', hlcode: '', pincode: '', gstin: '', pan: '', cin: '', address: '', type: 'Account' });
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: COLORS.dark }}>Clients</h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
            {CLIENTS.length} clients
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" icon="📤" size="sm">Export</Button>
          <Button icon="+" onClick={() => setShowModal(true)}>Add Client</Button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '20px 20px' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients by name or city..."
              style={{
                width: '100%', padding: '9px 12px 9px 34px', fontSize: 16,
                border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                outline: 'none', fontFamily: "'DM Sans', sans-serif",
              }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.bgPage }}>
                {['Client', 'GSTIN', 'Phone', 'City', 'Total Business', 'Last Booking'].map(h => (
                  <th key={h} style={{ padding: '25px 16px', textAlign: 'left', color: COLORS.dark, fontWeight: 900, fontSize: 16, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  style={{ borderTop: `5px solid ${COLORS.grayLight}` }}
                  onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '20px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                      <Avatar name={c.name} />
                      <span style={{ fontWeight: 700, color: COLORS.dark , fontsize:16}}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', color: COLORS.gray, fontFamily: 'monospace', fontSize: 14 }}>
                    {c.gstin || '—'}
                  </td>
                  <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.phone}</td>
                  <td style={{ padding: '13px 16px', color: COLORS.darkMuted }}>{c.city}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 600, color: COLORS.dark }}>
                    ₹{c.totalBusiness.toLocaleString()}
                  </td>
                  <td style={{ padding: '13px 16px', color: COLORS.gray, whiteSpace: 'nowrap' }}>
                    {c.lastBooking}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Client"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Client</Button>
          </>
        }
      >
        {/* Section 1: Client Basics */}
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>1. Client Basics</h3>
        <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>
          Only Company Name and HL Code are required. Fill in the rest—you can update pricing and details later.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 20 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label="Company Name *"
              placeholder="Ravi Textiles Pvt. Ltd."
              value={form.name}
              onChange={set('name')}
              required
            />
            <p style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
              This name will appear on invoices for this client
            </p>
          </div>
          <Input
            label="HL Code *"
            placeholder="HL12345"
            value={form.hlcode}
            onChange={set('hlcode')}
          />
          <Input label="Phone Number" placeholder="9876543210" value={form.phone} onChange={set('phone')} />
          <Input label="Email Address" placeholder="client@example.com" value={form.email} onChange={set('email')} />
        </div>

        {/* Section 2: Location & Tax */}
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>2. Location & Tax (Optional)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 20 }}>
          <Input label="Pincode" placeholder="302001" value={form.pincode} onChange={set('pincode')} />
          <Input label="GST Number" placeholder="09AACFR1234A1Z5" value={form.gstin} onChange={set('gstin')} />
          <Input label="PAN Number" placeholder="ABCDE1234F" value={form.pan} onChange={set('pan')} />
          <Input label="CIN Number" placeholder="L12345RJ1990PLC123456" value={form.cin} onChange={set('cin')} />
        </div>

        {/* Section 3: Address */}
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>3. Address (Optional)</h3>
        <Input
          label="Full Address"
          placeholder="123, ABC Road, Jaipur, Rajasthan"
          value={form.address}
          onChange={set('address')}
        />
      </Modal>
    </DashboardLayout>
  )
}

function Avatar({ name }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const hue = name.charCodeAt(0) * 7 % 360
  return (
    <div style={{
      width: 40, height: 32, borderRadius: '25%', flexShrink: 0,
      background: `hsl(${hue}, 60%, 88%)`,
      color: `hsl(${hue}, 60%, 35%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700,
    }}>
      {initials}
    </div>
  )
}
