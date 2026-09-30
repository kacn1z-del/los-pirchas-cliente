import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useCart } from '../CartContext'

function formatColones(value) {
  return `₡${Number(value ?? 0).toLocaleString('es-CR')}`
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
}

const CATEGORY_ORDER = [
  'Menú infantil',
  'Especialidades Mexicanas',
  'Bebidas',
  'Batidos en agua',
  'Batidos en leche',
  'Bebidas calientes',
  'Otras Especialidades',
  'Para Compartir',
  'Entradas calientes',
  'Arroces',
  'Pastas',
  'Casados con',
  'Cortes especiales',
  'Hamburguesas',
  'Plato Ejecutivo',
  'Noche de Bocas',
]

const SUBCATEGORY_ORDER = {
  'bebidas calientes': ['Café', 'Té', 'Aguadulce', 'Chocolate'],
}

const HAMBURGUESAS = ['Bacon Lovers', 'Texana', 'Coronel Burger', 'Queso Burgesa', 'Pulled pork']
const ACOMPAÑAMIENTOS = ['Papas fritas', 'Papas en gajo', 'Aros de cebolla']

function normalizeText(text) {
  return (text || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function disponibilidadPorHorario(categoria) {
  const cat = normalizeText(categoria)
  const now = new Date()
  const dia = now.getDay()
  const minutos = now.getHours() * 60 + now.getMinutes()

  if (cat.includes('ejecutivo')) {
    const enHorario = dia >= 1 && dia <= 5 && minutos >= 11 * 60 && minutos < 16 * 60
    return { disponible: enHorario, mensaje: 'Disponible lunes a viernes, 11 a.m. a 4 p.m.' }
  }
  if (cat.includes('bocas')) {
    const enHorario = dia >= 1 && dia <= 4 && minutos >= 17 * 60 && minutos < 22 * 60
    return { disponible: enHorario, mensaje: 'Disponible lunes a jueves, 5 p.m. a 10 p.m.' }
  }
  return { disponible: true, mensaje: null }
}

function sortCategories(categories, customOrder) {
  const base = customOrder && customOrder.length > 0 ? customOrder : CATEGORY_ORDER
  const priority = base.map(normalizeText)
  return [...categories].sort((a, b) => {
    const ia = priority.indexOf(normalizeText(a))
    const ib = priority.indexOf(normalizeText(b))
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

function groupBySubcategoria(categoria, platos) {
  const tieneSubcategorias = platos.some((p) => p.subcategoria)
  if (!tieneSubcategorias) {
    return [{ subcategoria: null, platos }]
  }

  const orden = SUBCATEGORY_ORDER[normalizeText(categoria)] || []
  const ordenNormalizado = orden.map(normalizeText)

  const grupos = new Map()
  platos.forEach((p) => {
    const key = p.subcategoria || ''
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key).push(p)
  })

  const entries = [...grupos.entries()]
  entries.sort(([a], [b]) => {
    if (a === '' && b === '') return 0
    if (a === '') return -1
    if (b === '') return 1
    const ia = ordenNormalizado.indexOf(normalizeText(a))
    const ib = ordenNormalizado.indexOf(normalizeText(b))
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  return entries.map(([subcategoria, items]) => ({ subcategoria: subcategoria || null, platos: items }))
}

export default function Menu() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryOrder, setCategoryOrder] = useState([])
  const { addItem } = useCart()

  const [modalAbierto, setModalAbierto] = useState(false)
  const [platoPendiente, setPlatoPendiente] = useState(null)
  const [acompañamientoSeleccionado, setAcompañamientoSeleccionado] = useState('')
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1)

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'Menu'),
      (snapshot) => {
        setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'Config', 'categoryOrder'), (snap) => {
      setCategoryOrder(snap.exists() && Array.isArray(snap.data().orden) ? snap.data().orden : [])
    })
    return () => unsub()
  }, [])

  const esHamburguesa = (nombre) => {
    return HAMBURGUESAS.some((h) => normalizeText(nombre).includes(normalizeText(h)))
  }

  const abrirModalAcompañamientos = (plato) => {
    setPlatoPendiente(plato)
    setAcompañamientoSeleccionado('')
    setCantidadSeleccionada(1)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setPlatoPendiente(null)
    setAcompañamientoSeleccionado('')
    setCantidadSeleccionada(1)
  }

  const agregarConAcompañamiento = () => {
    if (!acompañamientoSeleccionado) {
      alert('Por favor selecciona un acompañamiento')
      return
    }

    for (let i = 0; i < cantidadSeleccionada; i++) {
      addItem(platoPendiente, acompañamientoSeleccionado)
    }

    cerrarModal()
  }

  const handleAgregarClick = (plato) => {
    if (esHamburguesa(plato.nombre)) {
      abrirModalAcompañamientos(plato)
    } else {
      addItem(plato)
    }
  }

  if (loading) {
    return <div className="state-panel">Cargando menú…</div>
  }

  if (error) {
    return (
      <div className="state-panel">
        <p>No se pudo cargar el menú.</p>
        <p className="state-panel__hint mono">{error}</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="state-panel">
        <p>Todavía no hay platos cargados.</p>
        <p className="state-panel__hint">
          En cuanto se agregue un documento a la colección <span className="mono">Menu</span>, aparece aquí.
        </p>
      </div>
    )
  }

  const term = normalizeText(search)
  const BEBIDA_ALIASES = ['bebida', 'batido', 'gaseosa', 'cerveza', 'licor', 'jugo', 'smoothie', 'cafe', 'helado', 'refresco']
  const matchesSearch = (item) => {
    if (!term) return true
    const nombre = normalizeText(item.nombre)
    const categoria = normalizeText(item.categoria)
    if (nombre.includes(term) || categoria.includes(term)) return true
    if (BEBIDA_ALIASES.some((alias) => alias.includes(term) || term.includes(alias))) {
      return BEBIDA_ALIASES.some((alias) => categoria.includes(alias))
    }
    return false
  }

  const visibleItems = items.filter(matchesSearch)

  const grouped = visibleItems.reduce((acc, item) => {
    const cat = item.categoria || 'Otros'
    acc[cat] = acc[cat] || []
    acc[cat].push(item)
    return acc
  }, {})

  const categories = sortCategories(Object.keys(grouped), categoryOrder)

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <div className="menu">
        <div className="menu__search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en el menú (ej. bebidas, casado, pollo)"
            className="menu__search-input"
            aria-label="Buscar en el menú"
          />
          {search && (
            <button type="button" className="menu__search-clear" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
              ✕
            </button>
          )}
        </div>

        {search && categories.length === 0 && (
          <p className="state-panel__hint" style={{ padding: '0 16px' }}>
            No se encontró nada para "{search}".
          </p>
        )}

        <nav className="category-nav" aria-label="Categorías del menú">
          {categories.map((cat) => (
            <button key={cat} className="category-nav__chip" onClick={() => scrollTo(slugify(cat))}>
              {cat}
            </button>
          ))}
        </nav>

        {categories.map((categoria) => {
          const horario = disponibilidadPorHorario(categoria)
          return (
            <section key={categoria} id={slugify(categoria)} className="menu__section">
              <div className="ribbon">
                <span className="ribbon__text">{categoria}</span>
              </div>
              {horario.mensaje && !horario.disponible && (
                <p className="menu__schedule-hint">⏰ {horario.mensaje}</p>
              )}
              {groupBySubcategoria(categoria, grouped[categoria]).map((grupo) => (
                <div key={grupo.subcategoria || '__sin_subcategoria__'}>
                  {grupo.subcategoria && <h4 className="menu__subcategory">{grupo.subcategoria}</h4>}
                  <div className="menu__grid">
                    {grupo.platos.map((plato) => {
                      const disponible = plato.disponible !== false && horario.disponible
                      return (
                        <article key={plato.id} className={`dish-card ${!disponible ? 'is-disabled' : ''}`}>
                          {plato.imagenUrl && (
                            <img src={plato.imagenUrl} alt={plato.nombre} className="dish-card__img" loading="lazy" />
                          )}
                          <div className="dish-card__top">
                            <h3>{plato.nombre}</h3>
                            <span className="dish-card__price mono">{formatColones(plato.precio)}</span>
                          </div>
                          {plato.descripcion && <p className="dish-card__desc">{plato.descripcion}</p>}
                          <button
                            className="dish-card__add"
                            disabled={!disponible}
                            onClick={() => handleAgregarClick(plato)}
                            aria-label={`Agregar ${plato.nombre} al carrito`}
                          >
                            {plato.disponible === false
                              ? 'No disponible'
                              : !horario.disponible
                              ? 'Fuera de horario'
                              : '+ Agregar'}
                          </button>
                        </article>
                      )
                    })}
                  </div>
                </div>
              ))}
            </section>
          )
        })}
      </div>

      {modalAbierto && (
        <>
          <div className="modal-overlay" onClick={cerrarModal}></div>
          <div className="modal">
            <div className="modal__header">
              <h3>Elige un acompañamiento</h3>
              <button className="modal__close" onClick={cerrarModal}>
                ✕
              </button>
            </div>

            <div className="modal__body">
              <p className="modal__product-name">{platoPendiente?.nombre}</p>

              <div className="modal__sides">
                <label className="modal__label">Acompañamiento</label>
                {ACOMPAÑAMIENTOS.map((acomp) => (
                  <div key={acomp} className="modal__radio-group">
                    <input
                      type="radio"
                      id={`acomp-${acomp}`}
                      name="acompañamiento"
                      value={acomp}
                      checked={acompañamientoSeleccionado === acomp}
                      onChange={(e) => setAcompañamientoSeleccionado(e.target.value)}
                    />
                    <label htmlFor={`acomp-${acomp}`}>{acomp}</label>
                  </div>
                ))}
              </div>

              <div className="modal__qty">
                <label className="modal__label">Cantidad</label>
                <div className="modal__qty-controls">
                  <button
                    onClick={() => setCantidadSeleccionada(Math.max(1, cantidadSeleccionada - 1))}
                    type="button"
                  >
                    −
                  </button>
                  <span>{cantidadSeleccionada}</span>
                  <button
                    onClick={() => setCantidadSeleccionada(cantidadSeleccionada + 1)}
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="modal__footer">
              <button className="btn-secondary" onClick={cerrarModal} type="button">
                Cancelar
              </button>
              <button className="btn-primary" onClick={agregarConAcompañamiento} type="button">
                Agregar al carrito
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
