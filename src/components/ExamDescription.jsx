import React, { useState, useEffect } from 'react';
import { BookText, ArrowRight, Clock } from 'lucide-react';

// La lógica para generar el resumen se encapsula aquí.
const generateExamSummary = (questions) => {
  if (!questions || questions.length === 0) {
    return ["Análisis General", "Este examen evaluará tus conocimientos sobre el tema asignado. Prepárate para demostrar tu comprensión en diversas áreas."];
  }

  const stopWords = new Set([
    'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'como', 'con', 'contra', 'cual', 'cuando',
    'de', 'del', 'desde', 'donde', 'durante', 'e', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre',
    'era', 'es', 'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estas', 'este', 'esto', 'estos',
    'la', 'las', 'le', 'les', 'lo', 'los', 'mi', 'mis', 'mucho', 'muchos', 'muy', 'más', 'me', 'mi',
    'no', 'nos', 'nuestra', 'nuestras', 'nuestro', 'nuestros', 'o', 'os', 'otra', 'otras',
    'otro', 'otros', 'para', 'pero', 'por', 'porque', 'que', 'quien', 'quienes', 'qué',
    'se', 'sea', 'sean', 'ser', 'si', 'sin', 'sino', 'sobre', 'su', 'sus', 'suya', 'suyas', 'suyo',
    'suyos', 'sí', 'también', 'te', 'ti', 'tiene', 'tienen', 'todo', 'todos', 'tu', 'tus', 'un',
    'una', 'uno', 'unos', 'usted', 'ustedes', 'y', 'ya', 'yo', 'son', 'del', 'qué', 'cuál', 'es', 'son', 'segun'
  ]);

  const wordCounts = {};
  const verbPattern = /\b(identificar|calcular|definir|explicar|seleccionar|aplicar|analizar|evaluar|crear|describir|comparar|relacionar)\b/gi;
  const actionVerbs = new Set();

  questions.forEach(q => {
    const words = q.text.toLowerCase().replace(/[^a-záéíóúñü\s]/g, '').split(/\s+/);
    
    // Extraer verbos de acción
    const matches = q.text.match(verbPattern);
    if (matches) {
      matches.forEach(verb => actionVerbs.add(verb.toLowerCase()));
    }

    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
  });
  
  const sortedKeywords = Object.keys(wordCounts).sort((a, b) => wordCounts[b] - wordCounts[a]);
  const topKeywords = sortedKeywords.slice(0, 5);

  if (topKeywords.length === 0) {
    return ["Conocimiento General", "Este examen evaluará tus conocimientos generales sobre el tema. Prepárate para demostrar tu comprensión."];
  }

  // --- Lógica "Inteligente" para generar la descripción ---

  const formatKeywords = (keywords) => {
    if (keywords.length === 0) return '';
    if (keywords.length === 1) return keywords[0];
    const last = keywords.pop();
    return `${keywords.join(', ')} y ${last}`;
  };
  
  const mainTopic = topKeywords[0];
  const secondaryTopics = topKeywords.slice(1);

  const templates = [
    {
      title: `Enfoque en ${mainTopic.charAt(0).toUpperCase() + mainTopic.slice(1)}`,
      description: `Esta evaluación se concentra en tu dominio sobre ${mainTopic}. Se explorarán también conceptos clave como ${formatKeywords(secondaryTopics)}.`
    },
    {
      title: "Evaluación Integral de Habilidades",
      description: `Prepárate para una evaluación completa que abarcará principalmente ${mainTopic} y se extenderá a temas relacionados como ${formatKeywords(secondaryTopics)}.`
    },
    {
      title: `Dominio de ${mainTopic.charAt(0).toUpperCase() + mainTopic.slice(1)} y más`,
      description: `El examen está diseñado para medir tu pericia en ${mainTopic}, además de tu conocimiento en áreas secundarias como ${formatKeywords(secondaryTopics)}.`
    }
  ];

  // Añadimos contexto si encontramos verbos de acción
  let skillsTest = '';
  if (actionVerbs.size > 0) {
    skillsTest = ` Se espera que puedas ${formatKeywords(Array.from(actionVerbs))} los conceptos presentados. ¡Mucha suerte!`;
  }

  // Seleccionamos una plantilla al azar para dar variedad
  const chosenTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  return [chosenTemplate.title, chosenTemplate.description + skillsTest];
};

const ExamDescription = ({ exam, onAccept, onCancel }) => {
  const [summary, setSummary] = useState({ title: "Descripción de la Evaluación", description: "Cargando análisis del contenido..." });
  const [countdown, setCountdown] = useState(5); // <-- NUEVO: Estado para la cuenta regresiva
  const [isButtonDisabled, setIsButtonDisabled] = useState(true); // <-- NUEVO: Estado para deshabilitar el botón

  useEffect(() => {
    if (exam) {
      // 1. Prioridad: Usar la descripción pre-generada si existe en la BD.
      if (exam.descriptionTitle && exam.descriptionBody) {
        setSummary({
          title: exam.descriptionTitle,
          description: exam.descriptionBody
        });
      } else if (exam.questions) { // 2. Fallback: Generarla si no existe.
        const [title, description] = generateExamSummary(exam.questions);
        setSummary({ title, description });
      }
    }
  }, [exam]);

  // --- NUEVO: useEffect para la cuenta regresiva del botón ---
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer); // Limpiamos el temporizador si el componente se desmonta
    } else {
      setIsButtonDisabled(false); // Habilitamos el botón cuando la cuenta llega a 0
    }
  }, [countdown]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full text-center">
        <BookText className="w-16 h-16 text-blue-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Descripción de la Evaluación</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-8">{exam?.title || "Cargando..."}</h2>
        <p className="text-gray-600 mb-10 text-lg leading-relaxed bg-gray-50 p-4 rounded-lg border">{summary.description}</p>
        <button 
          onClick={onAccept} 
          disabled={isButtonDisabled}
          className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition shadow-lg font-bold text-lg flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-wait"
        >
          {isButtonDisabled ? <><Clock size={20} /> {`Continuar en ${countdown}...`}</> 
          : <>Entendido, continuar a las reglas <ArrowRight size={20} /></>}
        </button>
        <button onClick={onCancel} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition font-medium">
          Cancelar y volver al portal
        </button>
      </div>
    </div>
  );
};

export default ExamDescription;