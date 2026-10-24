import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store'
import {
  Search, Plus, Minus, Trash2, Printer, CheckCircle, Package,
  Cpu, Edit3, X, Save, User, Mail, Phone, Calendar, Link2, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function VendedorVenta() {
  const [productos, setProductos]             = useState([])
  const [usuariosDB, setUsuariosDB]           = useState([])
  const [busqueda, setBusqueda]               = useState('')
  const [carrito, setCarrito]                 = useState([])

  // Datos del cliente en el registro de venta
  const [usuarioVinculadoId, setUsuarioVinculadoId] = useState('')
  const [nombreCliente, setNombreCliente]     = useState('')
  const [correoCliente, setCorreoCliente]     = useState('')
  const [whatsappCliente, setWhatsappCliente] = useState('')
  const [notas, setNotas]                     = useState('')
  const [montoPagado, setMontoPagado]         = useState('')
  const [procesando, setProcesando]           = useState(false)
  const [ventaCompletada, setVentaCompletada] = useState(null)

  // Historial de Hoy + Buscador de Ventas (requiere elegir servicio primero)
  const [ventasHoy, setVentasHoy]                     = useState([])
  const [servicioBusquedaId, setServicioBusquedaId]   = useState('')
  const [textoBusquedaVenta, setTextoBusquedaVenta]   = useState('')
  const [resultadosBusqueda, setResultadosBusqueda]   = useState([])
  const [buscandoVentas, setBuscandoVentas]           = useState(false)

  // Modal de Edición de Venta por si el vendedor se confunde al registrar
  const [ventaEditando, setVentaEditando] = useState(null)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  const { perfil } = useAuth()
  const boletaRef = useRef()

  useEffect(() => {
    cargarDatosIniciales()
    cargarVentasDeHoy()
  }, [])

  async function cargarDatosIniciales() {
    const [{ data: prods }, { data: perfs }] = await Promise.all([
      supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .eq('activo', true)
        .gt('stock', 0)
        .order('nombre'),
      supabase
        .from('perfiles')
        .select('id, nombre, email, telefono')
        .order('nombre')
    ])
    setProductos((prods || []).filter(p => p.tienda !== 'richard'))
    setUsuariosDB(perfs || [])
  }

  // Carga ÚNICAMENTE las ventas realizadas el día de hoy
  async function cargarVentasDeHoy() {
    const hoyInicio = new Date()
    hoyInicio.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('venta_items')
      .select('*, ventas!inner(id, created_at, total, notas, nombre_cliente, telefono_cliente, tienda)')
      .gte('ventas.created_at', hoyInicio.toISOString())
      .order('created_at', { ascending: false })

    const filtradas = (data || []).filter(item => item.ventas?.tienda !== 'richard')
    setVentasHoy(filtradas)
  }

  // Buscador de ventas: exige seleccionar primero el servicio y luego filtra por correo, nombre o teléfono
  useEffect(() => {
    if (!servicioBusquedaId) {
      setResultadosBusqueda([])
      return
    }
    buscarVentasPorServicio()
  }, [servicioBusquedaId, textoBusquedaVenta])

  async function buscarVentasPorServicio() {
    if (!servicioBusquedaId) return
    setBuscandoVentas(true)
    const { data } = await supabase
      .from('venta_items')
      .select('*, ventas(id, created_at, total, notas, nombre_cliente, telefono_cliente, tienda)')
      .eq('producto_id', servicioBusquedaId)
      .order('created_at', { ascending: false })
      .limit(100)

    const termino = textoBusquedaVenta.trim().toLowerCase()
    const filtrados = (data || []).filter(item => {
      if (!termino) return true
      return (
        (item.cliente_correo || '').toLowerCase().includes(termino) ||
        (item.cliente_nombre || item.ventas?.nombre_cliente || '').toLowerCase().includes(termino) ||
        (item.cliente_whatsapp || item.ventas?.telefono_cliente || '').toLowerCase().includes(termino)
      )
    })
    setResultadosBusqueda(filtrados)
    setBuscandoVentas(false)
  }

  // Obtiene los planes configurados de un producto ordenados de menor a mayor precio
  function obtenerPlanesProducto(p) {
    if (Array.isArray(p.planes) && p.planes.length > 0) {
      return [...p.planes]
        .map(pl => ({
          duracion: pl.duracion || (pl.cantidad ? `${pl.cantidad} ${pl.unidad}` : pl.unidad) || p.unidad || '1 mes',
          precio: Number(pl.precio ?? p.precio ?? 0)
        }))
        .filter(pl => !isNaN(pl.precio) && pl.precio > 0)
        .sort((a, b) => a.precio - b.precio)
    }
    return [{
      duracion: p.unidad || '1 mes',
      precio: Number(p.precio_oferta || p.precio || 0)
    }]
  }

  function detectarMeses(texto = '') {
    const matchMeses = String(texto).match(/(\d+)\s*mes/i)
    if (matchMeses) return Number(matchMeses[1])
    if (/1\s*a[ñn]o|12\s*m|anual/i.test(texto)) return 12
    if (/6\s*m/i.test(texto)) return 6
    if (/3\s*m/i.test(texto)) return 3
    const numSolo = parseInt(texto, 10)
    if (!isNaN(numSolo) && numSolo > 0) return numSolo
    return 1
  }

  const productosFiltrados = busqueda.trim().length > 0
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.codigo_barras && p.codigo_barras.includes(busqueda))
      )
    : productos

  // Agrega un servicio al carrito con el plan elegido
  function agregarAlCarrito(p, planElegido = null) {
    if (p.stock < 1) return toast.error('Sin stock disponible')
    const planes = obtenerPlanesProducto(p)
    const plan = planElegido || planes[0]

    setCarrito(prev => [
      ...prev,
      {
        cartId: Date.now() + Math.random(),
        id: p.id,
        nombreBase: p.nombre,
        nombre: planes.length > 1 ? `${p.nombre} (${plan.duracion})` : p.nombre,
        planDuracion: plan.duracion,
        planesDisponibles: planes,
        precio: String(plan.precio),
        cantidad: 1,
        stock: p.stock
      }
    ])
  }

  function cambiarPlanItemCarrito(cartId, nuevaDuracion) {
    setCarrito(prev => prev.map(item => {
      if (item.cartId !== cartId) return item
      const planObj = item.planesDisponibles.find(pl => pl.duracion === nuevaDuracion)
      const nuevoPrecio = planObj ? String(planObj.precio) : item.precio
      return {
        ...item,
        planDuracion: nuevaDuracion,
        nombre: item.planesDisponibles.length > 1 ? `${item.nombreBase} (${nuevaDuracion})` : item.nombreBase,
        precio: nuevoPrecio
      }
    }))
  }

  function cambiarPrecioItemCarrito(cartId, nuevoPrecio) {
    setCarrito(prev => prev.map(item =>
      item.cartId === cartId ? { ...item, precio: nuevoPrecio } : item
    ))
  }

  function cambiarCantidad(cartId, cantidad) {
    if (cantidad < 1) return
    setCarrito(prev => prev.map(i => {
      if (i.cartId !== cartId) return i
      if (cantidad > i.stock) {
        toast.error('Stock insuficiente')
        return i
      }
      return { ...i, cantidad }
    }))
  }

  function quitar(cartId) {
    setCarrito(prev => prev.filter(i => i.cartId !== cartId))
  }

  const total  = carrito.reduce((a, i) => a + (parseFloat(i.precio) || 0) * i.cantidad, 0)
  const pagado = parseFloat(montoPagado) || 0
  const vuelto = pagado - total

  async function procesarVenta() {
    if (carrito.length === 0) return toast.error('Agrega al menos un servicio al carrito')
    if (montoPagado !== '' && pagado < total) return toast.error(`Monto insuficiente. Faltan S/ ${(total - pagado).toFixed(2)}`)
    setProcesando(true)
    try {
      const { data: venta, error: errVenta } = await supabase
        .from('ventas')
        .insert({
          vendedor_id: perfil?.id || null,
          tipo: 'fisica',
          tienda: 'miller',
          total,
          estado: 'completada',
          nombre_cliente: nombreCliente.trim() || 'Cliente general',
          telefono_cliente: whatsappCliente.trim() || null,
          notas: notas.trim() || (correoCliente.trim() ? `Correo: ${correoCliente.trim()}` : null),
        })
        .select()
        .single()
      if (errVenta) throw errVenta

      const items = carrito.map(i => {
        const precioNum = parseFloat(i.precio) || 0
        const meses = detectarMeses(i.planDuracion)
        const venc = new Date()
        venc.setMonth(venc.getMonth() + meses)
        return {
          venta_id: venta.id,
          producto_id: i.id,
          nombre_producto: i.nombre,
          precio_unitario: precioNum,
          cantidad: i.cantidad,
          subtotal: precioNum * i.cantidad,
          cliente_usuario_id: usuarioVinculadoId || null,
          cliente_nombre: nombreCliente.trim() || 'Cliente general',
          cliente_whatsapp: whatsappCliente.trim() || '',
          cliente_correo: correoCliente.trim() || '',
          plataforma_venta: 'Punto de Venta',
          duracion_meses: meses,
          fecha_vencimiento: venc.toISOString().split('T')[0],
          estado_suscripcion: 'activo'
        }
      })
      const { error: errItems } = await supabase.from('venta_items').insert(items)
      if (errItems) throw errItems

      setVentaCompletada({
        ...venta,
        items,
        nombre_cliente: nombreCliente.trim() || 'Cliente general',
        correo_cliente: correoCliente.trim() || null,
        monto_pagado: pagado > 0 ? pagado : null,
        vuelto: pagado > 0 ? vuelto : null,
      })

      setCarrito([])
      setUsuarioVinculadoId('')
      setNombreCliente('')
      setCorreoCliente('')
      setWhatsappCliente('')
      setNotas('')
      setMontoPagado('')
      cargarDatosIniciales()
      cargarVentasDeHoy()
      if (servicioBusquedaId) buscarVentasPorServicio()
      toast.success('¡Suscripción registrada!')
    } catch (e) {
      toast.error('Error: ' + e.message)
    }
    setProcesando(false)
  }

  // Abrir modal para editar una venta registrada
  function abrirModalEditarVenta(item) {
    setVentaEditando({
      id: item.id,
      venta_id: item.venta_id,
      producto_id: item.producto_id || '',
      nombre_producto: item.nombre_producto || '',
      cliente_usuario_id: item.cliente_usuario_id || '',
      cliente_nombre: item.cliente_nombre || item.ventas?.nombre_cliente || '',
      cliente_correo: item.cliente_correo || '',
      cliente_whatsapp: item.cliente_whatsapp || item.ventas?.telefono_cliente || '',
      duracion_meses: item.duracion_meses || 1,
      fecha_vencimiento: item.fecha_vencimiento || new Date().toISOString().split('T')[0],
      precio_unitario: item.precio_unitario ?? item.subtotal ?? 0,
      cantidad: item.cantidad || 1,
      notas: item.ventas?.notas || ''
    })
  }

  // Guardar corrección de la venta editada
  async function guardarEdicionVenta(e) {
    e.preventDefault()
    if (!ventaEditando) return
    setGuardandoEdicion(true)
    try {
      const nuevoPrecio = parseFloat(ventaEditando.precio_unitario) || 0
      const nuevoSubtotal = nuevoPrecio * Number(ventaEditando.cantidad || 1)

      const { error: errItem } = await supabase
        .from('venta_items')
        .update({
          nombre_producto: ventaEditando.nombre_producto.trim(),
          cliente_usuario_id: ventaEditando.cliente_usuario_id || null,
          cliente_nombre: ventaEditando.cliente_nombre.trim(),
          cliente_correo: ventaEditando.cliente_correo.trim(),
          cliente_whatsapp: ventaEditando.cliente_whatsapp.trim(),
          duracion_meses: Number(ventaEditando.duracion_meses) || 1,
          fecha_vencimiento: ventaEditando.fecha_vencimiento,
          precio_unitario: nuevoPrecio,
          subtotal: nuevoSubtotal
        })
        .eq('id', ventaEditando.id)

      if (errItem) throw errItem

      if (ventaEditando.venta_id) {
        await supabase
          .from('ventas')
          .update({
            nombre_cliente: ventaEditando.cliente_nombre.trim(),
            telefono_cliente: ventaEditando.cliente_whatsapp.trim() || null,
            notas: ventaEditando.notas.trim() || null,
            total: nuevoSubtotal
          })
          .eq('id', ventaEditando.venta_id)
      }

      toast.success('¡Venta actualizada correctamente! ✅')
      setVentaEditando(null)
      cargarVentasDeHoy()
      if (servicioBusquedaId) buscarVentasPorServicio()
    } catch (err) {
      toast.error('Error al actualizar: ' + err.message)
    }
    setGuardandoEdicion(false)
  }

  function imprimirBoleta() {
    const contenido = boletaRef.current.innerHTML
    const ventana = window.open('', '_blank')
    ventana.document.write(`
      <html><head><title>Comprobante - SuscriTech Global</title>
      <style>
        body { font-family: monospace; font-size: 13px; padding: 20px; max-width: 320px; margin: 0 auto; }
        .sep { border-top: 1px dashed #000; margin: 8px 0; }
        .centro { text-align: center; }
        .fila { display: flex; justify-content: space-between; margin: 3px 0; }
        h2 { font-size: 16px; margin: 4px 0; }
        h3 { font-size: 13px; margin: 2px 0; font-weight: 400; }
      </style></head>
      <body>${contenido}</body></html>
    `)
    ventana.document.close()
    ventana.print()
  }

  const listaParaMostrar = servicioBusquedaId ? resultadosBusqueda : ventasHoy

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* SECCIÓN SUPERIOR: CATÁLOGO Y CARRITO DE VENTA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, alignItems: 'start' }}>

        {/* Columna Izquierda: Catálogo de Servicios con Selección de Plan */}
        <div>
          <h2 style={{ fontFamily: 'var(--fuente-display)', fontSize: 20, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={20} color="#7c3aed" /> Servicios Digitales<span style={{ color: '#06b6d4' }}>.</span>
          </h2>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-suave)' }} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar servicio por nombre o código..."
              style={{ paddingLeft: 32 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 12, maxHeight: 540, overflowY: 'auto' }}>
            {productosFiltrados.map(p => {
              const planes = obtenerPlanesProducto(p)
              return (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--blanco)',
                    border: '1px solid var(--borde)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.15s'
                  }}>
                  <div
                    onClick={() => agregarAlCarrito(p, planes[0])}
                    style={{ cursor: 'pointer', position: 'relative' }}>
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '1', background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={32} color="#06b6d4" />
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{p.nombre}</p>
                    <p style={{ fontSize: 11, color: 'var(--texto-suave)' }}>Elegir plan a vender:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {planes.map((pl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => agregarAlCarrito(p, pl)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 8px',
                            borderRadius: 8,
                            border: '1px solid rgba(6, 182, 212, 0.35)',
                            background: 'rgba(6, 182, 212, 0.1)',
                            color: 'var(--texto)',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}>
                          <span>⚡ {pl.duracion}</span>
                          <strong style={{ color: '#06b6d4' }}>S/ {Number(pl.precio).toFixed(2)}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Columna Derecha: Carrito Digital con Plan y Precio Editable + Datos del Cliente */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ventaCompletada ? (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <CheckCircle size={40} color="#10b981" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontWeight: 700, fontSize: 16, color: '#10b981' }}>¡Suscripción completada!</p>
              </div>

              <div ref={boletaRef} style={{ fontFamily: 'monospace', fontSize: 12, border: '1px dashed var(--borde)', borderRadius: 8, padding: 14, background: 'var(--fondo)' }}>
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <h2 style={{ fontFamily: 'var(--fuente-display)', fontSize: 14, margin: '0 0 2px' }}>SUSCRITECH GLOBAL</h2>
                  <h3>COMPROBANTE DIGITAL</h3>
                  <p style={{ margin: '2px 0', fontSize: 11 }}>WhatsApp: 924 545 856</p>
                  <p style={{ margin: '4px 0', fontSize: 11 }}>{new Date(ventaCompletada.created_at).toLocaleString('es-PE')}</p>
                </div>
                <div style={{ borderTop: '1px dashed var(--borde)', margin: '8px 0' }} />
                <p style={{ margin: '2px 0' }}>Cliente: {ventaCompletada.nombre_cliente}</p>
                {ventaCompletada.correo_cliente && <p style={{ margin: '2px 0' }}>Correo: {ventaCompletada.correo_cliente}</p>}
                <p style={{ margin: '2px 0' }}>Atendido por: {perfil?.nombre || 'Asesor'}</p>
                <div style={{ borderTop: '1px dashed var(--borde)', margin: '8px 0' }} />
                {ventaCompletada.items.map((i, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                    <span style={{ flex: 1, marginRight: 8 }}>{i.nombre_producto} x{i.cantidad}</span>
                    <span>S/ {Number(i.subtotal).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px dashed var(--borde)', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
                  <span>TOTAL:</span>
                  <span>S/ {Number(ventaCompletada.total).toFixed(2)}</span>
                </div>
                {ventaCompletada.monto_pagado > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                      <span>PAGÓ:</span>
                      <span>S/ {Number(ventaCompletada.monto_pagado).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#10b981' }}>
                      <span>VUELTO:</span>
                      <span>S/ {Number(ventaCompletada.vuelto).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div style={{ borderTop: '1px dashed var(--borde)', margin: '8px 0' }} />
                <p style={{ textAlign: 'center', fontSize: 11 }}>¡Gracias por confiar en SuscriTech Global!</p>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={imprimirBoleta} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}>
                  <Printer size={14} /> Imprimir
                </button>
                <button onClick={() => setVentaCompletada(null)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 13, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                  Nueva venta
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Carrito Digital */}
              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Carrito Digital</h3>

                {carrito.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--texto-suave)', textAlign: 'center', padding: '18px 0' }}>
                    Selecciona un plan en el catálogo para agregarlo
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
                    {carrito.map(item => (
                      <div key={item.cartId} style={{ padding: '10px', borderRadius: 10, background: 'var(--fondo)', border: '1px solid var(--borde)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 700 }}>{item.nombreBase}</p>
                          <button onClick={() => quitar(item.cartId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}>
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: 8, alignItems: 'center' }}>
                          {/* Selector de Plan */}
                          <select
                            value={item.planDuracion}
                            onChange={e => cambiarPlanItemCarrito(item.cartId, e.target.value)}
                            style={{ fontSize: 12, padding: '6px 8px' }}>
                            {item.planesDisponibles.map((pl, idx) => (
                              <option key={idx} value={pl.duracion}>
                                {pl.duracion} (S/ {Number(pl.precio).toFixed(2)})
                              </option>
                            ))}
                          </select>

                          {/* Precio Editable */}
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#06b6d4', fontWeight: 700 }}>S/</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.precio}
                              onChange={e => cambiarPrecioItemCarrito(item.cartId, e.target.value)}
                              style={{ paddingLeft: 24, fontSize: 12, fontWeight: 700, color: '#06b6d4' }}
                              title="Cambiar precio"
                            />
                          </div>

                          {/* Cantidad */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button onClick={() => cambiarCantidad(item.cartId, item.cantidad - 1)}
                              style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--blanco)', border: '1px solid var(--borde)', color: 'var(--texto)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Minus size={11} />
                            </button>
                            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{item.cantidad}</span>
                            <button onClick={() => cambiarCantidad(item.cartId, item.cantidad + 1)}
                              style={{ width: 24, height: 24, borderRadius: 6, background: '#7c3aed', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                              <Plus size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {carrito.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
                    <span style={{ fontFamily: 'var(--fuente-display)', fontSize: 22, fontWeight: 800, color: '#06b6d4' }}>
                      S/ {total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Datos del Cliente y Vinculación Opcional */}
              <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: '#a855f7' }}>
                    <Link2 size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Vincular a usuario registrado (opcional)
                  </label>
                  <select
                    value={usuarioVinculadoId}
                    onChange={e => {
                      const uid = e.target.value
                      setUsuarioVinculadoId(uid)
                      const u = usuariosDB.find(x => x.id === uid)
                      if (u) {
                        if (!nombreCliente) setNombreCliente(u.nombre || '')
                        if (!correoCliente) setCorreoCliente(u.email || '')
                        if (!whatsappCliente) setWhatsappCliente(u.telefono || '')
                      }
                    }}
                    style={{ fontSize: 12 }}>
                    <option value="">-- Cliente sin usuario web / No vincular --</option>
                    {usuariosDB.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre || 'Usuario'} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, display: 'block' }}>Nombre del cliente</label>
                  <input value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} placeholder="Ej: Juan Pérez" />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, display: 'block', color: '#06b6d4' }}>Correo de activación (opcional)</label>
                  <input type="email" value={correoCliente} onChange={e => setCorreoCliente(e.target.value)} placeholder="cliente@gmail.com" />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, display: 'block' }}>WhatsApp del cliente (opcional)</label>
                  <input type="tel" value={whatsappCliente} onChange={e => setWhatsappCliente(e.target.value)} placeholder="999888777" />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, display: 'block' }}>Con cuánto paga (opcional)</label>
                  <input
                    type="number" min="0" step="0.10"
                    value={montoPagado}
                    onChange={e => setMontoPagado(e.target.value)}
                    placeholder={`Ej: ${Math.ceil(total || 3)}.00`}
                  />
                </div>

                {montoPagado !== '' && (
                  <div style={{ borderRadius: 10, padding: '10px 14px', background: vuelto >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: vuelto >= 0 ? '#10b981' : '#ef4444' }}>
                      {vuelto >= 0 ? '💵 Vuelto:' : '⚠ Falta:'}
                    </span>
                    <span style={{ fontFamily: 'var(--fuente-display)', fontSize: 18, fontWeight: 800, color: vuelto >= 0 ? '#10b981' : '#ef4444' }}>
                      S/ {Math.abs(vuelto).toFixed(2)}
                    </span>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, display: 'block' }}>Notas (opcional)</label>
                  <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas opcionales" />
                </div>

                <button
                  onClick={procesarVenta}
                  className="btn-primary"
                  disabled={procesando || carrito.length === 0}
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, borderRadius: 10, opacity: procesando || carrito.length === 0 ? 0.6 : 1, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                  {procesando ? 'Procesando...' : `Cobrar S/ ${total.toFixed(2)}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SECCIÓN INFERIOR: VENTAS DE HOY Y BUSCADOR DE VENTAS POR SERVICIO CON EDICIÓN */}
      <div className="card" style={{ padding: 20, borderTop: '3px solid #7c3aed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#06b6d4" />
              {servicioBusquedaId ? 'Resultados de Búsqueda de Ventas' : `Ventas Registradas Hoy (${ventasHoy.length})`}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
              Por defecto se muestran solo las ventas de hoy. Para buscar una venta anterior y editarla, elige primero el servicio.
            </p>
          </div>
        </div>

        {/* Buscador paso a paso: 1. Elegir servicio -> 2. Buscar por correo, nombre o teléfono */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16, padding: 12, borderRadius: 10, background: 'var(--fondo)', border: '1px solid var(--borde)' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', display: 'block', marginBottom: 4 }}>
              1. Seleccionar Servicio para buscar ventas anteriores
            </label>
            <select
              value={servicioBusquedaId}
              onChange={e => {
                setServicioBusquedaId(e.target.value)
                if (!e.target.value) setTextoBusquedaVenta('')
              }}
              style={{ fontSize: 13 }}>
              <option value="">-- Ver solo ventas de HOY --</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: servicioBusquedaId ? '#f8fafc' : 'var(--texto-suave)', display: 'block', marginBottom: 4 }}>
              2. Buscar por correo, nombre o WhatsApp
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-suave)' }} />
              <input
                disabled={!servicioBusquedaId}
                value={textoBusquedaVenta}
                onChange={e => setTextoBusquedaVenta(e.target.value)}
                placeholder={servicioBusquedaId ? 'Escribe correo, nombre o teléfono...' : 'Primero elige un servicio a la izquierda'}
                style={{ paddingLeft: 32, fontSize: 13, opacity: servicioBusquedaId ? 1 : 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Lista de ventas con botón de editar */}
        {buscandoVentas ? (
          <div className="spinner" />
        ) : listaParaMostrar.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--texto-suave)' }}>
            {servicioBusquedaId
              ? 'No se encontraron ventas para ese servicio con esos datos.'
              : 'Aún no se han registrado ventas el día de hoy.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {listaParaMostrar.map(item => (
              <div
                key={item.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--fondo)',
                  border: '1px solid var(--borde)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14, color: '#06b6d4' }}>{item.nombre_producto}</strong>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd', fontWeight: 600 }}>
                      {item.duracion_meses || 1} mes(es)
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--texto)', marginTop: 4 }}>
                    👤 <b>{item.cliente_nombre || item.ventas?.nombre_cliente || 'Cliente'}</b>
                    {' · '}✉️ {item.cliente_correo || 'Sin correo'}
                    {' · '}📱 {item.cliente_whatsapp || item.ventas?.telefono_cliente || 'Sin teléfono'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 2 }}>
                    📅 Registrado: <b>{item.ventas?.created_at ? new Date(item.ventas.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Hoy'}</b>
{' · '}⏳ Vence: <b>{item.fecha_vencimiento ? item.fecha_vencimiento.split('-').reverse().join('/') : 'N/A'}</b>
                    {item.ventas?.notas ? ` · 📝 ${item.ventas.notas}` : ''}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--fuente-display)', fontSize: 16, fontWeight: 800, color: '#10b981' }}>
                    S/ {Number(item.subtotal).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => abrirModalEditarVenta(item)}
                    className="btn-ghost"
                    style={{ padding: '7px 12px', fontSize: 12, color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.4)' }}>
                    <Edit3 size={14} /> Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL PARA EDITAR UNA VENTA REGISTRADA */}
      {ventaEditando && (
        <div
          onClick={() => setVentaEditando(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div
            onClick={e => e.stopPropagation()}
            className="card"
            style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: 24, borderTop: '4px solid #06b6d4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 18, fontWeight: 800, color: '#06b6d4' }}>
                ✏️ Corregir / Editar Venta
              </h3>
              <button onClick={() => setVentaEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-suave)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarEdicionVenta} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Servicio / Plan vendido</label>
                <input
                  value={ventaEditando.nombre_producto}
                  onChange={e => setVentaEditando({ ...ventaEditando, nombre_producto: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: '#a855f7' }}>
                  Usuario registrado vinculado (Opcional)
                </label>
                <select
                  value={ventaEditando.cliente_usuario_id}
                  onChange={e => setVentaEditando({ ...ventaEditando, cliente_usuario_id: e.target.value })}
                  style={{ fontSize: 12 }}>
                  <option value="">-- Sin vincular --</option>
                  {usuariosDB.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre || 'Usuario'} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}><User size={12}/> Nombre del cliente</label>
                  <input
                    value={ventaEditando.cliente_nombre}
                    onChange={e => setVentaEditando({ ...ventaEditando, cliente_nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}><Phone size={12}/> WhatsApp</label>
                  <input
                    value={ventaEditando.cliente_whatsapp}
                    onChange={e => setVentaEditando({ ...ventaEditando, cliente_whatsapp: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}><Mail size={12}/> Correo de activación</label>
                <input
                  type="email"
                  value={ventaEditando.cliente_correo}
                  onChange={e => setVentaEditando({ ...ventaEditando, cliente_correo: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Precio (S/)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={ventaEditando.precio_unitario}
                    onChange={e => setVentaEditando({ ...ventaEditando, precio_unitario: e.target.value })}
                    style={{ fontWeight: 700, color: '#06b6d4' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Meses</label>
                  <input
                    type="number"
                    min="1"
                    value={ventaEditando.duracion_meses}
                    onChange={e => setVentaEditando({ ...ventaEditando, duracion_meses: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}><Calendar size={12}/> Vencimiento</label>
                  <input
                    type="date"
                    value={ventaEditando.fecha_vencimiento}
                    onChange={e => setVentaEditando({ ...ventaEditando, fecha_vencimiento: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Notas</label>
                <input
                  value={ventaEditando.notas}
                  onChange={e => setVentaEditando({ ...ventaEditando, notas: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setVentaEditando(null)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoEdicion} className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                  <Save size={15} /> {guardandoEdicion ? 'Guardando...' : 'Guardar corrección'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
