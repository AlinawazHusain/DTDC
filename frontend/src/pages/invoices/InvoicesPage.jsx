import { useState, useCallback, useRef, useEffect } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import { COLORS, RADIUS } from '../../constants/theme'
import { useApp } from '../../context/AppContext'
import { callApi } from '../../utils/api'
import { debounce } from 'lodash'

// ─── API Endpoints ─────────────────────────────────────────────────────────────
const API = {
  filterBookings:       '/api/bookings/filter',
  generateInvoice:      '/api/invoices/generate',         // POST { booking_ids, client_id, invoice_type }
  listInvoices:         '/api/invoices',                  // GET  ?invoice_type=invoice|proforma
  searchClients:        '/api/searchClientsByName',
  exportInvoices:       '/api/invoices/export',           // GET  ?invoice_type=...&client_id=...&date_from=...&date_to=...&format=csv|excel
  exportSingleInvoice:  '/api/invoices',                  // GET  /api/invoices/{id}/export
}

// ─── Invoice type config ───────────────────────────────────────────────────────
const INVOICE_TYPES = {
  invoice: {
    key:        'invoice',
    label:      'Tax Invoice',
    shortLabel: 'Invoice',
    icon:       '🧾',
    badgeColor: { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
    prefix:     'INV',
    generateLabel: 'New Invoice',
  },
  proforma: {
    key:        'proforma',
    label:      'Proforma Invoice',
    shortLabel: 'Proforma (PI)',
    icon:       '📋',
    badgeColor: { bg: '#fff8e1', color: '#f57f17', border: '#ffe082' },
    prefix:     'PI',
    generateLabel: 'New Proforma Invoice',
  },
}

// ─── Booking table columns ─────────────────────────────────────────────────────
const BOOKING_COLS = [
  { key: 'DSR_CNNO',          label: 'AWB / CN No.'  },
  { key: 'client_name',       label: 'Client'        },
  { key: 'DSR_DEST',          label: 'Destination'   },
  { key: 'CHARGEABLE_WEIGHT', label: 'Chg. Wt.'      },
  { key: 'TOTAL_AMOUNT',      label: 'Amount'        },
  { key: 'DSR_BOOKING_DATE',  label: 'Booking Date'  },
  { key: 'DSR_STATUS',        label: 'Status'        },
]

// ─── Invoice status badge ──────────────────────────────────────────────────────
const INV_STATUS_COLOR = {
  Generated: { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
  Sent:      { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
  Paid:      { bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8' },
  Overdue:   { bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
  Confirmed: { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
  Draft:     { bg: '#fafafa', color: '#616161', border: '#e0e0e0' },
}

function InvStatusBadge({ status }) {
  const s = INV_STATUS_COLOR[status] || INV_STATUS_COLOR['Generated']
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{status}</span>
  )
}

// ─── Type badge (Invoice / PI) ─────────────────────────────────────────────────
function TypeBadge({ type }) {
  const cfg = INVOICE_TYPES[type] || INVOICE_TYPES.invoice
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      background: cfg.badgeColor.bg,
      color: cfg.badgeColor.color,
      border: `1px solid ${cfg.badgeColor.border}`,
    }}>{cfg.icon} {cfg.shortLabel}</span>
  )
}

// ─── Helper: format date ────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  const s = String(d)
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) { const [dd, mm, yyyy] = s.split('-'); return `${dd}/${mm}/${yyyy}` }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [yyyy, mm, dd] = s.split('-'); return `${dd}/${mm}/${yyyy}` }
  return s
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { addToast } = useApp()
  const token = () => localStorage.getItem('access_token')

  // ── Active tab (invoice | proforma | all) ────────────────────────────────
  const [activeTab, setActiveTab] = useState('invoice')   // 'invoice' | 'proforma' | 'all'

  // ── Invoice list ─────────────────────────────────────────────────────────
  const [invoices,        setInvoices]        = useState([])
  const [invoicesLoaded,  setInvoicesLoaded]  = useState(false)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invSearch,       setInvSearch]       = useState('')

  // ── Main page filters ────────────────────────────────────────────────────
  const [mainFilterClientName, setMainFilterClientName] = useState('')
  const [mainFilterClientId,   setMainFilterClientId]   = useState(null)
  const [mainFilterDateFrom,   setMainFilterDateFrom]   = useState('')
  const [mainFilterDateTo,     setMainFilterDateTo]     = useState('')
  const [clientSuggestions,    setClientSuggestions]    = useState([])
  const [showSuggestions,      setShowSuggestions]      = useState(false)
  const [showGenModal,         setShowGenModal]         = useState(false)
  const [modalInvoiceType,     setModalInvoiceType]     = useState('invoice')  // which type the modal is generating

  // ── Generated invoice result popup ──────────────────────────────────────
  const [generatedInvoice,  setGeneratedInvoice]  = useState(null)
  const [showInvoiceResult, setShowInvoiceResult] = useState(false)

  // ── Modal: booking search ────────────────────────────────────────────────
  const [filterClientName,  setFilterClientName]  = useState('')
  const [filterClientId,    setFilterClientId]    = useState(null)
  const [filterDateFrom,    setFilterDateFrom]    = useState('')
  const [filterDateTo,      setFilterDateTo]      = useState('')
  const [modalSuggestions,  setModalSuggestions]  = useState([])
  const [showModalSug,      setShowModalSug]      = useState(false)
  const [filterLoading,     setFilterLoading]     = useState(false)
  const [bookings,          setBookings]          = useState([])
  const [filterApplied,     setFilterApplied]     = useState(false)

  // ── Row selection ────────────────────────────────────────────────────────
  const [selectedIds,    setSelectedIds]    = useState([])
  const [selectedClient, setSelectedClient] = useState(null)

  // ── Generate / download states ───────────────────────────────────────────
  const [generating,    setGenerating]    = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [exporting,     setExporting]     = useState(false)

  // ── Stats summary ────────────────────────────────────────────────────────
  const invoiceCount  = invoices.filter(i => i.invoice_type === 'invoice'  || !i.invoice_type).length
  const proformaCount = invoices.filter(i => i.invoice_type === 'proforma').length

  // ────────────────────────────────────────────────────────────────────────
  // Load invoices
  // ────────────────────────────────────────────────────────────────────────
  const loadInvoices = useCallback(async (manualFilters = null) => {
    setInvoicesLoading(true)
    try {
      const filters = manualFilters || {
        client_id: mainFilterClientId,
        date_from: mainFilterDateFrom,
        date_to:   mainFilterDateTo,
      }

      const params = new URLSearchParams()
      // 'all' tab → no invoice_type filter (backend returns everything)
      if (activeTab !== 'all') params.append('invoice_type', activeTab)
      if (filters.client_id) params.append('client_id', filters.client_id)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to)   params.append('date_to',   filters.date_to)

      const qs  = params.toString()
      const url = qs ? `${API.listInvoices}?${qs}` : API.listInvoices

      const data = await callApi({
        url, method: 'GET',
        headers: { Authorization: `Bearer ${token()}` },
      })
      setInvoices(Array.isArray(data) ? data : data.invoices ?? data.data ?? [])
      setInvoicesLoaded(true)
    } catch {
      addToast('Failed to load invoices.', 'error')
    } finally {
      setInvoicesLoading(false)
    }
  }, [activeTab, mainFilterClientId, mainFilterDateFrom, mainFilterDateTo, addToast])

  useEffect(() => { loadInvoices() }, [activeTab])   // reload when tab changes

  // ── Client autocomplete (shared debounced fetcher) ───────────────────────
  const fetchSuggestions = useCallback(
    debounce(async (val, setter, showSetter) => {
      if (!val.trim()) { setter([]); showSetter(false); return }
      try {
        const res = await callApi({
          url: `${API.searchClients}?name=${encodeURIComponent(val)}`,
          method: 'GET',
          headers: { Authorization: `Bearer ${token()}` },
        })
        setter(res || [])
        showSetter(true)
      } catch { /* silent */ }
    }, 350), []
  )

  const handleMainClientChange = (val) => {
    setMainFilterClientName(val)
    setMainFilterClientId(null)
    fetchSuggestions(val, setClientSuggestions, setShowSuggestions)
  }
  const selectMainSuggestion = (c) => {
    setMainFilterClientName(c.name)
    setMainFilterClientId(c.id)
    setClientSuggestions([])
    setShowSuggestions(false)
  }

  const handleClientChange = (val) => {
    setFilterClientName(val)
    setFilterClientId(null)
    fetchSuggestions(val, setModalSuggestions, setShowModalSug)
  }
  const selectModalSuggestion = (c) => {
    setFilterClientName(c.name)
    setFilterClientId(c.id)
    setModalSuggestions([])
    setShowModalSug(false)
  }

  // ── Booking search (inside modal) ────────────────────────────────────────
  const handleFilter = async () => {
    if (!filterClientName.trim() && !filterDateFrom && !filterDateTo) {
      addToast('Please enter a client or date range.', 'error'); return
    }
    if (filterClientName.trim() && !filterClientId) {
      addToast('Please select a client from the dropdown.', 'error'); return
    }
    setFilterLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterClientId) params.append('client_id', filterClientId)
      if (filterDateFrom) params.append('date_from', filterDateFrom)
      if (filterDateTo)   params.append('date_to',   filterDateTo)
      const data = await callApi({
        url: `${API.filterBookings}?${params.toString()}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token()}` },
      })
      const rows = Array.isArray(data) ? data : (data.bookings ?? data.data ?? [])
      setBookings(rows)
      setFilterApplied(true)
      setSelectedIds([])
      setSelectedClient(null)
      if (rows.length === 0) addToast('No bookings found.', 'error')
      else addToast(`${rows.length} booking${rows.length !== 1 ? 's' : ''} found.`, 'success')
    } catch {
      addToast('Failed to fetch bookings.', 'error')
    } finally {
      setFilterLoading(false)
    }
  }

  const handleClearFilter = () => {
    setFilterClientName(''); setFilterClientId(null)
    setFilterDateFrom('');   setFilterDateTo('')
    setBookings([]);         setFilterApplied(false)
    setModalSuggestions([]); setShowModalSug(false)
    setSelectedIds([]);      setSelectedClient(null)
  }

  // ── Row selection ────────────────────────────────────────────────────────
  const toggleRow = (booking) => {
    if (!booking.id) return
    const alreadySelected = selectedIds.includes(booking.id)
    if (alreadySelected) {
      const next = selectedIds.filter(i => i !== booking.id)
      setSelectedIds(next)
      if (next.length === 0) setSelectedClient(null)
      return
    }
    if (selectedClient && selectedClient.id !== booking.client_id) {
      addToast(`All bookings must be from the same client. Locked to "${selectedClient.name}".`, 'error')
      return
    }
    setSelectedIds(prev => [...prev, booking.id])
    if (!selectedClient)
      setSelectedClient({ id: booking.client_id, name: booking.client_name })
  }

  const toggleSelectAll = () => {
    const eligible = bookings.filter(b => b.id && (!selectedClient || b.client_id === selectedClient.id))
    if (selectedIds.length === eligible.length) {
      setSelectedIds([]); setSelectedClient(null)
    } else {
      const firstClient = selectedClient || (eligible[0]
        ? { id: eligible[0].client_id, name: eligible[0].client_name } : null)
      setSelectedIds(eligible.map(b => b.id))
      setSelectedClient(firstClient)
    }
  }

  // ── Generate invoice / PI ────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (selectedIds.length === 0) { addToast('Please select at least one booking.', 'error'); return }
    setGenerating(true)
    try {
      const result = await callApi({
        url: API.generateInvoice,
        method: 'POST',
        body: {
          booking_ids:  selectedIds,
          client_id:    filterClientId,
          invoice_type: modalInvoiceType,    // ← key field
        },
        headers: { Authorization: `Bearer ${token()}` },
      })
      setShowGenModal(false)
      resetModal()
      setGeneratedInvoice({
        invoice_id:   result.invoice_id,
        invoice_url:  result.invoice_url,
        invoice_type: modalInvoiceType,
      })
      setShowInvoiceResult(true)
      await loadInvoices()
    } catch {
      addToast('Failed to generate invoice.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const resetModal = () => {
    setFilterClientName(''); setFilterClientId(null)
    setFilterDateFrom('');   setFilterDateTo('')
    setBookings([]);         setFilterApplied(false)
    setModalSuggestions([]); setShowModalSug(false)
    setSelectedIds([]);      setSelectedClient(null)
  }

  const openModal = (type = 'invoice') => {
    setModalInvoiceType(type)
    resetModal()
    setShowGenModal(true)
  }

  // ── Download single invoice PDF ──────────────────────────────────────────
  const handleDownload = (inv) => {
    if (!inv.pdf_url) { addToast('No PDF available.', 'error'); return }
    setDownloadingId(inv.id)
    const a    = document.createElement('a')
    a.href     = inv.pdf_url
    const cfg  = INVOICE_TYPES[inv.invoice_type] || INVOICE_TYPES.invoice
    a.download = `${cfg.prefix}_${inv.invoice_number || inv.id}.pdf`
    a.target   = '_blank'
    a.click()
    addToast('Downloaded.', 'success')
    setDownloadingId(null)
  }

  const handleDownloadGenerated = () => {
    if (!generatedInvoice?.invoice_url) { addToast('No PDF available.', 'error'); return }
    const a    = document.createElement('a')
    a.href     = generatedInvoice.invoice_url
    const cfg  = INVOICE_TYPES[generatedInvoice.invoice_type] || INVOICE_TYPES.invoice
    a.download = `${cfg.prefix}_${generatedInvoice.invoice_id}.pdf`
    a.target   = '_blank'
    a.click()
    addToast('Downloaded.', 'success')
  }

  // ── Bulk / filtered export ───────────────────────────────────────────────
  // format: 'csv' | 'excel'
  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (activeTab !== 'all')       params.append('invoice_type', activeTab)
      if (mainFilterClientId)        params.append('client_id',    mainFilterClientId)
      if (mainFilterDateFrom)        params.append('date_from',    mainFilterDateFrom)
      if (mainFilterDateTo)          params.append('date_to',      mainFilterDateTo)

      const url = `${API.exportInvoices}?${params.toString()}`

      // Use fetch directly so we can handle binary blob
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      const label = activeTab === 'all'
        ? 'All_Invoices'
        : activeTab === 'proforma'
          ? 'Proforma_Invoices'
          : 'Tax_Invoices'

      a.download = `${label}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(blobUrl)
      addToast(`Exported as ${format.toUpperCase()}.`, 'success')
    } catch {
      addToast('Export failed. Please try again.', 'error')
    } finally {
      setExporting(false)
    }
  }

  // ── Filtered invoice list ────────────────────────────────────────────────
  const filteredInvoices = invoices.filter(inv => {
    const q = invSearch.toLowerCase()
    return (
      String(inv.invoice_number ?? '').toLowerCase().includes(q) ||
      String(inv.client_name    ?? '').toLowerCase().includes(q)
    )
  })

  // ── Shared styles ────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '9px 12px', fontSize: 13, boxSizing: 'border-box',
    border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
    outline: 'none', fontFamily: "'DM Sans', sans-serif", color: COLORS.dark,
  }
  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: COLORS.gray, display: 'block', marginBottom: 5,
  }
  const thStyle = {
    padding: '11px 16px', textAlign: 'left',
    color: COLORS.gray, fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12,
  }

  const activeTabCfg = activeTab !== 'all' ? INVOICE_TYPES[activeTab] : null

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>

      {/* ── Page Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{
            fontSize: 22, fontWeight: 700,
            fontFamily: "'Syne', sans-serif", color: COLORS.dark,
          }}>
            Invoices & Proforma
          </h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
            {invoicesLoaded
              ? `${invoiceCount} invoice${invoiceCount !== 1 ? 's' : ''} · ${proformaCount} proforma`
              : 'Loading…'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="outline" icon="🔄" size="sm" onClick={() => loadInvoices()} disabled={invoicesLoading}>
            {invoicesLoading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button variant="outline" icon="📋" size="sm" onClick={() => openModal('proforma')}>
            New Proforma (PI)
          </Button>
          <Button icon="+" onClick={() => openModal('invoice')}>
            New Invoice
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 0,
        borderBottom: `2px solid ${COLORS.grayLight}`,
      }}>
        {[
          { key: 'invoice',  icon: '🧾', label: 'Tax Invoices',       count: invoiceCount  },
          { key: 'proforma', icon: '📋', label: 'Proforma (PI)',       count: proformaCount },
          { key: 'all',      icon: '📂', label: 'All',                 count: invoices.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? COLORS.primary : COLORS.gray,
              borderBottom: activeTab === tab.key ? `2px solid ${COLORS.primary}` : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.icon} {tab.label}
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: activeTab === tab.key ? COLORS.primary + '15' : COLORS.bgPage,
              color: activeTab === tab.key ? COLORS.primary : COLORS.gray,
              border: `1px solid ${activeTab === tab.key ? COLORS.primary + '30' : COLORS.border}`,
              borderRadius: RADIUS.full, padding: '1px 8px', minWidth: 20, textAlign: 'center',
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Invoices Table Card ── */}
      <div style={{
        background: COLORS.white, borderRadius: `0 0 ${RADIUS.lg} ${RADIUS.lg}`,
        border: `1px solid ${COLORS.border}`, borderTop: 'none', overflow: 'hidden',
      }}>

        {/* Toolbar */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${COLORS.grayLight}`,
          background: COLORS.bgPage + '30',
          display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
        }}>
          {/* Search box */}
          <div style={{ flex: '1 1 180px' }}>
            <label style={labelStyle}>Search</label>
            <input
              value={invSearch}
              onChange={e => setInvSearch(e.target.value)}
              placeholder="Invoice no. or client…"
              style={inputStyle}
            />
          </div>

          {/* Client filter */}
          <div style={{ flex: '2 1 200px', position: 'relative' }}>
            <label style={labelStyle}>Filter by Client</label>
            <input
              value={mainFilterClientName}
              onChange={e => handleMainClientChange(e.target.value)}
              onFocus={() => clientSuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="All Clients"
              style={inputStyle}
            />
            {showSuggestions && clientSuggestions.length > 0 && !showGenModal && (
              <SuggestionDropdown
                items={clientSuggestions}
                onSelect={selectMainSuggestion}
              />
            )}
          </div>

          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>From</label>
            <input type="date" value={mainFilterDateFrom}
              onChange={e => setMainFilterDateFrom(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>To</label>
            <input type="date" value={mainFilterDateTo}
              onChange={e => setMainFilterDateTo(e.target.value)} style={inputStyle} />
          </div>

          <Button size="sm" onClick={() => loadInvoices()}>Apply</Button>
          <Button variant="outline" size="sm" onClick={() => {
            setMainFilterClientName(''); setMainFilterClientId(null)
            setMainFilterDateFrom('');   setMainFilterDateTo('')
            loadInvoices({ client_id: null, date_from: '', date_to: '' })
          }}>Reset</Button>

          {/* ── Export dropdown ── */}
          <ExportMenu
            onExport={handleExport}
            exporting={exporting}
          />
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          {invoicesLoading ? (
            <LoadingState label="Loading invoices…" />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              hasData={invoices.length > 0}
              activeTab={activeTab}
              onNew={() => openModal(activeTab === 'proforma' ? 'proforma' : 'invoice')}
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: COLORS.bgPage }}>
                  {[
                    'Invoice No.',
                    ...(activeTab === 'all' ? ['Type'] : []),
                    'Client', 'Bookings', 'Amount', 'Generated On', 'Status', 'Actions',
                  ].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv, i) => {
                  const cfg = INVOICE_TYPES[inv.invoice_type] || INVOICE_TYPES.invoice
                  return (
                    <tr key={inv.id}
                      style={{
                        borderTop: `1px solid ${COLORS.grayLight}`,
                        background: i % 2 === 0 ? '#fff' : COLORS.bgPage + '50',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : COLORS.bgPage + '50'}
                    >
                      <td style={{ padding: '13px 16px', color: COLORS.primary, fontWeight: 700 }}>
                        {inv.invoice_number || `${cfg.prefix}-${String(inv.id).padStart(5, '0')}`}
                      </td>
                      {activeTab === 'all' && (
                        <td style={{ padding: '13px 16px' }}>
                          <TypeBadge type={inv.invoice_type} />
                        </td>
                      )}
                      <td style={{ padding: '13px 16px', fontWeight: 600, color: COLORS.dark }}>
                        {inv.client_name || '—'}
                      </td>
                      <td style={{ padding: '13px 16px', color: COLORS.gray }}>
                        {inv.booking_count ?? inv.bookings?.length ?? '—'} bookings
                      </td>
                      <td style={{ padding: '13px 16px', fontWeight: 700, color: COLORS.dark }}>
                        ₹{Number(inv.total_amount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '13px 16px', color: COLORS.gray }}>
                        {formatDate(inv.created_at || inv.generated_on)}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <InvStatusBadge status={inv.status || 'Generated'} />
                      </td>
                      <td style={{ padding: '13px 16px', display: 'flex', gap: '8px' }}>
                        <ActionBtn label="👁️ View" onClick={() => window.open(inv.pdf_url, '_blank')} disabled={!inv.pdf_url} />
                        <ActionBtn
                          label={downloadingId === inv.id ? '⏳' : '📄 Download'}
                          onClick={() => handleDownload(inv)}
                          disabled={downloadingId === inv.id || !inv.pdf_url}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${COLORS.grayLight}`,
          fontSize: 13, color: COLORS.gray,
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <span>
            {filteredInvoices.length} record{filteredInvoices.length !== 1 ? 's' : ''} shown
          </span>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}
              onClick={() => openModal('proforma')}>
              + New Proforma (PI)
            </span>
            <span style={{ color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}
              onClick={() => openModal('invoice')}>
              + New Invoice
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ── Generate Invoice / PI Modal ──
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showGenModal}
        onClose={() => { setShowGenModal(false); resetModal() }}
        title={modalInvoiceType === 'proforma' ? '📋 Generate Proforma Invoice (PI)' : '🧾 Generate New Invoice'}
        size="full"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowGenModal(false); resetModal() }}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || selectedIds.length === 0}
              style={modalInvoiceType === 'proforma' ? { background: '#f57f17' } : {}}
            >
              {generating
                ? 'Generating…'
                : selectedIds.length > 0
                  ? `Generate ${modalInvoiceType === 'proforma' ? 'Proforma' : 'Invoice'} (${selectedIds.length} booking${selectedIds.length > 1 ? 's' : ''})`
                  : 'Select bookings to generate'}
            </Button>
          </>
        }
      >
        {/* Type indicator banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: RADIUS.md, marginBottom: 18,
          background: modalInvoiceType === 'proforma' ? '#fff8e1' : '#e3f2fd',
          border: `1px solid ${modalInvoiceType === 'proforma' ? '#ffe082' : '#90caf9'}`,
          fontSize: 13, fontWeight: 600,
          color: modalInvoiceType === 'proforma' ? '#f57f17' : '#1565c0',
        }}>
          {modalInvoiceType === 'proforma' ? '📋' : '🧾'}
          <span>
            You are generating a{' '}
            <strong>{modalInvoiceType === 'proforma' ? 'Proforma Invoice (PI)' : 'Tax Invoice'}</strong>
            {modalInvoiceType === 'proforma'
              ? ' — a preliminary estimate sent to clients before final billing.'
              : ' — the official billing document.'}
          </span>
          <button
            onClick={() => setModalInvoiceType(modalInvoiceType === 'proforma' ? 'invoice' : 'proforma')}
            style={{
              marginLeft: 'auto', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: `1px solid currentColor`,
              borderRadius: RADIUS.sm, padding: '3px 10px', color: 'inherit',
            }}
          >
            Switch to {modalInvoiceType === 'proforma' ? 'Invoice' : 'Proforma'}
          </button>
        </div>

        {/* Step 1: Search */}
        <div style={{
          background: COLORS.bgPage, borderRadius: RADIUS.lg,
          border: `1px solid ${COLORS.border}`, padding: '18px 20px', marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark, marginBottom: 14 }}>
            🔎 Step 1 — Search Bookings
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ position: 'relative', flex: '2 1 240px', minWidth: 220 }}>
              <label style={labelStyle}>Client Name</label>
              <input
                value={filterClientName}
                onChange={e => handleClientChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFilter()}
                onFocus={() => modalSuggestions.length > 0 && setShowModalSug(true)}
                onBlur={() => setTimeout(() => setShowModalSug(false), 180)}
                placeholder="Type client name…"
                style={inputStyle}
              />
              {showModalSug && modalSuggestions.length > 0 && (
                <SuggestionDropdown items={modalSuggestions} onSelect={selectModalSuggestion} showPhone />
              )}
            </div>
            <div style={{ flex: '1 1 150px', minWidth: 140 }}>
              <label style={labelStyle}>Date From</label>
              <input type="date" value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: '1 1 150px', minWidth: 140 }}>
              <label style={labelStyle}>Date To</label>
              <input type="date" value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ paddingBottom: 1 }}>
              <Button onClick={handleFilter} disabled={filterLoading}>
                {filterLoading ? 'Searching…' : '🔍 Search'}
              </Button>
            </div>
            {filterApplied && (
              <div style={{ paddingBottom: 1 }}>
                <Button variant="outline" onClick={handleClearFilter}>Clear</Button>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Select */}
        <div style={{
          background: COLORS.white, borderRadius: RADIUS.lg,
          border: `1px solid ${COLORS.border}`, overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px', borderBottom: `1px solid ${COLORS.grayLight}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark }}>
              📋 Step 2 — Select Bookings
              {selectedIds.length > 0 && (
                <span style={{
                  marginLeft: 10, fontSize: 12, fontWeight: 600,
                  background: COLORS.primary + '15', color: COLORS.primary,
                  border: `1px solid ${COLORS.primary}30`,
                  borderRadius: RADIUS.full, padding: '2px 10px',
                }}>
                  {selectedIds.length} selected
                </span>
              )}
            </div>
            {selectedClient && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: COLORS.success + '15', border: `1px solid ${COLORS.success}`,
                borderRadius: RADIUS.full, padding: '4px 12px', fontSize: 12,
              }}>
                <span>🔒</span>
                <span style={{ fontWeight: 700, color: COLORS.dark }}>{selectedClient.name}</span>
                <span style={{ color: COLORS.gray, fontSize: 11 }}>— client locked</span>
                <span
                  onClick={() => { setSelectedIds([]); setSelectedClient(null) }}
                  style={{ cursor: 'pointer', color: COLORS.danger, fontWeight: 700, marginLeft: 2 }}
                >✕</span>
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            {filterLoading ? (
              <LoadingState label="Searching bookings…" icon="🔍" />
            ) : !filterApplied ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.dark, marginBottom: 6 }}>
                  Search for bookings above
                </div>
                <div style={{ fontSize: 13, color: COLORS.gray }}>
                  Filter by client name and/or date range to load bookings.
                </div>
              </div>
            ) : bookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.gray, fontSize: 13 }}>
                No bookings found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: COLORS.bgPage }}>
                    <th style={{ padding: '11px 16px' }}>
                      <input
                        type="checkbox"
                        checked={
                          bookings.filter(b => b.id && (!selectedClient || b.client_id === selectedClient.id)).length > 0 &&
                          bookings.filter(b => b.id && (!selectedClient || b.client_id === selectedClient.id)).every(b => selectedIds.includes(b.id))
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    {BOOKING_COLS.map(c => <th key={c.key} style={thStyle}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, i) => {
                    const isSelected = selectedIds.includes(b.id)
                    const isLocked   = selectedClient && selectedClient.id !== b.client_id
                    return (
                      <tr
                        key={b.id ?? b.DSR_CNNO ?? i}
                        onClick={() => !isLocked && toggleRow(b)}
                        style={{
                          borderTop: `1px solid ${COLORS.grayLight}`,
                          background: isSelected ? COLORS.primary + '0d' : isLocked ? '#fafafa' : i % 2 === 0 ? '#fff' : COLORS.bgPage + '50',
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          opacity: isLocked ? 0.45 : 1,
                        }}
                        title={isLocked ? `Locked to "${selectedClient?.name}"` : ''}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <input type="checkbox" checked={isSelected} disabled={isLocked && !isSelected}
                            onChange={() => toggleRow(b)} onClick={e => e.stopPropagation()} />
                        </td>
                        {BOOKING_COLS.map(col => (
                          <td key={col.key} style={{
                            padding: '12px 16px', whiteSpace: 'nowrap',
                            fontWeight: col.key === 'DSR_CNNO' ? 700 : 400,
                            color: col.key === 'DSR_CNNO' ? COLORS.primary : col.key === 'client_name' ? COLORS.dark : COLORS.gray,
                          }}>
                            {col.key === 'TOTAL_AMOUNT'
                              ? b[col.key] ? `₹${Number(b[col.key]).toLocaleString()}` : '—'
                              : col.key === 'DSR_STATUS'
                                ? <StatusBadge status={b[col.key] || '—'} />
                                : col.key === 'DSR_BOOKING_DATE'
                                  ? formatDate(b[col.key])
                                  : b[col.key] || '—'}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div style={{
              padding: '12px 20px', borderTop: `1px solid ${COLORS.grayLight}`,
              background: COLORS.primary + '08',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary }}>
                ✅ {selectedIds.length} booking{selectedIds.length > 1 ? 's' : ''} selected
                {selectedClient && ` · ${selectedClient.name}`}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark }}>
                Est. Total: ₹{bookings.filter(b => selectedIds.includes(b.id))
                  .reduce((s, b) => s + Number(b.TOTAL_AMOUNT || 0), 0).toLocaleString()}
              </span>
            </div>
          )}

          {filterApplied && bookings.length > 0 && !selectedClient && (
            <div style={{ padding: '10px 20px', borderTop: `1px solid ${COLORS.grayLight}`, fontSize: 12, color: COLORS.gray }}>
              ℹ️ All selected bookings must belong to the <strong>same client</strong>.
            </div>
          )}
        </div>
      </Modal>

      {/* ── Invoice Generated Result Popup ── */}
      {showInvoiceResult && generatedInvoice && (
        <ResultPopup
          invoice={generatedInvoice}
          onClose={() => setShowInvoiceResult(false)}
          onDownload={handleDownloadGenerated}
        />
      )}

    </DashboardLayout>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SuggestionDropdown({ items, onSelect, showPhone = false }) {
  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
      background: '#fff', border: `1px solid ${COLORS.border}`,
      borderRadius: RADIUS.md, maxHeight: 200, overflowY: 'auto',
      boxShadow: '0 6px 16px rgba(0,0,0,0.1)', marginTop: 4,
    }}>
      {items.map((c, i) => (
        <div
          key={i}
          onMouseDown={() => onSelect(c)}
          style={{
            padding: '10px 14px', cursor: 'pointer', fontSize: 13,
            display: 'flex', justifyContent: 'space-between',
            borderBottom: i < items.length - 1 ? `1px solid ${COLORS.grayLight}` : 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          <span style={{ fontWeight: 600, color: COLORS.dark }}>{c.name}</span>
          {showPhone && <span style={{ color: COLORS.gray, fontSize: 12 }}>{c.phone}</span>}
        </div>
      ))}
    </div>
  )
}

function LoadingState({ label = 'Loading…', icon = '🔄' }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ color: COLORS.gray, fontSize: 14 }}>{label}</div>
    </div>
  )
}

function EmptyState({ hasData, activeTab, onNew }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>
        {activeTab === 'proforma' ? '📋' : '🧾'}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.dark, marginBottom: 8 }}>
        {hasData ? 'No records match your search' : `No ${activeTab === 'proforma' ? 'proforma invoices' : activeTab === 'all' ? 'invoices' : 'invoices'} yet`}
      </div>
      {!hasData && (
        <Button onClick={onNew}>
          + {activeTab === 'proforma' ? 'New Proforma Invoice' : 'New Invoice'}
        </Button>
      )}
    </div>
  )
}

function ExportMenu({ onExport, exporting }) {
  return (
    <Button
      variant="outline"
      size="sm"
      icon="⬇️"
      onClick={onExport}
      disabled={exporting}
    >
      {exporting ? 'Exporting…' : 'Export'}
    </Button>
  )
}

function ResultPopup({ invoice, onClose, onDownload }) {
  const cfg = INVOICE_TYPES[invoice.invoice_type] || INVOICE_TYPES.invoice
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: RADIUS.lg,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          width: '100%', maxWidth: 440, overflow: 'hidden',
        }}
      >
        <div style={{
          background: invoice.invoice_type === 'proforma'
            ? 'linear-gradient(135deg, #f57f17, #ff8f00cc)'
            : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primary}cc)`,
          padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>✅</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 17, fontFamily: "'Syne', sans-serif" }}>
              {invoice.invoice_type === 'proforma' ? 'Proforma Invoice Generated!' : 'Invoice Generated!'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>
              {cfg.shortLabel} created successfully.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: '50%', width: 30, height: 30,
              cursor: 'pointer', color: '#fff', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >✕</button>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: COLORS.bgPage, borderRadius: RADIUS.md,
            padding: '14px 16px', marginBottom: 16, border: `1px solid ${COLORS.border}`,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                {invoice.invoice_type === 'proforma' ? 'Proforma ID' : 'Invoice ID'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary, fontFamily: "'Syne', sans-serif" }}>
                {invoice.invoice_id ? `${cfg.prefix}-${String(invoice.invoice_id).padStart(5, '0')}` : '—'}
              </div>
            </div>
            <TypeBadge type={invoice.invoice_type} />
          </div>

          {invoice.invoice_url && (
            <a
              href={invoice.invoice_url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', borderRadius: RADIUS.md,
                border: `1.5px dashed ${COLORS.border}`,
                textDecoration: 'none', marginBottom: 20, color: COLORS.dark, fontSize: 13,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.background = COLORS.primary + '06' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 22 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>View PDF</div>
                <div style={{ fontSize: 11, color: COLORS.gray, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {invoice.invoice_url}
                </div>
              </div>
              <span style={{ color: COLORS.primary, fontSize: 16 }}>↗</span>
            </a>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onDownload} disabled={!invoice.invoice_url}
              style={{
                flex: 1, padding: '11px 0', borderRadius: RADIUS.md,
                background: invoice.invoice_type === 'proforma' ? '#f57f17' : COLORS.primary,
                color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
                cursor: invoice.invoice_url ? 'pointer' : 'not-allowed',
                opacity: invoice.invoice_url ? 1 : 0.5,
                fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >📥 Download PDF</button>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '11px 0', borderRadius: RADIUS.md,
                background: COLORS.bgPage, color: COLORS.dark,
                border: `1.5px solid ${COLORS.border}`, fontWeight: 600, fontSize: 13,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ label, onClick, disabled }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); if (!disabled) onClick() }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={disabled}
      style={{
        padding: '4px 10px', fontSize: 12, fontWeight: 600,
        background: hov && !disabled ? COLORS.primaryLight : COLORS.bgPage,
        color: COLORS.primary, border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.sm, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'DM Sans', sans-serif", opacity: disabled ? 0.6 : 1, whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}