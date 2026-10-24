import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Cpu, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [nombre, setNombre]               = useState('')
  const [telefono, setTelefono]           = useState('')
  const [verPass, setVerPass]             = useState(false)

  // Modos: 'login' | 'registro' | 'recuperar' | 'nueva_pass'
  const [modo, setModo]                   = useState('login')
  const [nuevaPass, setNuevaPass]         = useState('')
  const [confirmarPass, setConfirmarPass] = useState('')
  const [cargando, setCargando]           = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    // Detecta si el usuario acaba de abrir el link de recuperación desde su correo
    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash || ''
    if (params.get('reset') === 'true' || hash.includes('type=recovery')) {
      setModo('nueva_pass')
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setModo('nueva_pass')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()

    // 1. ENVIAR LINK DE RECUPERACIÓN AL CORREO
    if (modo === 'recuperar') {
      if (!email.trim()) return toast.error('Ingresa tu correo electrónico')
      setCargando(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login?reset=true`
      })
      setCargando(false)
      if (error) return toast.error('Error al enviar correo: ' + error.message)
      toast.success('¡Te enviamos el enlace de recuperación! Revisa tu correo (y la carpeta de Spam) 📩', { duration: 6000 })
      setModo('login')
      return
    }

    // 2. GUARDAR LA NUEVA CONTRASEÑA TRAS ABRIR EL LINK DEL CORREO
    if (modo === 'nueva_pass') {
      if (nuevaPass.length < 6) return toast.error('La nueva contraseña debe tener al menos 6 caracteres')
      if (nuevaPass !== confirmarPass) return toast.error('Las contraseñas no coinciden')

      setCargando(true)
      const { error } = await supabase.auth.updateUser({
        password: nuevaPass
      })
      setCargando(false)

      if (error) return toast.error('Error al actualizar contraseña: ' + error.message)

      toast.success('¡Contraseña actualizada con éxito! 🎉')
      navigate('/mi-cuenta')
      return
    }

    // 3. LOGIN Y REGISTRO NORMAL
    if (!email || !password) return toast.error('Completa todos los campos')
    setCargando(true)

    if (modo === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) { setCargando(false); return toast.error('Correo o contraseña incorrectos') }
      toast.success('¡Bienvenido a SuscriTech Global!')
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('perfiles').upsert({
        id: user.id,
        email: user.email
      }, { onConflict: 'id' })

      const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
      if (perfil?.rol === 'admin') navigate('/admin')
      else if (perfil?.rol === 'vendedor') navigate('/vendedor')
      else navigate('/')
    } else {
      if (!nombre.trim()) { setCargando(false); return toast.error('Escribe tu nombre') }
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { nombre: nombre.trim(), telefono: telefono.trim() } }
      })
      if (error) { setCargando(false); return toast.error(error.message) }

      if (signUpData?.user) {
        await supabase.from('perfiles').upsert({
          id: signUpData.user.id,
          nombre: nombre.trim(),
          email: email.trim(),
          telefono: telefono.trim() || null,
          rol: 'comprador',
          recibir_alertas: true
        })
      }

      toast.success('¡Cuenta creada con éxito! Ya puedes ingresar 🎉')
      setModo('login')
    }
    setCargando(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #1e1b4b, #090d16 70%)',
      color: '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)'
          }}>
            <Cpu size={28} color="white" />
          </div>
          <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 26, fontWeight: 800 }}>
            SuscriTech Global<span style={{ color: '#06b6d4' }}>.</span>
          </h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
            {modo === 'login' && 'Ingresa a tu cuenta para gestionar tus pedidos y suscripciones'}
            {modo === 'registro' && 'Crea tu cuenta gratis en segundos'}
            {modo === 'recuperar' && 'Ingresa tu correo y te enviaremos un enlace para cambiar tu contraseña'}
            {modo === 'nueva_pass' && 'Escribe tu nueva contraseña para recuperar el acceso'}
          </p>
        </div>

        <div className="card" style={{
          padding: '28px 24px',
          background: 'rgba(30, 41, 59, 0.9)',
          border: '1px solid rgba(124, 58, 237, 0.4)',
          color: '#fff'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>

            {modo === 'registro' && (
              <>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Nombre completo *</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre y apellido" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>WhatsApp (para avisos de renovación)</label>
                  <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: 987654321" />
                </div>
              </>
            )}

            {modo !== 'nueva_pass' && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                  <Mail size={13} style={{ display: 'inline', marginRight: 5, color: '#06b6d4' }} />
                  Correo electrónico *
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
              </div>
            )}

            {(modo === 'login' || modo === 'registro') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500 }}>Contraseña *</label>
                  {modo === 'login' && (
                    <button
                      type="button"
                      onClick={() => setModo('recuperar')}
                      style={{ background: 'none', border: 'none', fontSize: 12, color: '#06b6d4', cursor: 'pointer', fontWeight: 600 }}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input type={verPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setVerPass(!verPass)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--texto-suave)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {modo === 'nueva_pass' && (
              <>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block', color: '#06b6d4' }}>
                    <Lock size={14} style={{ display: 'inline', marginRight: 5 }} />
                    Nueva contraseña *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={verPass ? 'text' : 'password'}
                      value={nuevaPass}
                      onChange={e => setNuevaPass(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      style={{ paddingRight: 42 }}
                    />
                    <button type="button" onClick={() => setVerPass(!verPass)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--texto-suave)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Confirmar nueva contraseña *</label>
                  <input
                    type={verPass ? 'text' : 'password'}
                    value={confirmarPass}
                    onChange={e => setConfirmarPass(e.target.value)}
                    placeholder="Repite tu nueva contraseña"
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn-primary" disabled={cargando}
              style={{
                width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 4, borderRadius: 10,
                opacity: cargando ? 0.7 : 1,
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                border: 'none'
              }}>
              {cargando
                ? 'Procesando...'
                : modo === 'login'
                ? 'Ingresar'
                : modo === 'registro'
                ? 'Crear mi cuenta'
                : modo === 'recuperar'
                ? 'Enviar enlace de recuperación'
                : 'Guardar nueva contraseña'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {modo === 'login' || modo === 'registro' ? (
            <button onClick={() => setModo(modo === 'login' ? 'registro' : 'login')}
              style={{ background: 'none', border: 'none', fontSize: 13, color: '#06b6d4', fontWeight: 600, cursor: 'pointer' }}>
              {modo === 'login' ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          ) : (
            <button onClick={() => setModo('login')}
              style={{ background: 'none', border: 'none', fontSize: 13, color: '#06b6d4', fontWeight: 600, cursor: 'pointer' }}>
              ← Volver a Iniciar sesión
            </button>
          )}
          <Link to="/" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none' }}>← Volver al catálogo</Link>
        </div>

      </div>
    </div>
  )
}
