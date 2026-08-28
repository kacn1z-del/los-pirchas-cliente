import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useCart } from '../CartContext'

function formatColones(value) {
  return `₡${Number(value ?? 0).toLocaleString('es-CR')}`
}

// Número de SINPE Móvil / WhatsApp de Los Pirchas
const SINPE_NUMBER = '8892-7759'
const PIRCHAS_WHATSAPP = '8892-7759'

const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'sinpe', label: 'SINPE Móvil' },
  { key: 'tarjeta', label: 'Tarjeta', disabled: true },
]

function buildOrderMessage({ form, items, total, paymentMethod }) {
  const paymentLabel = PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label || paymentMethod
  const lines = [
    'Hola, quiero hacer este pedido en Los Pirchas:',
    '',
    ...items.map((i) => `• ${i.qty}x ${i.nombre} — ${formatColones(i.precio * i.qty)}`),
    '',
    `Total: ${formatColones(total)}`,
    `Pago: ${paymentLabel}`,
    '',
    `Nombre: ${form.nombre}`,
    `Teléfono: ${form.telefono}`,
    `Dirección: ${form.direccion}`,
  ]
  if (form.notas.trim()) lines.push(`Notas: ${form.notas}`)
  return lines.join('\n')
}

function pirchasWhatsappLink(details) {
  const phone = PIRCHAS_WHATSAPP.replace(/[^\d]/g, '')
  const message = encodeURIComponent(buildOrderMessage(details))
  return `https://wa.me/506${phone}?text=${message}`
}

export default function Checkout({ onBack, onSuccess }) {
  const { items, total, clear } = useCart()
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', notas: '' })
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const isValid =
    form.nombre.trim() && form.telefono.trim() && form.direccion.trim() && items.length > 0

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

  const handleShareWhatsapp = () => {
    if (!isValid) return
    window.open(pirchasWhatsappLink({ form, items, total, paymentMethod }), '_blank', 'noreferrer')
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
          <span className="payment-methods__label">Método de pago</span>
          <div className="payment-methods__options">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.key}
                type="button"
                className={`payment-methods__chip ${paymentMethod === method.key ? 'is-active' : ''}`}
                disabled={method.disabled}
                onClick={() => setPaymentMethod(method.key)}
              >
                {method.label}
                {method.disabled && <span className="payment-methods__soon">Próximamente</span>}
              </button>
            ))}
          </div>
        </div>

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

        {paymentMethod === 'efectivo' && (
          <div className="payment-box">
            <div className="payment-box__header">
              <h3>Pago en efectivo</h3>
            </div>
            <p>Pagás en efectivo directamente a la persona que te entrega el pedido.</p>
          </div>
        )}

        {error && <p className="form-error">No se pudo enviar el pedido: {error}</p>}

        <button type="submit" className="btn-primary" disabled={!isValid || submitting}>
          {submitting ? 'Enviando pedido…' : `Confirmar pedido — ${formatColones(total)}`}
        </button>

        <button
          type="button"
          className="btn-whatsapp btn-whatsapp--block"
          disabled={!isValid}
          onClick={handleShareWhatsapp}
        >
          Compartir pedido por WhatsApp
        </button>
      </form>
    </div>
  )
}
