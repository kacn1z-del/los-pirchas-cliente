import { useCart } from '../CartContext'

export default function Header({ onCartClick }) {
  const { count } = useCart()

  return (
    <>
      <section className="hero">
        <div className="hero__texture" aria-hidden="true" />
        <img src="/logo.jpeg" alt="Los Pirchas" className="hero__logo" />
        <p className="hero__eyebrow">Restaurante y Chicharronera</p>
        <h1 className="hero__title">Los Pirchas</h1>
        <p className="hero__sub">San Luis, Acosta — diagonal a Unifami</p>
        <p className="hero__hours">Lun–Vie 11am–10pm · Mar cerrado</p>
      </section>

      <header className="bar">
        <div className="bar__brand">
          <img src="/logo.jpeg" alt="" className="bar__logo" />
          <span className="bar__name">Los Pirchas</span>
        </div>
        <button className="bar__cart" onClick={onCartClick} aria-label="Ver carrito">
          <span className="bar__cart-icon">🛒</span>
          {count > 0 && <span className="bar__cart-badge">{count}</span>}
        </button>
      </header>
    </>
  )
}
