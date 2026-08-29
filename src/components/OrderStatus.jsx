import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

const STATUS_STEPS = [
  { key: 'pending', label: 'Pendiente' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'on_the_way', label: 'En camino' },
  { key: 'delivered', label: 'Entregado' },
]

function formatColones(value) {
  return `₡${Number(value ?? 0).toLocaleString('es-CR')}`
}

function formatDate(ts) {
  const date = ts?.toDate?.()
  if (!date) return ''
  return date.toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function whatsappConfirmLink(orderId, form) {
  const message = encodeURIComponent(
    `Hola, soy ${form.nombre}. Acabo de hacer un pedido en Los Pirchas (#${orderId.slice(
      0,
      6
    )}). Aquí les mando el comprobante de SINPE.`
  )
  const phone = form.telefono.replace(/[^\d]/g, '')
  return `https://wa.me/${phone}?text=${message}`
}

export default function OrderStatus({ orderId, form, onNewOrder }) {
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (!orderId) return
    const unsub = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() })
    })
    return () => unsub()
  }, [orderId])

  const status = order?.status || 'pending'
  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === status)

  return (
    <div className="order-status">
      <div className="order-status__icon">✅</div>
      <h1>¡Pedido recibido!</h1>
      <p className="order-status__id mono">Pedido #{orderId.slice(0, 6)}</p>

      <div className="tracker">
        {STATUS_STEPS.map((step, i) => (
          <div key={step.key} className={`tracker__step ${i <= currentIndex ? 'is-active' : ''}`}>
            <span className="tracker__dot" />
            <span className="tracker__label">{step.label}</span>
          </div>
        ))}
      </div>

      {order && (
        <div className="receipt" id="receipt">
          <div className="receipt__header">
            <img src="/logo.jpeg" alt="Los Pirchas" className="receipt__logo" />
            <h2>Los Pirchas</h2>
            <p className="receipt__sub">Restaurante y Chicharronera</p>
          </div>
          <p className="receipt__meta">
            Pedido #{orderId.slice(0, 6)} · {formatDate(order.createdAt)}
          </p>
          <p className="receipt__meta">
            {order.clientName} · {order.clientPhone}
          </p>
          {order.clientAddress && <p className="receipt__meta">{order.clientAddress}</p>}

          <div className="receipt__items">
            {(order.items || []).map((item, i) => (
              <div key={i} className="receipt__row">
                <span>
                  {item.qty} × {item.nombre}
                </span>
                <span className="mono">{formatColones(item.precio * item.qty)}</span>
              </div>
            ))}
          </div>

          <div className="receipt__total">
            <span>Total</span>
            <span className="mono">{formatColones(order.total)}</span>
          </div>
          <p className="receipt__payment">Pago: SINPE Móvil</p>
        </div>
      )}

      <div className="order-status__actions">
        <button className="btn-secondary" onClick={() => window.print()}>
          🖨️ Imprimir recibo
        </button>
        <a className="btn-whatsapp" href={whatsappConfirmLink(orderId, form)} target="_blank" rel="noreferrer">
          Enviar comprobante por WhatsApp
        </a>
      </div>

      <button className="back-link" onClick={onNewOrder}>
        Hacer otro pedido
      </button>
    </div>
  )
}

