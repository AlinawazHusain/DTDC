import { useState, useEffect, useRef, useCallback } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Button from '../../components/common/Button'
import { COLORS, RADIUS } from '../../constants/theme'
import { useApp } from '../../context/AppContext'
import { callApi } from '../../utils/api' 

// ─── tiny uid for local keys only ────────────────────────────────────────────
let _uid = 0
const uid = () => ++_uid

// ─── helpers ─────────────────────────────────────────────────────────────────
const emptySlabs = () => [
  { _key: uid(), min_weight: 0,   max_weight: 1,    rate_per_kg: '' },
  { _key: uid(), min_weight: 1,   max_weight: null, rate_per_kg: '' },
]

function buildSlabsFromApi(apiSlabs = []) {
  return apiSlabs.map(s => ({ ...s, _key: uid() }))
}

// ─── sub-components ──────────────────────────────────────────────────────────

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
      const data = await callApi({ url: `/api/rates/clients/search?q=${encodeURIComponent(q)}` , headers: { Authorization: `Bearer ${token}` } })
      setResults(Array.isArray(data) ? data : [])
      setOpen(true)
    } catch { setResults([]) }
    finally { setLoading(false) }
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

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
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
            padding: '9px 12px 9px 34px',
            fontSize: 14, fontFamily: "'DM Sans', sans-serif",
            border: `1.5px solid ${COLORS.border}`,
            borderRadius: RADIUS.md,
            outline: 'none',
            background: COLORS.white,
            color: COLORS.dark,
          }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: COLORS.gray }}>…</span>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 200,
          background: COLORS.white,
          border: `1.5px solid ${COLORS.border}`,
          borderRadius: RADIUS.md,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
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


function SlabRow({ slab, idx, total, onChange, onRemove }) {
  const isLast = idx === total - 1

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '48px 1fr 1fr 1fr auto',
      gap: 10,
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: idx < total - 1 ? `1px dashed ${COLORS.grayLight}` : 'none',
    }}>
      {/* Row number badge */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: COLORS.primary + '18',
        color: COLORS.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
      }}>
        {idx + 1}
      </div>

      {/* Min weight */}
      <div>
        <label style={labelStyle}>From (kg)</label>
        <input
          type="number" min="0" step="0.1"
          value={slab.min_weight}
          onChange={e => onChange(slab._key, 'min_weight', e.target.value === '' ? '' : Number(e.target.value))}
          style={inputStyle}
        />
      </div>

      {/* Max weight */}
      <div>
        <label style={labelStyle}>To (kg) {isLast ? <span style={{ color: COLORS.gray, fontWeight: 400 }}>— leave blank = unlimited</span> : ''}</label>
        <input
          type="number" min="0" step="0.1"
          placeholder={isLast ? '∞ unlimited' : ''}
          value={slab.max_weight ?? ''}
          onChange={e => onChange(slab._key, 'max_weight', e.target.value === '' ? null : Number(e.target.value))}
          style={inputStyle}
        />
      </div>

      {/* Rate */}
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

      {/* Remove */}
      <button
        onClick={() => onRemove(slab._key)}
        disabled={total <= 1}
        style={{
          marginTop: 18,
          width: 30, height: 30, borderRadius: '50%',
          border: `1.5px solid ${COLORS.border}`,
          background: 'none', cursor: total > 1 ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: total > 1 ? '#e74c3c' : COLORS.grayLight,
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (total > 1) e.currentTarget.style.background = '#fdf0f0' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
      >
        ×
      </button>
    </div>
  )
}


function CostCalculator({ clientId }) {
  const [weight, setWeight] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const calculate = async () => {
    if (!weight || !clientId) return
    setLoading(true); setError(''); setResult(null)
    try {
      const token = localStorage.getItem('access_token')
      const data = await callApi({
        url: '/api/rates/calculate',
        method: 'POST',
        body: { client_id: clientId, weight_kg: Number(weight) },
        headers: { Authorization: `Bearer ${token}` }
      })
      setResult(data)
    } catch (e) {
      setError(e.message || 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, padding: '20px 22px' }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.dark, marginBottom: 4 }}>
        💡 Cost Calculator
      </div>
      <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>
        Test the rate plan — enter a weight to see the breakdown.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={labelStyle}>Weight (kg)</label>
          <input
            type="number" min="0.01" step="0.1"
            placeholder="e.g. 3.5"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && calculate()}
            style={{ ...inputStyle, width: 140 }}
          />
        </div>
        <Button onClick={calculate} disabled={!weight || loading} size="sm">
          {loading ? 'Calculating…' : 'Calculate'}
        </Button>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: RADIUS.md, background: '#fdf0f0', color: '#c0392b', fontSize: 13 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderRadius: RADIUS.md,
            background: COLORS.primary + '10',
            marginBottom: 12,
          }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.dark }}>
              Total for {result.weight_kg} kg
            </span>
            <span style={{ fontWeight: 800, fontSize: 20, color: COLORS.primary, fontFamily: "'Syne', sans-serif" }}>
              ₹{result.total_cost.toFixed(2)}
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Slab', 'Weight', '₹/kg', 'Cost'].map(h => (
                  <th key={h} style={{ textAlign: 'left', color: COLORS.gray, fontWeight: 600, padding: '4px 8px', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.breakdown.map((row, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${COLORS.grayLight}` }}>
                  <td style={{ padding: '7px 8px', color: COLORS.dark }}>{row.slab_label}</td>
                  <td style={{ padding: '7px 8px', color: COLORS.gray }}>{row.weight_in_band} kg</td>
                  <td style={{ padding: '7px 8px', color: COLORS.gray }}>₹{row.rate_per_kg}</td>
                  <td style={{ padding: '7px 8px', fontWeight: 600, color: COLORS.dark }}>₹{row.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


// ─── shared micro-styles ──────────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: COLORS.gray, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em',
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


// ─── main page ────────────────────────────────────────────────────────────────
export default function RatesPage() {
  const { addToast } = useApp()

  const [selectedClient, setSelectedClient] = useState(null)  // {id, name, phone}
  const [planName,       setPlanName]        = useState('')
  const [slabs,          setSlabs]           = useState(emptySlabs())
  const [loadingPlan,    setLoadingPlan]     = useState(false)
  const [saving,         setSaving]          = useState(false)
  const [hasPlan,        setHasPlan]         = useState(false)

  // ── load plan when client changes ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedClient) return
    setLoadingPlan(true)
    setSlabs(emptySlabs())
    setPlanName('')
    setHasPlan(false)
    const token = localStorage.getItem('access_token')
    callApi({ url: `/api/rates/plan/${selectedClient.id}`  , headers: { Authorization: `Bearer ${token}` }})
      .then(data => {
        setSlabs(buildSlabsFromApi(data.slabs))
        setPlanName(data.name || '')
        setHasPlan(true)
      })
      .catch(err => {
        // 404 = no plan yet, that's fine
        if (!err.message?.includes('404')) {
          addToast('Failed to load rate plan', 'error')
        }
      })
      .finally(() => setLoadingPlan(false))
  }, [selectedClient])

  // ── slab mutations ─────────────────────────────────────────────────────────
  const addSlab = () => {
    setSlabs(prev => {
      const last = prev[prev.length - 1]
      const newMin = last.max_weight ?? (last.min_weight + 1)
      return [
        ...prev.map((s, i) => {
          // ensure previous last row has a max_weight set
          if (i === prev.length - 1 && s.max_weight == null) {
            return { ...s, max_weight: newMin }
          }
          return s
        }),
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

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedClient) { addToast('Select a client first', 'error'); return }

    // basic validation
    for (const s of slabs) {
      if (s.rate_per_kg === '' || s.rate_per_kg < 0) {
        addToast('All slabs must have a valid rate', 'error'); return
      }
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      await callApi({
        url:    '/api/rates/plan',
        method: 'POST',
        body: {
          client_id: selectedClient.id,
          name:      planName || undefined,
          slabs: slabs.map(({ min_weight, max_weight, rate_per_kg }) => ({
            min_weight: Number(min_weight),
            max_weight: max_weight != null ? Number(max_weight) : null,
            rate_per_kg: Number(rate_per_kg),
          })),
        },headers: { Authorization: `Bearer ${token}` }
      })
      setHasPlan(true)
      addToast(hasPlan ? 'Rate plan updated!' : 'Rate plan created!', 'success')
    } catch (e) {
      addToast(e.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedClient || !hasPlan) return
    if (!window.confirm(`Delete rate plan for ${selectedClient.name}?`)) return
    try {
      const token = localStorage.getItem('access_token')
      await callApi({ url: `/api/rates/plan/${selectedClient.id}`, method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setSlabs(emptySlabs()); setPlanName(''); setHasPlan(false)
      addToast('Rate plan deleted', 'success')
    } catch (e) {
      addToast(e.message || 'Delete failed', 'error')
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: COLORS.dark }}>
            Rate Plan Manager
          </h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
            Create banded weight–rate plans per client
          </p>
        </div>

        {selectedClient && (
          <div style={{ display: 'flex', gap: 10 }}>
            {hasPlan && (
              <Button variant="outline" size="sm" onClick={handleDelete} style={{ color: '#e74c3c', borderColor: '#e74c3c' }}>
                🗑 Delete Plan
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : hasPlan ? '💾 Update Plan' : '✨ Create Plan'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Client selector ── */}
      <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.dark, marginBottom: 4 }}>
          Select Client
        </div>
        <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 14 }}>
          Search and pick a client to view or edit their rate plan.
        </p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <ClientSearch onSelect={c => { setSelectedClient(c) }} />
          {selectedClient && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', borderRadius: RADIUS.md,
              background: COLORS.primary + '12', border: `1px solid ${COLORS.primary + '30'}`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: hasPlan ? '#27ae60' : COLORS.gray }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: COLORS.dark }}>{selectedClient.name}</span>
              {selectedClient.phone && <span style={{ fontSize: 12, color: COLORS.gray }}>· {selectedClient.phone}</span>}
              <span style={{ fontSize: 11, color: hasPlan ? '#27ae60' : COLORS.gray, fontWeight: 600 }}>
                {loadingPlan ? 'Loading…' : hasPlan ? 'Plan active' : 'No plan yet'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Slab editor (only when client selected) ── */}
      {selectedClient && !loadingPlan && (
        <>
          <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, padding: '20px 22px', marginBottom: 20 }}>

            {/* Plan name */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Plan Name (optional)</label>
              <input
                type="text"
                placeholder={`e.g. ${selectedClient.name} – Standard`}
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                style={{ ...inputStyle, width: 320 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.dark }}>
                  Weight Slabs
                </div>
                <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
                  Define as many bands as needed. The last slab with no "To" value catches all remaining weight.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={addSlab}>+ Add Slab</Button>
            </div>

            {/* Visual slab chain */}
            <div style={{ marginTop: 16 }}>
              {slabs.map((slab, idx) => (
                <SlabRow
                  key={slab._key}
                  slab={slab}
                  idx={idx}
                  total={slabs.length}
                  onChange={updateSlab}
                  onRemove={removeSlab}
                />
              ))}
            </div>

            {/* Slab preview strip */}
            {slabs.length > 0 && (
              <div style={{ marginTop: 18, display: 'flex', gap: 0, flexWrap: 'wrap' }}>
                {slabs.map((s, i) => (
                  <div key={s._key} style={{
                    flex: 1, minWidth: 80,
                    padding: '8px 10px',
                    background: i % 2 === 0 ? COLORS.primary + '10' : COLORS.primary + '06',
                    borderLeft: i === 0 ? `3px solid ${COLORS.primary}` : `1px solid ${COLORS.primary + '30'}`,
                    borderTop: `2px solid ${COLORS.primary + '30'}`,
                    borderBottom: `2px solid ${COLORS.primary + '30'}`,
                    borderRight: i === slabs.length - 1 ? `3px solid ${COLORS.primary}` : 'none',
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
            )}
          </div>

          {/* ── Calculator ── */}
          <CostCalculator clientId={selectedClient.id} />
        </>
      )}

      {/* ── Empty state ── */}
      {!selectedClient && (
        <div style={{
          textAlign: 'center', padding: '56px 24px',
          background: COLORS.white, borderRadius: RADIUS.lg, border: `1px dashed ${COLORS.border}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.dark, fontFamily: "'Syne', sans-serif" }}>
            Select a Client to Get Started
          </div>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 6, maxWidth: 340, margin: '8px auto 0' }}>
            Search for a client above. You can then create or edit their banded rate plan.
          </p>
        </div>
      )}

    </DashboardLayout>
  )
}