import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store'
import Navbar from '../components/Navbar'
import { Camera, Clock, RefreshCw, Save, PlusCircle, X, CheckCircle, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MiCuenta() {
  const { usuario, perfil, setPerfil } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef()

  const [nombre, setNombre]                   = useState('')
  const [telefono, setTelefono]               = useState('')
  const [avatarUrl, setAvatarUrl]             = useState('')
  const [recibirAlertas, setRecibirAlertas]   = useState(true)
  const [misServicios, setMisServicios]       = useState([])
  const [misSolicitudes, setMisSolicitudes]   = useState([])
  const [todosProductos, setTodosProductos]   = useState([])
  const [modalAsociar, setModalAsociar]       = useState(false)
  const [prodAsociarId, setProdAsociarId]     = useState('')
  const [correoRef, setCorreoRef]             = useState('')
  const [enviandoSol, setEnviandoSol]         = useState(false)
  const [guardando, setGuardando]             = useState(false)
  const [subiendo, setSubiendo]               = useState(false)

  useEffect(() => {
    if (!usuario) { navigate('/login'); return }
    if (perfil) {
      setNombre(perfil.nombre || '')
      setTelefono(perfil.telefono || '')
      setAvatarUrl(perfil.avatar_url || '')
      setRecibirAlertas(perfil.recibir_alertas !== false)
    }
    cargarMisSuscripciones()
    cargarProductosYSolicitudes()
  }, [usuario, perfil])

  async function cargarMisSuscripciones() {
    if (!usuario) return
    // Trae suscripciones que coincidan con su correo O que hayan sido asociadas a su usuario por el Admin
    const [{ data: porCorreo }, { data: porId }] = await Promise.all([
      supabase
        .from('venta_items')
        .select('*, ventas(created_at, total)')
        .ilike('cliente_correo', usuario.email),
      supabase
        .from('venta_items')
        .select('*, ventas(created_at, total)')
        .eq('cliente_usuario_id', usuario.id)
    ])

    const mapa = new Map()
    ;(porCorreo || []).forEach(item => mapa.set(item.id, item))
    ;(porId || []).forEach(item => mapa.set(item.id, item))

    const unidos = Array.from(mapa.values()).sort((a, b) =>
      (a.fecha_vencimiento || '9999').localeCompare(b.fecha_vencimiento || '9999')
    )
    setMisServicios(unidos)
  }

  async function cargarProductosYSolicitudes() {
    if (!usuario) return
    // Carga TODOS los productos de la base de datos aunque no tengan stock
    const [{ data: prods }, { data: sols }] = await Promise.all([
      supabase.from('productos').select('id, nombre, imagen_url, tienda').order('nombre'),
      supabase
        .from('solicitudes_asociacion')
        .select('*, productos(nombre)')
        .eq('user_id', usuario.id)
        .order('created_at', { ascending: false })
    ])
    setTodosProductos((prods || []).filter(p => p.tienda !== 'richard'))
    setMisSolicitudes(sols || [])
  }

  async function enviarSolicitudAsociacion(e) {
    e.preventDefault()
    if (!prodAsociarId) return toast.error('Selecciona el servicio que deseas asociar')
    setEnviandoSol(true)
    try {
      const { error } = await supabase.from('solicitudes_asociacion').insert({
        user_id: usuario.id,
        producto_id: prodAsociarId,
        correo_referencia: correoRef.trim() || usuario.email,
        estado: 'pendiente'
      })
      if (error) throw error
      toast.success('¡Solicitud enviada! El administrador revisará y vinculará tu cuenta 🚀')
      setModalAsociar(false)
      setProdAsociarId('')
      setCorreoRef('')
      cargarProductosYSolicitudes()
    } catch (err) {
      toast.error('Error al enviar solicitud: ' + err.message)
    }
    setEnviandoSol(false)
  }

  async function subirFoto(e) {
    const file = e.target.files?.[0]
    if (!file || !usuario) return
    setSubiendo(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `perfiles/user_${usuario.id}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('imagenes').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('imagenes').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
      toast.success('Foto cargada. Dale a Guardar para confirmar.')
    } catch (err) { toast.error('Error al subir: ' + err.message) }
    setSubiendo(false)
  }

  async function guardarPerfil() {
    if (!usuario) return
    setGuardando(true)
    const payload = {
      nombre,
      telefono,
      email: usuario.email,
      avatar_url: avatarUrl,
      recibir_alertas: recibirAlertas
    }
    const { data, error } = await supabase.from('perfiles').update(payload).eq('id', usuario.id).select().single()
    if (error) { toast.error('Error: ' + error.message); setGuardando(false); return }
    setPerfil(data)
    toast.success('¡Tu cuenta ha sido actualizada! ✅')
    setGuardando(false)
  }

  const diasRestantes = (fecha) => {
    if (!fecha) return 999
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const venc = new Date(fecha + 'T00:00:00')
    return Math.ceil((venc - hoy) / 86400000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #1e1b4b, #0f172a 70%)', color: '#f8fafc' }}>
      <Navbar />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 16px' }}>
        <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 26, fontWeight: 800, marginBottom: 20 }}>
          Mi Cuenta y Suscripciones<span style={{ color: '#06b6d4' }}>.</span>
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Tarjeta de Configuración de Perfil */}
          <div className="card" style={{ padding: 22, background: 'rgba(30,41,59,0.85)', color: '#fff', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Datos de tu Perfil</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #06b6d4' }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>
                  {(nombre || usuario?.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={subirFoto} style={{ display: 'none' }} />
                <button onClick={() => fileRef.current.click()} className="btn-ghost" style={{ fontSize: 12, color: '#06b6d4' }}>
                  <Camera size={14} /> {subiendo ? 'Subiendo...' : 'Cambiar foto'}
                </button>
                <p style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{usuario?.email}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre completo</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>WhatsApp</label>
                <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: 987654321" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={recibirAlertas} onChange={e => setRecibirAlertas(e.target.checked)} style={{ width: 16, height: 16 }} />
                Recibir avisos cuando mi servicio esté próximo a vencer
              </label>

              <button onClick={guardarPerfil} disabled={guardando} className="btn-primary" style={{ justifyContent: 'center', marginTop: 6, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </div>

          {/* Tarjeta de Suscripciones y Solicitud de Asociación */}
          <div className="card" style={{ padding: 22, background: 'rgba(30,41,59,0.85)', color: '#fff', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="#06b6d4" /> Mis Servicios y Vencimientos
              </h2>
              <button
                onClick={() => setModalAsociar(true)}
                className="btn-primary"
                style={{ fontSize: 11, padding: '6px 12px', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none', gap: 5 }}>
                <PlusCircle size={14} /> Asociar producto
              </button>
            </div>

            {misServicios.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px' }}>
                <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 12 }}>
                  Aún no tienes servicios vinculados a tu cuenta. Si ya compraste un servicio con otro correo o por WhatsApp, solicítanos asociarlo aquí:
                </p>
                <button
                  onClick={() => setModalAsociar(true)}
                  className="btn-ghost"
                  style={{ fontSize: 12, color: '#06b6d4', borderColor: '#06b6d4' }}>
                  <Link2 size={14} /> Solicitar asociación de mi servicio
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {misServicios.map(s => {
                  const dias = diasRestantes(s.fecha_vencimiento)
                  const porVencer = dias <= 5
                  return (
                    <div key={s.id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${porVencer ? '#f87171' : 'rgba(148,163,184,0.3)'}`, background: porVencer ? 'rgba(239,68,68,0.1)' : 'rgba(15,23,42,0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontWeight: 700, fontSize: 14 }}>{s.nombre_producto}</p>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 12, background: porVencer ? '#ef4444' : '#10b981', color: '#fff' }}>
                          {dias < 0 ? 'Vencido' : `${dias} días restantes`}
                        </span>
                      </div>
                      {s.cliente_correo && (
                        <p style={{ fontSize: 11, color: '#38bdf8', marginTop: 3 }}>
                          ✉️ Cuenta: {s.cliente_correo}
                        </p>
                      )}
                      <p style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                        📅 Adquirido: {s.ventas?.created_at ? new Date(s.ventas.created_at).toLocaleDateString('es-PE') : 'N/A'} · ⏳ <b>Vence: {s.fecha_vencimiento || 'N/A'}</b>
                      </p>
                      <a
                        href={`https://wa.me/51924545856?text=${encodeURIComponent(`¡Hola SuscriTech Global! 🚀 Quiero renovar mi servicio de *${s.nombre_producto}* (${s.cliente_correo || usuario.email})`)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, fontWeight: 700, color: '#06b6d4', textDecoration: 'none' }}>
                        <RefreshCw size={12} /> Solicitar Renovación por WhatsApp →
                      </a>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Historial de Solicitudes de Asociación del Cliente */}
            {misSolicitudes.length > 0 && (
              <div style={{ marginTop: 18, borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
                  Solicitudes de asociación enviadas:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {misSolicitudes.map(sol => (
                    <div key={sol.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(15,23,42,0.45)', fontSize: 12 }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{sol.productos?.nombre || 'Servicio'}</span>
                        {sol.correo_referencia && <span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>Dato: {sol.correo_referencia}</span>}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: sol.estado === 'aceptado' ? 'rgba(16,185,129,0.2)' : sol.estado === 'rechazado' ? 'rgba(239,68,68,0.2)' : 'rgba(6,182,212,0.2)',
                        color: sol.estado === 'aceptado' ? '#34d399' : sol.estado === 'rechazado' ? '#f87171' : '#38bdf8'
                      }}>
                        {sol.estado === 'aceptado' ? 'Vinculado ✅' : sol.estado === 'rechazado' ? 'Rechazado' : 'En revisión ⏳'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para Solicitar Asociación de Producto */}
      {modalAsociar && (
        <div onClick={() => setModalAsociar(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 440, padding: 24, background: '#0f172a', color: '#fff', border: '1px solid #06b6d4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 18, fontWeight: 800, color: '#06b6d4' }}>
                Asociar Servicio Adquirido
              </h3>
              <button onClick={() => setModalAsociar(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <p style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 16, lineHeight: 1.5 }}>
              Selecciona el servicio que adquiriste con nosotros para vincularlo a tu cuenta y ver tus días restantes de suscripción.
            </p>

            <form onSubmit={enviarSolicitudAsociacion} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>1. Servicio adquirido *</label>
                <select value={prodAsociarId} onChange={e => setProdAsociarId(e.target.value)} style={{ width: '100%', fontSize: 13 }}>
                  <option value="">-- Selecciona el producto / servicio --</option>
                  {todosProductos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                  2. Correo de la cuenta o WhatsApp con el que compraste (Opcional)
                </label>
                <input
                  value={correoRef}
                  onChange={e => setCorreoRef(e.target.value)}
                  placeholder="Ej: otrocorreo@gmail.com o 987654321"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" onClick={() => setModalAsociar(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={enviandoSol} className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                  <CheckCircle size={15} /> {enviandoSol ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
