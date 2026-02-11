import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase-config';
import { collection, getDocs, doc, deleteDoc, orderBy, query } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LogOut, ArrowLeft, Search, Trash2, Users, List } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
    navigate('/login');
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
                        <button
                          onClick={() => navigate(`/admin/resultados?search=${encodeURIComponent(user.fullName)}`)}
                          className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-100 transition"
                          title={`Ver resultados de ${user.fullName}`}
                        >
                          <List size={18} />
                        </button>

                        {/* Solo mostrar el botón de eliminar si el usuario NO es admin */}
                        {!user.isAdmin && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.fullName)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition"
                            title="Eliminar usuario"
                          >
                            <Trash2 size={18} />
                          </button>
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
    </div>
  );
};

export default AdminUsers;