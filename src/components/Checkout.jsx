import { useState } from 'react'
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useCart } from '../CartContext'

// Mismos 3 cupos que usa el admin en PhoneOrderPanel.jsx para el plano de
// Salón — un pedido Express de acá ocupa uno igual que uno telefónico.
const EXPRESS_SLOTS = ['Express 1', 'Express 2', 'Express 3']

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
      // Si es Express, le asignamos un cupo del plano de Salón ("Express
      // 1/2/3"), igual que hace el admin con los pedidos telefónicos — así
      // el pedido aparece ahí apenas entra, no solo en la lista de pedidos.
      // Si los 3 cupos ya están ocupados, el pedido se crea igual, solo que
      // sin cupo asignado (se puede seguir viendo y cobrando desde "Todos
      // los pedidos" en el admin).
      let mesaAsignada = null
      if (tipoEntrega === 'express') {
        const ocupadosSnap = await getDocs(query(collection(db, 'orders'), where('mesaAbierta', '==', true)))
        const ocupados = ocupadosSnap.docs.map((d) => d.data().mesa).filter(Boolean)
        mesaAsignada = EXPRESS_SLOTS.find((s) => !ocupados.includes(s)) || null
      }

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
          categoria: i.categoria || null,
        })),
        total,
        paymentMethod,
        status: 'pending_approval',
        mesa: mesaAsignada,
        mesaAbierta: !!mesaAsignada,
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
          <>
            <div className="payment-box">
              <p>⚠️ Todo pedido Express tiene un costo adicional por envío, que se suma al total al momento de cobrar.</p>
            </div>
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
          </>
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
              Consulte monto a transferir al número{' '}
              <strong className="mono">{SINPE_NUMBER}</strong> a nombre de Auris Calderón Carvajal.
            </p>
            <p className="payment-box__hint">
              Después de confirmar el pedido, comparta el comprobante por WhatsApp para agilizar la
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
