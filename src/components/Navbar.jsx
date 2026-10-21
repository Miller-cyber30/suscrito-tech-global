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
      background: modoOscuro ? 'rgba(15, 23, 42, 0.95)' : 'var(--blanco)',
      borderBottom: '1px solid rgba(124, 58, 237, 0.35)',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 4px 20px rgba(124, 58, 237, 0.15)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 68, flexWrap: 'wrap' }}>

        {/* Logo SuscriTech Global */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, textDecoration: 'none' }}>
          <div style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)'
          }}>
            <Cpu size={20} color="white" />
          </div>
          <span style={{ fontFamily: 'var(--fuente-display)', fontWeight: 800, fontSize: 16, color: 'var(--texto)', lineHeight: 1.1 }}>
            SuscriTech<br />
            <span style={{ color: '#06b6d4', fontSize: 11, fontWeight: 700, letterSpacing: 0.4 }}>
              GLOBAL
            </span>
          </span>
        </Link>

        {/* Buscador */}
        {onBuscar && (
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', maxWidth: 460, minWidth: 160, margin: '0 auto' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--texto-suave)' }} />
            <input
              value={busqueda}
              onChange={handleBuscar}
              placeholder="Buscar en SuscriTech Global (Canva, Google, HBO...)"
              style={{
                paddingLeft: 38, borderRadius: 24,
                background: 'var(--fondo)',
                color: 'var(--texto)',
                border: '1.5px solid rgba(124, 58, 237, 0.4)',
                width: '100%'
              }}
            />
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Botón Modo Oscuro / Claro */}
          <button
            type="button"
            onClick={toggleModoOscuro}
            title={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            style={{
              width: 38, height: 38, borderRadius: 10, border: '1px solid var(--borde)',
              background: 'var(--fondo)', color: modoOscuro ? '#fbbf24' : 'var(--texto-suave)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
            {modoOscuro ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {perfil?.rol === 'admin' && (
            <Link to="/admin" style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              color: '#06b6d4', fontWeight: 600, padding: '6px 10px', borderRadius: 8,
              background: 'rgba(6, 182, 212, 0.15)', textDecoration: 'none'
            }}>
              <LayoutDashboard size={15} /> Admin
            </Link>
          )}
          {perfil?.rol === 'vendedor' && (
            <Link to="/vendedor" style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              color: '#06b6d4', fontWeight: 600, padding: '6px 10px', borderRadius: 8,
              background: 'rgba(6, 182, 212, 0.15)', textDecoration: 'none'
            }}>
              <Store size={15} /> Vender
            </Link>
          )}

          {usuario ? (
            <>
              <Link to="/mi-cuenta" style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
                padding: '6px 10px', borderRadius: 8,
                background: 'var(--fondo)',
                color: 'var(--texto)',
                border: '1px solid var(--borde)', textDecoration: 'none'
              }}>
                {perfil?.avatar_url ? (
                  <img src={perfil.avatar_url} alt="Avatar" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <User size={14} color="#06b6d4" />
                )}
                Mi Cuenta
              </Link>
              <button onClick={handleLogout} className="btn-ghost" style={{ padding: '7px 10px', fontSize: 12 }}>
                Salir
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }}>
              <LogIn size={14} /> Ingresar
            </Link>
          )}

          <Link to="/carrito" style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 10,
            background: totalItems > 0 ? 'rgba(124, 58, 237, 0.25)' : 'var(--fondo)',
            border: '1.5px solid rgba(6, 182, 212, 0.4)',
            color: totalItems > 0 ? '#06b6d4' : 'var(--texto-suave)',
            transition: 'all 0.2s'
          }}>
            <ShoppingCart size={19} />
            {totalItems > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: '#7c3aed', color: 'white',
                borderRadius: '50%', width: 20, height: 20,
                fontSize: 11, fontWeight: 700,
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
