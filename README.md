# TrackSIM Academy

TrackSIM Academy es una plataforma web moderna para la gestión y realización de evaluaciones teóricas de conducción y capacitación, diseñada especialmente para integrarse con simuladores de conducción y gestionar el progreso de alumnos e instructores.

## Características Principales

- 🔐 **Autenticación y Perfiles**: Registro e inicio de sesión de usuarios con Firebase Auth (correo/contraseña y Google). Roles diferenciados para Alumnos, Instructores y Administradores.
- 📝 **Evaluaciones en Tiempo Real**: Exámenes interactivos para alumnos con temporizador interactivo (`useButtonCountdown`), guardado de progreso local automático (`useExamProgress`) y soporte de pausas programadas.
- 🛡️ **Mecanismos Anti-Trampa**: Monitoreo de actividad y pantalla completa (`useAntiCheat`) para asegurar la integridad de la evaluación teórica.
- 📊 **Panel de Administración e Instructores**:
  - Visualización y filtrado de resultados por empresa y alumno.
  - Edición y asignación manual de calificaciones de simulador.
  - Aprobación de reintentos de exámenes para alumnos bloqueados.
- 📄 **Generación de Constancias y DC-3**: Generación dinámica en el cliente de constancias de habilidades laborales (formato oficial DC-3 de la STPS) y reportes de errores en formato PDF utilizando `jsPDF`.
- 📁 **Importación de Datos**: Soporte para la importación y procesamiento de archivos XLSX/CSV para la carga masiva de reactivos o datos.
- 📱 **Soporte PWA (Progressive Web App)**: Configurado para instalarse como aplicación de escritorio o móvil y funcionar de manera óptima en cualquier dispositivo.

## Stack Tecnológico

- **Core**: [React 19](https://react.dev/) + [Vite 7](https://vite.dev/) (con soporte HMR)
- **Base de Datos y Auth**: [Firebase](https://firebase.google.com/) (Firestore & Authentication)
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/) (iconos)
- **Generación de Documentos**: [jsPDF](https://github.com/parallax/jsPDF) & [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **Gráficos**: [Chart.js](https://www.chartjs.org/) + [React Chartjs 2](https://react-chartjs-2.js.org/)
- **Procesamiento de Archivos**: [PapaParse](https://www.papaparse.com/) (CSV) & [SheetJS / xlsx](https://sheetjs.com/) (Excel)

---

## Estructura del Proyecto

```text
├── public/                # Recursos públicos estáticos
├── src/
│   ├── assets/            # Imágenes, logotipos y multimedia
│   ├── components/        # Componentes reutilizables (Reglas del examen, descripción, etc.)
│   ├── hooks/             # Custom Hooks (Anti-cheat, countdown, progress, exam data)
│   ├── pages/             # Vistas principales (Admin, Login, StudentPortal, Exam, etc.)
│   ├── utils/             # Funciones de utilidad (Generador DC-3, constancias, formateo de tiempo)
│   ├── firebase-config.js # Configuración e inicialización de Firebase SDK
│   ├── main.jsx           # Punto de entrada de la aplicación React
│   └── index.css          # Estilos globales y Tailwind CSS
├── eslint.config.js       # Configuración de ESLint 9+
├── firestore.rules        # Reglas de seguridad de Firebase Firestore
└── vite.config.js         # Configuración de compilación de Vite y PWA
```

---

## Configuración e Instalación

### Requisitos Previos

- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
- Un proyecto en [Firebase Console](https://console.firebase.google.com/) configurado con Firestore y Authentication habilitados.

### Pasos para Ejecutar Localmente

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd tracksim-academy
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar Firebase**:
   Asegúrate de configurar las variables de entorno de Firebase o tener el archivo `src/firebase-config.js` adecuadamente enlazado a tu proyecto de Firebase.

4. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:5173`.

---

## Scripts Disponibles

En el directorio del proyecto, puedes ejecutar los siguientes comandos:

- `npm run dev`: Inicia el servidor de desarrollo local con recarga rápida (HMR).
- `npm run build`: Compila la aplicación optimizada para producción en la carpeta `dist`.
- `npm run lint`: Ejecuta el validador de código de ESLint para asegurar la calidad y consistencia del código.
- `npm run preview`: Sirve localmente la compilación de producción para pruebas previas al despliegue.
