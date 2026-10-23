import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useTienda = create((set, get) => ({
  tiendaActual: 'miller', // Exclusivo SuscriTech Global
  modoOscuro: true,
  cambiarTienda: () => {},
  toggleModoOscuro: () => set({ modoOscuro: !get().modoOscuro }),
}))

export const useCarrito = create(
  persist(
    (set, get) => ({
      items: [],
      agregar: (producto) => {
        const items = get().items
        const key = producto.cartKey || producto.id
        const existente = items.find(i => (i.cartKey || i.id) === key)
        if (existente) {
          set({
            items: items.map(i =>
              (i.cartKey || i.id) === key ? { ...i, cantidad: i.cantidad + 1 } : i
            )
          })
        } else {
          set({
            items: [
              ...items,
              { ...producto, cartKey: key, cantidad: 1, tienda: 'miller' }
            ]
          })
        }
      },
      quitar: (key) => set({ items: get().items.filter(i => (i.cartKey || i.id) !== key) }),
      cambiarCantidad: (key, cantidad) => {
        if (cantidad < 1) return
        set({
          items: get().items.map(i =>
            (i.cartKey || i.id) === key ? { ...i, cantidad } : i
          )
        })
      },
      limpiar: () => set({ items: [] }),
      limpiarPorTienda: () => set({ items: [] }),
      total: () => get().items.reduce((acc, i) => acc + Number(i.precio) * i.cantidad, 0),
      cantidad: () => get().items.reduce((acc, i) => acc + i.cantidad, 0),
    }),
    { name: 'carrito-suscritech' }
  )
)

export const useAuth = create((set) => ({
  usuario: null,
  perfil: null,
  setUsuario: (usuario) => set({ usuario }),
  setPerfil: (perfil) => set({ perfil }),
  logout: () => set({ usuario: null, perfil: null }),
}))
