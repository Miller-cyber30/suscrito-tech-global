import { useState } from 'react'
import { ShoppingCart, Plus, Package, X, ShieldCheck } from 'lucide-react'
import { useCarrito } from '../store'
import toast from 'react-hot-toast'

export default function ProductoCard({ producto }) {
  const agregar = useCarrito(s => s.agregar)
  const [modalAbierto, setModalAbierto] = useState(false)

  // Ocultar de la tienda si el stock llega a 0
  if (producto.stock < 1) return null

  // Planes múltiples simulados o configurables (ej. Canva Pro: 3m S/3, 6m S/5, 12m S/8)
  const planesDisponibles = [
    { meses: 3, precio: Number(producto.precio) || 3.00, label: '3 Meses' },
    { meses: 6, precio: (Number(producto.precio) || 3.00) + 2.00, label: '6 Meses' },
    { meses: 12, precio: (Number(producto.precio) || 3.00) + 5.00, label: '12 Meses' }
  ]

  const [planSeleccionado, setPlanSeleccionado] = useState(planesDisponibles[0])

  function handleAgregar(e) {
    e.stopPropagation()
    const itemAAgregar = {
      ...producto,
      precio: planSeleccionado.precio,
      unidad: `${planSeleccionado.meses} meses`,
      idUnicoPlan: `${producto.id}_${planSeleccionado.meses}`
    }
    agregar(itemAAgregar)
    toast.success(`${producto.nombre} (${planSeleccionado.label}) agregado`, { icon: '🚀' })
  }

  const colorAcento = '#06b6d4'

  return (
    <>
      <div className="card"
        onClick={() => setModalAbierto(true)}
        style={{
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s', cursor: 'pointer',
          background: 'rgba(30, 41, 59, 0.85)',
          border: '1px solid rgba(124, 58, 237, 0.35)',
          color: '#f8fafc'
        }}>

        <div style={{ aspectRatio: '1', background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
          {producto.imagen_url ? (
            <img src={producto.imagen_url} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
              <Package size={48} />
            </div>
          )}
        </div>

        <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', lineHeight: 1.3, flex: 1 }}>
            {producto.nombre}
          </p>

          {/* Selector rápido de planes en la tarjeta */}
          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
            {planesDisponibles.map(plan => (
              <button key={plan.meses} type="button"
                onClick={() => setPlanSeleccionado(plan)}
                style={{
                  flex: 1, padding: '4px 2px', fontSize: 10, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                  border: planSeleccionado.meses === plan.meses ? '1px solid #06b6d4' : '1px solid var(--borde)',
                  background: planSeleccionado.meses === plan.meses ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                  color: planSeleccionado.meses === plan.meses ? '#38bdf8' : '#94a3b8'
                }}>
                {plan.meses}m
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 17, color: colorAcento }}>
              S/ {planSeleccionado.precio.toFixed(2)}
            </span>
            <button onClick={handleAgregar}
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer'
              }}>
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Detalle y Selección de Planes */}
      {modalAbierto && (
        <div onClick={() => setModalAbierto(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(6, 182, 212, 0.4)' }}>
            
            <div style={{ position: 'relative', background: '#020617', borderRadius: '20px 20px 0 0', overflow: 'hidden', aspectRatio: '4/3' }}>
              {producto.imagen_url ? (
                <img src={producto.imagen_url} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={80} color="var(--borde)" /></div>
              )}
              <button onClick={() => setModalAbierto(false)} style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <h2 style={{ fontFamily: 'var(--fuente-display)', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{producto.nombre}</h2>
              <p style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 16 }}>{producto.descripcion || 'Entrega inmediata en tu cuenta o correo personal.'}</p>

              <label style={{ fontSize: 12, fontWeight: 700, color: '#06b6d4', display: 'block', marginBottom: 8 }}>Selecciona tu plan:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                {planesDisponibles.map(plan => (
                  <button key={plan.meses} type="button" onClick={() => setPlanSeleccionado(plan)}
                    style={{
                      padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                      border: planSeleccionado.meses === plan.meses ? '2px solid #06b6d4' : '1px solid var(--borde)',
                      background: planSeleccionado.meses === plan.meses ? 'rgba(6, 182, 212, 0.2)' : '#1e293b',
                      color: '#fff'
                    }}>
                    <p style={{ fontSize: 12, fontWeight: 700 }}>{plan.label}</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>S/ {plan.precio.toFixed(2)}</p>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontFamily: 'var(--fuente-display)', fontSize: 28, fontWeight: 800, color: colorAcento }}>
                  S/ {planSeleccionado.precio.toFixed(2)}
                </span>
              </div>

              <button onClick={handleAgregar} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16, borderRadius: 12, gap: 10, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                <ShoppingCart size={20} /> Agregar plan al carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
