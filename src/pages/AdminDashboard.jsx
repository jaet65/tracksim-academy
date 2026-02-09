import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase-config';
import { signOut } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import Papa from 'papaparse';
import { LogOut, Upload, FileText, CheckCircle, Type } from 'lucide-react';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [examTitle, setExamTitle] = useState(''); // Estado para el nombre del examen
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const getCorrectIndex = (letter) => {
    if (!letter) return -1;
    const cleanLetter = letter.toString().trim().toUpperCase();
    const map = { 'A': 0, 'B': 1, 'C': 2 };
    return map[cleanLetter] !== undefined ? map[cleanLetter] : -1;
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
            return {
              id: index + 1,
              text: row['Pregunta'],
              options: [
                row['Opcion A'],
                row['Opcion B'],
                row['Opcion C']
              ],
              correctOption: getCorrectIndex(row['Respuesta'])
            };
          }).filter(q => q.text);

          if (questions.length === 0) {
            alert("El archivo está vacío o las columnas no coinciden.");
            setLoading(false);
            return;
          }

          // 2. USAR EL NOMBRE PERSONALIZADO
          const examData = {
            title: examTitle.trim(), // <--- Aquí usamos lo que escribiste
            createdAt: new Date(),
            totalQuestions: questions.length,
            questions: questions
          };

          await addDoc(collection(db, "exams"), examData);
          
          alert(`¡Éxito! Se creó el examen "${examTitle}" con ${questions.length} preguntas.`);
          
          // Limpiar formulario
          setExamTitle('');
          e.target.value = null;

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CheckCircle className="text-blue-600" /> Panel de Administración
          </h1>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors bg-gray-100 px-4 py-2 rounded-lg"
          >
            <LogOut size={18} /> Salir
          </button>
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
          <div className="max-w-md mx-auto mb-8 text-left">
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
            <span className="font-mono bg-gray-100 px-1 rounded">Pregunta, Opcion A, Opcion B, Opcion C, Respuesta</span>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;