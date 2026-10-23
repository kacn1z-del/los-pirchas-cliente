import { useState } from 'react';
import QRCode from 'qrcode';
import { buscarTarjeta } from '../lib/tarjeta';
import { normalizarTelefono, puedeCanjear, PUNTOS_PARA_CANJE, DESCUENTO_CANJE_MAXIMO } from '../lib/puntos';

function formatColones(value) {
  return `₡${Number(value ?? 0).toLocaleString('es-CR')}`;
}

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
      setQr(await QRCode.toDataURL(data.tarjetaId, { margin: 1, width: 220 }));
      setTarjeta(data);
    } catch (err) {
      setMensaje('No se pudo consultar: ' + err.message);
    } finally {
      setBuscando(false);
    }
  };

  const puntos = Number(tarjeta?.puntos || 0);
  const progreso = Math.min(100, (puntos / PUNTOS_PARA_CANJE) * 100);

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
        <div className="payment-box" style={{ textAlign: 'center' }}>
          <h3>{tarjeta.nombre}</h3>
          <p>
            <strong>{puntos}</strong> punto{puntos === 1 ? '' : 's'}
          </p>
          <div style={{ background: 'var(--paper-dim, #f3e6d5)', borderRadius: 999, height: 10, overflow: 'hidden', margin: '8px 0' }}>
            <div style={{ width: `${progreso}%`, height: '100%', background: 'var(--flame-500, #e8792b)' }} />
          </div>
          <p>
            {puedeCanjear(puntos)
              ? `🎉 Tenés un canje disponible: un plato de hasta ${formatColones(DESCUENTO_CANJE_MAXIMO)} gratis. Mostrá este código al pedir.`
              : `Te faltan ${PUNTOS_PARA_CANJE - puntos} puntos para un plato gratis.`}
          </p>
          {qr && <img src={qr} alt="Código de mi tarjeta" style={{ width: 220, height: 220, margin: '12px auto', display: 'block' }} />}
          <p className="payment-box__hint">Mostrá este código al pagar para sumar tus puntos.</p>
        </div>
      )}
    </div>
  );
}
