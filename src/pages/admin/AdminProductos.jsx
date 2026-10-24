import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Plus, Pencil, Trash2, Upload, X, Package, Search, Download, Cpu } from 'lucide-react'
import { exportarCSV } from '../../lib/exportar'
import Paginador from '../../components/Paginador'
import toast from 'react-hot-toast'

const UNIDADES_DIGITALES = ['meses', 'mes', 'año', 'días', 'cuenta', 'cupo', 'licencia', 'servicio', 'unidad']

const vacioForm = {
  nombre: '',
  descripcion: '',
  stock: 100,
  stock_minimo: 1,
  categoria_id: '',
  activo: true,
  codigo_barras: '',
  pide_correo: true,
  planes: [
    { cantidad: '3', unidad: 'meses', precio: '3.00' }
  ]
}

export default function AdminProductos() {
  const [productos, setProductos]         = useState([])
  const [categorias, setCategorias]       = useState([])
  const [form, setForm]                   = useState(vacioForm)
  const [editando, setEditando]           = useState(null)
  const [modalAbierto, setModalAbierto]   = useState(false)
  const [subiendo, setSubiendo]           = useState(false)
  const [cargando, setCargando]           = useState(true)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [imagenFile, setImagenFile]       = useState(null)
  const [busqueda, setBusqueda]           = useState('')
  const [filtroCat, setFiltroCat]         = useState('')
  const inputRef = useRef()

  const [searchParams] = useSearchParams()

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    const editarId = searchParams.get('editar')
    const esNuevo  = searchParams.get('nuevo')
    if (!editarId && !esNuevo) return
    if (esNuevo) { abrirNuevo(); return }
    const intentar = setInterval(() => {
      setProductos(prev => {
        const prod = prev.find(p => p.id === editarId)
        if (prod) {
          abrirEditar(prod)
          clearInterval(intentar)
        }
        return prev
      })
    }, 300)
    setTimeout(() => clearInterval(intentar), 5000)
  }, [searchParams])

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

  function armarDuracion(cantidad, unidad) {
    const cantLimpia = String(cantidad ?? '').trim()
    if (!cantLimpia) return unidad
    return `${cantLimpia} ${unidad}`
  }

  function descomponerDuracion(texto = '') {
    const partes = String(texto).trim().split(' ')
    if (partes.length >= 2 && !isNaN(partes[0])) {
      return { cantidad: partes[0], unidad: partes.slice(1).join(' ') }
    }
    return { cantidad: '', unidad: texto || 'meses' }
  }

  function abrirNuevo() {
    setForm({
      ...vacioForm,
      planes: [{ cantidad: '3', unidad: 'meses', precio: '3.00' }]
    })
    setEditando(null)
    setImagenPreview(null)
    setImagenFile(null)
    setModalAbierto(true)
  }

  function abrirEditar(p) {
    let planesIniciales = []
    if (Array.isArray(p.planes) && p.planes.length > 0) {
      planesIniciales = p.planes.map(pl => {
        if (pl.cantidad !== undefined && pl.unidad) {
          return { cantidad: String(pl.cantidad), unidad: pl.unidad, precio: String(pl.precio ?? '') }
        }
        const desc = descomponerDuracion(pl.duracion || pl.label || p.unidad || '3 meses')
        return { cantidad: desc.cantidad, unidad: desc.unidad, precio: String(pl.precio ?? p.precio ?? '') }
      })
    } else {
      const desc = descomponerDuracion(p.unidad || '3 meses')
      planesIniciales = [{
        cantidad: desc.cantidad,
        unidad: desc.unidad,
        precio: String(p.precio ?? '')
      }]
    }

    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      stock: p.stock ?? 100,
      stock_minimo: p.stock_minimo ?? 1,
      categoria_id: p.categoria_id || '',
      activo: p.activo,
      codigo_barras: p.codigo_barras || '',
      pide_correo: p.pide_correo !== false,
      planes: planesIniciales
    })
    setEditando(p)
    setImagenPreview(p.imagen_url || null)
    setImagenFile(null)
    setModalAbierto(true)
  }

  function agregarFilaPlan() {
    setForm(prev => ({
      ...prev,
      planes: [...prev.planes, { cantidad: '', unidad: 'meses', precio: '' }]
    }))
  }

  function cambiarFilaPlan(idx, campo, valor) {
    setForm(prev => ({
      ...prev,
      planes: prev.planes.map((pl, i) => i === idx ? { ...pl, [campo]: valor } : pl)
    }))
  }

  function eliminarFilaPlan(idx) {
    if (form.planes.length <= 1) {
      return toast.error('Debe existir al menos 1 plan en el servicio')
    }
    setForm(prev => ({
      ...prev,
      planes: prev.planes.filter((_, i) => i !== idx)
    }))
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
    const nombreLimpio = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40)
    const path = `productos/${Date.now()}_${nombreLimpio}.${ext}`
    const { error } = await supabase.storage.from('imagenes').upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('imagenes').getPublicUrl(path)
    return data.publicUrl
  }

  // Calcula en tiempo real cuál es el plan de menor costo
  const planesValidosPreview = form.planes
    .map(pl => ({
      cantidad: String(pl.cantidad ?? '').trim(),
      unidad: pl.unidad || 'meses',
      duracion: armarDuracion(pl.cantidad, pl.unidad || 'meses'),
      precio: Number(pl.precio)
    }))
    .filter(pl => !isNaN(pl.precio) && pl.precio > 0)
    .sort((a, b) => a.precio - b.precio)

  const planMenorCosto = planesValidosPreview[0] || null

  async function handleGuardar() {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    if (planesValidosPreview.length === 0) {
      return toast.error('Ingresa al menos 1 plan con precio válido mayor a 0')
    }

    setSubiendo(true)
    try {
      let imagen_url = editando?.imagen_url || null
      if (imagenFile) imagen_url = await subirImagen(imagenFile, form.nombre)

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion,
        precio: planMenorCosto.precio, // Siempre guarda el menor precio como base de enganche
        precio_oferta: null,
        unidad: planMenorCosto.duracion,
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo) || 1,
        categoria_id: form.categoria_id || null,
        activo: form.activo,
        tienda: 'miller',
        codigo_barras: form.codigo_barras || null,
        pide_correo: form.pide_correo,
        planes: planesValidosPreview,
        imagen_url,
        updated_at: new Date().toISOString()
      }

      if (editando) {
        const { error } = await supabase.from('productos').update(payload).eq('id', editando.id)
        if (error) throw error
        toast.success(`Servicio actualizado con ${planesValidosPreview.length} plan(es) ✅`)
      } else {
        const { error } = await supabase.from('productos').insert(payload)
        if (error) throw error
        toast.success(`Servicio creado con ${planesValidosPreview.length} plan(es) 🚀`)
      }
      setModalAbierto(false)
      cargar()
    } catch (e) {
      toast.error('Error al guardar: ' + e.message)
    }
    setSubiendo(false)
  }

  async function handleEliminar(p) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    const { error } = await supabase.from('productos').delete().eq('id', p.id)
    if (error) return toast.error('Error al eliminar')
    toast.success('Eliminado')
    cargar()
  }

  function handleExportar() {
    if (productos.length === 0) return toast.error('No hay servicios para exportar')
    exportarCSV('servicios_suscritech', [
      ['Nombre', 'Categoría', 'Precio Menor (S/)', 'Todos los Planes', 'Pide Correo', 'Stock', 'Activo'],
      ...productos.map(p => [
        p.nombre,
        p.categorias?.nombre || 'Sin categoría',
        Number(p.precio).toFixed(2),
        Array.isArray(p.planes) && p.planes.length > 0
          ? p.planes.map(pl => `${pl.duracion}: S/${Number(pl.precio).toFixed(2)}`).join(' | ')
          : `${p.unidad}: S/${Number(p.precio).toFixed(2)}`,
        p.pide_correo !== false ? 'Sí' : 'No',
        p.stock,
        p.activo ? 'Sí' : 'No'
      ])
    ])
    toast.success('Excel exportado ✅')
  }

  const [paginaActual, setPaginaActual]     = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(50)

  const filtrados = productos.filter(p => {
    const matchBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchCat  = filtroCat ? p.categoria_id === filtroCat : true
    return matchBusq && matchCat
  })

  const limiteValido = Math.max(1, Number(itemsPorPagina) || 50)
  const filtradosPaginados = filtrados.slice((paginaActual - 1) * limiteValido, paginaActual * limiteValido)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={24} color="#7c3aed" /> Servicios Digitales<span style={{ color: '#06b6d4' }}>.</span>
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportar} className="btn-ghost" style={{ fontSize: 13 }}>
            <Download size={14} /> Excel
          </button>
          <button onClick={abrirNuevo} className="btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
            <Plus size={16} /> Nuevo servicio
          </button>
        </div>
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
            {filtradosPaginados.map(p => {
              const listaPlanes = Array.isArray(p.planes) && p.planes.length > 0
                ? p.planes
                : [{ duracion: p.unidad, precio: p.precio }]

              return (
                <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', flexWrap: 'wrap' }}>
                  {p.imagen_url
                    ? <img src={p.imagen_url} alt={p.nombre} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--fondo)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={22} color="var(--borde)" />
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{p.nombre}</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {listaPlanes.map((pl, idx) => (
                        <span key={idx} style={{ fontSize: 11, background: 'var(--fondo)', border: '1px solid var(--borde)', padding: '2px 8px', borderRadius: 8, color: 'var(--texto)' }}>
                          {pl.duracion}: <b style={{ color: '#06b6d4' }}>S/ {Number(pl.precio).toFixed(2)}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'var(--fuente-display)', fontWeight: 800, fontSize: 15, color: '#06b6d4' }}>
                      Desde S/ {Number(p.precio).toFixed(2)}
                    </p>
                    <p style={{ fontSize: 11, color: p.stock <= 0 ? '#ef4444' : 'var(--texto-suave)' }}>
                      {p.stock <= 0 ? 'Oculto (Stock 0)' : `Stock: ${p.stock}`}
                    </p>
                  </div>
                  <span className={`badge ${p.activo && p.stock > 0 ? 'badge-verde' : 'badge-gris'}`}>
                    {p.activo && p.stock > 0 ? 'Activo' : 'Oculto'}
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => abrirEditar(p)} className="btn-ghost" style={{ padding: '7px 10px' }}><Pencil size={14} /></button>
                    <button onClick={() => handleEliminar(p)} className="btn-danger" style={{ padding: '7px 10px' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
          <Paginador
            totalItems={filtrados.length}
            itemsPorPagina={itemsPorPagina}
            setItemsPorPagina={setItemsPorPagina}
            paginaActual={paginaActual}
            setPaginaActual={setPaginaActual}
            esMiller={true}
          />
        </>
      )}

      {/* Modal Crear / Editar Servicio con Múltiples Planes */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 580, padding: '24px', maxHeight: '92vh', overflowY: 'auto', borderTop: '4px solid #7c3aed' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--fuente-display)', fontWeight: 700, fontSize: 18 }}>
                {editando ? 'Editar servicio' : 'Nuevo servicio'}
              </h2>
              <button onClick={() => setModalAbierto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-suave)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Canva Pro" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Descripción</label>
                <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Entrega Inmediata en tu Correo Personal" />
              </div>

              {/* SECCIÓN DINÁMICA DE PLANES (1, 2, 3, 4 O MÁS PLANES) */}
              <div style={{ gridColumn: '1/-1', background: 'rgba(15, 23, 42, 0.6)', padding: 14, borderRadius: 12, border: '1.5px solid rgba(6, 182, 212, 0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 800, color: '#06b6d4', display: 'block' }}>
                      ⚡ Planes y Precios del Servicio ({form.planes.length})
                    </label>
                    <p style={{ fontSize: 11, color: 'var(--texto-suave)' }}>
                      Agrega 1, 2, 3, 4 o más planes. El de menor precio saldrá por defecto para captar clientes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={agregarFilaPlan}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '7px 12px', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none', gap: 5 }}>
                    <Plus size={14} /> Agregar otro plan
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.planes.map((pl, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 125px auto', gap: 8, alignItems: 'center', background: 'var(--blanco)', padding: 8, borderRadius: 8, border: '1px solid var(--borde)' }}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={pl.cantidad}
                        onChange={e => cambiarFilaPlan(idx, 'cantidad', e.target.value)}
                        placeholder="Ej: 3"
                        title="Cantidad (ej: 3, 6, 12)"
                        style={{ fontSize: 13, textAlign: 'center' }}
                      />
                      <select
                        value={pl.unidad}
                        onChange={e => cambiarFilaPlan(idx, 'unidad', e.target.value)}
                        style={{ fontSize: 13 }}>
                        {UNIDADES_DIGITALES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#06b6d4', fontWeight: 700 }}>S/</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={pl.precio}
                          onChange={e => cambiarFilaPlan(idx, 'precio', e.target.value)}
                          placeholder="3.00"
                          style={{ paddingLeft: 28, fontSize: 13, fontWeight: 700, color: '#06b6d4' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminarFilaPlan(idx)}
                        disabled={form.planes.length <= 1}
                        className="btn-danger"
                        style={{ padding: '8px', opacity: form.planes.length <= 1 ? 0.35 : 1 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {planMenorCosto && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#a5f3fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed rgba(148,163,184,0.25)' }}>
                    <span>🎯 Precio gancho en portada (el menor):</span>
                    <strong>{planMenorCosto.duracion} → S/ {planMenorCosto.precio.toFixed(2)}</strong>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Categoría</label>
                <select value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Stock interno (0 = se oculta)</label>
                <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
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
