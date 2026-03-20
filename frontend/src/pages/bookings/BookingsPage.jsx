import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import DashboardLayout from '../../components/layout/DashboardLayout'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import Badge from '../../components/common/Badge'
import { COLORS, RADIUS } from '../../constants/theme'
import { useApp } from '../../context/AppContext'
import { callApi } from '../../utils/api'

// ─── API Endpoints ─────────────────────────────────────────────────────────────
const API = {
  list:   '/api/bookings',
  update: '/api/bookingUpdate',
  upload: '/api/bookingUpload',
}

// ─── Columns shown in the table (subset of all 83 fields) ─────────────────────
const TABLE_COLS = [
  { key: 'DSR_CNNO',          label: 'AWB/CN No.'  },
  { key: 'DSR_CUST_CODE',     label: 'Cust Code'   },
  { key: 'SENDER_NAME',       label: 'Sender'      },
  { key: 'RECEIVER_NAME',     label: 'Receiver'    },
  { key: 'DSR_DEST',          label: 'Destination' },
  { key: 'DSR_CN_TYPE',       label: 'Type'        },
  { key: 'CHARGEABLE WEIGHT', label: 'Chg. Wt.'   },
  { key: 'DSR_AMT',           label: 'Amount'      },
  { key: 'TOTAL AMOUNT',      label: 'Total'       },
  { key: 'DSR_BOOKING_DATE',  label: 'Booked On'   },
  { key: 'DSR_STATUS',        label: 'Status'      },
]

// ─── ALL editable fields grouped for the edit modal ───────────────────────────
const EDIT_SECTIONS = [
  {
    title: '📦 Consignment Info',
    fields: [
      { key: 'DSR_CNNO',          label: 'AWB / CN Number'  },
      { key: 'DSR_BRANCH_CODE',   label: 'Branch Code'      },
      { key: 'DSR_CUST_CODE',     label: 'Customer Code'    },
      { key: 'DSR_ACT_CUST_CODE', label: 'Actual Cust Code' },
      { key: 'DSR_CN_TYPE',       label: 'CN Type'          },
      { key: 'DSR_MODE',          label: 'Mode'             },
      { key: 'DSR_CONTENTS',      label: 'Contents'         },
      { key: 'DSR_REMARKS',       label: 'Remarks'          },
      { key: 'DSR_REFNO',         label: 'Reference No.'    },
      { key: 'DSR_INVNO',         label: 'Invoice No.'      },
      { key: 'DSR_INVDATE',       label: 'Invoice Date'     },
      { key: 'DSR_VALUE',         label: 'Declared Value'   },
    ],
  },
  {
    title: '⚖️ Weight & Pieces',
    fields: [
      { key: 'ACTUAL WEIGHT',     label: 'Actual Weight (kg)'      },
      { key: 'CHARGEABLE WEIGHT', label: 'Chargeable Weight (kg)'  },
      { key: 'VOLUMETRIC WEIGHT', label: 'Volumetric Weight (kg)'  },
      { key: 'DSR_NO_OF_PIECES',  label: 'No. of Pieces'           },
    ],
  },
  {
    title: '📍 Origin & Destination',
    fields: [
      { key: 'DSR_DEST',                label: 'Destination City'    },
      { key: 'DSR_DEST_PIN',            label: 'Destination Pincode' },
      { key: 'DESTINATION_BRANCH_NAME', label: 'Destination Branch'  },
      { key: 'BKG_PINCODE',             label: 'Booking Pincode'     },
    ],
  },
  {
    title: '👤 Sender',
    fields: [
      { key: 'SENDER_NAME',    label: 'Sender Name'    },
      { key: 'SENDER_ADDRESS', label: 'Sender Address' },
      { key: 'SENDER_PIN',     label: 'Sender Pincode' },
      { key: 'SENDER_MOBILE',  label: 'Sender Mobile'  },
    ],
  },
  {
    title: '📬 Receiver',
    fields: [
      { key: 'RECEIVER_NAME',    label: 'Receiver Name'    },
      { key: 'RECEIVER_ADDRESS', label: 'Receiver Address' },
      { key: 'RECEIVER_PIN',     label: 'Receiver Pincode' },
      { key: 'DSR_MOBILE',       label: 'Mobile'           },
      { key: 'DSR_EMAIL',        label: 'Email'            },
    ],
  },
  {
    title: '💰 Charges',
    fields: [
      { key: 'DSR_AMT',         label: 'Base Amount'      },
      { key: 'FREIGHT_CHARGES', label: 'Freight Charges'  },
      { key: 'FOD_COD_CHARGES', label: 'FoD/CoD Charges'  },
      { key: 'VAS_CHARGES',     label: 'VAS Charges'      },
      { key: 'RISK_SURCHAGES',  label: 'Risk Surcharge'   },
      { key: 'GST',             label: 'GST'              },
      { key: 'DSR_SERVICE_TAX', label: 'Service Tax'      },
      { key: 'DSR_SPL_DISC',    label: 'Special Discount' },
      { key: 'TOTAL AMOUNT',    label: 'Total Amount'     },
      { key: 'FOD_COD_AMT',     label: 'FOD/COD Amount'   },
    ],
  },
  {
    title: '💳 Payment',
    fields: [
      { key: 'CASH_AMT',           label: 'Cash Amount'     },
      { key: 'UPI_ONLINE_AMT',     label: 'UPI / Online'    },
      { key: 'CREDIT_AMT',         label: 'Credit Amount'   },
      { key: 'TRANSACTION_REF_NO', label: 'Transaction Ref' },
      { key: 'PAYMENT_DATE',       label: 'Payment Date'    },
      { key: 'BILL_TO',            label: 'Bill To'         },
    ],
  },
  {
    title: '🚚 Carrier & Delivery',
    fields: [
      { key: 'CARRIER_NAME',            label: 'Carrier Name'      },
      { key: 'CARRIER_AWB',             label: 'Carrier AWB'       },
      { key: 'DSR_BOOKING_DATE',        label: 'Booking Date'      },
      { key: 'DSR_BOOKING_TIME',        label: 'Booking Time'      },
      { key: 'DSR_PICKUP_TIME',         label: 'Pickup Time'       },
      { key: 'EDD_DATE',                label: 'EDD Date'          },
      { key: 'DELIVERED_DATE',          label: 'Delivered Date'    },
      { key: 'RECEIVED_BY',             label: 'Received By'       },
      { key: 'DSR_STATUS',              label: 'Status'            },
      { key: 'LAST_STATUS_DESCRIPTION', label: 'Last Status'       },
      { key: 'DISPATCH_MENIFEST_NO',    label: 'Dispatch Manifest' },
      { key: 'DELIVERY_MENIFEST_NO',    label: 'Delivery Manifest' },
      { key: 'RTO_RECEIPT_DATE',        label: 'RTO Receipt Date'  },
      { key: 'RTO_DELIVERY_DATE',       label: 'RTO Delivery Date' },
    ],
  },
  {
    title: '🔗 Documents & Links',
    fields: [
      { key: 'POD_LINK',      label: 'PoD Link'     },
      { key: 'SHPT_DOC_LINK', label: 'Shipment Doc' },
      { key: 'PI_NO',         label: 'PI Number'    },
      { key: 'PI_DATE',       label: 'PI Date'      },
      { key: 'INVOICE_NO',    label: 'Invoice No.'  },
      { key: 'INVOICE_DATE',  label: 'Invoice Date' },
    ],
  },
  {
    title: '🗒️ FR / Remarks',
    fields: [
      { key: 'FR_STATUS',                   label: 'FR Status'        },
      { key: 'FR_CS_REMARK',                label: 'FR CS Remark'     },
      { key: 'FR_SALES_OPS_BILLING_REMARK', label: 'Sales/OPS Remark' },
      { key: 'DSR_POD_RECD',                label: 'POD Received'     },
      { key: 'TRANS_STATUS',                label: 'Trans Status'     },
      { key: 'FR_DP_CODE',                  label: 'FR DP Code'       },
    ],
  },
]

const STATUSES = ['All', 'Booked', 'In Transit', 'Delivered', 'Cancelled']

// ─── Parse uploaded xlsx → array of uppercase-keyed row objects ───────────────
function parseXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        // Normalize all keys to UPPERCASE to match backend storage
        const rows = rawRows.map(row =>
          Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toUpperCase(), v]))
        )
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const { addToast } = useApp()
  const fileInputRef = useRef(null)

  const [bookings, setBookings]           = useState([])
  const [localRows, setLocalRows]         = useState([])   // only rows from Excel, no id yet
  const [loading, setLoading]             = useState(true)
  const [uploading, setUploading]         = useState(false)
  const [saving, setSaving]               = useState(false)
  const [search, setSearch]               = useState('')
  const [filter, setFilter]               = useState('All')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRow, setEditingRow]       = useState(null)
  const [form, setForm]                   = useState({})
  const [dragOver, setDragOver]           = useState(false)
  const [sortOrder, setSortOrder] = useState('desc') // 'desc' = newest first
  // ── Fetch from API ──────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const data = await callApi({
        url: API.list,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      setBookings(Array.isArray(data) ? data : data.bookings ?? [])
    } catch (err) {
      addToast('Failed to load bookings.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  // ── Handle Excel file upload (frontend only, no API) ────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(ext)) {
      addToast('Please upload a valid .xlsx or .xls file.', 'error')
      return
    }
    setUploading(true)
    try {
      const rows = await parseXlsx(file)
      if (rows.length === 0) { addToast('File is empty.', 'error'); return }

      // Merge into main bookings display (existing server rows take priority for id)
      setBookings((prev) => {
        const prevMap = new Map(prev.map((r) => [r.DSR_CNNO, r]))
        rows.forEach((r) => prevMap.set(r.DSR_CNNO, r))
        return Array.from(prevMap.values())
      })

      // Track only new Excel rows separately (these have no id yet)
      setLocalRows((prev) => {
        const prevMap = new Map(prev.map((r) => [r.DSR_CNNO, r]))
        rows.forEach((r) => prevMap.set(r.DSR_CNNO, r))
        return Array.from(prevMap.values())
      })

      addToast(`Loaded ${rows.length} bookings from file.`, 'success')
    } catch {
      addToast('Failed to parse file.', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Edit helpers ────────────────────────────────────────────────────────
  const openEdit = (row) => {
    setEditingRow(row)
    setForm({ ...row })
    setShowEditModal(true)
  }

  const closeEdit = () => {
    setShowEditModal(false)
    setEditingRow(null)
    setForm({})
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingRow.id) {
        // ── Has id → came from server → hit API ──
        const token = localStorage.getItem('access_token')
        const data_to_update = {...form , "id" :editingRow.id}
        const updated = await callApi({
          url: API.update,
          method: 'PUT',
          body: {data : data_to_update},
          headers: { Authorization: `Bearer ${token}` },
        })
        // setBookings((prev) =>
        //   prev.map((r) => (r.id === editingRow.id ? { ...r, ...updated } : r))
        // )
        setBookings((prev) =>
          prev.map((r) => (r.id === editingRow.id ? { ...r, ...updated.data } : r))
        )
        addToast(`Booking ${editingRow.DSR_CNNO} updated!`, 'success')
      } else {
        // ── No id → came from Excel → update frontend only ──
        setBookings((prev) =>
          prev.map((r) => (r.DSR_CNNO === editingRow.DSR_CNNO ? { ...r, ...form } : r))
        )
        // Keep localRows in sync so the edited version gets sent on sync
        setLocalRows((prev) =>
          prev.map((r) => (r.DSR_CNNO === editingRow.DSR_CNNO ? { ...r, ...form } : r))
        )
        addToast(`Changes saved locally — sync to server to apply.`, 'success')
      }
      closeEdit()
    } catch {
      addToast('Failed to save changes.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Sync Excel rows to server ───────────────────────────────────────────
  const handleUploadToServer = async () => {
    if (localRows.length === 0) {
      addToast('No new Excel rows to upload — all data is already from the server.', 'error')
      return
    }
    setSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await callApi({
        url: API.upload,
        method: 'POST',
        body: { data: localRows },
        headers: { Authorization: `Bearer ${token}` },
      })
      // Server returns saved rows with ids — patch ids back into bookings state
      const savedRows = Array.isArray(response) ? response : response.data ?? []
      if (savedRows.length > 0) {
        setBookings((prev) => {
          const byAwb = new Map(savedRows.map((r) => [r.DSR_CNNO, r]))
          return prev.map((r) => byAwb.has(r.DSR_CNNO) ? { ...r, ...byAwb.get(r.DSR_CNNO) } : r)
        })
      }
      addToast(`${localRows.length} bookings synced to server!`, 'success')
      setLocalRows([])
    } catch {
      addToast('Failed to upload bookings to server.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Filter / search ─────────────────────────────────────────────────────
const filtered = bookings
  .filter((b) => {
    const q = search.toLowerCase()
    const matchSearch =
      String(b.DSR_CNNO      ?? '').toLowerCase().includes(q) ||
      String(b.DSR_CUST_CODE ?? '').toLowerCase().includes(q) ||
      String(b.DSR_DEST      ?? '').toLowerCase().includes(q) ||
      String(b.SENDER_NAME   ?? '').toLowerCase().includes(q) ||
      String(b.RECEIVER_NAME ?? '').toLowerCase().includes(q)
    const matchFilter = filter === 'All' || b.DSR_STATUS === filter
    return matchSearch && matchFilter
  })
  .sort((a, b) => {
    const parse = (d) => {
      if (!d) return new Date(0)
      const s = String(d)
      // DD-MM-YYYY → reverse to YYYY-MM-DD
      if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split('-')
        return new Date(`${yyyy}-${mm}-${dd}`)
      }
      // DD/MM/YYYY → reverse to YYYY-MM-DD
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split('/')
        return new Date(`${yyyy}-${mm}-${dd}`)
      }
      // Already YYYY-MM-DD or ISO string — parse directly
      return new Date(s)
    }
    const diff = parse(a.DSR_BOOKING_DATE) - parse(b.DSR_BOOKING_DATE)
    return sortOrder === 'desc' ? -diff : diff
  })

  // ── Summary counts ──────────────────────────────────────────────────────
  const counts = {
    total:     bookings.length,
    inTransit: bookings.filter(b => b.DSR_STATUS === 'In Transit').length,
    delivered: bookings.filter(b => b.DSR_STATUS === 'Delivered').length,
    booked:    bookings.filter(b => b.DSR_STATUS === 'Booked' || b.DSR_STATUS === 'B').length,
    cancelled: bookings.filter(b => b.DSR_STATUS === 'Cancelled').length,
  }

  // ── Export visible rows ─────────────────────────────────────────────────
  const handleExport = () => {
    if (filtered.length === 0) { addToast('Nothing to export.', 'error'); return }
    const ws = XLSX.utils.json_to_sheet(filtered)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings')
    XLSX.writeFile(wb, `Bookings_${new Date().toISOString().slice(0, 10)}.xlsx`)
    addToast(`Exported ${filtered.length} bookings.`, 'success')
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.dark, fontFamily: "'Syne', sans-serif" }}>
            Consignment Bookings
          </h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
            {loading ? 'Loading…' : `${bookings.length} total bookings — ${counts.inTransit} in transit`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files[0])}
          />
          <Button
            variant="outline"
            icon="📂"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Reading…' : 'Upload Excel'}
          </Button>
          <Button variant="outline" icon="📤" size="sm" onClick={handleExport}>
            Export Excel
          </Button>
          <Button
            icon="☁️"
            onClick={handleUploadToServer}
            disabled={saving || localRows.length === 0}
          >
            {saving ? 'Uploading…' : `Sync to Server (${localRows.length})`}
          </Button>
        </div>
      </div>

      {/* ── Drag-drop upload zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false)
          handleFileUpload(e.dataTransfer.files[0])
        }}
        style={{
          border: `2px dashed ${dragOver ? COLORS.primary : COLORS.border}`,
          borderRadius: RADIUS.lg,
          padding: '18px 24px',
          marginBottom: 18,
          background: dragOver ? COLORS.primary + '08' : COLORS.white,
          display: 'flex', alignItems: 'center', gap: 14,
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <span style={{ fontSize: 28 }}>📊</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.dark }}>
            Drop your DSR Excel file here, or click to browse
          </div>
          <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 3 }}>
            Supports .xlsx and .xls · All {EDIT_SECTIONS.reduce((a, s) => a + s.fields.length, 0)} fields supported · Duplicate AWBs merged automatically
          </div>
        </div>
        {localRows.length > 0 && (
          <div style={{
            marginLeft: 'auto', background: COLORS.warning + '18',
            border: `1px solid ${COLORS.warning}`, borderRadius: RADIUS.md,
            padding: '6px 14px', fontSize: 12, fontWeight: 600, color: COLORS.warning,
            whiteSpace: 'nowrap',
          }}>
            {localRows.length} pending sync
          </div>
        )}
      </div>

      {/* ── Summary Badges ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { label: 'Total',      count: counts.total,     color: COLORS.primary },
          { label: 'In Transit', count: counts.inTransit, color: COLORS.info    },
          { label: 'Delivered',  count: counts.delivered, color: COLORS.success },
          { label: 'Booked',     count: counts.booked,    color: COLORS.warning },
          { label: 'Cancelled',  count: counts.cancelled, color: COLORS.danger  },
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

      {/* ── Table card ── */}
      <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${COLORS.grayLight}`,
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search AWB, customer, destination, sender…"
              style={{
                width: '100%', padding: '9px 12px 9px 34px', fontSize: 14,
                border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                outline: 'none', fontFamily: "'DM Sans', sans-serif", color: COLORS.dark,
              }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e  => e.target.style.borderColor = COLORS.border}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '6px 14px', borderRadius: RADIUS.full, fontSize: 13,
                  fontWeight: 500, cursor: 'pointer',
                  border: `1.5px solid ${filter === s ? COLORS.primary : COLORS.border}`,
                  background: filter === s ? COLORS.primary : 'transparent',
                  color: filter === s ? COLORS.white : COLORS.gray,
                  transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
                }}
              >{s}</button>
            ))}
          </div>
                    {/* Sort by date */}
          <button
            onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
            style={{
              padding: '6px 14px', borderRadius: RADIUS.full, fontSize: 13,
              fontWeight: 500, cursor: 'pointer',
              border: `1.5px solid ${COLORS.border}`,
              background: 'transparent', color: COLORS.gray,
              transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.primary}
            onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
          >
            {sortOrder === 'desc' ? '↓' : '↑'} Date
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.gray }}>Loading bookings…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.gray }}>
              {bookings.length === 0
                ? 'No bookings yet — upload an Excel file or wait for API data.'
                : 'No bookings match your search.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: COLORS.bgPage }}>
                  {[...TABLE_COLS.map(c => c.label), 'Action'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
                      color: COLORS.gray, fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr
                    key={b.id ?? b.DSR_CNNO ?? i}
                    style={{ borderTop: `1px solid ${COLORS.grayLight}` }}
                    onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {TABLE_COLS.map(({ key }) => (
                      <td key={key} style={{
                        padding: '12px 16px', whiteSpace: 'nowrap',
                        color: key === 'DSR_CNNO' ? COLORS.primary : COLORS.dark,
                        fontWeight: key === 'DSR_CNNO' ? 700 : key === 'DSR_AMT' || key === 'TOTAL AMOUNT' ? 600 : 400,
                      }}>
                        {key === 'DSR_STATUS' ? (
                          <StatusBadge status={b[key] || '—'} />
                        ) : key === 'DSR_AMT' || key === 'TOTAL AMOUNT' ? (
                          b[key] != null && b[key] !== '' ? `₹${Number(b[key]).toLocaleString()}` : '—'
                        ) : (
                          b[key] != null && b[key] !== '' ? String(b[key]) : '—'
                        )}
                      </td>
                    ))}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {/* Show "local" pill for unsynced Excel rows */}
                      {!b.id && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, marginRight: 6,
                          background: COLORS.warning + '20', color: COLORS.warning,
                          borderRadius: RADIUS.full, padding: '2px 7px',
                        }}>LOCAL</span>
                      )}
                      <button
                        onClick={() => openEdit(b)}
                        style={{
                          padding: '5px 12px', fontSize: 12, fontWeight: 600,
                          border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.sm,
                          background: 'transparent', cursor: 'pointer', color: COLORS.dark,
                          fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.target.style.background = COLORS.primary; e.target.style.color = '#fff'; e.target.style.borderColor = COLORS.primary }}
                        onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = COLORS.dark; e.target.style.borderColor = COLORS.border }}
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

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${COLORS.grayLight}`,
          fontSize: 13, color: COLORS.gray, display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Showing {filtered.length} of {bookings.length} records</span>
          {localRows.length > 0 && (
            <span style={{ color: COLORS.warning, fontWeight: 600 }}>
              ⚠️ {localRows.length} local row{localRows.length > 1 ? 's' : ''} pending sync
            </span>
          )}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      <Modal
        isOpen={showEditModal}
        onClose={closeEdit}
        title={
          editingRow?.id
            ? `Edit Booking — ${editingRow?.DSR_CNNO || ''}`
            : `Edit Booking (Local) — ${editingRow?.DSR_CNNO || ''}`
        }
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeEdit} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingRow?.id ? 'Save Changes' : 'Save Locally'}
            </Button>
          </>
        }
      >
        {/* Banner for local-only rows */}
        {!editingRow?.id && (
          <div style={{
            background: COLORS.warning + '15',
            border: `1px solid ${COLORS.warning}`,
            borderRadius: RADIUS.md,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 13,
            color: COLORS.warning,
            fontWeight: 500,
          }}>
            ⚠️ This booking is not yet synced to the server. Changes will be saved locally and sent when you click "Sync to Server".
          </div>
        )}
        {EDIT_SECTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: COLORS.dark }}>
              {section.title}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {section.fields.map(({ key, label }) => (
                <Input
                  key={key}
                  label={label}
                  value={form[key] ?? ''}
                  onChange={(e) => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={label}
                />
              ))}
            </div>
          </div>
        ))}
      </Modal>

    </DashboardLayout>
  )
}