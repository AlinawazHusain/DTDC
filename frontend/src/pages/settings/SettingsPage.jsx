import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import { COLORS, RADIUS } from '../../constants/theme'
import { useApp } from '../../context/AppContext'

const TABS = ['Franchise Profile', 'Invoice Settings', , 'Users & Access',]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Franchise Profile')

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: COLORS.dark }}>Settings</h2>
        <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>Manage your franchise account and preferences</p>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              background: 'none', border: 'none',
              borderBottom: `2.5px solid ${activeTab === tab ? COLORS.primary : 'transparent'}`,
              color: activeTab === tab ? COLORS.primary : COLORS.gray,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, marginTop: -24, marginBottom: 24 }} />

      {activeTab === 'Franchise Profile' && <FranchiseProfile />}
      {activeTab === 'Invoice Settings'   && <InvoiceSettings />}
      {activeTab === 'Users & Access'     && <UsersSettings />}
    </DashboardLayout>
  )
}

function SettingsCard({ title, children }) {
  return (
    <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, padding: '24px', marginBottom: 20 }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: COLORS.dark, marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  )
}

function FranchiseProfile() {
  const { addToast } = useApp()
  const [form, setForm] = useState({
    name: 'My Courier Franchise', owner: 'Ramesh Gupta', phone: '9876543210',
    email: 'ramesh@mycourier.in', address: '12 MG Road, Jaipur, Rajasthan 302001',
    gstin: '09ABCDE1234F1Z5', dtdcCode: 'DTC-JP-0042',
  })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <>
      <SettingsCard title="Business Information">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 20px' }}>
          <Input label="Franchise Name"  value={form.name}     onChange={set('name')} />
          <Input label="Owner Name"      value={form.owner}    onChange={set('owner')} />
          <Input label="Phone"           value={form.phone}    onChange={set('phone')} />
          <Input label="Email"           value={form.email}    onChange={set('email')} type="email" />
          <Input label="GSTIN"           value={form.gstin}    onChange={set('gstin')} />
          <Input label="DTDC Franchise Code" value={form.dtdcCode} onChange={set('dtdcCode')} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Business Address" value={form.address} onChange={set('address')} type="textarea" rows={2} />
          </div>
        </div>
        <Button onClick={() => addToast('Profile saved!', 'success')}>Save Changes</Button>
      </SettingsCard>

      <SettingsCard title="Franchise Logo">
        <div style={{
          border: `2px dashed ${COLORS.border}`, borderRadius: RADIUS.lg,
          padding: '36px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📤</div>
          <div style={{ fontWeight: 600, color: COLORS.dark, marginBottom: 6 }}>Upload your franchise logo</div>
          <div style={{ fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>PNG or JPG up to 2MB. Recommended: 200×60px</div>
          <Button variant="secondary" size="sm" onClick={() => addToast('Logo upload coming soon!', 'info')}>Choose File</Button>
        </div>
      </SettingsCard>
    </>
  )
}

function InvoiceSettings() {
  const { addToast } = useApp()
  const [settings, setSettings] = useState({
    prefix: 'INV', nextNumber: '00848', footerNote: 'Thank you for your business. Payment due within 7 days.',
    showGst: true, showLogo: true, autoEmail: true,
  })
  const set   = k => e => setSettings(p => ({ ...p, [k]: e.target.value }))
  const toggle = k => setSettings(p => ({ ...p, [k]: !p[k] }))

  return (
    <SettingsCard title="Invoice Defaults">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 20px' }}>
        <Input label="Invoice Prefix"   value={settings.prefix}     onChange={set('prefix')} />
        <Input label="Next Invoice No." value={settings.nextNumber}  onChange={set('nextNumber')} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Input label="Footer Note" value={settings.footerNote} onChange={set('footerNote')} type="textarea" rows={2} />
        </div>
      </div>

      <div style={{ marginTop: 8, marginBottom: 24 }}>
        {[
          { key: 'showGst',   label: 'Show GST breakdown on invoices' },
          { key: 'showLogo',  label: 'Include franchise logo on invoices' },
          { key: 'autoEmail', label: 'Auto-email invoice after booking' },
        ].map(item => (
          <Toggle key={item.key} label={item.label} value={settings[item.key]} onToggle={() => toggle(item.key)} />
        ))}
      </div>

      <Button onClick={() => addToast('Invoice settings saved!', 'success')}>Save Changes</Button>
    </SettingsCard>
  )
}


function UsersSettings() {
  const users = [
    { name: 'Ramesh Gupta',  email: 'ramesh@courier.in', role: 'Owner',   status: 'Active' },
    { name: 'Priya Sharma',  email: 'priya@courier.in',  role: 'Manager', status: 'Active' },
    { name: 'Arun Kumar',    email: 'arun@courier.in',   role: 'Staff',   status: 'Inactive' },
  ]
  const { addToast } = useApp()

  return (
    <SettingsCard title="User Accounts">
      {users.map((u, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 0', borderBottom: i < users.length - 1 ? `1px solid ${COLORS.grayLight}` : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: COLORS.primaryLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, color: COLORS.primary,
            }}>
              {u.name.split(' ').map(n=>n[0]).join('')}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: COLORS.dark, fontSize: 14 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: COLORS.gray }}>{u.email} · {u.role}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 9999,
              background: u.status === 'Active' ? COLORS.successLight : COLORS.grayLight,
              color: u.status === 'Active' ? COLORS.success : COLORS.gray,
            }}>{u.status}</span>
            <Button variant="ghost" size="sm" onClick={() => addToast('User editor coming soon!', 'info')}>Edit</Button>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 16 }}>
        <Button variant="secondary" size="sm" onClick={() => addToast('Invite user feature in Pro plan!', 'info')}>+ Invite User</Button>
      </div>
    </SettingsCard>
  )
}


function Toggle({ label, desc, value, onToggle }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '13px 0', borderBottom: `1px solid ${COLORS.grayLight}`,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.dark }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{desc}</div>}
      </div>
      <div
        onClick={onToggle}
        style={{
          width: 44, height: 24, borderRadius: 9999,
          background: value ? COLORS.primary : COLORS.border,
          cursor: 'pointer', position: 'relative', transition: 'background 0.25s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: COLORS.white, transition: 'left 0.25s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
    </div>
  )
}
