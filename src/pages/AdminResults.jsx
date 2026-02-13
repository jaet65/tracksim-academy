import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase-config'; // Importamos auth para obtener el usuario actual
import { collection, getDocs, orderBy, query, doc, getDoc, deleteDoc, addDoc, writeBatch, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LogOut, ArrowLeft, Search, Download, FileText, Printer, Trash2, Repeat, Upload, Loader, Users } from 'lucide-react';
import { formatTime } from '../utils/timeUtils'; // Import utility formatTime
import { generateDC3 } from '../utils/generateDC3'; // Para el formato oficial
import { generateConstancia } from '../utils/generateConstancia'; // Para la constancia con errores
import Papa from 'papaparse';
import logo from '../assets/Logo.gif';

const AdminResults = () => {
  const [results, setResults] = useState([]);
  const [selectedResults, setSelectedResults] = useState([]); // <-- NUEVO: Para selección múltiple
  const [pendingApprovals, setPendingApprovals] = useState([]); // <-- NUEVO: Para reintentos pendientes
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false); // Estado para la carga de notas
  const [currentPage, setCurrentPage] = useState(1); // <-- NUEVO: Para paginación
  const [showExportModal, setShowExportModal] = useState(false); // <-- NUEVO: Para el modal de exportación
  const [resultsPerPage] = useState(20); // <-- NUEVO: Resultados por página
  const [currentUserRole, setCurrentUserRole] = useState({ isInstructor: false, company: null }); // <-- NUEVO: Para el rol

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
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      // Identificar el rol y la empresa del usuario actual
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      let instructorCompany = null;
      if (userDoc.exists() && userDoc.data().isInstructor) {
        instructorCompany = userDoc.data().company;
        setCurrentUserRole({ isInstructor: true, company: instructorCompany });
      }

      // Cargar resultados con filtro de empresa si es instructor
      let q;
      if (instructorCompany) {
        // Si es instructor, solo trae resultados de su empresa
        q = query(collection(db, "results"), where("studentCompany", "==", instructorCompany), orderBy("timestamp", "desc"));
      } else {
        // Si es admin, trae todos
        const resultsRef = collection(db, "results");
        q = query(resultsRef, orderBy("timestamp", "desc"));
      }
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), dateObj: doc.data().timestamp?.toDate() }));
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


  useEffect(() => {
    fetchAllData();
  }, []);
  const handleLogout = async () => {
    await signOut(auth);
    navigate('/home');
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
  const exportToCSV = (filterType) => {
    const headers = ["Nombre,CURP,Empresa,RFC,Examen,Calificacion,Nota Simulador,Tiempo Ocupado,Fecha"];

    // Primero, filtramos los resultados según el criterio de búsqueda actual
    let resultsToProcess = filteredResults;

    // Si se pide "solo faltantes", aplicamos ese filtro adicional
    if (filterType === 'missing') {
      resultsToProcess = resultsToProcess.filter(r => r.simulatorScore === undefined);
    }

    // Después, obtenemos solo el último intento de cada examen por alumno de la lista ya filtrada
    const latestResults = [];
    const seen = new Set();
    resultsToProcess.forEach(r => {
      const key = `${r.studentUid}_${r.examId}`;
      if (!seen.has(key)) {
        latestResults.push(r);
        seen.add(key);
      }
    });

    const rows = latestResults.map(r =>
      `"${r.studentName}","${r.studentCurp}","${r.studentCompany}","${r.studentCompanyRfc || ''}","${r.examTitle}","${r.score}","${r.simulatorScore !== undefined ? r.simulatorScore : 'TBD'}","${r.timeTaken !== undefined ? formatTime(r.timeTaken) : 'N/A'}","${r.dateObj?.toLocaleDateString()}"`
    );
    
    // --- CORRECCIÓN PARA CODIFICACIÓN UTF-8 EN EXCEL ---
    // Añadimos el BOM (Byte Order Mark) para que Excel reconozca el UTF-8
    const csvString = headers.concat(rows).join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "reporte_dc3.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false); // Cerramos el modal después de la descarga
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

  const handleGenerateDC3sSelected = () => {
    const approvedSelectedResults = results.filter(r => 
      selectedResults.includes(r.id) && r.score >= 60 && r.simulatorScore !== undefined && Number(r.simulatorScore) >= 60
    );

    if (approvedSelectedResults.length === 0) {
      alert("No hay resultados aprobados entre los seleccionados para generar DC-3.");
      return;
    }

    if (window.confirm(`Se generarán ${approvedSelectedResults.length} constancias DC-3. Tu navegador podría pedirte permiso para descargar múltiples archivos. ¿Continuar?`)) {
      approvedSelectedResults.forEach(r => {
        const pdfStudentData = {
          studentName: r.studentName,
          studentFirstName: r.studentFirstName,
          studentPaternalLastName: r.studentPaternalLastName,
          studentMaternalLastName: r.studentMaternalLastName,
          studentCurp: r.studentCurp,
          studentOccupation: r.studentOccupation,
          studentCompany: r.studentCompany,
          studentCompanyRfc: r.studentCompanyRfc
        };
        const pdfExamData = { examTitle: r.examTitle };
        generateDC3(pdfStudentData, pdfExamData);
      });
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

  // 6. Cargar notas de simulador desde CSV
  const handleSimulatorScoresUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "ISO-8859-1",
      complete: async (parsedResults) => {
        const scoresData = parsedResults.data;
        if (!scoresData.length || !scoresData[0]?.CURP || !scoresData[0]?.Examen || scoresData[0]?.["Nota Simulador"] === undefined) {
          alert("El archivo CSV no tiene el formato correcto. Asegúrate de que contenga las columnas 'CURP', 'Examen' y 'Nota Simulador'.");
          setUploading(false);
          e.target.value = null;
          return;
        }

        try {
          const batch = writeBatch(db);
          let updatedCount = 0;
          const notFound = [];

          // Creamos un mapa para acceder a los resultados de forma eficiente
          const resultsMap = new Map();
          results.forEach(res => {
            // Clave única: CURP + Título del Examen (normalizado)
            const key = `${res.studentCurp?.trim()}_${res.examTitle?.trim()}`;
            // Guardamos el resultado más reciente para esa clave
            if (!resultsMap.has(key)) {
              resultsMap.set(key, res);
            }
          });

          scoresData.forEach(row => {
            const key = `${row.CURP?.trim()}_${row.Examen?.trim()}`;
            const resultToUpdate = resultsMap.get(key);

            if (resultToUpdate) {
              const resultRef = doc(db, "results", resultToUpdate.id);
              const userRef = doc(db, "users", resultToUpdate.studentUid);

              // 1. Preparamos la actualización para el documento del resultado
              const updatePayload = { simulatorScore: row["Nota Simulador"] };

              // 2. Preparamos la actualización para el perfil del usuario (si se proporcionan datos en el CSV)
              const userUpdatePayload = {};
              if (row["Nombre"]) userUpdatePayload.fullName = row["Nombre"];
              if (row["Empresa"]) userUpdatePayload.company = row["Empresa"];
              if (row["RFC"]) userUpdatePayload.companyRfc = row["RFC"];

              // 3. Si hay cambios en el perfil, los aplicamos al usuario y al resultado
              if (Object.keys(userUpdatePayload).length > 0) {
                batch.update(userRef, userUpdatePayload);
                // También actualizamos la copia denormalizada en el resultado
                if (userUpdatePayload.fullName) updatePayload.studentName = userUpdatePayload.fullName;
                if (userUpdatePayload.company) updatePayload.studentCompany = userUpdatePayload.company;
                if (userUpdatePayload.companyRfc) updatePayload.studentCompanyRfc = userUpdatePayload.companyRfc;
              }

              // 4. Añadimos la actualización del resultado al batch
              batch.update(resultRef, updatePayload);
              updatedCount++;

            } else {
              notFound.push(`${row.CURP} - ${row.Examen}`);
            }
          });

          await batch.commit();

          let summary = `Proceso completado. Se actualizaron ${updatedCount} notas.`;
          if (notFound.length > 0) {
            summary += `\n\nNo se encontraron ${notFound.length} registros coincidentes (se busca el intento más reciente):\n- ${notFound.slice(0, 10).join('\n- ')}`;
            if (notFound.length > 10) summary += '\n- ... y más.';
            console.warn("Registros no encontrados:", notFound);
          }
          alert(summary);
          
          fetchAllData(); // Recargamos los datos para ver los cambios

        } catch (error) {
          console.error("Error actualizando notas:", error);
          alert("Hubo un error al actualizar las notas en la base de datos.");
        } finally {
          setUploading(false);
          e.target.value = null; // Reseteamos el input
        }
      },
      error: (err) => {
        alert(`Error al leer el archivo CSV: ${err.message}`);
        setUploading(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Admin */}
      <nav className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-15" />
            <h1 className="text-xl font-bold text-gray-800">Resultados y DC-3</h1>
          </div>
          <div className="flex items-center gap-4">
            {currentUserRole.isInstructor && (
              <span className="text-sm font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Vista de Instructor: {currentUserRole.company}
              </span>
            )}
            {!currentUserRole.isInstructor && (
              <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors font-medium">
                <ArrowLeft size={20} /> Panel Principal
              </button>
            )}
            {!currentUserRole.isInstructor && (
              <button onClick={() => navigate('/admin/usuarios')} className="flex items-center gap-2 text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors font-medium">
                <Users size={20} /> Gestionar Usuarios
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors bg-gray-100 px-4 py-2 rounded-lg"
            >
              <LogOut size={18} /> Salir
            </button>
          </div>
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
          
          {/* --- NUEVO: Botones de acciones en lote (solo para admins) --- */}
          {!currentUserRole.isInstructor && selectedResults.length > 0 && (
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
              <button
                onClick={handleGenerateDC3sSelected}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm justify-center"
              >
                <Printer size={18} /> Generar DC-3 ({selectedResults.filter(id => {
                  const r = results.find(res => res.id === id);
                  return r && r.score >= 60 && r.simulatorScore !== undefined && Number(r.simulatorScore) >= 60;
                }).length})
              </button>
            </div>
          )}

          <button 
            onClick={() => setShowExportModal(true)}
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
                  {!currentUserRole.isInstructor && (
                    <th className="p-4 w-12">
                      <input // La casilla "seleccionar todo" ahora solo afecta a la página actual
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        onChange={handleSelectAll}
                        checked={filteredResults.length > 0 && selectedResults.length === filteredResults.length}
                      />
                    </th>
                  )}
                  <th className="p-4 font-bold text-gray-600 text-sm">Alumno</th>
                  <th className="p-4 font-bold text-gray-600 text-sm">Empresa</th>
                  <th className="p-4 font-bold text-gray-600 text-sm">Examen</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-center">Nota Examen</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-center">Nota Simulador</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-center">Tiempo Ocupado</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-right">Fecha</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={currentUserRole.isInstructor ? "8" : "9"} className="p-8 text-center text-gray-500">Cargando resultados...</td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={currentUserRole.isInstructor ? "8" : "9"} className="p-8 text-center text-gray-500">No se encontraron evaluaciones.</td>
                  </tr>
                ) : (
                  currentResults.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50 transition-colors group">
                      {!currentUserRole.isInstructor && (
                        <td className="p-4">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            value={r.id}
                            checked={selectedResults.includes(r.id)}
                            onChange={(e) => handleSelectOne(e, r.id)}
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <div>
                          <div className="font-bold text-gray-800">{r.studentName}</div>
                          <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit text-gray-600 mt-1">{r.studentCurp}</div>
                          {r.attempt > 1 && (
                            <span className="mt-1 inline-block text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                              Intento #{r.attempt}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-500">{r.studentCompany}</div>
                        <div className="font-mono text-xs text-gray-400">{r.studentCompanyRfc}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                        {r.examTitle}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          r.score >= 60 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {r.score}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {r.simulatorScore !== undefined ? (
                          <span className="px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-700">{r.simulatorScore}</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-gray-500">TBD</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {r.timeTaken !== undefined ? (
                          <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700">{formatTime(r.timeTaken)}</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-gray-500">N/A</span>
                        )}
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

                          {r.score >= 60 && r.simulatorScore !== undefined && Number(r.simulatorScore) >= 60 && (
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
                          
                          {!currentUserRole.isInstructor && (
                            <>
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
                            </>
                          )}
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

        {/* Carga de Notas de Simulador (solo para admins) */}
        {!currentUserRole.isInstructor && (
          <div className="bg-white rounded-xl shadow-md p-8 mt-10 border-t-4 border-purple-500">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="text-purple-600 w-8 h-8" />
              <h2 className="text-2xl font-bold text-gray-800">Cargar Notas de Simulador</h2>
            </div>
            <p className="text-gray-500 mb-8 max-w-2xl">
              Sube un archivo <span className="font-mono text-purple-700">.csv</span> con las notas del simulador. El sistema buscará el resultado más reciente del alumno por su <strong className="text-gray-600">CURP</strong> y el <strong className="text-gray-600">título exacto del examen</strong> para actualizar la nota.
            </p>

            <label className={`
              block w-full max-w-md mx-auto border-2 border-dashed rounded-lg p-8 cursor-pointer transition-all
              ${uploading ? 'bg-gray-100 border-gray-300' : 'border-purple-300 hover:bg-purple-50 hover:border-purple-500'}
            `}>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleSimulatorScoresUpload} 
                disabled={uploading}
                className="hidden" 
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-gray-500 font-bold animate-pulse">
                  <Loader className="animate-spin" /> Procesando archivo...
                </div>
              ) : (
                <div className="flex flex-col items-center text-purple-600">
                  <FileText className="mb-2 w-8 h-8" />
                  <span className="font-medium">Haz clic para seleccionar el archivo CSV</span>
                </div>
              )}
            </label>
            <div className="mt-4 text-center text-xs text-gray-400">
              <p>Columnas requeridas: <span className="font-mono bg-gray-100 px-1 rounded">CURP</span>, <span className="font-mono bg-gray-100 px-1 rounded">Examen</span>, <span className="font-mono bg-gray-100 px-1 rounded">Nota Simulador</span></p>
              <p className="mt-1">Columnas opcionales para editar: <span className="font-mono bg-gray-100 px-1 rounded">Nombre</span>, <span className="font-mono bg-gray-100 px-1 rounded">Empresa</span>, <span className="font-mono bg-gray-100 px-1 rounded">RFC</span></p>
            </div>
          </div>
        )}

        {/* --- NUEVO: Modal para elegir tipo de exportación --- */}
        {showExportModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full text-center">
              <Download className="mx-auto w-12 h-12 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Tipo de Reporte</h2>
              <p className="text-gray-600 mb-8">Elige qué datos quieres incluir en el archivo de Excel.</p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => exportToCSV('all')} 
                  className="w-full px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold"
                >
                  Descargar Todos los Resultados
                </button>
                <button 
                  onClick={() => exportToCSV('missing')} 
                  className="w-full px-6 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 font-bold"
                >
                  Descargar Solo Faltantes de Simulador
                </button>
                <button onClick={() => setShowExportModal(false)} className="mt-2 text-sm text-gray-500 hover:text-gray-700 font-medium">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminResults;