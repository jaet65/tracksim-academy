import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase-config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Lock, Mail, Loader, AlertCircle, Home, CheckCircle } from 'lucide-react';
import logo from '../assets/Logo.gif';
import googleIcon from '../assets/Google.svg';

const ADMIN_EMAILS = ["magraz@corporativomaf.com"]; // TU CORREO ADMIN AQUÍ

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    // --- NUEVO: Verificación de correo electrónico ---
    // Si el usuario se registró con email/contraseña y no ha verificado su correo, no lo dejamos pasar.
    const isEmailPasswordUser = user.providerData.some(provider => provider.providerId === 'password');
    if (isEmailPasswordUser && !user.emailVerified) {
      setError("Tu correo no ha sido verificado. Por favor, revisa tu bandeja de entrada y haz clic en el enlace de verificación.");
      setSuccess(''); // Limpiamos cualquier mensaje de éxito
      await signOut(auth); // Deslogueamos al usuario para forzar la verificación
      setLoading(false);
      return; // Detenemos la redirección
    }

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

      // B. Instructor
      if (userDoc.exists() && userDoc.data().isInstructor) {
        // Los instructores van a la misma página de resultados, pero la página filtrará los datos.
        navigate('/admin/resultados');
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
    // Forzamos a que siempre muestre el selector de cuentas de Google
    provider.setCustomParameters({ prompt: 'select_account' });

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
    setSuccess('');
    setLoading(true);
    try {
      let userCred;
      if (isRegistering) {
        // --- MEJORADO: Flujo de registro con verificación ---
        userCred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCred.user);
        await signOut(auth); // Deslogueamos al usuario para que no entre sin verificar
        setSuccess("¡Cuenta creada! Se ha enviado un correo de verificación. Por favor, revisa tu bandeja de entrada para activar tu cuenta.");
        setLoading(false);
        setIsRegistering(false); // Lo regresamos a la pantalla de login
        return; // Detenemos la ejecución para no redirigir
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
      }
      await handleRedirectLogic(userCred.user);

    } catch (err) {
      // --- REFINADO: Manejo de errores contextual (Login vs. Registro) ---
      if (isRegistering) {
        // Errores comunes durante el registro
        switch (err.code) {
          case 'auth/email-already-in-use':
            setError(`El correo "${email}" ya está registrado. Intenta iniciar sesión.`);
            break;
          case 'auth/weak-password':
            setError("La contraseña es muy débil. Debe tener al menos 6 caracteres.");
            break;
          default:
            setError(err.message);
        }
      } else {
        // Errores comunes durante el inicio de sesión
        switch (err.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            setError("Credenciales inválidas. Revisa tu correo y contraseña, o crea una cuenta si aún no la tienes.");
            break;
          case 'auth/too-many-requests':
            setError("El acceso a esta cuenta ha sido deshabilitado temporalmente debido a muchos intentos fallidos. Inténtalo más tarde o restablece tu contraseña.");
            break;
          default:
            setError(err.message);
        }
      }
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Por favor, introduce tu correo electrónico para restablecer la contraseña.");
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada (y la carpeta de spam).");
    } catch (err) {
      setError(err.message);
    } finally {
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
          <img src={logo} alt="TrackSIM Logo" className="h-30" />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
          {isRegistering ? 'Crear Cuenta' : 'Acceso'}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm flex gap-2 items-center">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm flex gap-2 items-center">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 transition mb-4 shadow-sm font-bold"
        >
          {loading ? <Loader className="animate-spin" size={20} /> : <img src={googleIcon} alt="Google" className="w-5 h-5" />}
          {loading ? 'Procesando...' : 'Continuar con Google'}
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

        <div className="flex justify-between items-center mt-4 text-sm">
          <button 
            type="button"
            onClick={() => setIsRegistering(!isRegistering)} 
            className="text-blue-600 hover:underline"
          >
            {isRegistering ? '¿Ya tienes cuenta? Entra aquí' : '¿Nuevo? Crea una cuenta'}
          </button>
          {!isRegistering && (
            <button type="button" onClick={handlePasswordReset} className="text-gray-500 hover:underline">
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <button 
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700 transition font-medium flex items-center justify-center gap-2 mx-auto"
          >
            <Home size={16} /> Volver a la página principal
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;