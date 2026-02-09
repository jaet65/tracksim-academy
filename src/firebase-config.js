// src/firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- IMPORTANTE: REEMPLAZA ESTO CON TUS DATOS REALES DE FIREBASE ---
// Ve a Project Settings > General > Tus Apps > SDK setup y copia esto:
const firebaseConfig = {
  apiKey: "AIzaSyBb8jNdQ5GHU-7BcqQpKEKYynjXV3Jbf4g",
  authDomain: "tracksim-academy.firebaseapp.com",
  projectId: "tracksim-academy",
  storageBucket: "tracksim-academy.firebasestorage.app",
  messagingSenderId: "434098870669",
  appId: "1:434098870669:web:5d457c8f97f979885205c4"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);