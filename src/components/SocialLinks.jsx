const WHATSAPP_NUMBER = '8892-7759'
const FACEBOOK_URL = 'https://www.facebook.com/share/1cfkXB4joz/?mibextid=wwXIfr'
const INSTAGRAM_URL = 'https://www.instagram.com/restaurantelospirchas?igsi=Z3pnaTN1YzZ6ZjB5'

function whatsappLink() {
  const phone = WHATSAPP_NUMBER.replace(/[^\d]/g, '')
  const message = encodeURIComponent('Hola, quisiera hacer una consulta sobre Los Pirchas.')
  return `https://wa.me/506${phone}?text=${message}`
}

export default function SocialLinks() {
  return (
    <footer className="social-footer">
      <p className="social-footer__title">Seguí a Los Pirchas</p>
      <div className="social-footer__icons">
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noreferrer"
          className="social-icon social-icon--whatsapp"
          aria-label="WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20z" />
            <path d="M16.6 13.4c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.5L9.6 8c-.2-.4-.3-.3-.5-.3h-.4a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.8 2c0 1.2.9 2.3 1 2.5.1.2 1.7 2.7 4.2 3.7.6.2 1 .4 1.4.5.6.2 1.1.1 1.5.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1 .1-1.2z" />
          </svg>
        </a>
        <a
          href={FACEBOOK_URL}
          target="_blank"
          rel="noreferrer"
          className="social-icon social-icon--facebook"
          aria-label="Facebook"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.4c0-.9.2-1.5 1.5-1.5h1.6V4.3A21 21 0 0 0 14 4.1c-2.2 0-3.7 1.3-3.7 3.8v2.6H7.8v3h2.5V21h3.2z" />
          </svg>
        </a>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="social-icon social-icon--instagram"
          aria-label="Instagram"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
            <circle cx="12" cy="12" r="3.7" />
            <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
          </svg>
        </a>
      </div>
      <p className="social-footer__meta">San Luis, Acosta · Diagonal a Unifami · Tel: 8892-7759</p>
    </footer>
  )
}
