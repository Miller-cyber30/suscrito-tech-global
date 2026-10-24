import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTienda } from '../../store'
import Paginador from '../../components/Paginador'
import { Package, Tag, ShoppingBag, Clock, Users, Key, ChevronDown, ChevronUp, Send, Copy, RefreshCw, CheckCircle, Cpu } from 'lucide-react'
import toast from 'react-hot-toast'

function formatearFecha(valor) {
  if (!valor) return 'N/A'
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

export default function AdminDashboard() {
  const { modoOscuro } = useTienda()

  const [stats, setStats]               = useState({ productos: 0, categorias: 0, ventas_hoy: 0, total_hoy: 0 })
  const [cargando, setCargando]         = useState(true)

  const [paginaActual, setPaginaActual]     = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(50)

  const [vistaPanel, setVistaPanel]       = useState('usuarios')
  const [suscripciones, setSuscripciones] = useState([])
  const [cuentasMadre, setCuentasMadre]   = useState([])
  const [expandidoId, setExpandidoId]     = useState(null)
  const [modalRenovar, setModalRenovar]   = useState(null)
  const [mesesRenovar, setMesesRenovar]   = useState(3)

  useEffect(() => {
    setPaginaActual(1)
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const [
      { data: prodsTodos },
      { data: catsTodas },
      { data: ventasHoy },
      { data: subs },
      { data: madres }
    ] = await Promise.all([
      supabase.from('productos').select('*'),
      supabase.from('categorias').select('id, nombre, activo, tienda').order('nombre'),
      supabase.from('ventas').select('total, tienda').gte('created_at', hoy.toISOString()),
      supabase.from('venta_items')
        .select('*, ventas(created_at, total, tienda)')
        .not('fecha_vencimiento', 'is', null)
        .order('fecha_vencimiento', { ascending: true }),
      supabase.from('compras')
        .select('*')
        .order('fecha_vencimiento', { ascending: true })
    ])

    const prodsTienda  = (prodsTodos || []).filter(p => p.tienda !== 'richard')
    const catsTienda   = (catsTodas || []).filter(c => c.tienda !== 'richard')
    const ventasTienda = (ventasHoy || []).filter(v => v.tienda !== 'richard')
    const madresTienda = (madres || []).filter(m => m.tienda !== 'richard')

    const activos   = prodsTienda.filter(p => p.activo)
    const total_hoy = ventasTienda.reduce((a, v) => a + Number(v.total), 0)

    setStats({
      productos: activos.length,
      categorias: catsTienda.length,
      ventas_hoy: ventasTienda.length,
      total_hoy
    })

    setSuscripciones(subs || [])
    setCuentasMadre(madresTienda)
    setCargando(false)
  }

  const calcularDiasRestantes = (fechaVenc) => {
    if (!fechaVenc) return 999
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const venc = new Date(fechaVenc + 'T00:00:00')
    return Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24))
  }

  const generarTextoRenovacion = (item) => {
    const dias = calcularDiasRestantes(item.fecha_vencimiento)
    const fechaFormateada = formatearFecha(item.fecha_vencimiento)
    const estadoTexto = dias < 0 ? `venció el *${fechaFormateada}*` : `está a punto de vencer el *${fechaFormateada}* (en ${dias} días)`
    return `¡Hola *${item.cliente_nombre || 'estimado(a)'}*! 👋 Te saluda *SuscriTech Global*.\n\nTe escribimos para comentarte que tu servicio de *${item.nombre_producto}* asociado al correo (${item.cliente_correo || 'tu cuenta'}) ${estadoTexto}.\n\nPor favor, para no perder el servicio ni tus beneficios activos, coméntame por aquí para renovar tu plan (3, 6 o 12 meses). ¡Quedo atento! 🚀`
  }

  const confirmarRenovacionRapida = async (item) => {
    const baseDate = new Date(item.fecha_vencimiento + 'T12:00:00') < new Date() ? new Date() : new Date(item.fecha_vencimiento + 'T12:00:00')
    baseDate.setMonth(baseDate.getMonth() + Number(mesesRenovar))
    const nuevaFecha = baseDate.toISOString().split('T')[0]

    const { error } = await supabase.from('venta_items').update({
      fecha_vencimiento: nuevaFecha,
      duracion_meses: Number(item.duracion_meses || 0) + Number(mesesRenovar),
      estado_suscripcion: 'renovado'
    }).eq('id', item.id)

    if (error) return toast.error('Error al renovar')
    toast.success(`¡Servicio renovado hasta el ${formatearFecha(nuevaFecha)}! 🎉`)
    setModalRenovar(null)
    cargar()
  }

  const limiteValido  = Math.max(1, Number(itemsPorPagina) || 50)
  const subsPaginadas = suscripciones.slice((paginaActual - 1) * limiteValido, paginaActual * limiteValido)

  const bgFila          = modoOscuro ? '#0f1523' : '#ffffff'
  const bgFilaUrgente   = modoOscuro ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'
  const bgDetalle       = modoOscuro ? '#070a12' : '#f8fafc'
  const bgCajaDato      = modoOscuro ? '#0f1523' : '#ffffff'
  const bordeFila       = modoOscuro ? '#1e293b' : 'var(--borde)'
  const textoPrincipal  = modoOscuro ? '#f8fafc' : '#0f172a'
  const textoSecundario = modoOscuro ? '#94a3b8' : '#64748b'

  const cards = [
    { label: 'Servicios activos',  valor: stats.productos,                    icon: Package,     color: '#7c3aed' },
    { label: 'Categorías',         valor: stats.categorias,                   icon: Tag,         color: '#06b6d4' },
    { label: 'Ventas hoy',         valor: stats.ventas_hoy,                   icon: ShoppingBag, color: '#10b981' },
    { label: 'Total vendido hoy',  valor: `S/ ${stats.total_hoy.toFixed(2)}`, icon: ShoppingBag, color: '#38bdf8' },
  ]

  if (cargando) return <div className="spinner" />

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 24, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Cpu size={24} color="#7c3aed" /> Dashboard SuscriTech Global<span style={{ color: '#06b6d4' }}>.</span>
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {cards.map(({ label, valor, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 13, color: 'var(--texto-suave)' }}>{label}</p>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <p style={{ fontFamily: 'var(--fuente-cuerpo)', fontVariantNumeric: 'tabular-nums', fontSize: 26, fontWeight: 800, color: 'var(--texto)' }}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Panel de Vencimientos y Renovaciones */}
      <div className="card" style={{ padding: 20, borderTop: '4px solid #7c3aed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: textoPrincipal }}>
              <Clock size={20} color="#06b6d4" /> Próximos a Vencer (Renovaciones)
            </h2>
            <p style={{ fontSize: 12, color: textoSecundario }}>Haz clic en cualquier fila para expandir toda la información y renovar</p>
          </div>

          <div style={{ display: 'flex', gap: 6, background: bgDetalle, padding: 4, borderRadius: 10, border: `1px solid ${bordeFila}` }}>
            <button
              onClick={() => setVistaPanel('usuarios')}
              className={vistaPanel === 'usuarios' ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: 12, padding: '7px 14px', background: vistaPanel === 'usuarios' ? '#7c3aed' : 'transparent', color: vistaPanel === 'usuarios' ? '#fff' : textoSecundario, border: 'none' }}>
              <Users size={14} /> Usuarios ({suscripciones.length})
            </button>
            <button
              onClick={() => setVistaPanel('servicios')}
              className={vistaPanel === 'servicios' ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: 12, padding: '7px 14px', background: vistaPanel === 'servicios' ? '#0891b2' : 'transparent', color: vistaPanel === 'servicios' ? '#fff' : textoSecundario, border: 'none' }}>
              <Key size={14} /> Stock Servicios ({cuentasMadre.length})
            </button>
          </div>
        </div>

        {vistaPanel === 'usuarios' ? (
          suscripciones.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '30px 0', color: textoSecundario, fontSize: 13 }}>
              Aún no hay usuarios con suscripciones registradas.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {subsPaginadas.map(s => {
                  const dias = calcularDiasRestantes(s.fecha_vencimiento)
                  const urgente = dias <= 5
                  const expandido = expandidoId === s.id

                  return (
                    <div key={s.id} style={{
                      border: `1.5px solid ${urgente ? '#ef4444' : (expandido ? '#7c3aed' : bordeFila)}`,
                      borderRadius: 12,
                      background: urgente ? bgFilaUrgente : bgFila,
                      overflow: 'hidden',
                      transition: '0.2s'
                    }}>
                      <div
                        onClick={() => setExpandidoId(expandido ? null : s.id)}
                        style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12 }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: textoPrincipal }}>
                              {s.cliente_nombre || 'Cliente sin nombre'}
                            </span>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                              background: 'rgba(124, 58, 237, 0.2)', color: modoOscuro ? '#c4b5fd' : '#6d28d9',
                              border: '1px solid rgba(124, 58, 237, 0.35)'
                            }}>
                              {s.nombre_producto}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: textoSecundario, marginTop: 5 }}>
                            ✉️ {s.cliente_correo || 'Sin correo'} &nbsp;·&nbsp; 📱 {s.cliente_whatsapp || 'Sin WhatsApp'} &nbsp;·&nbsp; ⏳ Vence: <b>{formatearFecha(s.fecha_vencimiento)}</b>
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 800, padding: '5px 12px', borderRadius: 20,
                            background: dias < 0 ? '#991b1b' : urgente ? '#ef4444' : '#10b981', color: '#ffffff'
                          }}>
                            {dias < 0 ? `Vencido hace ${Math.abs(dias)}d` : dias === 0 ? '¡Vence HOY!' : `Vence en ${dias} días`}
                          </span>
                          {expandido ? <ChevronUp size={18} color={textoSecundario} /> : <ChevronDown size={18} color={textoSecundario} />}
                        </div>
                      </div>

                      {expandido && (
                        <div style={{ padding: '16px', background: bgDetalle, borderTop: `1px solid ${bordeFila}` }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginBottom: 14 }}>
                            <div style={{ background: bgCajaDato, padding: '10px 12px', borderRadius: 8, border: `1px solid ${bordeFila}` }}>
                              <span style={{ fontSize: 11, color: textoSecundario, display: 'block', marginBottom: 3 }}>📅 Fecha de Compra</span>
                              <strong style={{ fontSize: 13, color: textoPrincipal }}>
                                {formatearFecha(s.ventas?.created_at)}
                              </strong>
                            </div>

                            <div style={{ background: bgCajaDato, padding: '10px 12px', borderRadius: 8, border: `1px solid ${bordeFila}` }}>
                              <span style={{ fontSize: 11, color: textoSecundario, display: 'block', marginBottom: 3 }}>⏳ Fecha de Vencimiento</span>
                              <strong style={{ fontSize: 13, color: '#f87171' }}>
                                {formatearFecha(s.fecha_vencimiento)}
                              </strong>
                            </div>

                            <div style={{ background: bgCajaDato, padding: '10px 12px', borderRadius: 8, border: `1px solid ${bordeFila}` }}>
                              <span style={{ fontSize: 11, color: textoSecundario, display: 'block', marginBottom: 3 }}>🌐 Plataforma de Venta</span>
                              <strong style={{ fontSize: 13, color: textoPrincipal }}>
                                {s.plataforma_venta || 'WhatsApp'}
                              </strong>
                            </div>

                            <div style={{ background: bgCajaDato, padding: '10px 12px', borderRadius: 8, border: `1px solid ${bordeFila}` }}>
                              <span style={{ fontSize: 11, color: textoSecundario, display: 'block', marginBottom: 3 }}>⚡ Tiempo Contratado</span>
                              <strong style={{ fontSize: 13, color: '#38bdf8' }}>
                                {s.duracion_meses || 1} {Number(s.duracion_meses || 1) === 1 ? 'mes' : 'meses'}
                              </strong>
                            </div>

                            <div style={{ background: bgCajaDato, padding: '10px 12px', borderRadius: 8, border: `1px solid ${bordeFila}` }}>
                              <span style={{ fontSize: 11, color: textoSecundario, display: 'block', marginBottom: 3 }}>💰 Precio Pagado</span>
                              <strong style={{ fontSize: 14, color: '#a855f7' }}>
                                S/ {Number(s.subtotal).toFixed(2)}
                              </strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setModalRenovar(s)}
                              className="btn-primary"
                              style={{ fontSize: 12, padding: '9px 16px' }}
                            >
                              <RefreshCw size={14} /> Renovar / Ver Mensaje para Usuario
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <Paginador
                totalItems={suscripciones.length}
                itemsPorPagina={itemsPorPagina}
                setItemsPorPagina={setItemsPorPagina}
                paginaActual={paginaActual}
                setPaginaActual={setPaginaActual}
                esMiller={true}
              />
            </>
          )
        ) : (
          cuentasMadre.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '30px 0', color: textoSecundario, fontSize: 13 }}>
              No hay cuentas madre o servicios registrados en Compras todavía.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cuentasMadre.map(m => {
                const dias = calcularDiasRestantes(m.fecha_vencimiento)
                const libres = Number(m.cupos_totales || 1) - Number(m.cupos_usados || 0)
                const expandido = expandidoId === m.id

                return (
                  <div key={m.id} style={{
                    border: `1.5px solid ${dias <= 7 ? '#ef4444' : bordeFila}`,
                    borderRadius: 12,
                    background: dias <= 7 ? bgFilaUrgente : bgFila,
                    overflow: 'hidden'
                  }}>
                    <div onClick={() => setExpandidoId(expandido ? null : m.id)} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 12 }}>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 15, color: textoPrincipal }}>{m.servicio_nombre || m.empresa}</p>
                        <p style={{ fontSize: 12, color: textoSecundario, marginTop: 4 }}>
                          🔑 Cuenta: <b style={{ color: textoPrincipal }}>{m.cuenta_correo || 'S/C'}</b> &nbsp;·&nbsp; 👥 Cupos libres: <b style={{ color: '#38bdf8' }}>{libres} de {m.cupos_totales || 1}</b>
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: dias <= 7 ? '#ef4444' : '#0891b2', color: '#fff' }}>
                          Vence: {formatearFecha(m.fecha_vencimiento)} ({dias}d)
                        </span>
                        {expandido ? <ChevronUp size={18} color={textoSecundario} /> : <ChevronDown size={18} color={textoSecundario} />}
                      </div>
                    </div>

                    {expandido && (
                      <div style={{ padding: '16px', background: bgDetalle, borderTop: `1px solid ${bordeFila}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
                          <div style={{ background: bgCajaDato, padding: '10px 12px', borderRadius: 8, border: `1px solid ${bordeFila}` }}>
                            <span style={{ fontSize: 11, color: textoSecundario, display: 'block', marginBottom: 3 }}>👤 Proveedor</span>
                            <strong style={{ fontSize: 13, color: textoPrincipal }}>{m.empresa}</strong>
                          </div>
                          <div style={{ background: bgCajaDato, padding: '10px 12px', borderRadius: 8, border: `1px solid ${bordeFila}` }}>
                            <span style={{ fontSize: 11, color: textoSecundario, display: 'block', marginBottom: 3 }}>📱 WhatsApp Proveedor</span>
                            <strong style={{ fontSize: 13, color: textoPrincipal }}>{m.proveedor_whatsapp || 'S/N'}</strong>
                          </div>
                          <div style={{ background: bgCajaDato, padding: '10px 12px', borderRadius: 8, border: `1px solid ${bordeFila}` }}>
                            <span style={{ fontSize: 11, color: textoSecundario, display: 'block', marginBottom: 3 }}>🌐 Plataforma Compra</span>
                            <strong style={{ fontSize: 13, color: textoPrincipal }}>{m.plataforma_compra || 'Directo'}</strong>
                          </div>
                          <div style={{ background: bgCajaDato, padding: '10px 12px', borderRadius: 8, border: `1px solid ${bordeFila}` }}>
                            <span style={{ fontSize: 11, color: textoSecundario, display: 'block', marginBottom: 3 }}>💰 Costo Pagado</span>
                            <strong style={{ fontSize: 13, color: '#10b981' }}>S/ {Number(m.total).toFixed(2)}</strong>
                          </div>
                          <div style={{ background: bgCajaDato, padding: '10px 12px', borderRadius: 8, border: `1px solid ${bordeFila}` }}>
                            <span style={{ fontSize: 11, color: textoSecundario, display: 'block', marginBottom: 3 }}>📅 Fecha Compra</span>
                            <strong style={{ fontSize: 13, color: textoPrincipal }}>{formatearFecha(m.fecha_compra)}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {modalRenovar && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24, border: `1px solid ${bordeFila}` }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: textoPrincipal }}>
                📲 Texto de Renovación para {modalRenovar.cliente_nombre}
              </h3>
              <textarea
                readOnly
                rows={7}
                value={generarTextoRenovacion(modalRenovar)}
                style={{ width: '100%', fontSize: 12, padding: 12, borderRadius: 8, border: `1px solid ${bordeFila}`, background: bgDetalle, color: textoPrincipal, marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(generarTextoRenovacion(modalRenovar)); toast.success('Mensaje copiado 📋') }}
                  className="btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>
                  <Copy size={14} /> Copiar Texto
                </button>
                {modalRenovar.cliente_whatsapp && (
                  <a
                    href={`https://wa.me/51${modalRenovar.cliente_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(generarTextoRenovacion(modalRenovar))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#10b981', border: 'none', fontSize: 12, textDecoration: 'none' }}>
                    <Send size={14} /> Mandar por WhatsApp
                  </a>
                )}
              </div>

              <div style={{ borderTop: `1px solid ${bordeFila}`, paddingTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6, color: textoPrincipal }}>
                  ¿Confirmar renovación de fecha en el sistema?
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={mesesRenovar} onChange={e => setMesesRenovar(e.target.value)} style={{ flex: 1, fontSize: 13 }}>
                    <option value={1}>+ 1 Mes</option>
                    <option value={3}>+ 3 Meses (S/ 3)</option>
                    <option value={6}>+ 6 Meses (S/ 5)</option>
                    <option value={12}>+ 12 Meses (S/ 8)</option>
                  </select>
                  <button onClick={() => confirmarRenovacionRapida(modalRenovar)} className="btn-primary">
                    <CheckCircle size={15} /> Renovar
                  </button>
                </div>
              </div>

              <button onClick={() => setModalRenovar(null)} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
