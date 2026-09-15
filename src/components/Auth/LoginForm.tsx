import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import type { UserRole } from '../../db/dexie';
import { CheckIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const { login, register, isLoading, sendPasswordResetEmail } = useAuth();
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setResetSending(true);
      const result = await sendPasswordResetEmail(email);
      if (result.success) {
        setSuccess(result.message);
        setError('');
      } else {
        setError(result.message);
        setSuccess('');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Failed to send password reset. Please try again.');
    } finally {
      setResetSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!isLogin && !name) {
      setError('Please enter your name');
      return;
    }

    if (!isLogin && name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }

    try {
      let result: { success: boolean; message: string };
      
      if (isLogin) {
        result = await login(email, password);
      } else {
        const userData = {
          email,
          password,
          name,
          role,
        };
        result = await register(userData);
      }

      if (result.success) {
        setSuccess(result.message);
        console.log('Authentication successful, redirecting to dashboard...');
        if (!isLogin) {
          setEmail('');
          setPassword('');
          setName('');
        }
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('An unexpected error occurred. Please check your internet connection and try again.');
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setRole('user');
    setError('');
    setSuccess('');
    setShowPassword(false);
    setIsLogin(!isLogin);
  };

  const authFeatures = [
    { icon: '📦', title: 'Smart Inventory', desc: 'Track products, stock levels, and get alerts' },
    { icon: '💰', title: 'Sales Management', desc: 'Create invoices and print receipts instantly' },
    { icon: '📊', title: 'Financial Reports', desc: 'Visualize trends and make smart decisions' },
    { icon: '🔌', title: 'Offline First', desc: 'Works perfectly with or without internet' },
  ];

  const trustBadges = [
    { label: 'Trusted by', value: '500+ businesses' },
    { label: 'Uptime', value: '99.9%' },
    { label: 'Support', value: '24/7' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white relative overflow-hidden">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold text-emerald-700">
              NexTrack
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                to="/"
                className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-12 items-stretch">
          <div className="md:col-span-2 hidden md:flex flex-col">
            <div className="flex-1 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-8 lg:p-10 shadow-2xl shadow-emerald-600/20 text-white flex flex-col justify-between overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 text-sm font-medium">
                  <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></span>
                  Trusted by 500+ African businesses
                </div>

                <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                  Smart Accounting
                  <span className="block text-emerald-100">Made Simple</span>
                </h1>
                <p className="text-emerald-50 text-base leading-relaxed mb-10">
                  Manage inventory, track sales, and organize purchases—all in one intuitive app.
                </p>

                <div className="space-y-4">
                  {authFeatures.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-0.5">{feature.title}</h3>
                        <p className="text-emerald-100 text-sm">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-10 pt-8 border-t border-white/10">
                <div className="grid grid-cols-3 gap-4 text-center">
                  {trustBadges.map((badge, idx) => (
                    <div key={idx}>
                      <div className="text-xl font-bold text-white">{badge.value}</div>
                      <div className="text-emerald-200 text-xs mt-1">{badge.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 flex items-center">
            <div className="w-full max-w-xl mx-auto lg:mx-0">
              <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl shadow-gray-900/5 border border-gray-100">
                <div className="text-center lg:text-left mb-8">
                  {resetMode ? (
                    <>
                      <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
                        Reset Your Password
                      </h2>
                      <p className="text-gray-600 text-base">
                        Enter your email address and we'll send you a secure link to create a new password.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                      </h2>
                      <p className="text-gray-600 text-base">
                        {isLogin
                          ? 'Sign in to continue managing your business'
                          : 'Start your free 14-day trial. No credit card required.'}
                      </p>
                    </>
                  )}
                </div>

                {!resetMode && (
                  <div className="mb-8 flex rounded-2xl bg-gray-50 p-1.5 gap-1.5">
                    <button
                      type="button"
                      onClick={() => isLogin || resetForm()}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                        isLogin
                          ? 'bg-white text-emerald-700 shadow-md shadow-gray-900/5'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => !isLogin || resetForm()}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                        !isLogin
                          ? 'bg-white text-emerald-700 shadow-md shadow-gray-900/5'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                )}

                <form
                  onSubmit={resetMode ? handleResetPassword : handleSubmit}
                  className="space-y-5"
                >
                  {success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-2xl text-sm flex items-center gap-3">
                      <CheckIcon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{success}</span>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    {resetMode ? (
                      <>
                        <div>
                          <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                            Email Address
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                            placeholder="your.email@example.com"
                            style={{ fontSize: '16px' }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {!isLogin && (
                          <>
                            <div>
                              <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
                                Business Name
                              </label>
                              <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                required
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                                placeholder="Enter your business name"
                                style={{ fontSize: '16px' }}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                              />
                            </div>

                            <div>
                              <label htmlFor="role" className="block text-sm font-semibold text-gray-800 mb-2">
                                Role
                              </label>
                              <select
                                id="role"
                                name="role"
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                                style={{ fontSize: '16px' }}
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                              >
                                <option value="user">User</option>
                              </select>
                            </div>
                          </>
                        )}

                        <div>
                          <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                            Email Address
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                            placeholder="your.email@example.com"
                            style={{ fontSize: '16px' }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>

                        <div>
                          <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              id="password"
                              name="password"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete={isLogin ? 'current-password' : 'new-password'}
                              required
                              className="w-full px-4 py-3.5 pr-12 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                              placeholder={isLogin ? 'Enter your password' : 'Create a password (min 6 characters)'}
                              style={{ fontSize: '16px' }}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                          {isLogin && (
                            <div className="mt-2 text-right">
                              <button
                                type="button"
                                className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                                onClick={() => {
                                  setResetMode(true);
                                  setError('');
                                  setSuccess('');
                                  setPassword('');
                                  setShowPassword(false);
                                  setIsLogin(true);
                                }}
                              >
                                Forgot password?
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={
                        (resetMode ? resetSending : isLoading) ||
                        (!resetMode && !!success && isLogin)
                      }
                      className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-semibold rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5"
                    >
                      {resetMode ? (
                        resetSending ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending Email...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Send Reset Link
                            <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        )
                      ) : isLoading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : success ? (
                        <span className="flex items-center gap-2">
                          <CheckIcon className="h-5 w-5" />
                          Success!
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {isLogin ? 'Sign In' : 'Create Account'}
                          <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    {resetMode ? (
                      <button
                        type="button"
                        onClick={() => {
                          setResetMode(false);
                          setError('');
                          setSuccess('');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Sign In
                      </button>
                    ) : (
                      <Link
                        to="/"
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Home
                      </Link>
                    )}
                  </div>
                </form>
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  {isLogin ? (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={resetForm}
                        className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        Create account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={resetForm}
                        className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="md:hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-6 shadow-xl shadow-emerald-600/15 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-5 text-xs font-medium">
                  <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></span>
                  Trusted by 500+ African businesses
                </div>
                <h3 className="text-xl font-bold mb-3 leading-tight">
                  Smart Accounting Made Simple
                </h3>
                <p className="text-emerald-50 text-sm leading-relaxed mb-5">
                  Manage inventory, track sales, and organize purchases—all in one intuitive app.
                </p>
                <ul className="space-y-2.5 mb-5">
                  {authFeatures.slice(0, 3).map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 bg-white/15 rounded-md flex items-center justify-center flex-shrink-0 text-base mt-0.5">
                        {f.icon}
                      </div>
                      <span className="text-sm font-medium text-white">{f.title}</span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-center">
                  {trustBadges.map((b, i) => (
                    <div key={i}>
                      <div className="text-lg font-bold text-white">{b.value}</div>
                      <div className="text-emerald-200 text-[11px] mt-0.5 leading-snug">{b.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
