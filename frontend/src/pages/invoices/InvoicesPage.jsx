import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { COLORS, RADIUS } from '../../constants/theme'
import { INVOICES, SAMPLE_INVOICE } from '../../constants/data'
import { useApp } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom';

export default function InvoicesPage() {
  const { addToast } = useApp()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedInv, setSelectedInv] = useState(null)
  const [search, setSearch] = useState('')
  const navigate = useNavigate();

  const filtered = INVOICES.filter(inv =>
    inv.client.toLowerCase().includes(search.toLowerCase()) ||
    inv.id.toLowerCase().includes(search.toLowerCase())
  )

  const totals = {
    paid:    INVOICES.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0),
    unpaid:  INVOICES.filter(i => i.status === 'Unpaid').reduce((s, i) => s + i.amount, 0),
    overdue: INVOICES.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0),
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: COLORS.dark }}>
            Invoices
          </h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>{INVOICES.length} invoices generated</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" icon="📤" size="sm">Export</Button>
          
          <Button icon="+" onClick={() => navigate('/invoice-generator')}>New Invoice</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 22 }}>
        {[
          { label: 'Paid',    amount: totals.paid,    color: COLORS.success, icon: '✅', count: INVOICES.filter(i=>i.status==='Paid').length    },
          { label: 'Unpaid',  amount: totals.unpaid,  color: COLORS.warning, icon: '⏳', count: INVOICES.filter(i=>i.status==='Unpaid').length  },
          { label: 'Overdue', amount: totals.overdue, color: COLORS.danger,  icon: '🔴', count: INVOICES.filter(i=>i.status==='Overdue').length },
        ].map(s => (
          <div key={s.label} style={{
            background: COLORS.white, borderRadius: RADIUS.lg,
            border: `1px solid ${COLORS.border}`, padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: COLORS.gray }}>{s.label} ({s.count})</span>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: s.color }}>
              ₹{s.amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
        {/* Search */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${COLORS.grayLight}` }}>
          <div style={{ position: 'relative', maxWidth: 320 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by invoice no. or client..."
              style={{
                width: '100%', padding: '9px 12px 9px 34px', fontSize: 13,
                border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                outline: 'none', fontFamily: "'DM Sans', sans-serif",
              }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e  => e.target.style.borderColor = COLORS.border}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.bgPage }}>
                {['Invoice No.', 'Client', 'Items', 'Amount', 'Date', 'Due Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', color: COLORS.gray, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr
                  key={inv.id}
                  style={{ borderTop: `1px solid ${COLORS.grayLight}`, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '13px 16px', color: COLORS.primary, fontWeight: 700 }}>{inv.id}</td>
                  <td style={{ padding: '13px 16px', color: COLORS.dark, fontWeight: 500 }}>{inv.client}</td>
                  <td style={{ padding: '13px 16px', color: COLORS.gray }}>{inv.items} items</td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: COLORS.dark }}>₹{inv.amount.toLocaleString()}</td>
                  <td style={{ padding: '13px 16px', color: COLORS.gray }}>{inv.date}</td>
                  <td style={{ padding: '13px 16px', color: inv.status === 'Overdue' ? COLORS.danger : COLORS.gray }}>
                    {inv.dueDate}
                  </td>
                  <td style={{ padding: '13px 16px' }}><StatusBadge status={inv.status} /></td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <ActionBtn label="View" onClick={() => { setSelectedInv(inv); setPreviewOpen(true) }} />
                      <ActionBtn label="Send" onClick={() => addToast(`Invoice ${inv.id} sent via email!`, 'success')} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Invoice Preview — ${selectedInv?.id}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => addToast('PDF downloaded!', 'success')}>📄 Download PDF</Button>
            <Button onClick={() => { addToast('Invoice sent via email!', 'success'); setPreviewOpen(false) }}>📧 Send Email</Button>
          </>
        }
      >
        <InvoicePreviewContent inv={selectedInv} />
      </Modal>
    </DashboardLayout>
  )
}

function InvoicePreviewContent({ inv }) {
  if (!inv) return null
  return (
    <div>
      {/* Header */}
      <div style={{ background: COLORS.primary, borderRadius: RADIUS.md, padding: '20px 24px', color: COLORS.white, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18 }}>📦 My Courier Franchise</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>DTDC Authorized • GST: 09ABCDE1234F1Z5</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Invoice</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16 }}>{inv.id}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{inv.date}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.gray, marginBottom: 3 }}>BILL TO</div>
          <div style={{ fontWeight: 600, color: COLORS.dark }}>{inv.client}</div>
        </div>
        <StatusBadge status={inv.status} />
      </div>

      {/* Sample line items */}
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
            {['Description', 'Weight', 'Rate', 'Amount'].map(h => (
              <th key={h} style={{ padding: '8px 0', textAlign: 'left', color: COLORS.gray, fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SAMPLE_INVOICE.items.slice(0, inv.items).map((item, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
              <td style={{ padding: '10px 0', color: COLORS.darkMuted }}>{item.desc}</td>
              <td style={{ padding: '10px 0', color: COLORS.gray }}>{item.weight}</td>
              <td style={{ padding: '10px 0', color: COLORS.gray }}>₹{item.rate}</td>
              <td style={{ padding: '10px 0', fontWeight: 600, color: COLORS.dark }}>₹{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: COLORS.gray }}>
            <span>Subtotal</span><span>₹{(inv.amount / 1.18).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13, color: COLORS.gray }}>
            <span>GST @ 18%</span><span>₹{(inv.amount - inv.amount / 1.18).toFixed(2)}</span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', paddingTop: 10,
            borderTop: `2px solid ${COLORS.border}`,
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: COLORS.primary,
          }}>
            <span>Total</span><span>₹{inv.amount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ label, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '4px 10px', fontSize: 12, fontWeight: 600,
        background: hov ? COLORS.primaryLight : COLORS.bgPage,
        color: COLORS.primary,
        border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.sm,
        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {label}
    </button>
  )
}
