import { useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
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
  filter:     '/api/bookings/filter',
  update:     '/api/bookingUpdate',
  upload:     '/api/bookingUpload',
  delete:     '/api/deleteBooking',
  addBooking: '/api/addBooking',
}

const TABLE_COLS = [
  { key: 'client_name',       label: 'Client'       },  // lowercase — as returned by FastAPI
  { key: 'DSR_CNNO',          label: 'AWB/CN No.'   },
  { key: 'DSR_ACT_CUST_CODE', label: 'Cust Code'    },
  { key: 'DSR_DEST',          label: 'Destination'  },
  { key: 'DSR_DEST_PIN',      label: 'Dest. Pin'    },
  { key: 'DSR_CN_TYPE',       label: 'Type'         },
  { key: 'CHARGEABLE_WEIGHT', label: 'Chg. Wt.'     },
  { key: 'TOTAL_AMOUNT',      label: 'Total'        },
  { key: 'DSR_BOOKING_DATE',  label: 'Booked On'    },
]

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
      { key: 'DSR_BOOKED_BY',     label: 'Booked By'        },
      { key: 'DSR_DOX',           label: 'DOX'              },
    ],
  },
  {
    title: '⚖️ Weight & Pieces',
    fields: [
      { key: 'ACTUAL_WEIGHT',     label: 'Actual Weight (kg)'     },
      { key: 'CHARGEABLE_WEIGHT', label: 'Chargeable Weight (kg)' },
      { key: 'VOLUMETRIC_WEIGHT', label: 'Volumetric Weight (kg)' },
      { key: 'DSR_NO_OF_PIECES',  label: 'No. of Pieces'          },
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
      { key: 'IGST',            label: 'IGST'             },
      { key: 'CGST',            label: 'CGST'             },
      { key: 'SGST',            label: 'SGST'             },
      { key: 'DSR_SERVICE_TAX', label: 'Service Tax'      },
      { key: 'DSR_SPL_DISC',    label: 'Special Discount' },
      { key: 'TOTAL_AMOUNT',    label: 'Total Amount'     },
      { key: 'FOD_COD_AMT',     label: 'FOD/COD Amount'   },
    ],
  },
  {
    title: '💳 Payment',
    fields: [
      { key: 'CASH_AMT',                       label: 'Cash Amount'     },
      { key: 'UPI_ONLINE_AMT',                 label: 'UPI / Online'    },
      { key: 'CREDIT_AMT',                     label: 'Credit Amount'   },
      { key: 'TRANSACTION_REF_NO',             label: 'Transaction Ref' },
      { key: 'PAYMENT_DATE',                   label: 'Payment Date'    },
      { key: 'BILL_TO_CUSTOMER_NAME',          label: 'Bill To Name'    },
      { key: 'BILL_TO_CUSTOMER_MOBILE_NUMBER', label: 'Bill To Mobile'  },
      { key: 'BILL_TO_CUSTOMER_ADDRESS',       label: 'Bill To Address' },
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
      { key: 'FR_CS_NAME',                  label: 'FR CS Name'       },
      { key: 'FR_CS_REMARK',                label: 'FR CS Remark'     },
      { key: 'FR_SALES_PERSON',             label: 'FR Sales Person'  },
      { key: 'FR_OPS_PERSON',               label: 'FR OPS Person'    },
      { key: 'FR_SALES_OPS_BILLING_REMARK', label: 'Sales/OPS Remark' },
      { key: 'DSR_POD_RECD',                label: 'POD Received'     },
      { key: 'TRANS_STATUS',                label: 'Trans Status'     },
      { key: 'FR_DP_CODE',                  label: 'FR DP Code'       },
    ],
  },
]

// ─── Parse uploaded xlsx ───────────────────────────────────────────────────────
function parseXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }).map(row =>
          Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toUpperCase(), v]))
        )
        resolve(rows)
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ─── Shared cell renderer ──────────────────────────────────────────────────────
function CellValue({ col, row }) {
  const val = row[col.key]
  if (col.key === 'DSR_STATUS')
    return <StatusBadge status={val || '—'} />
  if (col.key === 'TOTAL_AMOUNT' || col.key === 'DSR_AMT')
    return val ? `₹${Number(val).toLocaleString()}` : '—'
  // client_name comes lowercase from FastAPI — display as-is
  if (col.key === 'client_name')
    return val || <span style={{ color: '#bbb', fontStyle: 'italic' }}>—</span>
  return val || '—'
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const { addToast }  = useApp()
  const fileInputRef  = useRef(null)

  // ── Core data — starts EMPTY, populated only by filter ─────────────────
  const [bookings, setBookings]       = useState([])       // displayed rows (filter results)
  const [localRows, setLocalRows]     = useState([])       // excel rows pending sync
  const [filterApplied, setFilterApplied] = useState(false)
  const [filterLoading, setFilterLoading] = useState(false)

  // ── Active filter values (shown as chips after search) ─────────────────
  const [activeFilters, setActiveFilters] = useState({ clientName: '', dateFrom: '', dateTo: '' })

  // ── Filter inputs ───────────────────────────────────────────────────────
  const [filterClientName, setFilterClientName] = useState('')
  const [filterClientId,   setFilterClientId]   = useState(null)   // ✅ send id not name
  const [filterDateFrom,   setFilterDateFrom]   = useState('')
  const [filterDateTo,     setFilterDateTo]     = useState('')
  const [clientSuggestions, setClientSuggestions] = useState([])
  const [showSuggestions,   setShowSuggestions]   = useState(false)

  // ── Table UI state ──────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('')
  const [sortOrder,    setSortOrder]    = useState('desc')
  const [selectedRows, setSelectedRows] = useState([])
  const [uploading,    setUploading]    = useState(false)
  const [saving,       setSaving]       = useState(false)

  // ── Edit modal ──────────────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRow,    setEditingRow]    = useState(null)
  const [form,          setForm]          = useState({})

  // ── Add booking modal ───────────────────────────────────────────────────
  const [showAddModal,      setShowAddModal]      = useState(false)
  const [date,              setDate]              = useState(new Date().toISOString().split('T')[0])
  const [clients,           setClients]           = useState([])
  const [clientSearch,      setClientSearch]      = useState('')
  const [clientPhoneSearch, setClientPhoneSearch] = useState('')
  const [selectedClient,    setSelectedClient]    = useState(null)
  const [isCreating,        setIsCreating]        = useState(false)
  const [showNameDropdown,  setShowNameDropdown]  = useState(false)
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false)
  const [dragOver,          setDragOver]          = useState(false)

  const [newRows, setNewRows] = useState([{
    DSR_CNNO: '', DSR_REF_NO: '', CHARGEABLE_WEIGHT: '',
    RECEIVER_NAME: '', RECEIVER_PIN: '', CASH_AMOUNT: '',
    UPI_ONLINE_AMOUNT: '', CREDIT_AMOUNT: '', TRANSACTION_REFNO: '',
    PAYMENT_DATE: null, TOTAL_AMOUNT: '', REMARK: '',
  }])

  // ── Auth helper ─────────────────────────────────────────────────────────
  const token = () => localStorage.getItem('access_token')

  // ── Client autocomplete for filter bar ─────────────────────────────────
  const fetchFilterSuggestions = useCallback(
    debounce(async (val) => {
      if (!val.trim()) { setClientSuggestions([]); setShowSuggestions(false); return }
      try {
        const res = await callApi({
          url: `/api/searchClientsByName?name=${encodeURIComponent(val)}`,
          method: 'GET',
          headers: { Authorization: `Bearer ${token()}` },
        })
        setClientSuggestions(res || [])
        setShowSuggestions(true)
      } catch { /* silent — don't block typing */ }
    }, 350),
    []
  )

  const handleFilterClientChange = (val) => {
    setFilterClientName(val)
    setFilterClientId(null)            // ✅ clear id if user edits the name manually
    fetchFilterSuggestions(val)
  }

  const selectSuggestion = (client) => {
    setFilterClientName(client.name)
    setFilterClientId(client.id)      // ✅ store id for API call
    setClientSuggestions([])
    setShowSuggestions(false)
  }

  // ── FILTER → hit API ────────────────────────────────────────────────────
  const handleFilter = async () => {
    const hasClient = filterClientName.trim()
    const hasDate   = filterDateFrom || filterDateTo

    if (!hasClient && !hasDate) {
      addToast('Please enter a client name or select a date range to search.', 'error')
      return
    }

    // ✅ If a name is typed but no suggestion was selected, we have no id — block it
    if (hasClient && !filterClientId) {
      addToast('Please select a client from the dropdown to ensure accuracy.', 'error')
      return
    }

    setFilterLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterClientId)  params.append('client_id', filterClientId)   // ✅ id, not name
      if (filterDateFrom)  params.append('date_from', filterDateFrom)
      if (filterDateTo)    params.append('date_to',   filterDateTo)

      const data = await callApi({
        url: `${API.filter}?${params.toString()}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token()}` },
      })

      const rows = Array.isArray(data) ? data : (data.bookings ?? data.data ?? [])
      setBookings(rows)
      setFilterApplied(true)
      setActiveFilters({
        clientName: filterClientName.trim(),
        dateFrom:   filterDateFrom,
        dateTo:     filterDateTo,
      })
      setSelectedRows([])

      if (rows.length === 0)
        addToast('No bookings found for the given filter.', 'error')
      else
        addToast(`${rows.length} booking${rows.length !== 1 ? 's' : ''} found.`, 'success')
    } catch {
      addToast('Failed to fetch bookings. Please try again.', 'error')
    } finally {
      setFilterLoading(false)
    }
  }

  // ── Clear filter → back to empty state ─────────────────────────────────
  const handleClearFilter = () => {
    setFilterClientName('')
    setFilterClientId(null)           // ✅ reset id too
    setFilterDateFrom('')
    setFilterDateTo('')
    setBookings([])
    setFilterApplied(false)
    setActiveFilters({ clientName: '', dateFrom: '', dateTo: '' })
    setClientSuggestions([])
    setShowSuggestions(false)
    setSelectedRows([])
    setSearch('')
  }

  // ── Allow Enter key to trigger search ──────────────────────────────────
  const handleFilterKeyDown = (e) => {
    if (e.key === 'Enter') { setShowSuggestions(false); handleFilter() }
  }

  // ── Excel upload (frontend parse) ───────────────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(ext)) {
      addToast('Please upload a valid .xlsx or .xls file.', 'error'); return
    }
    setUploading(true)
    try {
      const rows = await parseXlsx(file)
      if (rows.length === 0) { addToast('File is empty.', 'error'); return }

      // Tag every row as local so the table can style it differently
      const taggedRows = rows.map(r => ({ ...r, _isLocal: true }))

      // Keep localRows in sync (used for syncing to server)
      setLocalRows(prev => {
        const m = new Map(prev.map(r => [r.DSR_CNNO, r]))
        rows.forEach(r => m.set(r.DSR_CNNO, r))
        return Array.from(m.values())
      })

      // ✅ Immediately show rows in the table by merging into bookings state.
      // Server rows (from filter) take priority — local rows fill any gaps.
      setBookings(prev => {
        const m = new Map(prev.map(r => [r.DSR_CNNO, r]))
        taggedRows.forEach(r => {
          if (!m.has(r.DSR_CNNO)) m.set(r.DSR_CNNO, r)  // don't overwrite server rows
        })
        return Array.from(m.values())
      })

      addToast(`${rows.length} row${rows.length !== 1 ? 's' : ''} loaded — shown below. Click "Sync to Server" to save.`, 'success')
    } catch {
      addToast('Failed to parse file.', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Sync excel rows to server ───────────────────────────────────────────
  const handleUploadToServer = async () => {
    if (localRows.length === 0) {
      addToast('No pending Excel rows to sync.', 'error'); return
    }
    setSaving(true)
    try {
      const response = await callApi({
        url: '/api/bookingUpload',
        method: 'POST',
        body: { data: localRows },
        headers: { Authorization: `Bearer ${token()}` },
      })
      const savedRows = Array.isArray(response) ? response : response.data ?? []

      // Patch server-assigned ids + strip _isLocal flag so rows look normal
      setBookings(prev => {
        const byAwb = new Map(savedRows.map(r => [r.DSR_CNNO, r]))
        return prev.map(r => {
          if (byAwb.has(r.DSR_CNNO)) {
            const { _isLocal, ...rest } = { ...r, ...byAwb.get(r.DSR_CNNO) }
            return rest
          }
          return r
        })
      })

      addToast(`${localRows.length} bookings synced!`, 'success')
      setLocalRows([])
    } catch {
      addToast('Failed to sync bookings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (row) => {
    if (!row.id) { addToast('Cannot delete unsynced row', 'error'); return }
    if (!window.confirm(`Delete booking ${row.DSR_CNNO}?`)) return
    try {
      await callApi({
        url: API.delete,
        method: 'DELETE',
        body: { id: row.id },
        headers: { Authorization: `Bearer ${token()}` },
      })
      setBookings(prev => prev.filter(r => r.id !== row.id))
      addToast('Deleted successfully.', 'success')
    } catch {
      addToast('Delete failed.', 'error')
    }
  }

  // ── Selection ───────────────────────────────────────────────────────────
  const toggleRowSelection = (id) =>
    setSelectedRows(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const toggleSelectAll = () => {
    const ids = filtered.filter(r => r.id).map(r => r.id)
    setSelectedRows(selectedRows.length === ids.length ? [] : ids)
  }

  // ── Invoice removed ────────────────────────────────────────────────────

  // ── Edit ────────────────────────────────────────────────────────────────
  const openEdit  = (row) => { setEditingRow(row); setForm({ ...row }); setShowEditModal(true) }
  const closeEdit = () => { setShowEditModal(false); setEditingRow(null); setForm({}) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingRow.id) {
        // ✅ client_name is display-only (joined from clients table) — never send it to update API
        const { client_name, _isLocal, ...cleanForm } = form
        const updated = await callApi({
          url: API.update,
          method: 'PUT',
          body: { data: { ...cleanForm, id: editingRow.id } },
          headers: { Authorization: `Bearer ${token()}` },
        })
        setBookings(prev => prev.map(r => r.id === editingRow.id ? { ...r, ...updated.data } : r))
        addToast(`Booking ${editingRow.DSR_CNNO} updated!`, 'success')
      } else {
        setBookings(prev => prev.map(r => r.DSR_CNNO === editingRow.DSR_CNNO ? { ...r, ...form } : r))
        setLocalRows(prev => prev.map(r => r.DSR_CNNO === editingRow.DSR_CNNO ? { ...r, ...form } : r))
        addToast('Saved locally — sync to server to apply.', 'success')
      }
      closeEdit()
    } catch {
      addToast('Failed to save changes.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Add booking helpers ─────────────────────────────────────────────────
  const addNewRow    = () => setNewRows(p => [...p, {
    DSR_CNNO: '', DSR_REF_NO: '', CHARGEABLE_WEIGHT: '', RECEIVER_NAME: '',
    RECEIVER_PIN: '', CASH_AMOUNT: '', UPI_ONLINE_AMOUNT: '', CREDIT_AMOUNT: '',
    TRANSACTION_REFNO: '', PAYMENT_DATE: null, TOTAL_AMOUNT: '', REMARK: '',
  }])
  const removeNewRow = (i) => setNewRows(p => p.filter((_, idx) => idx !== i))
  const handleNewRowChange = (i, key, val) => {
    setNewRows(p => { const u = [...p]; u[i][key] = val; return u })
  }

  const fetchClientsByName = async (val) => {
    if (!val.trim()) { setClients([]); setShowNameDropdown(false); return }
    try {
      const res = await callApi({
        url: `/api/searchClientsByName?name=${encodeURIComponent(val)}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token()}` },
      })
      setClients(res || [])
      setShowNameDropdown(true)
    } catch { addToast('Failed to load clients', 'error') }
  }

  const fetchClientsByPhone = async (val) => {
    if (!val.trim()) { setClients([]); setShowPhoneDropdown(false); return }
    try {
      const res = await callApi({
        url: `/api/searchClientsByPhone?phone=${encodeURIComponent(val)}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token()}` },
      })
      setClients(res || [])
      setShowPhoneDropdown(true)
    } catch { addToast('Failed to load clients', 'error') }
  }

  const debouncedByName  = useCallback(debounce(fetchClientsByName,  400), [])
  const debouncedByPhone = useCallback(debounce(fetchClientsByPhone, 400), [])

  const handleSelectClient = (c) => {
    setSelectedClient({ id: c.id, name: c.name, phone: c.phone })
    setClientSearch(c.name); setClientPhoneSearch(c.phone)
    setClients([]); setShowNameDropdown(false); setShowPhoneDropdown(false)
  }

  const handleCreateBooking = async () => {
    if (isCreating)         return
    if (!selectedClient)                      { addToast('Please select a client', 'error'); return }
    if (newRows.some(r => !r.DSR_CNNO))       { addToast('Please add DSR CNNO', 'error'); return }
    if (newRows.some(r => !r.DSR_REF_NO))     { addToast('Please add DSR REF No', 'error'); return }
    if (newRows.some(r => !r.CHARGEABLE_WEIGHT)) { addToast('Please add chargeable weight', 'error'); return }
    try {
      setIsCreating(true)
      await callApi({
        url: API.addBooking,
        method: 'POST',
        body: { client_id: selectedClient.id, booking_date: date, bookings: newRows },
        headers: { Authorization: `Bearer ${token()}` },
      })
      addToast('Bookings created successfully', 'success')
      setShowAddModal(false)
      setNewRows([{ DSR_CNNO: '', DSR_REF_NO: '', CHARGEABLE_WEIGHT: '', RECEIVER_NAME: '',
        RECEIVER_PIN: '', CASH_AMOUNT: '', UPI_ONLINE_AMOUNT: '', CREDIT_AMOUNT: '',
        TRANSACTION_REFNO: '', PAYMENT_DATE: null, TOTAL_AMOUNT: '', REMARK: '' }])
      // Re-run last filter to reflect new data
      if (filterApplied) handleFilter()
    } catch {
      addToast('Failed to create booking', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  // ── Export selected rows (or all filtered if nothing selected) ────────────
  const handleExport = () => {
    // Decide which rows to export
    const rowsToExport = selectedRows.length > 0
      ? filtered.filter(r => r.id && selectedRows.includes(r.id))
      : filtered

    if (rowsToExport.length === 0) { addToast('Nothing to export.', 'error'); return }

    // Build clean export rows: client_name first, strip internal flags
    const exportData = rowsToExport.map(r => {
      const { _isLocal, ...rest } = r
      // Put client_name at the very front for readability
      const { client_name, ...others } = rest
      return { CLIENT_NAME: client_name ?? '', ...others }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings')
    XLSX.writeFile(wb, `Bookings_${new Date().toISOString().slice(0, 10)}.xlsx`)
    addToast(
      selectedRows.length > 0
        ? `Exported ${rowsToExport.length} selected booking${rowsToExport.length !== 1 ? 's' : ''}.`
        : `Exported all ${rowsToExport.length} filtered bookings.`,
      'success'
    )
  }

  // ── Client-side search + sort ───────────────────────────────────────────
  // bookings holds BOTH server rows (filter results) AND local Excel rows (_isLocal:true).
  // Local rows are always visible; server rows only appear after a filter is applied.
  const filtered = bookings
    .filter(b => {
      const q = search.toLowerCase()
      return (
        String(b.DSR_CNNO      ?? '').toLowerCase().includes(q) ||
        String(b.client_name   ?? '').toLowerCase().includes(q) ||
        String(b.DSR_DEST      ?? '').toLowerCase().includes(q) ||
        String(b.RECEIVER_NAME ?? '').toLowerCase().includes(q) ||
        String(b.SENDER_NAME   ?? '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      // Unsynced local rows always float to the top
      if (a._isLocal && !b._isLocal) return -1
      if (!a._isLocal && b._isLocal) return  1
      const parse = (d) => {
        if (!d) return new Date(0)
        const s = String(d)
        if (/^\d{2}-\d{2}-\d{4}$/.test(s)) { const [dd,mm,yyyy]=s.split('-'); return new Date(`${yyyy}-${mm}-${dd}`) }
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)){ const [dd,mm,yyyy]=s.split('/'); return new Date(`${yyyy}-${mm}-${dd}`) }
        return new Date(s)
      }
      const diff = parse(a.DSR_BOOKING_DATE) - parse(b.DSR_BOOKING_DATE)
      return sortOrder === 'desc' ? -diff : diff
    })

  // Table is visible when there are local rows OR a filter has been applied
  const tableHasData = filterApplied || localRows.length > 0

  // ── Shared styles ───────────────────────────────────────────────────────
  const thStyle = {
    padding: '11px 16px', textAlign: 'left',
    color: COLORS.gray, fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12,
  }
  const inputBaseStyle = {
    width: '100%', padding: '9px 12px', fontSize: 13, boxSizing: 'border-box',
    border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
    outline: 'none', fontFamily: "'DM Sans', sans-serif", color: COLORS.dark,
  }
  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: COLORS.gray, display: 'block', marginBottom: 5,
  }

  return (
    <DashboardLayout>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.dark, fontFamily: "'Syne', sans-serif" }}>
            Consignment Bookings
          </h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
            {filterApplied
              ? `${bookings.length} booking${bookings.length !== 1 ? 's' : ''} found`
              : 'Use the filter below to search bookings'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button onClick={() => setShowAddModal(true)}>+ Add Booking</Button>
          <input
            ref={fileInputRef} type="file" accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files[0])}
          />
          <Button variant="outline" icon="📂" size="sm"
            onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Reading…' : 'Upload Excel'}
          </Button>
          <Button variant="outline" icon="📤" size="sm" onClick={handleExport}
            disabled={!tableHasData || filtered.length === 0}>
            {selectedRows.length > 0 ? `Export Selected (${selectedRows.length})` : 'Export Excel'}
          </Button>
          <Button icon="☁️" onClick={handleUploadToServer} disabled={saving || localRows.length === 0}>
            {saving ? 'Uploading…' : `Sync to Server (${localRows.length})`}
          </Button>
        </div>
      </div>

      {/* ── Drag-drop upload zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files[0]) }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? COLORS.primary : COLORS.border}`,
          borderRadius: RADIUS.lg, padding: '16px 24px', marginBottom: 18,
          background: dragOver ? COLORS.primary + '08' : COLORS.white,
          display: 'flex', alignItems: 'center', gap: 14,
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: 26 }}>📊</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.dark }}>
            Drop your DSR Excel file here, or click to browse
          </div>
          <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
            Supports .xlsx and .xls · Duplicate AWBs merged automatically
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

      {/* ── Filter Panel ── */}
      <div style={{
        background: COLORS.white, border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg, padding: '20px 22px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, margin: 0 }}>
            🔎 Search Bookings
          </h3>
          {filterApplied && (
            <button
              onClick={handleClearFilter}
              style={{
                fontSize: 12, color: COLORS.danger, background: 'none',
                border: `1px solid ${COLORS.danger}20`, borderRadius: RADIUS.full,
                padding: '4px 12px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              ✕ Clear &amp; Reset
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Client Name autocomplete */}
          <div style={{ position: 'relative', flex: '2 1 240px', minWidth: 220 }}>
            <label style={labelStyle}>Client Name</label>
            <input
              value={filterClientName}
              onChange={(e) => handleFilterClientChange(e.target.value)}
              onKeyDown={handleFilterKeyDown}
              onFocus={() => clientSuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              placeholder="Type client name to search…"
              style={inputBaseStyle}
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
          <div style={{ flex: '1 1 160px', minWidth: 150 }}>
            <label style={labelStyle}>Date From</label>
            <input
              type="date" value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              onKeyDown={handleFilterKeyDown}
              style={inputBaseStyle}
            />
          </div>

          {/* Date To */}
          <div style={{ flex: '1 1 160px', minWidth: 150 }}>
            <label style={labelStyle}>Date To</label>
            <input
              type="date" value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              onKeyDown={handleFilterKeyDown}
              style={inputBaseStyle}
            />
          </div>

          {/* Search button */}
          <div style={{ paddingBottom: 1 }}>
            <Button onClick={handleFilter} disabled={filterLoading}>
              {filterLoading ? 'Searching…' : '🔍 Search'}
            </Button>
          </div>
        </div>

        {/* Active filter chips */}
        {filterApplied && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {activeFilters.clientName && (
              <span style={{
                background: COLORS.primary + '15', color: COLORS.primary,
                border: `1px solid ${COLORS.primary}30`,
                borderRadius: RADIUS.full, padding: '4px 12px', fontSize: 12, fontWeight: 600,
              }}>
                👤 {activeFilters.clientName}
              </span>
            )}
            {(activeFilters.dateFrom || activeFilters.dateTo) && (
              <span style={{
                background: COLORS.success + '15', color: COLORS.success,
                border: `1px solid ${COLORS.success}30`,
                borderRadius: RADIUS.full, padding: '4px 12px', fontSize: 12, fontWeight: 600,
              }}>
                📅 {activeFilters.dateFrom || '…'} → {activeFilters.dateTo || '…'}
              </span>
            )}
            <span style={{
              background: COLORS.grayLight, color: COLORS.gray,
              borderRadius: RADIUS.full, padding: '4px 12px', fontSize: 12,
            }}>
              {bookings.length} result{bookings.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Bookings Table ── */}
      <div style={{
        background: COLORS.white, borderRadius: RADIUS.lg,
        border: `1px solid ${COLORS.border}`, overflow: 'hidden',
      }}>

        {/* Table toolbar — shown when local rows exist OR filter applied */}
        {tableHasData && bookings.length > 0 && (
          <div style={{
            padding: '14px 20px', borderBottom: `1px solid ${COLORS.grayLight}`,
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Narrow results by AWB, receiver, destination…"
                style={{
                  width: '100%', padding: '8px 12px 8px 32px', fontSize: 13,
                  border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                  outline: 'none', fontFamily: "'DM Sans', sans-serif", color: COLORS.dark,
                }}
                onFocus={e => e.target.style.borderColor = COLORS.primary}
                onBlur={e  => e.target.style.borderColor = COLORS.border}
              />
            </div>
            <button
              onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
              style={{
                padding: '6px 14px', borderRadius: RADIUS.full, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', border: `1.5px solid ${COLORS.border}`,
                background: 'transparent', color: COLORS.gray, transition: 'all 0.15s',
                fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.primary}
              onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
            >
              {sortOrder === 'desc' ? '↓' : '↑'} Date
            </button>
          </div>
        )}

        {/* Table body */}
        <div style={{ overflowX: 'auto' }}>
          {filterLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ color: COLORS.gray, fontSize: 14 }}>Searching bookings…</div>
            </div>

          ) : !tableHasData ? (
            /* ── Empty state — nothing uploaded, no filter yet ── */
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.dark, marginBottom: 8 }}>
                No bookings displayed yet
              </div>
              <div style={{ fontSize: 13, color: COLORS.gray, maxWidth: 380, margin: '0 auto' }}>
                Use the filter above to search by <strong>client name</strong> or <strong>date range</strong>,
                or <strong>upload an Excel file</strong> — rows will appear here instantly.
              </div>
            </div>

          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.gray }}>
              {bookings.length === 0
                ? 'No bookings match the selected filter.'
                : 'No results match your search term.'}
            </div>

          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: COLORS.bgPage }}>
                  <th style={{ padding: '11px 16px' }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.length > 0 && selectedRows.length === filtered.filter(r => r.id).length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  {TABLE_COLS.map(c => <th key={c.key} style={thStyle}>{c.label}</th>)}
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={b.id ?? b.DSR_CNNO ?? i}
                    style={{
                      borderTop: `1px solid ${COLORS.grayLight}`,
                      // ✅ Yellow tint for unsynced local rows, normal zebra otherwise
                      background: b._isLocal
                        ? '#fffbea'
                        : i % 2 === 0 ? '#fff' : COLORS.bgPage + '50',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      {b.id && (
                        <input type="checkbox"
                          checked={selectedRows.includes(b.id)}
                          onChange={() => toggleRowSelection(b.id)}
                        />
                      )}
                    </td>
                    {TABLE_COLS.map(col => (
                      <td key={col.key} style={{
                        padding: '12px 16px', whiteSpace: 'nowrap',
                        fontWeight: col.key === 'client_name' ? 600 : 400,
                        color: col.key === 'client_name' ? COLORS.primary : COLORS.dark,
                      }}>
                        {/* ✅ First column of local rows shows a pending badge */}
                        {col.key === 'client_name' && b._isLocal ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                          }}>
                            <span style={{
                              background: COLORS.warning + '25',
                              color: COLORS.warning,
                              border: `1px solid ${COLORS.warning}50`,
                              borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                            }}>
                              ⏳ PENDING
                            </span>
                          </span>
                        ) : (
                          <CellValue col={col} row={b} />
                        )}
                      </td>
                    ))}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openEdit(b)} style={{ marginRight: 8 }} title="Edit">✏️</button>
                      {/* ✅ Delete only available for synced rows */}
                      {b.id
                        ? <button onClick={() => handleDelete(b)} style={{ color: COLORS.danger }} title="Delete">🗑</button>
                        : <span title="Sync to server first" style={{ opacity: 0.3, cursor: 'not-allowed', fontSize: 16 }}>🗑</span>
                      }
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
            {tableHasData
              ? `Showing ${filtered.length} record${filtered.length !== 1 ? 's' : ''}${filterApplied ? ` — ${bookings.filter(r => !r._isLocal).length} from server` + (localRows.length > 0 ? `, ${localRows.length} local` : '') : ''}`
              : 'Apply a filter or upload an Excel file to load bookings'}
          </span>
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
        title={editingRow?.id
          ? `Edit Booking — ${editingRow?.DSR_CNNO || ''}`
          : `Edit Booking (Local) — ${editingRow?.DSR_CNNO || ''}`}
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
        {/* ✅ Always show client name as read-only info banner */}
        {editingRow?.client_name && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: COLORS.primary + '0d', border: `1px solid ${COLORS.primary}25`,
            borderRadius: RADIUS.md, padding: '10px 16px', marginBottom: 20,
            fontSize: 13,
          }}>
            <span style={{ fontSize: 16 }}>👤</span>
            <span style={{ color: COLORS.gray }}>Client:</span>
            <span style={{ fontWeight: 700, color: COLORS.primary }}>{editingRow.client_name}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray, fontStyle: 'italic' }}>
              read-only — managed via Clients
            </span>
          </div>
        )}

        {!editingRow?.id && (
          <div style={{
            background: COLORS.warning + '15', border: `1px solid ${COLORS.warning}`,
            borderRadius: RADIUS.md, padding: '10px 14px', marginBottom: 20,
            fontSize: 13, color: COLORS.warning, fontWeight: 500,
          }}>
            ⚠️ This booking is not yet synced to the server. Changes will be saved locally.
          </div>
        )}
        {EDIT_SECTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: COLORS.dark }}>
              {section.title}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {section.fields.map(({ key, label }) => (
                <Input key={key} label={label}
                  value={form[key] ?? ''}
                  onChange={(e) => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={label}
                />
              ))}
            </div>
          </div>
        ))}
      </Modal>

      {/* ── Add Booking Modal ── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="➕ Add New Booking"
        size="full"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleCreateBooking} disabled={isCreating}>
              {isCreating ? 'Submitting...' : 'Submit'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {/* Search by Name */}
          <div style={{ position: 'relative', width: 250 }}>
            <Input label="Client Name" value={clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); setShowPhoneDropdown(false); debouncedByName(e.target.value) }}
              onFocus={() => clients.length > 0 && setShowNameDropdown(true)}
            />
            {showNameDropdown && clients.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: '#fff', border: '1px solid #ddd', borderRadius: 6,
                zIndex: 9999, maxHeight: 200, overflowY: 'auto',
              }}>
                {clients.map((c, i) => (
                  <div key={i} onClick={() => handleSelectClient(c)}
                    style={{ padding: '8px 10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{c.name}</span><span>{c.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search by Phone */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Input label="Search Client Phone" value={clientPhoneSearch}
              onChange={(e) => { setClientPhoneSearch(e.target.value); setSelectedClient(null); setShowNameDropdown(false); debouncedByPhone(e.target.value) }}
            />
            {showPhoneDropdown && clients.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: '#fff', border: `1px solid ${COLORS.grayLight}`,
                borderRadius: 6, zIndex: 9999, maxHeight: 200, overflowY: 'auto',
              }}>
                {clients.map((c, i) => (
                  <div key={i} onClick={() => handleSelectClient(c)}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                      display: 'flex', justifyContent: 'space-between',
                      borderBottom: `1px solid ${COLORS.grayLight}`, background: '#fff',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <span style={{ fontWeight: 600, color: COLORS.dark }}>{c.name}</span>
                    <span style={{ color: COLORS.gray }}>{c.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <Input label="Booking Date" type="date" value={date}
              onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {selectedClient && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: COLORS.success + '15', border: `1px solid ${COLORS.success}`,
            borderRadius: 8, padding: '6px 14px', marginBottom: 16, fontSize: 13,
          }}>
            <span>✅</span>
            <span style={{ fontWeight: 600, color: COLORS.dark }}>{selectedClient.name}</span>
            <span style={{ color: COLORS.gray }}>{selectedClient.phone}</span>
            <span onClick={() => { setSelectedClient(null); setClientSearch(''); setClientPhoneSearch('') }}
              style={{ cursor: 'pointer', color: COLORS.danger, fontWeight: 700, marginLeft: 4 }}>✕</span>
          </div>
        )}

        {newRows.map((row, index) => (
          <div key={index} style={{
            display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10,
            padding: 10, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflowX: 'auto',
          }}>
            <Input label="DSR CNNO" required value={row.DSR_CNNO} onChange={(e) => handleNewRowChange(index, 'DSR_CNNO', e.target.value)} style={{ minWidth: 140 }} />
            <Input label="DSR REF NO" required value={row.DSR_REF_NO} onChange={(e) => handleNewRowChange(index, 'DSR_REF_NO', e.target.value)} style={{ minWidth: 140 }} />
            <Input label="Chargeable Weight" required value={row.CHARGEABLE_WEIGHT} onChange={(e) => handleNewRowChange(index, 'CHARGEABLE_WEIGHT', e.target.value)} style={{ minWidth: 140 }} />
            <Input label="Receiver Name" value={row.RECEIVER_NAME} onChange={(e) => handleNewRowChange(index, 'RECEIVER_NAME', e.target.value)} style={{ minWidth: 120 }} />
            <Input label="Receiver Pin" value={row.RECEIVER_PIN} onChange={(e) => handleNewRowChange(index, 'RECEIVER_PIN', e.target.value)} style={{ minWidth: 100 }} />
            <Input label="Cash Amount" value={row.CASH_AMOUNT} onChange={(e) => handleNewRowChange(index, 'CASH_AMOUNT', e.target.value)} style={{ minWidth: 100 }} />
            <Input label="Online Amount" value={row.UPI_ONLINE_AMOUNT} onChange={(e) => handleNewRowChange(index, 'UPI_ONLINE_AMOUNT', e.target.value)} style={{ minWidth: 100 }} />
            <Input label="Credit Amount" value={row.CREDIT_AMOUNT} onChange={(e) => handleNewRowChange(index, 'CREDIT_AMOUNT', e.target.value)} style={{ minWidth: 100 }} />
            <Input label="Transaction Ref" value={row.TRANSACTION_REFNO} onChange={(e) => handleNewRowChange(index, 'TRANSACTION_REFNO', e.target.value)} style={{ minWidth: 160 }} />
            <Input label="Total" value={row.TOTAL_AMOUNT} onChange={(e) => handleNewRowChange(index, 'TOTAL_AMOUNT', e.target.value)} style={{ minWidth: 100 }} />
            <Input label="Payment Date" type="date"
              value={row.PAYMENT_DATE ? row.PAYMENT_DATE.toISOString().split('T')[0] : ''}
              onChange={(e) => handleNewRowChange(index, 'PAYMENT_DATE', e.target.value ? new Date(e.target.value) : null)}
              style={{ minWidth: 130 }}
            />
            <Input label="Remark" value={row.REMARK} onChange={(e) => handleNewRowChange(index, 'REMARK', e.target.value)} style={{ minWidth: 180 }} />
            <Button variant="outline" onClick={() => removeNewRow(index)} style={{ whiteSpace: 'nowrap' }}>❌</Button>
          </div>
        ))}

        <Button onClick={addNewRow}>➕ Add Row</Button>
      </Modal>

    </DashboardLayout>
  )
}