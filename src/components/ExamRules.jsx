import React, { useState, useEffect, useRef } from 'react';
import { Clock, EyeOff, ArrowRight, Wifi, BookX, UserX, Coffee, AlertTriangle } from 'lucide-react';
import logo from '../assets/Logo.gif';

const ExamRules = ({ examDurationInSeconds, onAccept, onCancel, onShowGuide, supplementaryGuideUrl }) => {
  const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);

  // Efecto para el autoscroll suave
  useEffect(() => {
    const scrollableElement = document.documentElement;

    // Si el contenido no necesita scroll, habilita el botón directamente
    if (scrollableElement.scrollHeight <= window.innerHeight) {
      setIsScrolledToEnd(true);
      return;
    }

    let scrollInterval;
    const startScrollTimeout = setTimeout(() => {
      scrollInterval = setInterval(() => {
        // Si el usuario ya llegó al final (manualmente o por el autoscroll), nos detenemos.
        if (window.innerHeight + window.scrollY >= scrollableElement.scrollHeight) {
          setIsScrolledToEnd(true);
          clearInterval(scrollInterval);
        } else {
          window.scrollBy(0, 1); // Ajusta el segundo valor para cambiar la velocidad. 1 es lento y suave.
        }
      }, 80); // Ajusta este valor para la fluidez. 30ms es un buen punto de partida.
    }, 2000); // Espera de 2 segundos antes de iniciar.

    const handleManualScroll = () => {
      // Se activa si el usuario llega al final manualmente
      if (window.innerHeight + window.scrollY >= scrollableElement.scrollHeight - 5) {
        setIsScrolledToEnd(true);
        clearTimeout(startScrollTimeout); // Si el usuario scrollea, cancelamos el inicio automático.
        clearInterval(scrollInterval);
      }
    };

    window.addEventListener('scroll', handleManualScroll);

    return () => {
      clearTimeout(startScrollTimeout);
      clearInterval(scrollInterval);
      window.removeEventListener('scroll', handleManualScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-4 pt-12">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full text-center">
        <div className="text-center">
          <img src={logo} alt="Logo" className="h-40 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Reglas de la Evaluación</h1>
          <p className="text-gray-600 mb-8">Por favor, lee atentamente las siguientes instrucciones antes de comenzar.</p>
        </div>
        {/* Contenedor de las reglas con scroll */}
        <div className="rounded-lg p-6 space-y-5 mb-10 text-left bg-gray-50/50">
          <ul className="space-y-5">
            <li className="flex items-start gap-4">
              <Clock className="w-7 h-7 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Tiempo Límite</h3>
                <p className="text-gray-500">Tienes <strong>{examDurationInSeconds / 60} minutos</strong> para completar el examen. El temporizador no se detendrá una vez que comience.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <Coffee className="w-7 h-7 text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Descansos</h3>
                <p className="text-gray-500">Tendrás un descanso de <strong>5 minutos</strong> cada 66 preguntas o 30 minutos para que puedas relajarte. Descuida el tiempo se pausará durante el descanso.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <Wifi className="w-7 h-7 text-teal-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Conexión Estable</h3>
                <p className="text-gray-500">Asegúrate de tener una conexión a internet estable. El sistema guardará tu progreso, pero una desconexión prolongada podría afectar tu tiempo.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <EyeOff className="w-7 h-7 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">No Salir de la Pantalla</h3>
                <p className="text-gray-500">El examen debe realizarse en pantalla completa. Si sales de la pestaña o minimizas la ventana, recibirás una advertencia. Después de <strong>2 advertencias</strong>, el examen finalizará automáticamente, <strong>incluso durante el descanso.</strong></p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <BookX className="w-7 h-7 text-orange-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Sin Materiales Externos</h3>
                <p className="text-gray-500">No está permitido el uso de libros, notas, buscadores de internet u otro material de apoyo durante la evaluación.</p>
              </div>
            </li>
            {/* --- NUEVO: Recordatorio para la guía de estudio --- */}
            {supplementaryGuideUrl && (
              <li className="flex items-start gap-4">
                <AlertTriangle className="w-7 h-7 text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Guia de estudio</h3>
                  <a href={supplementaryGuideUrl} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-800 underline text-left">
                    Te sugiero revisar la guía adjunta ahora, ya que después no estará disponible para consulta.
                  </a>
                </div>
              </li>
            )}
            <li className="flex items-start gap-4">
              <UserX className="w-7 h-7 text-purple-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Trabajo Individual</h3>
                <p className="text-gray-500">Esta es una evaluación individual. No está permitida la comunicación o ayuda de otras personas.</p>
              </div>
            </li>
          </ul>
        </div>
        <button 
          onClick={onAccept} 
          disabled={!isScrolledToEnd}
          className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-lg font-bold text-lg flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isScrolledToEnd ? (
            <>He leído las reglas, comenzar <ArrowRight size={20} /></>
          ) : (
            "Desplázate para leer todas las reglas..."
          )}
        </button>
        <button onClick={onCancel} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition font-medium">
          Cancelar y volver al portal
        </button>
      </div>
    </div>
  );
};

export default ExamRules;