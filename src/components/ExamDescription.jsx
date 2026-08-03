import React, { useMemo } from 'react';
import { BookText, ArrowRight, Clock, CheckCircle, Download, X } from 'lucide-react';
import { useButtonCountdown } from '../hooks/useButtonCountdown';

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

const ExamDescription = ({ exam, onAccept, onCancel, onShowGuide }) => {
  const { countdown, isButtonDisabled, showCheckAnimation } = useButtonCountdown(3);
  
  const summary = useMemo(() => {
    if (!exam) {
      return { title: "Descripción de la Evaluación", description: "Cargando análisis del contenido..." };
    }
    // 1. Prioridad: Usar la descripción del XLSX si existe.
    if (exam.description) {
      return {
        title: "Descripción de la Evaluación", // Título genérico
        description: exam.description
      };
    } else if (exam.descriptionTitle && exam.descriptionBody) { // 2. Compatibilidad con el formato anterior
      return {
        title: exam.descriptionTitle,
        description: exam.descriptionBody
      };
    } else if (exam.questions) { // 3. Fallback: Generarla si no existe nada.
      const [title, description] = generateExamSummary(exam.questions);
      return { title, description };
    }
    return { title: "Descripción de la Evaluación", description: "Cargando análisis del contenido..." };
  }, [exam]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full text-center">
        <BookText className="w-16 h-16 text-blue-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Descripción de la Evaluación</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-8">{exam?.title || "Cargando..."}</h2>
        <p className="text-gray-600 mb-10 text-lg leading-relaxed bg-gray-50 p-4 rounded-lg text-justify">
          {summary.description.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < summary.description.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
        <button 
          onClick={onAccept} 
          disabled={isButtonDisabled}
          className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-lg font-bold text-lg flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-wait"
        >
          {countdown > 0 ? (
            <><Clock size={20} /> {`Continuar en ${countdown}...`}</>
          ) : showCheckAnimation ? (
            <CheckCircle size={20} className="animate-ping" />
          ) : (
            <>Entendido, continuar a las reglas <ArrowRight size={20} /></>
          )}
        </button>
        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
          <button 
            onClick={onShowGuide} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-400 text-white px-6 py-3 rounded-lg hover:bg-orange-500 transition shadow-md font-semibold"
          >
            <Download size={18} />
            Ver guia de estudio
          </button>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <button onClick={onCancel} className="w-full sm:w-auto text-sm text-gray-500 hover:text-gray-700 transition font-medium py-2">
            Volver al portal
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamDescription;