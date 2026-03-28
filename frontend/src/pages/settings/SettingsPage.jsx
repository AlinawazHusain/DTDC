import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import { COLORS, RADIUS } from '../../constants/theme'
import { useApp } from '../../context/AppContext'
import { callApi } from '../../utils/api'
import { useNavigate } from 'react-router-dom'

const TABS = ['Franchise Profile', 'Personal Profile', 'Users & Access']

// ─── Moved to top level so it never remounts on parent re-render ───────────────
function PasswordInput({ label, value, onChange, placeholder }) {
  const [showPw, setShowPw] = useState(false)
  const inputRef = useRef(null)

  const handleToggle = () => {
    const input = inputRef.current
    const start = input.selectionStart
    const end = input.selectionEnd
    setShowPw(prev => !prev)
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(start, end)
    })
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type={showPw ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder || 'Enter password'}
          style={{ width: '100%', padding: '8px 36px 8px 10px', fontSize: 14 }}
        />
        <button
          type="button"
          onClick={handleToggle}
          style={{
            position: 'absolute', right: 8, top: '50%',
            transform: 'translateY(-50%)', background: 'none',
            border: 'none', cursor: 'pointer', fontSize: 16, padding: '0 2px',
          }}
        >
          {showPw ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  )
}
// ──────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Franchise Profile')
  const { addToast } = useApp()
  const navigate = useNavigate() 

  const [settingsData, setSettingsData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem('access_token')
      try {
        setLoading(true)
        // Single endpoint that returns all settings sections at once
        const data = await callApi({
           url: '/api/settings',
           method: "GET",
           headers: { Authorization: `Bearer ${token}` }
           })
        setSettingsData(data)
      } catch (err) {
        addToast('Failed to load settings', 'error')
        navigate("/")
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: COLORS.gray, fontSize: 14 }}>
          Loading settings...
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: COLORS.dark }}>Settings</h2>
        <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>Manage your franchise account and preferences</p>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(tab => (
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

      {activeTab === 'Franchise Profile' && (
        <FranchiseProfile
          data={settingsData.franchiseProfile}
          onSave={updated => setSettingsData(prev => ({ ...prev, franchiseProfile: updated }))}
        />
      )}
      {activeTab === 'Personal Profile' && (
        <PersonalProfile
          data={settingsData.personalProfile}
          onSave={updated => setSettingsData(prev => ({ ...prev, personalProfile: updated }))}
        />
      )}
      {activeTab === 'Users & Access' && (
        <UsersSettings data={settingsData.users} />
      )}
    </DashboardLayout>
  )
}

// ─── Shared card wrapper ───────────────────────────────────────────────────────
function SettingsCard({ title, children }) {
  return (
    <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, padding: '24px', marginBottom: 20 }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: COLORS.dark, marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  )
}

// ─── Franchise Profile ─────────────────────────────────────────────────────────
function FranchiseProfile({ data, onSave }) {
  const { addToast } = useApp()
  const [form, setForm] = useState(data)
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')

      const api_body = {
        frenchise_name    : form.frenchise_name,
        owner_name        : form.owner_name,
        phone_number      : form.phone_number,
        owner_email       : form.owner_email,
        gst_number        : form.gst_number,
        frenchise_code    : form.frenchise_code,
        city              : form.city,
        business_address  : form.business_address,
        website_url       : form.website_url??"",
        moto              : form.moto?? "",
        tan_number        : form.tan_number??"",
        kyc_id_number     : form.kyc_id_number??"",
        kyc_doc_type      : form.kyc_doc_type??"",
        // kyc_doc & agreement_doc are handled separately
      }

      const updated = await callApi({
        url: '/api/updateFrenchiseProfile', // Keep original API
        method: 'PUT',
        body: api_body,
        headers: { Authorization: `Bearer ${token}` }
      })

      onSave(updated.data)
      addToast('Profile saved!', 'success')
    } catch (err) {
      console.error(err)
      addToast('Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const KYC_DOC_TYPES = [ { value: '', label: '— Select Document Type —' }, { value: 'aadhaar_card', label: 'Aadhaar Card' }, { value: 'pan_card', label: 'PAN Card' }, { value: 'driving_licence', label: 'Driving Licence' }, { value: 'passport', label: 'Passport' }, { value: 'voter_id', label: 'Voter ID Card' }, { value: 'nrega_job_card', label: 'NREGA Job Card' }, { value: 'npr_letter', label: 'National Population Register Letter' }, { value: 'other', label: 'Other' }, ]
  // ─── Document handlers ───────────────────────────────
  const handleFileUpload = async (type, file) => {
    try {
      const token = localStorage.getItem('access_token')
      const formData = new FormData()
      formData.append('name', type)
      formData.append('file', file) 

      const res = await callApi({
        url: '/api/uploadFrenchiseDoc',
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res && res.url){
        setForm(prev => ({ ...prev, [type]: res.url }))
      }
      addToast(`${type === 'kyc_doc' ? 'KYC' : 'Agreement'} document uploaded!`, 'success')
    } catch (err) {
      console.error(err)
      addToast('Failed to upload document', 'error')
    }
  }

  return (
    <SettingsCard title="Business Information">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 20px' }}>
        <Input label="Franchise Name"      value={form.frenchise_name}     onChange={set('frenchise_name')} />
        <Input label="Owner Name"          value={form.owner_name}         onChange={set('owner_name')} />
        <Input label="Phone"               value={form.phone_number}      onChange={set('phone_number')} />
        <Input label="Email"               value={form.owner_email}       onChange={set('owner_email')} type="email" />
        <Input label="GSTIN"               value={form.gst_number}        onChange={set('gst_number')} />
        <Input label="DTDC Franchise Code" value={form.frenchise_code}    onChange={set('frenchise_code')} />
        <Input label="City"                value={form.city}              onChange={set('city')} />
        <Input label="Website URL"         value={form.website_url}       onChange={set('website_url')} />
        <Input label="Moto"                value={form.moto}              onChange={set('moto')} />
        <Input label="TAN Number"          value={form.tan_number}        onChange={set('tan_number')} />
        <Input label="KYC ID Number"       value={form.kyc_id_number}    onChange={set('kyc_id_number')} />

        <div>
        <label style={{ display: 'block', marginBottom: 6 }}>KYC Document Type</label>
        <select
          value={form.kyc_doc_type}
          onChange={set('kyc_doc_type')}
          style={{ width: '100%', height: 36, padding: '6px 10px', fontSize: 14 }}
        >
          {KYC_DOC_TYPES.map(doc => (
            <option key={doc.value} value={doc.value}>{doc.label}</option>
          ))}
        </select>
      </div>

        {/* ─── KYC & Agreement Doc View/Upload ─── */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <Button
            variant="ghost"
            size="sm"
            style={{
              background: form.kyc_doc ? '#d4edda' : 'transparent',
              color: form.kyc_doc ? '#155724' : 'inherit'
            }}
            onClick={() => form.kyc_doc && window.open(form.kyc_doc, '_blank')}
          >
            View KYC
          </Button>
          <input
            type="file"
            style={{ display: 'none' }}
            id="kyc_doc_input"
            onChange={e => handleFileUpload('kyc_doc', e.target.files[0])}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => document.getElementById('kyc_doc_input').click()}
          >
            Upload
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
          <Button
            variant="ghost"
            size="sm"
            style={{
              background: form.agreement_doc ? '#d4edda' : 'transparent',
              color: form.agreement_doc ? '#155724' : 'inherit'
            }}
            onClick={() => form.agreement_doc && window.open(form.agreement_doc, '_blank')}
          >
            View Agreement
          </Button>
          <input
            type="file"
            style={{ display: 'none' }}
            id="agreement_doc_input"
            onChange={e => handleFileUpload('agreement_doc', e.target.files[0])}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => document.getElementById('agreement_doc_input').click()}
          >
            Upload
          </Button>
        </div>
      </div>

      {/* ─── Main Save Button for text fields ─── */}
      <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
    </SettingsCard>
  )
}

// ─── Personal Profile ──────────────────────────────────────────────────────────
function PersonalProfile({ data, onSave }) {
  const { addToast } = useApp()
  const [form, setForm] = useState(data)
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')
      const api_body = {
        email: form.email,
        name: form.name,
        password: form.password
      }
      const updated = await callApi({
         url: '/api/updatePersonalProfile',
          method: 'PUT',
          body: api_body ,
          headers: { Authorization: `Bearer ${token}` }
        })
      onSave(updated.data)
      localStorage.setItem('access_token', updated.access_token)
      localStorage.setItem('refresh_token', updated.refresh_token)
      addToast('Profile saved!', 'success')
    } catch {
      addToast('Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsCard title="Personal Information">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 20px' }}>
        <Input label="Name"  value={form.name}  onChange={set('name')} />
        <Input label="Email" value={form.email} onChange={set('email')} type="email" />
        <PasswordInput label="Password" value={form.password} onChange={set('password')} />
      </div>
      <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
    </SettingsCard>
  )
}







// ─── Users & Access ────────────────────────────────────────────────────────────
function UsersSettings({ data }) {
  const { addToast } = useApp()
  const [users, setUsers] = useState(data)

  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState({
    id : 0,
    name: '',
    email: '',
    password: '',
    role: 'staff',
    status: 'Active' // only used in edit
  })
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // ─── Add User API
  const handleAddUser = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')

      const res = await callApi({
        url: '/api/addNewUser',
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${token}` }
      })

      addToast('User added successfully!', 'success')
      setUsers(prev => [...prev, res.data])
      setShowModal(false)
      setForm({ id : 0 , name: '', email: '', password: '', role: 'staff', status: 'Active' })
      setEditingUser(null)
    } catch (err) {
      console.error(err)
      addToast('Failed to add user', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ─── Edit User API
  const handleEditUser = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')

      const res = await callApi({
        url: '/api/editUser',
        method: 'PUT',
        body: form,
        headers: { Authorization: `Bearer ${token}` }
      })

      addToast('User updated successfully!', 'success')
      setUsers(prev => prev.map(u => (u.id === editingUser.id ? res.data : u)))
      setShowModal(false)
      setForm({ name: '', email: '', password: '', role: 'staff', status: 'Active' })
      setEditingUser(null)
    } catch (err) {
      console.error(err)
      addToast('Failed to update user', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setForm({ name: '', email: '', password: '', role: 'staff', status: 'Active' })
    setEditingUser(null)
    setShowModal(true)
  }

  const openEditModal = user => {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password, 
      role: user.role,
      status: user.status
    })
    setEditingUser(user)
    setShowModal(true)
  }

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
              {u.name.split(' ').map(n => n[0]).join('')}
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
            <Button variant="ghost" size="sm" onClick={() => openEditModal(u)}>Edit</Button>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 16 }}>
        <Button variant="secondary" size="sm" onClick={openAddModal}>
          + Add User
        </Button>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: '#fff', padding: 24, borderRadius: 10, width: 320
          }}>
            <h3 style={{ marginBottom: 16 }}>{editingUser ? 'Edit User' : 'Add User'}</h3>

            <Input label="Name" value={form.name} onChange={set('name')} />
            <Input label="Email" value={form.email} onChange={set('email')} />
            <Input label="Password" value={form.password} onChange={set('password')} type={editingUser ? 'text' : 'password'}/>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Role</label>
              <select value={form.role} onChange={set('role')} style={{ width: '100%', height: 36, padding: '6px 10px', fontSize: 14 }}>
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            {editingUser && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Status</label>
                <select value={form.status} onChange={set('status')} style={{ width: '100%', height: 36, padding: '6px 10px', fontSize: 14 }}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={editingUser ? handleEditUser : handleAddUser} disabled={loading}>
                {loading ? (editingUser ? 'Saving...' : 'Adding...') : (editingUser ? 'Save' : 'Add')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </SettingsCard>
  )
}