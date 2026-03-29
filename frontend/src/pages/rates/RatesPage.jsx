import { useState, useEffect, useRef, useCallback } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Button from '../../components/common/Button'
import { COLORS, RADIUS } from '../../constants/theme'
import { useApp } from '../../context/AppContext'
import { callApi } from '../../utils/api'

// ─── uid for local keys ───────────────────────────────────────────────────────
let _uid = 0
const uid = () => ++_uid

// ─── helpers ──────────────────────────────────────────────────────────────────
const emptySlabs = () => [
  { _key: uid(), min_weight: 0,  max_weight: 1,    rate_per_kg: '' },
  { _key: uid(), min_weight: 1,  max_weight: null, rate_per_kg: '' },
]

const emptyPlan = () => ({
  _key:           uid(),
  id:             null,
  transport_type: '',
  slabs:          emptySlabs(),
  saving:         false,
  expanded:       true,
})

function buildPlanFromApi(p) {
  return {
    _key:           uid(),
    id:             p.id,
    transport_type: p.transport_type ?? '',
    slabs:          (p.slabs ?? []).map(s => ({ ...s, _key: uid() })),
    saving:         false,
    expanded:       false,
  }
}

// ─── shared micro-styles ──────────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: COLORS.gray, marginBottom: 5,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px', fontSize: 14, fontWeight: 500,
  border: `1.5px solid ${COLORS.border}`,
  borderRadius: RADIUS.md, outline: 'none',
  fontFamily: "'DM Sans', sans-serif",
  color: COLORS.dark, background: COLORS.white,
  transition: 'border-color 0.15s',
}

// ─── ClientSearch ─────────────────────────────────────────────────────────────
function ClientSearch({ onSelect }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const debounce = useRef(null)
  const wrapRef  = useRef(null)

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const data  = await callApi({
        url: `/api/rates/clients/search?q=${encodeURIComponent(q)}`,
        headers: { Authorization: `Bearer ${token}` },
      })
      setResults(Array.isArray(data) ? data : [])
      setOpen(true)
    } catch { setResults([]) }
    finally  { setLoading(false) }
  }, [])

  const handleInput = (e) => {
    const v = e.target.value
    setQuery(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(v), 280)
  }

  const pick = (client) => {
    setQuery(client.name)
    setResults([])
    setOpen(false)
    onSelect(client)
  }

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: 340 }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 15, opacity: 0.45 }}>🔍</span>
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search client by name or phone…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '9px 12px 9px 34px', fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            border: `1.5px solid ${COLORS.border}`,
            borderRadius: RADIUS.md, outline: 'none',
            background: COLORS.white, color: COLORS.dark,
          }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: COLORS.gray }}>…</span>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 200,
          background: COLORS.white, border: `1.5px solid ${COLORS.border}`,
          borderRadius: RADIUS.md, boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          maxHeight: 240, overflowY: 'auto',
        }}>
          {results.map(c => (
            <div
              key={c.id}
              onMouseDown={() => pick(c)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: `1px solid ${COLORS.grayLight}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: COLORS.dark }}>{c.name}</span>
              {c.phone && <span style={{ fontSize: 12, color: COLORS.gray }}>{c.phone}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── GSTSettings — per-client, fetched + saved independently ─────────────────
function GSTSettings({ clientId }) {
  const { addToast } = useApp()

  const [cgst,    setCgst]    = useState('')
  const [sgst,    setSgst]    = useState('')
  const [igst,    setIgst]    = useState('')
  const [gstId,   setGstId]   = useState(null)   // null = no record yet
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  // Fetch existing GST config for this client
  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    const token = localStorage.getItem('access_token')
    callApi({
      url:     `/api/rates/gst/${clientId}`,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(data => {
        if (data && data.id) {
          setGstId(data.id)
          setCgst(data.cgst ?? '')
          setSgst(data.sgst ?? '')
          setIgst(data.igst ?? '')
        } else {
          setGstId(null); setCgst(''); setSgst(''); setIgst('')
        }
      })
      .catch(() => {
        // 404 = no record yet, that's fine
        setGstId(null); setCgst(''); setSgst(''); setIgst('')
      })
      .finally(() => setLoading(false))
  }, [clientId])

  const handleSave = async () => {
    // Basic validation — allow 0 but not negative or blank
    for (const [label, val] of [['CGST', cgst], ['SGST', sgst], ['IGST', igst]]) {
      if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
        addToast(`${label} must be a valid non-negative number.`, 'error'); return
      }
    }
    setSaving(true)
    try {
      const token   = localStorage.getItem('access_token')
      const payload = {
        client_id: clientId,
        cgst: Number(cgst),
        sgst: Number(sgst),
        igst: Number(igst),
      }
      let saved
      if (gstId) {
        // update
        saved = await callApi({
          url:    `/api/rates/gst/${gstId}`,
          method: 'PUT',
          body:   payload,
          headers: { Authorization: `Bearer ${token}` },
        })
      } else {
        // create
        saved = await callApi({
          url:    '/api/rates/gst',
          method: 'POST',
          body:   payload,
          headers: { Authorization: `Bearer ${token}` },
        })
        setGstId(saved.id)
      }
      addToast('GST settings saved!', 'success')
    } catch (e) {
      addToast(e.message || 'Failed to save GST settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const pctInput = (label, value, setter) => (
    <div style={{ flex: '1 1 120px', minWidth: 100 }}>
      <label style={labelStyle}>{label} (%)</label>
      <div style={{ position: 'relative' }}>
        <input
          type="number" min="0" max="100" step="0.01"
          value={value}
          placeholder="0.00"
          onChange={e => setter(e.target.value)}
          style={{ ...inputStyle, paddingRight: 28 }}
        />
        <span style={{
          position: 'absolute', right: 10, top: '50%',
          transform: 'translateY(-50%)', fontSize: 12, color: COLORS.gray,
        }}>%</span>
      </div>
    </div>
  )

  return (
    <div style={{
      background: COLORS.white, borderRadius: RADIUS.lg,
      border: `1px solid ${COLORS.border}`, padding: '20px 22px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark }}>GST Settings</div>
          <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
            Applied to all invoices for this client · set once across all transport types
          </div>
        </div>
        {gstId && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            background: '#e8f5e9', color: '#2e7d32',
            border: '1px solid #a5d6a7',
            borderRadius: RADIUS.full, padding: '3px 10px',
          }}>✓ Configured</span>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.gray }}>Loading GST settings…</div>
      ) : (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' ,justifyContent: 'space-between',}}>
          {pctInput('CGST', cgst, setCgst)}
          {pctInput('SGST', sgst, setSgst)}
          {pctInput('IGST', igst, setIgst)}


          <div style={{ paddingBottom: 1 }}>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : gstId ? '💾 Update GST' : '✨ Save GST'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SlabRow ──────────────────────────────────────────────────────────────────
function SlabRow({ slab, idx, total, onChange, onRemove }) {
  const isLast = idx === total - 1
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '36px 1fr 1fr 1fr auto',
      gap: 10, alignItems: 'center',
      padding: '10px 0',
      borderBottom: idx < total - 1 ? `1px dashed ${COLORS.grayLight}` : 'none',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: COLORS.primary + '18', color: COLORS.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
      }}>
        {idx + 1}
      </div>

      <div>
        <label style={labelStyle}>From (kg)</label>
        <input
          type="number" min="0" step="0.1"
          value={slab.min_weight}
          onChange={e => onChange(slab._key, 'min_weight', e.target.value === '' ? '' : Number(e.target.value))}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>
          To (kg){isLast && <span style={{ color: COLORS.gray, fontWeight: 400, textTransform: 'none' }}> — blank = ∞</span>}
        </label>
        <input
          type="number" min="0" step="0.1"
          placeholder={isLast ? '∞ unlimited' : ''}
          value={slab.max_weight ?? ''}
          onChange={e => onChange(slab._key, 'max_weight', e.target.value === '' ? null : Number(e.target.value))}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>₹ per kg</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: COLORS.gray, fontSize: 13 }}>₹</span>
          <input
            type="number" min="0" step="0.01"
            value={slab.rate_per_kg}
            onChange={e => onChange(slab._key, 'rate_per_kg', e.target.value === '' ? '' : Number(e.target.value))}
            style={{ ...inputStyle, paddingLeft: 22 }}
          />
        </div>
      </div>

      <button
        onClick={() => onRemove(slab._key)}
        disabled={total <= 1}
        style={{
          marginTop: 18, width: 28, height: 28, borderRadius: '50%',
          border: `1.5px solid ${COLORS.border}`, background: 'none',
          cursor: total > 1 ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: total > 1 ? '#e74c3c' : COLORS.grayLight,
          transition: 'all 0.15s', flexShrink: 0,
        }}
        onMouseEnter={e => { if (total > 1) e.currentTarget.style.background = '#fdf0f0' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
      >×</button>
    </div>
  )
}

// ─── Slab preview strip ───────────────────────────────────────────────────────
function SlabStrip({ slabs }) {
  if (!slabs.length) return null
  return (
    <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 0 }}>
      {slabs.map((s, i) => (
        <div key={s._key} style={{
          flex: 1, minWidth: 72, padding: '7px 10px',
          background: i % 2 === 0 ? COLORS.primary + '10' : COLORS.primary + '06',
          borderLeft:   i === 0              ? `3px solid ${COLORS.primary}` : `1px solid ${COLORS.primary}30`,
          borderTop:    `2px solid ${COLORS.primary}30`,
          borderBottom: `2px solid ${COLORS.primary}30`,
          borderRight:  i === slabs.length - 1 ? `3px solid ${COLORS.primary}` : 'none',
        }}>
          <div style={{ fontSize: 10, color: COLORS.gray, fontWeight: 600 }}>
            {s.min_weight}–{s.max_weight ?? '∞'} kg
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginTop: 2 }}>
            {s.rate_per_kg !== '' ? `₹${s.rate_per_kg}/kg` : '—'}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── CostCalculator ───────────────────────────────────────────────────────────
function CostCalculator({ clientId, planId }) {
  const [weight,  setWeight]  = useState('')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const calculate = async () => {
    if (!weight || !clientId) return
    setLoading(true); setError(''); setResult(null)
    try {
      const token = localStorage.getItem('access_token')
      const data  = await callApi({
        url:    '/api/rates/calculate',
        method: 'POST',
        body:   { client_id: clientId, plan_id: planId, weight_kg: Number(weight) },
        headers: { Authorization: `Bearer ${token}` },
      })
      setResult(data)
    } catch (e) {
      setError(e.message || 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      marginTop: 16, padding: '16px 18px',
      background: COLORS.bgPage, borderRadius: RADIUS.md,
      border: `1px solid ${COLORS.grayLight}`,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.dark, marginBottom: 12 }}>
        💡 Test this plan
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={labelStyle}>Weight (kg)</label>
          <input
            type="number" min="0.01" step="0.1" placeholder="e.g. 3.5"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && calculate()}
            style={{ ...inputStyle, width: 130 }}
          />
        </div>
        <Button onClick={calculate} disabled={!weight || loading} size="sm">
          {loading ? 'Calculating…' : 'Calculate'}
        </Button>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: RADIUS.md, background: '#fdf0f0', color: '#c0392b', fontSize: 13 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 14 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderRadius: RADIUS.md,
            background: COLORS.primary + '10', marginBottom: 10,
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark }}>
              Total for {result.weight_kg} kg
            </span>
            <span style={{ fontWeight: 800, fontSize: 18, color: COLORS.primary, fontFamily: "'Syne', sans-serif" }}>
              ₹{result.total_cost?.toFixed(2)}
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Slab', 'Weight', '₹/kg', 'Cost'].map(h => (
                  <th key={h} style={{ textAlign: 'left', color: COLORS.gray, fontWeight: 600, padding: '4px 8px', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.breakdown?.map((row, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${COLORS.grayLight}` }}>
                  <td style={{ padding: '6px 8px', color: COLORS.dark }}>{row.slab_label}</td>
                  <td style={{ padding: '6px 8px', color: COLORS.gray }}>{row.weight_in_band} kg</td>
                  <td style={{ padding: '6px 8px', color: COLORS.gray }}>₹{row.rate_per_kg}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: COLORS.dark }}>₹{row.cost?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, usedTypes, clientId, transportTypes, onUpdate, onDelete }) {
  const { addToast } = useApp()

  const [transportType, setTransportType] = useState(plan.transport_type)
  const [slabs,         setSlabs]         = useState(plan.slabs)
  const [expanded,      setExpanded]      = useState(plan.expanded)
  const [saving,        setSaving]        = useState(false)

  const isNew     = !plan.id
  const hasType   = Boolean(transportType)
  const typeLabel = transportType || '—'

  // Only exclude types used by OTHER plans (not this one's own type)
  const takenByOthers = usedTypes.filter(t => t !== plan.transport_type)

  // Available types = all types minus those taken by other plans
  const availableTypes = transportTypes.filter(t => !takenByOthers.includes(t))

  // ── slab mutations ──────────────────────────────────────────────────────
  const addSlab = () => {
    setSlabs(prev => {
      const last   = prev[prev.length - 1]
      const newMin = last.max_weight ?? (last.min_weight + 1)
      return [
        ...prev.map((s, i) =>
          i === prev.length - 1 && s.max_weight == null
            ? { ...s, max_weight: newMin }
            : s
        ),
        { _key: uid(), min_weight: newMin, max_weight: null, rate_per_kg: '' },
      ]
    })
  }

  const updateSlab = (key, field, value) => {
    setSlabs(prev => prev.map(s => s._key === key ? { ...s, [field]: value } : s))
  }

  const removeSlab = (key) => {
    setSlabs(prev => prev.filter(s => s._key !== key))
  }

  // ── save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!transportType) { addToast('Select a transport type for this plan.', 'error'); return }
    for (const s of slabs) {
      if (s.rate_per_kg === '' || s.rate_per_kg < 0) {
        addToast('All slabs must have a valid rate.', 'error'); return
      }
    }
    setSaving(true)
    try {
      const token   = localStorage.getItem('access_token')
      const payload = {
        client_id:      clientId,
        transport_type: transportType,
        slabs: slabs.map(({ min_weight, max_weight, rate_per_kg }) => ({
          min_weight:  Number(min_weight),
          max_weight:  max_weight != null ? Number(max_weight) : null,
          rate_per_kg: Number(rate_per_kg),
        })),
      }
      let saved
      if (plan.id) {
        saved = await callApi({
          url:    `/api/rates/plan/${plan.id}`,
          method: 'PUT',
          body:   payload,
          headers: { Authorization: `Bearer ${token}` },
        })
      } else {
        saved = await callApi({
          url:    '/api/rates/plan',
          method: 'POST',
          body:   payload,
          headers: { Authorization: `Bearer ${token}` },
        })
      }
      onUpdate(plan._key, { id: saved.id ?? plan.id, transport_type: transportType })
      addToast(`${typeLabel} plan ${plan.id ? 'updated' : 'created'}!`, 'success')
      setExpanded(false)
    } catch (e) {
      addToast(e.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── delete ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!plan.id) { onDelete(plan._key); return }
    if (!window.confirm(`Delete ${typeLabel} plan?`)) return
    try {
      const token = localStorage.getItem('access_token')
      await callApi({
        url:    `/api/rates/plan/${plan.id}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      onDelete(plan._key)
      addToast(`${typeLabel} plan deleted.`, 'success')
    } catch (e) {
      addToast(e.message || 'Delete failed', 'error')
    }
  }

  return (
    <div style={{
      background: COLORS.white,
      border: `1.5px solid ${isNew ? COLORS.primary + '40' : COLORS.border}`,
      borderRadius: RADIUS.lg,
      marginBottom: 14,
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>

      {/* ── Card header ── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', cursor: 'pointer',
          background: expanded ? COLORS.bgPage : COLORS.white,
          borderBottom: expanded ? `1px solid ${COLORS.grayLight}` : 'none',
          userSelect: 'none', transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: plan.id ? '#27ae60' : COLORS.warning,
          }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.dark, fontFamily: "'Syne', sans-serif" }}>
              {hasType ? typeLabel : <span style={{ color: COLORS.gray, fontStyle: 'italic' }}>New Plan — select type</span>}
            </div>
            {!expanded && hasType && (
              <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                {slabs.length} slab{slabs.length !== 1 ? 's' : ''}
                {!plan.id && <span style={{ color: COLORS.warning, marginLeft: 8, fontWeight: 600 }}>● unsaved</span>}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={handleDelete}
            style={{
              padding: '5px 11px', fontSize: 12, fontWeight: 600,
              border: `1.5px solid #e74c3c30`, borderRadius: RADIUS.md,
              background: 'transparent', cursor: 'pointer', color: '#e74c3c',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            🗑 {plan.id ? 'Delete' : 'Remove'}
          </button>
          <div style={{ fontSize: 18, color: COLORS.gray, lineHeight: 1 }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{ padding: '20px 22px' }}>

          {/* Transport type selector — only shows available (unused) types */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Transport Type *</label>
            <select
              value={transportType}
              onChange={e => setTransportType(e.target.value)}
              style={{
                ...inputStyle,
                width: 260, cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                paddingRight: 32,
              }}
            >
              <option value=''>— Select Transport Type —</option>
              {availableTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {availableTypes.length === 0 && !transportType && (
              <p style={{ fontSize: 12, color: COLORS.gray, marginTop: 6, fontStyle: 'italic' }}>
                All transport types already have a plan for this client.
              </p>
            )}

            {!hasType && availableTypes.length > 0 && (
              <p style={{ fontSize: 12, color: '#e74c3c', marginTop: 6 }}>
                Required — choose a transport type to continue.
              </p>
            )}
          </div>

          {/* Slabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark }}>Weight Slabs</div>
              <p style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                Last slab with blank "To" catches all remaining weight.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={addSlab}>+ Add Slab</Button>
          </div>

          <div style={{ marginTop: 10 }}>
            {slabs.map((slab, idx) => (
              <SlabRow
                key={slab._key}
                slab={slab} idx={idx} total={slabs.length}
                onChange={updateSlab}
                onRemove={removeSlab}
              />
            ))}
          </div>

          <SlabStrip slabs={slabs} />

          {plan.id && (
            <CostCalculator clientId={clientId} planId={plan.id} />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, gap: 10 }}>
            <button
              onClick={() => setExpanded(false)}
              style={{
                padding: '8px 18px', fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                background: 'transparent', cursor: 'pointer', color: COLORS.gray,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Collapse
            </button>
            <Button onClick={handleSave} disabled={saving || !hasType}>
              {saving ? 'Saving…' : plan.id ? '💾 Update Plan' : '✨ Save Plan'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RatesPage() {
  const { addToast } = useApp()

  const [selectedClient, setSelectedClient] = useState(null)
  const [plans,          setPlans]          = useState([])
  const [loadingPlans,   setLoadingPlans]   = useState(false)

  const [transportTypes, setTransportTypes] = useState([])
  const [loadingTypes,   setLoadingTypes]   = useState(true)
  const [showAddType,    setShowAddType]    = useState(false)
  const [newTypeName,    setNewTypeName]    = useState('')
  const [savingType,     setSavingType]     = useState(false)

  // Fetch transport types on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    callApi({ url: '/api/rates/transport-types', headers: { Authorization: `Bearer ${token}` } })
      .then(data => {
        const list = Array.isArray(data) ? data : (data.types ?? [])
        setTransportTypes(list)
      })
      .catch(() => addToast('Failed to load transport types', 'error'))
      .finally(() => setLoadingTypes(false))
  }, [])

  const handleAddTransportType = async () => {
    const name = newTypeName.trim()
    if (!name) { addToast('Enter a transport type name.', 'error'); return }
    if (transportTypes.map(t => t.toLowerCase()).includes(name.toLowerCase())) {
      addToast(`"${name}" already exists.`, 'error'); return
    }
    setSavingType(true)
    try {
      const token = localStorage.getItem('access_token')
      const data  = await callApi({
        url: '/api/rates/add-transport-types', method: 'POST',
        body: { name },
        headers: { Authorization: `Bearer ${token}` },
      })
      const added = data.name ?? data.type ?? name
      setTransportTypes(prev => [...prev, added])
      setNewTypeName('')
      setShowAddType(false)
      addToast(`Transport type "${added}" added!`, 'success')
    } catch (e) {
      addToast(e.message || 'Failed to add transport type', 'error')
    } finally {
      setSavingType(false)
    }
  }

  // Load plans when client changes
  useEffect(() => {
    if (!selectedClient) return
    setLoadingPlans(true)
    setPlans([])
    const token = localStorage.getItem('access_token')
    callApi({
      url:     `/api/rates/plans/${selectedClient.id}`,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(data => {
        const list = Array.isArray(data) ? data : (data.plans ?? [])
        setPlans(list.map(buildPlanFromApi))
      })
      .catch(err => {
        if (!err.message?.includes('404')) addToast('Failed to load rate plans', 'error')
      })
      .finally(() => setLoadingPlans(false))
  }, [selectedClient])

  const addPlan = () => {
    setPlans(prev => [...prev, emptyPlan()])
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50)
  }

  const handlePlanUpdate = (planKey, patch) => {
    setPlans(prev => prev.map(p => p._key === planKey ? { ...p, ...patch } : p))
  }

  const handlePlanDelete = (planKey) => {
    setPlans(prev => prev.filter(p => p._key !== planKey))
  }

  const usedTypes    = plans.map(p => p.transport_type).filter(Boolean)
  const savedCount   = plans.filter(p => p.id).length
  const unsavedCount = plans.filter(p => !p.id).length

  // Types that still have no plan — used to decide whether to show "Add Plan"
  const remainingTypes = transportTypes.filter(t => !usedTypes.includes(t))

  return (
    <DashboardLayout>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: COLORS.dark }}>
            Rate Plan Manager
          </h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
            Create banded weight–rate plans per client, per transport type
          </p>
        </div>

        {selectedClient && !loadingPlans && remainingTypes.length > 0 && (
          <Button onClick={addPlan}>+ Add Plan</Button>
        )}
      </div>

      {/* ── Transport Types panel ── */}
      <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark }}>Transport Types</div>
            <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
              {loadingTypes ? 'Loading…' : `${transportTypes.length} type${transportTypes.length !== 1 ? 's' : ''} available`}
            </div>
          </div>
          <button
            onClick={() => { setShowAddType(true); setNewTypeName('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${COLORS.primary}`, borderRadius: RADIUS.md,
              background: 'transparent', cursor: 'pointer', color: COLORS.primary,
              fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = COLORS.primary; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.primary }}
          >
            + Add Type
          </button>
        </div>

        {loadingTypes ? (
          <div style={{ color: COLORS.gray, fontSize: 13 }}>Loading transport types…</div>
        ) : transportTypes.length === 0 ? (
          <div style={{ color: COLORS.gray, fontSize: 13, fontStyle: 'italic' }}>No transport types yet — add one to get started.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {transportTypes.map(t => {
              const inUse = usedTypes.includes(t)
              return (
                <span key={t} style={{
                  padding: '5px 14px', borderRadius: RADIUS.full,
                  background: inUse ? COLORS.primary + '18' : COLORS.bgPage,
                  border: `1px solid ${inUse ? COLORS.primary + '35' : COLORS.border}`,
                  fontSize: 12, fontWeight: 600,
                  color: inUse ? COLORS.primary : COLORS.gray,
                }}>
                  {inUse && <span style={{ marginRight: 4 }}>✓</span>}
                  {t}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add Transport Type modal ── */}
      {showAddType && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowAddType(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: COLORS.white, borderRadius: RADIUS.lg,
            padding: '28px 32px', width: 400,
            boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: COLORS.dark, fontFamily: "'Syne', sans-serif", marginBottom: 6 }}>
              Add Transport Type
            </div>
            <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 20 }}>
              The new type will be available immediately in all plan dropdowns.
            </p>
            <label style={labelStyle}>Type Name</label>
            <input
              autoFocus
              value={newTypeName}
              onChange={e => setNewTypeName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTransportType()}
              placeholder='e.g. Cargo, Refrigerated, Bulk…'
              style={{ ...inputStyle, marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddType(false)}
                style={{
                  padding: '8px 18px', fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                  background: 'transparent', cursor: 'pointer', color: COLORS.gray,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >Cancel</button>
              <button
                onClick={handleAddTransportType}
                disabled={savingType || !newTypeName.trim()}
                style={{
                  padding: '8px 20px', fontSize: 13, fontWeight: 700,
                  border: 'none', borderRadius: RADIUS.md,
                  background: savingType || !newTypeName.trim() ? COLORS.grayLight : COLORS.primary,
                  color: savingType || !newTypeName.trim() ? COLORS.gray : '#fff',
                  cursor: savingType || !newTypeName.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >{savingType ? 'Adding…' : 'Add Type'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Client selector ── */}
      <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, padding: '20px 22px', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.dark, fontFamily: "'Syne', sans-serif", marginBottom: 4 }}>
          Select Client
        </div>
        <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 14 }}>
          Search and pick a client to view or manage their rate plans.
        </p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <ClientSearch onSelect={c => setSelectedClient(c)} />

          {selectedClient && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', borderRadius: RADIUS.md,
              background: COLORS.primary + '12', border: `1px solid ${COLORS.primary}30`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: savedCount > 0 ? '#27ae60' : COLORS.gray }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: COLORS.dark }}>{selectedClient.name}</span>
              {selectedClient.phone && <span style={{ fontSize: 12, color: COLORS.gray }}>· {selectedClient.phone}</span>}
              <span style={{ fontSize: 11, color: COLORS.gray, fontWeight: 600 }}>
                {loadingPlans
                  ? 'Loading…'
                  : savedCount === 0
                    ? 'No plans yet'
                    : `${savedCount} plan${savedCount !== 1 ? 's' : ''} active`}
              </span>
              {unsavedCount > 0 && (
                <span style={{ fontSize: 11, color: COLORS.warning, fontWeight: 700 }}>
                  · {unsavedCount} unsaved
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── GST Settings — only shown when a client is selected ── */}
      {selectedClient && !loadingPlans && (
        <GSTSettings clientId={selectedClient.id} />
      )}

      {/* ── Loading ── */}
      {loadingPlans && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: COLORS.gray }}>
          Loading plans…
        </div>
      )}

      {/* ── Plans list ── */}
      {selectedClient && !loadingPlans && (
        <>
          {plans.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
              background: COLORS.white, borderRadius: RADIUS.lg,
              border: `2px dashed ${COLORS.border}`,
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.dark, fontFamily: "'Syne', sans-serif" }}>
                No rate plans yet
              </div>
              <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 6, marginBottom: 20 }}>
                Create a plan for each transport type this client uses.
              </p>
              {remainingTypes.length > 0 && <Button onClick={addPlan}>+ Add First Plan</Button>}
            </div>
          ) : (
            <>
              {plans.map(plan => (
                <PlanCard
                  key={plan._key}
                  plan={plan}
                  usedTypes={usedTypes}
                  clientId={selectedClient.id}
                  transportTypes={transportTypes}
                  onUpdate={handlePlanUpdate}
                  onDelete={handlePlanDelete}
                />
              ))}

              {/* Only show "Add Another Plan" if there are still unused types */}
              {remainingTypes.length > 0 && (
                <button
                  onClick={addPlan}
                  style={{
                    width: '100%', padding: '14px',
                    border: `2px dashed ${COLORS.border}`, borderRadius: RADIUS.lg,
                    background: 'transparent', cursor: 'pointer',
                    color: COLORS.gray, fontSize: 14, fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border;  e.currentTarget.style.color = COLORS.gray }}
                >
                  + Add Another Plan
                </button>
              )}

              {/* All types covered message */}
              {remainingTypes.length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '16px',
                  border: `1px solid ${COLORS.success + '40'}`,
                  borderRadius: RADIUS.lg, background: COLORS.success + '08',
                  fontSize: 13, color: COLORS.success, fontWeight: 600,
                }}>
                  ✅ All transport types have a rate plan for this client.
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Empty state — no client selected ── */}
      {!selectedClient && (
        <div style={{
          textAlign: 'center', padding: '56px 24px',
          background: COLORS.white, borderRadius: RADIUS.lg,
          border: `1px dashed ${COLORS.border}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.dark, fontFamily: "'Syne', sans-serif" }}>
            Select a Client to Get Started
          </div>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 6, maxWidth: 340, margin: '8px auto 0' }}>
            Search above. You can then create one rate plan per transport type.
          </p>
        </div>
      )}

    </DashboardLayout>
  )
}