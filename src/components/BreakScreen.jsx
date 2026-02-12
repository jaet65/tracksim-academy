import React, { useState, useEffect, useRef } from 'react';
import { formatTime } from '../utils/timeUtils';
import logo from '../assets/Logo W.png'; // <-- NUEVO: Importamos el logo
import alarmSound from '../assets/sounds/alarm.mp3'; // <-- NUEVO: Importamos el sonido
import { SkipForward } from 'lucide-react'; // <-- NUEVO: Icono para el botón

const BreakScreen = ({ timeLeft, durationInSeconds, onBreakFinish }) => {
  const audioRef = useRef(new Audio(alarmSound)); // <-- NUEVO: Ref para el audio
  
  // --- CORRECCIÓN DEFINITIVA: Lógica de sonido separada ---

  // Efecto 1: Se encarga de INICIAR el sonido y ponerlo en bucle.
  // Se ejecuta solo una vez cuando el tiempo llega a 30.
  useEffect(() => {
    const audio = audioRef.current;
    if (timeLeft === 30) {
      audio.loop = true;
      audio.play().catch(error => console.error("Error al reproducir el sonido:", error));
    }
  }, [timeLeft]);

  // Efecto 2: Se encarga de DETENER el sonido cuando el tiempo se acaba.
  // Se ejecuta solo una vez cuando el tiempo llega a 1.
  useEffect(() => {
    const audio = audioRef.current;
    if (timeLeft <= 1) {
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
    }
  }, [timeLeft]);

  // Efecto 3: Se encarga de la LIMPIEZA.
  // Se ejecuta solo cuando el componente se desmonta para asegurar que el sonido se detenga.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
    };
  }, []); // El array vacío asegura que solo se ejecute al montar/desmontar.

  // --- NUEVO: Lógica para el círculo de progreso ---
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / durationInSeconds);
  const strokeDashoffset = circumference * (1 - progress);

  // --- NUEVO: Lógica para cambiar el color del círculo ---
  const circleColor = timeLeft <= 30 ? '#ef4444' : '#4ade80'; // Cambia a rojo (red-500) cuando quedan 30s o menos

  // --- NUEVO: Lógica para el parpadeo de la pantalla ---
  const isAlarmActive = timeLeft <= 30 && timeLeft > 1;

  return (
    <div className={`fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 z-50 flex items-center justify-center p-4 text-white text-center transition-all duration-500 ${isAlarmActive ? 'shadow-[inset_0_0_0_8px_rgba(239,68,68,0.5)] animate-pulse' : 'shadow-none'}`}>
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
          <span className="font-mono text-5xl font-bold text-white">{formatTime(timeLeft)}</span>
        </div>

        {/* --- NUEVO: Botón para omitir el descanso --- */}
        <button
          onClick={onBreakFinish}
          className="mt-10 flex items-center gap-2 text-gray-400 hover:text-white font-medium px-4 py-2 rounded-lg transition-colors hover:bg-white/10"
        >
          <SkipForward size={18} /> Omitir Descanso
        </button>
      </div>
    </div>
  );
};

export default BreakScreen;
