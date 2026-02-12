import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useBeforeUnload } from 'react-router-dom';
import { db, auth } from '../firebase-config';
import { doc, getDoc, addDoc, collection, query, where, getDocs, limit, deleteDoc, orderBy } from 'firebase/firestore';
import { FileDown, Clock, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, EyeOff, Maximize, ArrowRight } from 'lucide-react';
import logo from '../assets/Logo.png'; // Importamos el logo
import { generateConstancia } from '../utils/generateConstancia';
import Confetti from 'react-confetti'; // <-- NUEVO: Importamos el confeti
import { signOut } from 'firebase/auth'; // Importamos signOut

// --- NUEVO: Importación de Hooks Personalizados ---
import { useExamData } from '../hooks/useExamData';
import { useExamProgress } from '../hooks/useExamProgress';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { useExamTimer } from '../hooks/useExamTimer'; // Assuming this hook will be modified to accept initial time
import { formatTime as formatTimeUtil } from '../utils/timeUtils'; // Import utility formatTime
import ExamDescription from '../components/ExamDescription'; // <-- NUEVO
import ExamRules from '../components/ExamRules';
import BreakScreen from '../components/BreakScreen'; // <-- NUEVO: Pantalla de descanso

const MAX_VISIBILITY_WARNINGS = 2; // Número de advertencias permitidas antes de finalizar el examen
// --- NUEVO: Constantes para los descansos ---
const BREAK_INTERVAL_QUESTIONS = 6; // Descanso cada 60 preguntas
const BREAK_INTERVAL_TIME_SECONDS = 20 * 60; // Descanso cada 20 minutos
const BREAK_DURATION_SECONDS = 1 * 31; // Duración del descanso de 5 minutos

const StudentExam = () => {
  const { id } = useParams(); // Obtenemos el ID del examen desde la URL
  const navigate = useNavigate();

  // --- Estados Principales del Componente ---
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [attempt, setAttempt] = useState(0); // Estado para guardar el número de intento
  const [timeUp, setTimeUp] = useState(false); // Nuevo estado para controlar si el tiempo se agotó
  const [terminatedForCheating, setTerminatedForCheating] = useState(false);
  const [showConfirmFinishModal, setShowConfirmFinishModal] = useState(false); // <-- Nuevo estado para el modal de confirmación
  const [descriptionAccepted, setDescriptionAccepted] = useState(false); // <-- NUEVO: Para la pantalla de descripción
  const [rulesAccepted, setRulesAccepted] = useState(false); // <-- Nuevo estado
  const [showErrorSummary, setShowErrorSummary] = useState(false); // <-- Nuevo estado para mostrar errores
  const [displayTimeTaken, setDisplayTimeTaken] = useState(0); // New state to store time taken for display
  // --- NUEVO: Estados para el descanso ---
  const [onBreak, setOnBreak] = useState(false);
  const [breaksTaken, setBreaksTaken] = useState({ questions: 0, time: 0 });

  // --- Uso de Hooks Personalizados ---
  const { exam, loading } = useExamData(id);
  const { currentQuestionIndex, setCurrentQuestionIndex, answers, handleSelectOption, clearProgress } = useExamProgress(exam, id, finished);
  const { showWarningModal, setShowWarningModal, warningCountdown, visibilityWarnings, isFullscreen, requestFullscreen, exitFullscreen, stopSound } = useAntiCheat(descriptionAccepted && rulesAccepted && !finished, () => finishExam(true));  // --- NUEVO: Duración dinámica del examen ---
  const examDurationInSeconds = exam?.duration ? exam.duration * 60 : 45 * 60;
  
  const onTimeUp = () => { setTimeUp(true); finishExam(); };
  // Pasamos la duración dinámica al hook del temporizador
  // --- MODIFICADO: Pausar el timer durante el descanso ---
  const { timeLeft, formatTime, initialTimeInSeconds } = useExamTimer(
    finished || loading || !rulesAccepted || !descriptionAccepted || onBreak, // Pausar si está en descanso
    onTimeUp, 
    examDurationInSeconds
  );

  // --- DEBUG: Console logs para verificar el flujo de datos (eliminados) ---
  
  
  // --- CORRECCIÓN: Mover hooks de confeti al nivel superior ---
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  // --- NUEVO: Bloquear navegación del navegador ---
  useBeforeUnload(useCallback((event) => {
    if (!finished) { // Only prompt if the exam is not finished
      event.preventDefault();
      event.returnValue = ''; // Chrome requires returnValue to be set
    }
  }, [finished]));

  // --- NUEVO: Lógica para activar los descansos ---
  useEffect(() => {
    if (loading || !exam || finished || onBreak) return;

    // Condición 1: Descanso por número de preguntas
    const questionBreakThreshold = (breaksTaken.questions + 1) * BREAK_INTERVAL_QUESTIONS;
    if (currentQuestionIndex > 0 && (currentQuestionIndex + 1) === questionBreakThreshold && currentQuestionIndex + 1 < exam.questions.length) {
      setOnBreak(true);
      setBreaksTaken(prev => ({ ...prev, questions: prev.questions + 1 }));
      console.log(`Activando descanso por preguntas. Pregunta actual: ${currentQuestionIndex + 1}`);
      console.log(`Tiempo restante: ${formatTimeUtil(timeLeft)}`);
      return; // Salimos para no evaluar la condición de tiempo
    }

    // Condición 2: Descanso por tiempo transcurrido
    const timeElapsed = initialTimeInSeconds - timeLeft;
    const timeBreakThreshold = (breaksTaken.time + 1) * BREAK_INTERVAL_TIME_SECONDS;
    // Se activa si el tiempo transcurrido supera el umbral y no estamos cerca del final del examen
    if (timeElapsed >= timeBreakThreshold && timeLeft > BREAK_DURATION_SECONDS) {
      setOnBreak(true);
      setBreaksTaken(prev => ({ ...prev, time: prev.time + 1 }));
      console.log(`Activando descanso por tiempo. Tiempo transcurrido: ${formatTimeUtil(timeElapsed)}`);
      console.log(`Tiempo restante: ${formatTimeUtil(timeLeft)}`);
    }
  }, [currentQuestionIndex, timeLeft, loading, exam, finished, onBreak, breaksTaken, initialTimeInSeconds]);

  // --- NUEVO: Función para terminar el descanso ---
  const handleBreakFinish = () => setOnBreak(false);

  // 4. Finalizar y Calificar
  const finishExam = useCallback(async (isCheating = false) => {
    if (!exam || finished) {
      stopSound();
      return;
    }

    // --- CORRECCIÓN: Salir de pantalla completa ---
    setFinished(true); // Marcar como finalizado PRIMERO
    exitFullscreen(); // Luego salir de pantalla completa

    // Calculate time taken
    const timeTakenInSeconds = initialTimeInSeconds - timeLeft; // Calculate time taken
    setDisplayTimeTaken(timeTakenInSeconds); // Store for display

    // Detenemos el sonido y cerramos el modal de advertencia ANTES de hacer el resto.
    setShowWarningModal(false);
    setShowConfirmFinishModal(false);

    if (isCheating) setTerminatedForCheating(true);
    // Calculamos la nota
    let correctCount = 0;
    exam.questions.forEach((q, index) => {
      if (answers[index] === q.correctOption) { // answers[index] now holds the ORIGINAL index
        correctCount++;
      }
    });

    // Guardar el resultado en Firebase (Opcional, para el registro)
    let studentData = {};
    
    // --- CORRECCIÓN: Obtener el usuario actual directamente aquí ---
    const currentUser = auth.currentUser;
    if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
            studentData = userDoc.data();
        }
    }

    try {
      // Contar intentos previos para este examen y alumno
      const resultsQuery = query(collection(db, "results"), where("studentUid", "==", currentUser.uid), where("examId", "==", id));
      const previousResults = await getDocs(resultsQuery);
      const attemptNumber = previousResults.size + 1;
      const finalScore = Number(((correctCount / exam.questions.length) * 100).toFixed(2));

      setScore(finalScore);
      setAttempt(attemptNumber); // Guardamos el intento en el estado

      console.log(`Guardando intento #${attemptNumber} para el examen "${exam.title}"...`);

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
        studentCompanyRfc: studentData.companyRfc || "N/A",
        studentEmail: currentUser ? currentUser.email : "N/A", // <-- Guardamos el email del usuario
        studentUid: currentUser ? currentUser.uid : "anon",
        
        // Datos Académicos
        score: finalScore,
        totalQuestions: exam.questions.length,
        attempt: attemptNumber, // <-- Guardamos el número de intento
        
        // Guardamos las respuestas para poder regenerar la constancia
        studentAnswers: answers,
        examQuestions: exam.questions,
        correctAnswers: correctCount,
        approved: finalScore >= 60, // Puedes definir aquí la nota aprobatoria (ej. 8.0)
        timeTaken: timeTakenInSeconds, // Store time taken
        
        timestamp: new Date()
      });
      
      // Limpiamos el progreso del examen del localStorage
      clearProgress();
      
    } catch (e) {
      console.error("Error guardando resultado", e);
    } finally {
    } // Add timeLeft and initialTimeInSeconds to dependencies
  }, [exam, finished, answers, id, clearProgress, stopSound, setShowWarningModal, exitFullscreen, timeLeft, initialTimeInSeconds]);


  const handleAcceptRulesAndFullscreen = () => {
    requestFullscreen();
    setRulesAccepted(true);
  };

  // --- NUEVO: Pantalla de Descripción del Examen ---
  if (!descriptionAccepted) {
    return <ExamDescription exam={exam} onAccept={() => setDescriptionAccepted(true)} onCancel={() => navigate('/portal')} />;
  }

  if (loading) return <div className="p-10 text-center">Cargando examen...</div>;
  if (!exam) return <div className="p-10 text-center text-red-600">No se encontró el examen.</div>;
  // --- CORRECCIÓN: No renderizar nada hasta que el examen esté completamente cargado ---
  // Esto asegura que `exam.duration` siempre tenga un valor antes de que se inicialice el temporizador.
  if (loading || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-500">Cargando examen...</div>
      </div>
    );
  }
  if (!exam) return <div className="p-10 text-center text-red-600">Error: No se pudo cargar el examen.</div>;

  // --- NUEVO: Pantalla de Reglas ---
  if (!rulesAccepted) {
    return (
      <ExamRules 
        examDurationInSeconds={examDurationInSeconds}
        onAccept={handleAcceptRulesAndFullscreen}
        onCancel={() => navigate('/portal')}
      />
    );
  }

  // --- VISTA DE RESULTADOS (CUANDO TERMINA) ---
  if (finished) {
    // Determinamos si aprobó (ejemplo: nota mayor o igual a 80)
    const passed = score >= 60;

    // --- NUEVO: Creamos una lista con las respuestas incorrectas ---
    const incorrectAnswers = exam.questions
      .map((q, index) => {
        const isCorrect = answers[index] === q.correctOption;
        if (isCorrect) {
          return null;
        }
        return {
          question: q.text,
          yourAnswer: answers[index] !== undefined ? q.options[answers[index]] : "No respondida",
          correctAnswer: q.options[q.correctOption],
        };
      })
      .filter(Boolean); // Filtramos los nulos (respuestas correctas)

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
                studentCompanyRfc: userData.companyRfc,
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

    const handleGoToPortal = () => {
      navigate('/portal'); // Redirigimos al portal del estudiante
    };

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        {/* --- NUEVO: Animación de confeti si el alumno aprueba --- */}
        {passed && (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
          />
        )}
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full">
          <div className="mb-4 flex justify-center text-center">
            {passed ? (
                <CheckCircle className="text-green-500 w-16 h-16" />
            ) : (
                <AlertCircle className="text-red-500 w-16 h-16" />
            )}
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            {terminatedForCheating ? "Examen Finalizado" : (timeUp ? "¡Tiempo Agotado!" : (passed ? "¡Felicidades!" : "Examen Finalizado"))}
          </h2>
          
          <p className="text-gray-500 mb-6 text-center">
            {terminatedForCheating
              ? "La evaluación ha finalizado porque has cambiado de pestaña o ventana demasiadas veces."
              : (timeUp
              ? "El tiempo para completar la evaluación ha terminado. Tu progreso ha sido guardado."
              : (passed 
                  ? "Has aprobado la evaluación satisfactoriamente." 
                  : "No has alcanzado el puntaje mínimo para la certificación.")
            )}
          </p>
          
          <div className={`text-5xl font-bold mb-4 text-center ${passed ? 'text-green-600' : 'text-red-600'}`}>
            {score}/100
          </div>
          
          <p className="text-sm text-gray-400 mb-8 text-center">
            Mínimo aprobatorio: 60/100
          </p>
          
          {displayTimeTaken > 0 && (
            <div className="text-center mb-6">
              <span className="inline-block bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">
                Tiempo ocupado: {formatTime(displayTimeTaken)}
              </span>
            </div>
          )}


          {attempt > 0 && (
            <div className="text-center">
              <span className="inline-block bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full mb-6">
              Intento #{attempt}
              </span>
            </div>
          )}

          {/* --- NUEVO: Botón para mostrar resumen y el resumen condicional --- */}
          {incorrectAnswers.length > 0 && !showErrorSummary && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setShowErrorSummary(true)}
                className="text-blue-600 hover:text-blue-800 font-medium underline"
              >
                Ver resumen de errores
              </button>
            </div>
          )}

          {showErrorSummary && incorrectAnswers.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-xl font-bold text-gray-700 mb-4 text-left">Resumen de Errores</h3>
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                {incorrectAnswers.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg text-left text-sm">
                    <p className="font-bold text-gray-800">{item.question}</p>
                    <p className="mt-2 text-red-600"><span className="font-semibold">Tu respuesta:</span> {item.yourAnswer}</p>
                    <p className="text-green-600"><span className="font-semibold">Respuesta correcta:</span> {item.correctAnswer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
            {/* BOTÓN DE DESCARGA */}
            <button 
              onClick={downloadPDF}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2 font-bold"
            >
              <FileDown size={20} /> Descargar Constancia
            </button>
            
            <button 
              onClick={handleGoToPortal} 
              className="w-full bg-gray-100 text-gray-600 py-3 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Volver al Inicio
            </button>
          </div>
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
          <div className="mb-10 text-white">
            <p className="font-bold text-2xl">Advertencia {visibilityWarnings} de {MAX_VISIBILITY_WARNINGS}</p>
            <div className="mt-4 bg-red bg-opacity-10 p-4 rounded-lg animate-pulse">
              <p className="text-yellow-300 text-lg">Volver al examen o se cerrará en:</p>
              <p className="font-mono text-6xl font-bold text-white">{warningCountdown}</p>
            </div>
          </div>
          <button onClick={() => setShowWarningModal(false)} className="bg-white text-red-700 font-bold px-10 py-4 rounded-lg text-xl">
            Entendido, volver al examen
          </button>
        </div>
      </div>
    );
  }

  // --- NUEVO: Pantalla de Descanso ---
  if (onBreak) {
    return (
      <BreakScreen 
        durationInSeconds={BREAK_DURATION_SECONDS}
        onBreakFinish={handleBreakFinish}
      />
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
              onClick={() => finishExam()} 
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
              {question.type === 'TF' ? (
                <div className="flex gap-4">
                  {question.shuffledOptions.map((shuffledOpt, idx) => (
                    <button
                      key={`${question.id}-${idx}`}
                      onClick={() => handleSelectOption(idx)}
                      className={`flex-1 text-center p-4 rounded-lg border-2 transition-all font-bold text-lg ${
                        answers[currentQuestionIndex] === question.originalIndexMap[idx]
                          ? (shuffledOpt === 'Verdadero' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700')
                          : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >{shuffledOpt}</button>
                  ))}
                </div>
              ) : (
                question.shuffledOptions.map((shuffledOpt, idx) => (
                  <button
                    key={`${question.id}-${idx}`}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      answers[currentQuestionIndex] === question.originalIndexMap[idx]
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  ><span className="inline-block w-6 font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>{shuffledOpt}</button>
                ))
              )}
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