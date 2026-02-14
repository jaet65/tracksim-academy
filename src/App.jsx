import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home'; // Nueva importación
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentExam from './pages/StudentExam';
import StudentEntry from './pages/StudentEntry';
import CompleteProfile from './pages/CompleteProfile';
import StudentResults from './pages/StudentResults'; // Nueva importación
import EditProfile from './pages/EditProfile'; // Nueva importación
import AdminResults from './pages/AdminResults';
import AdminUsers from './pages/AdminUsers'; // <-- Nueva página
import VerificationPage from './pages/VerificationPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Página Pública Principal */}
        <Route path="/" element={<Home />} />
        
        {/* Autenticación */}
        <Route path="/login" element={<Login />} />
        <Route path="/completar-perfil" element={<CompleteProfile />} />
        
        {/* Rutas Protegidas de Alumno */}
        {/* Antes esta era la raíz, ahora es /portal */}
        <Route path="/portal" element={<StudentEntry />} />
        <Route path="/portal/mis-resultados" element={<StudentResults />} /> {/* Nueva ruta */}
        <Route path="/editar-perfil" element={<EditProfile />} /> {/* Nueva ruta */}
        <Route path="/examen/:id" element={<StudentExam />} />
        
        {/* Rutas Admin */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/resultados" element={<AdminResults />} />
        <Route path="/admin/usuarios" element={<AdminUsers />} /> {/* <-- Nueva ruta */}
        <Route path="/admin/editar-usuario/:userId" element={<EditProfile />} /> {/* <-- NUEVO: Para que el admin edite */}
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" />} />

        {/* --- LA NUEVA RUTA DE VERIFICACIÓN --- */}
        <Route path="/verify/:resultId" element={<VerificationPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;