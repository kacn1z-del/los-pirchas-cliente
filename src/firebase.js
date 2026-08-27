import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Configuración del proyecto "Acosta Food" en Firebase (branding real: Los Pirchas)
const firebaseConfig = {
  apiKey: 'AIzaSyBLVHsF0VqPorPkK0auaWUH_4-k-loC6iU',
  authDomain: 'acosta-food.firebaseapp.com',
  projectId: 'acosta-food',
  storageBucket: 'acosta-food.firebasestorage.app',
  messagingSenderId: '605529235094',
  appId: '1:605529235094:web:035dff54f04af00654acb7',
  measurementId: 'G-QWEN1MWXXZ',
}

export const app = initializeApp(firebaseConfig)

// Importante: la base de datos de este proyecto tiene el ID con nombre "default"
// (no el ID reservado "(default)"), por eso se especifica explícitamente acá.
export const db = getFirestore(app, 'default')
export const auth = getAuth(app)
