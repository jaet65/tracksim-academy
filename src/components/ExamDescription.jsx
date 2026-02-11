import React from 'react';
import { BookText, ArrowRight } from 'lucide-react';

// La lógica para generar el resumen se encapsula aquí.
const generateExamSummary = (questions) => {
  if (!questions || questions.length === 0) {
    return "Este examen cubre varios temas de conocimiento general.";
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
  questions.forEach(q => {
    const words = q.text.toLowerCase().replace(/[^a-záéíóúñü\s]/g, '').split(/\s+/);
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
  });

  const sortedKeywords = Object.keys(wordCounts).sort((a, b) => wordCounts[b] - wordCounts[a]);
  const topKeywords = sortedKeywords.slice(0, 5);

  if (topKeywords.length === 0) {
    return "Este examen evaluará tus conocimientos generales sobre el tema.";
  }

  return `Esta evaluación se centrará en temas clave como: ${topKeywords.map(k => `"${k}"`).join(', ')}. Prepárate para demostrar tus conocimientos en estas áreas.`;
};

const ExamDescription = ({ exam, onAccept }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full text-center">
        <BookText className="w-16 h-16 text-blue-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Descripción de la Evaluación</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-6">{exam?.title}</h2>
        <p className="text-gray-600 mb-10 text-lg leading-relaxed">{generateExamSummary(exam?.questions)}</p>
        <button onClick={onAccept} className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition shadow-lg font-bold text-lg flex items-center justify-center gap-2">
          Entendido, continuar a las reglas <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default ExamDescription;