import jsPDF from 'jspdf';
import logo from '../assets/Logo.png'; // Importamos el logo

export const generateConstancia = (studentData, examData, score, incorrectAnswers) => {
  const doc = new jsPDF();
  const today = new Date();
  const dateStr = today.toLocaleDateString();

  // --- 0. LOGO ---
  doc.addImage(logo, 'PNG', 15, 12, 25, 0); // (imagen, formato, x, y, ancho, alto=0 para auto-escala)

  // --- 1. ENCABEZADO ---
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Constancia de Participación", 105, 25, { align: "center" });

  // --- 2. DATOS GENERALES ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Alumno:`, 50, 40);
  doc.setFont("helvetica", "bold");
  doc.text(studentData.studentName || "N/A", 95, 40);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Correo:`, 50, 47);
  doc.setFont("helvetica", "bold");
  doc.text(studentData.studentEmail || "N/A", 95, 47);

  doc.setFont("helvetica", "normal");
  doc.text(`CURP:`, 50, 54);
  doc.setFont("helvetica", "bold");
  doc.text(studentData.studentCurp || "N/A", 95, 54);

  doc.setFont("helvetica", "normal");
  doc.text(`Ocupación:`, 50, 61); // La etiqueta se queda fija
  doc.setFont("helvetica", "bold");
  // Dividimos el texto de la ocupación si es muy largo
  const occupationText = doc.splitTextToSize(studentData.studentOccupation || "N/A", 100); // Ancho máximo de 100mm
  doc.text(occupationText, 95, 61);

  // Calculamos el espacio extra que ocupa el texto de ocupación y ajustamos la posición 'y'
  const occupationLines = occupationText.length;
  let yOffset = (occupationLines > 1) ? (occupationLines - 1) * 5 : 0; // 5mm de espacio por línea extra

  let currentY = 68 + yOffset;

  doc.setFont("helvetica", "normal");
  doc.text(`Empresa:`, 50, currentY);
  doc.setFont("helvetica", "bold");
  doc.text(studentData.studentCompany || "N/A", 95, currentY);
  currentY += 7;

  doc.setFont("helvetica", "normal");
  doc.text(`RFC Empresa:`, 50, currentY);
  doc.setFont("helvetica", "bold");
  doc.text(studentData.studentCompanyRfc || "N/A", 95, currentY);
  currentY += 7;

  // Separador
  doc.setDrawColor(200, 200, 200);
  doc.line(50, currentY, 200, currentY);
  currentY += 7;

  doc.setFont("helvetica", "normal");
  doc.text(`Evaluación:`, 50, currentY);
  doc.setFont("helvetica", "bold");
  doc.text(examData.examTitle || "N/A", 95, currentY);
  currentY += 7;

  doc.setFont("helvetica", "normal");
  doc.text(`Fecha:`, 50, currentY);
  doc.setFont("helvetica", "bold");
  doc.text(dateStr, 95, currentY);
  currentY += 7;

  doc.setFont("helvetica", "normal");
  doc.text(`Calificación Obtenida:`, 50, currentY);
  doc.setFont("helvetica", "bold");
  doc.text(`${score}/100`, 95, currentY);
  currentY += 10;

  let yPosition = currentY; // Posición inicial para el contenido dinámico

  // --- 3. RESUMEN DE ERRORES ---
  if (incorrectAnswers.length > 0) {
    doc.setFillColor(230, 230, 230); // Gris claro
    doc.rect(10, yPosition, 190, 8, 'F'); // Barra de título
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN DE RESPUESTAS INCORRECTAS", 15, yPosition + 5);

    yPosition += 15;
    doc.setFontSize(9);

    incorrectAnswers.forEach((item, index) => {
      // Evitar que se salga de la página
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont("helvetica", "bold");
      const questionText = doc.splitTextToSize(`P: ${item.question}`, 180);
      doc.text(questionText, 15, yPosition);
      yPosition += (questionText.length * 4);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(219, 56, 56); // Rojo
      const yourAnswerText = doc.splitTextToSize(`Tu respuesta: ${item.yourAnswer}`, 170);
      doc.text(yourAnswerText, 20, yPosition);
      yPosition += (yourAnswerText.length * 4);

      doc.setTextColor(34, 139, 34); // Verde
      const correctAnswerText = doc.splitTextToSize(`Respuesta correcta: ${item.correctAnswer}`, 170);
      doc.text(correctAnswerText, 20, yPosition);
      yPosition += (correctAnswerText.length * 4) + 5; // Espacio extra

      doc.setTextColor(0, 0, 0); // Reset a negro
    });
  } else {
    yPosition += 15; // Si no hay errores, dejamos un espacio
  }

  // --- 4. MENSAJE FINAL (FELICITACIÓN O MOTIVACIÓN) ---
  const passed = score >= 80;
  const finalMessage = passed
    ? "¡Felicidades! Has demostrado un excelente dominio de los conocimientos. Sigue así y continúa fortaleciendo tus habilidades para un futuro profesional exitoso.\n\nSi el resultado de tus ejercicios en el simulador es aprobatorio, recibirás tu constancia DC-3 vía correo electrónico. Sigamos trabajando juntos por la seguridad vial."
    : "No te desanimes. Cada evaluación es una oportunidad para aprender y crecer. Revisa tus errores, refuerza los temas y prepárate para el siguiente reto. ¡Tú puedes!";

  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");

  // Dividimos el texto para que quepa en el ancho de la página
  const splitMessage = doc.splitTextToSize(finalMessage, 180);

  // Centramos el texto
  doc.text(splitMessage, 105, yPosition, { align: "center" });

  // --- 5. PIE DE PÁGINA ---
  const footerText = "¡Revisa que tu información esté correcta! Estos datos aparecerán en tu certificación DC-3. Si necesitas corregir algo, escribe a magraz@tracksim.mx o avisa a tu coordinador local.";
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150); // Color gris para el pie de página

  // Línea separadora del pie de página
  doc.setDrawColor(220, 220, 220);
  doc.line(15, 282, 195, 282);

  const splitFooter = doc.splitTextToSize(footerText, 180); // Ancho del texto
  doc.text(splitFooter, 105, 285, { align: "center" });


  // --- 6. GUARDAR PDF ---
  const formattedDate = dateStr.replace(/\//g, '-');
  const fileName = `Constancia_${studentData.studentName.replace(/\s+/g, '_')}_${formattedDate}.pdf`;
  doc.save(fileName);
};