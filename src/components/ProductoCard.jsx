import { useState, useMemo, useEffect } from 'react'
import { ShoppingCart, Plus, Package, X, ShieldCheck } from 'lucide-react'
import { useCarrito } from '../store'
import toast from 'react-hot-toast'

export default function ProductoCard({ producto }) {
  const agregar = useCarrito(s => s.agregar)
  const [modalAbierto, setModalAbierto] = useState(false)

  // Si el stock baja a 0 o está inactivo, desaparece automáticamente de la tienda
  if (Number(producto.stock) <= 0 || !producto.activo) return null

  // Ordena siempre los planes del menor precio al mayor precio
  const planes = useMemo(() => {
    if (Array.isArray(producto.planes) && producto.planes.length > 0) {
      return [...producto.planes]
        .map(pl => ({
          duracion: pl.duracion || (pl.cantidad ? `${pl.cantidad} ${pl.unidad}` : pl.unidad) || producto.unidad || 'Plan Pro',
          precio: Number(pl.precio ?? producto.precio ?? 0)
        }))
        .filter(pl => !isNaN(pl.precio) && pl.precio > 0)
        .sort((a, b) => a.precio - b.precio)
    }
    return [{
      duracion: producto.unidad || 'Plan Pro',
      precio: Number(producto.precio_oferta || producto.precio || 0)
    }]
  }, [producto])

  // Por defecto siempre queda seleccionado el plan de menor costo (planes[0])
  const [planSeleccionado, setPlanSeleccionado] = useState(planes[0])

  useEffect(() => {
    setPlanSeleccionado(planes[0])
  }, [planes])

  const tieneVariosPlanes = planes.length > 1
  const planMasEconomico = planes[0]

  function handleAgregarPlan(plan = planSeleccionado, cerrarModal = false) {
    const itemCarrito = {
      ...producto,
      nombre: tieneVariosPlanes ? `${producto.nombre} (${plan.duracion})` : producto.nombre,
      precio: Number(plan.precio),
      unidad: plan.duracion,
      pide_correo: producto.pide_correo !== false,
      cartKey: `${producto.id}_${plan.duracion}`
    }
    agregar(itemCarrito)
    toast.success(`${itemCarrito.nombre} agregado al carrito`, { icon: '🚀' })
    if (cerrarModal) setModalAbierto(false)
  }

  function handleClickBotonMas(e) {
    e.stopPropagation()
    if (tieneVariosPlanes) {
      setPlanSeleccionado(planes[0])
      setModalAbierto(true)
    } else {
      handleAgregarPlan(planes[0], false)
    }
  }

  const colorAcento = '#06b6d4'

  return (
    <>
      {/* Tarjeta en la página principal (Muestra el menor costo para captar clientes) */}
      <div
        className="card"
        onClick={() => { setPlanSeleccionado(planes[0]); setModalAbierto(true) }}
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
          {tieneVariosPlanes && (
            <span style={{
              position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 700,
              padding: '3px 9px', borderRadius: 20,
              background: 'rgba(15, 23, 42, 0.88)', color: '#38bdf8',
              border: '1px solid rgba(6, 182, 212, 0.45)'
            }}>
              {planes.length} planes disponibles
            </span>
          )}
        </div>

        <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', lineHeight: 1.3, flex: 1 }}>
            {producto.nombre}
          </p>

          <p style={{ fontSize: 11, color: '#94a3b8' }}>
            ⚡ Plan: {planMasEconomico.duracion}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <div>
              {tieneVariosPlanes && (
                <span style={{ fontSize: 10, color: '#94a3b8', display: 'block', lineHeight: 1 }}>Desde</span>
              )}
              <span style={{ fontFamily: 'var(--fuente-display)', fontWeight: 800, fontSize: 18, color: colorAcento }}>
                S/ {Number(planMasEconomico.precio).toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleClickBotonMas}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: 'none', cursor: 'pointer'
              }}>
              <Plus size={19} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal al abrir el producto: permite elegir entre todos los planes configurados */}
      {modalAbierto && (
        <div
          onClick={() => setModalAbierto(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div
            onClick={e => e.stopPropagation()}
            className="card"
            style={{
              width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20,
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
                style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <h2 style={{ fontFamily: 'var(--fuente-display)', fontSize: 22, fontWeight: 800, marginBottom: 6, lineHeight: 1.2 }}>
                {producto.nombre}
              </h2>

              {producto.descripcion && (
                <p style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 14, lineHeight: 1.5 }}>
                  {producto.descripcion}
                </p>
              )}

              {/* Selector de Planes (1, 2, 3, 4 o más) */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#06b6d4', display: 'block', marginBottom: 8 }}>
                  {tieneVariosPlanes ? '⚡ Elige el plan que deseas adquirir:' : '⚡ Plan disponible:'}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: planes.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(125px, 1fr))',
                  gap: 8
                }}>
                  {planes.map((pl, idx) => {
                    const activo = planSeleccionado?.duracion === pl.duracion && Number(planSeleccionado?.precio) === Number(pl.precio)
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPlanSeleccionado(pl)}
                        style={{
                          padding: '12px 10px',
                          borderRadius: 12,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s',
                          border: activo ? '2px solid #06b6d4' : '1px solid #334155',
                          background: activo
                            ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(6, 182, 212, 0.22))'
                            : '#1e293b',
                          color: '#fff',
                          boxShadow: activo ? '0 4px 14px rgba(6, 182, 212, 0.2)' : 'none'
                        }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: activo ? '#fff' : '#cbd5e1' }}>
                          {pl.duracion}
                        </p>
                        <p style={{ fontSize: 17, fontWeight: 800, color: '#38bdf8', marginTop: 3 }}>
                          S/ {Number(pl.precio).toFixed(2)}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', fontSize: 12, color: '#a7f3d0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="#10b981" style={{ flexShrink: 0 }} />
                <span>¡Adquiere primero y luego realiza el pago! Entrega inmediata y 100% segura.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#94a3b8', display: 'block' }}>
                    Plan seleccionado: <b style={{ color: '#fff' }}>{planSeleccionado?.duracion}</b>
                  </span>
                  <span style={{ fontFamily: 'var(--fuente-display)', fontSize: 30, fontWeight: 800, color: colorAcento }}>
                    S/ {Number(planSeleccionado?.precio || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleAgregarPlan(planSeleccionado, true)}
                className="btn-primary"
                style={{
                  width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, borderRadius: 12, gap: 10,
                  background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                  border: 'none'
                }}>
                <ShoppingCart size={19} />
                Agregar al carrito · S/ {Number(planSeleccionado?.precio || 0).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
