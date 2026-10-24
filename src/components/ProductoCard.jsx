import { useState, useMemo, useEffect } from 'react'
import { ShoppingCart, Plus, Package, X, ShieldCheck, Star } from 'lucide-react'
import { useCarrito } from '../store'
import toast from 'react-hot-toast'

// Corrige "1 meses" -> "1 mes" automáticamente
function normalizarEtiquetaPlan(texto = '') {
  return String(texto).trim().replace(/^1\s+meses$/i, '1 mes')
}

export default function ProductoCard({ producto }) {
  const agregar = useCarrito(s => s.agregar)
  const [modalAbierto, setModalAbierto] = useState(false)

  if (Number(producto.stock) <= 0 || !producto.activo) return null

  const planes = useMemo(() => {
    if (Array.isArray(producto.planes) && producto.planes.length > 0) {
      return [...producto.planes]
        .map(pl => {
          const raw = pl.duracion || (pl.cantidad ? `${pl.cantidad} ${pl.unidad}` : pl.unidad) || producto.unidad || 'Plan Pro'
          return {
            duracion: normalizarEtiquetaPlan(raw),
            precio: Number(pl.precio ?? producto.precio ?? 0)
          }
        })
        .filter(pl => !isNaN(pl.precio) && pl.precio > 0)
        .sort((a, b) => a.precio - b.precio)
    }
    return [{
      duracion: normalizarEtiquetaPlan(producto.unidad || 'Plan Pro'),
      precio: Number(producto.precio_oferta || producto.precio || 0)
    }]
  }, [producto])

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

  return (
    <>
      {/* Tarjeta de Producto Estilo E-Commerce Limpio */}
      <div
        className="card"
        onClick={() => { setPlanSeleccionado(planes[0]); setModalAbierto(true) }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          cursor: 'pointer',
          background: '#0f1523',
          border: '1px solid #1e293b',
          borderRadius: 16,
          color: '#f8fafc',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = '0 14px 30px rgba(6, 182, 212, 0.16)'
          e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'var(--sombra)'
          e.currentTarget.style.borderColor = '#1e293b'
        }}>

        <div style={{ aspectRatio: '1', background: '#070a12', position: 'relative', overflow: 'hidden' }}>
          {producto.imagen_url ? (
            <img src={producto.imagen_url} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
              <Package size={48} />
            </div>
          )}
          {tieneVariosPlanes && (
            <span style={{
              position: 'absolute', top: 10, left: 10,
              fontSize: 10.5, fontWeight: 700,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(7, 10, 18, 0.88)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              backdropFilter: 'blur(6px)'
            }}>
              {planes.length} planes disponibles
            </span>
          )}
        </div>

        <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>
            SUSCRITECH PRO
          </span>

          <p style={{
            fontFamily: 'var(--fuente-display)',
            fontSize: 15.5,
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            flex: 1
          }}>
            {producto.nombre}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <div style={{ display: 'flex', color: '#fbbf24' }}>
              {[1, 2, 3, 4, 5].map(n => <Star key={n} size={11} fill="#fbbf24" />)}
            </div>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
              · Plan {planMasEconomico.duracion}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
            <div>
              {tieneVariosPlanes && (
                <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 500, display: 'block', lineHeight: 1, marginBottom: 3 }}>
                  Desde
                </span>
              )}
              <span style={{
                fontFamily: 'var(--fuente-cuerpo)',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: '-0.03em',
                color: '#38bdf8'
              }}>
                S/ {Number(planMasEconomico.precio).toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleClickBotonMas}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)'
              }}>
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Selección de Planes con Tipografía Limpia y Moderna */}
      {modalAbierto && (
        <div
          onClick={() => setModalAbierto(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(3, 6, 14, 0.78)',
            backdropFilter: 'blur(6px)',
            zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
          }}>
          <div
            onClick={e => e.stopPropagation()}
            className="card"
            style={{
              width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', borderRadius: 22,
              background: '#0b101d',
              color: '#f8fafc',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)'
            }}>

            {/* Imagen Superior */}
            <div style={{ position: 'relative', background: '#05070e', borderRadius: '22px 22px 0 0', overflow: 'hidden', aspectRatio: '4/3' }}>
              {producto.imagen_url ? (
                <img src={producto.imagen_url} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={72} color="#334155" />
                </div>
              )}
              <button onClick={() => setModalAbierto(false)}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(7, 10, 18, 0.75)', border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '22px 24px' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#38bdf8', display: 'block', marginBottom: 4 }}>
                SUSCRIPCIÓN DIGITAL VERIFICADA
              </span>

              <h2 style={{
                fontFamily: 'var(--fuente-display)',
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                marginBottom: 8,
                lineHeight: 1.2,
                color: '#ffffff'
              }}>
                {producto.nombre}
              </h2>

              {producto.descripcion && (
                <p style={{ fontSize: 13.5, color: '#94a3b8', marginBottom: 18, lineHeight: 1.55 }}>
                  {producto.descripcion}
                </p>
              )}

              {/* Selector de Planes */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: 10 }}>
                  {tieneVariosPlanes ? '⚡ Elige el plan que deseas adquirir:' : '⚡ Plan disponible:'}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: planes.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 10
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
                          transition: 'all 0.16s ease',
                          border: activo ? '2px solid #06b6d4' : '1px solid #1e293b',
                          background: activo
                            ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.28), rgba(6, 182, 212, 0.18))'
                            : '#131b2e',
                          color: '#fff',
                          boxShadow: activo ? '0 6px 18px rgba(6, 182, 212, 0.18)' : 'none'
                        }}>
                        <p style={{ fontSize: 12.5, fontWeight: 600, color: activo ? '#f8fafc' : '#94a3b8' }}>
                          {pl.duracion}
                        </p>
                        <p style={{
                          fontFamily: 'var(--fuente-cuerpo)',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: 18,
                          fontWeight: 800,
                          letterSpacing: '-0.02em',
                          color: activo ? '#38bdf8' : '#e2e8f0',
                          marginTop: 4
                        }}>
                          S/ {Number(pl.precio).toFixed(2)}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{
                padding: '11px 14px', borderRadius: 12,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                fontSize: 12.5, color: '#a7f3d0', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <ShieldCheck size={18} color="#10b981" style={{ flexShrink: 0 }} />
                <span>¡Adquiere primero y luego realiza el pago! Entrega inmediata y 100% segura.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 2 }}>
                    Plan seleccionado: <b style={{ color: '#f8fafc' }}>{planSeleccionado?.duracion}</b>
                  </span>
                  <span style={{
                    fontFamily: 'var(--fuente-cuerpo)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 32,
                    fontWeight: 800,
                    letterSpacing: '-0.035em',
                    color: '#38bdf8'
                  }}>
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
                  border: 'none',
                  fontVariantNumeric: 'tabular-nums'
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
