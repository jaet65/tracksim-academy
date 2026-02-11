import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase-config';
import { collection, getDocs, orderBy, query, where, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LogOut, ArrowLeft, FileText, Loader, Award } from 'lucide-react';
import { generateConstancia } from '../utils/generateConstancia';

const StudentResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null); // Para obtener los datos del alumno para el PDF
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudentDataAndResults = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        // Cargar datos del perfil del alumno
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data());
        } else {
          console.error("Datos de usuario no encontrados.");
          navigate('/completar-perfil'); // Redirigir si no tiene perfil
          return;
        }

        // Cargar resultados del alumno
        const resultsRef = collection(db, "results");
        const q = query(
          resultsRef,
          where("studentUid", "==", user.uid),
          orderBy("timestamp", "desc")
        );
        const snapshot = await getDocs(q);
        
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dateObj: doc.data().timestamp?.toDate() 
        }));
        setResults(data);

      } catch (error) {
        console.error("Error cargando resultados:", error);
        if (error.code === 'failed-precondition') {
          alert("Error de base de datos: Se requiere un índice para esta consulta. Por favor, sigue el enlace en la consola de desarrollador (F12) para crearlo en Firebase.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDataAndResults();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleDownloadConstancia = (result) => {
    if (!userData) {
      alert("Error: No se pudieron cargar los datos del alumno para la constancia.");
      return;
    }

    const studentPDFData = {
      studentName: userData.fullName,
      studentEmail: userData.email || auth.currentUser?.email || 'N/A',
      studentCurp: userData.curp,
      studentOccupation: userData.occupation,
      studentCompany: userData.company,
      studentCompanyRfc: userData.companyRfc,
    };

    const examPDFData = { examTitle: result.examTitle };
    
    // Reconstruimos las respuestas incorrectas desde los datos guardados
    const incorrectAnswers = result.examQuestions
      .map((q, index) => ({
        question: q.text,
        yourAnswer: result.studentAnswers[index] !== undefined ? q.options[result.studentAnswers[index]] : "No respondida",
        correctAnswer: q.options[q.correctOption],
        isCorrect: result.studentAnswers[index] === q.correctOption
      }))
      .filter(item => !item.isCorrect);

    generateConstancia(studentPDFData, examPDFData, result.score, incorrectAnswers);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-600 w-10 h-10 mb-4" />
        <p className="text-gray-500 text-sm">Cargando historial de exámenes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/portal')} className="text-gray-500 hover:text-blue-600">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Award className="text-blue-600" /> Mis Resultados
            </h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium">
            <LogOut size={18} /> Salir
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto mt-8 p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-bold text-gray-600 text-sm">Examen</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-center">Nota</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-right">Fecha</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-500">No has realizado ninguna evaluación aún.</td></tr>
                ) : (
                  results.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{r.examTitle}</div>
                        {r.attempt > 1 && (
                          <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                            Intento #{r.attempt}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          r.score >= 80 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {r.score}
                        </span>
                      </td>
                      <td className="p-4 text-right text-sm text-gray-500">
                        {r.dateObj?.toLocaleDateString()}
                        <br/>
                        <span className="text-xs text-gray-300">{r.dateObj?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDownloadConstancia(r)}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100 transition"
                          title="Descargar Constancia de Participación"
                        >
                          <FileText size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentResults;