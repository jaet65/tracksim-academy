import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase-config';
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { BookOpen, ArrowRight, LogOut, Loader, ChevronDown, User, ShieldAlert } from 'lucide-react';
import logo from '../assets/Logo.gif'; // Importamos el logo

const StudentEntry = () => {
  const [selectedExamId, setSelectedExamId] = useState('');
  const [examStatus, setExamStatus] = useState({ blocked: false, message: '' });
  const [availableExams, setAvailableExams] = useState([]); // Lista de exámenes
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    const initData = async (user) => {
      try {
        // 1. Cargar Datos del Alumno
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          navigate('/completar-perfil');
          return;
        }

        // 2. Cargar Lista de Exámenes (NUEVO)
        const examsCollection = collection(db, "exams");
        const examsSnapshot = await getDocs(examsCollection);
        
        const examsList = examsSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || "Examen sin título",
          totalQuestions: doc.data().totalQuestions || 0
        }));

        setAvailableExams(examsList);

      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
      } else {
        initData(user);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Efecto para verificar si el examen puede ser tomado
  useEffect(() => {
    const checkExamStatus = async () => {
      if (!selectedExamId || !auth.currentUser) {
        setExamStatus({ blocked: false, message: '' });
        return;
      }

      const studentUid = auth.currentUser.uid;

      // 1. Verificar si ya hay un resultado para este examen
      const resultsRef = collection(db, "results");
      const qResults = query(resultsRef, where("studentUid", "==", studentUid), where("examId", "==", selectedExamId), limit(1));
      const resultsSnap = await getDocs(qResults);

      if (resultsSnap.empty) {
        setExamStatus({ blocked: false, message: '' }); // No hay intentos, puede proceder
        return;
      }

      // 2. Si hay resultado, verificar si hay una aprobación de retoma
      const approvalsRef = collection(db, "retake_approvals");
      const qApprovals = query(approvalsRef, where("studentUid", "==", studentUid), where("examId", "==", selectedExamId), limit(1));
      const approvalsSnap = await getDocs(qApprovals);

      if (approvalsSnap.empty) {
        setExamStatus({ blocked: true, message: 'Ya has realizado esta evaluación. Pide a tu instructor/coordinador que apruebe un nuevo intento.' });
      } else {
        setExamStatus({ blocked: false, message: 'Tienes un nuevo intento aprobado. ¡Mucha suerte!' });
      }
    };

    checkExamStatus();
  }, [selectedExamId]);

  const handleStartExam = (e) => {
    e.preventDefault();
    if (!selectedExamId) {
      alert("⚠️ Por favor selecciona una evaluación de la lista.");
      return;
    }
    navigate(`/examen/${selectedExamId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-600 w-10 h-10 mb-4" />
        <p className="text-gray-500 text-sm">Cargando evaluaciones disponibles...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        
        {/* Header con Bienvenida */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo de la Academia" className="h-30" />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Hola, <span className="text-blue-600">{userData?.fullName?.split(' ')[0] || ''}</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Selecciona la evaluación que deseas realizar hoy.
          </p>
        </div>

        <form onSubmit={handleStartExam} className="space-y-6">
          
          {/* Selector de Exámenes */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2 ml-1">
              Evaluaciones Disponibles
            </label>
            <div className="relative">
              <BookOpen className="absolute top-3.5 left-3 text-gray-400 w-5 h-5 pointer-events-none" />
              <ChevronDown className="absolute top-3.5 right-3 text-gray-400 w-5 h-5 pointer-events-none" />
              
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white text-gray-700 cursor-pointer hover:border-blue-400 transition"
              >
                <option value="" disabled>-- Selecciona un examen --</option>
                
                {availableExams.length > 0 ? (
                  availableExams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} ({exam.totalQuestions} preguntas)
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No hay exámenes activos</option>
                )}
              </select>
            </div>
          </div>

          {/* Información del examen seleccionado (Opcional) */}
          {selectedExamId && !examStatus.blocked && (
            <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs border border-blue-100 flex items-center gap-2">
              <span className="font-bold">Nota:</span> {examStatus.message || 'Asegúrate de tener conexión estable antes de iniciar. ¡Buena suerte!'}
            </div>
          )}

          {examStatus.blocked && (
            <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-xs border border-yellow-200 flex items-center gap-2">
              <ShieldAlert size={28} />
              <span>{examStatus.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedExamId || examStatus.blocked} // Se deshabilita si no hay selección o está bloqueado
            className={`w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${ // ...
              selectedExamId 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Comenzar Evaluación <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-4">
            <button 
              onClick={() => navigate('/editar-perfil')}
              className="text-sm text-gray-400 hover:text-blue-500 flex items-center justify-center gap-2 transition-colors"
            >
              <User size={16} /> Editar Perfil
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="text-sm text-gray-400 hover:text-red-500 flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentEntry;