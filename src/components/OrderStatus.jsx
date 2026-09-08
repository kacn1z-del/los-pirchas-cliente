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

// Número de WhatsApp de Los Pirchas — mismo que el de SINPE Móvil.
const RESTAURANT_WHATSAPP = '8892-7759'

function whatsappOrderLink(orderId, order) {
  const lines = (order.items || []).map(
    (i) => `• ${i.qty} x ${i.nombre} — ${formatColones(i.precio * i.qty)}`
  )
  const parts = [
    `Hola! Ya hice este pedido en Los Pirchas (#${orderId.slice(0, 6)}):`,
    '',
    ...lines,
    '',
    `Total: ${formatColones(order.total)}`,
  ]
  if (order.clientName) parts.push('', `Nombre: ${order.clientName}`)
  if (order.clientAddress) parts.push(`Dirección: ${order.clientAddress}`)
  const message = encodeURIComponent(parts.join('\n'))
  const phone = RESTAURANT_WHATSAPP.replace(/[^\d]/g, '')
  return `https://wa.me/506${phone}?text=${message}`
}

function whatsappReceiptLink(orderId, form) {
  const message = encodeURIComponent(
    `Hola, soy ${form.nombre}. Acabo de hacer un pedido en Los Pirchas (#${orderId.slice(
      0,
      6
    )}). Aquí les mando el comprobante de SINPE.`
  )
  const phone = RESTAURANT_WHATSAPP.replace(/[^\d]/g, '')
  return `https://wa.me/506${phone}?text=${message}`
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

  const handlePrint = () => {
    if (!order) return
    const itemsHtml = (order.items || [])
      .map(
        (item) =>
          `<div class="row"><span>${item.qty} × ${item.nombre}</span><span>${formatColones(
            item.precio * item.qty
          )}</span></div>`
      )
      .join('')

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Recibo — Los Pirchas</title>
<style>
  body { font-family: -apple-system, sans-serif; color: #241c15; padding: 24px; max-width: 360px; margin: 0 auto; }
  .center { text-align: center; }
  h1 { font-size: 18px; margin: 8px 0 2px; }
  .sub { font-size: 11px; color: #8f7c68; margin-bottom: 14px; }
  .meta { font-size: 12px; color: #6b5843; margin: 2px 0; }
  .items { margin: 16px 0; padding: 12px 0; border-top: 1px dashed #c9c0b3; border-bottom: 1px dashed #c9c0b3; }
  .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
  .total { display: flex; justify-content: space-between; font-weight: 700; font-size: 15px; margin-bottom: 4px; }
  .payment { font-size: 11px; color: #8f7c68; text-align: center; margin-top: 4px; }
</style>
</head>
<body>
  <div class="center">
    <h1>Los Pirchas</h1>
    <p class="sub">Restaurante y Chicharronera</p>
  </div>
  <p class="meta center">Pedido #${orderId.slice(0, 6)} · ${formatDate(order.createdAt)}</p>
  <p class="meta center">${order.clientName || ''} · ${order.clientPhone || ''}</p>
  ${order.clientAddress ? `<p class="meta center">${order.clientAddress}</p>` : ''}
  <div class="items">${itemsHtml}</div>
  <div class="total"><span>Total</span><span>${formatColones(order.total)}</span></div>
  <p class="payment">Pago: ${order.paymentMethod === 'sinpe' ? 'SINPE Móvil' : 'Efectivo'}</p>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

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
          <p className="receipt__payment">
            Pago: {order.paymentMethod === 'sinpe' ? 'SINPE Móvil' : 'Efectivo'}
          </p>
        </div>
      )}

      <div className="order-status__actions">
        <button className="btn-secondary" onClick={handlePrint}>
          🖨️ Imprimir recibo
        </button>
        {order && (
          <a className="btn-whatsapp" href={whatsappOrderLink(orderId, order)} target="_blank" rel="noreferrer">
            Compartir pedido por WhatsApp
          </a>
        )}
        {order?.paymentMethod === 'sinpe' && (
          <a className="btn-whatsapp" href={whatsappReceiptLink(orderId, form)} target="_blank" rel="noreferrer">
            Compartir recibo por WhatsApp
          </a>
        )}
      </div>

      <button className="back-link" onClick={onNewOrder}>
        Hacer otro pedido
      </button>
    </div>
  )
}
