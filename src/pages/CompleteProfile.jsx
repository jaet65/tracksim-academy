import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase-config';
import { doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { User, FileText, Briefcase, Building, Save, CheckCircle, Loader } from 'lucide-react';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // ESTADO NUEVO: Para saber si Firebase sigue pensando
  const [checkingAuth, setCheckingAuth] = useState(true); 
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    curp: '',
    occupation: '',
    company: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // 1. Firebase ya respondió
      setCheckingAuth(false); 

      if (currentUser) {
        setUser(currentUser);
        setFormData(prev => ({
          ...prev,
          fullName: currentUser.displayName || '',
        }));
      } else {
        // Solo si Firebase confirma que NO hay usuario, lo sacamos
        console.log("No hay usuario, redirigiendo a login...");
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (e) => {
    const value = e.target.name === 'curp' ? e.target.value.toUpperCase() : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (formData.curp.length !== 18) {
      alert("⚠️ La CURP debe tener exactamente 18 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        fullName: formData.fullName,
        curp: formData.curp,
        occupation: formData.occupation,
        company: formData.company,
        profileCompleted: true,
        createdAt: new Date()
      });
      navigate('/portal');
    } catch (error) {
      console.error("Error guardando perfil:", error);
      alert("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // MIENTRAS FIREBASE PIENSA, MOSTRAMOS CARGA (NO REDIRIGIMOS)
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-600 w-10 h-10" />
      </div>
    );
  }

  // SI YA CARGÓ PERO NO HAY USUARIO (Seguridad extra)
  if (!user) return null;

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg border-t-4 border-blue-600">
        
        <div className="text-center mb-6">
          <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Casi terminamos...</h2>
          <p className="text-gray-500 text-sm">
            Hola <span className="font-bold text-blue-600">{user.email}</span>. <br/>
            Para generar tu constancia DC-3, necesitamos estos datos finales.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* ... (El resto del formulario igual que antes) ... */}
          
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre Completo</label>
            <div className="relative">
              <User className="absolute top-2.5 left-3 text-gray-400 w-4 h-4" />
              <input name="fullName" type="text" required className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-gray-50" placeholder="Nombre completo" value={formData.fullName} onChange={handleChange} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CURP (18 Caracteres)</label>
            <div className="relative">
              <FileText className="absolute top-2.5 left-3 text-gray-400 w-4 h-4" />
              <input name="curp" type="text" required maxLength={18} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 uppercase font-mono tracking-wide" placeholder="AAAA000000HDF..." value={formData.curp} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ocupación</label>
              <div className="relative">
                <Briefcase className="absolute top-2.5 left-3 text-gray-400 w-4 h-4" />
                <input name="occupation" type="text" required placeholder="Ej. Soldador" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" value={formData.occupation} onChange={handleChange} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Empresa</label>
              <div className="relative">
                <Building className="absolute top-2.5 left-3 text-gray-400 w-4 h-4" />
                <input name="company" type="text" required placeholder="Razón Social" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" value={formData.company} onChange={handleChange} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-6 shadow-lg">
            {loading ? 'Guardando Registro...' : 'Guardar y Continuar'}
            <Save size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;