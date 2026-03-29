import { useState, useCallback, useRef } from 'react'
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
  filterBookings:   '/api/bookings/filter',
  generateInvoice:  '/api/invoices/generate',      // POST { booking_ids: number[] }
  listInvoices:     '/api/invoices',               // GET  → invoice list (includes pdf_url per row)
  searchClients:    '/api/searchClientsByName',
}

// ─── Booking table columns for the search results ─────────────────────────────
const BOOKING_COLS = [
  { key: 'DSR_CNNO',         label: 'AWB / CN No.'  },
  { key: 'client_name',      label: 'Client'        },
  { key: 'DSR_DEST',         label: 'Destination'   },
  { key: 'CHARGEABLE_WEIGHT',label: 'Chg. Wt.'      },
  { key: 'TOTAL_AMOUNT',     label: 'Amount'        },
  { key: 'DSR_BOOKING_DATE', label: 'Booking Date'  },
  { key: 'DSR_STATUS',       label: 'Status'        },
]

// ─── Invoice status badge colours ─────────────────────────────────────────────
const INV_STATUS_COLOR = {
  Generated: { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
  Sent:      { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
  Paid:      { bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8' },
  Overdue:   { bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
}

function InvStatusBadge({ status }) {
  const s = INV_STATUS_COLOR[status] || INV_STATUS_COLOR['Generated']
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  )
}

// ─── Helper: format booking date ───────────────────────────────────────────────
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

  // ── Invoice list (previously generated) ────────────────────────────────
  const [invoices,        setInvoices]        = useState([])
  const [invoicesLoaded,  setInvoicesLoaded]  = useState(false)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invSearch,       setInvSearch]       = useState('')

  // ── "Generate Invoice" modal state ──────────────────────────────────────
  const [showGenModal,    setShowGenModal]    = useState(false)

  // ── Booking search (inside modal) ───────────────────────────────────────
  const [filterClientName,  setFilterClientName]  = useState('')
  const [filterClientId,    setFilterClientId]    = useState(null)
  const [filterDateFrom,    setFilterDateFrom]    = useState('')
  const [filterDateTo,      setFilterDateTo]      = useState('')
  const [clientSuggestions, setClientSuggestions] = useState([])
  const [showSuggestions,   setShowSuggestions]   = useState(false)
  const [filterLoading,     setFilterLoading]     = useState(false)
  const [bookings,          setBookings]          = useState([])
  const [filterApplied,     setFilterApplied]     = useState(false)

  // ── Row selection ───────────────────────────────────────────────────────
  const [selectedIds,     setSelectedIds]     = useState([])   // booking ids
  const [selectedClient,  setSelectedClient]  = useState(null) // {id, name} — locked once first row picked

  // ── Generate flow ───────────────────────────────────────────────────────
  const [generating,      setGenerating]      = useState(false)
  const [downloadingId,   setDownloadingId]   = useState(null)

  // ── Load invoice list on mount / when modal closes ──────────────────────
  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true)
    try {
      const data = await callApi({
        url: API.listInvoices,
        method: 'GET',
        headers: { Authorization: `Bearer ${token()}` },
      })
      setInvoices(Array.isArray(data) ? data : data.invoices ?? data.data ?? [])
      setInvoicesLoaded(true)
    } catch {
      addToast('Failed to load invoices.', 'error')
    } finally {
      setInvoicesLoading(false)
    }
  }, [])

  // Load once on first render
  useState(() => { loadInvoices() }, [])

  // ── Client autocomplete ─────────────────────────────────────────────────
  const fetchSuggestions = useCallback(
    debounce(async (val) => {
      if (!val.trim()) { setClientSuggestions([]); setShowSuggestions(false); return }
      try {
        const res = await callApi({
          url: `${API.searchClients}?name=${encodeURIComponent(val)}`,
          method: 'GET',
          headers: { Authorization: `Bearer ${token()}` },
        })
        setClientSuggestions(res || [])
        setShowSuggestions(true)
      } catch { /* silent */ }
    }, 350), []
  )

  const handleClientChange = (val) => {
    setFilterClientName(val)
    setFilterClientId(null)
    fetchSuggestions(val)
  }

  const selectSuggestion = (c) => {
    setFilterClientName(c.name)
    setFilterClientId(c.id)
    setClientSuggestions([])
    setShowSuggestions(false)
  }

  // ── Search bookings ─────────────────────────────────────────────────────
  const handleFilter = async () => {
    const hasClient = filterClientName.trim()
    const hasDate   = filterDateFrom || filterDateTo
    if (!hasClient && !hasDate) {
      addToast('Please enter a client or date range.', 'error'); return
    }
    if (hasClient && !filterClientId) {
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
    setFilterDateFrom(''); setFilterDateTo('')
    setBookings([]); setFilterApplied(false)
    setClientSuggestions([]); setShowSuggestions(false)
    setSelectedIds([]); setSelectedClient(null)
  }

  // ── Row selection logic ─────────────────────────────────────────────────
  const toggleRow = (booking) => {
    if (!booking.id) return

    const alreadySelected = selectedIds.includes(booking.id)

    if (alreadySelected) {
      const next = selectedIds.filter(i => i !== booking.id)
      setSelectedIds(next)
      if (next.length === 0) setSelectedClient(null)
      return
    }

    // Enforce same-client rule
    if (selectedClient && selectedClient.id !== booking.client_id) {
      addToast(
        `All bookings must be from the same client. Currently locked to "${selectedClient.name}".`,
        'error'
      )
      return
    }

    setSelectedIds(prev => [...prev, booking.id])
    if (!selectedClient) {
      setSelectedClient({ id: booking.client_id, name: booking.client_name })
    }
  }

  const toggleSelectAll = () => {
    // Only select rows belonging to first selected client (or all if none selected)
    const eligible = bookings.filter(b =>
      b.id && (!selectedClient || b.client_id === selectedClient.id)
    )
    if (selectedIds.length === eligible.length) {
      setSelectedIds([]); setSelectedClient(null)
    } else {
      // Lock to first booking's client if nothing selected yet
      const firstClient = selectedClient || (eligible[0]
        ? { id: eligible[0].client_id, name: eligible[0].client_name }
        : null)
      setSelectedIds(eligible.map(b => b.id))
      setSelectedClient(firstClient)
    }
  }

  // ── Generate Invoice ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (selectedIds.length === 0) {
      addToast('Please select at least one booking.', 'error'); return
    }
    setGenerating(true)
    try {
      const result = await callApi({
        url: API.generateInvoice,
        method: 'POST',
        body: { booking_ids: selectedIds },
        headers: { Authorization: `Bearer ${token()}` },
      })
      addToast(`Invoice ${result.invoice_id || ''} generated successfully!`, 'success')
      setShowGenModal(false)
      resetModal()
      await loadInvoices()
    } catch {
      addToast('Failed to generate invoice.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const resetModal = () => {
    setFilterClientName(''); setFilterClientId(null)
    setFilterDateFrom(''); setFilterDateTo('')
    setBookings([]); setFilterApplied(false)
    setClientSuggestions([]); setShowSuggestions(false)
    setSelectedIds([]); setSelectedClient(null)
  }

  const openModal = () => { resetModal(); setShowGenModal(true) }

  // ── Download PDF via URL from invoice object ───────────────────────────
  const handleDownload = (inv) => {
    if (!inv.pdf_url) {
      addToast('No PDF available for this invoice.', 'error'); return
    }
    setDownloadingId(inv.id)
    const a    = document.createElement('a')
    a.href     = inv.pdf_url
    a.download = `Invoice_${inv.invoice_number || inv.id}.pdf`
    a.target   = '_blank'
    a.click()
    addToast('Invoice downloaded.', 'success')
    setDownloadingId(null)
  }

  // ── Filtered invoice list ───────────────────────────────────────────────
  const filteredInvoices = invoices.filter(inv => {
    const q = invSearch.toLowerCase()
    return (
      String(inv.invoice_number ?? '').toLowerCase().includes(q) ||
      String(inv.client_name    ?? '').toLowerCase().includes(q)
    )
  })

  // ── Shared input style (matches BookingsPage) ───────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>

      {/* ── Page Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{
            fontSize: 22, fontWeight: 700,
            fontFamily: "'Syne', sans-serif", color: COLORS.dark,
          }}>
            Invoices
          </h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
            {invoicesLoaded
              ? `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} generated so far`
              : 'Loading invoices…'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" icon="🔄" size="sm" onClick={loadInvoices} disabled={invoicesLoading}>
            {invoicesLoading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button icon="+" onClick={openModal}>New Invoice</Button>
        </div>
      </div>

      {/* ── Invoices Table ── */}
      <div style={{
        background: COLORS.white, borderRadius: RADIUS.lg,
        border: `1px solid ${COLORS.border}`, overflow: 'hidden',
      }}>

        {/* Toolbar */}
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${COLORS.grayLight}`,
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', fontSize: 14,
            }}>🔍</span>
            <input
              value={invSearch}
              onChange={e => setInvSearch(e.target.value)}
              placeholder="Search by invoice no. or client name…"
              style={{
                width: '100%', padding: '8px 12px 8px 32px', fontSize: 13,
                border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                outline: 'none', fontFamily: "'DM Sans', sans-serif", color: COLORS.dark,
              }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e  => e.target.style.borderColor = COLORS.border}
            />
          </div>
          <span style={{ fontSize: 13, color: COLORS.gray }}>
            {filteredInvoices.length} of {invoices.length} invoices
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          {invoicesLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
              <div style={{ color: COLORS.gray, fontSize: 14 }}>Loading invoices…</div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.dark, marginBottom: 8 }}>
                {invoices.length === 0 ? 'No invoices yet' : 'No invoices match your search'}
              </div>
              <div style={{ fontSize: 13, color: COLORS.gray, maxWidth: 360, margin: '0 auto 20px' }}>
                {invoices.length === 0
                  ? 'Click "+ New Invoice" to search bookings and generate your first invoice.'
                  : 'Try a different search term.'}
              </div>
              {invoices.length === 0 && (
                <Button onClick={openModal}>+ New Invoice</Button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: COLORS.bgPage }}>
                  {['Invoice No.', 'Client', 'Bookings', 'Amount', 'Generated On', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv, i) => (
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
                      {inv.invoice_number || `INV-${String(inv.id).padStart(5, '0')}`}
                    </td>
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
                      <ActionBtn
                        label={downloadingId === inv.id ? '⏳' : '📄 Download'}
                        onClick={() => handleDownload(inv)}
                        disabled={downloadingId === inv.id || !inv.pdf_url}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${COLORS.grayLight}`,
          fontSize: 13, color: COLORS.gray, display: 'flex', justifyContent: 'space-between',
        }}>
          <span>
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} shown
          </span>
          <span style={{ color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}
            onClick={openModal}>
            + Generate New Invoice
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ── Generate Invoice Modal ──
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showGenModal}
        onClose={() => { setShowGenModal(false); resetModal() }}
        title="🧾 Generate New Invoice"
        size="full"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowGenModal(false); resetModal() }}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || selectedIds.length === 0}
            >
              {generating
                ? 'Generating…'
                : selectedIds.length > 0
                  ? `Generate Invoice (${selectedIds.length} booking${selectedIds.length > 1 ? 's' : ''})`
                  : 'Select bookings to generate'}
            </Button>
          </>
        }
      >

        {/* ─ Step 1: Search bookings ─ */}
        <div style={{
          background: COLORS.bgPage, borderRadius: RADIUS.lg,
          border: `1px solid ${COLORS.border}`, padding: '18px 20px', marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark, marginBottom: 14 }}>
            🔎 Step 1 — Search Bookings
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>

            {/* Client autocomplete */}
            <div style={{ position: 'relative', flex: '2 1 240px', minWidth: 220 }}>
              <label style={labelStyle}>Client Name</label>
              <input
                value={filterClientName}
                onChange={e => handleClientChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFilter()}
                onFocus={() => clientSuggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                placeholder="Type client name…"
                style={inputStyle}
                onFocusCapture={e => e.target.style.borderColor = COLORS.primary}
                onBlurCapture={e  => e.target.style.borderColor = COLORS.border}
              />
              {showSuggestions && clientSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                  background: '#fff', border: `1px solid ${COLORS.border}`,
                  borderRadius: RADIUS.md, maxHeight: 200, overflowY: 'auto',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.1)', marginTop: 4,
                }}>
                  {clientSuggestions.map((c, i) => (
                    <div
                      key={i}
                      onMouseDown={() => selectSuggestion(c)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                        display: 'flex', justifyContent: 'space-between',
                        borderBottom: i < clientSuggestions.length - 1 ? `1px solid ${COLORS.grayLight}` : 'none',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <span style={{ fontWeight: 600, color: COLORS.dark }}>{c.name}</span>
                      <span style={{ color: COLORS.gray, fontSize: 12 }}>{c.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date From */}
            <div style={{ flex: '1 1 150px', minWidth: 140 }}>
              <label style={labelStyle}>Date From</label>
              <input
                type="date" value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFilter()}
                style={inputStyle}
              />
            </div>

            {/* Date To */}
            <div style={{ flex: '1 1 150px', minWidth: 140 }}>
              <label style={labelStyle}>Date To</label>
              <input
                type="date" value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFilter()}
                style={inputStyle}
              />
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

        {/* ─ Step 2: Select rows ─ */}
        <div style={{
          background: COLORS.white, borderRadius: RADIUS.lg,
          border: `1px solid ${COLORS.border}`, overflow: 'hidden',
        }}>

          {/* Header row for step 2 */}
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

            {/* Locked-client chip */}
            {selectedClient && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: COLORS.success + '15', border: `1px solid ${COLORS.success}`,
                borderRadius: RADIUS.full, padding: '4px 12px', fontSize: 12,
              }}>
                <span>🔒</span>
                <span style={{ fontWeight: 700, color: COLORS.dark }}>{selectedClient.name}</span>
                <span style={{ color: COLORS.gray, fontSize: 11 }}>— client locked for this invoice</span>
                <span
                  onClick={() => { setSelectedIds([]); setSelectedClient(null) }}
                  style={{ cursor: 'pointer', color: COLORS.danger, fontWeight: 700, marginLeft: 2 }}
                  title="Clear selection"
                >✕</span>
              </div>
            )}
          </div>

          {/* Table content */}
          <div style={{ overflowX: 'auto' }}>
            {filterLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
                <div style={{ color: COLORS.gray, fontSize: 13 }}>Searching bookings…</div>
              </div>
            ) : !filterApplied ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.dark, marginBottom: 6 }}>
                  Search for bookings above
                </div>
                <div style={{ fontSize: 13, color: COLORS.gray }}>
                  Filter by client name and / or date range to load bookings.
                </div>
              </div>
            ) : bookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.gray, fontSize: 13 }}>
                No bookings found for the selected filter.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: COLORS.bgPage }}>
                    <th style={{ padding: '11px 16px' }}>
                      <input
                        type="checkbox"
                        title="Select all eligible rows"
                        checked={
                          bookings.filter(b => b.id && (!selectedClient || b.client_id === selectedClient.id)).length > 0 &&
                          bookings
                            .filter(b => b.id && (!selectedClient || b.client_id === selectedClient.id))
                            .every(b => selectedIds.includes(b.id))
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    {BOOKING_COLS.map(c => (
                      <th key={c.key} style={thStyle}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, i) => {
                    const isSelected  = selectedIds.includes(b.id)
                    const isLocked    = selectedClient && selectedClient.id !== b.client_id
                    return (
                      <tr
                        key={b.id ?? b.DSR_CNNO ?? i}
                        onClick={() => !isLocked && toggleRow(b)}
                        style={{
                          borderTop: `1px solid ${COLORS.grayLight}`,
                          background: isSelected
                            ? COLORS.primary + '0d'
                            : isLocked
                              ? '#fafafa'
                              : i % 2 === 0 ? '#fff' : COLORS.bgPage + '50',
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          opacity: isLocked ? 0.45 : 1,
                          transition: 'background 0.1s',
                        }}
                        title={isLocked ? `Different client — locked to "${selectedClient?.name}"` : ''}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isLocked && !isSelected}
                            onChange={() => toggleRow(b)}
                            onClick={e => e.stopPropagation()}
                          />
                        </td>
                        {BOOKING_COLS.map(col => (
                          <td key={col.key} style={{
                            padding: '12px 16px', whiteSpace: 'nowrap',
                            fontWeight: col.key === 'DSR_CNNO' ? 700 : 400,
                            color: col.key === 'DSR_CNNO' ? COLORS.primary
                              : col.key === 'client_name' ? COLORS.dark
                              : COLORS.gray,
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

          {/* Selection summary bar */}
          {selectedIds.length > 0 && (
            <div style={{
              padding: '12px 20px',
              borderTop: `1px solid ${COLORS.grayLight}`,
              background: COLORS.primary + '08',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 8,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary }}>
                ✅ {selectedIds.length} booking{selectedIds.length > 1 ? 's' : ''} selected
                {selectedClient && ` · Client: ${selectedClient.name}`}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark }}>
                Est. Total: ₹{bookings
                  .filter(b => selectedIds.includes(b.id))
                  .reduce((s, b) => s + Number(b.TOTAL_AMOUNT || 0), 0)
                  .toLocaleString()}
              </span>
            </div>
          )}

          {/* Footer note */}
          {filterApplied && bookings.length > 0 && !selectedClient && (
            <div style={{
              padding: '10px 20px', borderTop: `1px solid ${COLORS.grayLight}`,
              fontSize: 12, color: COLORS.gray,
            }}>
              ℹ️ All selected bookings must belong to the <strong>same client</strong>. Selecting one row
              locks the client for this invoice.
            </div>
          )}
        </div>

      </Modal>
    </DashboardLayout>
  )
}

// ─── Reusable action button ────────────────────────────────────────────────────
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
        color: COLORS.primary,
        border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.sm,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}