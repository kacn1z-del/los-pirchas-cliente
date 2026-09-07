import { useEffect, useMemo, useState, useRef } from 'react'
import { collection, addDoc, onSnapshot, serverTimestamp, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { useCart } from '../CartContext'
import CartDrawer from './CartDrawer'
import './MenuBook.css'

function formatColones(value) {
  return `₡${Number(value ?? 0).toLocaleString('es-CR')}`
}

function normalizeCategory(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Mismo orden de categorías que en el menú físico / la app de pedidos, para
// que la "carta" en libro se vea igual de organizada.
const CATEGORY_ORDER = [
  'Entradas calientes',
  'Arroces',
  'Pastas',
  'Casados con',
  'Cortes especiales',
  'Hamburguesas',
  'Otras Especialidades',
  'Para Compartir',
  'Menú infantil',
  'Especialidades Mexicanas',
  'Bebidas',
  'Plato Ejecutivo',
  'Noche de Bocas',
]

function sortCategories(categories) {
  const priority = CATEGORY_ORDER.map(normalizeCategory)
  return [...categories].sort((a, b) => {
    const ia = priority.indexOf(normalizeCategory(a))
    const ib = priority.indexOf(normalizeCategory(b))
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

// Horarios especiales según el menú físico — igual que en Menu.jsx y en el
// panel de pedido telefónico del admin.
function disponibilidadPorHorario(categoria) {
  const cat = normalizeCategory(categoria)
  const now = new Date()
  const dia = now.getDay()
  const minutos = now.getHours() * 60 + now.getMinutes()

  if (cat === normalizeCategory('Plato Ejecutivo')) {
    return dia >= 1 && dia <= 5 && minutos >= 11 * 60 && minutos < 16 * 60
  }
  if (cat === normalizeCategory('Noche de Bocas')) {
    return dia >= 1 && dia <= 4 && minutos >= 17 * 60 && minutos < 22 * 60
  }
  return true
}

// Si una categoría tiene demasiados platos para una sola hoja, se reparte en
// varias "hojas" (páginas) de a lo sumo este tamaño, como en un menú impreso.
const PLATOS_POR_HOJA = 6

export default function MenuBook({ mesa }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageIndex, setPageIndex] = useState(0) // 0 = portada
  const [turning, setTurning] = useState(null) // 'next' | 'prev' | null
  const [cartOpen, setCartOpen] = useState(false)
  const [vista, setVista] = useState('libro') // 'libro' | 'checkout' | 'confirmacion'
  const [pedidoId, setPedidoId] = useState(null)
  const touchStartX = useRef(null)

  const { items: cartItems, count, clear } = useCart()
  const puedeVender = Boolean(mesa)

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'Menu'),
      (snapshot) => {
        setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  const hojas = useMemo(() => {
    const grouped = items.reduce((acc, item) => {
      const cat = item.categoria || 'Otros'
      acc[cat] = acc[cat] || []
      acc[cat].push(item)
      return acc
    }, {})

    const categorias = sortCategories(Object.keys(grouped))
    const paginas = []

    categorias.forEach((categoria) => {
      const platos = grouped[categoria]
      for (let i = 0; i < platos.length; i += PLATOS_POR_HOJA) {
        paginas.push({
          categoria,
          continuacion: i > 0,
          platos: platos.slice(i, i + PLATOS_POR_HOJA),
          disponibleHorario: disponibilidadPorHorario(categoria),
        })
      }
    })

    return paginas
  }, [items])

  const totalPaginas = hojas.length + 2
  const ultimaPagina = totalPaginas - 1

  const irA = (idx) => {
    if (idx < 0 || idx > ultimaPagina || idx === pageIndex) return
    setTurning(idx > pageIndex ? 'next' : 'prev')
    window.setTimeout(() => {
      setPageIndex(idx)
      setTurning(null)
    }, 220)
  }

  const siguiente = () => irA(pageIndex + 1)
  const anterior = () => irA(pageIndex - 1)

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40) return
    if (delta < 0) siguiente()
    else anterior()
  }

  const handlePedidoEnviado = (orderId) => {
    setPedidoId(orderId)
    setVista('confirmacion')
  }

  const handlePedirMas = () => {
    setPedidoId(null)
    setVista('libro')
    setPageIndex(1)
  }

  if (loading) {
    return (
      <div className="book-shell">
        <p className="book-loading">Abriendo el menú…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="book-shell">
        <p className="book-loading">No se pudo cargar el menú. Probá recargando la página.</p>
      </div>
    )
  }

  if (vista === 'checkout') {
    return (
      <div className="book-shell">
        <MesaCheckout
          mesa={mesa}
          onBack={() => setVista('libro')}
          onSuccess={handlePedidoEnviado}
        />
      </div>
    )
  }

  if (vista === 'confirmacion' && pedidoId) {
    return (
      <div className="book-shell">
        <ConfirmacionPedido mesa={mesa} pedidoId={pedidoId} onPedirMas={handlePedirMas} />
      </div>
    )
  }

  const renderPagina = () => {
    if (pageIndex === 0) {
      return (
        <div className="book-page book-page--cover">
          <img src="/logo.jpeg" alt="Los Pirchas" className="book-cover__logo" />
          <h1>Los Pirchas</h1>
          <p className="book-cover__sub">Restaurante y Chicharronera</p>
          <p className="book-cover__menu">Menú</p>
          {puedeVender && <p className="book-cover__mesa">Mesa {mesa}</p>}
          <button className="book-cover__btn" onClick={siguiente}>
            Abrir el menú →
          </button>
        </div>
      )
    }

    if (pageIndex === ultimaPagina) {
      return (
        <div className="book-page book-page--cover book-page--back">
          <img src="/logo.jpeg" alt="Los Pirchas" className="book-cover__logo book-cover__logo--small" />
          <h2>¡Buen provecho!</h2>
          <p className="book-cover__sub">San Luis, Acosta. Diagonal a Unifami.</p>
          <a className="book-cover__btn" href="/">
            ← Volver al inicio
          </a>
        </div>
      )
    }

    const hoja = hojas[pageIndex - 1]
    return (
      <div className="book-page">
        <div className="book-page__head">
          <h2>{hoja.categoria}</h2>
          {hoja.continuacion && <span className="book-page__cont">(continúa)</span>}
        </div>
        {!hoja.disponibleHorario && (
          <p className="book-page__horario">⏰ Fuera de horario para esta categoría ahora mismo.</p>
        )}
        <ul className="book-page__list">
          {hoja.platos.map((plato) => {
            const disponible = plato.disponible !== false && hoja.disponibleHorario
            return (
              <li key={plato.id} className="book-dish">
                <div className="book-dish__top">
                  <span className="book-dish__nombre">{plato.nombre}</span>
                  <span className="book-dish__linea" aria-hidden="true" />
                  <span className="book-dish__precio">{formatColones(plato.precio)}</span>
                  {puedeVender && (
                    <AddButton plato={plato} disponible={disponible} />
                  )}
                </div>
                {plato.descripcion && <p className="book-dish__desc">{plato.descripcion}</p>}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="book-shell">
      {puedeVender && (
        <div className="book-topbar">
          <span className="book-topbar__mesa">Mesa {mesa}</span>
          <button className="book-topbar__cart" onClick={() => setCartOpen(true)} aria-label="Ver pedido">
            🛒{count > 0 && <span className="book-topbar__badge">{count}</span>}
          </button>
        </div>
      )}

      <div
        className={`book ${turning ? `book--turning-${turning}` : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {renderPagina()}
      </div>

      <div className="book-nav">
        <button className="book-nav__btn" onClick={anterior} disabled={pageIndex === 0} aria-label="Página anterior">
          ‹
        </button>
        <span className="book-nav__count">
          {pageIndex + 1} / {totalPaginas}
        </span>
        <button
          className="book-nav__btn"
          onClick={siguiente}
          disabled={pageIndex === ultimaPagina}
          aria-label="Página siguiente"
        >
          ›
        </button>
      </div>

      {puedeVender && (
        <CartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          onCheckout={() => {
            setCartOpen(false)
            setVista('checkout')
          }}
        />
      )}
    </div>
  )
}

function AddButton({ plato, disponible }) {
  const { addItem } = useCart()
  const [agregado, setAgregado] = useState(false)

  const handleClick = () => {
    if (!disponible) return
    addItem(plato)
    setAgregado(true)
    window.setTimeout(() => setAgregado(false), 900)
  }

  return (
    <button
      type="button"
      className={`book-dish__add ${agregado ? 'is-added' : ''}`}
      onClick={handleClick}
      disabled={!disponible}
      aria-label={`Agregar ${plato.nombre} al pedido`}
    >
      {agregado ? '✓' : '+'}
    </button>
  )
}

// Checkout simplificado para pedidos hechos desde la mesa: no pide teléfono
// ni dirección (eso es solo para pedidos de entrega/recoger), porque la
// cuenta se cobra al final en la mesa como cualquier pedido tomado por un
// mesero.
function MesaCheckout({ mesa, onBack, onSuccess }) {
  const { items, total, clear } = useCart()
  const [nombre, setNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (items.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const orderRef = await addDoc(collection(db, 'orders'), {
        clientName: nombre.trim() || `Mesa ${mesa}`,
        mesa: String(mesa),
        restaurantName: 'Los Pirchas',
        origen: 'salon',
        tipo: 'salon',
        notes: notas.trim() || null,
        items: items.map((i) => ({ nombre: i.nombre, precio: i.precio, qty: i.qty })),
        total,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      clear()
      onSuccess(orderRef.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="book-page book-page--form">
      <button type="button" className="book-form__back" onClick={onBack}>
        ← Seguir viendo el menú
      </button>

      <h2>Confirmar pedido — Mesa {mesa}</h2>

      <div className="book-form__items">
        {items.map((item) => (
          <div key={item.id} className="book-form__row">
            <span>
              {item.qty} × {item.nombre}
            </span>
            <span className="mono">{formatColones(item.precio * item.qty)}</span>
          </div>
        ))}
      </div>
      <div className="book-form__total">
        <span>Total</span>
        <span className="mono">{formatColones(total)}</span>
      </div>

      <form onSubmit={handleSubmit} className="book-form">
        <label>
          Tu nombre (opcional, para identificar el pedido)
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Opcional" />
        </label>
        <label>
          Notas (opcional)
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Sin cebolla, término de la carne, etc."
          />
        </label>

        {error && <p className="form-error">No se pudo enviar el pedido: {error}</p>}

        <button type="submit" className="book-cover__btn" disabled={items.length === 0 || submitting}>
          {submitting ? 'Enviando…' : `Enviar pedido a cocina — ${formatColones(total)}`}
        </button>
      </form>
    </div>
  )
}

function ConfirmacionPedido({ mesa, pedidoId, onPedirMas }) {
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'orders', pedidoId), (snap) => {
      if (snap.exists()) setStatus(snap.data().status || 'pending')
    })
    return () => unsub()
  }, [pedidoId])

  const STATUS_LABELS = {
    pending: 'Pendiente',
    preparing: 'Preparando',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  }

  return (
    <div className="book-page book-page--cover">
      <div className="book-confirm__icon">✅</div>
      <h2>¡Pedido enviado!</h2>
      <p className="book-cover__sub">Mesa {mesa}</p>
      <p className="book-confirm__status">
        Estado: <strong>{STATUS_LABELS[status] || status}</strong>
      </p>
      <button className="book-cover__btn" onClick={onPedirMas}>
        Pedir algo más
      </button>
    </div>
  )
}
