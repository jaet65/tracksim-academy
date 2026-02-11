import { useState, useEffect, useRef } from 'react';
import { formatTime as formatTimeUtil } from '../utils/timeUtils'; // Import utility formatTime

export const useExamTimer = (finished, onTimeUp, initialTimeInSeconds = 2700) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeInSeconds);
  const timerRef = useRef(null);

  useEffect(() => {
    if (finished) {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          onTimeUp();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [finished, onTimeUp, initialTimeInSeconds]);

  return { timeLeft, formatTime: formatTimeUtil, initialTimeInSeconds }; // Use utility formatTime
};