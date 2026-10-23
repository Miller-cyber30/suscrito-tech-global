import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCarrito, useAuth } from '../store'
import Navbar from '../components/Navbar'
import { Trash2, Plus, Minus, ShoppingCart, MessageCircle, ChevronLeft, Package, Cpu, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const WA_SUSCRITECH = '51924545856'

export default function Carrito() {
  const { items, quitar, cambiarCantidad, limpiar, total } = useCarrito()
  const { usuario, perfil } = useAuth()
  const navigate = useNavigate()

  const [nombre, setNombre]                     = useState('')
  const [correoActivacion, setCorreoActivacion] = useState('')
  const [telefono, setTelefono]                 = useState('')
  const [enviando, setEnviando]                 = useState(false)

  useEffect(() => {
    if (perfil) {
      setNombre(perfil.nombre || '')
      setTelefono(perfil.telefono || '')
      setCorreoActivacion(perfil.email || usuario?.email || '')
    } else if (usuario) {
      setCorreoActivacion(usuario.email || '')
    }
  }, [perfil, usuario])

  const totalActual = total()

  // Determina si al menos un producto en el carrito exige correo de activación
  const algunoPideCorreo = items.some(i => i.pide_correo !== false)

  async function handleComprar() {
    if (items.length === 0) return

    // Opcionales por completo: ya no se exige login obligatorio para mandar mensaje a WhatsApp
    if (algunoPideCorreo && !correoActivacion.trim()) {
      toast.error('Hay servicios en tu carrito que requieren el correo donde se activarán ✉️')
      return
    }

    setEnviando(true)
    try {
      await supabase.from('pedidos').insert({
        nombre_cliente:   nombre.trim() || 'Cliente Web',
        telefono_cliente: telefono.trim() || null,
        tipo_entrega:     'digital',
        direccion:        correoActivacion.trim() || 'No requerido',
        referencia:       'Tienda Virtual SuscriTech Global',
        items: items.map(i => ({
          id: i.id,
          nombre: i.nombre,
          precio: i.precio,
          cantidad: i.cantidad,
          subtotal: i.precio * i.cantidad,
          imagen_url: i.imagen_url || null
        })),
        total: totalActual,
        estado: 'pendiente'
      })

      const lineas = items.map(i => `• ${i.nombre} x${i.cantidad} = S/ ${(i.precio * i.cantidad).toFixed(2)}`).join('\n')

      const msg =
        `¡Hola *SuscriTech Global*! 🚀 Deseo adquirir los siguientes servicios:\n\n` +
        (nombre ? `👤 *Cliente:* ${nombre}\n` : '') +
        (correoActivacion && algunoPideCorreo ? `✉️ *Correo a activar:* ${correoActivacion}\n` : '') +
        (telefono ? `📱 *WhatsApp:* ${telefono}\n\n` : '\n') +
        `⚡ *Servicios solicitados:*\n${lineas}\n\n` +
        `💰 *Total a pagar: S/ ${totalActual.toFixed(2)}*\n\n` +
        `Quedo atento(a) para realizar el pago y la activación.`

      limpiar()
      toast.success('¡Pedido registrado! Abriendo WhatsApp...')
      setTimeout(() => window.open(`https://wa.me/${WA_SUSCRITECH}?text=${encodeURIComponent(msg)}`, '_blank'), 800)
    } catch (e) {
      toast.error('Error: ' + e.message)
    }
    setEnviando(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top right, #1e1b4b, #0f172a 60%, #020617)', color: '#f8fafc' }}>
      <Navbar />
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>

        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', marginBottom: 20, textDecoration: 'none' }}>
          <ChevronLeft size={16} /> Seguir viendo servicios
        </Link>

        <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 26, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Cpu size={28} color="#06b6d4" /> Tu Carrito Digital<span style={{ color: '#7c3aed' }}>.</span>
        </h1>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <ShoppingCart size={56} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <p style={{ fontSize: 16, color: '#94a3b8', marginBottom: 20 }}>Tu carrito está vacío</p>
            <Link to="/" className="btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none', textDecoration: 'none' }}>
              Ver catálogo de servicios
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(item => (
                <div key={item.cartId || item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(30, 41, 59, 0.85)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#fff' }}>
                  {item.imagen_url
                    ? <img src={item.imagen_url} alt={item.nombre} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--fondo)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Package size={24} color="var(--borde)" /></div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</p>
                    <p style={{ fontSize: 12, color: '#38bdf8' }}>Plan: {item.unidad}</p>
                    <p style={{ fontSize: 13, color: '#06b6d4', fontWeight: 700 }}>S/ {Number(item.precio).toFixed(2)} c/u</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => cambiarCantidad(item.id, item.cantidad - 1)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--fondo)', border: '1px solid var(--borde)', color: 'var(--texto)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
                    <span style={{ fontSize: 14, fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.id, item.cantidad + 1)} style={{ width: 30, height: 30, borderRadius: 8, background: '#7c3aed', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
                    <p style={{ fontFamily: 'var(--fuente-display)', fontSize: 15, fontWeight: 700 }}>S/ {(item.precio * item.cantidad).toFixed(2)}</p>
                  </div>
                  <button onClick={() => quitar(item.id)} className="btn-danger" style={{ padding: '6px', flexShrink: 0 }}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>

            {/* Datos Opcionales del cliente */}
            <div className="card" style={{ padding: '20px', background: 'rgba(30, 41, 59, 0.85)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#fff' }}>
              <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
                Datos Opcionales (para agilizar tu pedido)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: 'block' }}>Tu Nombre (opcional)</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="¿Cómo te llamamos?" />
                </div>
                {algunoPideCorreo && (
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, display: 'block', color: '#06b6d4' }}>
                      ✉️ Correo electrónico donde activaremos tu cuenta *
                    </label>
                    <input type="email" value={correoActivacion} onChange={e => setCorreoActivacion(e.target.value)} placeholder="tucorreo@gmail.com" />
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: 'block' }}>Tu WhatsApp (opcional)</label>
                  <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Tu número de WhatsApp" type="tel" />
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div className="card" style={{ padding: '20px 24px', background: 'rgba(30, 41, 59, 0.85)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: '#94a3b8' }}>Subtotal</span>
                <span style={{ fontSize: 14 }}>S/ {totalActual.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--borde)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 18 }}>Total</span>
                <span style={{ fontFamily: 'var(--fuente-display)', fontWeight: 800, fontSize: 22, color: '#06b6d4' }}>S/ {totalActual.toFixed(2)}</span>
              </div>

              <button onClick={handleComprar} disabled={enviando} className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, borderRadius: 12, gap: 10, opacity: enviando ? 0.7 : 1, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                <MessageCircle size={18} />
                {enviando ? 'Procesando...' : 'Hablar por WhatsApp y Pedir (924 545 856)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
