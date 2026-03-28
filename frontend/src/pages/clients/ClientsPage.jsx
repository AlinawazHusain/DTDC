import { useState, useEffect, useCallback, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import { COLORS, RADIUS } from '../../constants/theme'
import { useApp } from '../../context/AppContext'
import { callApi } from '../../utils/api'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

// ─── KYC document type options (India) ────────────────────────────────────────
const KYC_DOC_TYPES = [
  { value: '',                    label: '— Select Document Type —' },
  { value: 'aadhaar_card',        label: 'Aadhaar Card' },
  { value: 'pan_card',            label: 'PAN Card' },
  { value: 'driving_licence',     label: 'Driving Licence' },
  { value: 'passport',            label: 'Passport' },
  { value: 'voter_id',            label: 'Voter ID Card' },
  { value: 'nrega_job_card',      label: 'NREGA Job Card' },
  { value: 'npr_letter',          label: 'National Population Register Letter' },
  { value: 'other',               label: 'Other' },
]

// ─── Empty form state ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', cin_number: '', phone_number: '', email: '',
  pincode: '', gst_number: '', pan_number: '', dsr_act_cust_code: '',
  city: '', address: '',
  tan_number: '', payment_term: '', kyc_id_number: '', kyc_doc_type: '',
}

// ─── Accepted file types for doc upload ────────────────────────────────────────
const ACCEPTED_DOC = '.pdf,.jpg,.jpeg,.png'

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { addToast } = useApp()

  const [clients, setClients]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [search, setSearch]               = useState('')
  const [showModal, setShowModal]         = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [form, setForm]                   = useState(EMPTY_FORM)

  // ── Doc upload state ─────────────────────────────────────────────────────
  const [kycUploading,       setKycUploading]       = useState(false)
  const [agreementUploading, setAgreementUploading] = useState(false)
  // live doc URLs — updated optimistically after a successful upload
  const [liveKycUrl,         setLiveKycUrl]         = useState(null)
  const [liveAgreementUrl,   setLiveAgreementUrl]   = useState(null)

  const kycFileRef       = useRef(null)
  const agreementFileRef = useRef(null)

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!filtered.length) { addToast('No data to export', 'error'); return }
    const exportData = filtered.map((c) => ({
      'Client Name':   c.name,
      'CIN Number':    c.cin_number,
      'TAN Number':    c.tan_number,
      'Email':         c.email,
      'Phone Number':  c.phone_number,
      'PAN Number':    c.pan_number,
      'Payment Term':  c.payment_term,
      'DSR Code':      c.dsr_act_cust_code,
      'GST Number':    c.gst_number,
      'City':          c.city,
      'Pincode':       c.pincode,
      'Address':       c.address,
      'KYC ID Number': c.kyc_id_number,
      'KYC Doc Type':  c.kyc_doc_type,
      'KYC Document URL':    c.kyc_doc_url ?? '',
      'Agreement Document URL': c.agreement_doc_url ?? '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook  = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    })
    saveAs(blob, `Clients_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── Fetch clients ────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const data  = await callApi({
        url: '/api/getClients', method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      setClients(data.data)
    } catch {
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
    setLiveKycUrl(null)
    setLiveAgreementUrl(null)
    setShowModal(true)
  }

  const openEdit = (client) => {
    setEditingClient(client)
    setForm({
      name:              client.name              ?? '',
      cin_number:        client.cin_number        ?? '',
      phone_number:      client.phone_number      ?? '',
      email:             client.email             ?? '',
      pincode:           client.pincode           ?? '',
      gst_number:        client.gst_number        ?? '',
      pan_number:        client.pan_number        ?? '',
      dsr_act_cust_code: client.dsr_act_cust_code ?? '',
      city:              client.city              ?? '',
      address:           client.address           ?? '',
      tan_number:        client.tan_number        ?? '',
      payment_term:      client.payment_term      ?? '',
      kyc_id_number:     client.kyc_id_number     ?? '',
      kyc_doc_type:      client.kyc_doc_type      ?? '',
    })
    // Seed live URLs from fetched client data
    setLiveKycUrl(client.kyc_doc_url       ?? null)
    setLiveAgreementUrl(client.agreement_doc_url ?? null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingClient(null)
    setForm(EMPTY_FORM)
    setLiveKycUrl(null)
    setLiveAgreementUrl(null)
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.name.trim()) { addToast('Company Name is required.', 'error'); return false }
    return true
  }

  // ── Save (Add / Edit) ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      if (editingClient) {
        const update_data = { ...form, id: Number(editingClient.id) }
        const updated = await callApi({
          url: '/api/updateClient', method: 'PUT',
          body: update_data,
          headers: { Authorization: `Bearer ${token}` },
        })
        setClients((prev) =>
          prev.map((c) => (c.id === editingClient.id ? { ...c, ...updated } : c))
        )
        addToast(`Client "${form.name}" updated!`, 'success')
      } else {
        const created = await callApi({
          url: '/api/addNewClient', method: 'POST',
          body: form,
          headers: { Authorization: `Bearer ${token}` },
        })
        setClients((prev) => [created, ...prev])
        addToast(`Client "${form.name}" added!`, 'success')
      }
      closeModal()
    } catch {
      addToast(editingClient ? 'Failed to update client.' : 'Failed to add client.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Document upload ──────────────────────────────────────────────────────
  /**
   * Uploads a KYC or agreement document for the currently editing client.
   * POST /api/uploadClientDoc   multipart/form-data
   *   Fields: client_id (int), doc_type ('kyc' | 'agreement'), file (binary)
   * Response: { url: "https://..." }
   */
  const handleDocUpload = async (docType, file) => {
    if (!file)               return
    if (!editingClient?.id) { addToast('Save the client first before uploading documents.', 'error'); return }

    const isKyc        = docType === 'kyc'
    const setUploading = isKyc ? setKycUploading : setAgreementUploading
    const setLiveUrl   = isKyc ? setLiveKycUrl   : setLiveAgreementUrl
    const label        = isKyc ? 'KYC'           : 'Agreement'

    setUploading(true)
    try {
      const token    = localStorage.getItem('access_token')
      const formData = new FormData()
      formData.append('client_id', editingClient.id)
      formData.append('doc_type',  docType)
      formData.append('file',      file)

      const response = await fetch('/api/uploadClientDoc', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      })
      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      const url  = data.url ?? data.data?.url ?? null

      if (url) {
        setLiveUrl(url)
        // Patch in-memory client list so the link persists without a full refetch
        setClients(prev => prev.map(c =>
          c.id === editingClient.id
            ? { ...c, [isKyc ? 'kyc_doc_url' : 'agreement_doc_url']: url }
            : c
        ))
      }
      addToast(`${label} document uploaded successfully!`, 'success')
    } catch {
      addToast(`Failed to upload ${label} document.`, 'error')
    } finally {
      setUploading(false)
      // Reset the file input so the same file can be re-selected if needed
      if (isKyc && kycFileRef.current)             kycFileRef.current.value = ''
      if (!isKyc && agreementFileRef.current)      agreementFileRef.current.value = ''
    }
  }

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = clients.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q)              ||
      c.city?.toLowerCase().includes(q)              ||
      c.dsr_act_cust_code?.toLowerCase().includes(q) ||
      c.pan_number?.toLowerCase().includes(q)        ||
      c.email?.toLowerCase().includes(q)             ||
      c.phone_number?.toLowerCase().includes(q)      ||
      c.cin_number?.toLowerCase().includes(q)        ||
      c.tan_number?.toLowerCase().includes(q)
    )
  })

  // ─────────────────────────────────────────────────────────────────────────
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
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city, CIN, TAN, email…"
              style={{
                width: '100%', padding: '9px 12px 9px 34px', fontSize: 16,
                border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = COLORS.primary)}
              onBlur={(e)  => (e.target.style.borderColor = COLORS.border)}
            />
          </div>
        </div>

        {/* Table body */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.gray, fontSize: 15 }}>Loading clients…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.gray, fontSize: 15 }}>
              {search ? 'No clients match your search.' : 'No clients yet. Add your first client!'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: COLORS.bgPage }}>
                  {['Client', 'CIN', 'TAN', 'Email', 'Phone', 'PAN', 'DSR Code', 'GST', 'Payment Term', 'City', , ''].map((h) => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: COLORS.dark, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    style={{ borderTop: `1px solid ${COLORS.grayLight}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bgPage)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={c.name} />
                        <div>
                          <div style={{ fontWeight: 700, color: COLORS.dark, fontSize: 14 }}>{c.name}</div>
                          {c.kyc_doc_url && (
                            <span style={{ fontSize: 10, color: COLORS.success, fontWeight: 600 }}>✓ KYC</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray, fontFamily: 'monospace', fontSize: 12 }}>{c.cin_number    || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray, fontFamily: 'monospace', fontSize: 12 }}>{c.tan_number    || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.email         || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.phone_number  || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray, fontFamily: 'monospace', fontSize: 12 }}>{c.pan_number    || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.dsr_act_cust_code || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray, fontFamily: 'monospace', fontSize: 12 }}>{c.gst_number    || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.payment_term  || '—'}</td>
                    <td style={{ padding: '13px 16px', color: COLORS.gray }}>{c.city          || '—'}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <button
                        onClick={() => openEdit(c)}
                        style={{
                          padding: '6px 14px', fontSize: 12, fontWeight: 600,
                          border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                          background: 'transparent', cursor: 'pointer', color: COLORS.dark,
                          fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
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

      {/* ── Add / Edit Modal ── */}
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
        {/* ── Section 1: Basics ── */}
        <SectionHeading number="1" title="Client Basics" />
        <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>
          Only Company Name is required. Fill in the rest — you can update details later.
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
            <p style={{ fontSize: 12, color: COLORS.gray, marginTop: 4, marginBottom: 8 }}>
              This name will appear on invoices for this client.
            </p>
          </div>
          <Input label="CIN Number"    placeholder="U12345MH2020PTC123456" value={form.cin_number}    onChange={set('cin_number')} />
          <Input label="Phone Number"  placeholder="9876543210"            value={form.phone_number}  onChange={set('phone_number')} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Email Address" placeholder="client@example.com" value={form.email} onChange={set('email')} />
          </div>
        </div>

        {/* ── Section 2: Tax & Finance ── */}
        <SectionHeading number="2" title="Tax & Finance" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 20 }}>
          <Input label="GST Number"    placeholder="09AACFR1234A1Z5"  value={form.gst_number}    onChange={set('gst_number')} />
          <Input label="PAN Number"    placeholder="ABCDE1234F"        value={form.pan_number}    onChange={set('pan_number')} />
          <Input label="TAN Number"    placeholder="PNEA12345B"        value={form.tan_number}    onChange={set('tan_number')} />
          <Input label="Payment Term"  placeholder="Net 30 / Advance"  value={form.payment_term}  onChange={set('payment_term')} />
          <Input label="DSR Code"      placeholder="N3432"             value={form.dsr_act_cust_code} onChange={set('dsr_act_cust_code')} />
        </div>

        {/* ── Section 3: KYC ── */}
        <SectionHeading number="3" title="KYC Details" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 20 }}>
          {/* KYC Doc Type — custom dropdown */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark, display: 'block', marginBottom: 6 }}>
              KYC Document Type
            </label>
            <select
              value={form.kyc_doc_type}
              onChange={set('kyc_doc_type')}
              style={{
                width: '100%', padding: '9px 12px', fontSize: 13,
                border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                outline: 'none', fontFamily: "'DM Sans', sans-serif",
                color: form.kyc_doc_type ? COLORS.dark : COLORS.gray,
                background: COLORS.white, cursor: 'pointer', boxSizing: 'border-box',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: 32,
              }}
              onFocus={(e) => (e.target.style.borderColor = COLORS.primary)}
              onBlur={(e)  => (e.target.style.borderColor = COLORS.border)}
            >
              {KYC_DOC_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <Input label="KYC ID Number" placeholder="1234-5678-9012" value={form.kyc_id_number} onChange={set('kyc_id_number')} />
        </div>

        {/* ── Section 4: Location ── */}
        <SectionHeading number="4" title="Location" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 20 }}>
          <Input label="City"    placeholder="Jaipur"  value={form.city}    onChange={set('city')} />
          <Input label="Pincode" placeholder="302001"  value={form.pincode} onChange={set('pincode')} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Full Address" placeholder="123, ABC Road, Jaipur, Rajasthan" value={form.address} onChange={set('address')} />
          </div>
        </div>

        {/* ── Section 5: Documents (edit mode only) ── */}
        {editingClient && (
          <>
            <SectionHeading number="5" title="Documents" />
            <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>
              Upload KYC and Agreement documents for this client. PDF, JPG, or PNG accepted.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* ── KYC Document ── */}
              <DocUploadRow
                label="KYC Document"
                icon="🪪"
                url={liveKycUrl}
                uploading={kycUploading}
                fileInputRef={kycFileRef}
                accept={ACCEPTED_DOC}
                onFileChange={(file) => handleDocUpload('kyc', file)}
              />

              {/* ── Agreement Document ── */}
              <DocUploadRow
                label="Agreement Document"
                icon="📄"
                url={liveAgreementUrl}
                uploading={agreementUploading}
                fileInputRef={agreementFileRef}
                accept={ACCEPTED_DOC}
                onFileChange={(file) => handleDocUpload('agreement', file)}
              />

            </div>
          </>
        )}

        {/* Hint for new clients */}
        {!editingClient && (
          <div style={{
            marginTop: 8, padding: '10px 14px',
            background: COLORS.primary + '0d', border: `1px solid ${COLORS.primary}25`,
            borderRadius: RADIUS.md, fontSize: 12, color: COLORS.gray,
          }}>
            💡 You can upload KYC and Agreement documents after saving this client.
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

// ─── Section Heading ───────────────────────────────────────────────────────────
function SectionHeading({ number, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 4 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: COLORS.primary, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {number}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, margin: 0 }}>{title}</h3>
      <div style={{ flex: 1, height: 1, background: COLORS.grayLight }} />
    </div>
  )
}

// ─── DocUploadRow ──────────────────────────────────────────────────────────────
function DocUploadRow({ label, icon, url, uploading, fileInputRef, accept, onFileChange }) {
  const hasDoc = Boolean(url)

  return (
    <div style={{
      border: `1.5px solid ${hasDoc ? COLORS.success + '50' : COLORS.border}`,
      borderRadius: RADIUS.md,
      padding: '14px 16px',
      background: hasDoc ? COLORS.success + '06' : COLORS.white,
      transition: 'all 0.2s',
    }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileChange(file)
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>

        {/* Icon + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.dark }}>{label}</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>
              {hasDoc ? (
                <span style={{ color: COLORS.success, fontWeight: 600 }}>✓ Uploaded</span>
              ) : (
                <span style={{ color: COLORS.gray, fontStyle: 'italic' }}>Not uploaded</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>

          {/* Preview link — only if doc exists */}
          {hasDoc && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${COLORS.success}`, borderRadius: RADIUS.md,
                color: COLORS.success, textDecoration: 'none', background: 'transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.success; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.success }}
            >
              👁️ Preview
            </a>
          )}

          {/* Upload / Update button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${COLORS.primary}`, borderRadius: RADIUS.md,
              color: COLORS.primary, background: 'transparent', cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1, transition: 'all 0.15s',
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => { if (!uploading) { e.currentTarget.style.background = COLORS.primary; e.currentTarget.style.color = '#fff' } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.primary }}
          >
            {uploading ? (
              <>⏳ Uploading…</>
            ) : hasDoc ? (
              <>🔄 Update</>
            ) : (
              <>⬆️ Upload</>
            )}
          </button>

        </div>
      </div>
    </div>
  )
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const hue      = (name || '').charCodeAt(0) * 7 % 360
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '25%', flexShrink: 0,
      background: `hsl(${hue}, 60%, 88%)`, color: `hsl(${hue}, 60%, 35%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700,
    }}>
      {initials}
    </div>
  )
}