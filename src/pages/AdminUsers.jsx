import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase-config';
import { collection, getDocs, doc, deleteDoc, orderBy, query, where, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LogOut, ArrowLeft, Search, Trash2, Users, List, Repeat, Loader, X } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [selectedUserForRetake, setSelectedUserForRetake] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("fullName", "asc"));
        const snapshot = await getDocs(q);
        
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setUsers(data);
      } catch (error) {
        console.error("Error cargando usuarios:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/home');
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${userName}? Se borrarán sus datos de perfil, pero no sus resultados de exámenes.`)) {
      try {
        await deleteDoc(doc(db, "users", userId));
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
        alert("Usuario eliminado con éxito.");
      } catch (error) {
        console.error("Error eliminando usuario:", error);
        alert("No se pudo eliminar el usuario.");
      }
    }
  };

  const filteredUsers = users.filter(u =>
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenRetakeModal = (user) => {
    setSelectedUserForRetake(user);
    setShowRetakeModal(true);
  };

  const handleCloseRetakeModal = () => {
    setShowRetakeModal(false);
    setSelectedUserForRetake(null);
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-blue-600">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-purple-600" /> Gestión de Usuarios
            </h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium">
            <LogOut size={18} /> Salir
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto mt-8 p-4">
        {/* Barra de Búsqueda */}
        <div className="flex justify-start bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute top-3 left-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o empresa..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-bold text-gray-600 text-sm">Nombre</th>
                  <th className="p-4 font-bold text-gray-600 text-sm">Email</th>
                  <th className="p-4 font-bold text-gray-600 text-sm">Empresa</th>
                  <th className="p-4 font-bold text-gray-600 text-sm text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-500">Cargando usuarios...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-500">No se encontraron usuarios.</td></tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-purple-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{user.fullName}</div>
                        <div className="text-xs text-gray-500">{user.curp}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{user.email}</td>
                      <td className="p-4 text-sm text-gray-600">{user.company}</td>
                      <td className="p-4 text-right">
                        {!user.isAdmin && (
                          <>
                            <button onClick={() => navigate(`/admin/resultados?search=${encodeURIComponent(user.fullName)}`)} className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-100 transition" title={`Ver resultados de ${user.fullName}`}>
                              <List size={18} />
                            </button>
                            <button onClick={() => handleOpenRetakeModal(user)} className="text-orange-500 hover:text-orange-700 p-2 rounded-full hover:bg-orange-100 transition" title={`Aprobar nuevo intento para ${user.fullName}`}>
                              <Repeat size={18} />
                            </button>
                            <button onClick={() => handleDeleteUser(user.id, user.fullName)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition" title="Eliminar usuario">
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showRetakeModal && selectedUserForRetake && (
        <RetakeApprovalModal user={selectedUserForRetake} onClose={handleCloseRetakeModal} />
      )}
    </div>
  );
};

const RetakeApprovalModal = ({ user, onClose }) => {
  const [uniqueExams, setUniqueExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState([]); // <-- NUEVO: Para rastrear reintentos pendientes

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 1. Cargar todos los resultados del alumno
        const resultsRef = collection(db, "results");
        const q = query(resultsRef, where("studentUid", "==", user.id), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        const resultsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Agrupar resultados por examen para mostrar solo el último intento de cada uno
        const examMap = new Map();
        resultsData.forEach(result => {
          if (!examMap.has(result.examId)) {
            examMap.set(result.examId, result);
          }
        });
        setUniqueExams(Array.from(examMap.values()));

        // 3. Cargar aprobaciones de reintento PENDIENTES para este alumno
        const approvalsRef = collection(db, "retake_approvals");
        const qApprovals = query(approvalsRef, where("studentUid", "==", user.id));
        const approvalsSnapshot = await getDocs(qApprovals);
        // Usamos un Set para asegurar que solo contamos un reintento pendiente por examen, eliminando duplicados.
        const pendingExamIdsSet = new Set(approvalsSnapshot.docs.map(doc => doc.data().examId));
        const uniquePendingExamIds = Array.from(pendingExamIdsSet);
        console.log(`El usuario ${user.fullName} tiene ${uniquePendingExamIds.length} reintentos pendientes.`);
        setPendingApprovals(uniquePendingExamIds);

      } catch (error) {
        console.error("Error cargando resultados del usuario:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user.id]);

  // --- CORRECCIÓN: Función para refrescar el estado de los pases ---
  const refreshPendingApprovals = async () => {
    const approvalsRef = collection(db, "retake_approvals");
    const qApprovals = query(approvalsRef, where("studentUid", "==", user.id));
    const approvalsSnapshot = await getDocs(qApprovals);
    const uniquePendingExamIds = Array.from(new Set(approvalsSnapshot.docs.map(doc => doc.data().examId)));
    setPendingApprovals(uniquePendingExamIds);
  };

  const handleApproveRetake = async (result) => {
    if (window.confirm(`¿Aprobar un nuevo intento para ${user.fullName} en el examen "${result.examTitle}"?`)) {
      try {
        await addDoc(collection(db, "retake_approvals"), {
          studentUid: result.studentUid,
          examId: result.examId,
          approvedAt: new Date(),
          approvedBy: auth.currentUser?.email || 'admin'
        });
        // Actualizamos el estado local para que el botón se deshabilite inmediatamente
        setPendingApprovals(prev => [...prev, result.examId]);
        alert("¡Nuevo intento aprobado! El alumno ya puede realizar el examen de nuevo.");
      } catch (error) {
        console.error("Error aprobando intento:", error);
        alert("No se pudo aprobar el nuevo intento.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4">
      {/* --- CORRECCIÓN: Al hacer clic fuera, se refresca el estado --- */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Aprobar Nuevo Intento</h2>
            <p className="text-sm text-gray-500">Para: {user.fullName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="text-right mb-2">
          <button onClick={refreshPendingApprovals} className="text-xs text-blue-600 hover:underline">
            Refrescar estado
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="animate-spin text-blue-600" />
            </div>
          ) : uniqueExams.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Este usuario no ha realizado ninguna evaluación.</p>
          ) : (
            uniqueExams.map(result => {
              const isPending = pendingApprovals.includes(result.examId);
              return (
                <div key={result.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="font-semibold text-gray-800">{result.examTitle}</p>
                    <p className="text-xs text-gray-500">
                      Última nota: {result.score} - Intento #{result.attempt}
                    </p>
                  </div>
                  {isPending ? (
                    <span className="text-sm font-semibold text-gray-500 bg-gray-200 px-3 py-1 rounded-md">
                      Pendiente
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApproveRetake(result)}
                      className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1 rounded-md hover:bg-orange-600 transition text-sm font-medium"
                    >
                      <Repeat size={16} /> Aprobar
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;