import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store'
import Navbar from '../components/Navbar'
import { Camera, Clock, RefreshCw, Save, PlusCircle, X, CheckCircle, Link2, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

// Formatea cualquier fecha siempre como DD/MM/AAAA (año al final)
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

  const [passActual, setPassActual]           = useState('')
  const [passNueva, setPassNueva]             = useState('')
  const [passConfirmar, setPassConfirmar]     = useState('')
  const [verPasswords, setVerPasswords]       = useState(false)
  const [cambiandoPass, setCambiandoPass]     = useState(false)

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
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `perfiles/user_${usuario.id}_${Date.now()}.${ext}`
      const { error: errUp } = await supabase.storage.from('imagenes').upload(path, file, { upsert: true })
      if (errUp) throw errUp

      const { data: pub } = supabase.storage.from('imagenes').getPublicUrl(path)
      const nuevaUrl = pub.publicUrl
      setAvatarUrl(nuevaUrl)

      const { data: perfilActualizado, error: errPerfil } = await supabase
        .from('perfiles')
        .upsert({
          id: usuario.id,
          email: usuario.email,
          nombre: nombre || perfil?.nombre || usuario.email.split('@')[0],
          telefono: telefono || perfil?.telefono || null,
          avatar_url: nuevaUrl,
          recibir_alertas: recibirAlertas
        }, { onConflict: 'id' })
        .select()
        .single()

      if (errPerfil) throw errPerfil
      setPerfil(perfilActualizado)
      toast.success('¡Foto de perfil actualizada! ✅')
    } catch (err) {
      toast.error('Error al subir: ' + err.message)
    }
    setSubiendo(false)
  }

  async function guardarPerfil() {
    if (!usuario) return
    setGuardando(true)
    const payload = {
      id: usuario.id,
      nombre,
      telefono,
      email: usuario.email,
      avatar_url: avatarUrl,
      recibir_alertas: recibirAlertas
    }
    const { data, error } = await supabase
      .from('perfiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      toast.error('Error: ' + error.message)
      setGuardando(false)
      return
    }
    setPerfil(data)
    toast.success('¡Tu cuenta ha sido actualizada! ✅')
    setGuardando(false)
  }

  async function handleCambiarPassword(e) {
    e.preventDefault()
    if (!passActual) return toast.error('Ingresa tu contraseña anterior')
    if (passNueva.length < 6) return toast.error('La nueva contraseña debe tener al menos 6 caracteres')
    if (passNueva !== passConfirmar) return toast.error('La nueva contraseña y la confirmación no coinciden')

    setCambiandoPass(true)
    try {
      const { error: errCheck } = await supabase.auth.signInWithPassword({
        email: usuario.email,
        password: passActual
      })
      if (errCheck) {
        setCambiandoPass(false)
        return toast.error('Tu contraseña anterior es incorrecta ❌')
      }

      const { error: errUpd } = await supabase.auth.updateUser({
        password: passNueva
      })
      if (errUpd) throw errUpd

      toast.success('¡Contraseña actualizada correctamente! 🔐')
      setPassActual('')
      setPassNueva('')
      setPassConfirmar('')
    } catch (err) {
      toast.error('Error al cambiar contraseña: ' + err.message)
    }
    setCambiandoPass(false)
  }

  const diasRestantes = (fecha) => {
    if (!fecha) return 999
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const venc = new Date(fecha + 'T00:00:00')
    return Math.ceil((venc - hoy) / 86400000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #151934, #070a12 70%)', color: '#f8fafc' }}>
      <Navbar />
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 16px' }}>
        <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 28, fontWeight: 800, marginBottom: 22 }}>
          Mi Cuenta y Suscripciones<span style={{ color: '#06b6d4' }}>.</span>
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
          {/* Columna Izquierda: Perfil y Contraseña */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 22, background: '#0f1523', color: '#fff', border: '1px solid #1e293b' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Datos de tu Perfil</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #06b6d4' }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>
                    {(nombre || usuario?.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={subirFoto} style={{ display: 'none' }} />
                  <button onClick={() => fileRef.current.click()} disabled={subiendo} className="btn-ghost" style={{ fontSize: 12, color: '#06b6d4' }}>
                    <Camera size={14} /> {subiendo ? 'Subiendo...' : 'Cambiar foto'}
                  </button>
                  <p style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>{usuario?.email}</p>
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
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#cbd5e1' }}>
                  <input type="checkbox" checked={recibirAlertas} onChange={e => setRecibirAlertas(e.target.checked)} style={{ width: 16, height: 16 }} />
                  Recibir avisos cuando mi servicio esté próximo a vencer
                </label>

                <button onClick={guardarPerfil} disabled={guardando} className="btn-primary" style={{ justifyContent: 'center', marginTop: 6 }}>
                  <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar configuración'}
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: 22, background: '#0f1523', color: '#fff', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={17} color="#06b6d4" /> Actualizar Contraseña
                </h2>
                <button
                  type="button"
                  onClick={() => setVerPasswords(!verPasswords)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  {verPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                  {verPasswords ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              <form onSubmit={handleCambiarPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Contraseña anterior *</label>
                  <input
                    type={verPasswords ? 'text' : 'password'}
                    value={passActual}
                    onChange={e => setPassActual(e.target.value)}
                    placeholder="Escribe tu contraseña actual"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nueva contraseña *</label>
                  <input
                    type={verPasswords ? 'text' : 'password'}
                    value={passNueva}
                    onChange={e => setPassNueva(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Confirmar nueva contraseña *</label>
                  <input
                    type={verPasswords ? 'text' : 'password'}
                    value={passConfirmar}
                    onChange={e => setPassConfirmar(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
                <button
                  type="submit"
                  disabled={cambiandoPass}
                  className="btn-primary"
                  style={{ justifyContent: 'center', marginTop: 4 }}>
                  <Lock size={15} /> {cambiandoPass ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </form>
            </div>
          </div>

          {/* Columna Derecha: Suscripciones con fechas DD/MM/AAAA */}
          <div className="card" style={{ padding: 22, background: '#0f1523', color: '#fff', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="#06b6d4" /> Mis Servicios y Vencimientos
              </h2>
              <button
                onClick={() => setModalAsociar(true)}
                className="btn-primary"
                style={{ fontSize: 11.5, padding: '7px 14px', borderRadius: 999, gap: 5 }}>
                <PlusCircle size={14} /> Asociar producto
              </button>
            </div>

            {misServicios.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px' }}>
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {misServicios.map(s => {
                  const dias = diasRestantes(s.fecha_vencimiento)
                  const porVencer = dias <= 5
                  return (
                    <div key={s.id} style={{ padding: 14, borderRadius: 12, border: `1px solid ${porVencer ? '#ef4444' : '#1e293b'}`, background: porVencer ? 'rgba(239,68,68,0.08)' : '#070a12' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <p style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 15 }}>{s.nombre_producto}</p>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: porVencer ? '#ef4444' : '#10b981', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                          {dias < 0 ? 'Vencido' : `${dias} días restantes`}
                        </span>
                      </div>
                      {s.cliente_correo && (
                        <p style={{ fontSize: 12, color: '#38bdf8', marginTop: 4 }}>
                          ✉️ Cuenta: {s.cliente_correo}
                        </p>
                      )}
                      <p style={{ fontSize: 12, color: '#cbd5e1', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                        📅 Adquirido: <b>{formatearFecha(s.ventas?.created_at)}</b> &nbsp;·&nbsp; ⏳ <b>Vence: {formatearFecha(s.fecha_vencimiento)}</b>
                      </p>
                      <a
                        href={`https://wa.me/51924545856?text=${encodeURIComponent(`¡Hola SuscriTech Global! 🚀 Quiero renovar mi servicio de *${s.nombre_producto}* (${s.cliente_correo || usuario.email})`)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, fontWeight: 700, color: '#06b6d4', textDecoration: 'none' }}>
                        <RefreshCw size={13} /> Solicitar Renovación por WhatsApp →
                      </a>
                    </div>
                  )
                })}
              </div>
            )}

            {misSolicitudes.length > 0 && (
              <div style={{ marginTop: 18, borderTop: '1px solid #1e293b', paddingTop: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
                  Solicitudes de asociación enviadas:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {misSolicitudes.map(sol => (
                    <div key={sol.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: '#070a12', fontSize: 12 }}>
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
        <div onClick={() => setModalAsociar(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 440, padding: 24, background: '#0f1523', color: '#fff', border: '1px solid #06b6d4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 18, fontWeight: 800, color: '#06b6d4' }}>
                Asociar Servicio Adquirido
              </h3>
              <button onClick={() => setModalAsociar(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <p style={{ fontSize: 12.5, color: '#cbd5e1', marginBottom: 16, lineHeight: 1.5 }}>
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
                <button type="submit" disabled={enviandoSol} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
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
