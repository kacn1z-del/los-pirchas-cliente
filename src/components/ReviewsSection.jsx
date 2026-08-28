import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

function StarRating({ value, onChange, readOnly = false, size = 22 }) {
  const [hover, setHover] = useState(0)
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className={`star-rating ${readOnly ? 'is-readonly' : ''}`} role={readOnly ? 'img' : 'radiogroup'} aria-label={readOnly ? `${value} de 5 estrellas` : 'Calificación'}>
      {stars.map((star) => {
        const filled = star <= (hover || value)
        return (
          <button
            key={star}
            type="button"
            className={`star-rating__star ${filled ? 'is-filled' : ''}`}
            style={{ width: size, height: size }}
            disabled={readOnly}
            aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
            onClick={() => !readOnly && onChange?.(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(0)}
          >
            <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2.5l2.9 6.3 6.8.7-5.1 4.6 1.5 6.7-6.1-3.6-6.1 3.6 1.5-6.7-5.1-4.6 6.8-.7z" strokeLinejoin="round" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

function timeAgo(date) {
  if (!date) return ''
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  const units = [
    ['año', 31536000],
    ['mes', 2592000],
    ['semana', 604800],
    ['día', 86400],
    ['hora', 3600],
    ['minuto', 60],
  ]
  for (const [label, secs] of units) {
    const count = Math.floor(seconds / secs)
    if (count >= 1) return `hace ${count} ${label}${count > 1 ? 's' : ''}`
  }
  return 'recién'
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [nombre, setNombre] = useState('')
  const [comentario, setComentario] = useState('')
  const [estrellas, setEstrellas] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'Resenas'), orderBy('fecha', 'desc'))
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setReviews(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  const promedio = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.estrellas || 0), 0) / reviews.length).toFixed(1)
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!nombre.trim()) {
      setFormError('Escribí tu nombre.')
      return
    }
    if (estrellas === 0) {
      setFormError('Elegí una calificación de estrellas.')
      return
    }
    if (!comentario.trim()) {
      setFormError('Contanos tu experiencia.')
      return
    }

    setSubmitting(true)
    try {
      await addDoc(collection(db, 'Resenas'), {
        nombre: nombre.trim(),
        comentario: comentario.trim(),
        estrellas,
        fecha: serverTimestamp(),
      })
      setNombre('')
      setComentario('')
      setEstrellas(0)
      setSent(true)
      setTimeout(() => setSent(false), 3500)
    } catch (err) {
      setFormError('No se pudo enviar la reseña. Probá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="reviews-section" id="resenas">
      <div className="ribbon">
        <span className="ribbon__text">Reseñas de clientes</span>
      </div>

      {promedio && (
        <div className="reviews-summary">
          <span className="reviews-summary__score mono">{promedio}</span>
          <div className="reviews-summary__meta">
            <StarRating value={Math.round(Number(promedio))} readOnly size={16} />
            <span className="reviews-summary__count">
              {reviews.length} reseña{reviews.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}

      <form className="review-form" onSubmit={handleSubmit}>
        <label>
          Tu nombre
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="¿Cómo te llamás?"
            maxLength={60}
          />
        </label>

        <div className="review-form__rating">
          <span className="review-form__rating-label">Tu calificación</span>
          <StarRating value={estrellas} onChange={setEstrellas} size={28} />
        </div>

        <label>
          Tu comentario
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Contanos qué te pareció la comida y el servicio"
            rows={3}
            maxLength={400}
          />
        </label>

        {formError && <p className="form-error">{formError}</p>}
        {sent && <p className="review-form__success">¡Gracias por tu reseña!</p>}

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar reseña'}
        </button>
      </form>

      {loading && <p className="reviews-list__hint">Cargando reseñas…</p>}
      {error && <p className="reviews-list__hint">No se pudieron cargar las reseñas.</p>}
      {!loading && !error && reviews.length === 0 && (
        <p className="reviews-list__hint">Todavía no hay reseñas. ¡Sé el primero en dejar una!</p>
      )}

      {reviews.length > 0 && (
        <div className="reviews-list">
          {reviews.map((r) => (
            <article key={r.id} className="review-card">
              <div className="review-card__top">
                <span className="review-card__name">{r.nombre}</span>
                <StarRating value={r.estrellas || 0} readOnly size={15} />
              </div>
              {r.comentario && <p className="review-card__text">{r.comentario}</p>}
              {r.fecha?.toDate && (
                <span className="review-card__date">{timeAgo(r.fecha.toDate())}</span>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
