import React from 'react';
import { FileText, Star, Lightbulb, Paperclip, BrainCircuit, BookText, Download, X } from 'lucide-react';
import jsPDF from 'jspdf';
import logo from '../assets/Logo.gif';
import 'jspdf-autotable';

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
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText size={20} /> Programa sintetico</h2>
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
              Ver Síntesis (PDF)
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default StudyGuideModal;