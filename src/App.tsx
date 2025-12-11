import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { StylesProvider } from './context/StylesContext';
import { ToastProvider } from './context/ToastContext';
import { ExportProvider } from './context/ExportContext';

// Global Components
import { GlobalExportProgress } from './components/tyler';

// Layouts
import MainLayout from './components/layouts/MainLayout';

// Auth Components
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import Dashboard from './pages/Dashboard';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Feature Pages
import AvaChat from './pages/ava/AvaChat';
import LaraChat from './pages/lara/LaraChat';
import LacyChat from './pages/lacy/LacyChat';
import FranckChat from './pages/franck/FranckChat';
import FarisChat from './pages/faris/FarisChat';
import CreateRewrite from './pages/vera/CreateRewrite';
import MyStyles from './pages/styles/MyStyles';
import AllRewrites from './pages/rewrites/AllRewrites';
import Settings from './pages/settings/Settings';
import VincePage from './pages/vince/VincePage';
import SimpleTextOverlayPage from './pages/tyler/SimpleTextOverlayPage';

// Error Pages
import NotFound from './pages/errors/NotFound';

// Create a client for React Query
const queryClient = new QueryClient();

/**
 * App content component with routes and authentication check
 * @returns {JSX.Element} AppContent component
 */
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if user is authenticated on initial load and route changes
  useEffect(() => {
    // Skip redirect for auth-related routes
    const isAuthRoute = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/404'
    ].includes(location.pathname);
    
    // If authentication check is complete and user is not logged in
    // and not on an auth route, redirect to login
    if (!loading && !user && !isAuthRoute) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [user, loading, navigate, location]);

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="ava" element={<AvaChat />} />
          <Route path="lara" element={<LaraChat />} />
          <Route path="lacy" element={<LacyChat />} />
          <Route path="franck" element={<FranckChat />} />
          <Route path="faris" element={<FarisChat />} />
          <Route path="create-rewrite" element={<CreateRewrite />} />
          <Route path="my-styles" element={<MyStyles />} />
          <Route path="all-rewrites" element={<AllRewrites />} />
          <Route path="vince" element={<VincePage />} />
          <Route path="tyler" element={<SimpleTextOverlayPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
      
      {/* Error Routes */}
      <Route path="404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

/**
 * Main App component with context providers
 * @returns {JSX.Element} App component
 */
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <StylesProvider>
            <ToastProvider>
              <ExportProvider>
                <AppContent />
                <GlobalExportProgress />
              </ExportProvider>
            </ToastProvider>
          </StylesProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;