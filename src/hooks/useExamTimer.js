import { useState, useEffect, useRef } from 'react';

/**
 * Hook para gestionar el temporizador de un examen.
 * @param {boolean} isPaused - Si es true, el temporizador se detiene.
 * @param {function} onTimeUp - Callback que se ejecuta cuando el tiempo llega a cero.
 * @param {number} durationInSeconds - La duración inicial del temporizador en segundos.
 */
export const useExamTimer = (isPaused, onTimeUp, durationInSeconds) => {
  const [timeLeft, setTimeLeft] = useState(durationInSeconds);
  const timerRef = useRef(null);

  // --- CORRECCIÓN CLAVE ---
  // Este useEffect sincroniza el estado `timeLeft` cuando la duración que viene de las props cambia.
  // Esto es crucial porque el componente se renderiza primero con una duración por defecto
  // y luego se actualiza con la duración real del examen desde la base de datos.
  useEffect(() => {
    console.log(`[useExamTimer] Duration changed to: ${durationInSeconds}. Resetting timeLeft.`);
    setTimeLeft(durationInSeconds);
  }, [durationInSeconds]);

  useEffect(() => {
    if (isPaused) {
      clearInterval(timerRef.current);
      return;
    }

    // Iniciar el intervalo
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onTimeUp(); // Llamar al callback cuando el tiempo se agota
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Limpiar el intervalo cuando el componente se desmonte o las dependencias cambien
    return () => clearInterval(timerRef.current);
  }, [isPaused, onTimeUp]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  return { timeLeft, formatTime, initialTimeInSeconds: durationInSeconds };
};