import { useState, useEffect, useCallback, useRef } from 'react';
import Tictoc from '../assets/sounds/tick-tock.mp3'; // <-- NUEVO: Importamos el sonido


const MAX_VISIBILITY_WARNINGS = 2;

export const useAntiCheat = (isExamActive, onCheatDetected) => {
  const [visibilityWarnings, setVisibilityWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(document.fullscreenElement != null);
  const tickTockSound = useRef(new Audio(Tictoc)); // <-- NUEVO: Ref para el audio
  
  const requestFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen().catch(err => {
      alert(`Error al entrar en pantalla completa: ${err.message}.`);
    });
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    if (!isExamActive) return;

    const handleFocusLoss = () => {
      if (showWarningModal) return;

      const newCount = visibilityWarnings + 1;
      setVisibilityWarnings(newCount);

      if (newCount > MAX_VISIBILITY_WARNINGS) {
        onCheatDetected();
      } else {
        setWarningCountdown(30);
        setShowWarningModal(true);
      }
    };

    const handleVisibilityChange = () => document.hidden && handleFocusLoss();
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement != null;
      setIsFullscreen(isCurrentlyFullscreen);
      // --- CORRECCIÓN: No contar como trampa si el examen ya terminó ---
      if (!isCurrentlyFullscreen && isExamActive) handleFocusLoss();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleFocusLoss);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleFocusLoss);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isExamActive, visibilityWarnings, showWarningModal, onCheatDetected]);

  useEffect(() => {
    if (showWarningModal) {
      const audio = tickTockSound.current;
      audio.loop = true;
      audio.playbackRate = warningCountdown <= 10 ? 1.5 : 1.0;
      audio.play().catch(e => console.error("Error al reproducir sonido:", e));

      if (warningCountdown <= 0) {
        onCheatDetected();
        return;
      }

      const timer = setInterval(() => setWarningCountdown(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else {
      const audio = tickTockSound.current;
      audio.pause();
      audio.currentTime = 0;
      audio.playbackRate = 1.0;
    }
  }, [showWarningModal, warningCountdown, onCheatDetected]);

  const stopSound = useCallback(() => {
    tickTockSound.current.pause();
    tickTockSound.current.currentTime = 0;
  }, []);

  return { showWarningModal, setShowWarningModal, warningCountdown, visibilityWarnings, isFullscreen, requestFullscreen, exitFullscreen, stopSound };
};