import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase-config';
import { collection, getDocs, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LogOut, ArrowLeft, Search, Download, FileText, Printer, Trash2} from 'lucide-react';
import { generateDC3 } from '../utils/generateDC3'; // Para el formato oficial
import { generateConstancia } from '../utils/generateConstancia'; // Para la constancia con errores

const AdminResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // 1. Cargar resultados desde Firebase
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const resultsRef = collection(db, "results");
        // Ordenamos por fecha (más reciente primero)
        // Nota: Si falla el 'orderBy', quítalo temporalmente hasta crear el índice
        const q = query(resultsRef, orderBy("timestamp", "desc")); 
        const snapshot = await getDocs(q);
        
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convertimos el Timestamp de Firebase a fecha legible JS
          dateObj: doc.data().timestamp?.toDate() 
        }));

        setResults(data);
      } catch (error) {
        console.error("Error cargando resultados:", error);
        // Fallback si no hay índice creado en Firebase aún
        if (error.code === 'failed-precondition') {
          alert("Nota: Firebase requiere un índice para ordenar por fecha. Revisa la consola.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  // 2. Filtrar por nombre o empresa (Buscador)
  const filteredResults = results.filter(r => 
    r.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.studentCompany?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.examTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3. Exportar a CSV (Excel simple)
  const exportToCSV = () => {
    const headers = ["Nombre,CURP,Empresa,Examen,Calificacion,Fecha"];
    const rows = filteredResults.map(r => 
      `"${r.studentName}","${r.studentCurp}","${r.studentCompany}","${r.examTitle}","${r.score}","${r.dateObj?.toLocaleDateString()}"`
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_dc3.csv");
    document.body.appendChild(link);
    link.click();
  };

  // 4. Eliminar un resultado
  const handleDeleteResult = async (resultId, studentName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la calificación de ${studentName}? Esta acción es irreversible.`)) {
      try {
        await deleteDoc(doc(db, "results", resultId));
        // Actualizar la UI eliminando el resultado del estado local
        setResults(prevResults => prevResults.filter(r => r.id !== resultId));
        alert("Calificación eliminada con éxito.");
      } catch (error) {
        console.error("Error eliminando calificación:", error);
        alert("No se pudo eliminar la calificación.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Admin */}
      <nav className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-blue-600">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-blue-600" /> Resultados y DC-3
            </h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium">
            <LogOut size={18} /> Salir
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto mt-8 p-4">
        
        {/* Barra de Herramientas */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute top-3 left-3 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por alumno, empresa o examen..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm w-full md:w-auto justify-center"
          >
            <Download size={18} /> Descargar Reporte Excel
          </button>
        </div>

        {/* Tabla de Resultados */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-bold text-gray-600 text-sm">Alumno</th>
                  <th className="p-4 font-bold text-gray-600 text-sm">CURP / Empresa</th>
                  <th className="p-4 font-bold text-gray-600 text-sm">Examen</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-center">Nota</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-right">Fecha</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">Cargando resultados...</td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">No se encontraron evaluaciones.</td>
                  </tr>
                ) : (
                  filteredResults.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{r.studentName}</div>
                        <div className="text-xs text-gray-400 md:hidden">{r.studentCompany}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit text-gray-600 mb-1">
                          {r.studentCurp}
                        </div>
                        <div className="text-sm text-gray-500">{r.studentCompany}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                        {r.examTitle}
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
                        <div className="flex justify-end items-center gap-2">
                          {/* Botón para Constancia (siempre disponible) */}
                          <button
                            onClick={() => {
                              const studentPDFData = { 
                                studentName: r.studentName,
                                studentEmail: r.studentEmail || 'No disponible', // Añadimos el email
                                studentCurp: r.studentCurp,
                                studentOccupation: r.studentOccupation,
                                studentCompany: r.studentCompany
                              };
                              const examPDFData = { examTitle: r.examTitle };
                              
                              // Reconstruimos las respuestas incorrectas desde los datos guardados
                              const incorrectAnswers = r.examQuestions
                                .map((q, index) => ({
                                  question: q.text,
                                  yourAnswer: r.studentAnswers[index] !== undefined ? q.options[r.studentAnswers[index]] : "No respondida",
                                  correctAnswer: q.options[q.correctOption],
                                  isCorrect: r.studentAnswers[index] === q.correctOption
                                }))
                                .filter(item => !item.isCorrect);

                              generateConstancia(studentPDFData, examPDFData, r.score, incorrectAnswers);
                            }}
                            className="text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-100 transition"
                            title="Descargar Constancia de Participación"
                          >
                            <FileText size={18} />
                          </button>

                          {/* Botón para DC-3 (solo si aprobó) */}
                          {r.score >= 80 && (
                            <button
                                onClick={() => {
                                    const pdfStudentData = {
                                        studentName: r.studentName,
                                        studentFirstName: r.studentFirstName,
                                        studentPaternalLastName: r.studentPaternalLastName,
                                        studentMaternalLastName: r.studentMaternalLastName,
                                        studentCurp: r.studentCurp,
                                        studentOccupation: r.studentOccupation,
                                        studentCompany: r.studentCompany,
                                        studentCompanyRfc: r.studentCompanyRfc // <-- Pasamos el RFC de la empresa
                                    };
                                    const pdfExamData = { examTitle: r.examTitle };
                                    generateDC3(pdfStudentData, pdfExamData);
                                }}
                                className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-100 transition"
                                title="Descargar DC-3"
                            >
                                <Printer size={18} />
                            </button>
                          )}
                          {/* Botón para Eliminar Resultado */}
                          <button
                            onClick={() => handleDeleteResult(r.id, r.studentName)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition"
                            title="Eliminar esta calificación"
                          >
                            <Trash2 size={18} />
                          </button>
                          
                        </div>
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

export default AdminResults;