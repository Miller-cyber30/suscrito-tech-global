import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Search, LogIn, LayoutDashboard, Store, Cpu, User, Moon, Sun } from 'lucide-react'
import { useCarrito, useAuth, useTienda } from '../store'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Navbar({ onBuscar }) {
  const [busqueda, setBusqueda] = useState('')
  const items = useCarrito(s => s.items)
  const { perfil, usuario } = useAuth()
  const { modoOscuro, toggleModoOscuro } = useTienda()
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.toggle('dark-mode', modoOscuro)
  }, [modoOscuro])

  const totalItems = items.reduce((a, i) => a + i.cantidad, 0)

  function handleBuscar(e) {
    const val = e.target.value
    setBusqueda(val)
    if (onBuscar) onBuscar(val)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    navigate('/')
  }

  return (
    <header style={{
      background: modoOscuro ? 'rgba(7, 10, 18, 0.88)' : 'rgba(255, 255, 255, 0.92)',
      borderBottom: '1px solid var(--borde)',
      position: 'sticky', top: 0, zIndex: 100,
      backdropFilter: 'blur(16px)'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', height: 70, flexWrap: 'wrap' }}>

        {/* Marca SuscriTech Global estilo Eonix / Kassow */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, textDecoration: 'none' }}>
          <div style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(6, 182, 212, 0.28)'
          }}>
            <Cpu size={20} color="white" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'var(--fuente-display)', fontWeight: 800, fontSize: 17, color: 'var(--texto)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              SuscriTech
            </span>
            <span style={{ color: '#06b6d4', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 1 }}>
              GLOBAL
            </span>
          </div>
        </Link>

        {/* Buscador tipo píldora estilo E-commerce moderno */}
        {onBuscar && (
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', maxWidth: 520, minWidth: 180, margin: '0 auto' }}>
            <input
              value={busqueda}
              onChange={handleBuscar}
              placeholder="Buscar en SuscriTech Global (Canva, Google, HBO...)"
              style={{
                paddingLeft: 18,
                paddingRight: 44,
                height: 42,
                borderRadius: 999,
                background: modoOscuro ? '#0f1523' : '#f1f5f9',
                color: 'var(--texto)',
                border: '1px solid var(--borde)',
                fontSize: 13.5,
                width: '100%'
              }}
            />
            <div style={{
              position: 'absolute', right: 6, width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
            }}>
              <Search size={15} color="#fff" />
            </div>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={toggleModoOscuro}
            title={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            style={{
              width: 38, height: 38, borderRadius: 999, border: '1px solid var(--borde)',
              background: 'var(--blanco)', color: modoOscuro ? '#fbbf24' : 'var(--texto-suave)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
            {modoOscuro ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {perfil?.rol === 'admin' && (
            <Link to="/admin" style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5,
              color: '#38bdf8', fontWeight: 700, padding: '8px 14px', borderRadius: 999,
              background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', textDecoration: 'none'
            }}>
              <LayoutDashboard size={14} /> Admin
            </Link>
          )}
          {perfil?.rol === 'vendedor' && (
            <Link to="/vendedor" style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5,
              color: '#38bdf8', fontWeight: 700, padding: '8px 14px', borderRadius: 999,
              background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', textDecoration: 'none'
            }}>
              <Store size={14} /> Vender
            </Link>
          )}

          {usuario ? (
            <>
              <Link to="/mi-cuenta" style={{
                display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600,
                padding: '7px 14px', borderRadius: 999,
                background: 'var(--blanco)',
                color: 'var(--texto)',
                border: '1px solid var(--borde)', textDecoration: 'none'
              }}>
                {perfil?.avatar_url ? (
                  <img src={perfil.avatar_url} alt="Avatar" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <User size={14} color="#06b6d4" />
                )}
                Mi Cuenta
              </Link>
              <button onClick={handleLogout} className="btn-ghost" style={{ padding: '7px 14px', fontSize: 12.5, borderRadius: 999 }}>
                Salir
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12.5, borderRadius: 999 }}>
              <LogIn size={14} /> Inicia sesión
            </Link>
          )}

          <Link to="/carrito" style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 999,
            background: totalItems > 0 ? 'rgba(124, 58, 237, 0.2)' : 'var(--blanco)',
            border: totalItems > 0 ? '1.5px solid #06b6d4' : '1px solid var(--borde)',
            color: totalItems > 0 ? '#06b6d4' : 'var(--texto)',
            transition: 'all 0.2s'
          }}>
            <ShoppingCart size={18} />
            {totalItems > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: 'white',
                borderRadius: '50%', width: 20, height: 20,
                fontSize: 11, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
