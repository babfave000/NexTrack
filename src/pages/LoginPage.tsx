// src/pages/LoginPage.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';

const LoginPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  // If user is already authenticated, redirect to dashboard
  if (user) {
    console.log('User already authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Login form will handle its own header through App.tsx PublicHeader */}
      <LoginForm />
    </div>
  );
};

export default LoginPage;