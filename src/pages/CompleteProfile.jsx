import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase-config';
import { doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { User, Briefcase, Fingerprint, Building, Hash, Loader, X } from 'lucide-react';
import logo from '../assets/Logo.png';

const CompleteProfile = () => {
  const [formData, setFormData] = useState({
    paternalLastName: '',
    maternalLastName: '',
    firstName: '',
    curp: '',
    occupation: '06.2 - Autotransporte',
    company: '',
    companyRfc: '' // <-- Nuevo campo
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // --- NUEVO: Capitalizar nombres y apellidos ---
    if (['firstName', 'paternalLastName', 'maternalLastName'].includes(name)) {
      // Capitaliza la primera letra de cada palabra
      processedValue = value.replace(/\b\w/g, char => char.toUpperCase());
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    const user = auth.currentUser;
    if (!user) {
      setError("No estás autenticado. Por favor, vuelve a iniciar sesión.");
      setLoading(false);
      return;
    }

    try {
      // Construimos el nombre completo en el formato requerido para DC-3
      const fullName = `${formData.firstName.trim()} ${formData.paternalLastName.trim()} ${formData.maternalLastName.trim()}`;

      // Usamos setDoc para crear el documento del usuario con su UID
      await setDoc(doc(db, "users", user.uid), {
        fullName: fullName,
        firstName: formData.firstName.trim(),
        paternalLastName: formData.paternalLastName.trim(),
        maternalLastName: formData.maternalLastName.trim(),
        curp: formData.curp,
        occupation: formData.occupation,
        company: formData.company,
        companyRfc: formData.companyRfc,
        email: user.email // Guardamos también el email
      });
      navigate('/portal'); // Redirigimos al portal del estudiante
    } catch (err) {
      console.error("Error guardando perfil:", err);
      setError("No se pudo guardar tu perfil. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setError("Hubo un problema al intentar salir. Refresca la página.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="h-12" />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Completa tu Perfil</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Necesitamos estos datos para generar tus constancias DC-3.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nombre(s) */}
          <div className="relative">
            <User className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
            <input type="text" name="firstName" placeholder="Nombre(s)" value={formData.firstName} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {/* Apellido Paterno */}
          <div className="relative">
            <User className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
            <input type="text" name="paternalLastName" placeholder="Apellido Paterno" value={formData.paternalLastName} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {/* Apellido Materno */}
          <div className="relative">
            <User className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
            <input type="text" name="maternalLastName" placeholder="Apellido Materno" value={formData.maternalLastName} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {/* CURP */}
          <div className="relative">
            <Fingerprint className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
            <input type="text" name="curp" placeholder="CURP" value={formData.curp} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {/* Ocupación */}
          <div className="relative">
            <Briefcase className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
            <input type="text" name="occupation" placeholder="Ocupación Específica (Ej. Operador de tractocamión)" value={formData.occupation} onChange={handleChange} required disabled className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100 cursor-not-allowed" />
          </div>

          {/* Empresa */}
          <div className="relative">
            <Building className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
            <input type="text" name="company" placeholder="Nombre de la Empresa" value={formData.company} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          
          {/* RFC de la Empresa (NUEVO) */}
          <div className="relative">
            <Hash className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
            <input type="text" name="companyRfc" placeholder="RFC de la Empresa" value={formData.companyRfc} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading} className="w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:bg-gray-300">
            {loading ? <Loader className="animate-spin" /> : 'Guardar y Continuar'}
          </button>

          <button type="button" onClick={handleCancel} disabled={loading} className="w-full text-sm text-gray-500 hover:text-red-600 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} />
            Cancelar y salir
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
