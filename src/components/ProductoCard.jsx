import { useState } from 'react'
import { ShoppingCart, Plus, Package, X, ShieldCheck } from 'lucide-react'
import { useCarrito } from '../store'
import toast from 'react-hot-toast'

export default function ProductoCard({ producto }) {
  const agregar = useCarrito(s => s.agregar)
  const [modalAbierto, setModalAbierto] = useState(false)

  function handleAgregar(e) {
    e.stopPropagation()
    if (producto.stock < 1) return toast.error('Sin cupos disponibles')
    agregar(producto)
    toast.success(`${producto.nombre} agregado`, { icon: '🚀' })
  }

  const sinStock = producto.stock < 1
  const colorAcento = '#06b6d4'

  return (
    <>
      {/* Card */}
      <div className="card"
        onClick={() => setModalAbierto(true)}
        style={{
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s', cursor: 'pointer',
          background: 'rgba(30, 41, 59, 0.85)',
          border: '1px solid rgba(124, 58, 237, 0.35)',
          color: '#f8fafc'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-3px)'
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)'
          e.currentTarget.style.borderColor = '#06b6d4'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'var(--sombra)'
          e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.35)'
        }}>

        <div style={{ aspectRatio: '1', background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
          {producto.imagen_url ? (
            <img src={producto.imagen_url} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
              <Package size={48} />
            </div>
          )}
          {sinStock && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="badge badge-rojo">Agotado</span>
            </div>
          )}
          {producto.precio_oferta && (
            <span className="badge badge-naranja" style={{
              position: 'absolute', top: 8, left: 8,
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              color: '#fff'
            }}>
              Oferta
            </span>
          )}
        </div>

        <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', lineHeight: 1.3, flex: 1 }}>
            {producto.nombre}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8' }}>
            ⚡ Plan: {producto.unidad}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <div>
              {producto.precio_oferta ? (
                <div>
                  <span style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 17, color: colorAcento }}>
                    S/ {Number(producto.precio_oferta).toFixed(2)}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b', textDecoration: 'line-through', marginLeft: 5 }}>
                    S/ {Number(producto.precio).toFixed(2)}
                  </span>
                </div>
              ) : (
                <span style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 17, color: colorAcento }}>
                  S/ {Number(producto.precio).toFixed(2)}
                </span>
              )}
            </div>
            <button onClick={handleAgregar} disabled={sinStock}
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: sinStock ? 'var(--borde)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.18s', flexShrink: 0, border: 'none', cursor: sinStock ? 'not-allowed' : 'pointer'
              }}>
              <Plus size={18} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: producto.stock <= producto.stock_minimo ? '#f59e0b' : '#94a3b8' }}>
            Cupos: {producto.stock} {producto.stock <= producto.stock_minimo && producto.stock > 0 ? '🔥 Últimos cupos' : ''}
          </p>
        </div>
      </div>

      {/* Modal detalle servicio */}
      {modalAbierto && (
        <div
          onClick={() => setModalAbierto(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div
            onClick={e => e.stopPropagation()}
            className="card"
            style={{
              width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20,
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid rgba(6, 182, 212, 0.4)'
            }}>

            {/* Imagen grande */}
            <div style={{ position: 'relative', background: '#020617', borderRadius: '20px 20px 0 0', overflow: 'hidden', aspectRatio: '4/3' }}>
              {producto.imagen_url ? (
                <img src={producto.imagen_url} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={80} color="var(--borde)" />
                </div>
              )}
              <button onClick={() => setModalAbierto(false)}
                style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <X size={18} />
              </button>
              {producto.precio_oferta && (
                <span className="badge badge-naranja" style={{ position: 'absolute', top: 12, left: 12, fontSize: 13, padding: '4px 12px', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff' }}>Oferta</span>
              )}
              {sinStock && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="badge badge-rojo" style={{ fontSize: 15, padding: '8px 20px' }}>Sin cupos</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ padding: '20px 22px' }}>
              <h2 style={{ fontFamily: 'var(--fuente-display)', fontSize: 22, fontWeight: 800, marginBottom: 6, lineHeight: 1.2 }}>{producto.nombre}</h2>

              {producto.descripcion && (
                <p style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 12, lineHeight: 1.5 }}>{producto.descripcion}</p>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 12, background: '#1e293b', padding: '4px 12px', borderRadius: 20, color: '#38bdf8' }}>
                  ⚡ Duración / Plan: {producto.unidad}
                </span>
                <span className={`badge ${producto.stock > producto.stock_minimo ? 'badge-verde' : producto.stock > 0 ? 'badge-naranja' : 'badge-rojo'}`}
                  style={{ fontSize: 12, padding: '4px 12px' }}>
                  {producto.stock > 0 ? `Cupos: ${producto.stock}` : 'Agotado'}
                </span>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', fontSize: 12, color: '#a7f3d0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="#10b981" />
                <span>¡Adquiere primero en tu correo y luego realiza el pago! 100% seguro.</span>
              </div>

              {/* Precio */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontFamily: 'var(--fuente-display)', fontSize: 32, fontWeight: 800, color: colorAcento }}>
                  S/ {Number(producto.precio_oferta || producto.precio).toFixed(2)}
                </span>
                {producto.precio_oferta && (
                  <span style={{ fontSize: 16, color: '#64748b', textDecoration: 'line-through' }}>
                    S/ {Number(producto.precio).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Botón agregar */}
              <button onClick={handleAgregar} disabled={sinStock} className="btn-primary"
                style={{
                  width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16, borderRadius: 12, gap: 10,
                  opacity: sinStock ? 0.6 : 1,
                  background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                  border: 'none'
                }}>
                <ShoppingCart size={20} />
                {sinStock ? 'Agotado temporalmente' : 'Agregar servicio al carrito'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
