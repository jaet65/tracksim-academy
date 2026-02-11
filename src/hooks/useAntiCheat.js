import { useState, useEffect, useCallback } from 'react';

const MAX_VISIBILITY_WARNINGS = 2;

export const useAntiCheat = (isExamActive, onCheatDetected) => {
  const [visibilityWarnings, setVisibilityWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(document.fullscreenElement != null);
  const [tickTockSound] = useState(() => {
    const audio = new Audio('/sounds/tick-tock.mp3');
    audio.volume = 1.0;
    return audio;
  });

  const requestFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen().catch(err => {
      alert(`Error al entrar en pantalla completa: ${err.message}.`);
    });
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
      if (!isCurrentlyFullscreen) handleFocusLoss();
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
      tickTockSound.loop = true;
      tickTockSound.playbackRate = warningCountdown <= 10 ? 1.5 : 1.0;
      tickTockSound.play().catch(e => console.error("Error al reproducir sonido:", e));

      if (warningCountdown <= 0) {
        onCheatDetected();
        return;
      }

      const timer = setInterval(() => setWarningCountdown(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else {
      tickTockSound.pause();
      tickTockSound.currentTime = 0;
      tickTockSound.playbackRate = 1.0;
    }
  }, [showWarningModal, warningCountdown, onCheatDetected, tickTockSound]);

  const stopSound = useCallback(() => {
    tickTockSound.pause();
    tickTockSound.currentTime = 0;
  }, [tickTockSound]);

  return { showWarningModal, setShowWarningModal, warningCountdown, visibilityWarnings, isFullscreen, requestFullscreen, stopSound };
};