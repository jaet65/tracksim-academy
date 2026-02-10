import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase-config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const dbData = userDoc.data();
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError('');
    setSuccess('');

    const user = auth.currentUser;
    if (!user) {
      setError("Sesión expirada. Por favor, inicia sesión de nuevo.");
      setSaving(false);
      return;
    }

    try {
      // Reconstruimos el nombre completo antes de guardar
      const fullName = `${formData.firstName.trim()} ${formData.paternalLastName.trim()} ${formData.maternalLastName.trim()}`;
      await updateDoc(doc(db, "users", user.uid), {
        fullName: fullName,
        firstName: formData.firstName.trim(),
        paternalLastName: formData.paternalLastName.trim(),
        maternalLastName: formData.maternalLastName.trim(),
        curp: formData.curp,
        occupation: formData.occupation,
        company: formData.company,
        companyRfc: formData.companyRfc,
      });
      setSuccess("¡Perfil actualizado con éxito!");
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
          <button onClick={() => navigate('/portal')} className="text-gray-500 hover:text-blue-600">
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
            <input type="text" name="curp" placeholder="CURP" value={formData.curp} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
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
            <input type="text" name="companyRfc" placeholder="RFC de la Empresa" value={formData.companyRfc} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

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
