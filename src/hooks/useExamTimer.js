import { useState, useEffect } from 'react';

const INITIAL_TIME = 45 * 60;

export const useExamTimer = (isFinished, onTimeUp) => {
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);

  useEffect(() => {
    if (isFinished) return;

    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isFinished, onTimeUp]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return { timeLeft, formatTime };
};