import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase-config';
import { collection, getDocs, orderBy, query, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LogOut, ArrowLeft, Search, Download, FileText, Printer, Trash2, Repeat} from 'lucide-react';
import { generateDC3 } from '../utils/generateDC3'; // Para el formato oficial
import { generateConstancia } from '../utils/generateConstancia'; // Para la constancia con errores

const AdminResults = () => {
  const [results, setResults] = useState([]);
  const [selectedResults, setSelectedResults] = useState([]); // <-- NUEVO: Para selección múltiple
  const [pendingApprovals, setPendingApprovals] = useState([]); // <-- NUEVO: Para reintentos pendientes
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1); // <-- NUEVO: Para paginación
  const [resultsPerPage] = useState(20); // <-- NUEVO: Resultados por página
  const navigate = useNavigate();
  const location = useLocation(); // <-- NUEVO: Para leer la URL

  // --- NUEVO: Leer el término de búsqueda desde la URL ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchQuery = params.get('search');
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [location.search]);

  // 1. Cargar resultados desde Firebase
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Cargar resultados
        const resultsRef = collection(db, "results");
        const q = query(resultsRef, orderBy("timestamp", "desc")); 
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dateObj: doc.data().timestamp?.toDate() 
        }));
        setResults(data);

        // Cargar aprobaciones de reintento PENDIENTES
        const approvalsRef = collection(db, "retake_approvals");
        const approvalsSnapshot = await getDocs(approvalsRef);
        const pending = approvalsSnapshot.docs.map(doc => {
          const approvalData = doc.data();
          return `${approvalData.studentUid}_${approvalData.examId}`;
        });
        setPendingApprovals(pending);

      } catch (error) {
        console.error("Error cargando datos:", error);
        if (error.code === 'failed-precondition') {
          alert("Nota: Firebase requiere un índice para ordenar por fecha. Revisa la consola.");
        } else if (error.code === 'permission-denied') {
          alert("Error de permisos. Asegúrate de que las reglas de seguridad de Firebase permitan a los administradores leer las colecciones 'results' y 'retake_approvals'.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
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

  // --- NUEVO: Lógica de paginación ---
  const indexOfLastResult = currentPage * resultsPerPage;
  const indexOfFirstResult = indexOfLastResult - resultsPerPage;
  const currentResults = filteredResults.slice(indexOfFirstResult, indexOfLastResult);
  const totalPages = Math.ceil(filteredResults.length / resultsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);


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

  // --- NUEVO: Lógica para selección múltiple ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Selecciona solo los resultados de la página actual
      setSelectedResults(currentResults.map(r => r.id));
    } else {
      setSelectedResults([]);
    }
  };

  const handleSelectOne = (e, resultId) => {
    if (e.target.checked) {
      setSelectedResults(prev => [...prev, resultId]);
    } else {
      setSelectedResults(prev => prev.filter(id => id !== resultId));
    }
  };

  const handleDeleteSelected = async () => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${selectedResults.length} resultados? Esta acción es irreversible.`)) {
      try {
        const deletePromises = selectedResults.map(id => deleteDoc(doc(db, "results", id)));
        await Promise.all(deletePromises);
        setResults(prev => prev.filter(r => !selectedResults.includes(r.id)));
        setSelectedResults([]);
        alert(`${selectedResults.length} resultados eliminados con éxito.`);
      } catch (error) {
        console.error("Error eliminando resultados:", error);
        alert("No se pudieron eliminar los resultados seleccionados.");
      }
    }
  };

  const handleApproveRetakeSelected = async () => {
    if (window.confirm(`¿Aprobar un nuevo intento para los ${selectedResults.length} resultados seleccionados?`)) {
      const approvalsToCreate = [];
      const alreadyPending = [];

      selectedResults.forEach(id => {
        const result = results.find(r => r.id === id);
        if (result) {
          const isPending = pendingApprovals.includes(`${result.studentUid}_${result.examId}`);
          if (!isPending) {
            approvalsToCreate.push(result);
          } else {
            alreadyPending.push(result.studentName);
          }
        }
      });

      if (approvalsToCreate.length > 0) {
        try {
          const approvalPromises = approvalsToCreate.map(result => {
          return addDoc(collection(db, "retake_approvals"), {
            studentUid: result.studentUid,
            examId: result.examId,
            approvedAt: new Date(),
            approvedBy: auth.currentUser?.email || 'admin'
          });
          });
          await Promise.all(approvalPromises);

          const newPending = approvalsToCreate.map(r => `${r.studentUid}_${r.examId}`);
          setPendingApprovals(prev => [...prev, ...newPending]);

          let alertMessage = `Se aprobaron ${approvalsToCreate.length} nuevos intentos.`;
          if (alreadyPending.length > 0) {
            alertMessage += `\nSe omitieron ${alreadyPending.length} porque ya tenían un reintento pendiente.`;
          }
          alert(alertMessage);

        } catch (error) {
          console.error("Error aprobando intentos:", error);
          alert("No se pudieron aprobar los nuevos intentos.");
        }
      } else {
        alert("No se aprobaron nuevos intentos porque todos los seleccionados ya tenían uno pendiente.");
      }
    }
  };

  // 5. Aprobar un nuevo intento
  const handleApproveRetake = async (result) => {
    const { studentUid, examId, studentName, examTitle } = result;
    if (window.confirm(`¿Aprobar un nuevo intento para ${studentName} en el examen "${examTitle}"?`)) {
      try {
        const approvalsRef = collection(db, "retake_approvals");
        await addDoc(approvalsRef, {
          studentUid,
          examId,
          approvedAt: new Date(),
          approvedBy: auth.currentUser?.email || 'admin'
        });
        // Actualizamos el estado local para deshabilitar el botón inmediatamente
        setPendingApprovals(prev => [...prev, `${studentUid}_${examId}`]);
        alert("¡Nuevo intento aprobado! El alumno ya puede realizar el examen de nuevo.");
      } catch (error) {
        console.error("Error aprobando intento:", error);
        alert("No se pudo aprobar el nuevo intento.");
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
          
          {/* --- NUEVO: Botones de acciones en lote --- */}
          {selectedResults.length > 0 && (
            <div className="flex flex-col md:flex-row gap-2">
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition shadow-sm justify-center"
              >
                <Trash2 size={18} /> Eliminar ({selectedResults.length})
              </button>
              <button
                onClick={handleApproveRetakeSelected}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition shadow-sm justify-center"
              >
                <Repeat size={18} /> Aprobar Retoma ({selectedResults.length})
              </button>
            </div>
          )}

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
                  <th className="p-4 w-12">
                    <input // La casilla "seleccionar todo" ahora solo afecta a la página actual
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      onChange={handleSelectAll}
                      checked={filteredResults.length > 0 && selectedResults.length === filteredResults.length}
                    />
                  </th>
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
                    <td colSpan="7" className="p-8 text-center text-gray-500">Cargando resultados...</td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500">No se encontraron evaluaciones.</td>
                  </tr>
                ) : (
                  currentResults.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50 transition-colors group">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          value={r.id}
                          checked={selectedResults.includes(r.id)}
                          onChange={(e) => handleSelectOne(e, r.id)}
                        />
                      </td>
                      <td className="p-4 flex items-center gap-2">
                        <div>
                          <div className="font-bold text-gray-800">{r.studentName}</div>
                          {r.attempt > 1 && (
                            <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                              Intento #{r.attempt}
                            </span>
                          )}
                        </div>
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
                          <button
                            onClick={() => {
                              const studentPDFData = { 
                                studentName: r.studentName,
                                studentEmail: r.studentEmail || 'No disponible',
                                studentCurp: r.studentCurp,
                                studentOccupation: r.studentOccupation,
                                studentCompany: r.studentCompany,
                                studentCompanyRfc: r.studentCompanyRfc,
                              };
                              const examPDFData = { examTitle: r.examTitle };
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
                          
                          {pendingApprovals.includes(`${r.studentUid}_${r.examId}`) ? (
                            <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded-md" title="Este alumno ya tiene un reintento pendiente para este examen.">
                              Pendiente
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApproveRetake(r)}
                              className="text-orange-500 hover:text-orange-700 p-2 rounded-full hover:bg-orange-100 transition"
                              title="Aprobar un nuevo intento para este alumno"
                            >
                              <Repeat size={18} />
                            </button>
                          )}
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
          {/* --- NUEVO: Controles de Paginación --- */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 bg-white border-t border-gray-200">
              <span className="text-sm text-gray-600">
                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminResults;