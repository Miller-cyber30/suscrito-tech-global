import { useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth, useTienda } from '../../store'
import { Cpu, LogOut, Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function VendedorLayout() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const { modoOscuro, toggleModoOscuro } = useTienda()

  useEffect(() => {
    document.body.classList.toggle('dark-mode', modoOscuro)
  }, [modoOscuro])

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fondo)', color: 'var(--texto)' }}>
      <header style={{ background: 'var(--blanco)', borderBottom: '1px solid var(--borde)', padding: '0 16px', height: 58, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Cpu size={18} color="white" />
        </div>
        <span style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 16 }}>
          Punto de Venta · <span style={{ color: '#06b6d4' }}>SuscriTech Global</span>
        </span>
        <span style={{ fontSize: 13, color: 'var(--texto-suave)', marginLeft: 4 }}>· {perfil?.nombre}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={toggleModoOscuro}
            style={{
              width: 34, height: 34, borderRadius: 8, border: '1px solid var(--borde)',
              background: 'var(--fondo)', color: modoOscuro ? '#fbbf24' : 'var(--texto-suave)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
            {modoOscuro ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link to="/" style={{ fontSize: 13, color: '#06b6d4', fontWeight: 600, textDecoration: 'none' }}>← Catálogo</Link>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>
      <main style={{ padding: '20px 16px', maxWidth: 960, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
