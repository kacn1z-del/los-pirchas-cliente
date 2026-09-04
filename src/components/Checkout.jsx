import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useCart } from '../CartContext'

function formatColones(value) {
  return `₡${Number(value ?? 0).toLocaleString('es-CR')}`
}

// Número de SINPE Móvil / WhatsApp de Los Pirchas
const SINPE_NUMBER = '8892-7759'
const WHATSAPP_ORDER_NUMBER = '8892-7759'

const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'sinpe', label: 'SINPE Móvil' },
]

function buildWhatsappOrderMessage(form, items, total) {
  const lines = items.map((i) => `• ${i.qty} x ${i.nombre} — ${formatColones(i.precio * i.qty)}`)
  const parts = [
    'Hola! Quiero hacer este pedido en Los Pirchas:',
    '',
    ...lines,
    '',
    `Total: ${formatColones(total)}`,
  ]
  if (form.nombre.trim()) parts.push('', `Nombre: ${form.nombre.trim()}`)
  if (form.direccion.trim()) parts.push(`Dirección: ${form.direccion.trim()}`)
  if (form.notas.trim()) parts.push(`Notas: ${form.notas.trim()}`)
  return encodeURIComponent(parts.join('\n'))
}

function whatsappOrderLink(form, items, total) {
  const phone = WHATSAPP_ORDER_NUMBER.replace(/[^\d]/g, '')
  return `https://wa.me/506${phone}?text=${buildWhatsappOrderMessage(form, items, total)}`
}

export default function Checkout({ onBack, onSuccess }) {
  const { items, total, clear } = useCart()
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', notas: '' })
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const isValid = form.nombre.trim() && form.telefono.trim() && form.direccion.trim() && items.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    try {
      const orderRef = await addDoc(collection(db, 'orders'), {
        clientName: form.nombre.trim(),
        clientPhone: form.telefono.trim(),
        clientAddress: form.direccion.trim(),
        notes: form.notas.trim() || null,
        restaurantName: 'Los Pirchas',
        origen: 'cliente-web',
        items: items.map((i) => ({ nombre: i.nombre, precio: i.precio, qty: i.qty })),
        total,
        paymentMethod,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      clear()
      onSuccess(orderRef.id, form)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="checkout">
      <button className="back-link" onClick={onBack}>
        ← Volver al carrito
      </button>

      <h1>Datos de entrega</h1>

      <form className="checkout__form" onSubmit={handleSubmit}>
        <label>
          Nombre completo
          <input value={form.nombre} onChange={update('nombre')} placeholder="Tu nombre" required />
        </label>
        <label>
          Teléfono (WhatsApp)
          <input
            value={form.telefono}
            onChange={update('telefono')}
            placeholder="8888-8888"
            inputMode="tel"
            required
          />
        </label>
        <label>
          Dirección de entrega
          <textarea
            value={form.direccion}
            onChange={update('direccion')}
            placeholder="Casa, señas, distrito…"
            rows={3}
            required
          />
        </label>
        <label>
          Notas (opcional)
          <textarea
            value={form.notas}
            onChange={update('notas')}
            placeholder="Sin cebolla, tocar el timbre, etc."
            rows={2}
          />
        </label>

        <div className="payment-methods">
          <p className="payment-methods__label">Método de pago</p>
          <div className="payment-methods__chips">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`payment-chip ${paymentMethod === m.key ? 'is-active' : ''}`}
                onClick={() => setPaymentMethod(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === 'efectivo' && (
          <div className="payment-box">
            <h3>Pago en efectivo</h3>
            <p>Pagás en efectivo directamente a la persona que te entrega el pedido.</p>
          </div>
        )}

        {paymentMethod === 'sinpe' && (
          <div className="payment-box">
            <div className="payment-box__header">
              <span className="sinpe-badge">SINPE</span>
              <h3>Pago por SINPE Móvil</h3>
            </div>
            <p>
              Transferí <strong className="mono">{formatColones(total)}</strong> al número{' '}
              <strong className="mono">{SINPE_NUMBER}</strong> a nombre de Los Pirchas.
            </p>
            <p className="payment-box__hint">
              Después de confirmar el pedido, mandanos el comprobante por WhatsApp para agilizar la
              entrega.
            </p>
          </div>
        )}

        {error && <p className="form-error">No se pudo enviar el pedido: {error}</p>}

        <button type="submit" className="btn-primary" disabled={!isValid || submitting}>
          {submitting ? 'Enviando pedido…' : `Confirmar pedido — ${formatColones(total)}`}
        </button>

        <a
          className="btn-whatsapp btn-whatsapp--block"
          href={whatsappOrderLink(form, items, total)}
          target="_blank"
          rel="noreferrer"
        >
          Compartir pedido por WhatsApp
        </a>
      </form>
    </div>
  )
}
