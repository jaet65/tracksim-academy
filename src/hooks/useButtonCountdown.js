import { useState, useEffect } from 'react';

export const useButtonCountdown = (initialCountdown = 5) => {
  const [countdown, setCountdown] = useState(initialCountdown);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [showCheckAnimation, setShowCheckAnimation] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(c => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isButtonDisabled) { // Solo ejecutar si el botón aún está deshabilitado
      setShowCheckAnimation(true);
      const checkTimer = setTimeout(() => {
        setShowCheckAnimation(false);
        setIsButtonDisabled(false);
      }, 700);
      return () => clearTimeout(checkTimer);
    }
  }, [countdown, isButtonDisabled]);

  return { countdown, isButtonDisabled, showCheckAnimation };
};