import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import ProductoCard from '../components/ProductoCard'
import Paginador from '../components/Paginador'
import { Package, ShieldCheck, Zap, MessageCircle, Sparkles } from 'lucide-react'

export default function Inicio() {
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [cargando, setCargando] = useState(true)

  const [paginaActual, setPaginaActual] = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(50)

  useEffect(() => {
    setPaginaActual(1)
    setBusqueda('')
    cargar()

    const canal = supabase
      .channel('cambios-suscritech')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' }, () => cargar())
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [])

  async function cargar() {
    setCargando(true)
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categorias').select('*').eq('activo', true).order('orden'),
      supabase.from('productos').select('*').eq('activo', true).gt('stock', 0).order('nombre'),
    ])
    setCategorias((cats || []).filter(c => c.tienda !== 'richard'))
    setProductos((prods || []).filter(p => p.tienda !== 'richard' && Number(p.stock) > 0))
    setCargando(false)
  }

  function handleBuscar(val) {
    setBusqueda(val)
    setPaginaActual(1)
    if (val.trim().length < 2) { setSugerencias([]); setMostrarSugerencias(false); return }
    const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(val.toLowerCase())).slice(0, 6)
    setSugerencias(filtrados)
    setMostrarSugerencias(true)
  }

  const productosFiltrados = busqueda.trim().length > 1
    ? productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos

  const limiteValido = Math.max(1, Number(itemsPorPagina) || 50)
  const productosPaginados = productosFiltrados.slice(
    (paginaActual - 1) * limiteValido,
    paginaActual * limiteValido
  )

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#070a12',
      backgroundImage: `
        radial-gradient(circle at 18% 12%, rgba(124, 58, 237, 0.18), transparent 40%),
        radial-gradient(circle at 82% 25%, rgba(6, 182, 212, 0.15), transparent 45%),
        radial-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 24px 24px',
      color: '#f8fafc'
    }}>
      <Navbar onBuscar={handleBuscar} />

      {/* Sugerencias de búsqueda */}
      {mostrarSugerencias && sugerencias.length > 0 && (
        <div style={{
          position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 500,
          background: '#0f1523',
          color: '#fff',
          borderRadius: 14, border: '1px solid #1e293b', boxShadow: '0 16px 40px rgba(0,0,0,0.45)', zIndex: 200, overflow: 'hidden'
        }}>
          {sugerencias.map(p => (
            <button key={p.id} onClick={() => { setBusqueda(p.nombre); setMostrarSugerencias(false) }}
              style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #1e293b', color: 'inherit' }}>
              {p.imagen_url
                ? <img src={p.imagen_url} alt={p.nombre} style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} />
                : <div style={{ width: 38, height: 38, borderRadius: 8, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="#94a3b8" /></div>
              }
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600 }}>{p.nombre}</p>
                <p style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  Desde S/ {Number(p.precio).toFixed(2)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div onClick={() => setMostrarSugerencias(false)}>
        <div className="page-wrap" style={{ padding: '32px 16px' }}>

          {/* HERO BANNER ESTILO KASSOW ROBOTS / EONIX */}
          {!busqueda && (
            <div style={{
              background: 'linear-gradient(135deg, #0d1220 0%, #17153b 55%, #0b253a 100%)',
              borderRadius: 24,
              padding: 'clamp(28px, 5vw, 52px) clamp(24px, 5vw, 48px)',
              marginBottom: 42,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(124, 58, 237, 0.35)'
            }}>
              {/* Luces ambientales decorativas */}
              <div style={{ position: 'absolute', right: -60, top: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.28), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: '40%', bottom: -90, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124, 58, 237, 0.25), transparent 70%)', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', zIndex: 1, maxWidth: 680 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                  padding: '6px 14px', borderRadius: 999,
                  fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: '#67e8f9', marginBottom: 18
                }}>
                  <Zap size={13} color="#22d3ee" /> ¡Adquiere primero y luego realiza el pago!
                </div>

                <h1 style={{
                  fontFamily: 'var(--fuente-display)',
                  fontSize: 'clamp(30px, 5vw, 50px)',
                  fontWeight: 800,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.08,
                  marginBottom: 14,
                  color: '#ffffff'
                }}>
                  Tecnología y cuentas Pro,<br />
                  <span style={{
                    background: 'linear-gradient(90deg, #a78bfa 0%, #22d3ee 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    al alcance de un clic<span style={{ WebkitTextFillColor: '#06b6d4' }}>.</span>
                  </span>
                </h1>

                <p style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.6, maxWidth: 560, marginBottom: 26, fontWeight: 400 }}>
                  Activa Canva Pro, Google AI, HBO Max y tus plataformas favoritas de forma inmediata. Entrega 100% digital, segura y con soporte garantizado.
                </p>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <a href="https://wa.me/51924545856?text=Hola%20SuscriTech%20Global,%20quiero%20informaci%C3%B3n%20sobre%20los%20servicios%20Pro"
                    target="_blank" rel="noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: '#10b981', color: '#fff',
                      padding: '12px 22px', borderRadius: 999,
                      fontWeight: 700, fontSize: 13.5, textDecoration: 'none',
                      boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
                    }}>
                    <MessageCircle size={17} /> WhatsApp Oficial: 924 545 856
                  </a>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    fontSize: 12.5, fontWeight: 600, color: '#e2e8f0',
                    background: 'rgba(255, 255, 255, 0.07)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    padding: '11px 18px', borderRadius: 999
                  }}>
                    <ShieldCheck size={16} color="#38bdf8" /> Garantía total · Todos los medios de pago
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Categorías */}
          {!busqueda && categorias.length > 0 && (
            <section style={{ marginBottom: 42 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--fuente-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em' }}>
                    Categorías<span style={{ color: '#06b6d4' }}>.</span>
                  </h2>
                  <p style={{ fontSize: 13, color: '#94a3b8' }}>Explora nuestras líneas de suscripciones digitales</p>
                </div>
              </div>
              {cargando ? <div className="spinner" /> : (
                <div className="grid-categorias" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
                  {categorias.map(cat => (
                    <Link key={cat.id} to={`/categoria/${cat.id}`}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        background: '#0f1523',
                        borderRadius: 16,
                        border: '1px solid #1e293b',
                        overflow: 'hidden', transition: 'all 0.2s ease', textAlign: 'center', textDecoration: 'none'
                      }}>
                      <div style={{ width: '100%', aspectRatio: '16/10', background: 'rgba(124, 58, 237, 0.1)', overflow: 'hidden' }}>
                        {cat.imagen_url
                          ? <img src={cat.imagen_url} alt={cat.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Package size={32} color="#06b6d4" />
                            </div>
                        }
                      </div>
                      <div style={{ padding: '12px 10px' }}>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc' }}>{cat.nombre}</p>
                        {cat.descripcion && <p style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{cat.descripcion}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Catálogo de Servicios estilo Falabella + Dark Tech */}
          <section>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--fuente-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {busqueda ? `Resultados para "${busqueda}"` : 'Los más vendidos en Suscripciones'}
                  <span style={{ color: '#06b6d4' }}>.</span>
                </h2>
                <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                  Potencia y entretenimiento digital para tu día a día
                </p>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#94a3b8',
                background: '#0f1523', border: '1px solid #1e293b',
                padding: '6px 12px', borderRadius: 999
              }}>
                {productosFiltrados.length} {productosFiltrados.length === 1 ? 'servicio disponible' : 'servicios disponibles'}
              </span>
            </div>

            {cargando ? <div className="spinner" /> : productosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
                <Package size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>No hay servicios disponibles en este momento</p>
              </div>
            ) : (
              <>
                <div className="grid-productos" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                  {productosPaginados.map(p => <ProductoCard key={p.id} producto={p} />)}
                </div>

                <Paginador
                  totalItems={productosFiltrados.length}
                  itemsPorPagina={itemsPorPagina}
                  setItemsPorPagina={setItemsPorPagina}
                  paginaActual={paginaActual}
                  setPaginaActual={setPaginaActual}
                  esMiller={true}
                />
              </>
            )}
          </section>
        </div>
      </div>

      {/* Footer SuscriTech Global */}
      <footer style={{ background: '#04060b', color: 'white', marginTop: 64, borderTop: '1px solid #1e293b' }}>
        <div className="page-wrap" style={{ padding: '44px 16px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 32, marginBottom: 32 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 19, fontWeight: 800, marginBottom: 12 }}>
                SuscriTech Global<span style={{ color: '#06b6d4' }}>.</span>
              </h3>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
                Tu plataforma de confianza para suscripciones y cuentas digitales Pro. ¡Adquiere primero y luego realiza el pago con total seguridad!
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Servicios Destacados
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {['Canva Pro (3, 6 y 12 meses)', 'Google AI Pro & Almacenamiento', 'HBO Max Platinum / Streaming', 'Renovaciones inmediatas', 'Soporte técnico personalizado'].map(item => (
                  <li key={item} style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={12} color="#7c3aed" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contacto Directo
              </h4>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
                Atención inmediata 100% online.
              </p>
              <a href="https://wa.me/51924545856?text=Hola%20SuscriTech%20Global,%20deseo%20adquirir%20una%20suscripci%C3%B3n" target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fff', background: '#10b981', borderRadius: 999, padding: '9px 18px', textDecoration: 'none', fontWeight: 700 }}>
                <MessageCircle size={15} /> WhatsApp: 924 545 856
              </a>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              © 2026 SuscriTech Global · Todos los derechos reservados
            </p>
            <a href={`https://wa.me/51924545856?text=${encodeURIComponent('Hola SuscriTech Global, quisiera hacer una consulta/reclamo: ')}`} target="_blank" rel="noreferrer"
              style={{ fontSize: 11.5, color: '#64748b', textDecoration: 'none', borderBottom: '1px dotted #64748b', paddingBottom: 1 }}>
              Libro de reclamos
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
