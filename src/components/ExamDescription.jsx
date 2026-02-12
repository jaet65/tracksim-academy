import React, { useState, useEffect } from 'react';
import { BookText, ArrowRight, Clock, CheckCircle, Download, X, FileText, BrainCircuit, Star, Lightbulb, Paperclip } from 'lucide-react';
import { useButtonCountdown } from '../hooks/useButtonCountdown';
import { generateStudyGuide } from '../utils/studyGuideGenerator'; // <-- NUEVO
import jsPDF from 'jspdf';
import logo from '../assets/Logo.gif'; // <-- NUEVO: Importamos el logo
import 'jspdf-autotable';

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

// --- NUEVO: Componente Modal para la Guía de Estudio ---
const StudyGuideModal = ({ guide, onClose }) => {
  if (!guide) return null;

  const handleDownload = () => {
    const doc = new jsPDF();
    let y = 40; // Posición Y inicial más abajo para dar espacio al header

    const addHeader = () => {
      // Se establece la altura y se deja que el ancho se calcule automáticamente para mantener la proporción.
      doc.addImage(logo, 'GIF', 14, 10, 0, 15);
      // Usamos el color azul principal de la aplicación (Tailwind's blue-600)
      doc.setDrawColor(37, 99, 235); 
      doc.setLineWidth(0.5);
      doc.line(14, 28, doc.internal.pageSize.getWidth() - 14, 28);
      doc.setLineWidth(0.2); // Reseteamos el grosor para el resto del documento
    };

    const addFooter = (pageNumber, totalPages) => {
      const pageStr = `Página ${pageNumber} de ${totalPages}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(pageStr, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    };

    // Añadir header en la primera página
    addHeader();

    // Función para añadir una sección con título y contenido
    const addSection = (title, content, isList = false) => {
      if (!content || content.length === 0) return;

      const contentHeight = Array.isArray(content) 
        ? content.reduce((acc, item) => acc + (doc.splitTextToSize(item, 170).length * 5) + 2, 0)
        : (doc.splitTextToSize(content, 180).length * 5);

      // Salto de página si no hay espacio (considerando el footer)
      if (y + contentHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        addHeader(); // Añadir header en la nueva página
        y = 40; // Resetear Y
      }

      // Título del documento (solo en la primera página, después del header)
      if (title === "Título Principal") {
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0); // Aseguramos que el color del título sea negro
        doc.text(content, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 8;
        return;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(title, 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      if (isList) {
        content.forEach(item => {
          const splitItem = doc.splitTextToSize(`• ${item}`, 170);
          doc.text(splitItem, 18, y);
          y += (splitItem.length * 5) + 2;
        });
      } else {
        const splitContent = doc.splitTextToSize(content, 180);
        doc.text(splitContent, 14, y);
        y += (splitContent.length * 5);
      }
      y += 8; // Espacio después de la sección
    };

    // Añadir secciones al PDF
    addSection("Título Principal", guide.title);
    addSection("Introducción", guide.introduction);
    addSection("Conceptos Clave", guide.coreConcepts);
    addSection("Temas Complementarios", guide.complementaryTopics);
    addSection("Enfoque en Habilidades", guide.skillsFocus);
    addSection("Ejemplos de Preguntas", guide.exampleQuestions.map(q => `"${q}"`), true);
    addSection("Sugerencias Finales", guide.studyTips);

    // Añadir footer en todas las páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      addFooter(i, pageCount);
    }

    // Guardar el PDF
    const examTitle = guide.title.replace('Guía de Estudio para: ', '').trim();
    const safeFileName = `Guia de estudio ~ ${examTitle.replace(/[^a-z0-9\s]/gi, '')}.pdf`;
    doc.save(safeFileName);
  };

  const Paragraph = ({ icon, title, content }) => (
    <div className="mb-5">
      <h3 className="text-md font-bold text-gray-800 flex items-center gap-3 mb-2">{icon}{title}</h3>
      <p className="text-gray-600 leading-relaxed">{content}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText size={20} /> Guía de Estudio Detallada</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X size={20} /></button>
        </header>
        <main className="p-8 overflow-y-auto">
          <Paragraph icon={<Star className="text-yellow-500" size={18}/>} title="Introducción" content={guide.introduction} />
          
          {guide.coreConcepts && <Paragraph icon={<BrainCircuit className="text-blue-500" size={18}/>} title="Conceptos Clave" content={guide.coreConcepts} />}
          
          {guide.complementaryTopics && <Paragraph icon={<BrainCircuit className="text-blue-500" size={18}/>} title="Temas Complementarios" content={guide.complementaryTopics} />}

          {guide.skillsFocus && <Paragraph icon={<Lightbulb className="text-green-500" size={18}/>} title="Enfoque en Habilidades" content={guide.skillsFocus} />}

          {guide.exampleQuestions.length > 0 && (
            <div className="mb-5">
              <h3 className="text-md font-bold text-gray-800 flex items-center gap-3 mb-2"><BookText className="text-purple-500" size={18}/>Ejemplos de Preguntas</h3>
              <p className="text-gray-600 leading-relaxed mb-3">Para darte una idea del formato, podrías encontrar preguntas como:</p>
              <div className="space-y-3">
                {guide.exampleQuestions.map((q, i) => (
                  <blockquote key={i} className="border-l-4 border-gray-200 pl-4 italic text-gray-500 text-sm">"{q}"</blockquote>
                ))}
              </div>
            </div>
          )}
          <Paragraph icon={<Star className="text-yellow-500" size={18}/>} title="Sugerencias Finales" content={guide.studyTips} />
        </main>
        <footer className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
          <div className="flex items-center gap-4">
            {guide.supplementaryGuideUrl && guide.supplementaryGuideUrl.trim() !== '' && (
              <a href={guide.supplementaryGuideUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm font-medium">
                <Paperclip size={16} />
                Ver Guía Adjunta
              </a>
            )}
            <button onClick={handleDownload} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium">
              <Download size={16} />
              Descargar Guía Automática (PDF)
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

const ExamDescription = ({ exam, onAccept, onCancel }) => {
  const [summary, setSummary] = useState({ title: "Descripción de la Evaluación", description: "Cargando análisis del contenido..." });
  const { countdown, isButtonDisabled, showCheckAnimation } = useButtonCountdown(3);
  const [showStudyGuide, setShowStudyGuide] = useState(false);
  const [studyGuideContent, setStudyGuideContent] = useState(null);

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

  const handleShowGuide = () => {
    if (!exam) return;
    // Usar la guía guardada si existe, si no, generarla (fallback)
    if (exam.studyGuide) {
      setStudyGuideContent({
        ...exam.studyGuide,
        supplementaryGuideUrl: exam.supplementaryGuideUrl // Pasamos la URL al modal
      });
    } else if (!studyGuideContent) { // Generar solo si no existe y no la hemos generado antes
      console.warn("Generando guía de estudio sobre la marcha. Considera volver a guardar el examen para cachearla.");
      setStudyGuideContent(generateStudyGuide(exam.questions, exam.title || 'Examen'));
    }
    setShowStudyGuide(true);
  };

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
        <div className="mt-6 flex justify-center items-center gap-6">
          <button onClick={handleShowGuide} className="text-sm text-blue-600 hover:text-blue-800 transition font-medium flex items-center gap-2">
            <Download size={16} />
            Ver Guía de Estudio
          </button>
          <span className="text-gray-300">|</span>
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 transition font-medium">
            Volver al portal
          </button>
        </div>
      </div>
      {showStudyGuide && <StudyGuideModal guide={studyGuideContent} onClose={() => setShowStudyGuide(false)} />}
    </div>
  );
};

export default ExamDescription;