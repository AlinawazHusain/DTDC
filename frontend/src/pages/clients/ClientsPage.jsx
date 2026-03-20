import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import { COLORS, RADIUS } from '../../constants/theme'
import { useApp } from '../../context/AppContext'
import { callApi } from '../../utils/api'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'


// ─── Empty form state ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', cin_number: '', phone_number: '', email: '',
  pincode: '', gst_number: '', pan_number: '', dsr_cust_code: '',
  city: '', address: '',
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { addToast } = useApp()

  const [clients, setClients]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [search, setSearch]         = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editingClient, setEditingClient] = useState(null) // null = add mode, object = edit mode
  const [form, setForm]             = useState(EMPTY_FORM)




  const handleExport = () => {
    if (!filtered.length) {
      addToast('No data to export', 'error')
      return
    }

    // Format data for Excel
    const exportData = filtered.map((c) => ({
      'Client Name': c.name,
      'CIN Number': c.cin_number,
      'Email': c.email,
      'Phone Number': c.phone_number,
      'PAN Number': c.pan_number,
      'DSR Code': c.dsr_cust_code,
      'GST Number': c.gst_number,
      'City': c.city,
      "Pincode" : c.pincode,
      'Address': c.address,
      'Total Business': c.total_business || 0,
      'Due Payment': c.due_payment || 0,
    }))

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData)

    // Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients')

    // Convert to binary
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    })

    // Save file
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    })

    saveAs(blob, `Clients_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  // ── Fetch clients ────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const data = await callApi({ 
        url: "/api/getClients",
        "method" : "GET", 
        headers: { Authorization: `Bearer ${token}` }
      })
      setClients(data.data)
    } catch (err) {
      addToast('Failed to load clients.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const openAdd = () => {
    setEditingClient(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (client) => {
    setEditingClient(client)
    setForm({
      name:          client.name          ?? '',
      cin_number:       client.cin_number       ?? '',
      phone_number:  client.phone_number  ?? '',
      email:         client.email         ?? '',
      pincode:       client.pincode       ?? '',
      gst_number:    client.gst_number    ?? '',
      pan_number:    client.pan_number    ?? '',
      dsr_cust_code: client.dsr_cust_code ?? '',
      city:          client.city          ?? '',
      address:       client.address       ?? '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingClient(null)
    setForm(EMPTY_FORM)
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.name.trim()) {
      addToast('Company Name is required.', 'error')
      return false
    }
    return true
  }

  // ── Save (Add or Edit) ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editingClient) {
        // ── EDIT ──
        const token = localStorage.getItem('access_token')
        const update_data = { ...form, id: Number(editingClient.id) }
        const updated = await callApi({
          url: "/api/updateClient",
          method: 'PUT',
          body: update_data,
          headers: { Authorization: `Bearer ${token}` }
        })
        // Replace the client in local state with the response
        setClients((prev) =>
          prev.map((c) => (c.id === editingClient.id ? { ...c, ...updated } : c))
        )
        addToast(`Client "${form.name}" updated!`, 'success')
      } else {
        // ── ADD ──
          const token = localStorage.getItem('access_token')
          const created = await callApi({
            url: "/api/addNewClient",
            method: 'POST',
            body: form,
            headers: { Authorization: `Bearer ${token}` }
        })
        setClients((prev) => [created, ...prev])
        addToast(`Client "${form.name}" added!`, 'success')
      }
      closeModal()
    } catch (err) {
      addToast(editingClient ? 'Failed to update client.' : 'Failed to add client.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = clients.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q)          ||
      c.city?.toLowerCase().includes(q)          ||
      c.dsr_cust_code?.toLowerCase().includes(q) ||
      c.pan_number?.toLowerCase().includes(q)    ||
      c.email?.toLowerCase().includes(q)         ||
      c.phone_number?.toLowerCase().includes(q)  ||
      c.cin_number?.toLowerCase().includes(q)
    )
  })

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: COLORS.dark }}>Clients</h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
            {loading ? 'Loading…' : `${clients.length} clients`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" icon="📤" size="sm" onClick={handleExport}>Export</Button>
          <Button icon="+" onClick={openAdd}>Add Client</Button>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients by name, city, CIN code…"
              style={{
                width: '100%', padding: '9px 12px 9px 34px', fontSize: 16,
                border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                outline: 'none', fontFamily: "'DM Sans', sans-serif",
              }}
              onFocus={(e) => (e.target.style.borderColor = COLORS.primary)}
              onBlur={(e)  => (e.target.style.borderColor = COLORS.border)}
            />
          </div>
        </div>

        {/* Table body */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.gray, fontSize: 15 }}>
              Loading clients…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.gray, fontSize: 15 }}>
              {search ? 'No clients match your search.' : 'No clients yet. Add your first client!'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: COLORS.bgPage }}>
                  {['Client', 'CIN Number' , 'Email' , 'Phone Number' , 'PAN Number' , 'DSR Code' , 'GST Number',  'City', 'Pincode' ,'Address' , 'Total Business', 'Due Payment', ''].map((h) => (
                    <th key={h} style={{ padding: '25px 16px', textAlign: 'left', color: COLORS.dark, fontWeight: 900, fontSize: 16, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    style={{ borderTop: `5px solid ${COLORS.grayLight}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bgPage)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '20px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <Avatar name={c.name} />
                        <div>
                          <div style={{ fontWeight: 700, color: COLORS.dark, fontSize: 14 }}>{c.name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray, fontFamily: 'monospace', fontSize: 13 }}>
                      {c.cin_number || '—'}
                    </td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.email || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.phone_number || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.pan_number || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.dsr_cust_code || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.gst_number || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.city || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.pincode || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.darkMuted }}>{c.address || '—'}</td>
                    <td style={{ padding: '13px 16px', fontWeight: 600, color: COLORS.dark }}>
                      {c.total_business != null ? `₹${Number(c.total_business).toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontWeight: 600, color: c.due_payment > 0 ? '#e53e3e' : COLORS.dark }}>
                      {c.due_payment != null ? `₹${Number(c.due_payment).toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <button
                        onClick={() => openEdit(c)}
                        style={{
                          padding: '6px 14px', fontSize: 12, fontWeight: 600,
                          border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                          background: 'transparent', cursor: 'pointer', color: COLORS.dark,
                          fontFamily: "'DM Sans', sans-serif",
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.target.style.background = COLORS.primary; e.target.style.color = '#fff'; e.target.style.borderColor = COLORS.primary }}
                        onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = COLORS.dark; e.target.style.borderColor = COLORS.border }}
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingClient ? `Edit — ${editingClient.name}` : 'Add New Client'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingClient ? 'Save Changes' : 'Add Client'}
            </Button>
          </>
        }
      >
        {/* Section 1 */}
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>1. Client Basics</h3>
        <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>
          Only Company Name is required. Fill in the rest—you can update details later.
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
              This name will appear on invoices for this client.
            </p>
          </div>
          <Input label="CIN Number"        placeholder="CIN8765"          value={form.cin_number}       onChange={set('cin_number')} />
          <Input label="Phone Number"   placeholder="9876543210"       value={form.phone_number}  onChange={set('phone_number')} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Email Address" placeholder="client@example.com" value={form.email} onChange={set('email')} />
          </div>
        </div>

        {/* Section 2 */}
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>2. Location & Tax (Optional)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 20 }}>
          <Input label="City"       placeholder="Jaipur"           value={form.city}          onChange={set('city')} />
          <Input label="Pincode"    placeholder="302001"           value={form.pincode}        onChange={set('pincode')} />
          <Input label="GST Number" placeholder="09AACFR1234A1Z5"  value={form.gst_number}    onChange={set('gst_number')} />
          <Input label="PAN Number" placeholder="ABCDE1234F"       value={form.pan_number}    onChange={set('pan_number')} />
          <Input label="DSR Number" placeholder="N3432"            value={form.dsr_cust_code} onChange={set('dsr_cust_code')} />
        </div>

        {/* Section 3 */}
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

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const hue = (name || '').charCodeAt(0) * 7 % 360
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