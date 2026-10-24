import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Paginador from '../../components/Paginador'
import {
  UploadCloud, FileText, BarChart3, Calendar, Edit3, Search,
  Receipt, Printer, Trash2, Download, X, Save, Cpu, Users, Mail, Phone, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

function formatearFecha(valor) {
  if (!valor) return 'S/F'
  const str = String(valor).trim()
  const soloFecha = str.split('T')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
    const [anio, mes, dia] = soloFecha.split('-')
    return `${dia}/${mes}/${anio}`
  }
  const d = new Date(str)
  if (isNaN(d.getTime())) return str
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const anio = d.getFullYear()
  return `${dia}/${mes}/${anio}`
}

const estilosImpresion = `
  @media print {
    body * { visibility: hidden; }
    #zona-impresion, #zona-impresion * { visibility: visible; }
    #zona-impresion { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; border: none !important; box-shadow: none !important; background: #fff !important; color: #000 !important; }
    .no-print { display: none !important; }
  }
`

export default function AdminCompras() {
  const [tabActual, setTabActual] = useState('registro')
  const [cargando, setCargando]   = useState(false)

  const [productosDB, setProductosDB]           = useState([])
  const [comprasHistorial, setComprasHistorial] = useState([])

  const [paginaActual, setPaginaActual]     = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(50)

  const [formServicio, setFormServicio] = useState({
    producto_servicio_id: '',
    servicio_nombre: '',
    proveedor: '',
    proveedor_whatsapp: '',
    cuenta_correo: '',
    plataforma_compra: 'WhatsApp',
    costo_total: '',
    cupos_totales: 50,
    duracion_meses: 12,
    fecha_compra: new Date().toISOString().split('T')[0],
    fecha_vencimiento: ''
  })

  const [busquedaHistorial, setBusquedaHistorial] = useState('')
  const [compraExpandida, setCompraExpandida]     = useState(null)

  const [desde, setDesde] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })
  const [hasta, setHasta] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
  })

  const [modalEdicion, setModalEdicion] = useState(false)
  const [datosEdicion, setDatosEdicion] = useState(null)

  useEffect(() => {
    if (formServicio.fecha_compra && formServicio.duracion_meses) {
      const f = new Date(formServicio.fecha_compra + 'T12:00:00')
      f.setMonth(f.getMonth() + Number(formServicio.duracion_meses))
      setFormServicio(prev => ({ ...prev, fecha_vencimiento: f.toISOString().split('T')[0] }))
    }
  }, [formServicio.fecha_compra, formServicio.duracion_meses])

  useEffect(() => {
    setPaginaActual(1)
    cargarProductos()
    cargarHistorial()
  }, [desde, hasta])

  async function cargarProductos() {
    const { data } = await supabase.from('productos').select('*').order('nombre')
    setProductosDB((data || []).filter(p => p.tienda !== 'richard'))
  }

  async function cargarHistorial() {
    setCargando(true)
    const { data } = await supabase
      .from('compras')
      .select('*, compra_items(*, productos(*))')
      .gte('fecha_compra', desde + 'T00:00:00')
      .lte('fecha_compra', hasta + 'T23:59:59')
      .order('fecha_compra', { ascending: false })
    setComprasHistorial((data || []).filter(c => c.tienda !== 'richard'))
    setCargando(false)
  }

  const guardarCompraSuscriTech = async () => {
    if (!formServicio.producto_servicio_id && !formServicio.servicio_nombre.trim()) {
      return toast.error('Selecciona el servicio comprado')
    }
    if (!formServicio.proveedor.trim()) return toast.error('Ingresa el nombre del proveedor')
    if (!formServicio.cuenta_correo.trim()) return toast.error('Ingresa el correo de la cuenta/equipo adquirido')

    setCargando(true)
    try {
      const prodVinculado = productosDB.find(p => p.id === formServicio.producto_servicio_id)
      const nombreServ = prodVinculado ? prodVinculado.nombre : formServicio.servicio_nombre
      const costo = Number(formServicio.costo_total) || 0
      const cupos = Number(formServicio.cupos_totales) || 1

      const { data: compraData, error: errC } = await supabase.from('compras').insert({
        tienda: 'miller',
        empresa: formServicio.proveedor.trim(),
        ruc: formServicio.proveedor_whatsapp.trim() || 'S/N',
        tipo_comprobante: 'Cuenta Digital',
        numero_comprobante: formServicio.cuenta_correo.trim(),
        fecha_compra: formServicio.fecha_compra,
        subtotal: costo,
        igv: 0,
        otros_cargos: 0,
        total: costo,
        servicio_nombre: nombreServ,
        producto_servicio_id: prodVinculado ? prodVinculado.id : null,
        proveedor_whatsapp: formServicio.proveedor_whatsapp.trim(),
        cuenta_correo: formServicio.cuenta_correo.trim(),
        plataforma_compra: formServicio.plataforma_compra,
        cupos_totales: cupos,
        cupos_usados: 0,
        duracion_meses: Number(formServicio.duracion_meses),
        fecha_vencimiento: formServicio.fecha_vencimiento
      }).select().single()

      if (errC) throw errC

      await supabase.from('compra_items').insert({
        compra_id: compraData.id,
        producto_id: prodVinculado ? prodVinculado.id : null,
        nombre_original: `${nombreServ} (${formServicio.cuenta_correo.trim()}) - ${cupos} cupos`,
        cantidad: cupos,
        precio_unitario: cupos > 0 ? costo / cupos : costo,
        subtotal: costo
      })

      if (prodVinculado) {
        await supabase.from('productos').update({
          stock: Number(prodVinculado.stock || 0) + cupos
        }).eq('id', prodVinculado.id)
      }

      toast.success(`¡Cuenta Madre registrada! +${cupos} cupos sumados al stock 🚀`)
      const hoy = new Date().toISOString().split('T')[0]
      const venc = new Date(); venc.setMonth(venc.getMonth() + 12)
      setFormServicio({
        producto_servicio_id: '', servicio_nombre: '', proveedor: '', proveedor_whatsapp: '',
        cuenta_correo: '', plataforma_compra: 'WhatsApp', costo_total: '', cupos_totales: 50,
        duracion_meses: 12, fecha_compra: hoy, fecha_vencimiento: venc.toISOString().split('T')[0]
      })
      cargarHistorial()
      cargarProductos()
      setTabActual('historial')
    } catch (e) {
      toast.error('Error al guardar servicio: ' + e.message)
    }
    setCargando(false)
  }

  const eliminarCompra = async (id) => {
    if (!window.confirm('¿ELIMINAR esta cuenta madre? Se restarán los cupos del stock y se borrará del historial.')) return
    setCargando(true)
    try {
      const c = comprasHistorial.find(x => x.id === id)
      if (c && c.compra_items) {
        for (const i of c.compra_items) {
          if (i.producto_id && Number(i.cantidad) > 0) {
            const { data: dbProd } = await supabase.from('productos').select('stock').eq('id', i.producto_id).single()
            if (dbProd) await supabase.from('productos').update({ stock: Math.max(0, dbProd.stock - Number(i.cantidad)) }).eq('id', i.producto_id)
          }
        }
      }
      await supabase.from('compra_items').delete().eq('compra_id', id)
      await supabase.from('compras').delete().eq('id', id)
      toast.success('Cuenta Madre eliminada correctamente.')
      setCompraExpandida(null)
      cargarHistorial()
      cargarProductos()
    } catch (error) {
      toast.error('Error: ' + error.message)
    } finally {
      setCargando(false)
    }
  }

  const abrirEdicion = (compra) => {
    setDatosEdicion({
      id: compra.id,
      servicio_nombre: compra.servicio_nombre || '',
      proveedor: compra.empresa || '',
      proveedor_whatsapp: compra.proveedor_whatsapp || compra.ruc || '',
      cuenta_correo: compra.cuenta_correo || compra.numero_comprobante || '',
      plataforma_compra: compra.plataforma_compra || 'WhatsApp',
      cupos_totales: compra.cupos_totales ?? 50,
      cupos_usados: compra.cupos_usados ?? 0,
      fecha: compra.fecha_compra || '',
      fecha_vencimiento: compra.fecha_vencimiento || '',
      total: compra.total || 0
    })
    setModalEdicion(true)
  }

  const guardarEdicion = async () => {
    if (!datosEdicion.proveedor) return toast.error('Falta proveedor')
    setCargando(true)
    try {
      const costo = Number(datosEdicion.total) || 0
      const payloadUpdate = {
        servicio_nombre: datosEdicion.servicio_nombre,
        empresa: datosEdicion.proveedor,
        ruc: datosEdicion.proveedor_whatsapp || 'S/N',
        proveedor_whatsapp: datosEdicion.proveedor_whatsapp || '',
        cuenta_correo: datosEdicion.cuenta_correo,
        numero_comprobante: datosEdicion.cuenta_correo || 'S/N',
        plataforma_compra: datosEdicion.plataforma_compra,
        cupos_totales: Number(datosEdicion.cupos_totales) || 1,
        cupos_usados: Number(datosEdicion.cupos_usados) || 0,
        subtotal: costo,
        total: costo,
        fecha_compra: datosEdicion.fecha,
        fecha_vencimiento: datosEdicion.fecha_vencimiento || null
      }
      const { error } = await supabase.from('compras').update(payloadUpdate).eq('id', datosEdicion.id)
      if (error) throw error

      toast.success('Cuenta Madre actualizada correctamente ✅')
      setModalEdicion(false)
      cargarHistorial()
    } catch (e) {
      toast.error('Error al editar: ' + e.message)
    } finally {
      setCargando(false)
    }
  }

  const comprasFiltradasHistorial = comprasHistorial.filter(c => {
    if (!busquedaHistorial) return true
    const t = busquedaHistorial.toLowerCase()
    return (c.empresa || '').toLowerCase().includes(t) ||
           (c.servicio_nombre || '').toLowerCase().includes(t) ||
           (c.cuenta_correo || '').toLowerCase().includes(t) ||
           (c.ruc || '').toLowerCase().includes(t) ||
           (c.numero_comprobante || '').toLowerCase().includes(t) ||
           (c.total || '').toString().includes(t)
  })

  const limiteValido = Math.max(1, Number(itemsPorPagina) || 50)
  const comprasPaginadasHistorial = comprasFiltradasHistorial.slice((paginaActual - 1) * limiteValido, paginaActual * limiteValido)

  const exportarTXT = () => {
    let contenido = `HISTORIAL DE COMPRAS / CUENTAS MADRE (SUSCRITECH GLOBAL)\nDesde: ${formatearFecha(desde)} - Hasta: ${formatearFecha(hasta)}\n\n`
    comprasFiltradasHistorial.forEach(c => {
      contenido += `========================================================================\n`
      contenido += `FECHA: ${formatearFecha(c.fecha_compra)} | VENCE: ${formatearFecha(c.fecha_vencimiento)} | SERVICIO: ${c.servicio_nombre || 'N/A'} | PROVEEDOR: ${c.empresa} | CUENTA: ${c.cuenta_correo || c.numero_comprobante} | TOTAL: S/ ${Number(c.total).toFixed(2)}\n`
    })
    const blob = new Blob([contenido], { type: 'text/plain' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `historial_compras_suscritech.txt`
    link.click()
  }

  const exportarCSV = () => {
    let contenido = `Fecha,Servicio,Proveedor,WhatsApp_Proveedor,Cuenta_Correo,Cupos,Vencimiento,Total\n`
    comprasFiltradasHistorial.forEach(c => {
      contenido += `"${formatearFecha(c.fecha_compra)}","${c.servicio_nombre || ''}","${c.empresa}","${c.proveedor_whatsapp || c.ruc}","${c.cuenta_correo || c.numero_comprobante}","${c.cupos_usados || 0}/${c.cupos_totales || 1}","${formatearFecha(c.fecha_vencimiento)}",${Number(c.total).toFixed(2)}\n`
    })
    const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `historial_compras_suscritech.csv`
    link.click()
  }

  const exportarPDF = () => {
    const doc = new jsPDF('landscape')
    doc.text(`Historial de Cuentas Madre / Compras - SuscriTech Global`, 14, 15)
    doc.setFontSize(10)
    doc.text(`Desde: ${formatearFecha(desde)} - Hasta: ${formatearFecha(hasta)}`, 14, 22)

    const tableData = comprasFiltradasHistorial.map(c => [
      formatearFecha(c.fecha_compra),
      c.servicio_nombre || 'Servicio',
      c.empresa,
      c.proveedor_whatsapp || c.ruc,
      c.cuenta_correo || c.numero_comprobante,
      `${c.cupos_usados || 0}/${c.cupos_totales || 1}`,
      formatearFecha(c.fecha_vencimiento),
      `S/ ${Number(c.total).toFixed(2)}`
    ])
    doc.autoTable({
      head: [['Fecha', 'Servicio', 'Proveedor', 'WhatsApp', 'Cuenta Madre', 'Cupos', 'Vence', 'Total']],
      body: tableData, startY: 28, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [124, 58, 237] }
    })
    doc.save(`historial_compras_suscritech.pdf`)
  }

  let gastoTotal = 0
  let cuposTotalesComprados = 0
  const comprasPorDia = {}

  comprasFiltradasHistorial.forEach(c => {
    const dia = formatearFecha(c.fecha_compra)
    if (!comprasPorDia[dia]) comprasPorDia[dia] = 0
    comprasPorDia[dia] += Number(c.total || 0)
    gastoTotal += Number(c.total || 0)
    cuposTotalesComprados += Number(c.cupos_totales || 0)
  })

  const chartDiasData = Object.keys(comprasPorDia)
    .map(k => ({ Fecha: k, Inversión: parseFloat(comprasPorDia[k].toFixed(2)) }))

  const compraActiva = comprasHistorial.find(c => c.id === compraExpandida)
  const colorTema = '#7c3aed'

  return (
    <div>
      <style>{estilosImpresion}</style>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={24} color="#7c3aed" /> Compras & Cuentas Madre<span style={{ color: '#06b6d4' }}>.</span>
        </h1>
        <div style={{ display: 'flex', background: 'var(--fondo)', padding: 4, borderRadius: 8, gap: 4 }}>
          <button onClick={() => setTabActual('registro')} className={tabActual === 'registro' ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 13, padding: '6px 12px', background: tabActual === 'registro' ? colorTema : 'transparent', border: 'none' }}><UploadCloud size={16} /> Registrar Cuenta Madre</button>
          <button onClick={() => setTabActual('historial')} className={tabActual === 'historial' ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 13, padding: '6px 12px', background: tabActual === 'historial' ? colorTema : 'transparent', border: 'none' }}><FileText size={16} /> Historial</button>
          <button onClick={() => setTabActual('analisis')} className={tabActual === 'analisis' ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 13, padding: '6px 12px', background: tabActual === 'analisis' ? colorTema : 'transparent', border: 'none' }}><BarChart3 size={16} /> Análisis</button>
        </div>
      </div>

      {tabActual === 'registro' && (
        <div className="card" style={{ maxWidth: 680, margin: '0 auto', padding: 24, borderTop: '4px solid #7c3aed' }}>
          <h2 style={{ fontFamily: 'var(--fuente-display)', fontSize: 18, fontWeight: 800, color: '#a855f7', marginBottom: 6 }}>
            Registrar Compra de Cuenta / Servicio (Madre)
          </h2>
          <p style={{ fontSize: 12, color: 'var(--texto-suave)', marginBottom: 18 }}>
            Registra aquí las cuentas que adquieres de tus proveedores. Los cupos ingresados se sumarán automáticamente al stock del servicio en SuscriTech Global.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>1. Vincular con Servicio de la Tienda *</label>
              <select
                value={formServicio.producto_servicio_id}
                onChange={e => {
                  const p = productosDB.find(x => x.id === e.target.value)
                  setFormServicio({ ...formServicio, producto_servicio_id: e.target.value, servicio_nombre: p ? p.nombre : formServicio.servicio_nombre })
                }}
                style={{ width: '100%', fontSize: 13 }}>
                <option value="">-- Selecciona el Servicio --</option>
                {productosDB.map(p => <option key={p.id} value={p.id}>{p.nombre} (Stock actual: {p.stock})</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre del Proveedor *</label>
              <input type="text" placeholder="Ej: Proveedor / Paige Donovan" value={formServicio.proveedor} onChange={e => setFormServicio({ ...formServicio, proveedor: e.target.value })} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}><Phone size={12}/> WhatsApp del Proveedor</label>
              <input type="text" placeholder="Ej: 999888777" value={formServicio.proveedor_whatsapp} onChange={e => setFormServicio({ ...formServicio, proveedor_whatsapp: e.target.value })} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}><Mail size={12}/> Correo de la Cuenta / Equipo *</label>
              <input type="email" placeholder="cuenta@gmail.com" value={formServicio.cuenta_correo} onChange={e => setFormServicio({ ...formServicio, cuenta_correo: e.target.value })} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}><Globe size={12}/> Plataforma de Compra</label>
              <select value={formServicio.plataforma_compra} onChange={e => setFormServicio({ ...formServicio, plataforma_compra: e.target.value })}>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Telegram">Telegram</option>
                <option value="Binance / P2P">Binance / P2P</option>
                <option value="Facebook">Facebook</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Costo Total Pagado (S/) *</label>
              <input type="number" step="0.1" placeholder="Ej: 25.00" value={formServicio.costo_total} onChange={e => setFormServicio({ ...formServicio, costo_total: e.target.value })} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', display: 'block', marginBottom: 4 }}><Users size={12}/> Cupos Totales *</label>
              <input type="number" min="1" value={formServicio.cupos_totales} onChange={e => setFormServicio({ ...formServicio, cupos_totales: e.target.value })} style={{ fontWeight: 800, border: '1.5px solid #7c3aed' }} />
            </div>

            <div style={{ gridColumn: '1 / -1', background: 'var(--fondo)', padding: 14, borderRadius: 10, border: '1px solid var(--borde)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Compra</label>
                <input type="date" value={formServicio.fecha_compra} onChange={e => setFormServicio({ ...formServicio, fecha_compra: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Duración (Meses)</label>
                <input type="number" min="1" value={formServicio.duracion_meses} onChange={e => setFormServicio({ ...formServicio, duracion_meses: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#06b6d4', display: 'block', marginBottom: 4 }}>
                  Vence ({formatearFecha(formServicio.fecha_vencimiento)})
                </label>
                <input type="date" value={formServicio.fecha_vencimiento} onChange={e => setFormServicio({ ...formServicio, fecha_vencimiento: e.target.value })} style={{ fontWeight: 700, border: '1.5px solid #06b6d4' }} />
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: 6 }}>
              <button onClick={guardarCompraSuscriTech} disabled={cargando} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13 }}>
                <Save size={16} /> {cargando ? 'Guardando...' : 'Guardar Cuenta Madre y Sumar Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tabActual === 'historial' && (
        <div className="no-print" style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 48%', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '100%', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--texto-suave)' }} />
                <input type="text" placeholder="Buscar servicio, cuenta madre o proveedor..." value={busquedaHistorial} onChange={(e) => { setBusquedaHistorial(e.target.value); setPaginaActual(1) }} style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} />
                <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
                 <button onClick={exportarCSV} className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}><Download size={14}/> CSV</button>
                 <button onClick={exportarTXT} className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}><FileText size={14}/> TXT</button>
                 <button onClick={exportarPDF} className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px', color: '#ef4444' }}><Printer size={14}/> PDF</button>
              </div>
            </div>

            {cargando ? <div className="spinner" /> : comprasFiltradasHistorial.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--texto-suave)' }}>Sin registros en este rango de fechas.</div>
            ) : (
              <>
                {comprasPaginadasHistorial.map(c => (
                  <div
                    key={c.id}
                    onClick={() => setCompraExpandida(c.id)}
                    className="card"
                    style={{
                      padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                      border: compraExpandida === c.id ? `2px solid ${colorTema}` : '1px solid var(--borde)',
                      background: compraExpandida === c.id ? 'rgba(124, 58, 237, 0.12)' : 'var(--blanco)'
                    }}>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: compraExpandida === c.id ? '#06b6d4' : 'var(--texto)' }}>
                        {c.servicio_nombre || 'Servicio'} · {c.empresa}
                      </h3>
                      <p style={{ fontSize: 11.5, color: 'var(--texto-suave)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                        🔑 {c.cuenta_correo || c.numero_comprobante} · 👥 Cupos: {c.cupos_usados || 0}/{c.cupos_totales || 1}
                        <br />
                        📅 Compra: <b>{formatearFecha(c.fecha_compra)}</b> · ⏳ Vence: <b>{formatearFecha(c.fecha_vencimiento)}</b>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>S/ {Number(c.total).toFixed(2)}</p>
                    </div>
                  </div>
                ))}

                <Paginador
                  totalItems={comprasFiltradasHistorial.length}
                  itemsPorPagina={itemsPorPagina}
                  setItemsPorPagina={setItemsPorPagina}
                  paginaActual={paginaActual}
                  setPaginaActual={setPaginaActual}
                  esMiller={true}
                />
              </>
            )}
          </div>

          <div style={{ flex: '1 1 48%', minWidth: 300, position: 'sticky', top: 20 }}>
            {compraActiva ? (
              <div id="zona-impresion" className="card" style={{ padding: 28, border: '1px solid var(--borde)', position: 'relative' }}>
                <div className="no-print" style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                   <button onClick={() => eliminarCompra(compraActiva.id)} className="btn-ghost" title="Eliminar Registro" style={{ padding: 8, color: '#ef4444' }}><Trash2 size={16} /></button>
                   <button onClick={() => abrirEdicion(compraActiva)} className="btn-ghost" title="Editar" style={{ padding: 8, color: '#f59e0b' }}><Edit3 size={16} /></button>
                   <button onClick={() => window.print()} className="btn-primary" style={{ padding: 8 }}><Printer size={16} /></button>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', marginBottom: 16, color: '#06b6d4' }}>
                  Detalle de Cuenta Madre
                </h2>
                <div style={{ marginBottom: 20, fontSize: 13, lineHeight: '1.9', fontVariantNumeric: 'tabular-nums' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>SERVICIO:</b> <span>{compraActiva.servicio_nombre || 'Servicio Digital'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>PROVEEDOR:</b> <span>{compraActiva.empresa}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>WHATSAPP PROVEEDOR:</b> <span>{compraActiva.proveedor_whatsapp || compraActiva.ruc}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>CUENTA / CORREO:</b> <span>{compraActiva.cuenta_correo || compraActiva.numero_comprobante}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>PLATAFORMA:</b> <span>{compraActiva.plataforma_compra || 'WhatsApp'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>CUPOS USADOS:</b> <span>{compraActiva.cupos_usados || 0} de {compraActiva.cupos_totales || 1}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>FECHA COMPRA:</b> <span>{formatearFecha(compraActiva.fecha_compra)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>FECHA VENCIMIENTO:</b> <span style={{ color: '#f87171', fontWeight: 700 }}>{formatearFecha(compraActiva.fecha_vencimiento)}</span></div>
                </div>
                <div style={{ borderTop: '2px solid var(--borde)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
                  <span>COSTO TOTAL:</span><span style={{ color: '#06b6d4' }}>S/ {Number(compraActiva.total).toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div style={{ height: '100%', minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--texto-suave)', border: '2px dashed var(--borde)', borderRadius: 12 }}>
                <Receipt size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                <p>Selecciona una cuenta madre para ver su detalle</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tabActual === 'analisis' && (
        <div className="analisis-container no-print">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: 20, borderTop: '3px solid #ef4444' }}>
              <p style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600 }}>Total Invertido</p>
              <h3 style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#ef4444' }}>S/ {gastoTotal.toFixed(2)}</h3>
            </div>
            <div className="card" style={{ padding: 20, borderTop: '3px solid #06b6d4' }}>
              <p style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600 }}>Cupos Adquiridos</p>
              <h3 style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#06b6d4' }}>{cuposTotalesComprados}</h3>
            </div>
            <div className="card" style={{ padding: 20, borderTop: '3px solid #7c3aed' }}>
              <p style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600 }}>Cuentas Madre Registradas</p>
              <h3 style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#a855f7' }}>{comprasFiltradasHistorial.length}</h3>
            </div>
          </div>

          {chartDiasData.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Inversión por Día (S/)</h3>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDiasData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--borde)" />
                    <XAxis dataKey="Fecha" fontSize={11} stroke="var(--texto-suave)" />
                    <YAxis fontSize={11} stroke="var(--texto-suave)" />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--borde)', background: 'var(--blanco)', color: 'var(--texto)' }} />
                    <Bar dataKey="Inversión" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {modalEdicion && datosEdicion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 24, borderTop: '4px solid #7c3aed' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Editar Cuenta Madre</h2>
              <button onClick={() => setModalEdicion(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-suave)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre del Servicio</label>
                <input type="text" value={datosEdicion.servicio_nombre} onChange={e => setDatosEdicion({ ...datosEdicion, servicio_nombre: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Proveedor</label>
                <input type="text" value={datosEdicion.proveedor} onChange={e => setDatosEdicion({ ...datosEdicion, proveedor: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>WhatsApp Proveedor</label>
                <input type="text" value={datosEdicion.proveedor_whatsapp} onChange={e => setDatosEdicion({ ...datosEdicion, proveedor_whatsapp: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Correo de la Cuenta Madre</label>
                <input type="email" value={datosEdicion.cuenta_correo} onChange={e => setDatosEdicion({ ...datosEdicion, cuenta_correo: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cupos Totales</label>
                <input type="number" value={datosEdicion.cupos_totales} onChange={e => setDatosEdicion({ ...datosEdicion, cupos_totales: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cupos Usados</label>
                <input type="number" value={datosEdicion.cupos_usados} onChange={e => setDatosEdicion({ ...datosEdicion, cupos_usados: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Compra</label>
                <input type="date" value={datosEdicion.fecha} onChange={e => setDatosEdicion({ ...datosEdicion, fecha: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Vencimiento</label>
                <input type="date" value={datosEdicion.fecha_vencimiento} onChange={e => setDatosEdicion({ ...datosEdicion, fecha_vencimiento: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Costo Total (S/)</label>
                <input type="number" step="any" value={datosEdicion.total} onChange={e => setDatosEdicion({ ...datosEdicion, total: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalEdicion(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={cargando} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
