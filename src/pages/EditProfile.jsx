import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase-config';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { User, Briefcase, Fingerprint, Building, Hash, Loader, ArrowLeft } from 'lucide-react';

const EditProfile = () => {
  const [formData, setFormData] = useState({
    paternalLastName: '',
    maternalLastName: '',
    firstName: '',
    curp: '',
    occupation: '8321 - Conductores de camiones, camionetas y tractocamiones',
    company: '',
    companyRfc: '' // <-- Nuevo campo
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({}); // <-- NUEVO: Para errores de campo
  const navigate = useNavigate();
  const { userId } = useParams(); // <-- NUEVO: Obtener el ID del usuario de la URL si existe

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Determinar qué ID de usuario usar: el de la URL (admin) o el propio (alumno)
        const targetUserId = userId || currentUser.uid;

        try {
          const userDoc = await getDoc(doc(db, "users", targetUserId));
          if (userDoc.exists()) {
            const dbData = userDoc.data();
            // CORRECCIÓN: Usar los campos desglosados si existen, si no, construir desde fullName
            const nameParts = (dbData.fullName || '').split(' ');
            const first = nameParts[0] || '';
            setFormData({
              ...dbData,
              paternalLastName: dbData.paternalLastName || '',
              maternalLastName: dbData.maternalLastName || '',
              firstName: first,
            });
          } else {
            setError("No se encontró tu perfil. Serás redirigido.");
            setTimeout(() => navigate('/completar-perfil'), 2000);
          }
        } catch (err) {
          setError("Error al cargar tus datos.");
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/login');
      }
    };
    fetchUserData();
  }, [navigate]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // --- NUEVO: Capitalizar nombres y apellidos ---
    if (['firstName', 'paternalLastName', 'maternalLastName'].includes(name)) {
      // Capitaliza la primera letra de cada palabra, ignorando mayúsculas existentes y manejando acentos.
      processedValue = value.replace(/(^|\s)\p{L}/gu, char => char.toUpperCase());
    }

    // --- NUEVO: Convertir a mayúsculas para CURP y RFC ---
    if (['curp', 'companyRfc'].includes(name)) {
      processedValue = value.toUpperCase();
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));

    // --- NUEVO: Validación en tiempo real ---
    if (name === 'curp') {
      const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/;
      if (processedValue && !curpRegex.test(processedValue)) {
        setFieldErrors(prev => ({ ...prev, curp: 'El formato del CURP no es válido (18 caracteres).' }));
      } else {
        setFieldErrors(prev => ({ ...prev, curp: '' }));
      }
    }

    if (name === 'companyRfc') {
      const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
      if (processedValue && !rfcRegex.test(processedValue)) {
        setFieldErrors(prev => ({ ...prev, companyRfc: 'El formato del RFC no es válido (12 o 13 caracteres).' }));
      } else {
        setFieldErrors(prev => ({ ...prev, companyRfc: '' }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- NUEVO: Validación final antes de enviar ---
    if (fieldErrors.curp || fieldErrors.companyRfc) {
      setError("Por favor, corrige los errores en el formulario.");
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Sesión expirada. Por favor, inicia sesión de nuevo.");
      setSaving(false);
      return;
    }

    const targetUserId = userId || currentUser.uid;

    try {
      // Reconstruimos el nombre completo antes de guardar
      const updatedProfileData = {
        fullName: `${formData.firstName.trim()} ${formData.paternalLastName.trim()} ${formData.maternalLastName.trim()}`,
        firstName: formData.firstName.trim(),
        paternalLastName: formData.paternalLastName.trim(),
        maternalLastName: formData.maternalLastName.trim(),
        curp: formData.curp,
        occupation: formData.occupation,
        company: formData.company,
        companyRfc: formData.companyRfc,
      };

      const batch = writeBatch(db);

      // 1. Actualizar el documento principal del usuario
      const userRef = doc(db, "users", targetUserId);
      batch.update(userRef, updatedProfileData);

      // 2. Si es un admin editando, actualizar todos los resultados históricos del usuario
      if (userId) {
        const resultsQuery = query(collection(db, "results"), where("studentUid", "==", targetUserId));
        const resultsSnapshot = await getDocs(resultsQuery);
        
        const denormalizedData = {
          studentName: updatedProfileData.fullName,
          studentCurp: updatedProfileData.curp,
          studentFirstName: updatedProfileData.firstName,
          studentPaternalLastName: updatedProfileData.paternalLastName,
          studentMaternalLastName: updatedProfileData.maternalLastName,
          studentCompany: updatedProfileData.company,
          studentCompanyRfc: updatedProfileData.companyRfc,
        };

        resultsSnapshot.forEach((resultDoc) => {
          batch.update(resultDoc.ref, denormalizedData);
        });
      }

      await batch.commit();
      setSuccess("¡Perfil actualizado con éxito!");
      if (userId) {
        setTimeout(() => navigate('/admin/usuarios'), 2000);
      }

    } catch (err) {
      setError("No se pudo actualizar tu perfil. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-600 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          {/* --- CORREGIDO: El botón de regreso ahora es contextual --- */}
          <button onClick={() => navigate(userId ? '/admin/usuarios' : '/portal')} className="text-gray-500 hover:text-blue-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Editar Perfil</h1>
          <div className="w-6"></div> {/* Espaciador */}
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

          <div className="relative">
            <Fingerprint className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
            <input type="text" name="curp" placeholder="CURP" value={formData.curp} onChange={handleChange} required maxLength="18" className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 outline-none ${fieldErrors.curp ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`} />
          </div>
          {fieldErrors.curp && <p className="text-red-500 text-xs -mt-3 ml-2">{fieldErrors.curp}</p>}

          <div className="relative">
            <Briefcase className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
            <input type="text" name="occupation" placeholder="Ocupación" value={formData.occupation} onChange={handleChange} required disabled className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100 cursor-not-allowed" />
          </div>

          <div className="relative">
            <Building className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
            <input type="text" name="company" placeholder="Empresa" value={formData.company} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div className="relative">
            <Hash className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
            <input type="text" name="companyRfc" placeholder="RFC de la Empresa" value={formData.companyRfc} onChange={handleChange} required maxLength="13" className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 outline-none ${fieldErrors.companyRfc ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`} />
          </div>
          {fieldErrors.companyRfc && <p className="text-red-500 text-xs -mt-3 ml-2">{fieldErrors.companyRfc}</p>}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}

          <button type="submit" disabled={saving} className="w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:bg-gray-300">
            {saving ? <Loader className="animate-spin" /> : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
