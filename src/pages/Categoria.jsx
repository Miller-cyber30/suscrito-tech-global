import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import ProductoCard from '../components/ProductoCard'
import Paginador from '../components/Paginador'
import { ChevronLeft, Package } from 'lucide-react'

export default function Categoria() {
  const { id } = useParams()

  const [categoria, setCategoria] = useState(null)
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [paginaActual, setPaginaActual] = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(50)

  useEffect(() => {
    setPaginaActual(1)
    cargar()

    const canal = supabase
      .channel('cambios-categoria')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargar())
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [id])

  async function cargar() {
    setCargando(true)
    const [{ data: cat }, { data: prods }] = await Promise.all([
      supabase.from('categorias').select('*').eq('id', id).single(),
      supabase.from('productos').select('*').eq('categoria_id', id).eq('activo', true).order('nombre'),
    ])
    setCategoria(cat)
    setProductos(prods || [])
    setCargando(false)
  }

  const limiteValido = Math.max(1, Number(itemsPorPagina) || 50)
  const productosPaginados = productos.slice((paginaActual - 1) * limiteValido, paginaActual * limiteValido)

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc' }}>
      <Navbar />
      <div className="page-wrap" style={{ padding: '24px 16px' }}>

        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', marginBottom: 20, padding: '6px 0', textDecoration: 'none' }}>
          <ChevronLeft size={16} /> Volver al catálogo
        </Link>

        {categoria && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            {categoria.imagen_url ? (
              <img src={categoria.imagen_url} alt={categoria.nombre} style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: '1px solid rgba(124,58,237,0.4)' }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 14, background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={28} color="#06b6d4" />
              </div>
            )}
            <div>
              <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 26, fontWeight: 800 }}>
                {categoria.nombre}<span style={{ color: '#06b6d4' }}>.</span>
              </h1>
              {categoria.descripcion && <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 3 }}>{categoria.descripcion}</p>}
            </div>
          </div>
        )}

        {cargando ? <div className="spinner" /> : productos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <Package size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>No hay servicios disponibles en esta categoría aún</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>{productos.length} servicios</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
              {productosPaginados.map(p => <ProductoCard key={p.id} producto={p} />)}
            </div>
            <Paginador
              totalItems={productos.length}
              itemsPorPagina={itemsPorPagina}
              setItemsPorPagina={setItemsPorPagina}
              paginaActual={paginaActual}
              setPaginaActual={setPaginaActual}
              esMiller={true}
            />
          </>
        )}
      </div>
    </div>
  )
}
