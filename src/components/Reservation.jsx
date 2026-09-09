import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const TIPOS_MESA = [
  { key: 'una', label: 'Una mesa' },
  { key: 'varias', label: 'Varias mesas' },
  { key: 'salon', label: 'Todo el salón' },
]

export default function Reservation({ onBack }) {
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    fecha: '',
    hora: '',
    personas: '',
    notas: '',
  })
  const [tipoMesa, setTipoMesa] = useState('una')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [enviada, setEnviada] = useState(false)

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const isValid =
    form.nombre.trim() &&
    form.telefono.trim() &&
    form.fecha &&
    form.hora &&
    Number(form.personas) > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    try {
      await addDoc(collection(db, 'reservas'), {
        clientName: form.nombre.trim(),
        clientPhone: form.telefono.trim(),
        fecha: form.fecha,
        hora: form.hora,
        personas: Number(form.personas),
        tipoMesa,
        notas: form.notas.trim() || null,
        restaurantName: 'Los Pirchas',
        estado: 'pendiente',
        createdAt: serverTimestamp(),
      })
      setEnviada(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (enviada) {
    return (
      <div className="checkout">
        <div className="book-confirm__icon">✅</div>
        <h1>¡Solicitud enviada!</h1>
        <p className="payment-box__hint">
          Tu solicitud de reserva quedó pendiente de aprobación del restaurante. Te vamos a
          confirmar por teléfono o WhatsApp al número que dejaste.
        </p>
        <button className="btn-primary" onClick={onBack}>
          Volver al menú
        </button>
      </div>
    )
  }

  return (
    <div className="checkout">
      <button className="back-link" onClick={onBack}>
        ← Volver al menú
      </button>

      <h1>Reservar mesa</h1>
      <p className="payment-box__hint">
        Esta solicitud queda sujeta a aprobación del restaurante — no es una reserva confirmada
        hasta que te contactemos.
      </p>

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
          Fecha
          <input type="date" value={form.fecha} onChange={update('fecha')} required />
        </label>
        <label>
          Hora
          <input type="time" value={form.hora} onChange={update('hora')} required />
        </label>
        <label>
          Cantidad de personas
          <input
            type="number"
            min="1"
            value={form.personas}
            onChange={update('personas')}
            placeholder="Ej: 6"
            required
          />
        </label>

        <div className="payment-methods">
          <p className="payment-methods__label">¿Qué necesitás?</p>
          <div className="payment-methods__chips">
            {TIPOS_MESA.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`payment-chip ${tipoMesa === t.key ? 'is-active' : ''}`}
                onClick={() => setTipoMesa(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <label>
          Notas (opcional)
          <textarea
            value={form.notas}
            onChange={update('notas')}
            placeholder="Ocasión especial, alguna necesidad particular, etc."
            rows={2}
          />
        </label>

        {error && <p className="form-error">No se pudo enviar la solicitud: {error}</p>}

        <button type="submit" className="btn-primary" disabled={!isValid || submitting}>
          {submitting ? 'Enviando…' : 'Enviar solicitud de reserva'}
        </button>
      </form>
    </div>
  )
}
