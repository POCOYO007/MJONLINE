
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import CobradorLogin from './pages/CobradorLogin';
import Clients from './pages/Clients';
import NewLoan from './pages/NewLoan';
import LoanList from './pages/LoanList';
import LoanDetails from './pages/LoanDetails';
import ClientProfile from './pages/ClientProfile';
import Admin from './pages/Admin';
import CobradorDashboard from './pages/CobradorDashboard';
import Settings from './pages/Settings'; 
import SaaSAdmin from './pages/SaaSAdmin';
import { StorageService } from './services/storage';

interface ProtectedRouteProps {
    children?: React.ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const user = StorageService.getUser();
  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect based on role if they try to access unauthorized page
      if (user.role === 'cobrador') return <Navigate to="/cobrador" replace />;
      if (user.role === 'master') return <Navigate to="/saas-admin" replace />;
      return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AppContent = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/login-cobrador" element={<CobradorLogin />} />
            
            {/* Admin/User Dashboard */}
            <Route path="/" element={
                <ProtectedRoute allowedRoles={['admin', 'user']}>
                    <Dashboard />
                </ProtectedRoute>
            } />

            {/* Admin Panel */}
            <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Admin />
                </ProtectedRoute>
            } />

            {/* Super Admin (SaaS) Panel */}
            <Route path="/saas-admin" element={
                <ProtectedRoute allowedRoles={['master']}>
                    <SaaSAdmin />
                </ProtectedRoute>
            } />

            {/* Cobrador Dashboard */}
            <Route path="/cobrador" element={
                <ProtectedRoute allowedRoles={['cobrador']}>
                    <CobradorDashboard />
                </ProtectedRoute>
            } />
            
            {/* Shared Routes */}
            <Route path="/clientes" element={
                <ProtectedRoute allowedRoles={['admin', 'user']}>
                    <Clients />
                </ProtectedRoute>
            } />

            <Route path="/clientes/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'user']}>
                    <ClientProfile />
                </ProtectedRoute>
            } />
            
            <Route path="/emprestimos" element={
                <ProtectedRoute allowedRoles={['admin', 'user']}>
                    <LoanList />
                </ProtectedRoute>
            } />

            <Route path="/emprestimos/novo" element={
                <ProtectedRoute allowedRoles={['admin', 'user']}>
                    <NewLoan />
                </ProtectedRoute>
            } />

            <Route path="/emprestimos/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'user', 'cobrador']}>
                    <LoanDetails />
                </ProtectedRoute>
            } />

            <Route path="/configuracoes" element={
                <ProtectedRoute allowedRoles={['admin', 'user', 'cobrador']}>
                    <Settings />
                </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for session restore before rendering app
    const init = async () => {
        await StorageService.restoreSession();
        setLoading(false);
    };
    init();
  }, []);

  if (loading) {
      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-400 font-medium animate-pulse">Iniciando sistema...</p>
              </div>
          </div>
      );
  }

  return (
    <HashRouter>
        <AppContent />
    </HashRouter>
  );
};

export default App;
