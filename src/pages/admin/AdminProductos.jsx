import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Plus, Pencil, Trash2, Upload, X, Package, Search, Download, Cpu } from 'lucide-react'
import { exportarCSV } from '../../lib/exportar'
import Paginador from '../../components/Paginador'
import toast from 'react-hot-toast'

const vacioForm = {
  nombre: '', descripcion: '', precio: '', precio_oferta: '',
  unidad: 'meses', cantidad_unidad: '', stock: 0, stock_minimo: 1,
  categoria_id: '', activo: true, codigo_barras: '', pide_correo: true
}

const UNIDADES_DIGITALES = ['meses', 'mes', 'año', 'cuenta', 'cupo', 'licencia', 'servicio', 'unidad']

export default function AdminProductos() {
  const [productos, setProductos]         = useState([])
  const [categorias, setCategorias]       = useState([])
  const [form, setForm]                 = useState(vacioForm)
  const [editando, setEditando]         = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [subiendo, setSubiendo]         = useState(false)
  const [cargando, setCargando]         = useState(true)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [imagenFile, setImagenFile]     = useState(null)
  const [busqueda, setBusqueda]         = useState('')
  const [filtroCat, setFiltroCat]       = useState('')
  const [filtroOferta, setFiltroOferta] = useState(false)
  const inputRef = useRef()

  const [searchParams] = useSearchParams()

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('productos').select('*, categorias(nombre)').order('nombre'),
      supabase.from('categorias').select('id, nombre, tienda').eq('activo', true).order('nombre'),
    ])
    setProductos((prods || []).filter(p => p.tienda !== 'richard'))
    setCategorias((cats || []).filter(c => c.tienda !== 'richard'))
    setCargando(false)
  }

  function etiquetaUnidad(unidad, cantidad) {
    if (!cantidad) return unidad
    return `${cantidad} ${unidad}`
  }

  function abrirNuevo() {
    setForm({ ...vacioForm, unidad: 'meses' })
    setEditando(null)
    setImagenPreview(null)
    setImagenFile(null)
    setModalAbierto(true)
  }

  function abrirEditar(p) {
    const partes = p.unidad ? p.unidad.split(' ') : []
    const tieneNumero = partes.length === 2 && !isNaN(partes[0])
    setForm({
      nombre: p.nombre, descripcion: p.descripcion || '',
      precio: p.precio, precio_oferta: p.precio_oferta || '',
      unidad: tieneNumero ? partes[1] : p.unidad,
      cantidad_unidad: tieneNumero ? partes[0] : '',
      stock: p.stock, stock_minimo: p.stock_minimo,
      categoria_id: p.categoria_id || '',
      activo: p.activo, codigo_barras: p.codigo_barras || '',
      pide_correo: p.pide_correo !== false
    })
    setEditando(p)
    setImagenPreview(p.imagen_url || null)
    setImagenFile(null)
    setModalAbierto(true)
  }

  function handleImagen(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return toast.error('Imagen máx. 10MB')
    setImagenFile(file)
    setImagenPreview(URL.createObjectURL(file))
  }

  async function subirImagen(file, nombre) {
    const ext = file.name.split('.').pop()
    const nombreLimpio = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    const path = `productos/${Date.now()}_${nombreLimpio}.${ext}`
    const { error } = await supabase.storage.from('imagenes').upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('imagenes').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    if (!form.precio || isNaN(form.precio)) return toast.error('El precio debe ser un número')
    const unidadFinal = etiquetaUnidad(form.unidad, form.cantidad_unidad)
    setSubiendo(true)
    try {
      let imagen_url = editando?.imagen_url || null
      if (imagenFile) imagen_url = await subirImagen(imagenFile, form.nombre)
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion,
        precio: Number(form.precio),
        precio_oferta: form.precio_oferta ? Number(form.precio_oferta) : null,
        unidad: unidadFinal,
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        categoria_id: form.categoria_id || null,
        activo: form.activo,
        tienda: 'miller',
        codigo_barras: form.codigo_barras || null,
        pide_correo: form.pide_correo,
        imagen_url,
        updated_at: new Date().toISOString()
      }
      if (editando) {
        const { error } = await supabase.from('productos').update(payload).eq('id', editando.id)
        if (error) throw error
        toast.success('Servicio actualizado correctamente')
      } else {
        const { error } = await supabase.from('productos').insert(payload)
        if (error) throw error
        toast.success('Servicio digital creado 🚀')
      }
      setModalAbierto(false)
      cargar()
    } catch (e) { toast.error('Error: ' + e.message) }
    setSubiendo(false)
  }

  async function handleEliminar(p) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    const { error } = await supabase.from('productos').delete().eq('id', p.id)
    if (error) return toast.error('Error al eliminar')
    toast.success('Eliminado')
    cargar()
  }

  const [paginaActual, setPaginaActual]     = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(50)

  const filtrados = productos.filter(p => {
    const matchBusq   = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchCat    = filtroCat ? p.categoria_id === filtroCat : true
    const matchOferta = filtroOferta ? p.precio_oferta && Number(p.precio_oferta) > 0 : true
    return matchBusq && matchCat && matchOferta
  })

  const limiteValido = Math.max(1, Number(itemsPorPagina) || 50)
  const filtradosPaginados = filtrados.slice((paginaActual - 1) * limiteValido, paginaActual * limiteValido)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={24} color="#7c3aed" /> Servicios Digitales<span style={{ color: '#06b6d4' }}>.</span>
        </h1>
        <button onClick={abrirNuevo} className="btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
          <Plus size={16} /> Nuevo servicio
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-suave)' }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar servicio..." style={{ paddingLeft: 32 }} />
        </div>
        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <p style={{ fontSize: 13, color: 'var(--texto-suave)', marginBottom: 14 }}>{filtrados.length} servicios</p>

      {cargando ? <div className="spinner" /> : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtradosPaginados.map(p => (
              <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
                {p.imagen_url
                  ? <img src={p.imagen_url} alt={p.nombre} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--fondo)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Package size={22} color="var(--borde)" /></div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{p.nombre}</p>
                  <p style={{ fontSize: 12, color: '#06b6d4' }}>S/ {Number(p.precio).toFixed(2)} · {p.unidad}</p>
                </div>
                <span className={`badge ${p.activo ? 'badge-verde' : 'badge-gris'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => abrirEditar(p)} className="btn-ghost" style={{ padding: '7px 10px' }}><Pencil size={14} /></button>
                  <button onClick={() => handleEliminar(p)} className="btn-danger" style={{ padding: '7px 10px' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <Paginador totalItems={filtrados.length} itemsPorPagina={itemsPorPagina} setItemsPorPagina={setItemsPorPagina} paginaActual={paginaActual} setPaginaActual={setPaginaActual} esMiller={true} />
        </>
      )}

      {/* Modal */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 540, padding: '24px', maxHeight: '92vh', overflowY: 'auto', borderTop: '4px solid #7c3aed' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 18 }}>{editando ? 'Editar servicio' : 'Nuevo servicio'}</h2>
              <button onClick={() => setModalAbierto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-suave)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Canva Pro" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Descripción</label>
                <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción opcional" />
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Plan / Duración por defecto</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="number" min="0" step="1" value={form.cantidad_unidad} onChange={e => setForm({ ...form, cantidad_unidad: e.target.value })} placeholder="Ej: 3" style={{ width: 100, flexShrink: 0 }} />
                  <select value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} style={{ flex: 1 }}>
                    {UNIDADES_DIGITALES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Precio Base (S/) *</label>
                <input type="number" min="0" step="0.01" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="3.00" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Stock (Cupos)</label>
                <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Categoría</label>
                <select value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: 'block' }}>Imagen del servicio</label>
                <input ref={inputRef} type="file" accept="image/*" onChange={handleImagen} style={{ display: 'none' }} />
                {imagenPreview ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--borde)', height: 140 }}>
                    <img src={imagenPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => { setImagenPreview(null); setImagenFile(null) }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => inputRef.current.click()} style={{ width: '100%', height: 100, border: '2px dashed var(--borde)', borderRadius: 10, background: 'var(--fondo)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--texto-suave)' }}><Upload size={18} /> Subir imagen</button>
                )}
              </div>

              <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.pide_correo} onChange={e => setForm({ ...form, pide_correo: e.target.checked })} style={{ width: 16, height: 16 }} />
                  Pedir correo de activación al cliente en el carrito (Ej: Canva Sí, HBO No)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} style={{ width: 16, height: 16 }} />
                  Visible en la tienda
                </label>
              </div>

              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setModalAbierto(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
                <button onClick={handleGuardar} className="btn-primary" disabled={subiendo} style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                  {subiendo ? 'Guardando...' : 'Guardar servicio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
