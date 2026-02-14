import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { CheckCircle, XCircle, Loader, Award, User, BookOpen, Calendar, Percent, BarChart, Home as HomeIcon } from 'lucide-react';
import logo from '../assets/Logo.gif';

const VerificationPage = () => {
  const { resultId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!resultId) {
      setError("No se proporcionó un ID de resultado.");
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      try {
        const resultRef = doc(db, "results", resultId);
        const resultSnap = await getDoc(resultRef);

        if (resultSnap.exists()) {
          setResult({ id: resultSnap.id, ...resultSnap.data() });
        } else {
          setError("Constancia no es válida o no fue encontrada.");
        }
      } catch (err) {
        console.error("Error al verificar el documento:", err);
        setError("Ocurrió un error al intentar verificar el documento.");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [resultId]);

  const renderDetail = (Icon, label, value) => (
    <div className="flex items-start py-3">
      <Icon className="w-5 h-5 text-gray-400 mr-4 mt-1 flex-shrink-0" />
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="TrackSIM Logo" className="h-24" />
        </div>

        {loading && (
          <div className="text-center py-10">
            <Loader className="mx-auto w-10 h-10 text-blue-600 animate-spin" />
            <p className="mt-4 text-gray-500">Verificando documento...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-10">
            <XCircle className="mx-auto w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">Documento Inválido</h2>
            <p className="mt-2 text-gray-600">{error}</p>
          </div>
        )}

        {result && (
          <div>
            <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200 mb-8">
              <CheckCircle className="mx-auto w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-800">Constancia Válida</h2>
              <p className="mt-1 text-gray-600">Este documento fue emitido por TrackSIM Academy.</p>
            </div>

            <h3 className="text-lg font-bold text-gray-500 border-b pb-2 mb-4">Detalles de la Constancia</h3>

            <div className="divide-y divide-gray-100">
              {renderDetail(User, "Alumno", result.studentName)}
              {renderDetail(BookOpen, "Evaluación", result.examTitle)}
              {renderDetail(Calendar, "Fecha de Emisión", result.timestamp?.toDate().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }))}
              
              <div className="grid grid-cols-1 md:grid-cols-3 pt-3">
                {renderDetail(Percent, "Nota Examen", result.score + "/100")}
                {result.simulatorScore !== undefined ? (
                  renderDetail(BarChart, "Nota Simulador", result.simulatorScore + "/100")
                ) : (
                  renderDetail(BarChart, "Nota Simulador", "Pendiente")
                )}
                {result.simulatorScore !== undefined && (
                  renderDetail(Award, "Promedio Final", ((result.score + Number(result.simulatorScore)) / 2).toFixed(1) + "/100")
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <Link 
            to="/"
            className="text-sm text-gray-500 hover:text-blue-600 transition font-medium flex items-center justify-center gap-2 mx-auto"
          >
            <HomeIcon size={16} /> Volver a la página principal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;