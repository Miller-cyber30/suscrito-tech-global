import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { CheckCircle, XCircle, Trash2, ChevronDown, ChevronUp, Mail, Phone, User, Download, Cpu } from 'lucide-react'
import toast from 'react-hot-toast'

const ESTADOS = { pendiente: 'badge-naranja', procedido: 'badge-verde', no_procede: 'badge-rojo' }
const LABELS  = { pendiente: 'Pendiente', procedido: 'Procedido', no_procede: 'No procede' }

export default function AdminPedidos() {
  const [pedidos, setPedidos]     = useState([])
  const [cargando, setCargando]   = useState(true)
  const [expandido, setExpandido] = useState(null)
  const [filtro, setFiltro]       = useState('pendiente')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false })
    setPedidos(data || [])
    setCargando(false)
  }

  // Extrae los meses contratados del nombre del servicio (por defecto 3 meses si no se especifica)
  function detectarMeses(nombre = '') {
    const matchMeses = nombre.match(/(\d+)\s*mes/i)
    if (matchMeses) return Number(matchMeses[1])
    if (/1\s*a[ñn]o|12\s*m|anual/i.test(nombre)) return 12
    if (/6\s*m/i.test(nombre)) return 6
    if (/3\s*m/i.test(nombre)) return 3
    return 1
  }

  async function proceder(pedido) {
    if (!confirm(`¿Confirmar pedido digital de ${pedido.nombre_cliente}? Esto descontará los cupos del stock y activará el vencimiento.`)) return
    try {
      const correoCliente = pedido.direccion || ''

      // 1 — Crear venta en SuscriTech Global
      const { data: venta, error: errV } = await supabase
        .from('ventas')
        .insert({
          tipo: 'online',
          tienda: 'miller',
          total: pedido.total,
          estado: 'completada',
          nombre_cliente: pedido.nombre_cliente,
          telefono_cliente: pedido.telefono_cliente,
          notas: `Página Web | Correo: ${correoCliente}`,
        })
        .select()
        .single()
      if (errV) throw errV

      // 2 — Crear items de venta con fecha de vencimiento calculada
      const items = pedido.items.map(i => {
        const meses = detectarMeses(i.nombre)
        const venc = new Date()
        venc.setMonth(venc.getMonth() + meses)
        return {
          venta_id: venta.id,
          producto_id: i.id,
          nombre_producto: i.nombre,
          precio_unitario: i.precio,
          cantidad: i.cantidad,
          subtotal: i.subtotal,
          cliente_nombre: pedido.nombre_cliente,
          cliente_whatsapp: pedido.telefono_cliente || '',
          cliente_correo: correoCliente,
          plataforma_venta: 'Página Web',
          duracion_meses: meses,
          fecha_vencimiento: venc.toISOString().split('T')[0],
          estado_suscripcion: 'activo'
        }
      })
      const { error: errI } = await supabase.from('venta_items').insert(items)
      if (errI) throw errI

      // 3 — Marcar pedido como procedido
      await supabase.from('pedidos').update({ estado: 'procedido' }).eq('id', pedido.id)
      toast.success('✅ Pedido confirmado, cupo descontado y vencimiento registrado')
      cargar()
    } catch (e) {
      toast.error('Error: ' + e.message)
    }
  }

  async function noProcede(pedido) {
    if (!confirm(`¿Marcar pedido de ${pedido.nombre_cliente} como "No procede"?`)) return
    await supabase.from('pedidos').update({ estado: 'no_procede' }).eq('id', pedido.id)
    toast.success('Pedido marcado como no procede')
    cargar()
  }

  async function eliminar(pedido) {
    if (!confirm(`¿Eliminar pedido de ${pedido.nombre_cliente}? Esta acción no se puede deshacer.`)) return
    await supabase.from('pedidos').delete().eq('id', pedido.id)
    toast.success('Pedido eliminado')
    cargar()
  }

  function exportarExcel() {
    const filtrados = pedidosFiltrados
    if (filtrados.length === 0) return toast.error('No hay pedidos para exportar')
    const filas = [
      ['Fecha', 'Cliente', 'WhatsApp', 'Correo de Activación', 'Servicios', 'Total', 'Estado'],
      ...filtrados.map(p => [
        new Date(p.created_at).toLocaleString('es-PE'),
        p.nombre_cliente,
        p.telefono_cliente || '',
        p.direccion || '',
        p.items.map(i => `${i.nombre} x${i.cantidad}`).join(' | '),
        `S/ ${Number(p.total).toFixed(2)}`,
        LABELS[p.estado]
      ])
    ]
    const csv = filas.map(f => f.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `pedidos_suscritech_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exportado correctamente')
  }

  const pedidosFiltrados = filtro === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtro)
  const conteos = {
    pendiente:  pedidos.filter(p => p.estado === 'pendiente').length,
    procedido:  pedidos.filter(p => p.estado === 'procedido').length,
    no_procede: pedidos.filter(p => p.estado === 'no_procede').length,
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={24} color="#7c3aed" /> Pedidos Web / WhatsApp<span style={{ color: '#06b6d4' }}>.</span>
        </h1>
        <button onClick={exportarExcel} className="btn-ghost" style={{ fontSize: 13 }}>
          <Download size={14} /> Exportar Excel
        </button>
      </div>

      {/* Contadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'pendiente',  label: 'Pendientes',   color: '#06b6d4' },
          { key: 'procedido',  label: 'Procedidos',   color: '#10b981' },
          { key: 'no_procede', label: 'No proceden',  color: '#ef4444' },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFiltro(key)}
            style={{ padding: '14px', borderRadius: 12, border: `2px solid ${filtro === key ? color : 'var(--borde)'}`, background: filtro === key ? color + '18' : 'var(--blanco)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.18s' }}>
            <p style={{ fontFamily: 'var(--fuente-display)', fontSize: 24, fontWeight: 800, color }}>{conteos[key]}</p>
            <p style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 2 }}>{label}</p>
          </button>
        ))}
      </div>

      {/* Filtro todos */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setFiltro('todos')}
          style={{ fontSize: 13, color: filtro === 'todos' ? '#06b6d4' : 'var(--texto-suave)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: filtro === 'todos' ? 'underline' : 'none', fontWeight: 600 }}>
          Ver todos ({pedidos.length})
        </button>
      </div>

      {cargando ? <div className="spinner" /> : pedidosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--texto-suave)' }}>
          <p>No hay pedidos {filtro !== 'todos' ? `"${LABELS[filtro]}"` : ''}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pedidosFiltrados.map(p => (
            <div key={p.id} className="card" style={{ overflow: 'hidden', borderLeft: '4px solid #7c3aed' }}>
              {/* Cabecera */}
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <User size={14} color="#06b6d4" />
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{p.nombre_cliente}</p>
                    <span className={`badge ${ESTADOS[p.estado]}`}>{LABELS[p.estado]}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {p.telefono_cliente && (
                      <span style={{ fontSize: 12, color: 'var(--texto-suave)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={11} /> {p.telefono_cliente}
                      </span>
                    )}
                    {p.direccion && (
                      <span style={{ fontSize: 12, color: '#06b6d4', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={11} /> Activar en: {p.direccion}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
                      {new Date(p.created_at).toLocaleString('es-PE')}
                    </span>
                  </div>
                </div>

                <p style={{ fontFamily: 'var(--fuente-display)', fontWeight: 800, fontSize: 18, color: '#06b6d4', flexShrink: 0 }}>
                  S/ {Number(p.total).toFixed(2)}
                </p>

                <button onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-suave)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, flexShrink: 0 }}>
                  {expandido === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  Ver servicios
                </button>
              </div>

              {/* Detalle servicios */}
              {expandido === p.id && (
                <div style={{ borderTop: '1px solid var(--borde)', padding: '12px 16px', background: 'var(--fondo)' }}>
                  {p.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--borde)' }}>
                      {item.imagen_url && (
                        <img src={item.imagen_url} alt={item.nombre} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <p style={{ flex: 1, fontSize: 13 }}>{item.nombre}</p>
                      <p style={{ fontSize: 13, color: 'var(--texto-suave)' }}>x{item.cantidad}</p>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>S/ {Number(item.subtotal).toFixed(2)}</p>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                    <p style={{ fontWeight: 700 }}>Total: <span style={{ color: '#06b6d4' }}>S/ {Number(p.total).toFixed(2)}</span></p>
                  </div>
                </div>
              )}

              {/* Acciones */}
              {p.estado === 'pendiente' && (
                <div style={{ borderTop: '1px solid var(--borde)', padding: '12px 16px', display: 'flex', gap: 10 }}>
                  <button onClick={() => proceder(p)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', gap: 6, padding: '10px', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                    <CheckCircle size={15} /> Proceder y Registrar Suscripción
                  </button>
                  <button onClick={() => noProcede(p)} className="btn-danger" style={{ flex: 1, justifyContent: 'center', gap: 6, padding: '10px' }}>
                    <XCircle size={15} /> No procede
                  </button>
                </div>
              )}

              {p.estado !== 'pendiente' && (
                <div style={{ borderTop: '1px solid var(--borde)', padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => eliminar(p)} className="btn-danger" style={{ fontSize: 12 }}>
                    <Trash2 size={13} /> Eliminar pedido
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
