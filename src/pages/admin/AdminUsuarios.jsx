import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Pencil, X, Search, Phone, Mail, Upload, FileText, Cpu, Bell, CheckCircle, XCircle, Link2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = ['admin', 'vendedor', 'comprador']

export default function AdminUsuarios() {
  const [usuarios, setUsuarios]               = useState([])
  const [solicitudes, setSolicitudes]         = useState([])
  const [todasSuscripciones, setTodasSuscripciones] = useState([])
  const [cargando, setCargando]               = useState(true)
  const [busqueda, setBusqueda]               = useState('')
  const [editando, setEditando]               = useState(null)
  const [nuevoRol, setNuevoRol]               = useState('')
  const [nuevoNombre, setNuevoNombre]         = useState('')
  const [nuevoEmail, setNuevoEmail]           = useState('')
  const [nuevoTelefono, setNuevoTelefono]     = useState('')
  const [notasSoporte, setNotasSoporte]       = useState('')
  const [recibirAlertas, setRecibirAlertas]   = useState(true)
  const [avatarUrl, setAvatarUrl]             = useState('')
  const [subiendoFoto, setSubiendoFoto]       = useState(false)
  const [guardando, setGuardando]             = useState(false)

  // Estados para asociar compras existentes o aprobar solicitudes del usuario
  const [busqVentaAsociar, setBusqVentaAsociar] = useState('')
  const [ventaSeleccionadaSol, setVentaSeleccionadaSol] = useState({})
  const fileRef = useRef()

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [{ data: perfs }, { data: sols }, { data: subs }] = await Promise.all([
      supabase.from('perfiles').select('*').order('created_at', { ascending: false }),
      supabase.from('solicitudes_asociacion').select('*, productos(id, nombre, precio)').order('created_at', { ascending: false }),
      supabase.from('venta_items').select('*, ventas(created_at, total)').order('created_at', { ascending: false })
    ])
    setUsuarios(perfs || [])
    setSolicitudes(sols || [])
    setTodasSuscripciones(subs || [])
    setCargando(false)
  }

  function abrirEditar(u) {
    setEditando(u)
    setNuevoRol(u.rol || 'comprador')
    setNuevoNombre(u.nombre || '')
    setNuevoEmail(u.email || '')
    setNuevoTelefono(u.telefono || '')
    setNotasSoporte(u.notas_soporte || '')
    setRecibirAlertas(u.recibir_alertas !== false)
    setAvatarUrl(u.avatar_url || '')
    setBusqVentaAsociar('')
  }

  async function handleSubirAvatar(e) {
    const file = e.target.files?.[0]
    if (!file || !editando) return
    setSubiendoFoto(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `perfiles/avatar_${editando.id}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('imagenes').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('imagenes').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
      toast.success('Foto cargada lista para guardar')
    } catch (err) {
      toast.error('Error subiendo foto: ' + err.message)
    }
    setSubiendoFoto(false)
  }

  async function handleGuardar() {
    if (!nuevoRol) return toast.error('Selecciona un rol')
    setGuardando(true)

    const { error } = await supabase
      .from('perfiles')
      .update({
        rol: nuevoRol,
        nombre: nuevoNombre,
        email: nuevoEmail || null,
        telefono: nuevoTelefono || null,
        notas_soporte: notasSoporte || null,
        recibir_alertas: recibirAlertas,
        avatar_url: avatarUrl || null
      })
      .eq('id', editando.id)

    if (error) {
      toast.error('Error al actualizar: ' + error.message)
      setGuardando(false)
      return
    }

    toast.success(`Perfil de "${nuevoNombre || 'Usuario'}" actualizado ✅`)
    setEditando(null)
    setGuardando(false)
    cargar()
  }

  // Asociar directamente una suscripción/compra existente a este cliente
  async function asociarVentaAUsuario(ventaItemId, usuarioId) {
    const { error } = await supabase
      .from('venta_items')
      .update({ cliente_usuario_id: usuarioId })
      .eq('id', ventaItemId)
    if (error) return toast.error('Error al asociar: ' + error.message)
    toast.success('Compra vinculada al cliente ✅')
    cargar()
  }

  async function desasociarVentaDeUsuario(ventaItemId) {
    const { error } = await supabase
      .from('venta_items')
      .update({ cliente_usuario_id: null })
      .eq('id', ventaItemId)
    if (error) return toast.error('Error al desvincular: ' + error.message)
    toast.success('Compra desvinculada del cliente')
    cargar()
  }

  // Aprobar solicitud de asociación del cliente
  async function aprobarSolicitud(sol) {
    try {
      const itemElegidoId = ventaSeleccionadaSol[sol.id]
      if (itemElegidoId) {
        // Si el admin eligió una venta existente, la vinculamos al usuario
        const { error: errV } = await supabase
          .from('venta_items')
          .update({ cliente_usuario_id: sol.user_id })
          .eq('id', itemElegidoId)
        if (errV) throw errV
      } else {
        // Si no eligió una existente, le crea el registro vinculado por 1 mes (editable luego en Ventas/Dashboard)
        const venc = new Date()
        venc.setMonth(venc.getMonth() + 1)
        const { data: nuevaVenta, error: errNV } = await supabase
          .from('ventas')
          .insert({
            tipo: 'fisica',
            tienda: 'miller',
            total: Number(sol.productos?.precio || 0),
            estado: 'completada',
            nombre_cliente: editando?.nombre || 'Cliente Asociado',
            notas: `Asociación aprobada | ${sol.correo_referencia || ''}`
          })
          .select()
          .single()
        if (errNV) throw errNV

        await supabase.from('venta_items').insert({
          venta_id: nuevaVenta.id,
          producto_id: sol.producto_id,
          nombre_producto: sol.productos?.nombre || 'Servicio Digital',
          precio_unitario: Number(sol.productos?.precio || 0),
          cantidad: 1,
          subtotal: Number(sol.productos?.precio || 0),
          cliente_nombre: editando?.nombre || 'Cliente',
          cliente_whatsapp: editando?.telefono || '',
          cliente_correo: sol.correo_referencia || editando?.email || '',
          cliente_usuario_id: sol.user_id,
          plataforma_venta: 'WhatsApp',
          duracion_meses: 1,
          fecha_vencimiento: venc.toISOString().split('T')[0],
          estado_suscripcion: 'activo'
        })
      }

      await supabase
        .from('solicitudes_asociacion')
        .update({ estado: 'aceptado', venta_item_id: itemElegidoId || null })
        .eq('id', sol.id)

      toast.success('Solicitud aceptada y cuenta vinculada al cliente 🎉')
      cargar()
    } catch (e) {
      toast.error('Error al aprobar: ' + e.message)
    }
  }

  async function rechazarSolicitud(solId) {
    const { error } = await supabase
      .from('solicitudes_asociacion')
      .update({ estado: 'rechazado' })
      .eq('id', solId)
    if (error) return toast.error('Error: ' + error.message)
    toast.success('Solicitud rechazada')
    cargar()
  }

  const colorRol = { admin: 'badge-naranja', vendedor: 'badge-verde', comprador: 'badge-gris' }

  const filtrados = usuarios.filter(u => {
    if (!busqueda.trim()) return true
    const t = busqueda.toLowerCase()
    return (u.nombre || '').toLowerCase().includes(t) ||
           (u.email || '').toLowerCase().includes(t) ||
           (u.telefono || '').toLowerCase().includes(t)
  })

  // Datos del usuario actualmente abierto en el modal
  const solicitudesUsuario = editando ? solicitudes.filter(s => s.user_id === editando.id) : []
  const comprasAsociadasUsuario = editando
    ? todasSuscripciones.filter(s =>
        s.cliente_usuario_id === editando.id ||
        (editando.email && s.cliente_correo?.toLowerCase() === editando.email.toLowerCase())
      )
    : []

  const comprasBuscadasParaAsociar = editando && busqVentaAsociar.trim()
    ? todasSuscripciones.filter(s => {
        const t = busqVentaAsociar.toLowerCase()
        return (
          s.cliente_usuario_id !== editando.id &&
          ((s.nombre_producto || '').toLowerCase().includes(t) ||
           (s.cliente_nombre || '').toLowerCase().includes(t) ||
           (s.cliente_correo || '').toLowerCase().includes(t) ||
           (s.cliente_whatsapp || '').toLowerCase().includes(t))
        )
      }).slice(0, 6)
    : []

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 24, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Cpu size={24} color="#7c3aed" /> Usuarios, Asociaciones y Soporte<span style={{ color: '#06b6d4' }}>.</span>
      </h1>

      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.35)' }}>
        <p style={{ fontSize: 13, color: '#06b6d4', fontWeight: 500 }}>
          💡 Aquí puedes revisar solicitudes de asociación enviadas por los clientes, vincularles compras de distintos correos y administrar roles o soporte.
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-suave)' }} />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar usuario por nombre, correo o teléfono..." style={{ paddingLeft: 36 }} />
      </div>

      {cargando ? <div className="spinner" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(u => {
            const pendientes = solicitudes.filter(s => s.user_id === u.id && s.estado === 'pendiente').length
            const totalVinculadas = todasSuscripciones.filter(s =>
              s.cliente_usuario_id === u.id ||
              (u.email && s.cliente_correo?.toLowerCase() === u.email.toLowerCase())
            ).length

            return (
              <div key={u.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderLeft: pendientes > 0 ? '4px solid #06b6d4' : undefined, flexWrap: 'wrap' }}>
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.nombre} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #06b6d4' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0 }}>
                    {(u.nombre || 'U')[0].toUpperCase()}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{u.nombre || 'Sin nombre'}</p>
                    {pendientes > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 12, background: '#06b6d4', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Bell size={12} /> {pendientes} solicitud{pendientes > 1 ? 'es' : ''} por revisar
                      </span>
                    )}
                    {totalVinculadas > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd' }}>
                        🔗 {totalVinculadas} servicio{totalVinculadas > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 2 }}>
                    {u.email ? `✉️ ${u.email} · ` : ''}
                    {u.telefono ? `📱 ${u.telefono} · ` : ''}
                    Registrado: {new Date(u.created_at).toLocaleDateString('es-PE')}
                  </p>
                  {u.notas_soporte && (
                    <p style={{ fontSize: 11, color: '#a855f7', marginTop: 2, fontWeight: 600 }}>
                      🛠️ Soporte: {u.notas_soporte}
                    </p>
                  )}
                </div>

                <span className={`badge ${colorRol[u.rol] || 'badge-gris'}`}>{u.rol}</span>
                <button onClick={() => abrirEditar(u)} className="btn-ghost" style={{ padding: '7px 12px', flexShrink: 0, borderColor: pendientes > 0 ? '#06b6d4' : undefined, color: pendientes > 0 ? '#06b6d4' : undefined }}>
                  <Pencil size={14} /> {pendientes > 0 ? 'Revisar Solicitud' : 'Gestionar'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Gestionar Usuario, Solicitudes de Asociación y Suscripciones */}
      {editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', padding: '24px', borderTop: '4px solid #7c3aed' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 18 }}>
                Cliente: {editando.nombre || editando.email}
              </h2>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-suave)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* SECCIÓN 1: SOLICITUDES DE ASOCIACIÓN ENVIADAS POR ESTE USUARIO */}
              <div style={{ padding: 14, borderRadius: 12, background: 'var(--fondo)', border: '1px solid rgba(6, 182, 212, 0.35)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: '#06b6d4', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={15} /> Solicitudes de Asociación del Cliente ({solicitudesUsuario.length})
                </h3>
                {solicitudesUsuario.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--texto-suave)' }}>Este usuario no ha enviado solicitudes de asociación.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {solicitudesUsuario.map(sol => (
                      <div key={sol.id} style={{ padding: 12, borderRadius: 10, background: 'var(--blanco)', border: '1px solid var(--borde)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <strong style={{ fontSize: 13, color: 'var(--texto)' }}>
                            📦 {sol.productos?.nombre || 'Servicio solicitado'}
                          </strong>
                          <span className={`badge ${sol.estado === 'aceptado' ? 'badge-verde' : sol.estado === 'rechazado' ? 'badge-rojo' : 'badge-naranja'}`}>
                            {sol.estado}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--texto-suave)', marginBottom: 8 }}>
                          Dato / Correo indicado por el cliente: <b style={{ color: '#06b6d4' }}>{sol.correo_referencia || 'No indicó'}</b>
                        </p>

                        {sol.estado === 'pendiente' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <select
                              value={ventaSeleccionadaSol[sol.id] || ''}
                              onChange={e => setVentaSeleccionadaSol({ ...ventaSeleccionadaSol, [sol.id]: e.target.value })}
                              style={{ fontSize: 12 }}>
                              <option value="">-- Crear nueva suscripción activa (o selecciona una venta existente abajo) --</option>
                              {todasSuscripciones.map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.nombre_producto} | {v.cliente_nombre || 'Sin nombre'} | {v.cliente_correo || 'Sin correo'} (Vence: {v.fecha_vencimiento || 'N/A'})
                                </option>
                              ))}
                            </select>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button type="button" onClick={() => aprobarSolicitud(sol)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '7px 10px', fontSize: 12, background: '#10b981', border: 'none' }}>
                                <CheckCircle size={14} /> Aceptar y Vincular
                              </button>
                              <button type="button" onClick={() => rechazarSolicitud(sol.id)} className="btn-danger" style={{ flex: 1, justifyContent: 'center', padding: '7px 10px', fontSize: 12 }}>
                                <XCircle size={14} /> Rechazar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: ASOCIAR COMPRAS DE CUALQUIER CORREO A ESTE CLIENTE */}
              <div style={{ padding: 14, borderRadius: 12, background: 'var(--fondo)', border: '1px solid rgba(124, 58, 237, 0.35)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: '#a855f7', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link2 size={15} /> Suscripciones Asociadas a este Cliente ({comprasAsociadasUsuario.length})
                </h3>
                <p style={{ fontSize: 11, color: 'var(--texto-suave)', marginBottom: 10 }}>
                  Aquí puedes vincularle cualquier compra registrada (incluso si se activó con otro correo distinto) para que le aparezca en su panel.
                </p>

                {/* Buscador para vincular una compra existente */}
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-suave)' }} />
                  <input
                    value={busqVentaAsociar}
                    onChange={e => setBusqVentaAsociar(e.target.value)}
                    placeholder="Buscar venta por correo, nombre de cliente o servicio para asociar..."
                    style={{ paddingLeft: 32, fontSize: 12 }}
                  />
                </div>

                {comprasBuscadasParaAsociar.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, padding: 8, borderRadius: 8, background: 'var(--blanco)', border: '1px solid var(--borde)' }}>
                    {comprasBuscadasParaAsociar.map(v => (
                      <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 6px', borderBottom: '1px solid var(--borde)' }}>
                        <div>
                          <b>{v.nombre_producto}</b> · {v.cliente_nombre || 'Cliente'} ({v.cliente_correo || 'S/C'})
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--texto-suave)' }}>Vence: {v.fecha_vencimiento || 'N/A'}</span>
                        </div>
                        <button type="button" onClick={() => asociarVentaAUsuario(v.id, editando.id)} className="btn-primary" style={{ padding: '4px 10px', fontSize: 11, background: '#7c3aed', border: 'none' }}>
                          + Asociar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {comprasAsociadasUsuario.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--texto-suave)' }}>No tiene suscripciones vinculadas todavía.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {comprasAsociadasUsuario.map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'var(--blanco)', border: '1px solid var(--borde)', fontSize: 12 }}>
                        <div>
                          <strong>{c.nombre_producto}</strong> · <span style={{ color: '#06b6d4' }}>{c.cliente_correo || 'Sin correo'}</span>
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--texto-suave)' }}>Vence: {c.fecha_vencimiento ? c.fecha_vencimiento.split('-').reverse().join('/') : 'N/A'}</span>
                        </div>
                        {c.cliente_usuario_id === editando.id && (
                          <button type="button" onClick={() => desasociarVentaDeUsuario(c.id)} className="btn-danger" style={{ padding: '4px 8px', fontSize: 11 }} title="Desvincular">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECCIÓN 3: DATOS DEL PERFIL Y ROL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #06b6d4' }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#fff' }}>
                    {(nuevoNombre || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleSubirAvatar} style={{ display: 'none' }} />
                  <button type="button" onClick={() => fileRef.current.click()} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
                    <Upload size={14} /> {subiendoFoto ? 'Subiendo...' : 'Cambiar foto de perfil'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Nombre completo</label>
                  <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Nombre del usuario" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}><Mail size={12}/> Correo principal</label>
                  <input type="email" value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} placeholder="correo@gmail.com" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}><Phone size={12}/> WhatsApp / Teléfono</label>
                  <input type="text" value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value)} placeholder="924545856" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}><FileText size={12}/> Notas de Soporte Técnico</label>
                <textarea rows={2} value={notasSoporte} onChange={e => setNotasSoporte(e.target.value)} placeholder="Ej: Cuentas vinculadas, reposiciones..." style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--borde)', fontSize: 12, background: 'var(--fondo)', color: 'var(--texto)' }} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' }}>Rol en el sistema</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {ROLES.map(r => (
                    <button key={r} type="button" onClick={() => setNuevoRol(r)}
                      style={{
                        padding: '10px', borderRadius: 10, border: `2px solid ${nuevoRol === r ? '#06b6d4' : 'var(--borde)'}`,
                        background: nuevoRol === r ? 'rgba(6, 182, 212, 0.12)' : 'var(--blanco)',
                        cursor: 'pointer', textAlign: 'center'
                      }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: nuevoRol === r ? '#06b6d4' : 'var(--texto)' }}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditando(null)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Cerrar
                </button>
                <button onClick={handleGuardar} className="btn-primary" disabled={guardando}
                  style={{ flex: 1, justifyContent: 'center', opacity: guardando ? 0.7 : 1, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
