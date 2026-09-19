import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)

const STORAGE_KEY = 'los-pirchas-cart'

function loadInitialCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadInitialCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = (product, nota = null) => {
    setItems((prev) => {
      // Con nota (ej. un sabor de batido), cada sabor es una línea aparte
      // del carrito en vez de sumarse a otro sabor distinto del mismo plato.
      const existing = prev.find((i) => i.id === product.id && (i.nota || null) === (nota || null))
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [...prev, { id: product.id, nombre: product.nombre, precio: product.precio, categoria: product.categoria || null, qty: 1, nota: nota || null }]
    })
  }

  const removeItem = (id, nota = null) => {
    setItems((prev) => prev.filter((i) => !(i.id === id && (i.nota || null) === (nota || null))))
  }

  const setQty = (id, qty, nota = null) => {
    if (qty <= 0) {
      removeItem(id, nota)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id && (i.nota || null) === (nota || null) ? { ...i, qty } : i))
    )
  }

  const clear = () => setItems([])

  const total = items.reduce((sum, i) => sum + i.precio * i.qty, 0)
  const count = items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQty, clear, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
