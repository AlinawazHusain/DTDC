import { useState } from 'react'
import { COLORS, RADIUS } from '../../constants/theme'
import Button from '../common/Button'
import Input from '../common/Input'
import { useApp } from '../../context/AppContext'

export default function QuickBookingForm() {
  const { addToast } = useApp()
  const [form, setForm] = useState({
    client: '', destination: '', awb: '', weight: '', rate: '', type: '',
  })

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = () => {
    if (!form.client || !form.destination || !form.awb) {
      addToast('Please fill required fields.', 'error')
      return
    }
    addToast(`Booking ${form.awb} created & invoice sent!`, 'success')
    setForm({ client: '', destination: '', awb: '', weight: '', rate: '', type: '' })
  }

  return (
    <div style={{
      background: COLORS.white,
      borderRadius: RADIUS.lg,
      border: `1px solid ${COLORS.border}`,
      padding: '20px',
    }}>
      <div style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 700,
        fontSize: 15, color: COLORS.dark, marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        📦 Quick Booking
      </div>

      <Input label="Client Name *"   placeholder="e.g. Ravi Textiles"  value={form.client}      onChange={set('client')} />
      <Input label="Destination *"   placeholder="e.g. Mumbai"         value={form.destination} onChange={set('destination')} />
      <Input label="AWB Number *"    placeholder="e.g. AWB001250"      value={form.awb}         onChange={set('awb')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Weight (kg)" placeholder="2.5" value={form.weight} onChange={set('weight')} type="number" />
        <Input label="Rate (₹)"   placeholder="145"  value={form.rate}   onChange={set('rate')}   type="number" />
      </div>

      <Input
        label="Parcel Type"
        type="select"
        placeholder="Select type"
        value={form.type}
        onChange={set('type')}
        options={['Document', 'Parcel', 'Heavy', 'Fragile', 'Express']}
      />

      <Button onClick={handleSubmit} fullWidth style={{ marginTop: 4 }}>
        Book & Generate Invoice
      </Button>
    </div>
  )
}
