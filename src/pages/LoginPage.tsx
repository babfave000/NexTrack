import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';

const LoginPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (user) {
    console.log('User already authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <LoginForm />;
};

export default LoginPage;
