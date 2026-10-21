import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import ProductoCard from '../components/ProductoCard'
import Paginador from '../components/Paginador'
import { Package, ShieldCheck, Zap, MessageCircle } from 'lucide-react'

export default function Inicio() {
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [cargando, setCargando] = useState(true)

  // Estados del Paginador (50 por defecto)
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
      supabase.from('productos').select('*').eq('activo', true).order('nombre'),
    ])
    // En la base de datos dedicada a SuscriTech Global, muestra todos salvo que alguno sea 'richard'
    setCategorias((cats || []).filter(c => c.tienda !== 'richard'))
    setProductos((prods || []).filter(p => p.tienda !== 'richard'))
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
      background: 'radial-gradient(circle at 20% 10%, rgba(124, 58, 237, 0.25), transparent 45%), radial-gradient(circle at 80% 30%, rgba(6, 182, 212, 0.2), transparent 50%), #090d16',
      color: '#f8fafc',
      transition: 'background 0.3s ease'
    }}>
      <Navbar onBuscar={handleBuscar} />

      {/* Sugerencias de búsqueda */}
      {mostrarSugerencias && sugerencias.length > 0 && (
        <div style={{
          position: 'fixed', top: 68, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 500,
          background: '#1e293b',
          color: '#fff',
          borderRadius: 12, border: '1px solid var(--borde)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 200
        }}>
          {sugerencias.map(p => (
            <button key={p.id} onClick={() => { setBusqueda(p.nombre); setMostrarSugerencias(false) }}
              style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid var(--borde)', color: 'inherit' }}>
              {p.imagen_url
                ? <img src={p.imagen_url} alt={p.nombre} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                : <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--fondo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="var(--texto-suave)" /></div>
              }
              <div>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</p>
                <p style={{ fontSize: 12, color: '#06b6d4', fontWeight: 700 }}>S/ {Number(p.precio).toFixed(2)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div onClick={() => setMostrarSugerencias(false)}>
        <div className="page-wrap" style={{ padding: '32px 16px' }}>

          {/* HERO BANNER SUSCRITECH GLOBAL */}
          {!busqueda && (
            <div style={{
              background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 45%, #06b6d4 100%)',
              borderRadius: 24, padding: '38px 32px', marginBottom: 36, color: 'white',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 20px 45px rgba(124, 58, 237, 0.3)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ position: 'absolute', right: -30, top: -30, width: 220, height: 220, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.25)', filter: 'blur(20px)' }} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.35)', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                <Zap size={14} color="#22d3ee" /> ¡Adquiere primero y luego realiza el pago!
              </div>
              <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 10 }}>
                SuscriTech Global<br />
                <span style={{ color: '#a5f3fc' }}>Cuentas & Suscripciones Pro</span>
              </h1>
              <p style={{ fontSize: 14, opacity: 0.92, maxWidth: 560, marginBottom: 18 }}>
                Activa Canva Pro, Google, HBO y más directamente en tu correo personal. 100% seguro, entrega inmediata y soporte garantizado.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <a href="https://wa.me/51924545856?text=Hola%20SuscriTech%20Global,%20quiero%20informaci%C3%B3n%20sobre%20los%20servicios%20Pro"
                  target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#10b981', color: '#fff', padding: '10px 18px', borderRadius: 12, fontWeight: 800, fontSize: 13, textDecoration: 'none', boxShadow: '0 6px 16px rgba(16,185,129,0.4)' }}>
                  <MessageCircle size={17} /> WhatsApp: 924 545 856
                </a>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.15)', padding: '8px 14px', borderRadius: 12 }}>
                  <ShieldCheck size={16} /> 100% Seguro · Cancela con cualquier medio de pago
                </span>
              </div>
            </div>
          )}

          {/* Categorías */}
          {!busqueda && categorias.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 style={{ fontFamily: 'var(--fuente-display)', fontSize: 20, fontWeight: 700 }}>
                  Categorías<span style={{ color: '#06b6d4' }}>.</span>
                </h2>
              </div>
              {cargando ? <div className="spinner" /> : (
                <div className="grid-categorias" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                  {categorias.map(cat => (
                    <Link key={cat.id} to={`/categoria/${cat.id}`}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        background: 'rgba(30, 41, 59, 0.8)',
                        borderRadius: 14,
                        border: '1px solid rgba(124, 58, 237, 0.35)',
                        overflow: 'hidden', transition: 'all 0.18s', textAlign: 'center', textDecoration: 'none'
                      }}>
                      <div style={{ width: '100%', aspectRatio: '1', background: 'rgba(124, 58, 237, 0.15)', overflow: 'hidden' }}>
                        {cat.imagen_url
                          ? <img src={cat.imagen_url} alt={cat.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Package size={36} color="#06b6d4" />
                            </div>
                        }
                      </div>
                      <div style={{ padding: '10px 8px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>{cat.nombre}</p>
                        {cat.descripcion && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{cat.descripcion}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Todos los servicios con Paginador */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--fuente-display)', fontSize: 20, fontWeight: 700 }}>
                {busqueda ? `Resultados: "${busqueda}"` : 'Catálogo de Servicios Digitales'}
                <span style={{ color: '#06b6d4' }}>.</span>
              </h2>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                {productosFiltrados.length} servicios
              </span>
            </div>
            {cargando ? <div className="spinner" /> : productosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <Package size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>Aún no hay servicios registrados en el catálogo</p>
              </div>
            ) : (
              <>
                <div className="grid-productos" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 14 }}>
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
      <footer style={{ background: '#050811', color: 'white', marginTop: 48, borderTop: '1px solid rgba(124, 58, 237, 0.3)' }}>
        <div className="page-wrap" style={{ padding: '40px 16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 32, marginBottom: 32 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                SuscriTech Global<span style={{ color: '#06b6d4' }}>.</span>
              </h3>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
                Tu plataforma de confianza para suscripciones y cuentas digitales Pro. Activamos primero tu servicio en tu correo y luego realizas el pago con total seguridad.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#06b6d4' }}>Servicios Destacados</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Canva Pro (3, 6 y 12 meses)', 'Cuentas de Google / Almacenamiento', 'HBO Max / Streaming', 'Renovaciones automáticas', 'Soporte personalizado'].map(item => (
                  <li key={item} style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#7c3aed', fontSize: 10 }}>●</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#06b6d4' }}>📱 Contacto Directo</h4>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>
                Atención inmediata 100% online. Activación directa en tu cuenta.
              </p>
              <a href="https://wa.me/51924545856?text=Hola%20SuscriTech%20Global,%20deseo%20adquirir%20una%20suscripci%C3%B3n" target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#fff', background: '#10b981', borderRadius: 8, padding: '8px 14px', textDecoration: 'none', fontWeight: 700 }}>
                💬 WhatsApp: 924 545 856
              </a>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              © 2026 SuscriTech Global · Todos los derechos reservados
            </p>
            <a href={`https://wa.me/51924545856?text=${encodeURIComponent('Hola SuscriTech Global, quisiera hacer una consulta/reclamo: ')}`} target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: '#64748b', textDecoration: 'none', borderBottom: '1px dotted #64748b', paddingBottom: 1 }}>
              Libro de reclamos
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
