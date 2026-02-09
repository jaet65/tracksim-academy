import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home'; // Nueva importación
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentExam from './pages/StudentExam';
import StudentEntry from './pages/StudentEntry';
import CompleteProfile from './pages/CompleteProfile';

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
        <Route path="/examen/:id" element={<StudentExam />} />
        
        {/* Rutas Admin */}
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;