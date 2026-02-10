import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useBeforeUnload } from 'react-router-dom';
import { db, auth } from '../firebase-config';
import { doc, getDoc, addDoc, collection, query, where, getDocs, deleteDoc, limit } from 'firebase/firestore';import { FileDown, Clock, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, EyeOff, Maximize, ArrowRight } from 'lucide-react';
import logo from '../assets/Logo.png'; // Importamos el logo
import { generateConstancia } from '../utils/generateConstancia';
import { signOut } from 'firebase/auth'; // Importamos signOut

const StudentExam = () => {
  const { id } = useParams(); // Obtenemos el ID del examen desde la URL
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // Guardamos { id_pregunta: indice_respuesta }
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutos en segundos (Configurable)
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [attempt, setAttempt] = useState(0); // Estado para guardar el número de intento
  const [timeUp, setTimeUp] = useState(false); // Nuevo estado para controlar si el tiempo se agotó

  // --- NUEVO: Control anti-trampas ---
  const [visibilityWarnings, setVisibilityWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [terminatedForCheating, setTerminatedForCheating] = useState(false);
  const [showConfirmFinishModal, setShowConfirmFinishModal] = useState(false); // <-- Nuevo estado para el modal de confirmación
  const [isFullscreen, setIsFullscreen] = useState(document.fullscreenElement != null);
  const [rulesAccepted, setRulesAccepted] = useState(false); // <-- Nuevo estado

  const MAX_VISIBILITY_WARNINGS = 3; // Número de advertencias permitidas antes de finalizar el examen

  // Helper function to shuffle an array and return the shuffled array along with a map
  // from new index to original index
  const shuffleArrayWithMap = (array) => {
    const shuffledArray = [...array];
    const originalIndexMap = Array.from({ length: array.length }, (_, i) => i);

    for (let i = shuffledArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
      [originalIndexMap[i], originalIndexMap[j]] = [originalIndexMap[j], originalIndexMap[i]];
    }
    return { shuffledArray, originalIndexMap };
  };

  // --- NUEVO: Bloquear navegación del navegador ---
  useBeforeUnload(useCallback((event) => {
    if (!finished) { // Only prompt if the exam is not finished
      event.preventDefault();
      event.returnValue = ''; // Chrome requires returnValue to be set
    }
  }, [finished]));

  // Clave única para guardar el progreso en localStorage
  const storageKey = `exam_progress_${auth.currentUser?.uid}_${id}`;

  // 1. Cargar el examen desde Firebase
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const docRef = doc(db, "exams", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const examData = docSnap.data();
          // Shuffle options for each question
          const processedQuestions = examData.questions.map(q => {
            const { shuffledArray, originalIndexMap } = shuffleArrayWithMap(q.options);
            return {
              ...q,
              shuffledOptions: shuffledArray,
              originalIndexMap: originalIndexMap,
            };
          });
          setExam({ ...examData, questions: processedQuestions }); // Primero cargamos el examen
        } else {
          alert("Examen no encontrado");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error obteniendo examen:", error);
      } finally {
        setLoading(false);
      }
    };

    // Consumir el pase de retoma si existe
    const consumeRetakeApproval = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const approvalsRef = collection(db, "retake_approvals");
      const q = query(approvalsRef, where("studentUid", "==", user.uid), where("examId", "==", id), limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const approvalDoc = snapshot.docs[0];
        await deleteDoc(doc(db, "retake_approvals", approvalDoc.id));
        console.log("Pase de retoma consumido.");
      }
    };

    consumeRetakeApproval();
    fetchExam();
  }, [id]);

  // Efecto para restaurar el progreso DESPUÉS de cargar el examen
  useEffect(() => {
    if (exam) { // Solo se ejecuta cuando 'exam' ya tiene datos
      const savedProgressJSON = localStorage.getItem(storageKey);
      if (savedProgressJSON) {
        const savedProgress = JSON.parse(savedProgressJSON);
        setAnswers(savedProgress.answers || {});
        setCurrentQuestionIndex(savedProgress.currentQuestionIndex || 0);
        setTimeLeft(savedProgress.timeLeft || 45 * 60);
      }
      // Marcamos la carga como finalizada aquí
      setLoading(false);
    }
  }, [exam, storageKey]); // Depende de 'exam'

  // 2. Lógica del Cronómetro
  useEffect(() => {
    if (!exam || finished) return;
    
    // Si el tiempo llega a 0, finalizamos
    if (timeLeft <= 0) {
      setTimeUp(true); // Marcamos que el tiempo se agotó
      finishExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, exam, finished]);

  // --- NUEVO: Efecto para detectar cambio de pestaña ---
  useEffect(() => {
    const handleFocusLoss = () => {
      if (!finished && exam) {
        setVisibilityWarnings(prev => {
          const newCount = prev + 1;
          if (newCount > MAX_VISIBILITY_WARNINGS) { // Exam terminates on the (MAX_VISIBILITY_WARNINGS + 1)th offense
            setTerminatedForCheating(true);
            finishExam();
          } else {
            setShowWarningModal(true);
          }
          return newCount;
        });
      }
    };

    const handleFullscreenChange = () => { // This is the key condition
      const isCurrentlyFullscreen = document.fullscreenElement != null;
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && !finished && exam) {
        handleFocusLoss(); // If exits fullscreen, count as a warning.
      }
    };

    // Escuchamos tanto el cambio de pestaña como la pérdida de foco de la ventana
    document.addEventListener("visibilitychange", () => { if (document.hidden) handleFocusLoss(); });
    window.addEventListener("blur", handleFocusLoss);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", () => { if (document.hidden) handleFocusLoss(); });
      window.removeEventListener("blur", handleFocusLoss);
      document.removeEventListener('fullscreenchange', handleFullscreenChange); // Clean up event listener
    };
  }, [finished, exam, showWarningModal, showConfirmFinishModal]);

  // Efecto para guardar el progreso en localStorage
  useEffect(() => {
    // Solo guardamos si el examen ha cargado y no ha finalizado
    if (exam && !finished) {
      // Store the original index of the selected option
      const progress = {
        currentQuestionIndex,
        answers,
        timeLeft,
      };
      localStorage.setItem(storageKey, JSON.stringify(progress));
    }
  }, [currentQuestionIndex, answers, timeLeft, exam, finished, storageKey]);

  // Formato de tiempo MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 3. Manejar selección de respuesta
  const handleSelectOption = (optionIndex) => {
    const question = exam.questions[currentQuestionIndex];
    setAnswers({
      ...answers,
      [currentQuestionIndex]: question.originalIndexMap[optionIndex] // Store the ORIGINAL index
    });
  };

  // 4. Finalizar y Calificar
  const finishExam = async () => {
    // --- CORRECCIÓN ---
    // Añadimos una guarda para evitar errores si el examen aún no ha cargado.
    // Y otra para evitar que se ejecute múltiples veces.
    if (!exam || finished) {
      setShowConfirmFinishModal(false);
      console.warn("Se intentó finalizar un examen que aún no se había cargado.");
      return;
    }
    // Calculamos la nota
    let correctCount = 0;
    exam.questions.forEach((q, index) => {
      if (answers[index] === q.correctOption) { // answers[index] now holds the ORIGINAL index
        correctCount++;
      }
    });

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
      // Contar intentos previos para este examen y alumno
      const resultsQuery = query(collection(db, "results"), where("studentUid", "==", user.uid), where("examId", "==", id));
      const previousResults = await getDocs(resultsQuery);
      const attemptNumber = previousResults.size + 1;
      const finalScore = Number(((correctCount / exam.questions.length) * 100).toFixed(2));

      setScore(finalScore);
      setAttempt(attemptNumber); // Guardamos el intento en el estado
      setFinished(true);

      await addDoc(collection(db, "results"), {
        examId: id,
        examTitle: exam.title,
        
        // Datos del Alumno (DC-3)
        studentName: studentData.fullName || "Sin Nombre",
        studentFirstName: studentData.firstName || '',
        studentPaternalLastName: studentData.paternalLastName || '',
        studentMaternalLastName: studentData.maternalLastName || '',
        studentCurp: studentData.curp || "N/A",
        studentOccupation: studentData.occupation || "N/A",
        studentCompany: studentData.company || "N/A",
        studentCompanyRfc: studentData.companyRfc || "N/A", // <-- Guardamos el RFC de la empresa
        studentEmail: user ? user.email : "N/A", // <-- Guardamos el email del usuario
        studentUid: user ? user.uid : "anon",
        
        // Datos Académicos
        score: finalScore,
        totalQuestions: exam.questions.length,
        attempt: attemptNumber, // <-- Guardamos el número de intento
        
        // Guardamos las respuestas para poder regenerar la constancia
        studentAnswers: answers,
        examQuestions: exam.questions,
        correctAnswers: correctCount,
        approved: finalScore >= 80, // Puedes definir aquí la nota aprobatoria (ej. 8.0)
        
        timestamp: new Date()
      });
      
      // Limpiamos el progreso del examen del localStorage
      localStorage.removeItem(storageKey);
      
    } catch (e) {
      console.error("Error guardando resultado", e);
    } finally {
      setShowConfirmFinishModal(false); // Ocultar el modal al finalizar
    }
  };

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen().catch(err => {
      alert(`Error al entrar en pantalla completa: ${err.message}. Por favor, habilita los permisos.`);
    });
  };

  if (loading) return <div className="p-10 text-center">Cargando examen...</div>;
  if (!exam) return <div className="p-10 text-center text-red-600">No se encontró el examen.</div>;

  // --- NUEVO: Pantalla de Reglas ---
  if (!rulesAccepted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full">
          <div className="text-center">
            <img src={logo} alt="Logo" className="h-12 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Reglas de la Evaluación</h1>
            <p className="text-gray-600 mb-8">Por favor, lee atentamente las siguientes instrucciones antes de comenzar.</p>
          </div>
          <ul className="text-left space-y-5 mb-10">
            <li className="flex items-start gap-4">
              <Clock className="w-7 h-7 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Tiempo Límite</h3>
                <p className="text-gray-500">Tienes <strong>45 minutos</strong> para completar el examen. El temporizador no se detendrá una vez que comience.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <EyeOff className="w-7 h-7 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">No Salir de la Pantalla</h3>
                <p className="text-gray-500">El examen debe realizarse en pantalla completa. Si sales de la pestaña o minimizas la ventana, recibirás una advertencia. Después de <strong>{MAX_VISIBILITY_WARNINGS} advertencias</strong>, el examen finalizará automáticamente.</p>
              </div>
            </li>
          </ul>
          <button 
            onClick={() => setRulesAccepted(true)}
            className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition shadow-lg font-bold text-lg flex items-center justify-center gap-2"
          >
            He leído las reglas, comenzar <ArrowRight size={20} />
          </button>
          <button
            onClick={() => navigate('/portal')}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition font-medium"
          >
            Cancelar y volver al portal
          </button>
        </div>
      </div>
    );
  }

  // --- VISTA DE RESULTADOS (CUANDO TERMINA) ---
  if (finished) {
    // Determinamos si aprobó (ejemplo: nota mayor o igual a 80)
    const passed = score >= 80;

    // Datos para el PDF
    const handleDownloadCertificate = () => {
      // Recuperamos los datos que guardamos en la BD o los que tenemos en memoria
      // NOTA: Como acabamos de terminar, podemos usar los datos que ya tenemos
      // Pero necesitamos los datos del perfil del alumno.
      
      // TRUCO: Como el alumno está logueado, podemos sacar su nombre/curp de `auth` o pasarlos
      // Lo ideal es haber guardado esos datos en el estado al inicio.
      // Para simplificar, asumiremos que los datos se guardaron en 'results' correctamente.
      
      // Simulamos recuperar los datos del localStorage que usamos temporalmente o del usuario logueado
      // Lo mejor es pasarlos a esta función.
      
      // Para no complicar la lectura de BD de nuevo, usaremos los datos que enviamos a Firebase en finishExam
      // Necesitamos hacer un pequeño cambio arriba para tener esos datos disponibles aquí.
      
      alert("⚠️ Para descargar la constancia, ve a tu historial o pídesela al instructor (Implementación rápida).");
      // O mejor aún, hagámoslo bien:
    };
    
    // MEJOR OPCIÓN: Leer los datos del usuario logueado para generar el PDF aquí mismo
    const user = auth.currentUser; 

    const downloadPDF = async () => {
       // Necesitamos leer los datos completos del usuario (CURP, Empresa) de nuevo
       // porque 'auth.currentUser' solo tiene email y nombre básico.
       if(!user) return;
       
       try {
         const userDoc = await getDoc(doc(db, "users", user.uid));
         if(userDoc.exists()) {
            const userData = userDoc.data();
            
            // Preparamos los datos para la nueva constancia
            const incorrectAnswers = exam.questions
              .map((q, index) => ({
                question: q.text,
                yourAnswer: answers[index] !== undefined ? q.options[answers[index]] : "No respondida",
                correctAnswer: q.options[q.correctOption],
                isCorrect: answers[index] === q.correctOption
              }))
              .filter(item => !item.isCorrect);

            const studentPDFData = {
                studentName: userData.fullName,
                studentEmail: user.email, // <-- Agregamos el email del usuario logueado
                studentCurp: userData.curp,
                studentOccupation: userData.occupation,
                studentCompany: userData.company,
            };

            const examPDFData = {
                examTitle: exam.title
            };

            // Llamamos a la nueva función
            generateConstancia(studentPDFData, examPDFData, score, incorrectAnswers);
         }
       } catch(e) {
         console.error(e);
         alert("Error generando PDF");
       }
    };

    const handleGoHomeAndLogout = async () => {
      await signOut(auth);
      window.location.href = '/'; // Redirigimos a la página principal
    };

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="mb-4 flex justify-center">
            {passed ? (
                <CheckCircle className="text-green-500 w-16 h-16" />
            ) : (
                <AlertCircle className="text-red-500 w-16 h-16" />
            )}
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {terminatedForCheating ? "Examen Finalizado" : (timeUp ? "¡Tiempo Agotado!" : (passed ? "¡Felicidades!" : "Examen Finalizado"))}
          </h2>
          
          <p className="text-gray-500 mb-6">
            {terminatedForCheating
              ? "La evaluación ha finalizado porque has cambiado de pestaña demasiadas veces."
              : (timeUp
              ? "El tiempo para completar la evaluación ha terminado. Tu progreso ha sido guardado."
              : (passed 
                  ? "Has aprobado la evaluación satisfactoriamente." 
                  : "No has alcanzado el puntaje mínimo para la certificación.")
            )}
          </p>
          
          <div className={`text-5xl font-bold mb-4 ${passed ? 'text-green-600' : 'text-red-600'}`}>
            {score}/100
          </div>
          
          <p className="text-sm text-gray-400 mb-8">
            Mínimo aprobatorio: 80/100
          </p>
          
          {attempt > 0 && (
            <span className="inline-block bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full mb-6">
              Intento #{attempt}
            </span>
          )}

          {/* BOTÓN DE DESCARGA (Ahora siempre visible) */}
          <button 
            onClick={downloadPDF}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2 mb-4 font-bold"
          >
            <FileDown size={20} /> Descargar Constancia
          </button>
          
          <button 
            onClick={handleGoHomeAndLogout} 
            className="w-full bg-gray-100 text-gray-600 py-3 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // --- NUEVO: Modal de advertencia ---
  if (showWarningModal) {
    return (
      <div className="fixed inset-0 bg-red-900 bg-opacity-95 z-50 flex items-center justify-center p-4 text-white text-center">
        <div>
          <EyeOff className="mx-auto w-24 h-24 mb-6 animate-pulse" />
          <h2 className="text-4xl font-bold mb-4">¡ADVERTENCIA!</h2>
          <p className="text-xl mb-2">Has salido de la ventana del examen.</p>
          <p className="text-lg mb-8">Permanecer en esta página es obligatorio. Si sales de nuevo, el examen podría finalizarse.</p>
          <p className="font-bold text-2xl mb-10">Advertencia {visibilityWarnings} de {MAX_VISIBILITY_WARNINGS}</p>
          <button onClick={() => setShowWarningModal(false)} className="bg-white text-red-700 font-bold px-10 py-4 rounded-lg text-xl">
            Entendido, volver al examen
          </button>
        </div>
      </div>
    );
  }

  // --- NUEVO: Modal para confirmar la finalización del examen ---
  if (showConfirmFinishModal) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full text-center">
          <AlertCircle className="mx-auto w-16 h-16 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">¿Finalizar Examen?</h2>
          <p className="text-gray-600 mb-6">¿Estás seguro de que quieres terminar y enviar tus respuestas?</p>
          <div className="flex justify-center gap-4">
            <button onClick={() => setShowConfirmFinishModal(false)} className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium">
              No, continuar
            </button>
            <button 
              onClick={finishExam} 
              className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-bold"
            >
              Sí, finalizar
            </button>
          </div>
        </div>
      </div>
    );
  }
  // --- NUEVO: Pantalla para forzar Fullscreen ---
  if (!isFullscreen && !finished) {
    return (
      <div className="fixed inset-0 bg-gray-800 z-50 flex items-center justify-center p-4 text-white text-center">
        <div>
          <Maximize className="mx-auto w-24 h-24 mb-6 text-blue-400" />
          <h2 className="text-4xl font-bold mb-4">Modo Pantalla Completa Requerido</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Para asegurar la integridad de la evaluación, el examen debe realizarse en modo de pantalla completa.
          </p>
          <button onClick={requestFullscreen} className="bg-blue-600 text-white font-bold px-10 py-4 rounded-lg text-xl hover:bg-blue-700 transition">
            Comenzar en Pantalla Completa
          </button>
        </div>
      </div>
    );
  }
  // --- VISTA DEL EXAMEN (MIENTRAS RESPONDE) ---
  const question = exam.questions[currentQuestionIndex];

  return ( // Add anti-cheat event handlers to the main container
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      onContextMenu={(e) => e.preventDefault()} // Disable right-click
      onCopy={(e) => e.preventDefault()}       // Disable copy
      onCut={(e) => e.preventDefault()}        // Disable cut
      onPaste={(e) => e.preventDefault()}      // Disable paste
    >
      {/* Header con Timer */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 w-2/3">
            <img src={logo} alt="Logo" className="h-8" />
            <h1 className="font-bold text-gray-700 truncate">{exam.title}</h1>
          </div>
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
              {question.shuffledOptions.map((shuffledOpt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    answers[currentQuestionIndex] === question.originalIndexMap[idx]
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="inline-block w-6 font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {shuffledOpt}
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
                  setShowConfirmFinishModal(true); // Mostrar el modal personalizado
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