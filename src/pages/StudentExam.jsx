import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useBeforeUnload } from 'react-router-dom';
import { db, auth } from '../firebase-config';
import { doc, getDoc, addDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Clock, AlertCircle, ChevronRight, ChevronLeft, EyeOff, Maximize, FileDown, CheckCircle } from 'lucide-react';
import logo from '../assets/Logo.png';
import { generateConstancia } from '../utils/generateConstancia';
import Confetti from 'react-confetti';
import NoSleep from 'nosleep.js'; // Importación de la librería

// Hooks
import { useExamData } from '../hooks/useExamData';
import { useExamProgress } from '../hooks/useExamProgress';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { useExamTimer } from '../hooks/useExamTimer';
import { formatTime as formatTimeUtil } from '../utils/timeUtils';

// Componentes
import ExamDescription from '../components/ExamDescription';
import ExamRules from '../components/ExamRules';
import StudyGuideModal from '../components/StudyGuideModal';
import { generateStudyGuide } from '../utils/studyGuideGenerator';
import BreakScreen from '../components/BreakScreen';

// Assets
import breakVideo from '../assets/videos/Break_Male.mp4';
import timeWarningSound from '../assets/sounds/time-warning.mp3';

const MAX_VISIBILITY_WARNINGS = 2;
const BREAK_INTERVAL_QUESTIONS = 66;
const BREAK_INTERVAL_TIME_SECONDS = 30 * 60; 
const BREAK_DURATION_SECONDS = 5 * 60; 

const StudentExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Estados
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [terminatedForCheating, setTerminatedForCheating] = useState(false);
  const [showConfirmFinishModal, setShowConfirmFinishModal] = useState(false);
  const [descriptionAccepted, setDescriptionAccepted] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const [displayTimeTaken, setDisplayTimeTaken] = useState(0);
  
  // Estados de Descanso
  const [onBreak, setOnBreak] = useState(false);
  const [breaksTaken, setBreaksTaken] = useState({ questions: 0, time: 0 });
  const [breakTimeLeft, setBreakTimeLeft] = useState(BREAK_DURATION_SECONDS);
  
  // Estados Auxiliares
  const [showStudyGuide, setShowStudyGuide] = useState(false);
  const [studyGuideContent, setStudyGuideContent] = useState(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showTimeUpNotification, setShowTimeUpNotification] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Refs
  const noSleepRef = useRef(null);
  const timeWarningAudioRef = useRef(new Audio(timeWarningSound));
  const onTimeUpCallbackRef = useRef(() => {});

  // Hooks Personalizados
  const { exam, loading } = useExamData(id);
  const { currentQuestionIndex, setCurrentQuestionIndex, answers, handleSelectOption, clearProgress } = useExamProgress(exam, id, finished);
  
  const examDurationInSeconds = exam?.duration ? exam.duration * 60 : 45 * 60;

  const { timeLeft, formatTime, initialTimeInSeconds } = useExamTimer(
    finished || loading || !rulesAccepted || !descriptionAccepted || onBreak,
    () => onTimeUpCallbackRef.current(), 
    examDurationInSeconds
  );

  // Inicializar NoSleep una sola vez
  useEffect(() => {
    noSleepRef.current = new NoSleep();
    return () => {
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };
  }, []);

  // Manejo del tamaño de ventana para confeti
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { showWarningModal, setShowWarningModal, warningCountdown, visibilityWarnings, isFullscreen, requestFullscreen } = useAntiCheat(descriptionAccepted && rulesAccepted && !finished, () => finishExam(true));

  // Finalizar Examen
  const finishExam = useCallback(async (isCheating = false) => {
    if (!exam || finished) return;

    // Desactivar NoSleep al terminar
    if (noSleepRef.current) {
      noSleepRef.current.disable();
    }

    setFinished(true);
    const timeTakenInSeconds = (exam?.duration * 60) - timeLeft;
    setDisplayTimeTaken(timeTakenInSeconds);
    setShowWarningModal(false);
    setShowConfirmFinishModal(false);

    if (isCheating) setTerminatedForCheating(true);

    let correctCount = 0;
    exam.questions.forEach((q, index) => {
      if (answers[index] === q.correctOption) {
        correctCount++;
      }
    });

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const studentData = userDoc.exists() ? userDoc.data() : {};

    try {
      const resultsQuery = query(collection(db, "results"), where("studentUid", "==", currentUser.uid), where("examId", "==", id));
      const previousResults = await getDocs(resultsQuery);
      const attemptNumber = previousResults.size + 1;
      const finalScore = Number(((correctCount / exam.questions.length) * 100).toFixed(2));

      setScore(finalScore);

      await addDoc(collection(db, "results"), {
        examId: id, examTitle: exam.title,
        studentName: studentData.fullName || "Sin Nombre", studentFirstName: studentData.firstName || '',
        studentPaternalLastName: studentData.paternalLastName || '', studentMaternalLastName: studentData.maternalLastName || '',
        studentCurp: studentData.curp || "N/A", studentOccupation: studentData.occupation || "N/A",
        studentCompany: studentData.company || "N/A", studentCompanyRfc: studentData.companyRfc || "N/A",
        studentEmail: currentUser.email, studentUid: currentUser.uid,
        score: finalScore, totalQuestions: exam.questions.length, attempt: attemptNumber,
        studentAnswers: answers, examQuestions: exam.questions, correctAnswers: correctCount,
        approved: finalScore >= 60, timeTaken: timeTakenInSeconds,
        timestamp: new Date()
      });

      clearProgress();
    } catch (e) {
      console.error("Error guardando resultado", e);
    }
  }, [exam, finished, answers, id, clearProgress, timeLeft, setShowWarningModal]);

  // Callback de tiempo agotado
  onTimeUpCallbackRef.current = () => {
    setTimeUp(true);
    setShowTimeUpNotification(true);
    const audio = new Audio(timeWarningSound); // Nueva instancia para evitar conflictos
    audio.play().catch(e => console.error("Error audio:", e));
    setTimeout(() => setShowTimeUpNotification(false), 5000);
    finishExam();
  };

  // Bloquear navegación
  useBeforeUnload(useCallback((event) => {
    if (!finished) {
      event.preventDefault();
      event.returnValue = '';
    }
  }, [finished]));

  // Advertencia de 1 minuto
  useEffect(() => {
    if (timeLeft === 60 && !finished && !onBreak) {
      setShowTimeWarning(true);
      timeWarningAudioRef.current.play().catch(e => console.error("Error audio:", e));
      const timer = setTimeout(() => setShowTimeWarning(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, finished, onBreak]);

  // Lógica de Activación de Descansos
  useEffect(() => {
    // Si no se han aceptado reglas, no procesar lógica de descanso (Evita el bug de inicio)
    if (loading || !exam || finished || onBreak || !rulesAccepted) return;

    // Condición 1: Preguntas
    const questionBreakThreshold = (breaksTaken.questions + 1) * BREAK_INTERVAL_QUESTIONS;
    if (currentQuestionIndex > 0 && (currentQuestionIndex + 1) >= questionBreakThreshold && currentQuestionIndex + 1 < exam.questions.length) {
      setOnBreak(true);
      setBreakTimeLeft(BREAK_DURATION_SECONDS);
      setBreaksTaken(prev => ({ ...prev, questions: prev.questions + 1 }));
      return;
    }

    // Condición 2: Tiempo
    const timeElapsed = initialTimeInSeconds - timeLeft;
    const timeBreakThreshold = (breaksTaken.time + 1) * BREAK_INTERVAL_TIME_SECONDS;
    
    // Solo activar si ha pasado el tiempo Y queda suficiente tiempo de examen para justificar un descanso
    if (timeElapsed >= timeBreakThreshold && timeLeft > BREAK_DURATION_SECONDS + 60) {
      setOnBreak(true);
      setBreakTimeLeft(BREAK_DURATION_SECONDS);
      setBreaksTaken(prev => ({ ...prev, time: prev.time + 1 }));
    }
  }, [currentQuestionIndex, timeLeft, loading, exam, finished, onBreak, breaksTaken, initialTimeInSeconds, rulesAccepted]);

  // Temporizador del Descanso
  useEffect(() => {
    if (!onBreak || showWarningModal) return;

    if (breakTimeLeft <= 0) {
      setOnBreak(false);
      return;
    }

    const timer = setInterval(() => {
      setBreakTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [onBreak, breakTimeLeft, showWarningModal]);

  const handleBreakFinish = () => setOnBreak(false);

  const handleShowGuide = () => {
    if (!exam) return;
    if (exam.studyGuide) {
      setStudyGuideContent({ 
        ...exam.studyGuide, 
        supplementaryGuideUrl: exam.supplementaryGuideUrl,
        syllabus: exam.syllabus // <-- AÑADIR EL PROGRAMA SINTÉTICO
      });
    } else if (!studyGuideContent) {
      // Si no hay guía de estudio, generamos una y también pasamos el syllabus si existe
      const generatedGuide = generateStudyGuide(exam.questions, exam.title || 'Examen');
      setStudyGuideContent({
        ...generatedGuide,
        syllabus: exam.syllabus
      });
    }
    setShowStudyGuide(true);
  };

  const handleAcceptRulesAndFullscreen = () => {
    requestFullscreen();
    // Activar NoSleep aquí (requiere interacción usuario)
    if (noSleepRef.current) {
      noSleepRef.current.enable().then(() => {
        console.log("NoSleep habilitado");
      }).catch(err => console.warn("NoSleep error:", err));
    }
    setRulesAccepted(true);
  };

  // --- RENDERIZADO ---

  if (!descriptionAccepted) {
    return (
      <>
        <ExamDescription exam={exam} onAccept={() => setDescriptionAccepted(true)} onCancel={() => navigate('/portal')} onShowGuide={handleShowGuide} />
        {showStudyGuide && <StudyGuideModal guide={studyGuideContent} onClose={() => setShowStudyGuide(false)} />}
      </>
    );
  }

  if (loading || !exam) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500">Cargando examen...</div>;
  }

  if (!rulesAccepted) {
    return (
      <>
        <ExamRules 
          examDurationInSeconds={examDurationInSeconds}
          onAccept={handleAcceptRulesAndFullscreen}
          onCancel={() => navigate('/portal')}
          onShowGuide={handleShowGuide}
          supplementaryGuideUrl={exam?.supplementaryGuideUrl}
        />
        {showStudyGuide && <StudyGuideModal guide={studyGuideContent} onClose={() => setShowStudyGuide(false)} />}
      </>
    );
  }

  // Vista de Resultados
  if (finished) {
    const passed = score >= 60;
    const incorrectAnswers = exam.questions
      .map((q, index) => {
        const isCorrect = answers[index] === q.correctOption;
        if (isCorrect) return null;
        return {
          question: q.text,
          yourAnswer: answers[index] !== undefined ? q.options[answers[index]] : "No respondida",
          correctAnswer: q.options[q.correctOption],
        };
      })
      .filter(Boolean);

    const user = auth.currentUser; 
    const downloadPDF = async () => {
      const resultsQuery = query(collection(db, "results"), where("studentUid", "==", user.uid), where("examId", "==", id), orderBy("timestamp", "desc"), limit(1));
      const resultsSnapshot = await getDocs(resultsQuery);
      const latestResult = resultsSnapshot.docs[0];
      const resultId = latestResult?.id;

       if(!user) return;
       try {
         const userDoc = await getDoc(doc(db, "users", user.uid));
         if(userDoc.exists()) {
            const userData = userDoc.data();
            const studentPDFData = {
                studentName: userData.fullName,
                studentEmail: user.email,
                studentCurp: userData.curp,
                studentOccupation: userData.occupation,
                studentCompany: userData.company,
                studentCompanyRfc: userData.companyRfc,
            };
            const examPDFData = { examTitle: exam.title };
            generateConstancia(studentPDFData, examPDFData, score, undefined, incorrectAnswers, resultId);
         }
       } catch(e) {
         console.error(e);
         alert("Error generando PDF");
       }
    };

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        {passed && <Confetti width={windowSize.width} height={windowSize.height} />}
        {showTimeUpNotification && (
          <div className="fixed bottom-0 left-0 right-0 bg-red-500 text-white p-3 text-center font-bold z-50 shadow-lg animate-bounce">
            <div className="flex items-center justify-center gap-2"><Clock /> ¡El tiempo se ha agotado!</div>
          </div>
        )}

        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full">
          <div className="mb-4 flex justify-center text-center">
            {passed ? <CheckCircle className="text-green-500 w-16 h-16" /> : <AlertCircle className="text-red-500 w-16 h-16" />}
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            {terminatedForCheating ? "Examen Finalizado" : (timeUp ? "¡Tiempo Agotado!" : (passed ? "¡Felicidades!" : "Examen Finalizado"))}
          </h2>
          <p className="text-gray-500 mb-6 text-center">
            {terminatedForCheating ? "La evaluación ha finalizado por medidas de seguridad." : (timeUp ? "El tiempo ha terminado." : (passed ? "Has aprobado la evaluación." : "No has alcanzado el puntaje mínimo."))}
          </p>
          <div className={`text-5xl font-bold mb-4 text-center ${passed ? 'text-green-600' : 'text-red-600'}`}>{score}/100</div>
          
          {displayTimeTaken > 0 && (
            <div className="text-center mb-6">
              <span className="inline-block bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">
                Tiempo: {formatTimeUtil(displayTimeTaken)}
              </span>
            </div>
          )}

          {incorrectAnswers.length > 0 && !showErrorSummary && (
            <div className="mt-8 text-center">
              <button onClick={() => setShowErrorSummary(true)} className="text-blue-600 hover:underline font-medium">Ver resumen de errores</button>
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
                    <p className="text-green-600"><span className="font-semibold">Correcta:</span> {item.correctAnswer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
            <button onClick={downloadPDF} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-bold flex justify-center gap-2">
              <FileDown size={20} /> Descargar Constancia
            </button>
            <button onClick={() => navigate('/portal')} className="w-full bg-gray-100 text-gray-600 py-3 rounded-lg hover:bg-gray-200 font-medium">
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  if (onBreak) {
    return (
      <BreakScreen 
        breakTimeLeft={breakTimeLeft}
        durationInSeconds={BREAK_DURATION_SECONDS}
        isFirstBreak={breaksTaken.questions + breaksTaken.time === 1}
        videoSrc={breakVideo}
        examTimeLeft={timeLeft}
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={exam.questions.length}
        onBreakFinish={handleBreakFinish} // Importante pasar esta prop
      />
    );
  }

  if (showConfirmFinishModal) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full text-center">
          <AlertCircle className="mx-auto w-16 h-16 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">¿Finalizar Examen?</h2>
          <div className="flex justify-center gap-4 mt-6">
            <button onClick={() => setShowConfirmFinishModal(false)} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium">Cancelar</button>
            <button onClick={() => finishExam()} className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-bold">Finalizar</button>
          </div>
        </div>
      </div>
    );
  }

  if (!isFullscreen && !finished) {
    return (
      <div className="fixed inset-0 bg-gray-800 z-50 flex items-center justify-center p-4 text-white text-center">
        <div>
          <Maximize className="mx-auto w-24 h-24 mb-6 text-blue-400" />
          <h2 className="text-4xl font-bold mb-4">Modo Pantalla Completa</h2>
          <button onClick={requestFullscreen} className="bg-blue-600 text-white font-bold px-10 py-4 rounded-lg text-xl hover:bg-blue-700 transition">Activar Pantalla Completa</button>
        </div>
      </div>
    );
  }

  const question = exam.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" onContextMenu={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} onPaste={(e) => e.preventDefault()}>
      {showTimeWarning && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-400 text-yellow-900 p-3 text-center font-bold z-50 shadow-lg animate-pulse">
          <div className="flex items-center justify-center gap-2"><AlertCircle /> ¡Queda 1 minuto!</div>
        </div>
      )}

      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img src={logo} alt="Logo" className="h-8 shrink-0" />
            <h1 className="font-bold text-gray-700 truncate text-sm sm:text-base">{exam.title}</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className={`flex items-center gap-1.5 font-mono text-lg sm:text-xl font-bold ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              {formatTime(timeLeft)}
            </div>
            <button onClick={() => setShowConfirmFinishModal(true)} className="bg-red-600 text-white hover:bg-red-700 font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-colors shadow-md whitespace-nowrap">Finalizar</button>
          </div>
        </div>
        <div className="w-full bg-gray-200 h-2 mt-4 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / exam.questions.length) * 100}%` }} />
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-10 min-h-100 flex flex-col justify-between">
          <div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">Pregunta {currentQuestionIndex + 1} de {exam.questions.length}</span>
            <h2 className="text-xl sm:text-2xl font-medium text-gray-800 mt-4 mb-8">{question.text}</h2>
            <div className="space-y-3">
              {question.type === 'TF' ? (
                <div className="flex gap-4">
                  {question.shuffledOptions.map((shuffledOpt, idx) => (
                    <button key={`${question.id}-${idx}`} onClick={() => handleSelectOption(idx)} className={`flex-1 text-center p-4 rounded-lg border-2 transition-all font-bold text-lg ${answers[currentQuestionIndex] === question.originalIndexMap[idx] ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}>{shuffledOpt}</button>
                  ))}
                </div>
              ) : (
                question.shuffledOptions.map((shuffledOpt, idx) => (
                  <button key={`${question.id}-${idx}`} onClick={() => handleSelectOption(idx)} className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answers[currentQuestionIndex] === question.originalIndexMap[idx] ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}><span className="inline-block w-6 font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>{shuffledOpt}</button>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
            <button
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="bg-red-600 text-white hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-10 px-4 py-2 rounded-lg flex items-center"
            >
              <ChevronLeft size={20} className="mr-1" /> Anterior
            </button>
            {currentQuestionIndex === exam.questions.length - 1 ? (
              <button onClick={() => setShowConfirmFinishModal(true)} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 shadow-md transition-colors font-bold">Finalizar Examen</button>
            ) : (
              <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className={`${answers[currentQuestionIndex] !== undefined ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600'} text-white px-6 py-2 rounded-lg shadow-md transition-colors flex items-center`}>
                {answers[currentQuestionIndex] !== undefined ? "Siguiente" : "Omitir"} <ChevronRight size={20} className="ml-1" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentExam;