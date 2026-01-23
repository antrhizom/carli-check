import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import TrainerDashboard from './components/trainer/TrainerDashboard';
import ApprenticeDashboard from './components/apprentice/ApprenticeDashboard';

// Protected Route - einfach und direkt
function ProtectedRoute({ children, allowedRoles }) {
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Root redirect basierend auf Rolle */}
          <Route path="/" element={<RoleBasedRedirect />} />
          
          {/* Protected Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/trainer/*"
            element={
              <ProtectedRoute allowedRoles={['trainer']}>
                <TrainerDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/apprentice/*"
            element={
              <ProtectedRoute allowedRoles={['apprentice']}>
                <ApprenticeDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Helper component für Root-Redirect
function RoleBasedRedirect() {
  const { userData, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!userData) {
    return <Navigate to="/login" replace />;
  }
  
  // Direkter Redirect basierend auf Rolle
  switch (userData.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'trainer':
      return <Navigate to="/trainer" replace />;
    case 'apprentice':
      return <Navigate to="/apprentice" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default App;
