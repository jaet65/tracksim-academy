import React, { useState, useEffect } from 'react';
import { Coffee, Clock } from 'lucide-react';
import { formatTime } from '../utils/timeUtils';

const BreakScreen = ({ durationInSeconds, onBreakFinish }) => {
  const [breakTimeLeft, setBreakTimeLeft] = useState(durationInSeconds);

  useEffect(() => {
    if (breakTimeLeft <= 0) {
      onBreakFinish();
      return;
    }

    const timer = setInterval(() => {
      setBreakTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [breakTimeLeft, onBreakFinish]);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex items-center justify-center p-4 text-white text-center">
      <div>
        <Coffee className="mx-auto w-24 h-24 mb-6 text-green-400 animate-pulse" />
        <h2 className="text-4xl font-bold mb-4">¡Tiempo de Descanso!</h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Tómate un respiro. El examen se reanudará automáticamente cuando el tiempo termine.
        </p>
        <div className="mt-4 bg-gray-800 p-6 rounded-lg inline-block">
          <p className="text-green-300 text-lg">Tiempo de descanso restante:</p>
          <p className="font-mono text-6xl font-bold text-white flex items-center justify-center gap-4">
            <Clock size={48} />
            {formatTime(breakTimeLeft)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BreakScreen;
