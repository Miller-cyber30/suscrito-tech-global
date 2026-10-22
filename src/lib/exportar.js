// ===== EXCEL (CSV compatible con Excel) =====
export function exportarCSV(nombreArchivo, filas) {
  const csv = filas.map(f =>
    f.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ===== PDF (Estilo SuscriTech Global) =====
export async function exportarPDF(nombreArchivo, contenidoHtml, estilos = '') {
  const ventana = window.open('', '_blank')
  ventana.document.write(`
    <html>
      <head>
        <title>${nombreArchivo} - SuscriTech Global</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&display=swap" rel="stylesheet"/>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'DM Sans', sans-serif; font-size: 12px; color: #0f172a; padding: 24px; }
          h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #4c1d95; }
          h2 { font-size: 14px; font-weight: 600; margin: 16px 0 8px; color: #1e293b; }
          p  { font-size: 12px; color: #475569; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #7c3aed; color: white; padding: 7px 10px; text-align: left; font-size: 11px; }
          td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
          tr:nth-child(even) td { background: #f8fafc; }
          .naranja { color: #7c3aed; font-weight: 700; }
          .verde   { color: #059669; font-weight: 600; }
          .rojo    { color: #dc2626; font-weight: 600; }
          .badge   { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
          .badge-naranja { background: #ede9fe; color: #6d28d9; }
          .badge-verde   { background: #d1fae5; color: #059669; }
          .badge-rojo    { background: #fee2e2; color: #dc2626; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #7c3aed; padding-bottom: 12px; }
          .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
          .stat-card { background: #f8fafc; border-radius: 8px; padding: 10px 14px; border: 1px solid #e2e8f0; }
          .stat-val  { font-size: 20px; font-weight: 800; color: #7c3aed; }
          .stat-lbl  { font-size: 10px; color: #64748b; margin-top: 2px; }
          .bar-wrap  { display: flex; align-items: flex-end; gap: 4px; height: 80px; margin: 8px 0 20px; }
          .bar       { flex: 1; background: #06b6d4; border-radius: 3px 3px 0 0; min-height: 2px; }
          .bar-lbl   { font-size: 9px; color: #64748b; text-align: center; margin-top: 3px; }
          .bar-col   { display: flex; flex-direction: column; align-items: center; flex: 1; }
          .bar-val   { font-size: 9px; color: #7c3aed; font-weight: 600; }
          .restock   { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 8px 12px; margin-bottom: 6px; display: flex; justify-content: space-between; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
          ${estilos}
        </style>
      </head>
      <body>${contenidoHtml}</body>
    </html>
  `)
  ventana.document.close()
  await new Promise(r => setTimeout(r, 800))
  ventana.print()
}
