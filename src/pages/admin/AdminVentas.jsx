import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store'
import { ShoppingBag, Calendar, Trash2, Download, Plus, X, Search, Package, FileText, Printer, BarChart3, List, Cpu, User, Mail, Phone, Globe } from 'lucide-react'
import { exportarCSV } from '../../lib/exportar'
import Paginador from '../../components/Paginador'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function AdminVentas() {
  const [tabActual, setTabActual]           = useState('historial')
  const [ventas, setVentas]                 = useState([])
  const [cargando, setCargando]             = useState(true)
  const [modalVenta, setModalVenta]         = useState(false)
  const [productos, setProductos]           = useState([])
  const [cuentasMadre, setCuentasMadre]     = useState([])
  const [busquedaVentas, setBusquedaVentas] = useState('')
  const [guardando, setGuardando]           = useState(false)

  // Paginador (50 por defecto)
  const [paginaActual, setPaginaActual]     = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(50)

  // Estado para registro de suscripción digital en SuscriTech Global
  const [formDigital, setFormDigital] = useState({
    producto_id: '',
    compra_madre_id: '',
    cliente_nombre: '',
    cliente_whatsapp: '',
    cliente_correo: '',
    plataforma_venta: 'WhatsApp',
    precio: '3.00',
    duracion_meses: 3,
    fecha_compra: new Date().toISOString().split('T')[0],
    fecha_vencimiento: ''
  })

  const { perfil } = useAuth()

  const [desde, setDesde] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    setPaginaActual(1)
    cargar()
  }, [desde, hasta])

  // Cálculo automático de Fecha de Vencimiento al cambiar Fecha de Compra o Meses
  useEffect(() => {
    if (formDigital.fecha_compra && formDigital.duracion_meses) {
      const f = new Date(formDigital.fecha_compra + 'T12:00:00')
      f.setMonth(f.getMonth() + Number(formDigital.duracion_meses))
      setFormDigital(prev => ({ ...prev, fecha_vencimiento: f.toISOString().split('T')[0] }))
    }
  }, [formDigital.fecha_compra, formDigital.duracion_meses])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('ventas')
      .select('*, perfiles(nombre), venta_items(*, productos(nombre, imagen_url))')
      .gte('created_at', desde + 'T00:00:00')
      .lte('created_at', hasta + 'T23:59:59')
      .order('created_at', { ascending: false })

    const filtradas = (data || []).filter(v => v.tienda !== 'richard')
    setVentas(filtradas)
    setCargando(false)
  }

  async function cargarProductos() {
    const [{ data }, { data: madres }] = await Promise.all([
      supabase
        .from('productos')
        .select('id, nombre, precio, stock, unidad, imagen_url, tienda')
        .eq('activo', true)
        .order('nombre'),
      supabase
        .from('compras')
        .select('*')
        .order('fecha_vencimiento', { ascending: true })
    ])

    setProductos((data || []).filter(p => p.tienda !== 'richard'))
    setCuentasMadre((madres || []).filter(m => m.tienda !== 'richard'))
  }

  function abrirModal() {
    const hoy = new Date().toISOString().split('T')[0]
    const venc = new Date(); venc.setMonth(venc.getMonth() + 3)
    setFormDigital({
      producto_id: '', compra_madre_id: '', cliente_nombre: '', cliente_whatsapp: '',
      cliente_correo: '', plataforma_venta: 'WhatsApp', precio: '3.00', duracion_meses: 3,
      fecha_compra: hoy, fecha_vencimiento: venc.toISOString().split('T')[0]
    })
    cargarProductos()
    setModalVenta(true)
  }

  const normalizarTexto = (texto) => {
    return texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : ""
  }

  // GUARDAR VENTA DE SUSCRIPCIÓN EN SUSCRITECH GLOBAL
  async function guardarVentaDigital() {
    if (!formDigital.producto_id) return toast.error('Selecciona el servicio vendido')
    if (!formDigital.cliente_nombre.trim()) return toast.error('Ingresa el nombre del cliente')
    if (!formDigital.precio || Number(formDigital.precio) <= 0) return toast.error('Ingresa un precio válido')

    const prodSel = productos.find(p => p.id === formDigital.producto_id)
    if (prodSel && prodSel.stock < 1) return toast.error('Sin cupos disponibles en stock para este servicio')

    setGuardando(true)
    try {
      const precioFinal = parseFloat(formDigital.precio) || 0
      const { data: venta, error: errV } = await supabase
        .from('ventas')
        .insert({
          vendedor_id:    perfil?.id || null,
          tipo:           'fisica',
          tienda:         'miller',
          total:          precioFinal,
          estado:         'completada',
          nombre_cliente: formDigital.cliente_nombre.trim(),
          notas:          `${formDigital.plataforma_venta} | ${formDigital.cliente_correo}`,
          created_at:     formDigital.fecha_compra + 'T' + new Date().toTimeString().split(' ')[0],
        })
        .select()
        .single()
      if (errV) throw errV

      const { error: errI } = await supabase.from('venta_items').insert({
        venta_id:           venta.id,
        producto_id:        prodSel.id,
        nombre_producto:    prodSel.nombre,
        precio_unitario:    precioFinal,
        cantidad:           1,
        subtotal:           precioFinal,
        cliente_nombre:     formDigital.cliente_nombre.trim(),
        cliente_whatsapp:   formDigital.cliente_whatsapp.trim(),
        cliente_correo:     formDigital.cliente_correo.trim(),
        plataforma_venta:   formDigital.plataforma_venta,
        duracion_meses:     Number(formDigital.duracion_meses),
        fecha_vencimiento:  formDigital.fecha_vencimiento,
        compra_madre_id:    formDigital.compra_madre_id || null,
        estado_suscripcion: 'activo'
      })
      if (errI) throw errI

      if (formDigital.compra_madre_id) {
        const madre = cuentasMadre.find(m => m.id === formDigital.compra_madre_id)
        if (madre) {
          await supabase.from('compras').update({ cupos_usados: Number(madre.cupos_usados || 0) + 1 }).eq('id', madre.id)
        }
      }

      toast.success('Suscripción registrada con fecha de vencimiento 🚀')
      setModalVenta(false)
      cargar()
    } catch (e) {
      toast.error('Error: ' + e.message)
    }
    setGuardando(false)
  }

  async function eliminarVenta(itemId, esUltimo) {
    const msg = esUltimo
      ? '¿Eliminar esta suscripción? Se eliminará el registro y se restaurará el cupo en stock.'
      : '¿Eliminar este servicio de la venta? Se restaurará su cupo en stock.'
    if (!confirm(msg)) return
    try {
      const { error } = await supabase.rpc('revertir_item', { item_uuid: itemId })
      if (error) throw error
      toast.success('Suscripción eliminada y cupo restaurado')
      cargar()
    } catch (e) {
      toast.error('Error: ' + e.message)
    }
  }

  const lineas = ventas.flatMap(v =>
    (v.venta_items || []).map(item => ({
      ...item,
      fecha: v.created_at,
      vendedor: v.perfiles?.nombre || 'Admin',
      tipo: v.tipo,
      venta_id: v.id,
      items_count: v.venta_items?.length || 1,
    }))
  )

  const lineasFiltradas = lineas.filter(l => {
    if (!busquedaVentas.trim()) return true
    const t = normalizarTexto(busquedaVentas)
    return normalizarTexto(l.nombre_producto).includes(t) ||
           normalizarTexto(l.cliente_nombre).includes(t) ||
           normalizarTexto(l.cliente_correo).includes(t) ||
           normalizarTexto(l.plataforma_venta).includes(t)
  })

  // --- EXPORTACIONES (TXT, PDF y CSV) ---
  const exportarTXT = () => {
    if (lineasFiltradas.length === 0) return toast.error('No hay ventas para exportar')
    let contenido = `HISTORIAL DE SUSCRIPCIONES - SUSCRITECH GLOBAL\nDesde: ${desde} - Hasta: ${hasta}\n\n`
    contenido += `FECHA       | SERVICIO                  | CLIENTE              | CORREO                    | PLATAFORMA   | VENCE      | SUBTOTAL\n`
    contenido += `-------------------------------------------------------------------------------------------------------------------------------------\n`
    lineasFiltradas.forEach(l => {
      const f = new Date(l.fecha).toLocaleDateString('es-PE').padEnd(11, ' ')
      const s = (l.nombre_producto || '').substring(0, 24).padEnd(25, ' ')
      const c = (l.cliente_nombre || '').substring(0, 19).padEnd(20, ' ')
      const m = (l.cliente_correo || '').substring(0, 24).padEnd(25, ' ')
      const p = (l.plataforma_venta || '').substring(0, 11).padEnd(12, ' ')
      const v = (l.fecha_vencimiento || '').padEnd(10, ' ')
      const sub = Number(l.subtotal).toFixed(2).padStart(8, ' ')
      contenido += `${f} | ${s} | ${c} | ${m} | ${p} | ${v} | ${sub}\n`
    })

    const blob = new Blob([contenido], { type: 'text/plain' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `historial_ventas_suscritech.txt`
    link.click()
  }

  const exportarPDF = () => {
    if (lineasFiltradas.length === 0) return toast.error('No hay ventas para exportar')
    const doc = new jsPDF('landscape')
    doc.text(`Registro de Suscripciones - SuscriTech Global`, 14, 15)
    doc.setFontSize(10)
    doc.text(`Desde: ${desde} - Hasta: ${hasta}`, 14, 22)

    const tableData = lineasFiltradas.map(l => [
      new Date(l.fecha).toLocaleDateString('es-PE'),
      l.nombre_producto,
      l.cliente_nombre || '',
      l.cliente_whatsapp || '',
      l.cliente_correo || '',
      l.plataforma_venta || '',
      `${l.duracion_meses || 1} m`,
      l.fecha_vencimiento || '',
      `S/ ${Number(l.subtotal).toFixed(2)}`
    ])
    doc.autoTable({
      head: [['Fecha', 'Servicio', 'Cliente', 'WhatsApp', 'Correo', 'Plataforma', 'Plan', 'Vence', 'Total']],
      body: tableData, startY: 28, theme: 'grid', styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [124, 58, 237] }
    })

    doc.save(`historial_ventas_suscritech.pdf`)
  }

  function handleExportar() {
    if (lineasFiltradas.length === 0) return toast.error('No hay ventas para exportar')
    exportarCSV('ventas_suscritech', [
      ['Fecha', 'Servicio', 'Cliente', 'WhatsApp', 'Correo', 'Plataforma', 'Meses', 'Vencimiento', 'Subtotal'],
      ...lineasFiltradas.map(l => [
        new Date(l.fecha).toLocaleDateString('es-PE'),
        l.nombre_producto,
        l.cliente_nombre || '',
        l.cliente_whatsapp || '',
        l.cliente_correo || '',
        l.plataforma_venta || '',
        l.duracion_meses || 1,
        l.fecha_vencimiento || '',
        Number(l.subtotal).toFixed(2)
      ])
    ])
    toast.success('Excel exportado')
  }

  // --- LÓGICA DE ANÁLISIS ---
  let ingresoTotal = 0; let productosVendidosStats = 0
  const productosStats = {}; const ventasPorDia = {}

  lineasFiltradas.forEach(l => {
    const dia = new Date(l.fecha).toISOString().split('T')[0]
    if (!ventasPorDia[dia]) ventasPorDia[dia] = 0
    ventasPorDia[dia] += Number(l.subtotal)

    ingresoTotal += Number(l.subtotal)
    productosVendidosStats += Number(l.cantidad)

    if (!productosStats[l.producto_id]) productosStats[l.producto_id] = { nombre: l.nombre_producto, cantidad: 0, ingreso: 0 }
    productosStats[l.producto_id].cantidad += Number(l.cantidad)
    productosStats[l.producto_id].ingreso += Number(l.subtotal)
  })

  const diasTotales = Math.max(1, Math.ceil((new Date(hasta + 'T23:59:59') - new Date(desde + 'T00:00:00')) / 86400000))
  const promedioVentaDiaria = ingresoTotal / diasTotales
  const statsArray = Object.values(productosStats)

  const chartDiasData = Object.keys(ventasPorDia).map(k => ({ Fecha: k, Ingreso: parseFloat(ventasPorDia[k].toFixed(2)) })).sort((a, b) => a.Fecha.localeCompare(b.Fecha))
  const chartData = statsArray.sort((a, b) => b.ingreso - a.ingreso).slice(0, 10).map(p => ({ name: p.nombre.substring(0, 15) + '...', Ingreso: parseFloat(p.ingreso.toFixed(2)), Unidades: p.cantidad }))
  const topVendidos = [...statsArray].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5)
  const menosVendidos = [...statsArray].sort((a, b) => a.cantidad - b.cantidad).slice(0, 5)

  const limiteValido = Math.max(1, Number(itemsPorPagina) || 50)
  const lineasPaginadas = lineasFiltradas.slice((paginaActual - 1) * limiteValido, paginaActual * limiteValido)

  const totalPeriodo = lineasFiltradas.reduce((a, l) => a + Number(l.subtotal), 0)
  const totalProductos = lineasFiltradas.reduce((a, l) => a + l.cantidad, 0)
  const colorTema = '#7c3aed'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={24} color="#7c3aed" /> Ventas & Suscripciones<span style={{ color: '#06b6d4' }}>.</span>
        </h1>
        <div style={{ display: 'flex', background: 'var(--fondo)', padding: 4, borderRadius: 8, gap: 4 }}>
          <button onClick={() => setTabActual('historial')} className={tabActual === 'historial' ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 13, padding: '6px 12px', background: tabActual === 'historial' ? colorTema : 'transparent', border: 'none' }}><List size={16} /> Historial y Registro</button>
          <button onClick={() => setTabActual('analisis')} className={tabActual === 'analisis' ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 13, padding: '6px 12px', background: tabActual === 'analisis' ? colorTema : 'transparent', border: 'none' }}><BarChart3 size={16} /> Análisis</button>
        </div>
      </div>

      {/* -------------------- TAB HISTORIAL Y REGISTRO -------------------- */}
      {tabActual === 'historial' && (
        <>
          <div className="card" style={{ padding: '16px 20px', marginBottom: 20, borderTop: '3px solid #7c3aed' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px', border: '1px solid var(--borde)', padding: '6px 12px', borderRadius: 8 }}>
                <Search size={15} color="var(--texto-suave)" />
                <input
                  type="text"
                  value={busquedaVentas}
                  onChange={e => { setBusquedaVentas(e.target.value); setPaginaActual(1) }}
                  placeholder="Buscar servicio, cliente, correo, plataforma..."
                  style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: 13 }}
                />
              </div>

              <Calendar size={16} color="var(--texto-suave)" style={{ marginLeft: 10 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Desde</label>
                <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 'auto', padding: '6px 10px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Hasta</label>
                <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 'auto', padding: '6px 10px' }} />
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderLeft: '1px solid var(--borde)', paddingLeft: 12 }}>
                 <button onClick={handleExportar} className="btn-ghost" title="Exportar CSV" style={{ fontSize: 11, padding: '6px 8px' }}><Download size={15}/></button>
                 <button onClick={exportarTXT} className="btn-ghost" title="Exportar TXT Detallado" style={{ fontSize: 11, padding: '6px 8px' }}><FileText size={15}/></button>
                 <button onClick={exportarPDF} className="btn-ghost" title="Exportar PDF Detallado" style={{ fontSize: 11, padding: '6px 8px', color: '#ef4444' }}><Printer size={15}/></button>
              </div>

              <div style={{ marginLeft: 'auto', textAlign: 'right', minWidth: '120px' }}>
                <p style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{totalProductos} suscripciones</p>
                <p style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 18, color: '#06b6d4' }}>
                  S/ {totalPeriodo.toFixed(2)}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={abrirModal} className="btn-primary" style={{ gap: 6, width: '100%', maxWidth: 260, justifyContent: 'center', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                <Plus size={15} /> Registrar Suscripción Digital
              </button>
            </div>
          </div>

          {cargando ? <div className="spinner" /> : lineasFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--texto-suave)' }}>
              <ShoppingBag size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p>{busquedaVentas ? 'No se encontraron registros con esa búsqueda' : 'No hay suscripciones en este periodo'}</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lineasPaginadas.map((l, idx) => (
                  <div key={l.id || idx} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '4px solid #7c3aed' }}>

                    {l.productos?.imagen_url
                      ? <img src={l.productos.imagen_url} alt={l.nombre_producto} style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 42, height: 42, borderRadius: 8, background: 'var(--fondo)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Package size={18} color="var(--borde)" />
                        </div>
                    }

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.nombre_producto}
                        </p>
                        {l.plataforma_venta && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd', padding: '2px 8px', borderRadius: 12 }}>
                            {l.plataforma_venta}
                          </span>
                        )}
                        {l.duracion_meses && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: 12 }}>
                            {l.duracion_meses} meses
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 3, lineHeight: 1.4 }}>
                        👤 <b style={{ color: 'var(--texto)' }}>{l.cliente_nombre || 'Cliente'}</b> · 📱 {l.cliente_whatsapp || 'S/N'} · ✉️ {l.cliente_correo || 'S/C'}
                        <br />
                        📅 Compra: {new Date(l.fecha).toLocaleDateString('es-PE')} · ⏳ <b style={{ color: '#f87171' }}>Vence: {l.fecha_vencimiento || 'N/A'}</b>
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 15, color: '#06b6d4' }}>
                        S/ {Number(l.subtotal).toFixed(2)}
                      </p>
                    </div>

                    <button
                      onClick={() => eliminarVenta(l.id, l.items_count === 1)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, color: '#ef4444' }}>
                      <Trash2 size={15} />
                    </button>

                  </div>
                ))}
              </div>

              <Paginador
                totalItems={lineasFiltradas.length}
                itemsPorPagina={itemsPorPagina}
                setItemsPorPagina={setItemsPorPagina}
                paginaActual={paginaActual}
                setPaginaActual={setPaginaActual}
                esMiller={true}
              />
            </>
          )}
        </>
      )}

      {/* -------------------- TAB ANÁLISIS -------------------- */}
      {tabActual === 'analisis' && (
        <div className="analisis-container">
          <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <Calendar size={16} color="var(--texto-suave)" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: 20, borderTop: '3px solid #10b981' }}>
              <p style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600 }}>Total Ingresos</p>
              <h3 style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#10b981' }}>S/ {ingresoTotal.toFixed(2)}</h3>
            </div>
            <div className="card" style={{ padding: 20, borderTop: '3px solid #3b82f6' }}>
              <p style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600 }}>Suscripciones Vendidas</p>
              <h3 style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{productosVendidosStats}</h3>
            </div>
            <div className="card" style={{ padding: 20, borderTop: `3px solid ${colorTema}` }}>
              <p style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600 }}>Servicios Activos</p>
              <h3 style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: colorTema }}>{statsArray.length}</h3>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600 }}>Promedio Venta Diaria</p>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>S/ {promedioVentaDiaria.toFixed(2)}</h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Ingresos por Día (S/)</h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDiasData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--borde)" />
                    <XAxis dataKey="Fecha" fontSize={11} tickMargin={10} stroke="var(--texto-suave)" />
                    <YAxis fontSize={11} stroke="var(--texto-suave)" />
                    <Tooltip cursor={{ fill: 'rgba(148,163,184,0.1)' }} contentStyle={{ borderRadius: 8, border: '1px solid var(--borde)', background: 'var(--blanco)', color: 'var(--texto)' }} />
                    <Bar dataKey="Ingreso" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Top 10 Servicios (Mayores Ingresos)</h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--borde)" />
                    <XAxis type="number" fontSize={11} stroke="var(--texto-suave)" />
                    <YAxis dataKey="name" type="category" width={120} fontSize={10} stroke="var(--texto-suave)" />
                    <Tooltip cursor={{ fill: 'rgba(148,163,184,0.1)' }} contentStyle={{ borderRadius: 8, border: '1px solid var(--borde)', background: 'var(--blanco)', color: 'var(--texto)' }} />
                    <Bar dataKey="Ingreso" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#06b6d4' }}>🔥 Más Vendidos (Suscripciones)</h3>
              {topVendidos.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--borde)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{p.nombre}</span><span style={{ fontSize: 13, fontWeight: 700 }}>{p.cantidad} unid.</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🧊 Menos Vendidos</h3>
              {menosVendidos.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--borde)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{p.nombre}</span><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto-suave)' }}>{p.cantidad} unid.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL SUSCRITECH GLOBAL (VENTA DE SUSCRIPCIONES) -------------------- */}
      {modalVenta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.78)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto', padding: 24, borderTop: '4px solid #7c3aed' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--fuente-display)', fontWeight: 800, fontSize: 18, color: '#a855f7' }}>
                Registrar Venta de Servicio / Suscripción
              </h2>
              <button onClick={() => setModalVenta(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--texto-suave)" /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--texto)' }}>1. Servicio contratado *</label>
                <select
                  value={formDigital.producto_id}
                  onChange={e => {
                    const prod = productos.find(x => x.id === e.target.value)
                    setFormDigital({ ...formDigital, producto_id: e.target.value, precio: prod ? prod.precio : formDigital.precio })
                  }}
                  style={{ width: '100%', fontSize: 13 }}>
                  <option value="">-- Selecciona Servicio (Canva, Google, HBO...) --</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} (Stock / Cupos: {p.stock})</option>
                  ))}
                </select>
              </div>

              {cuentasMadre.length > 0 && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--texto-suave)' }}>
                    Cuenta Madre / Equipo de origen (de Compras)
                  </label>
                  <select value={formDigital.compra_madre_id} onChange={e => setFormDigital({ ...formDigital, compra_madre_id: e.target.value })} style={{ width: '100%', fontSize: 12 }}>
                    <option value="">-- Automático / Sin cuenta específica --</option>
                    {cuentasMadre.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.servicio_nombre || m.empresa} · {m.cuenta_correo} (Cupos: {m.cupos_usados || 0}/{m.cupos_totales || 1})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--texto)', display: 'block', marginBottom: 4 }}><User size={12}/> Nombre del Cliente *</label>
                  <input type="text" placeholder="Ej: Juan Pérez" value={formDigital.cliente_nombre} onChange={e => setFormDigital({ ...formDigital, cliente_nombre: e.target.value })} style={{ fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--texto)', display: 'block', marginBottom: 4 }}><Phone size={12}/> WhatsApp del Cliente *</label>
                  <input type="text" placeholder="Ej: 924545856" value={formDigital.cliente_whatsapp} onChange={e => setFormDigital({ ...formDigital, cliente_whatsapp: e.target.value })} style={{ fontSize: 13 }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--texto)', display: 'block', marginBottom: 4 }}><Mail size={12}/> Correo del Cliente (donde se activó el servicio) *</label>
                <input type="email" placeholder="cliente@gmail.com" value={formDigital.cliente_correo} onChange={e => setFormDigital({ ...formDigital, cliente_correo: e.target.value })} style={{ fontSize: 13 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--texto)', display: 'block', marginBottom: 4 }}><Globe size={12}/> Plataforma de Venta</label>
                  <select value={formDigital.plataforma_venta} onChange={e => setFormDigital({ ...formDigital, plataforma_venta: e.target.value })} style={{ fontSize: 13 }}>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Marketplace">Facebook Marketplace</option>
                    <option value="Mercado Libre">Mercado Libre</option>
                    <option value="Página Web">Página Web</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--texto)', display: 'block', marginBottom: 4 }}>Precio Cobrado (S/) *</label>
                  <input type="number" step="0.1" value={formDigital.precio} onChange={e => setFormDigital({ ...formDigital, precio: e.target.value })} style={{ fontSize: 14, fontWeight: 800, color: '#38bdf8' }} />
                </div>
              </div>

              {/* Recuadro de Planes Rápidos */}
              <div style={{ background: 'var(--fondo)', padding: 14, borderRadius: 10, border: '1px solid var(--borde)' }}>
                <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 8, color: 'var(--texto)' }}>
                  ⚡ Planes Rápidos (Calcula el vencimiento automático):
                </label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {[
                    { m: 1, p: '2.00', label: '1 Mes' },
                    { m: 3, p: '3.00', label: '3 Meses (S/3)' },
                    { m: 6, p: '5.00', label: '6 Meses (S/5)' },
                    { m: 12, p: '8.00', label: '12 Meses (S/8)' }
                  ].map(plan => {
                    const seleccionado = Number(formDigital.duracion_meses) === plan.m
                    return (
                      <button
                        key={plan.m} type="button"
                        onClick={() => setFormDigital({ ...formDigital, duracion_meses: plan.m, precio: plan.p })}
                        style={{
                          padding: '7px 12px', fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: 'pointer', transition: '0.15s',
                          border: seleccionado ? '2px solid #06b6d4' : '1px solid var(--borde)',
                          background: seleccionado ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(6, 182, 212, 0.25))' : 'var(--blanco)',
                          color: seleccionado ? '#38bdf8' : 'var(--texto)'
                        }}>
                        {plan.label}
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--texto-suave)', display: 'block', marginBottom: 4 }}>Fecha Inicio</label>
                    <input type="date" value={formDigital.fecha_compra} onChange={e => setFormDigital({ ...formDigital, fecha_compra: e.target.value })} style={{ fontSize: 12 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--texto-suave)', display: 'block', marginBottom: 4 }}>Meses</label>
                    <input type="number" min="1" value={formDigital.duracion_meses} onChange={e => setFormDigital({ ...formDigital, duracion_meses: e.target.value })} style={{ fontSize: 12 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#06b6d4', display: 'block', marginBottom: 4 }}>Vencimiento</label>
                    <input type="date" value={formDigital.fecha_vencimiento} onChange={e => setFormDigital({ ...formDigital, fecha_vencimiento: e.target.value })} style={{ fontSize: 12, fontWeight: 700, border: '1.5px solid #06b6d4' }} />
                  </div>
                </div>
              </div>

              <button onClick={guardarVentaDigital} disabled={guardando} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none', marginTop: 4 }}>
                {guardando ? 'Registrando...' : 'Registrar Suscripción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
