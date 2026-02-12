import React, { useState, useEffect, useRef } from 'react';
import { formatTime } from '../utils/timeUtils';
import logo from '../assets/Logo W.png'; // <-- NUEVO: Importamos el logo
import alarmSound from '../assets/sounds/alarm.mp3'; // <-- NUEVO: Importamos el sonido

const BreakScreen = ({ durationInSeconds, onBreakFinish }) => {
  const [breakTimeLeft, setBreakTimeLeft] = useState(durationInSeconds);
  const audioRef = useRef(new Audio(alarmSound)); // <-- NUEVO: Ref para el audio
  
  // Lógica del temporizador
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

  // --- CORREGIDO: Lógica para reproducir y detener el sonido de alarma ---
  useEffect(() => {
    const audio = audioRef.current;

    // Este efecto SOLO se encarga de REPRODUCIR el sonido
    if (breakTimeLeft === 30) {
      audio.loop = true;
      audio.play().catch(error => console.error("Error al reproducir el sonido:", error));
    }

    // Este efecto SOLO se encarga de DETENER el sonido cuando el tiempo llega a 0
    if (breakTimeLeft <= 0) {
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
    }
  }, [breakTimeLeft]);

  // --- NUEVO: Lógica para el círculo de progreso ---
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (breakTimeLeft / durationInSeconds);
  const strokeDashoffset = circumference * (1 - progress);

  // --- NUEVO: Lógica para cambiar el color del círculo ---
  const circleColor = breakTimeLeft <= 30 ? '#ef4444' : '#4ade80'; // Cambia a rojo (red-500) cuando quedan 30s o menos

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 z-50 flex items-center justify-center p-4 text-white text-center transition-opacity duration-300">
      <div className="flex flex-col items-center justify-center">
        <img src={logo} alt="TrackSIM Academy" className="h-60 mb-6" />
        <h2 className="text-4xl font-bold mb-2 tracking-tight">Tiempo de Descanso</h2>
        <p className="text-xl text-gray-400 mb-5">
          Aprovecha para estirarte. El examen se reanudará automáticamente. Una alarma sonará cuando queden 30 segundos de descanso.
        </p>
        <p className="text-2xl text-red-400 mb-5">
          Recuerda que aun durante el descaso, no puedes abandonar la pantalla ni minimizar la ventana.
        </p>
         <p className="text-xl text-gray-400 mb-5">
          ¡Nos vemos en breve!
        </p>

        {/* --- NUEVO: Temporizador con Círculo de Progreso --- */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="absolute w-full h-full" viewBox="0 0 160 160">
            {/* Círculo de fondo */}
            <circle
              cx="80" cy="80" r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="10"
            />
            {/* Círculo de progreso */}
            <circle
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={circleColor} // <-- CORREGIDO: Usamos el color dinámico
              strokeWidth="10"
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000" // Transición para el color y el offset
            />
          </svg>
          <span className="font-mono text-5xl font-bold text-white">{formatTime(breakTimeLeft)}</span>
        </div>
      </div>
    </div>
  );
};

export default BreakScreen;
