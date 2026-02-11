import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, CheckCircle, GraduationCap } from 'lucide-react';
import logo from '../assets/Logo.gif'; // Importamos el logo

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-900">
            <ShieldCheck className="text-blue-600" />
            <span>Plataforma TrackSIM para DC-3</span>
          </div>
          <div>
            <Link 
              to="/login" 
              className="bg-blue-600 text-white px-5 py-2 rounded-full font-medium hover:bg-blue-700 transition"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 sm:py-1 text-center">
        <div className="flex justify-center mb-2">
          <img src={logo} alt="TrackSIM Logo" className="h-26" />
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
          Certificación de <br />
          <span className="text-blue-600">Habilidades Laborales</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-lg text-gray-500 mb-10">
          Plataforma oficial de TrackSIM para la evaluación y emisión de constancias DC-3. 
          Cumple con la normativa de la STPS de manera ágil y segura.
        </p>

        <div className="flex justify-center gap-4">
          <Link 
            to="/login" 
            className="flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Iniciar Evaluación <ArrowRight size={20} />
          </Link>
        </div>

        {/* Features */}
        <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-gray-50 rounded-xl">
            <CheckCircle className="w-10 h-10 text-green-500 mb-4 mx-auto" />
            <h3 className="font-bold text-lg mb-2">Validez Oficial</h3>
            <p className="text-gray-500 text-sm">Exámenes diseñados bajo normativa vigente STPS.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl">
            <GraduationCap className="w-10 h-10 text-blue-500 mb-4 mx-auto" />
            <h3 className="font-bold text-lg mb-2">Resultados Inmediatos</h3>
            <p className="text-gray-500 text-sm">Calificación automática y generación de historial.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl">
            <ShieldCheck className="w-10 h-10 text-purple-500 mb-4 mx-auto" />
            <h3 className="font-bold text-lg mb-2">Seguro y Privado</h3>
            <p className="text-gray-500 text-sm">Protección de datos personales y laborales.</p>
          </div>
        </div>
      </main>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">Preguntas Frecuentes</h2>
            <p className="mt-4 text-lg text-gray-500">
              Resolvemos algunas de las dudas más comunes sobre la plataforma y el proceso de certificación.
            </p>
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-lg text-gray-800">¿Qué es una constancia DC-3?</h3>
              <p className="mt-2 text-gray-600">
                Es el documento oficial que acredita que un trabajador ha recibido capacitación en una habilidad laboral específica, conforme a los planes y programas de la empresa. Es un requisito de la Secretaría del Trabajo y Previsión Social (STPS) en México.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-800">¿Este certificado tiene validez oficial?</h3>
              <p className="mt-2 text-gray-600">
                Sí. Las constancias emitidas a través de esta plataforma cumplen con los formatos y requisitos establecidos por la STPS, haciéndolas válidas para los fines correspondientes ante la autoridad laboral.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-800">¿Qué necesito para realizar la evaluación?</h3>
              <p className="mt-2 text-gray-600">
                Necesitas una cuenta en la plataforma, una conexión a internet estable y un dispositivo (computadora o tablet) con un navegador web actualizado. Asegúrate de tener tus datos personales (CURP, nombre completo) a la mano.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-800">¿Qué pasa si no apruebo el examen?</h3>
              <p className="mt-2 text-gray-600">
                Si no alcanzas la calificación mínima, no te preocupes. La plataforma registrará tu intento. Deberás contactar a tu coordinador o al administrador para que te autorice un nuevo intento de evaluación.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-800">¿Qué pasa si no apruebo el ejercicio del simulador?</h3>
              <p className="mt-2 text-gray-600">
                En caso que la calificación del simulador no sea aprobatoria, no se podrá generar la constancia DC-3.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-800">¿Por qué el examen requiere pantalla completa y da advertencias?</h3>
              <p className="mt-2 text-gray-600">
                Para garantizar la integridad de la evaluación, el sistema cuenta con medidas de seguridad. El examen debe realizarse en pantalla completa y no se debe salir de la pestaña. Si el sistema detecta que cambias de ventana, recibirás una advertencia; al acumular varias, el examen se finalizará automáticamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center text-gray-400 text-sm">
        <p>© 2026 Plataforma de Evaluación Laboral. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default Home;