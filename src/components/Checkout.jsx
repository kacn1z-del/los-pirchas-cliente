import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useCart } from '../CartContext'

function formatColones(value) {
  return `₡${Number(value ?? 0).toLocaleString('es-CR')}`
}

// Número de SINPE Móvil de Los Pirchas
const SINPE_NUMBER = '8892-7759'

const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'sinpe', label: 'SINPE Móvil' },
]

// Mismos valores que ya usa el admin en OrdersTable.jsx (order.tipo):
// 'llevar' = pasan a recoger el pedido; 'express' = entrega a domicilio y
// habilita ahí el cargo adicional de express.
const TIPOS_ENTREGA = [
  { key: 'llevar', label: 'Paso a recoger' },
  { key: 'express', label: 'Express (a domicilio)' },
]

export default function Checkout({ onBack, onSuccess }) {
  const { items, total, clear } = useCart()
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', notas: '' })
  const [tipoEntrega, setTipoEntrega] = useState('express')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const isValid =
    form.nombre.trim() &&
    form.telefono.trim() &&
    (tipoEntrega === 'llevar' || form.direccion.trim()) &&
    items.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    try {
      const orderRef = await addDoc(collection(db, 'orders'), {
        clientName: form.nombre.trim(),
        clientPhone: form.telefono.trim(),
        clientAddress: tipoEntrega === 'express' ? form.direccion.trim() : null,
        tipo: tipoEntrega,
        notes: form.notas.trim() || null,
        restaurantName: 'Los Pirchas',
        origen: 'cliente-web',
        items: items.map((i) => ({
          nombre: i.nota ? `${i.nombre} (${i.nota})` : i.nombre,
          precio: i.precio,
          qty: i.qty,
        })),
        total,
        paymentMethod,
        status: 'pending_approval',
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

        <div className="payment-methods">
          <p className="payment-methods__label">Tipo de entrega</p>
          <div className="payment-methods__chips">
            {TIPOS_ENTREGA.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`payment-chip ${tipoEntrega === t.key ? 'is-active' : ''}`}
                onClick={() => setTipoEntrega(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tipoEntrega === 'express' ? (
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
        ) : (
          <div className="payment-box">
            <h3>Pasás a recoger tu pedido</h3>
            <p>Te avisamos por WhatsApp cuando esté listo para retirar en el restaurante.</p>
          </div>
        )}

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
      </form>
    </div>
  )
}
