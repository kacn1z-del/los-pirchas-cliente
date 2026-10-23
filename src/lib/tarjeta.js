import { useState } from 'react';
import QRCode from 'qrcode';
import { buscarTarjeta } from '../lib/tarjeta';
import {
  normalizarTelefono,
  puedeCanjear,
  PUNTOS_PARA_CANJE,
  SELLOS_TOTALES,
  DESCUENTO_CANJE_MAXIMO,
} from '../lib/puntos';

// Cada sello equivale a PUNTOS_PARA_CANJE / SELLOS_TOTALES puntos (ahora 1 a 1).
const PUNTOS_POR_SELLO = PUNTOS_PARA_CANJE / SELLOS_TOTALES;

function formatColones(value) {
  return `₡${Number(value ?? 0).toLocaleString('es-CR')}`;
}

const estilos = {
  tarjeta: {
    maxWidth: 340,
    margin: '18px auto 0',
    background: 'linear-gradient(160deg, #d9391f, #a12314)',
    borderRadius: 18,
    padding: '18px 16px 20px',
    color: '#fbf4ea',
    boxShadow: '0 10px 24px rgba(46, 33, 23, 0.25)',
    textAlign: 'left',
  },
  encabezado: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: {
    width: 46,
    height: 46,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #f6d98a',
    background: '#fff',
  },
  marca: { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 },
  titular: { fontSize: 18, fontWeight: 800, marginTop: 2 },
  sellos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(10, 1fr)',
    gap: 4,
    margin: '16px 0 14px',
  },
  sello: {
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    border: '1px dashed rgba(251, 244, 234, 0.6)',
    background: 'rgba(255, 255, 255, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    lineHeight: 1,
  },
  selloLleno: {
    border: '1px solid #f6d98a',
    background: '#fbf4ea',
  },
  filaInfo: { display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  etiqueta: { fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8 },
  valor: { fontSize: 15, fontWeight: 700 },
  aviso: {
    background: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 13,
    marginTop: 4,
  },
  qrCaja: {
    background: '#fff',
    width: 200,
    margin: '14px auto 0',
    borderRadius: 12,
    padding: 10,
    textAlign: 'center',
  },
  qr: { width: 180, height: 180, display: 'block', margin: '0 auto' },
  pie: { textAlign: 'center', fontSize: 11, marginTop: 10, opacity: 0.85 },
};

export default function MiTarjeta({ onBack }) {
  const [telefono, setTelefono] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [tarjeta, setTarjeta] = useState(null);
  const [qr, setQr] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const buscar = async (e) => {
    e.preventDefault();
    setTarjeta(null);
    setQr(null);
    setMensaje(null);
    if (!normalizarTelefono(telefono)) {
      setMensaje('Revisá el número: deben ser 8 dígitos.');
      return;
    }
    setBuscando(true);
    try {
      const data = await buscarTarjeta(telefono);
      if (!data) {
        setMensaje('Todavía no tenés tarjeta. Se crea sola cuando hacés tu primer pedido.');
        return;
      }
      setQr(await QRCode.toDataURL(data.tarjetaId, { margin: 1, width: 360 }));
      setTarjeta(data);
    } catch (err) {
      setMensaje('No se pudo consultar: ' + err.message);
    } finally {
      setBuscando(false);
    }
  };

  const puntos = Number(tarjeta?.puntos || 0);
  const sellos = Math.min(SELLOS_TOTALES, Math.floor(puntos / PUNTOS_POR_SELLO));
  const sellosParaSiguiente = Math.max(0, PUNTOS_PARA_CANJE - puntos);

  return (
    <div className="checkout">
      <button className="back-link" onClick={onBack}>
        ← Volver al menú
      </button>

      <h1>Mi tarjeta</h1>

      <form className="checkout__form" onSubmit={buscar}>
        <label>
          Teléfono (WhatsApp)
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="8888-8888"
            inputMode="tel"
            required
          />
        </label>
        <button type="submit" className="btn-primary" disabled={buscando || !telefono.trim()}>
          {buscando ? 'Buscando…' : 'Ver mi tarjeta'}
        </button>
      </form>

      {mensaje && <p className="form-error">{mensaje}</p>}

      {tarjeta && (
        <div style={estilos.tarjeta}>
          <div style={estilos.encabezado}>
            <img src="/logo.jpeg" alt="" style={estilos.logo} />
            <div>
              <div style={estilos.marca}>Los Pirchas · Cliente frecuente</div>
              <div style={estilos.titular}>{tarjeta.nombre}</div>
            </div>
          </div>

          <div style={estilos.sellos}>
            {Array.from({ length: SELLOS_TOTALES }, (_, i) => (
              <div key={i} style={{ ...estilos.sello, ...(i < sellos ? estilos.selloLleno : {}) }}>
                {i < sellos ? '🔥' : ''}
              </div>
            ))}
          </div>

          <div style={estilos.filaInfo}>
            <div>
              <div style={estilos.etiqueta}>Sellos</div>
              <div style={estilos.valor}>
                {sellos} de {SELLOS_TOTALES}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={estilos.etiqueta}>Puntos</div>
              <div style={estilos.valor}>{puntos}</div>
            </div>
          </div>

          <div style={estilos.aviso}>
            {puedeCanjear(puntos)
              ? `🎉 Tenés un plato gratis disponible (hasta ${formatColones(DESCUENTO_CANJE_MAXIMO)}). Mostrá este código al pedir.`
              : `Te faltan ${sellosParaSiguiente} sellos para un plato gratis.`}
          </div>

          {qr && (
            <div style={estilos.qrCaja}>
              <img src={qr} alt="Código de mi tarjeta" style={estilos.qr} />
            </div>
          )}
          <div style={estilos.pie}>Mostrá este código al pagar para sumar tus sellos.</div>
        </div>
      )}
    </div>
  );
}
