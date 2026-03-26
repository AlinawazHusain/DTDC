import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import DashboardLayout from '../../components/layout/DashboardLayout'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import { COLORS, RADIUS } from '../../constants/theme'
import { useApp } from '../../context/AppContext'
import { callApi } from '../../utils/api'
import { debounce } from 'lodash';

// ─── API Endpoints ─────────────────────────────────────────────────────────────
const API = {
  list:   '/api/bookings',
  update: '/api/bookingUpdate',
  upload: '/api/bookingUpload',
  delete: '/api/deleteBooking',       // ✅ NEW
  invoice: '/api/generateInvoice',
}



const TABLE_COLS = [
  { key: 'DSR_CNNO',          label: 'AWB/CN No.' },
  { key: 'DSR_CUST_CODE',     label: 'Cust Code' },
  { key: 'RECEIVER_NAME',     label: 'Receiver' },
  { key: 'DSR_DEST',          label: 'Destination' },
  { key: 'DSR_CN_TYPE',       label: 'Type' },
  { key: 'CHARGEABLE_WEIGHT', label: 'Chg. Wt.' },
  { key: 'DSR_AMT',           label: 'Amount' },
  { key: 'TOTAL_AMOUNT',      label: 'Total' }, // Updated to match backend
  { key: 'DSR_BOOKING_DATE',  label: 'Booked On' },
  { key: 'DSR_STATUS',        label: 'Status' }
];

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
      { key: 'DSR_BOOKED_BY',     label: 'Booked By'        },
      { key: 'DSR_DOX',           label: 'DOX'              },
    ],
  },
  {
    title: '⚖️ Weight & Pieces',
    fields: [
      { key: 'ACTUAL_WEIGHT',     label: 'Actual Weight (kg)'      },
      { key: 'CHARGEABLE_WEIGHT', label: 'Chargeable Weight (kg)' },
      { key: 'VOLUMETRIC_WEIGHT', label: 'Volumetric Weight (kg)' },
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
      { key: 'CASH_AMT',           label: 'Cash Amount'     },
      { key: 'UPI_ONLINE_AMT',     label: 'UPI / Online'    },
      { key: 'CREDIT_AMT',         label: 'Credit Amount'   },
      { key: 'TRANSACTION_REF_NO', label: 'Transaction Ref' },
      { key: 'PAYMENT_DATE',       label: 'Payment Date'    },
      { key: 'BILL_TO_CUSTOMER_NAME',    label: 'Bill To Name'    },
      { key: 'BILL_TO_CUSTOMER_MOBILE_NUMBER', label: 'Bill To Mobile' },
      { key: 'BILL_TO_CUSTOMER_ADDRESS', label: 'Bill To Address' },
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [clients, setClients] = useState([])
  const [clientSearch, setClientSearch] = useState('')
  const [clientPhoneSearch, setClientPhoneSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedRows, setSelectedRows] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [showNameDropdown, setShowNameDropdown] = useState(false)
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false)

  const [newRows, setNewRows] = useState([
    {
      DSR_CNNO: '',
      DSR_REF_NO: '',
      CHARGEABLE_WEIGHT: '',
      RECEIVER_NAME: '',
      RECEIVER_PIN: '',
      CASH_AMOUNT: '',
      UPI_ONLINE_AMOUNT: '',
      CREDIT_AMOUNT: '',
      TRANSACTION_REFNO: '',
      PAYMENT_DATE: null,
      TOTAL_AMOUNT: '',
      REMARK : ''
    }
  ])
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


  const handleDelete = async (row) => {
    if (!row.id) {
      addToast('Cannot delete unsynced row', 'error')
      return
    }

    if (!window.confirm(`Delete ${row.DSR_CNNO}?`)) return

    try {
      const token = localStorage.getItem('access_token')

      await callApi({
        url: API.delete,
        method: 'DELETE',
        body: { id: row.id },
        headers: { Authorization: `Bearer ${token}` },
      })

      setBookings(prev => prev.filter(r => r.id !== row.id))
      addToast('Deleted successfully', 'success')
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  const toggleRowSelection = (id) => {
    setSelectedRows(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const ids = filtered.filter(r => r.id).map(r => r.id)

    setSelectedRows(
      selectedRows.length === ids.length ? [] : ids
    )
  }


  const handleGenerateInvoice = async () => {
    if (selectedRows.length === 0) {
      addToast('Select at least one row', 'error')
      return
    }

    try {
      const token = localStorage.getItem('access_token')

      await callApi({
        url: API.invoice,
        method: 'POST',
        body: { booking_ids: selectedRows },
        headers: { Authorization: `Bearer ${token}` },
      })

      addToast('Invoice generated', 'success')
      setSelectedRows([])
    } catch {
      addToast('Failed to generate invoice', 'error')
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

  const addNewRow = () => {
  setNewRows([
    ...newRows,
    {
      DSR_CNNO: '',
      DSR_REF_NO: '',
      CHARGEABLE_WEIGHT: '',
      RECEIVER_NAME: '',
      RECEIVER_PIN: '',
      CASH_AMOUNT: '',
      UPI_ONLINE_AMOUNT: '',
      CREDIT_AMOUNT: '',
      TRANSACTION_REFNO: '',
      PAYMENT_DATE: null,
      TOTAL_AMOUNT: '',
      REMARK : ''
    }
  ])
}

const removeNewRow = (index) => {
  setNewRows(newRows.filter((_, i) => i !== index))
}

const handleNewRowChange = (index, key, value) => {
  const updated = [...newRows]
  updated[index][key] = value
  
  setNewRows(updated)
}



const fetchClientsByName = async (value) => {
  if (!value.trim()) {
    setClients([])
    setShowNameDropdown(false)
    return
  }

  try {
    const token = localStorage.getItem('access_token')
    const res = await callApi({
      url: `/api/searchClientsByName?name=${value}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    console.log("API RESPONSE")
    console.log(res)

    setClients(res || [])
    setShowNameDropdown(true)
  } catch {
    addToast('Failed to load clients', 'error')
  }
}

const fetchClientsByPhone = async (value) => {
  if (!value.trim()) {
    setClients([])
    setShowPhoneDropdown(false)
    return
  }

  try {
    const token = localStorage.getItem('access_token')
    const res = await callApi({
      url: `/api/searchClientsByPhone?phone=${value}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    setClients(res || [])
    setShowPhoneDropdown(true)
  } catch {
    addToast('Failed to load clients', 'error')
  }
}

const debouncedSearchByName = useCallback(
  debounce((val) => fetchClientsByName(val), 500),
  []
)

const debouncedSearchByPhone = useCallback(
  debounce((val) => fetchClientsByPhone(val), 500),
  []
)


const handleClientNameSearch = (value) => {
  setClientSearch(value)
  setSelectedClient(null)
  setShowPhoneDropdown(false)
  debouncedSearchByName(value)
}

const handleClientPhoneSearch = (value) => {
  setClientPhoneSearch(value)
  setSelectedClient(null)
  setShowNameDropdown(false)
  debouncedSearchByPhone(value)
}


const handleSelectClient = (client) => {
  setSelectedClient({
    id: client.id,
    name: client.name,
    phone: client.phone
  })

  setClientSearch(client.name)
  setClientPhoneSearch(client.phone)

  setClients([])
  setShowNameDropdown(false)
  setShowPhoneDropdown(false)
}


const handleCreateBooking = async () => {
  if (isCreating) return
  if (!selectedClient) {
    addToast('Please select a client', 'error')
    return
  }

  if (newRows.some(item => item.DSR_CNNO === "" || item.DSR_CNNO == null)) {
    addToast('Please add DSR CCNO', 'error');
    return;
  }

  if (newRows.some(item => item.DSR_REF_NO === "" || item.DSR_REF_NO == null)) {
    addToast('Please add DSR REF No', 'error');
    return;
  }

   if (newRows.some(item => item.CHARGEABLE_WEIGHT === "" || item.CHARGEABLE_WEIGHT == null)) {
    addToast('Please add chargable weight', 'error');
    return;
  }

  try {
    setIsCreating(true) 
    const token = localStorage.getItem('access_token')

    const payload = {
      client_id: selectedClient.id,
      booking_date: date, 
      bookings: newRows
    }

    await callApi({
      url: '/api/addBooking',
      method: 'POST',
      body: payload,
      headers: { Authorization: `Bearer ${token}` },
    })

    addToast('Bookings created successfully', 'success')
    setShowAddModal(false)
    setNewRows([])
    fetchBookings()

  } catch {
    addToast('Failed to create booking', 'error')
  }
  finally{
    setIsCreating(false)
  }
}


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
  console.log('clients:', clients, 'showName:', showNameDropdown)
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
          <Button
            icon="🧾"
            onClick={handleGenerateInvoice}
            disabled={selectedRows.length === 0}
          >
            Generate Invoice ({selectedRows.length})
          </Button>

          <Button onClick={() => setShowAddModal(true)}>
            + Add booking
          </Button>
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
                {/* <tr style={{ background: COLORS.bgPage }}>
                  {[...TABLE_COLS.map(c => c.label), 'Action'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
                      color: COLORS.gray, fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12,
                    }}>{h}</th>
                  ))}
                </tr> */}
                <tr style={{ background: COLORS.bgPage }}>
                  <th style={{ padding: '11px 16px' }}>
                    <input
                      type="checkbox"
                      checked={
                        selectedRows.length > 0 &&
                        selectedRows.length === filtered.filter(r => r.id).length
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>

                  {[...TABLE_COLS.map(c => c.label), 'Action'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px',
                      textAlign: 'left',
                      color: COLORS.gray,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      fontSize: 12,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={b.id ?? b.DSR_CNNO ?? i}>
                    {/* Checkbox */}
                    <td style={{ padding: '12px 16px' }}>
                      {b.id && (
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(b.id)}
                          onChange={() => toggleRowSelection(b.id)}
                        />
                      )}
                    </td>

                    {TABLE_COLS.map(({ key }) => (
                      <td key={key} style={{
                        padding: '12px 16px',
                        whiteSpace: 'nowrap'
                      }}>
                        {key === 'DSR_STATUS' ? (
                          <StatusBadge status={b[key] || '—'} />
                        ) : key === 'DSR_AMT' || key === 'TOTAL_AMOUNT' ? (
                          b[key] ? `₹${Number(b[key]).toLocaleString()}` : '—'
                        ) : (
                          b[key] || '—'
                        )}
                      </td>
                    ))}

                    <td style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(b)}>✏️</button>

                      <button
                        onClick={() => handleDelete(b)}
                        style={{ color: COLORS.danger }}
                      >
                        🗑
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

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="➕ Add New Booking"
        size="full"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBooking} disabled={isCreating}>
              {isCreating ? 'Submitting...' : 'Submit'}
            </Button>
          </>
        }
      >
        {/* Client Search */}
        
        {/* Client Search + Date in one row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>

          {/* Search by Name */}
          <div style={{ position: 'relative', width: 250 }}>
            <Input
              label="Client Name"
              value={clientSearch}
              onChange={(e) => handleClientNameSearch(e.target.value)}
              onFocus={() => clients.length > 0 && setShowNameDropdown(true)}
            />

            {showNameDropdown && clients.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  zIndex: 9999,
                  maxHeight: 200,
                  overflowY: 'auto'
                }}
              >
                {clients.map((client, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectClient(client)}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{client.name}</span>
                    <span>{client.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search by Phone */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Input
              label="Search Client Phone"
              value={clientPhoneSearch}
              onChange={(e) => handleClientPhoneSearch(e.target.value)}
              // onFocus={() => clients.length > 0 && setShowPhoneDropdown(true)}
            />

            {showPhoneDropdown && clients.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: `1px solid ${COLORS.grayLight}`,
                  borderRadius: 6,
                  zIndex: 9999,
                  maxHeight: 200,
                  overflowY: 'auto'
                }}
              >
                {clients.map((client, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectClient(client)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontSize: 13,
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderBottom: `1px solid ${COLORS.grayLight}`,
                      background: '#fff'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <span style={{ fontWeight: 600, color: COLORS.dark }}>
                      {client.name}
                    </span>
                    <span style={{ color: COLORS.gray }}>
                      {client.phone}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Date */}
          <div style={{ flex: 1 }}>
            <Input
              label="Input Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

        </div>

        {/* Selected Client Badge */}
        {selectedClient && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: COLORS.success + '15', border: `1px solid ${COLORS.success}`,
            borderRadius: 8, padding: '6px 14px', marginBottom: 16, fontSize: 13,
          }}>
            <span>✅</span>
            <span style={{ fontWeight: 600, color: COLORS.dark }}>{selectedClient.name}</span>
            <span style={{ color: COLORS.gray }}>{selectedClient.phone}</span>
            <span
              onClick={() => { setSelectedClient(null); setClientSearch(''); setClientPhoneSearch('') }}
              style={{ cursor: 'pointer', color: COLORS.danger, fontWeight: 700, marginLeft: 4 }}
            >✕</span>
          </div>
        )}

        {/* Rows */}
        {newRows.map((row, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              marginBottom: 10,
              padding: 10,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              overflowX: 'auto'
            }}
          >
            <Input
              label="DSR CNNO"
              required
              value={row.DSR_CNNO}
              onChange={(e) =>
                handleNewRowChange(index, 'DSR_CNNO', e.target.value)
              }
              style={{ minWidth: 140 }}
            />

            <Input
              label="DSR REF NO"
              required
              value={row.DSR_REF_NO}
              onChange={(e) =>
                handleNewRowChange(index, 'DSR_REF_NO', e.target.value)
              }
              style={{ minWidth: 140 }}
            />

            <Input
              label="Chargable Weight"
              required
              value={row.CHARGEABLE_WEIGHT}
              onChange={(e) =>
                handleNewRowChange(index, 'CHARGEABLE_WEIGHT', e.target.value)
              }
              style={{ minWidth: 140 }}
            />

            <Input
              label="Receiver name"
              value={row.RECEIVER_NAME}
              onChange={(e) =>
                handleNewRowChange(index, 'RECEIVER_NAME', e.target.value)
              }
              style={{ minWidth: 120 }}
            />

            <Input
              label="Receiver pin"
              value={row.RECEIVER_PIN}
              onChange={(e) =>
                handleNewRowChange(index, 'RECEIVER_PIN', e.target.value)
              }
              style={{ minWidth: 100 }}
            />

            <Input
              label="Cash amount"
              value={row.CASH_AMOUNT}
              onChange={(e) =>
                handleNewRowChange(index, 'CASH_AMOUNT', e.target.value)
              }
              style={{ minWidth: 100 }}
            />

            <Input
              label="Online amount"
              value={row.UPI_ONLINE_AMOUNT}
              onChange={(e) =>
                handleNewRowChange(index, 'UPI_ONLINE_AMOUNT', e.target.value)
              }
              style={{ minWidth: 100 }}
            />


            <Input
              label="Credit amount"
              value={row.CREDIT_AMOUNT}
              onChange={(e) =>
                handleNewRowChange(index, 'CREDIT_AMOUNT', e.target.value)
              }
              style={{ minWidth: 100 }}
            />


            <Input
              label="Transaction ref no"
              value={row.TRANSACTION_REFNO}
              onChange={(e) =>
                handleNewRowChange(index, 'TRANSACTION_REFNO', e.target.value)
              }
              style={{ minWidth: 180 }}
              labelStyle={{ whiteSpace: 'nowrap' }}
            />

            <Input
              label="Total"
              value={row.TOTAL_AMOUNT}
              onChange={(e) =>
                handleNewRowChange(index, 'TOTAL_AMOUNT', e.target.value)
              }
              style={{ minWidth: 100 }}
            />


            <Input
              label = "Payment date"
              type = "date"
              value={row.PAYMENT_DATE ? row.PAYMENT_DATE.toISOString().split('T')[0] : ''}
              onChange={(e) =>{
                const dateValue = e.target.value ? new Date(e.target.value) : null;
                handleNewRowChange(index, 'PAYMENT_DATE', dateValue)
              }}
              style={{ minWidth: 100 }}
            />


            <Input
              label="Reamrk"
              value={row.REMARK}
              onChange={(e) =>
                handleNewRowChange(index, 'REMARK', e.target.value)
              }
              style={{ minWidth: 200 }}
            />

            {/* 🔥 Remove button per row */}
            <Button
              variant="outline"
              onClick={() => removeNewRow(index)}
              style={{ whiteSpace: 'nowrap' }}
            >
              ❌
            </Button>
          </div>
        ))}

        <Button onClick={addNewRow}>
          ➕ Add Row
        </Button>
      </Modal>

    </DashboardLayout>
  )
}