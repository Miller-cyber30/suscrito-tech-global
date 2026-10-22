import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { exportarCSV } from '../../lib/exportar'
import toast from 'react-hot-toast'
import {
  BarChart3, Calendar, FileText, FileSpreadsheet,
  TrendingUp, Package, Star, DollarSign, Award, ShoppingCart, Printer, Cpu
} from 'lucide-react'

export default function AdminAnalisis() {
  const [cargando, setCargando]     = useState(true)
  const [ventasData, setVentasData] = useState([])

  const [desde, setDesde] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })
  const [hasta, setHasta] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
  })

  useEffect(() => { cargarDatos() }, [desde, hasta])

  async function cargarDatos() {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('*, venta_items(*, productos(*))')
        .gte('created_at', desde + 'T00:00:00')
        .lte('created_at', hasta + 'T23:59:59')

      if (error) throw error
      setVentasData((data || []).filter(v => v.tienda !== 'richard'))
    } catch (error) {
      toast.error('Error al cargar análisis: ' + error.message)
    } finally {
      setCargando(false)
    }
  }

  // --- PROCESAMIENTO DE DATOS ---
  let totalGanancias = 0
  let totalProductosVendidos = 0
  const productosStats = {}
  const diasSemana = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

  ventasData.forEach(venta => {
    totalGanancias += Number(venta.total || 0)
    const dia = new Date(venta.created_at).getDay()

    venta.venta_items?.forEach(item => {
      const cant = Number(item.cantidad || 0)
      const subtotal = Number(item.subtotal || 0)

      totalProductosVendidos += cant
      diasSemana[dia] += cant

      const p = item.productos
      const key = p?.id || item.producto_id || item.nombre_producto
      if (key) {
        if (!productosStats[key]) {
          productosStats[key] = {
            id: key,
            nombre: p?.nombre || item.nombre_producto,
            cantidad: 0,
            ganancia: 0,
            stock: p?.stock || 0,
            img: p?.imagen_url
          }
        }
        productosStats[key].cantidad += cant
        productosStats[key].ganancia += subtotal
      }
    })
  })

  const fInicio = new Date(desde + 'T00:00:00')
  const fFin    = new Date(hasta + 'T23:59:59')
  const diasTranscurridos = Math.max(1, Math.ceil((fFin - fInicio) / (1000 * 60 * 60 * 24)))

  const promedioDiarioGanancia  = totalGanancias / diasTranscurridos
  const promedioDiarioProductos = totalProductosVendidos / diasTranscurridos

  const listaProductos   = Object.values(productosStats)
  const topRentables     = [...listaProductos].sort((a, b) => b.ganancia - a.ganancia)
  const topVendidos      = [...listaProductos].sort((a, b) => b.cantidad - a.cantidad)
  const productoEstrella = topRentables.length > 0 ? topRentables[0] : null

  const nombresDias     = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const maxProductosDia = Math.max(...Object.values(diasSemana), 1)

  // --- EXPORTACIONES ---
  const handleExportarExcel = () => {
    if (topRentables.length === 0) return toast.error('No hay datos para exportar')
    exportarCSV(`Analisis_SuscriTech_${desde}_al_${hasta}`, [
      ['Servicio', 'Suscripciones Vendidas', 'Ingresos (S/)', 'Cupos Actuales'],
      ...topRentables.map(p => [p.nombre, p.cantidad, p.ganancia.toFixed(2), p.stock])
    ])
    toast.success('Excel exportado')
  }

  const handleExportarTXT = () => {
    if (topRentables.length === 0) return toast.error('No hay datos para exportar')
    let txt = `REPORTE DE RENTABILIDAD - SUSCRITECH GLOBAL\nDesde: ${desde} | Hasta: ${hasta}\n`
    txt += `==========================================\n`
    txt += `Total Ingresos: S/ ${totalGanancias.toFixed(2)}\n`
    txt += `Total Suscripciones Vendidas: ${totalProductosVendidos}\n`
    txt += `Promedio Diario de Ingresos: S/ ${promedioDiarioGanancia.toFixed(2)}\n`
    txt += `Servicio Estrella: ${productoEstrella?.nombre || 'N/A'}\n`
    txt += `==========================================\n\n`

    txt += `--- TOP SERVICIOS MÁS RENTABLES ---\n`
    topRentables.slice(0, 20).forEach((p, i) => {
      txt += `${i + 1}. ${p.nombre} -> Ingreso: S/ ${p.ganancia.toFixed(2)} | Vendidos: ${p.cantidad} | Cupos: ${p.stock}\n`
    })

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Reporte_SuscriTech_${desde}_al_${hasta}.txt`
    link.click()
    toast.success('Archivo TXT exportado')
  }

  const handleImprimirPDF = () => {
    window.print()
  }

  return (
    <div className="analisis-container">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .analisis-container { padding: 0 !important; background: white !important; color: black !important; }
          .card { border: 1px solid #ddd !important; box-shadow: none !important; background: white !important; }
          * { color: black !important; }
        }
      `}</style>

      {/* ENCABEZADO Y FILTROS */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fuente-display)', fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={24} color="#7c3aed" /> Finanzas & Rendimiento<span style={{ color: '#06b6d4' }}>.</span>
          </h1>
          <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 4 }}>
            Análisis de rentabilidad de SuscriTech Global
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="card" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={16} color="#06b6d4" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--texto)', outline: 'none', fontSize: 13 }} />
              <span style={{ color: 'var(--texto-suave)' }}>-</span>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--texto)', outline: 'none', fontSize: 13 }} />
            </div>
          </div>

          <button onClick={handleExportarExcel} className="btn-ghost" style={{ fontSize: 13, padding: '8px 12px' }} title="Exportar Excel">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={handleExportarTXT} className="btn-ghost" style={{ fontSize: 13, padding: '8px 12px' }} title="Exportar TXT">
            <FileText size={16} /> TXT
          </button>
          <button onClick={handleImprimirPDF} className="btn-primary" style={{ fontSize: 13, padding: '8px 12px', gap: 6, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="spinner" style={{ margin: '40px auto' }} />
      ) : (
        <>
          {/* TARJETAS DE KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: 20, borderTop: '3px solid #7c3aed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600, textTransform: 'uppercase' }}>Ingresos Totales</p>
                  <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 26, fontWeight: 800, marginTop: 4, color: '#06b6d4' }}>
                    S/ {totalGanancias.toFixed(2)}
                  </h3>
                </div>
                <div style={{ background: 'rgba(124, 58, 237, 0.18)', padding: 8, borderRadius: 8 }}><DollarSign size={20} color="#a855f7" /></div>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600, textTransform: 'uppercase' }}>Suscripciones Vendidas</p>
                  <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 26, fontWeight: 800, marginTop: 4 }}>
                    {totalProductosVendidos}
                  </h3>
                </div>
                <div style={{ background: 'var(--fondo)', padding: 8, borderRadius: 8 }}><Package size={20} color="#06b6d4" /></div>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600, textTransform: 'uppercase' }}>Promedio Diario</p>
                  <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 20, fontWeight: 800, marginTop: 4, color: '#10b981' }}>
                    S/ {promedioDiarioGanancia.toFixed(2)}
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 2 }}>
                    ~ {Math.round(promedioDiarioProductos)} suscripciones por día
                  </p>
                </div>
                <div style={{ background: '#10b98122', padding: 8, borderRadius: 8 }}><TrendingUp size={20} color="#10b981" /></div>
              </div>
            </div>

            <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(6, 182, 212, 0.15))', border: '1px solid rgba(124, 58, 237, 0.35)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: '#06b6d4', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={14} fill="currentColor" /> Servicio Estrella
                  </p>
                  <h3 style={{ fontFamily: 'var(--fuente-display)', fontSize: 18, fontWeight: 700, marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {productoEstrella ? productoEstrella.nombre : 'Sin datos'}
                  </h3>
                  {productoEstrella && (
                    <p style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 4, fontWeight: 600 }}>
                      S/ {productoEstrella.ganancia.toFixed(2)} generados
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO: VENTAS POR DÍA DE LA SEMANA */}
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={18} color="#06b6d4" />
              Dinámica de Ventas por Día (Suscripciones Activadas)
            </h3>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 180, paddingTop: 20 }}>
              {nombresDias.map((nombre, i) => {
                const indexDia = i === 6 ? 0 : i + 1
                const cant = diasSemana[indexDia]
                const alturaPorcentaje = maxProductosDia === 0 ? 0 : (cant / maxProductosDia) * 100
                const esMayor = cant === maxProductosDia && cant > 0

                return (
                  <div key={nombre} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: esMayor ? '#06b6d4' : 'var(--texto-suave)' }}>
                      {cant > 0 ? cant : ''}
                    </span>
                    <div style={{
                      width: '100%',
                      maxWidth: 40,
                      height: `${alturaPorcentaje}%`,
                      minHeight: 4,
                      background: esMayor ? 'linear-gradient(180deg, #06b6d4, #7c3aed)' : 'var(--borde)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.5s ease'
                    }} />
                    <span style={{ fontSize: 12, fontWeight: esMayor ? 700 : 500, color: 'var(--texto)' }}>{nombre}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* LISTAS: RENTABLES VS VENDIDOS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

            {/* TOP RENTABLES */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--borde)', background: 'var(--fondo)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={18} color="#10b981" />
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Top Servicios Más Rentables</h3>
              </div>
              <div style={{ padding: '12px 0' }}>
                {topRentables.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--texto-suave)', padding: 20 }}>Sin datos en este periodo</p>
                ) : (
                  topRentables.slice(0, 10).map((p, idx) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--borde)' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: idx < 3 ? '#06b6d4' : 'var(--texto-suave)', width: 20 }}>
                        {idx + 1}
                      </span>
                      {p.img ? (
                        <img src={p.img} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--fondo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="var(--borde)" /></div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</p>
                        <p style={{ fontSize: 11, color: 'var(--texto-suave)' }}>Cupos actuales: <span style={{ color: p.stock < 5 ? '#f87171' : 'inherit' }}>{p.stock}</span></p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>S/ {p.ganancia.toFixed(2)}</p>
                        <p style={{ fontSize: 11, color: 'var(--texto-suave)' }}>{p.cantidad} cupos</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TOP VENDIDOS */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--borde)', background: 'var(--fondo)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={18} color="#a855f7" />
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Top Más Vendidos (Rotación)</h3>
              </div>
              <div style={{ padding: '12px 0' }}>
                {topVendidos.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--texto-suave)', padding: 20 }}>Sin datos en este periodo</p>
                ) : (
                  topVendidos.slice(0, 10).map((p, idx) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--borde)' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--texto-suave)', width: 20 }}>
                        {idx + 1}
                      </span>
                      {p.img ? (
                        <img src={p.img} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--fondo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="var(--borde)" /></div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</p>
                        <p style={{ fontSize: 11, color: 'var(--texto-suave)' }}>Cupos actuales: <span style={{ color: p.stock < 5 ? '#f87171' : 'inherit' }}>{p.stock}</span></p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#06b6d4' }}>{p.cantidad} cupos</p>
                        <p style={{ fontSize: 11, color: 'var(--texto-suave)' }}>S/ {p.ganancia.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
