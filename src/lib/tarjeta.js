import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { normalizarTelefono } from './puntos';

// Crea la tarjeta la primera vez que el cliente pide. Si ya existe, no toca
// su código QR ni sus puntos.
export async function asegurarTarjeta({ nombre, telefono }) {
  const id = normalizarTelefono(telefono);
  if (!id) return null;
  const ref = doc(db, 'clientes', id);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const data = {
    nombre,
    telefono: id,
    tarjetaId: crypto.randomUUID(),
    puntos: 0,
    creado: serverTimestamp(),
  };
  await setDoc(ref, data);
  return data;
}

export async function buscarTarjeta(telefono) {
  const id = normalizarTelefono(telefono);
  if (!id) return null;
  const snap = await getDoc(doc(db, 'clientes', id));
  return snap.exists() ? snap.data() : null;
}
