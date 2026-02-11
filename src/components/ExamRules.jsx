import React from 'react';
import { Clock, EyeOff, ArrowRight } from 'lucide-react';
import logo from '../assets/Logo.png';

const ExamRules = ({ examDurationInSeconds, onAccept, onCancel }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full">
        <div className="text-center">
          <img src={logo} alt="Logo" className="h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Reglas de la Evaluación</h1>
          <p className="text-gray-600 mb-8">Por favor, lee atentamente las siguientes instrucciones antes de comenzar.</p>
        </div>
        <ul className="text-left space-y-5 mb-10">
          <li className="flex items-start gap-4">
            <Clock className="w-7 h-7 text-blue-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg">Tiempo Límite</h3>
              <p className="text-gray-500">Tienes <strong>{examDurationInSeconds / 60} minutos</strong> para completar el examen. El temporizador no se detendrá una vez que comience.</p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <EyeOff className="w-7 h-7 text-red-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg">No Salir de la Pantalla</h3>
              <p className="text-gray-500">El examen debe realizarse en pantalla completa. Si sales de la pestaña o minimizas la ventana, recibirás una advertencia. Después de <strong>2 advertencias</strong>, el examen finalizará automáticamente.</p>
            </div>
          </li>
        </ul>
        <button onClick={onAccept} className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition shadow-lg font-bold text-lg flex items-center justify-center gap-2">
          He leído las reglas, comenzar <ArrowRight size={20} />
        </button>
        <button onClick={onCancel} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition font-medium">
          Cancelar y volver al portal
        </button>
      </div>
    </div>
  );
};

export default ExamRules;