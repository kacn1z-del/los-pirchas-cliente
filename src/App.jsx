import { useState } from 'react'
import { CartProvider } from './CartContext'
import Header from './components/Header'
import Menu from './components/Menu'
import MenuBook from './components/MenuBook'
import CartDrawer from './components/CartDrawer'
import Checkout from './components/Checkout'
import OrderStatus from './components/OrderStatus'
import Reservation from './components/Reservation'
import SocialLinks from './components/SocialLinks'
import ReviewsSection from './components/ReviewsSection'
import './App.css'

// El QR de las mesas apunta a /carta?mesa=2: un menú en formato libro que,
// al venir con número de mesa, también deja pedir directo desde ahí (el
// pedido llega al admin como si lo hubiera tomado un mesero en esa mesa).
// /carta sin ese parámetro (por ejemplo si se comparte el link a mano) se
// queda en modo "solo ver", sin botones de agregar.
const esCarta = window.location.pathname.replace(/\/+$/, '') === '/carta'
const mesaDesdeQR = new URLSearchParams(window.location.search).get('mesa')

export default function App() {
  const [cartOpen, setCartOpen] = useState(false)
  const [view, setView] = useState('menu') // 'menu' | 'checkout' | 'confirmation' | 'reserva'
  const [completedOrder, setCompletedOrder] = useState(null)

  const handleCheckout = () => {
    setCartOpen(false)
    setView('checkout')
  }

  const handleSuccess = (orderId, form) => {
    setCompletedOrder({ orderId, form })
    setView('confirmation')
  }

  const handleNewOrder = () => {
    setCompletedOrder(null)
    setView('menu')
  }

  if (esCarta) {
    return (
      <CartProvider>
        <MenuBook mesa={mesaDesdeQR} />
      </CartProvider>
    )
  }

  return (
    <CartProvider>
      <div className="app-shell">
        <div className="flame flame--one" aria-hidden="true" />
        <div className="flame flame--two" aria-hidden="true" />

        {view !== 'confirmation' && (
          <Header onCartClick={() => setCartOpen(true)} onReservarClick={() => setView('reserva')} />
        )}

        <main className="app-main">
          {view === 'menu' && <Menu />}
          {view === 'checkout' && (
            <Checkout onBack={() => setView('menu')} onSuccess={handleSuccess} />
          )}
          {view === 'reserva' && <Reservation onBack={() => setView('menu')} />}
          {view === 'confirmation' && completedOrder && (
            <OrderStatus
              orderId={completedOrder.orderId}
              form={completedOrder.form}
              onNewOrder={handleNewOrder}
            />
          )}
        </main>

        {view === 'menu' && <ReviewsSection />}
        {view === 'menu' && <SocialLinks />}

        {view === 'menu' && (
          <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onCheckout={handleCheckout} />
        )}
      </div>
    </CartProvider>
  )
}
