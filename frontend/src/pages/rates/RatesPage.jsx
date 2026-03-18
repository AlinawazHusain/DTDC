import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Button from '../../components/common/Button'
import { COLORS, RADIUS } from '../../constants/theme'
import { RATE_SLABS } from '../../constants/data'
import { useApp } from '../../context/AppContext'

export default function RatesPage() {
  const { addToast } = useApp()
  const [slabs, setSlabs] = useState(RATE_SLABS)
  const [edited, setEdited] = useState({})

  const handleChange = (zoneIdx, field, value) => {
    setEdited(prev => ({ ...prev, [`${zoneIdx}-${field}`]: true }))
    setSlabs(prev => prev.map((s, i) => i === zoneIdx ? { ...s, [field]: Number(value) } : s))
  }

  const handleSave = () => {
    setEdited({})
    addToast('Rate slabs saved successfully!', 'success')
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: COLORS.dark }}>Rate Management</h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>Configure your pricing slabs per zone</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" size="sm" onClick={() => { setSlabs(RATE_SLABS); setEdited({}) }}>Reset</Button>
          <Button onClick={handleSave}>💾 Save Changes</Button>
        </div>
      </div>

      {/* Rate Table */}
      <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${COLORS.grayLight}` }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.dark }}>
            Zone-wise Rate Slabs
          </div>
          <div style={{ fontSize: 13, color: COLORS.gray, marginTop: 3 }}>
            Click any cell to edit the rate. All rates in ₹.
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: COLORS.bgPage }}>
                {['Zone', 'Up to 500g', 'Up to 1kg', 'Up to 2kg', 'Per kg after 2kg'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', color: COLORS.gray, fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slabs.map((slab, idx) => (
                <tr key={slab.zone} style={{ borderTop: `1px solid ${COLORS.grayLight}` }}>
                  <td style={{ padding: '14px 20px', fontWeight: 700, color: COLORS.dark }}>{slab.zone}</td>
                  {[
                    ['upTo500g', slab.upTo500g],
                    ['upTo1kg',  slab.upTo1kg ],
                    ['upTo2kg',  slab.upTo2kg ],
                    ['perKgAfter', slab.perKgAfter],
                  ].map(([field, val]) => (
                    <td key={field} style={{ padding: '8px 16px' }}>
                      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: 10, color: COLORS.gray, fontSize: 13 }}>₹</span>
                        <input
                          type="number"
                          value={val}
                          onChange={e => handleChange(idx, field, e.target.value)}
                          style={{
                            width: 90,
                            padding: '7px 8px 7px 22px',
                            fontSize: 14, fontWeight: 600,
                            border: `1.5px solid ${edited[`${idx}-${field}`] ? COLORS.primary : COLORS.border}`,
                            borderRadius: RADIUS.md,
                            outline: 'none',
                            color: edited[`${idx}-${field}`] ? COLORS.primary : COLORS.dark,
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                          onFocus={e => e.target.style.borderColor = COLORS.primary}
                          onBlur={e  => {
                            if (!edited[`${idx}-${field}`]) e.target.style.borderColor = COLORS.border
                          }}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client-Specific Rates */}
      <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, padding: '20px 22px' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.dark, marginBottom: 6 }}>
          Client-Specific Overrides
        </div>
        <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 18 }}>
          Set custom rates for specific account clients that override the zone slabs.
        </p>

        {[
          { client: 'Sun Pharma',    discount: '10% flat on all slabs' },
          { client: 'Meera Exports', discount: '₹10 off per kg after 2kg' },
          { client: 'Ravi Textiles', discount: 'Metro rates for non-metro' },
        ].map((c, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0',
            borderBottom: i < 2 ? `1px solid ${COLORS.grayLight}` : 'none',
          }}>
            <div>
              <div style={{ fontWeight: 600, color: COLORS.dark, fontSize: 14 }}>{c.client}</div>
              <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{c.discount}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => addToast('Rate override editor coming soon!', 'info')}>
              Edit
            </Button>
          </div>
        ))}

        <div style={{ marginTop: 16 }}>
          <Button variant="secondary" size="sm" onClick={() => addToast('Add client override coming soon!', 'info')}>
            + Add Client Override
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
