import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase-config';
import { signOut } from 'firebase/auth';import { collection, addDoc, getDocs, doc, deleteDoc, orderBy, query, updateDoc } from 'firebase/firestore';
import { generateStudyGuide } from '../utils/studyGuideGenerator'; // <-- NUEVO
import Papa from 'papaparse';import { LogOut, Upload, FileText, CheckCircle, Type, List, Trash2, BookCopy, Loader, Users, AlertTriangle, Download } from 'lucide-react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [examTitle, setExamTitle] = useState(''); // Estado para el nombre del examen
  const [examDuration, setExamDuration] = useState(45); // <-- NUEVO: Estado para la duración
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [allResults, setAllResults] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedExamFilter, setSelectedExamFilter] = useState('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('all');
  const [loadingChart, setLoadingChart] = useState(true);
  const [editingExamId, setEditingExamId] = useState(null); // <-- NUEVO: Para edición en línea
  const chartRef = useRef(null);
  const navigate = useNavigate();

  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const examsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExams(examsList);
    } catch (error) {
      console.error("Error cargando exámenes: ", error);
    }
    setLoadingExams(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/home');
  };

  const getCorrectIndex = (letter) => {
    if (!letter) return -1;
    const cleanLetter = letter.toString().trim().toUpperCase();
    const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'VERDADERO': 0, 'FALSO': 1 };
    return map[cleanLetter] !== undefined ? map[cleanLetter] : -1;
  };

  const isTrueFalse = (row) => {
    const answer = row['Respuesta']?.toString().trim().toUpperCase();
    return answer === 'VERDADERO' || answer === 'FALSO';
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingExams(true);
      setLoadingChart(true);
      try {
        // Fetch exams
        await fetchExams();

        // Fetch all results for chart and filters
        const resultsRef = collection(db, "results");
        const resultsSnapshot = await getDocs(resultsRef);
        const resultsData = resultsSnapshot.docs.map(doc => doc.data());
        setAllResults(resultsData);

        // Derive available months from results
        const months = resultsData.reduce((acc, result) => {
          const date = result.timestamp.toDate();
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          acc.add(month);
          return acc;
        }, new Set());
        setAvailableMonths(Array.from(months).sort().reverse());

      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoadingChart(false);
        setLoadingExams(false);
      }
    };

    fetchInitialData();
  }, []);

  // This effect updates the chart whenever filters change
  useEffect(() => {
    if (allResults.length === 0) return;

    const filtered = allResults.filter(result => {
      const examMatch = selectedExamFilter === 'all' || result.examId === selectedExamFilter;
      const date = result.timestamp.toDate();
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthMatch = selectedMonthFilter === 'all' || month === selectedMonthFilter;
      return examMatch && monthMatch;
    });

    const totals = filtered.reduce((acc, result) => {
      if (result.approved) acc.approved += 1;
      else acc.failed += 1;
      return acc;
    }, { approved: 0, failed: 0 });

    setChartData({
      labels: ['Aprobados', 'Reprobados'],
      datasets: [
        {
          label: '# de Resultados',
          data: [totals.approved, totals.failed],
          backgroundColor: [
            'rgba(34, 197, 94, 0.7)',
            'rgba(239, 68, 68, 0.7)',
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(239, 68, 68, 1)',
          ],
          borderWidth: 1,
        },
      ],
    });
  }, [allResults, selectedExamFilter, selectedMonthFilter]);

  const handleExportChart = () => {
    const chart = chartRef.current;
    if (!chart) {
      alert("El gráfico no está listo para ser exportado.");
      return;
    }
    const image = chart.toBase64Image();
    const link = document.createElement('a');
    link.href = image;
    link.download = 'rendimiento_mensual.png';
    link.click();
  };
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. VALIDACIÓN: Obligar a poner nombre
    if (!examTitle.trim()) {
      alert("⚠️ Por favor, escribe un NOMBRE para el examen antes de seleccionar el archivo.");
      e.target.value = null; // Reseteamos el input del archivo
      return;
    }

    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "ISO-8859-1",
      complete: async (results) => {
        try {
          const questions = results.data.map((row, index) => {
            let options;
            let questionType = 'MC'; // Multiple Choice por defecto

            if (isTrueFalse(row)) {
              questionType = 'TF'; // True/False
              options = ['Verdadero', 'Falso'];
            } else {
              options = [row['Opcion A'], row['Opcion B'], row['Opcion C']];
              if (row['Opcion D'] && row['Opcion D'].trim() !== '') {
                options.push(row['Opcion D']);
              }
              // Filtramos opciones vacías en caso de que sea una pregunta con menos de 4 opciones
              options = options.filter(opt => opt && opt.trim() !== '');
            }

            return {
              id: index + 1,
              text: row['Pregunta'],
              type: questionType,
              options: options,
              correctOption: getCorrectIndex(row['Respuesta'])
            };
          }).filter(q => q.text);

          if (questions.length === 0) {
            alert("El archivo está vacío o las columnas no coinciden.");
            setLoading(false);
            return;
          }

          // Generar la guía de estudio
          const studyGuide = generateStudyGuide(questions, examTitle.trim());

          // 2. USAR EL NOMBRE PERSONALIZADO
          const examData = {
            title: examTitle.trim(), // <--- Aquí usamos lo que escribiste
            duration: Number(examDuration), // <-- NUEVO: Guardamos la duración en minutos
            createdAt: new Date(),
            totalQuestions: questions.length,
            studyGuide: studyGuide, // <-- NUEVO: Guardamos la guía generada
            questions: questions
          };

          await addDoc(collection(db, "exams"), examData);
          
          alert(`¡Éxito! Se creó el examen "${examTitle}" con ${questions.length} preguntas.`);
          
          // Limpiar formulario
          setExamTitle('');
          setExamDuration(45);
          e.target.value = null;
          fetchExams(); // Recargar la lista de exámenes

        } catch (error) {
          console.error("Error subiendo:", error);
          alert("Hubo un error al guardar en la base de datos.");
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        console.error("Error CSV:", error);
        setLoading(false);
      }
    });
  };

  const handleDeleteExam = async (examId, examTitle) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el examen "${examTitle}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteDoc(doc(db, "exams", examId));
        alert(`Examen "${examTitle}" eliminado con éxito.`);
        // Actualizar la lista de exámenes en el estado para reflejar el cambio
        setExams(exams.filter(exam => exam.id !== examId));
      } catch (error) {
        console.error("Error eliminando examen: ", error);
        alert("Hubo un error al eliminar el examen.");
      }
    }
  };

  // --- NUEVO: Guardar cambios en un examen existente (duración) ---
  const handleSaveExamChanges = async (examId) => {
    const examToUpdate = exams.find(e => e.id === examId);
    if (!examToUpdate) return;

    try {
      const examRef = doc(db, "exams", examId);
      await updateDoc(examRef, {
        duration: Number(examToUpdate.duration)
      });
      alert(`Duración del examen "${examToUpdate.title}" actualizada.`);
      setEditingExamId(null); // Salir del modo edición
    } catch (error) {
      console.error("Error actualizando examen:", error);
      alert("Hubo un error al guardar los cambios.");
    }
  };

  const handleResetAllRetakes = async () => {
    if (window.confirm("ADVERTENCIA: ¿Estás SEGURO de que quieres reiniciar TODOS los reintentos pendientes para TODOS los alumnos? Esta acción es irreversible.")) {
      if (window.confirm("CONFIRMACIÓN FINAL: Esta acción no se puede deshacer y eliminará todos los pases de reintento existentes. ¿Continuar?")) {
        setLoading(true);
        try {
          const approvalsRef = collection(db, "retake_approvals");
          const snapshot = await getDocs(approvalsRef);
          
          if (snapshot.empty) {
            alert("No hay reintentos pendientes para reiniciar.");
            setLoading(false);
            return;
          }

          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);

          alert(`¡Éxito! Se han reiniciado ${snapshot.size} reintentos pendientes.`);
        } catch (error) {
          console.error("Error reiniciando reintentos:", error);
          alert("Hubo un error al reiniciar los reintentos pendientes.");
        } finally {
          setLoading(false);
        }
      }
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CheckCircle className="text-blue-600" /> Panel de Administración
          </h1>
          
          <div className="flex flex-wrap gap-2">
            {/* Botón para ir a Resultados */}
            <button 
              onClick={() => navigate('/admin/resultados')}
              className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <List size={20} /> Ver Resultados
            </button>
            {/* Botón para ir a Usuarios */}
            <button 
              onClick={() => navigate('/admin/usuarios')}
              className="flex items-center gap-2 text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Users size={20} /> Gestionar Usuarios
            </button>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors bg-gray-100 px-4 py-2 rounded-lg"
            >
              <LogOut size={18} /> Salir
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-4xl mx-auto mt-10 p-6">
        <div className="bg-white rounded-xl shadow-md p-8 text-center border-t-4 border-blue-600">
          
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Upload className="text-blue-600 w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cargar Nuevo Examen</h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Sube tu archivo Excel (CSV) con las preguntas. Asegúrate de ponerle un nombre claro para que los alumnos lo identifiquen.
          </p>

          {/* NUEVO: Input para el Título */}
          <div className="max-w-md mx-auto mb-8 text-left grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                Nombre del Examen
              </label>
              <div className="relative">
                <Type className="absolute top-3 left-3 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Ej. Seguridad en Alturas - Nivel 1"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                Duración (min)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  placeholder="45"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={examDuration}
                  onChange={(e) => setExamDuration(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Área de carga de archivo */}
          <label className={`
            block w-full max-w-md mx-auto border-2 border-dashed rounded-lg p-8 cursor-pointer transition-all
            ${loading ? 'bg-gray-50 border-gray-300' : 'border-blue-300 hover:bg-blue-50 hover:border-blue-500'}
            ${!examTitle.trim() && !loading ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''} 
          `}>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              disabled={loading || !examTitle.trim()} // Deshabilitado si no hay título
              className="hidden" 
            />
            
            {loading ? (
              <span className="text-blue-600 font-bold animate-pulse flex flex-col items-center gap-2">
                <Upload className="animate-bounce" /> Procesando preguntas...
              </span>
            ) : (
              <div className="flex flex-col items-center">
                <FileText className={`mb-2 w-8 h-8 ${!examTitle.trim() ? 'text-gray-300' : 'text-blue-500'}`} />
                <span className={`font-medium ${!examTitle.trim() ? 'text-gray-400' : 'text-blue-600'}`}>
                  {!examTitle.trim() ? 'Primero escribe un nombre arriba ☝️' : 'Haz clic para seleccionar el CSV'}
                </span>
              </div>
            )}
          </label>

          <div className="mt-8 text-xs text-gray-400">
            Columnas requeridas en Excel: <br/>
            <span className="font-mono bg-gray-100 px-1 rounded">Pregunta, Opcion A, Opcion B, Opcion C, (Opcion D), Respuesta</span>
          </div>

        </div>

        {/* Lista de Exámenes Existentes */}
        <div className="bg-white rounded-xl shadow-md p-8 mt-10 border-t-4 border-gray-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <BookCopy className="text-gray-500" /> Exámenes Cargados
          </h2>
          {loadingExams ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="animate-spin text-blue-600" />
              <span className="ml-3 text-gray-500">Cargando exámenes...</span>
            </div>
          ) : exams.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No hay exámenes cargados todavía.</p>
          ) : (
            <ul className="space-y-3">
              {exams.map(exam => (
                <li key={exam.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                    <p className="font-bold text-gray-800">{exam.title}</p>
                      <p className="text-xs text-gray-500">
                        {exam.totalQuestions} preguntas - Creado el {new Date(exam.createdAt.seconds * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingExamId === exam.id ? (
                        <>
                          <input
                            type="number"
                            value={exam.duration || 45}
                            onChange={(e) => setExams(exams.map(ex => ex.id === exam.id ? { ...ex, duration: e.target.value } : ex))}
                            className="w-20 text-center border-gray-300 rounded-md"
                          />
                          <button onClick={() => handleSaveExamChanges(exam.id)} className="text-green-600 p-2 rounded-full hover:bg-green-100">Guardar</button>
                          <button onClick={() => setEditingExamId(null)} className="text-gray-500 p-2 rounded-full hover:bg-gray-200">X</button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-gray-600 bg-gray-200 px-2 py-1 rounded-md">{exam.duration || 'N/A'} min</span>
                          <button onClick={() => setEditingExamId(exam.id)} className="text-blue-600 p-2 rounded-full hover:bg-blue-100">Editar</button>
                          <button
                            onClick={() => handleDeleteExam(exam.id, exam.title)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors"
                            title="Eliminar examen"
                          ><Trash2 size={20} /></button>
                        </>
                      )}
                    </div>
                  </div>                  
                  <button
                    onClick={() => handleDeleteExam(exam.id, exam.title)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors"
                    title="Eliminar examen"
                  >
                    <Trash2 size={20} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Gráfico de Resultados */}
        <div className="bg-white rounded-xl shadow-md p-8 mt-10 border-t-4 border-green-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Rendimiento Mensual</h2>
            {chartData && chartData.labels.length > 0 && (
              <button
                onClick={handleExportChart}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition shadow-sm text-sm font-medium"
              >
                <Download size={16} /> Exportar PNG
              </button>
            )}
          </div>

          {/* --- NUEVO: Filtros para el gráfico --- */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Filtrar por Examen</label>
              <select
                value={selectedExamFilter}
                onChange={(e) => setSelectedExamFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Todos los exámenes</option>
                {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Filtrar por Mes</label>
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Todos los meses</option>
                {availableMonths.map(month => <option key={month} value={month}>{new Date(month + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</option>)}
              </select>
            </div>
          </div>

          {loadingChart ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="animate-spin text-blue-600" />
              <span className="ml-3 text-gray-500">Cargando datos del gráfico...</span>
            </div>
          ) : chartData && chartData.datasets[0].data.some(d => d > 0) ? (
            <div className="max-w-sm mx-auto">
              <Pie
              ref={chartRef}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: true, text: 'Exámenes Aprobados vs. Reprobados' },
                },
              }}
              data={chartData}
            />
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No hay suficientes datos para mostrar el gráfico.</p>
          )}
        </div>

        {/* Zona de Mantenimiento */}
        <div className="bg-white rounded-xl shadow-md p-8 mt-10 border-t-4 border-red-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
            <AlertTriangle className="text-red-500" /> Acciones de Mantenimiento
          </h2>
          <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <p className="font-bold text-red-800">Reiniciar Reintentos Globales</p>
              <p className="text-sm text-red-600">Esta acción eliminará todos los pases de reintento aprobados que aún no han sido utilizados por los alumnos.</p>
            </div>
            <button onClick={handleResetAllRetakes} disabled={loading} className="mt-4 sm:mt-0 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition shadow-sm font-medium disabled:bg-red-300">
              {loading ? 'Procesando...' : 'Reiniciar Todo'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;