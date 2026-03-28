import { useState, useRef, useCallback } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../constants/theme'
import { useApp } from '../../context/AppContext'

// ── Column map from DTDC Excel ────────────────────────────────────────────────
const COL = {
  AWB:       'DSR_CNNO',
  DATE:      'DSR_BOOKING_DATE',
  DEST:      'DSR_DEST',
  MODE:      'DSR_MODE',
  TYPE:      'DSR_CN_TYPE',
  WEIGHT:    'Chargeable Weight',
  ACT_WT:    'Actual Weight',
  PIECES:    'DSR_NO_OF_PIECES',
  AMT:       'DSR_AMT',
  CONTENTS:  'DSR_CONTENTS',
  DOX:       'DSR_DOX',
  CUST_CODE: 'DSR_ACT_CUST_CODE',
  PIN:       'DSR_DEST_PIN',
  REFNO:     'DSR_REFNO',
}

const MODE_LABEL = { AR: 'Air', SR: 'Surface', ER: 'Express' }
const DOX_LABEL  = { D: 'Document', P: 'Parcel', N: 'Non-Dox' }

const GST_RATE = 0.18

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n)  { return Number(n || 0).toFixed(2) }
function cur(n)  { return `₹${fmt(n)}` }
function wt(n)   { return `${Number(n || 0).toFixed(3)} kg` }

export default function InvoiceGeneratorPage() {
  const { addToast } = useApp()
  const fileRef = useRef(null)
  const pdfRef  = useRef(null)   // hidden A4-width div for PDF capture

  // Upload state
  const [rows,    setRows]    = useState([])      // parsed DTDC rows
  const [loading, setLoading] = useState(false)
  const [fileName,setFileName]= useState('')

  // Rate settings
  const [rateMode, setRateMode] = useState('per_kg') // 'per_kg' | 'flat' | 'manual'
  const [globalRate, setGlobalRate] = useState('')
  const [manualRates, setManualRates] = useState({})  // awb → rate

  // Invoice meta
  const [meta, setMeta] = useState({
    invoiceNo:    'INV-2026-00001',
    invoiceDate:  new Date().toISOString().split('T')[0],
    clientName:   '',
    clientAddr:   '',
    clientGstin:  '',
    franchiseName:'My Courier Franchise',
    franchiseGst: '09ABCDE1234F1Z5',
    franchiseAddr:'12 MG Road, Jaipur - 302001',
    applyGst:     true,
  })
  const setM = k => e => setMeta(p => ({ ...p, [k]: typeof e === 'boolean' ? e : e.target.value }))

  // Preview state
  const [showPreview, setShowPreview] = useState(false)

  // ── Parse Excel via SheetJS ─────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return
    setLoading(true)
    setFileName(file.name)
    try {
      const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm')
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(buf, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' })

      // Map to clean rows
      const cleaned = data.map((r, i) => ({
        idx:       i,
        awb:       String(r[COL.AWB]  || '').trim(),
        date:      String(r[COL.DATE] || '').trim(),
        dest:      String(r[COL.DEST] || '').trim(),
        pin:       String(r[COL.PIN]  || '').trim(),
        mode:      String(r[COL.MODE] || '').trim(),
        type:      String(r[COL.TYPE] || '').trim(),
        dox:       String(r[COL.DOX]  || '').trim(),
        weight:    parseFloat(r[COL.WEIGHT]  || 0),
        actWeight: parseFloat(r[COL.ACT_WT]  || 0),
        pieces:    parseInt(r[COL.PIECES]    || 1),
        dtdcAmt:   parseFloat(r[COL.AMT]     || 0),
        contents:  String(r[COL.CONTENTS]    || '').trim(),
        custCode:  String(r[COL.CUST_CODE]   || '').trim(),
        refno:     String(r[COL.REFNO]       || '').trim(),
        selected:  true,
      }))
      setRows(cleaned)
      // Pre-fill client code
      if (cleaned.length && cleaned[0].custCode) {
        setMeta(p => ({ ...p, clientName: cleaned[0].custCode }))
      }
      addToast(`${cleaned.length} bookings loaded from ${file.name}`, 'success')
    } catch (err) {
      addToast('Failed to read Excel file. Please check format.', 'error')
      console.error(err)
    }
    setLoading(false)
  }

  const handleDrop = e => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ── Rate calculation ────────────────────────────────────────────────────────
  const getRate = (row) => {
    if (rateMode === 'manual') return parseFloat(manualRates[row.awb] || 0)
    const rate = parseFloat(globalRate || 0)
    if (rateMode === 'flat')   return rate
    // per_kg: use chargeable weight, minimum 0.5kg slab
    const billableWt = Math.max(row.weight, 0.5)
    return rate * billableWt
  }

  const selectedRows  = rows.filter(r => r.selected)
  const subtotal      = selectedRows.reduce((s, r) => s + getRate(r), 0)
  const gstAmt        = meta.applyGst ? subtotal * GST_RATE : 0
  const total         = subtotal + gstAmt

  // ── Toggle row selection ────────────────────────────────────────────────────
  const toggleRow = idx => setRows(p => p.map(r => r.idx === idx ? { ...r, selected: !r.selected } : r))
  const toggleAll = () => {
    const allSel = rows.every(r => r.selected)
    setRows(p => p.map(r => ({ ...r, selected: !allSel })))
  }


  // ── Download PDF ─────────────────────────────────────────────────────────────
  // Loads html2canvas + jsPDF as UMD scripts (globals), captures the hidden
  // A4-width PrintableInvoice div, slices it into A4 pages, saves as PDF.
  const [pdfLoading, setPdfLoading] = useState(false)

  // Injects a <script> tag and resolves when it loads
  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload  = resolve
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })

  const handleDownloadPDF = useCallback(async () => {
    if (!pdfRef.current) return
    setPdfLoading(true)
    addToast('Generating PDF…', 'info')

    try {
      // Load UMD bundles — safe in all browsers, no ESM issues
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')

      // Both are now available as globals
      const html2canvas = window.html2canvas
      const jsPDF       = window.jspdf?.jsPDF || window.jsPDF

      if (!html2canvas || !jsPDF) throw new Error('Libraries not loaded')

      // A4 dimensions in pt
      const PAGE_W_PT = 595.28
      const PAGE_H_PT = 841.89

      // Capture the hidden 794px-wide div at 2× scale for crisp text
      const canvas = await html2canvas(pdfRef.current, {
        scale:           2,
        useCORS:         true,
        allowTaint:      true,
        backgroundColor: '#ffffff',
        logging:         false,
        windowWidth:     794,
        windowHeight:    pdfRef.current.scrollHeight,
        scrollX:         0,
        scrollY:         0,
      })

      const imgW = canvas.width
      const imgH = canvas.height

      // How many canvas pixels fit on one A4 page at this scale
      const pxPerPage = Math.floor((PAGE_H_PT / PAGE_W_PT) * imgW)

      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })

      let yOffset = 0
      let pageIdx = 0

      while (yOffset < imgH) {
        const sliceH = Math.min(pxPerPage, imgH - yOffset)

        // Draw this slice onto a fresh canvas
        const pageCanvas        = document.createElement('canvas')
        pageCanvas.width        = imgW
        pageCanvas.height       = sliceH
        const ctx = pageCanvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, imgW, sliceH)
        ctx.drawImage(canvas, 0, -yOffset, imgW, imgH)

        const imgData = pageCanvas.toDataURL('image/png')

        if (pageIdx > 0) pdf.addPage()
        // Image height in pt = sliceH × (PAGE_W_PT / imgW)
        const imgHeightPt = sliceH * (PAGE_W_PT / imgW)
        pdf.addImage(imgData, 'PNG', 0, 0, PAGE_W_PT, imgHeightPt)

        yOffset += sliceH
        pageIdx++
      }

      const safe     = (s) => String(s || '').replace(/[^a-zA-Z0-9-_]/g, '_')
      const filename = `${safe(meta.invoiceNo)}_${safe(meta.clientName) || 'invoice'}.pdf`
      pdf.save(filename)
      addToast(`✅ Downloaded: ${filename}`, 'success')

    } catch (err) {
      console.error('PDF error:', err)
      addToast(`PDF failed: ${err.message}`, 'error')
    } finally {
      setPdfLoading(false)
    }
  }, [meta, addToast])


  return (
    <DashboardLayout>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: FONTS.display, color: COLORS.dark }}>
            DTDC Invoice Generator
          </h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginTop: 3 }}>
            Upload your DTDC booking sheet → set rates → generate GST invoice
          </p>
        </div>
        {rows.length > 0 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="outline" onClick={() => setShowPreview(true)}>👁 Preview Invoice</Btn>
            <Btn onClick={handleDownloadPDF} loading={pdfLoading}>
              {pdfLoading ? '⏳ Generating…' : '⬇ Download PDF'}
            </Btn>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: rows.length ? 'minmax(0,1fr) 320px' : '1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Upload + Table ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Upload zone */}
          {rows.length === 0 && (
            <UploadZone
              loading={loading}
              onFile={handleFile}
              onDrop={handleDrop}
              fileRef={fileRef}
            />
          )}

          {/* File loaded header */}
          {rows.length > 0 && (
            <div style={{
              background: COLORS.white, borderRadius: RADIUS.lg,
              border: `1px solid ${COLORS.border}`, padding: '14px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>📊</span>
                <div>
                  <div style={{ fontWeight: 600, color: COLORS.dark, fontSize: 14 }}>{fileName}</div>
                  <div style={{ fontSize: 12, color: COLORS.gray }}>
                    {rows.length} bookings • {selectedRows.length} selected • Date: {rows[0]?.date}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setRows([]); setFileName(''); setManualRates({}) }}
                style={{
                  background: COLORS.dangerLight, color: COLORS.danger,
                  border: 'none', borderRadius: RADIUS.md,
                  padding: '7px 14px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONTS.body,
                }}
              >
                ✕ Clear
              </button>
            </div>
          )}

          {/* Bookings table */}
          {rows.length > 0 && (
            <div style={{ background: COLORS.white, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
              <div style={{
                padding: '12px 18px', borderBottom: `1px solid ${COLORS.grayLight}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 15, color: COLORS.dark }}>
                  Booking Details
                </div>
                <span style={{ fontSize: 12, color: COLORS.gray }}>
                  {selectedRows.length}/{rows.length} selected
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: COLORS.bgPage }}>
                      <th style={thStyle}>
                        <input type="checkbox" checked={rows.every(r=>r.selected)} onChange={toggleAll} style={{ accentColor: COLORS.primary }} />
                      </th>
                      {['AWB No.','Date','Destination','Mode','Type','Ch. Wt (kg)','Pcs','Description','Your Rate (₹)','Amount'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const rowRate = getRate(row)
                      return (
                        <tr
                          key={row.idx}
                          style={{
                            borderTop: `1px solid ${COLORS.grayLight}`,
                            opacity: row.selected ? 1 : 0.45,
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = COLORS.bgPage}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={tdStyle}>
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => toggleRow(row.idx)}
                              style={{ accentColor: COLORS.primary }}
                            />
                          </td>
                          <td style={{ ...tdStyle, color: COLORS.primary, fontWeight: 700, whiteSpace: 'nowrap' }}>{row.awb}</td>
                          <td style={{ ...tdStyle, color: COLORS.gray, whiteSpace: 'nowrap' }}>{row.date}</td>
                          <td style={tdStyle}>
                            <span style={{
                              background: COLORS.primaryLight, color: COLORS.primary,
                              padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                            }}>
                              {row.dest} {row.pin ? `- ${row.pin}` : ''}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              background: '#FFF0EB', color: COLORS.accent,
                              padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                            }}>
                              {MODE_LABEL[row.mode] || row.mode}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              background: COLORS.grayLight, color: COLORS.gray,
                              padding: '2px 8px', borderRadius: 9999, fontSize: 11,
                            }}>
                              {DOX_LABEL[row.dox] || row.type}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600, color: COLORS.dark }}>{wt(row.weight)}</td>
                          <td style={{ ...tdStyle, color: COLORS.gray }}>{row.pieces}</td>
                          <td style={{ ...tdStyle, color: COLORS.gray, maxWidth: 120 }}>
                            <span style={{ fontSize: 12 }}>{row.contents || '—'}</span>
                          </td>

                          {/* Editable rate for manual mode */}
                          <td style={tdStyle}>
                            {rateMode === 'manual' ? (
                              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: 7, fontSize: 12, color: COLORS.gray }}>₹</span>
                                <input
                                  type="number"
                                  value={manualRates[row.awb] ?? ''}
                                  onChange={e => setManualRates(p => ({ ...p, [row.awb]: e.target.value }))}
                                  style={{
                                    width: 80, padding: '5px 6px 5px 18px', fontSize: 13,
                                    border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.sm,
                                    outline: 'none', fontFamily: FONTS.body,
                                  }}
                                  onFocus={e => e.target.style.borderColor = COLORS.primary}
                                  onBlur={e  => e.target.style.borderColor = COLORS.border}
                                />
                              </div>
                            ) : (
                              <span style={{ color: rowRate > 0 ? COLORS.dark : COLORS.gray, fontWeight: rowRate > 0 ? 600 : 400 }}>
                                {rowRate > 0 ? cur(rowRate) : '—'}
                              </span>
                            )}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: rowRate > 0 ? COLORS.success : COLORS.gray }}>
                            {rowRate > 0 ? cur(rowRate) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot>
                    <tr style={{ background: COLORS.bgPage, borderTop: `2px solid ${COLORS.border}` }}>
                      <td colSpan={9} style={{ ...tdStyle, fontWeight: 700, color: COLORS.dark }}>
                        Subtotal ({selectedRows.length} shipments)
                      </td>
                      <td style={tdStyle} />
                      <td style={{ ...tdStyle, fontWeight: 800, color: COLORS.primary, fontSize: 15 }}>
                        {cur(subtotal)}
                      </td>
                    </tr>
                    {meta.applyGst && (
                      <tr style={{ background: COLORS.bgPage }}>
                        <td colSpan={10} style={{ ...tdStyle, color: COLORS.gray }}>GST @ 18%</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: COLORS.dark }}>{cur(gstAmt)}</td>
                      </tr>
                    )}
                    <tr style={{ background: COLORS.primaryLight }}>
                      <td colSpan={10} style={{ ...tdStyle, fontWeight: 800, color: COLORS.primary, fontFamily: FONTS.display, fontSize: 15 }}>
                        TOTAL PAYABLE
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: COLORS.primary, fontFamily: FONTS.display, fontSize: 16 }}>
                        {cur(total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel: Settings ── */}
        {rows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Rate Settings */}
            <SectionCard title="⚡ Rate Settings">
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Rate Mode</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { val: 'per_kg', label: 'Per KG rate', desc: 'Rate × chargeable weight' },
                    { val: 'flat',   label: 'Flat rate',   desc: 'Same amount per shipment' },
                    { val: 'manual', label: 'Manual',       desc: 'Enter each rate individually' },
                  ].map(opt => (
                    <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: RADIUS.md, border: `1.5px solid ${rateMode === opt.val ? COLORS.primary : COLORS.border}`, background: rateMode === opt.val ? COLORS.primaryLight : COLORS.white }}>
                      <input type="radio" name="rateMode" value={opt.val} checked={rateMode === opt.val} onChange={() => setRateMode(opt.val)} style={{ accentColor: COLORS.primary }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: COLORS.gray }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {rateMode !== 'manual' && (
                <div>
                  <label style={labelStyle}>
                    {rateMode === 'per_kg' ? 'Rate per KG (₹)' : 'Flat Rate per Shipment (₹)'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: COLORS.gray, fontSize: 14 }}>₹</span>
                    <input
                      type="number"
                      value={globalRate}
                      onChange={e => setGlobalRate(e.target.value)}
                      placeholder={rateMode === 'per_kg' ? 'e.g. 80' : 'e.g. 65'}
                      style={{
                        width: '100%', padding: '10px 12px 10px 26px',
                        fontSize: 14, fontFamily: FONTS.body,
                        border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                        outline: 'none', color: COLORS.dark,
                      }}
                      onFocus={e => e.target.style.borderColor = COLORS.primary}
                      onBlur={e  => e.target.style.borderColor = COLORS.border}
                    />
                  </div>
                  {rateMode === 'per_kg' && (
                    <p style={{ fontSize: 11, color: COLORS.gray, marginTop: 5 }}>
                      Minimum 0.5 kg slab applies. Chargeable wt used.
                    </p>
                  )}
                </div>
              )}

              {/* GST toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark }}>Apply GST @ 18%</div>
                  <div style={{ fontSize: 11, color: COLORS.gray }}>CGST 9% + SGST 9%</div>
                </div>
                <Toggle value={meta.applyGst} onToggle={() => setM('applyGst')(!meta.applyGst)} />
              </div>
            </SectionCard>

            {/* Invoice Details */}
            <SectionCard title="🧾 Invoice Details">
              <FieldInput label="Invoice Number" value={meta.invoiceNo}   onChange={setM('invoiceNo')} />
              <FieldInput label="Invoice Date"   type="date" value={meta.invoiceDate} onChange={setM('invoiceDate')} />
              <div style={{ height: 1, background: COLORS.border, margin: '4px 0 12px' }} />
              <FieldInput label="Client Name *"    value={meta.clientName}   onChange={setM('clientName')}   placeholder="Ravi Textiles Pvt. Ltd." />
              <FieldInput label="Client Address"   value={meta.clientAddr}   onChange={setM('clientAddr')}   placeholder="12 MG Road, Delhi" type="textarea" />
              <FieldInput label="Client GSTIN"     value={meta.clientGstin}  onChange={setM('clientGstin')}  placeholder="09AACFR1234A1Z5" />
            </SectionCard>

            {/* Franchise Details */}
            <SectionCard title="🏪 Franchise (From)">
              <FieldInput label="Franchise Name" value={meta.franchiseName} onChange={setM('franchiseName')} />
              <FieldInput label="GST Number"     value={meta.franchiseGst}  onChange={setM('franchiseGst')} />
              <FieldInput label="Address"        value={meta.franchiseAddr} onChange={setM('franchiseAddr')} type="textarea" />
            </SectionCard>

            {/* Summary */}
            <SectionCard title="💰 Summary">
              {[
                { label: `Shipments selected`,      val: `${selectedRows.length} of ${rows.length}` },
                { label: 'Total weight',             val: wt(selectedRows.reduce((s,r)=>s+r.weight,0)) },
                { label: 'Subtotal',                 val: cur(subtotal) },
                { label: 'GST (18%)',                val: meta.applyGst ? cur(gstAmt) : '—' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                  <span style={{ color: COLORS.gray }}>{s.label}</span>
                  <span style={{ fontWeight: 600, color: COLORS.dark }}>{s.val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${COLORS.border}`, paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 16, color: COLORS.primary }}>Total</span>
                <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 16, color: COLORS.primary }}>{cur(total)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <Btn onClick={() => setShowPreview(true)} variant="outline" fullWidth>👁 Preview</Btn>
                <Btn onClick={handleDownloadPDF} loading={pdfLoading} fullWidth>
                  {pdfLoading ? '⏳' : '⬇ PDF'}
                </Btn>
              </div>
            </SectionCard>

          </div>
        )}
      </div>

      {/* ── Invoice Preview Modal ── */}
      {showPreview && (
        <InvoicePreviewModal
          meta={meta}
          rows={selectedRows}
          getRate={getRate}
          subtotal={subtotal}
          gstAmt={gstAmt}
          total={total}
          onClose={() => setShowPreview(false)}
          onDownload={handleDownloadPDF}
          pdfLoading={pdfLoading}
        />
      )}

      {/* ── Hidden A4-width render area for PDF capture ── */}
      {/* Always in DOM so pdfRef is valid; positioned far off-screen */}
      <div style={{
        position: 'fixed', left: -9999, top: 0,
        width: 794,              // A4 at 96 dpi
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'visible',
      }}>
        <div ref={pdfRef}>
          <PrintableInvoice
            meta={meta}
            rows={selectedRows}
            getRate={getRate}
            subtotal={subtotal}
            gstAmt={gstAmt}
            total={total}
            forPdf
          />
        </div>
      </div>

    </DashboardLayout>
  )
}

// ── Upload Zone ───────────────────────────────────────────────────────────────
function UploadZone({ loading, onFile, onDrop, fileRef }) {
  const [dragOver, setDragOver] = useState(false)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { setDragOver(false); onDrop(e) }}
      onClick={() => fileRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? COLORS.primary : COLORS.border}`,
        borderRadius: RADIUS.xl, padding: '60px 40px',
        textAlign: 'center', cursor: 'pointer',
        background: dragOver ? COLORS.primaryLight : COLORS.white,
        transition: 'all 0.2s',
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={e => onFile(e.target.files[0])}
      />
      {loading ? (
        <>
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1s infinite' }}>⏳</div>
          <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 18, color: COLORS.dark }}>Reading file...</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 56, marginBottom: 20 }}>📊</div>
          <div style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 22, color: COLORS.dark, marginBottom: 10 }}>
            Upload DTDC Booking Sheet
          </div>
          <p style={{ fontSize: 15, color: COLORS.gray, marginBottom: 24, lineHeight: 1.6 }}>
            Drag & drop your Excel file here, or click to browse.<br />
            Supports <strong>Booking_Details_*.xlsx</strong> format from DTDC.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: COLORS.primary, color: '#fff',
            padding: '12px 28px', borderRadius: RADIUS.md,
            fontWeight: 700, fontSize: 15,
          }}>
            📂 Choose Excel File
          </div>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {['DSR_CNNO (AWB)', 'DSR_DEST', 'Chargeable Weight', 'DSR_BOOKING_DATE', 'DSR_DOX'].map(col => (
              <span key={col} style={{
                fontSize: 11, background: COLORS.bgPage, color: COLORS.gray,
                padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace',
                border: `1px solid ${COLORS.border}`,
              }}>{col}</span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Invoice Preview Modal ─────────────────────────────────────────────────────
function InvoicePreviewModal({ meta, rows, getRate, subtotal, gstAmt, total, onClose, onDownload, pdfLoading }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.65)',
        zIndex: 1000, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '24px 16px', overflowY: 'auto',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 820 }}>
        {/* Modal controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 18, color: '#fff' }}>Invoice Preview</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onDownload}
              disabled={pdfLoading}
              style={{
                background: pdfLoading ? COLORS.primaryLight : COLORS.primary,
                color: pdfLoading ? COLORS.primary : '#fff',
                border: 'none', borderRadius: RADIUS.md, padding: '8px 18px',
                fontSize: 14, fontWeight: 600, cursor: pdfLoading ? 'not-allowed' : 'pointer',
                fontFamily: FONTS.body, display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {pdfLoading ? '⏳ Generating…' : '⬇ Download PDF'}
            </button>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none',
              borderRadius: RADIUS.md, padding: '8px 14px',
              fontSize: 14, cursor: 'pointer', fontFamily: FONTS.body,
            }}>✕ Close</button>
          </div>
        </div>
        <PrintableInvoice meta={meta} rows={rows} getRate={getRate} subtotal={subtotal} gstAmt={gstAmt} total={total} />
      </div>
    </div>
  )
}

// ── Printable Invoice (used in modal + hidden PDF div) ────────────────────────
function PrintableInvoice({ meta, rows, getRate, subtotal, gstAmt, total, forPdf = false }) {
  const cgst = gstAmt / 2
  const sgst = gstAmt / 2

  return (
    <div style={{
      background: '#fff',
      // Remove decorative shadow/radius for PDF capture — they add phantom spacing
      borderRadius: forPdf ? 0 : RADIUS.xl,
      boxShadow:    forPdf ? 'none' : SHADOWS.xl,
      overflow: 'hidden',
      fontFamily: FONTS.body,
      // Fixed width so the capture is always A4-proportioned
      width: forPdf ? 794 : undefined,
    }}>
      {/* Header */}
      <div style={{ background: COLORS.primary, padding: '28px 36px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>
              📦 {meta.franchiseName}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>DTDC Authorized Franchise</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>GST: {meta.franchiseGst}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{meta.franchiseAddr}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tax Invoice</div>
            <div style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 20 }}>{meta.invoiceNo}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Date: {meta.invoiceDate}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 36px' }}>
        {/* Bill To */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div style={{ background: COLORS.bgPage, borderRadius: RADIUS.md, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: COLORS.gray, fontWeight: 700, letterSpacing: '0.07em', marginBottom: 8 }}>
              BILL TO
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.dark }}>{meta.clientName || '—'}</div>
            {meta.clientAddr  && <div style={{ fontSize: 13, color: COLORS.gray, marginTop: 4, lineHeight: 1.5 }}>{meta.clientAddr}</div>}
            {meta.clientGstin && <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>GSTIN: {meta.clientGstin}</div>}
          </div>
          <div style={{ background: COLORS.bgPage, borderRadius: RADIUS.md, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: COLORS.gray, fontWeight: 700, letterSpacing: '0.07em', marginBottom: 8 }}>
              SHIPMENT SUMMARY
            </div>
            {[
              ['Total Consignments', rows.length],
              ['Booking Date',       rows[0]?.date || '—'],
              ['Total Weight',       `${rows.reduce((s,r)=>s+(r.weight||0),0).toFixed(3)} kg`],
              ['Mode',               [...new Set(rows.map(r=>MODE_LABEL[r.mode]||r.mode))].join(', ')],
            ].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span style={{ color: COLORS.gray }}>{k}</span>
                <span style={{ fontWeight: 600, color: COLORS.dark }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Line items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
          <thead>
            <tr style={{ background: COLORS.dark }}>
              {['#', 'AWB No.', 'Date', 'Destination', 'Mode', 'Type', 'Ch. Wt', 'Pcs', 'Rate', 'Amount'].map(h => (
                <th key={h} style={{
                  padding: '10px 10px', textAlign: 'left', color: '#fff',
                  fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const rate = getRate(row)
              return (
                <tr key={row.awb} style={{ background: i % 2 === 0 ? '#fff' : COLORS.bgPage }}>
                  <td style={ptdStyle}>{i + 1}</td>
                  <td style={{ ...ptdStyle, fontWeight: 700, color: COLORS.primary }}>{row.awb}</td>
                  <td style={{ ...ptdStyle, color: COLORS.gray, whiteSpace: 'nowrap' }}>{row.date}</td>
                  <td style={{ ...ptdStyle, fontWeight: 600 }}>{row.dest} {row.pin ? `- ${row.pin}` : ''}</td>
                  <td style={{ ...ptdStyle, color: COLORS.gray }}>{MODE_LABEL[row.mode] || row.mode}</td>
                  <td style={{ ...ptdStyle, color: COLORS.gray }}>{DOX_LABEL[row.dox] || row.type}</td>
                  <td style={{ ...ptdStyle, fontWeight: 600 }}>{wt(row.weight)}</td>
                  <td style={ptdStyle}>{row.pieces}</td>
                  <td style={ptdStyle}>{cur(rate)}</td>
                  <td style={{ ...ptdStyle, fontWeight: 700, color: COLORS.dark }}>{cur(rate)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 280 }}>
            {[
              ['Subtotal', cur(subtotal), false],
              ...(meta.applyGst ? [
                ['CGST @ 9%', cur(cgst), false],
                ['SGST @ 9%', cur(sgst), false],
              ] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COLORS.grayLight}`, fontSize: 14 }}>
                <span style={{ color: COLORS.gray }}>{k}</span>
                <span style={{ fontWeight: 600, color: COLORS.dark }}>{v}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '12px 0', marginTop: 2,
              borderTop: `3px solid ${COLORS.primary}`,
            }}>
              <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 18, color: COLORS.primary }}>
                TOTAL
              </span>
              <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 18, color: COLORS.primary }}>
                {cur(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 28, paddingTop: 16, borderTop: `1px solid ${COLORS.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ fontSize: 12, color: COLORS.gray }}>
            <strong style={{ color: COLORS.dark }}>Terms:</strong> Payment due within 7 days of invoice date.<br />
            Please quote invoice number in all correspondence.
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: COLORS.gray, marginBottom: 32 }}>Authorised Signatory</div>
            <div style={{ borderTop: `1px solid ${COLORS.dark}`, paddingTop: 4, fontSize: 12, fontWeight: 700, color: COLORS.dark }}>
              {meta.franchiseName}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Small shared components ───────────────────────────────────────────────────
function SectionCard({ title, children }) {
  return (
    <div style={{
      background: COLORS.white, borderRadius: RADIUS.lg,
      border: `1px solid ${COLORS.border}`, padding: '18px 20px',
    }}>
      <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 14, color: COLORS.dark, marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function FieldInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  const [focused, setFocused] = useState(false)
  const common = {
    width: '100%', padding: '9px 12px', fontSize: 13,
    fontFamily: FONTS.body, color: COLORS.dark,
    border: `1.5px solid ${focused ? COLORS.primary : COLORS.border}`,
    borderRadius: RADIUS.md, outline: 'none',
    boxShadow: focused ? `0 0 0 3px ${COLORS.primary}14` : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    background: COLORS.white,
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={value} onChange={onChange} placeholder={placeholder} rows={2}
          style={{ ...common, resize: 'vertical' }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      ) : (
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          style={common}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      )}
    </div>
  )
}

function Toggle({ value, onToggle }) {
  return (
    <div onClick={onToggle} style={{
      width: 44, height: 24, borderRadius: 9999,
      background: value ? COLORS.primary : COLORS.border,
      cursor: 'pointer', position: 'relative', transition: 'background 0.25s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 0.25s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

function Btn({ children, onClick, variant = 'primary', fullWidth, loading = false }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 18px', fontSize: 13, fontWeight: 600,
        fontFamily: FONTS.body, borderRadius: RADIUS.md,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        width: fullWidth ? '100%' : 'auto',
        opacity: loading ? 0.75 : 1,
        background: variant === 'primary'
          ? (loading ? COLORS.primaryLight : hov ? COLORS.primaryDark : COLORS.primary)
          : (hov ? COLORS.primaryLight : '#fff'),
        color: variant === 'primary'
          ? (loading ? COLORS.primary : '#fff')
          : COLORS.primary,
        border: variant === 'primary' ? 'none' : `1.5px solid ${COLORS.primary}`,
        transform: hov && !loading ? 'translateY(-1px)' : 'none',
        boxShadow: hov && !loading && variant === 'primary' ? SHADOWS.btn : 'none',
      }}
    >
      {children}
    </button>
  )
}

// ── Style constants ───────────────────────────────────────────────────────────
const thStyle = {
  padding: '10px 12px', textAlign: 'left',
  color: COLORS.gray, fontWeight: 600, fontSize: 11,
  whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '11px 12px', verticalAlign: 'middle',
}
const ptdStyle = {
  padding: '9px 10px', color: COLORS.darkMuted, verticalAlign: 'middle',
}
const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: COLORS.gray, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
}