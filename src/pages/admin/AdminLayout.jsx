import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Tag, ShoppingBag, Users, LogOut, Menu, MessageCircle, TrendingUp, Warehouse, Tag as TagIcon, Receipt, BarChart2, Calculator, Cpu, Moon, Sun } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth, useTienda } from '../../store'
import toast from 'react-hot-toast'

const menu = [
  { to: '/admin',            label: 'Dashboard',        icon: LayoutDashboard, exact: true },
  { to: '/admin/productos',  label: 'Servicios / Prod.', icon: Package },
  { to: '/admin/categorias', label: 'Categorías',        icon: Tag },
  { to: '/admin/almacen',    label: 'Almacén',           icon: Warehouse },
  { to: '/admin/pedidos',    label: 'Pedidos Web',       icon: MessageCircle },
  { to: '/admin/ventas',     label: 'Suscripciones',     icon: ShoppingBag },
  { to: '/admin/compras',    label: 'Cuentas Madre',     icon: Receipt },
  { to: '/admin/inventario', label: 'Inventario',        icon: BarChart2 },
  { to: '/admin/analisis',   label: 'Análisis',          icon: TrendingUp },
  { to: '/admin/precios',    label: 'Etiquetas',         icon: TagIcon },
  { to: '/admin/calculador', label: 'Calculador',        icon: Calculator },
  { to: '/admin/usuarios',   label: 'Usuarios',          icon: Users },
]

export default function AdminLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const { modoOscuro, toggleModoOscuro } = useTienda()
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('dark-mode', modoOscuro)
  }, [modoOscuro])

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    navigate('/')
  }

  const isActive = (to, exact) => exact ? pathname === to : pathname.startsWith(to)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--fondo)', color: 'var(--texto)' }}>

      {/* Overlay mobile */}
      {sidebarAbierto && (
        <div onClick={() => setSidebarAbierto(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 235, background: 'var(--blanco)', borderRight: '1px solid var(--borde)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', top: 0, left: sidebarAbierto ? 0 : -235, height: '100vh',
        zIndex: 100, transition: 'left 0.25s ease', overflowY: 'auto'
      }}>
        {/* Cabecera SuscriTech Global */}
        <div style={{ padding: '18px 16px', borderBottom: '1px solid var(--borde)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)'
          }}>
            <Cpu size={18} color="white" />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--fuente-display)', fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: 'var(--texto)' }}>
              SuscriTech Global
            </p>
            <p style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600 }}>
              Panel de Control
            </p>
          </div>
        </div>

        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {menu.map(({ to, label, icon: Icon, exact }) => {
            const activo = isActive(to, exact)
            return (
              <Link key={to} to={to} onClick={() => setSidebarAbierto(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 10, marginBottom: 2, fontSize: 14, fontWeight: 500,
                  background: activo ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                  color: activo ? '#06b6d4' : 'var(--texto-suave)',
                  transition: 'all 0.15s', textDecoration: 'none'
                }}>
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--borde)' }}>
          <div style={{ padding: '8px 12px', marginBottom: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto)' }}>{perfil?.nombre || 'Admin'}</p>
            <p style={{ fontSize: 11, color: 'var(--texto-suave)' }}>Administrador</p>
          </div>
          <button onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'none', color: '#ef4444', fontSize: 14, cursor: 'pointer', border: 'none' }}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header Superior */}
        <header style={{ background: 'var(--blanco)', borderBottom: '1px solid var(--borde)', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSidebarAbierto(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto)', display: 'flex', padding: 4 }}>
            <Menu size={22} />
          </button>
          <span style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 16 }}>
            Admin · <span style={{ color: '#06b6d4' }}>SuscriTech Global</span>
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Botón Modo Oscuro / Claro */}
            <button
              type="button"
              onClick={toggleModoOscuro}
              title={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              style={{
                width: 34, height: 34, borderRadius: 8, border: '1px solid var(--borde)',
                background: 'var(--fondo)', color: modoOscuro ? '#fbbf24' : 'var(--texto-suave)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}>
              {modoOscuro ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link to="/" style={{ fontSize: 12, color: '#06b6d4', fontWeight: 600, textDecoration: 'none' }}>← Ver tienda</Link>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px 16px', maxWidth: 1000, width: '100%' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
