import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase-config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Lock, Mail, Chrome, Loader, AlertCircle } from 'lucide-react';
import logo from '../assets/Logo.gif'; // Importamos el logo

const ADMIN_EMAILS = ["magraz@corporativomaf.com", "admin@tracksim.com"]; // TU CORREO ADMIN AQUÍ

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Spinner manual para acciones
  const [checkingAuth, setCheckingAuth] = useState(true); // Spinner inicial de carga
  const navigate = useNavigate();

  // 1. ESCUCHA DE AUTENTICACIÓN (Solo para persistencia si recargas)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCheckingAuth(false); // Firebase ya respondió (sea usuario o null)
      if (user) {
        console.log("Sesión detectada:", user.email);
        await handleRedirectLogic(user);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. LÓGICA DE DIRECCIONAMIENTO
  const handleRedirectLogic = async (user) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      // A. Admin
      if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        // Si el admin no tiene perfil, se lo creamos automáticamente
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            fullName: user.displayName || user.email.split('@')[0],
            email: user.email,
            isAdmin: true, // Marcamos como administrador
            createdAt: new Date(),
          });
        }
        navigate('/admin');
        return;
      }

      // B. Alumno
      if (userDoc.exists()) {
        navigate('/portal');
      } else {
        navigate('/completar-perfil');
      }
    } catch (err) {
      console.error(err);
      setError("Error leyendo perfil.");
    }
  };

  // 3. LOGIN CON GOOGLE (POPUP)
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setError('');
    setLoading(true);
    
    try {
      // Esto abrirá la ventanita. Como arreglamos vite.config.js, ya no fallará.
      const result = await signInWithPopup(auth, provider);
      // Cuando la ventanita se cierra con éxito:
      console.log("Google Login Éxito:", result.user.email);
      await handleRedirectLogic(result.user);
      
    } catch (err) {
      console.error("Error Google:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let userCred;
      if (isRegistering) {
        userCred = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
      }
      await handleRedirectLogic(userCred.user);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <Loader className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="TrackSIM Logo" className="h-12" />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
          {isRegistering ? 'Crear Cuenta' : 'Acceso'}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm flex gap-2 items-center">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 transition mb-4 shadow-sm font-bold"
        >
          {loading ? <Loader className="animate-spin" size={20} /> : <Chrome size={20} className="text-red-500" />}
          {loading ? 'Procesando...' : 'Entrar con Google'}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">O usa tu correo</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Correo"
            required
            className="w-full p-3 border rounded-md"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            required
            className="w-full p-3 border rounded-md"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-bold">
            {isRegistering ? 'Registrarse' : 'Entrar'}
          </button>
        </form>

        <button 
          onClick={() => setIsRegistering(!isRegistering)} 
          className="mt-4 w-full text-center text-blue-600 text-sm hover:underline"
        >
          {isRegistering ? '¿Ya tienes cuenta? Entra aquí' : '¿Nuevo? Crea una cuenta'}
        </button>
      </div>
    </div>
  );
};

export default Login;