import { useEffect, useMemo, useState, useRef } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
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

// Si una categoría tiene demasiados platos para una sola hoja, se reparte en
// varias "hojas" (páginas) de a lo sumo este tamaño, como en un menú impreso.
const PLATOS_POR_HOJA = 6

export default function MenuBook() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageIndex, setPageIndex] = useState(0) // 0 = portada
  const [turning, setTurning] = useState(null) // 'next' | 'prev' | null
  const touchStartX = useRef(null)

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
        })
      }
    })

    return paginas
  }, [items])

  // Página 0 = portada, última página = contraportada. Las del medio son "hojas".
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

  const renderPagina = () => {
    if (pageIndex === 0) {
      return (
        <div className="book-page book-page--cover">
          <img src="/logo.jpeg" alt="Los Pirchas" className="book-cover__logo" />
          <h1>Los Pirchas</h1>
          <p className="book-cover__sub">Restaurante y Chicharronera</p>
          <p className="book-cover__menu">Menú</p>
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
        <ul className="book-page__list">
          {hoja.platos.map((plato) => (
            <li key={plato.id} className="book-dish">
              <div className="book-dish__top">
                <span className="book-dish__nombre">{plato.nombre}</span>
                <span className="book-dish__linea" aria-hidden="true" />
                <span className="book-dish__precio">{formatColones(plato.precio)}</span>
              </div>
              {plato.descripcion && <p className="book-dish__desc">{plato.descripcion}</p>}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="book-shell">
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
    </div>
  )
}
