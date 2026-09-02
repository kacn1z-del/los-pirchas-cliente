import { useEffect, useRef, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useCart } from '../CartContext'

function formatColones(value) {
  return `₡${Number(value ?? 0).toLocaleString('es-CR')}`
}

// Número de SINPE Móvil / WhatsApp de Los Pirchas
const SINPE_NUMBER = '8892-7759'
const WHATSAPP_ORDER_NUMBER = '8892-7759'

// Tipo de cambio de referencia colón/dólar para sugerir el monto en USD.
// Es aproximado (BCCR ronda los ₡450 por dólar) — Keny puede ajustarlo a mano
// aquí de vez en cuando; el cliente igual puede corregir el monto a mano.
const EXCHANGE_RATE_CRC_PER_USD = 450

function estimateUsd(colones) {
  if (!colones) return ''
  return (colones / EXCHANGE_RATE_CRC_PER_USD).toFixed(2)
}

const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'sinpe', label: 'SINPE Móvil' },
  { key: 'paypal', label: 'PayPal / Tarjeta' },
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
  const [paypalAmount, setPaypalAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // ---- PayPal (Smart Payment Buttons: PayPal + tarjeta directo en la página) ----
  const [paypalSdkReady, setPaypalSdkReady] = useState(false)
  const [paypalSdkFailed, setPaypalSdkFailed] = useState(false)
  const [paypalMessage, setPaypalMessage] = useState(null) // { texto, tipo: 'exito' | 'error' }
  const paypalButtonsRef = useRef(null)

  // Refs para que los callbacks del SDK de PayPal (que se registran una sola vez
  // al renderizar los botones) siempre lean los datos más recientes del form,
  // el carrito y el monto, en vez de quedarse con los valores del primer render.
  const formRef = useRef(form)
  formRef.current = form
  const itemsRef = useRef(items)
  itemsRef.current = items
  const totalRef = useRef(total)
  totalRef.current = total
  const paypalAmountRef = useRef(paypalAmount)
  paypalAmountRef.current = paypalAmount

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  useEffect(() => {
    if (paymentMethod === 'paypal' && !paypalAmount) {
      setPaypalAmount(estimateUsd(total))
    }
  }, [paymentMethod]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carga el SDK de PayPal una sola vez, la primera vez que el cliente elige
  // "PayPal / Tarjeta" (así no se carga el script para quien nunca lo usa).
  useEffect(() => {
    if (paymentMethod !== 'paypal' || paypalSdkReady || paypalSdkFailed) return
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID
    if (!clientId) {
      setPaypalSdkFailed(true)
      return
    }
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`
    script.onload = () => setPaypalSdkReady(true)
    script.onerror = () => setPaypalSdkFailed(true)
    document.body.appendChild(script)
  }, [paymentMethod]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dibuja los botones de PayPal (que renderiza automáticamente el botón de
  // "PayPal" y, aparte, el de "Debit or Credit Card") cada vez que la pestaña
  // de pago está activa y el SDK ya cargó.
  useEffect(() => {
    if (!paypalSdkReady || paymentMethod !== 'paypal' || !window.paypal || !paypalButtonsRef.current) return
    paypalButtonsRef.current.innerHTML = ''

    window.paypal
      .Buttons({
        style: { color: 'black', shape: 'rect', label: 'pay' },

        createOrder: (_data, actions) => {
          const f = formRef.current
          if (!f.nombre.trim() || !f.telefono.trim() || !f.direccion.trim()) {
            setPaypalMessage({ texto: 'Completá nombre, teléfono y dirección antes de pagar.', tipo: 'error' })
            return Promise.reject(new Error('Datos incompletos'))
          }
          const valor = parseFloat(paypalAmountRef.current)
          if (!valor || valor <= 0) {
            setPaypalMessage({ texto: 'Escribí un monto válido antes de pagar.', tipo: 'error' })
            return Promise.reject(new Error('Monto inválido'))
          }
          setPaypalMessage(null)
          return actions.order.create({
            purchase_units: [
              {
                description: 'Pedido Los Pirchas',
                amount: { value: valor.toFixed(2) },
              },
            ],
          })
        },

        onApprove: (_data, actions) =>
          actions.order.capture().then(async (details) => {
            try {
              const orderRef = await addDoc(collection(db, 'orders'), {
                clientName: formRef.current.nombre.trim(),
                clientPhone: formRef.current.telefono.trim(),
                clientAddress: formRef.current.direccion.trim(),
                notes: formRef.current.notas.trim() || null,
                restaurantName: 'Los Pirchas',
                items: itemsRef.current.map((i) => ({ nombre: i.nombre, precio: i.precio, qty: i.qty })),
                total: totalRef.current,
                paymentMethod: 'paypal',
                paypalOrderId: details.id,
                paypalAmountUsd: Number(paypalAmountRef.current),
                status: 'pending',
                createdAt: serverTimestamp(),
              })
              setPaypalMessage({
                texto: `¡Pago recibido! Gracias, ${details.payer?.name?.given_name || ''}.`,
                tipo: 'exito',
              })
              clear()
              onSuccess(orderRef.id, formRef.current)
            } catch (err) {
              setPaypalMessage({
                texto:
                  'El pago se completó, pero no se pudo registrar el pedido. Escribinos por WhatsApp con tu comprobante para que lo confirmemos a mano.',
                tipo: 'error',
              })
            }
          }),

        onError: (err) => {
          console.error(err)
          setPaypalMessage({ texto: 'Ocurrió un error al procesar el pago. Intentá de nuevo.', tipo: 'error' })
        },
      })
      .render(paypalButtonsRef.current)
  }, [paypalSdkReady, paymentMethod]) // eslint-disable-line react-hooks/exhaustive-deps

  const isValid = form.nombre.trim() && form.telefono.trim() && form.direccion.trim() && items.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    // El pago con PayPal/tarjeta crea el pedido solo, al aprobarse el pago
    // (ver onApprove arriba) — este botón de abajo no aplica para ese método.
    if (!isValid || paymentMethod === 'paypal') return
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
                onClick={() => !m.disabled && setPaymentMethod(m.key)}
                disabled={m.disabled}
              >
                {m.label}
                {m.note && <span className="payment-chip__note">{m.note}</span>}
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

        {paymentMethod === 'paypal' && (
          <div className="payment-box paypal-card">
            <div className="payment-box__header">
              <span className="paypal-badge">PayPal</span>
              <h3>Realizar pago</h3>
            </div>

            {paypalSdkFailed ? (
              <>
                <p>
                  El pago con PayPal no está disponible por el momento. Escribinos por WhatsApp y te
                  ayudamos a coordinar el pago.
                </p>
                <a
                  className="btn-whatsapp"
                  href={whatsappOrderLink(form, items, total)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Escribir por WhatsApp
                </a>
              </>
            ) : (
              <>
                <p>
                  Tu pedido es de <strong className="mono">{formatColones(total)}</strong>. Escribí el
                  monto en dólares y pagá de forma segura con PayPal o con tarjeta, sin salir de esta
                  página.
                </p>

                <label className="paypal-amount">
                  Monto a pagar (USD)
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={paypalAmount}
                    onChange={(e) => setPaypalAmount(e.target.value)}
                    placeholder="Ej: 25.00"
                  />
                </label>

                <div ref={paypalButtonsRef} className="paypal-buttons-mount" />

                {!paypalSdkReady && <p className="payment-box__hint">Cargando PayPal…</p>}

                {paypalMessage && (
                  <p className={`payment-status payment-status--${paypalMessage.tipo}`}>
                    {paypalMessage.texto}
                  </p>
                )}

                <p className="paypal-powered">Powered by PayPal</p>
              </>
            )}
          </div>
        )}

        {error && <p className="form-error">No se pudo enviar el pedido: {error}</p>}

        {paymentMethod !== 'paypal' && (
          <>
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
          </>
        )}
      </form>
    </div>
  )
}
