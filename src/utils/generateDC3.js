import jsPDF from 'jspdf';
import logo from '../assets/Logo.png'; // Importamos el logo
import signature from '../assets/Firma.png'; // Importamos la firma

export const generateDC3 = (studentData, examData) => {
  const doc = new jsPDF();
  
  // --- CONFIGURACIÓN DE LA EMPRESA CAPACITADORA (TÚ) ---
  // Cambia estos datos por los de tu academia
  const INSTRUCTOR_NAME = "Ing. Mario Alberto Agraz Martínez";
  const INSTRUCTOR_RFC = "AAMM9005188M7";
  const COURSE_HOURS = "10"; // Duración estándar del curso
  const AGENTE_CAPACITADOR = "CECAI";
  
  // --- 1. ENCABEZADO ---
  // Logo de la empresa
  doc.addImage(logo, 'PNG', 15, 10, 25, 0); // (imagen, formato, x, y, ancho, alto=0 para auto-escala)

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FORMATO DC-3", 105, 22, { align: "center" });
  
  doc.setFontSize(10);
  doc.text("CONSTANCIA DE COMPETENCIAS O DE HABILIDADES LABORALES", 105, 30, { align: "center" });

  // --- 2. DATOS DEL TRABAJADOR ---
  doc.setFillColor(230, 230, 230); // Gris claro
  doc.rect(10, 35, 190, 8, 'F'); // Barra de título
  doc.setFontSize(9);
  doc.text("DATOS DEL TRABAJADOR", 15, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  // Nombre
  doc.text("Nombre (Apellido Paterno, Apellido Materno, Nombre(s)):", 10, 50);
  doc.setFont("helvetica", "bold");
  // Construimos el nombre en el formato Paterno Materno Nombre(s)
  const dc3FullName = `${studentData.studentPaternalLastName || ''} ${studentData.studentMaternalLastName || ''} ${studentData.studentFirstName || ''}`.trim();
  doc.text(dc3FullName, 10, 55);
  doc.line(10, 56, 110, 56); // Línea subrayado

  // CURP
  doc.setFont("helvetica", "normal");
  doc.text("Clave Única de Registro de Población (CURP):", 120, 50);
  doc.setFont("helvetica", "bold");
  doc.text(studentData.studentCurp || "", 120, 55);
  doc.line(120, 56, 190, 56);

  // Ocupación
  doc.setFont("helvetica", "normal");
  doc.text("Ocupación Específica (Catálogo Nacional de Ocupaciones): (1/)", 10, 65);
  doc.setFont("helvetica", "bold");
  doc.text(studentData.studentOccupation || "", 10, 70);
  doc.line(10, 71, 190, 71);

  // Puesto
  doc.setFont("helvetica", "normal");
  doc.text("Puesto: (*)", 10, 78);
  doc.text(studentData.studentOccupation || "", 25, 78); // Reusamos ocupación si no hay puesto
  doc.line(22, 79, 190, 79);

  // --- 3. DATOS DE LA EMPRESA (PATRÓN) ---
  doc.setFillColor(230, 230, 230);
  doc.rect(10, 85, 190, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DE LA EMPRESA", 15, 90);

  // Razón Social
  doc.setFont("helvetica", "normal");
  doc.text("Nombre o razón social (En caso de persona física, anotar apellido paterno, materno y nombre(s)):", 10, 98);
  doc.setFont("helvetica", "bold");
  doc.text(studentData.studentCompany || "", 10, 103);
  doc.line(10, 104, 190, 104);

  // RFC de la Empresa
  doc.setFont("helvetica", "normal");
  doc.text("Registro Federal de Contribuyentes con homoclave (SHCP):", 10, 110);
  doc.setFont("helvetica", "bold");
  doc.text(studentData.studentCompanyRfc || "", 10, 115);
  doc.line(10, 116, 190, 116);

  // --- 4. DATOS DEL PROGRAMA DE CAPACITACIÓN ---
  doc.setFillColor(230, 230, 230);
  doc.rect(10, 120, 190, 8, 'F');
  doc.text("DATOS DEL PROGRAMA DE CAPACITACIÓN, ADIESTRAMIENTO Y PRODUCTIVIDAD", 15, 125);

  // Curso
  doc.setFont("helvetica", "normal");
  doc.text("Nombre del curso:", 10, 135);
  doc.setFont("helvetica", "bold");
  doc.text(examData.examTitle || "Curso de Capacitación", 10, 141);
  doc.line(10, 142, 190, 142);

  // Duración y Fechas
  doc.setFont("helvetica", "normal");
  doc.text("Duración (horas):", 10, 150);
  doc.setFont("helvetica", "bold");
  doc.text(COURSE_HOURS, 40, 150);
  doc.line(35, 151, 60, 151);

  // Fecha (Usamos la fecha actual como término)
  const today = new Date();
  const dateStr = today.toLocaleDateString();
  
  doc.setFont("helvetica", "normal");
  doc.text("Periodo de ejecución:", 70, 150);
  doc.text(`De: ${dateStr}   a   ${dateStr}`, 110, 150);

  // Área Temática (Ejemplo: Seguridad = 6000)
  doc.text("Área temática del curso: (2/)", 10, 160);
  doc.setFont("helvetica", "bold");
  doc.text("6000 - Seguridad", 60, 160); 
  doc.line(55, 161, 120, 161);

  // Agente Capacitador
  doc.setFont("helvetica", "normal");
  doc.text("Nombre del agente capacitador o STPS: (3/)", 10, 168);
  doc.setFont("helvetica", "bold");
  doc.text(AGENTE_CAPACITADOR, 80, 168);
  doc.line(78, 169, 190, 169);

  // --- 5. FIRMAS ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Los datos se asientan bajo protesta de decir verdad.", 105, 175, { align: "center" });

  // Líneas de firma
  const firmaY = 210;
  
  // Instructor
  doc.addImage(signature, 'PNG', 30, firmaY - 20, 40, 0); // Subimos la firma para que se sobreponga a la línea
  doc.line(20, firmaY, 80, firmaY);
  doc.setFont("helvetica", "bold");
  doc.text(INSTRUCTOR_NAME, 50, firmaY - 2, { align: "center" }); // El nombre también va sobre la línea
  doc.setFont("helvetica", "normal");
  doc.text("Nombre y firma del instructor", 50, firmaY + 5, { align: "center" }); // El texto genérico va debajo

  // Patrón
  doc.line(110, firmaY, 180, firmaY);
  doc.setFont("helvetica", "normal");
  doc.text("Nombre y firma del patrón o representante legal (4/)", 145, firmaY + 5, { align: "center" });

  // Trabajador (Abajo)
  doc.line(65, firmaY + 30, 135, firmaY + 30);
  doc.text("Representante de los trabajadores (5/)", 100, firmaY + 35, { align: "center" });

  // --- 6. INSTRUCCIONES (PIE DE PÁGINA) ---
  let yFooter = 250; // Posición inicial para el pie de página
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("INSTRUCCIONES", 10, yFooter);
  yFooter += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);

  doc.text("- Llenar a máquina o con letra de molde.", 10, yFooter);
  yFooter += 3;
  doc.text("- Deberá entregarse al trabajador dentro de los veinte días hábiles siguientes al término del curso de capacitación aprobado.", 10, yFooter);
  yFooter += 4;

  const notes = [
    "1/ Las áreas y subáreas ocupacionales del Catálogo Nacional de Ocupaciones se encuentran disponibles en el reverso de este formato y en la página www.stps.gob.mx",
    "2/ Las áreas temáticas de los cursos se encuentran disponibles en el reverso de este formato y en la página www.stps.gob.mx",
    "3/ Cursos impartidos por el área competente de la Secretaria del Trabajo y Previsión Social.",
    "4/ Para empresas con menos de 51 trabajadores. Para empresas con más de 50 trabajadores firmaría el representante del patrón ante la Comisión mixta de capacitación, adiestramiento y productividad.",
    "5/ Solo para empresas con más de 50 trabajadores.",
    "* Dato no obligatorio."
  ];

  notes.forEach(note => {
    const splitNote = doc.splitTextToSize(note, 190);
    doc.text(splitNote, 10, yFooter);
    yFooter += (splitNote.length * 2.5) + 1;
  });

  // Guardar PDF
  const fileName = `DC3_${studentData.studentName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};