import { useEffect, useState } from 'react'
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

function Stars({ value, onChange, size = 20 }) {
  return (
    <div className="stars" role={onChange ? 'radiogroup' : undefined} aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`stars__star ${n <= value ? 'is-filled' : ''}`}
          style={{ fontSize: size }}
          onClick={onChange ? () => onChange(n) : undefined}
          aria-label={onChange ? `${n} estrellas` : undefined}
          disabled={!onChange}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function formatDate(ts) {
  const date = ts?.toDate?.()
  if (!date) return ''
  return date.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [])

  const average = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || rating === 0) return
    setSubmitting(true)
    setError(null)
    try {
      await addDoc(collection(db, 'reviews'), {
        name: name.trim(),
        rating,
        comment: comment.trim() || null,
        createdAt: serverTimestamp(),
      })
      setName('')
      setRating(0)
      setComment('')
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="reviews">
      <div className="reviews__header">
        <div>
          <h2 className="reviews__title">Reseñas de clientes</h2>
          {average && (
            <p className="reviews__average">
              <Stars value={Math.round(average)} size={16} />
              <span className="mono">{average}</span> · {reviews.length}{' '}
              {reviews.length === 1 ? 'reseña' : 'reseñas'}
            </p>
          )}
        </div>
        <button className="btn-secondary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : 'Dejar reseña'}
        </button>
      </div>

      {showForm && (
        <form className="review-form" onSubmit={handleSubmit}>
          <label>
            Tu nombre
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required />
          </label>
          <div className="review-form__rating">
            <span>Calificación</span>
            <Stars value={rating} onChange={setRating} size={26} />
          </div>
          <label>
            Comentario (opcional)
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Contanos cómo estuvo tu experiencia…"
            />
          </label>
          {error && <p className="form-error">No se pudo enviar: {error}</p>}
          <button type="submit" className="btn-primary" disabled={!name.trim() || rating === 0 || submitting}>
            {submitting ? 'Enviando…' : 'Publicar reseña'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="reviews__empty">Cargando reseñas…</p>
      ) : reviews.length === 0 ? (
        <p className="reviews__empty">Todavía no hay reseñas. ¡Sé el primero en dejar una!</p>
      ) : (
        <div className="reviews__list">
          {reviews.map((r) => (
            <article key={r.id} className="review-card">
              <div className="review-card__top">
                <span className="review-card__name">{r.name}</span>
                <Stars value={r.rating} size={14} />
              </div>
              {r.comment && <p className="review-card__comment">{r.comment}</p>}
              <p className="review-card__date">{formatDate(r.createdAt)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
