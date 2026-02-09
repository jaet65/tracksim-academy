import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from '../firebase-config';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { Clock, CheckCircle, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';

const StudentExam = () => {
  const { id } = useParams(); // Obtenemos el ID del examen desde la URL
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // Guardamos { id_pregunta: indice_respuesta }
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutos en segundos (Configurable)
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  // 1. Cargar el examen desde Firebase
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const docRef = doc(db, "exams", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setExam(docSnap.data());
        } else {
          alert("Examen no encontrado");
        }
      } catch (error) {
        console.error("Error obteniendo examen:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  // 2. Lógica del Cronómetro
  useEffect(() => {
    if (!exam || finished) return;
    
    // Si el tiempo llega a 0, finalizamos
    if (timeLeft <= 0) {
      finishExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, exam, finished]);

  // Formato de tiempo MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 3. Manejar selección de respuesta
  const handleSelectOption = (optionIndex) => {
    setAnswers({
      ...answers,
      [currentQuestionIndex]: optionIndex
    });
  };

  // 4. Finalizar y Calificar
  const finishExam = async () => {
    // Calculamos la nota
    let correctCount = 0;
    exam.questions.forEach((q, index) => {
      if (answers[index] === q.correctOption) {
        correctCount++;
      }
    });

    const finalScore = Number(((correctCount / exam.questions.length) * 100).toFixed(2));
    setScore(finalScore);
    setFinished(true);

    // Guardar el resultado en Firebase (Opcional, para el registro)
    const user = auth.currentUser;
    let studentData = {};
    
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            studentData = userDoc.data();
        }
    }

    try {
      await addDoc(collection(db, "results"), {
        examId: id,
        examTitle: exam.title,
        
        // Datos del Alumno (DC-3)
        studentName: studentData.fullName || "Sin Nombre",
        studentCurp: studentData.curp || "N/A",
        studentOccupation: studentData.occupation || "N/A",
        studentCompany: studentData.company || "N/A",
        studentUid: user ? user.uid : "anon",
        
        // Datos Académicos
        score: finalScore,
        totalQuestions: exam.questions.length,
        correctAnswers: correctCount,
        approved: finalScore >= 80, // Puedes definir aquí la nota aprobatoria (ej. 8.0)
        
        timestamp: new Date()
      });
      
      // Limpiamos los datos del local para seguridad
      localStorage.removeItem('studentData');
      
    } catch (e) {
      console.error("Error guardando resultado", e);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando examen...</div>;
  if (!exam) return <div className="p-10 text-center text-red-600">No se encontró el examen.</div>;

  // --- VISTA DE RESULTADOS (CUANDO TERMINA) ---
  if (finished) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="mb-4 flex justify-center">
            <CheckCircle className="text-green-500 w-16 h-16" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">¡Examen Finalizado!</h2>
          <p className="text-gray-500 mb-6">Tu calificación ha sido registrada.</p>
          
          <div className="text-5xl font-bold text-blue-600 mb-4">{score}/100</div>
          
          <p className="text-sm text-gray-400">
            Respondiste correctamente {Math.round((score / 100) * exam.questions.length)} de {exam.questions.length} preguntas.
          </p>
          
          <button 
            onClick={() => window.location.href = '/'} 
            className="mt-8 w-full bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-900 transition"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // --- VISTA DEL EXAMEN (MIENTRAS RESPONDE) ---
  const question = exam.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header con Timer */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="font-bold text-gray-700 truncate w-1/2">{exam.title}</h1>
          <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
            <Clock size={20} />
            {formatTime(timeLeft)}
          </div>
        </div>
        {/* Barra de progreso */}
        <div className="w-full bg-gray-200 h-2 mt-4 rounded-full overflow-hidden">
          <div 
            className="bg-blue-500 h-full transition-all duration-300" 
            style={{ width: `${((currentQuestionIndex + 1) / exam.questions.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Área de Pregunta */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-10 min-h-[400px] flex flex-col justify-between">
          
          <div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">
              Pregunta {currentQuestionIndex + 1} de {exam.questions.length}
            </span>
            <h2 className="text-xl sm:text-2xl font-medium text-gray-800 mt-4 mb-8">
              {question.text}
            </h2>

            <div className="space-y-3">
              {question.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    answers[currentQuestionIndex] === idx 
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="inline-block w-6 font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Navegación */}
          <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
            <button
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="flex items-center text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2"
            >
              <ChevronLeft size={20} className="mr-1" /> Anterior
            </button>

            {currentQuestionIndex === exam.questions.length - 1 ? (
              <button
                onClick={() => {
                  if(confirm("¿Estás seguro de que quieres finalizar el examen?")) finishExam();
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 shadow-md transition-colors font-bold"
              >
                Finalizar Examen
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-colors flex items-center"
              >
                Siguiente <ChevronRight size={20} className="ml-1" />
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default StudentExam;