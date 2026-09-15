import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../db/dexie';
import { Link, useNavigate } from 'react-router-dom';
import { CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, sendPasswordResetEmail } = useAuth();
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsSubmitting(true);
      const fbResult = await sendPasswordResetEmail(email);
      if (fbResult.success) {
        setSuccess(fbResult.message);
        setStep('reset');
        return;
      }

      // Firebase didn't send (e.g., not configured). Fall back to local flow.
      console.warn('Firebase reset unavailable, using Dexie fallback:', fbResult.message);
      const userExists = await db.users
        .where('email')
        .equals(email.toLowerCase())
        .first();
      if (userExists) {
        setStep('verify');
      } else {
        setError('No account found with this email address');
      }
    } catch (err) {
      console.error('Reset email submission error:', err);
      setError('Failed to process request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await login(email, currentPassword);
    if (result && result.success) {
      setStep('reset');
    } else {
      setError(result?.message || 'Current password is incorrect');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // If we got here via Firebase email link, the user already clicked the email link;
    // we still support local Dexie update so existing offline accounts also benefit.
    if (step === 'reset' && success) {
      // Firebase handled it — just redirect after a beat.
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setIsSubmitting(true);
      const currentUser = await db.users
        .where('email')
        .equals(email.toLowerCase())
        .first();
      if (!currentUser) {
        setError('User not found');
        return;
      }

      await db.users.update(currentUser.id!, {
        password: newPassword,
        updatedAt: new Date(),
      });

      setSuccess('Password reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = {
    email: { title: 'Reset Your Password', subtitle: 'Enter your email to begin the reset process' },
    verify: { title: 'Verify Your Identity', subtitle: 'Confirm your current password to continue' },
    reset: { title: 'Create New Password', subtitle: 'Choose a strong new password for your account' },
  };

  const resetTips = [
    { icon: '🔒', title: 'Secure Account', desc: 'Regular password updates keep your data safe' },
    { icon: '💡', title: 'Strong Password', desc: 'Use at least 6 characters with mixed types' },
    { icon: '📱', title: 'Stay Signed In', desc: 'You\'ll need to sign in again after reset' },
  ];

  const currentStep = stepTitles[step];

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
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-2 hidden lg:flex flex-col">
            <div className="flex-1 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-8 lg:p-10 shadow-2xl shadow-emerald-600/20 text-white flex flex-col justify-between overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 text-sm font-medium">
                  <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></span>
                  Account Recovery
                </div>

                <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                  Reset Your
                  <span className="block text-emerald-100">Password</span>
                </h1>
                <p className="text-emerald-50 text-base leading-relaxed mb-10">
                  Follow the steps below to securely reset your password and regain access to your NexTrack account.
                </p>

                <div className="space-y-4">
                  {resetTips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                        {tip.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-0.5">{tip.title}</h3>
                        <p className="text-emerald-100 text-sm">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-10 pt-8 border-t border-white/10">
                <div className="space-y-3">
                  {(['email', 'verify', 'reset'] as const).map((s, idx) => (
                    <div key={s} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        step === s
                          ? 'bg-white text-emerald-700 shadow-lg'
                          : ['email', 'verify', 'reset'].indexOf(step) > idx
                          ? 'bg-emerald-400 text-emerald-900'
                          : 'bg-white/10 text-emerald-200 border border-white/10'
                      }`}>
                        {['email', 'verify', 'reset'].indexOf(step) > idx ? '✓' : idx + 1}
                      </div>
                      <span className={`text-sm font-medium ${
                        step === s ? 'text-white' : 'text-emerald-200'
                      }`}>
                        {s === 'email' ? 'Enter Email' : s === 'verify' ? 'Verify Identity' : 'New Password'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 flex items-center">
            <div className="w-full max-w-xl mx-auto lg:mx-0">
              <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl shadow-gray-900/5 border border-gray-100">
                <div className="text-center lg:text-left mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl mb-4">
                    <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
                    {currentStep.title}
                  </h2>
                  <p className="text-gray-600 text-base">
                    {currentStep.subtitle}
                  </p>
                </div>

                {success && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-2xl text-sm flex items-center gap-3 mb-6">
                    <CheckIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{success}</span>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium mb-6">
                    {error}
                  </div>
                )}

                {step === 'email' && (
                  <form className="space-y-5" onSubmit={handleEmailSubmit}>
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                        style={{ fontSize: '16px' }}
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-semibold rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending Reset Link...
                        </span>
                      ) : (
                        'Send Reset Email'
                      )}
                    </button>
                  </form>
                )}

                {step === 'verify' && (
                  <form className="space-y-5" onSubmit={handleVerifySubmit}>
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-semibold text-gray-800 mb-2">
                        Current Password
                      </label>
                      <input
                        id="currentPassword"
                        type="password"
                        required
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                        style={{ fontSize: '16px' }}
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep('email')}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 px-6 rounded-2xl text-base font-semibold transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-4 px-6 rounded-2xl text-base font-semibold shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 transition-all"
                      >
                        Verify
                      </button>
                    </div>
                  </form>
                )}

                {step === 'reset' && (
                  <form className="space-y-5" onSubmit={handleResetSubmit}>
                    {success ? (
                      <div className="py-2">
                        <p className="text-gray-600 mb-6">
                          Follow the link sent to your email to choose a new password. After resetting your password, you can sign in below.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate('/login')}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-4 px-6 rounded-2xl text-base font-semibold shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 transition-all"
                        >
                          Go to Sign In
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-800 mb-2">
                            New Password
                          </label>
                          <input
                            id="newPassword"
                            type="password"
                            required
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                            style={{ fontSize: '16px' }}
                            placeholder="Enter new password (min 6 characters)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                        </div>

                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-2">
                            Confirm New Password
                          </label>
                          <input
                            id="confirmPassword"
                            type="password"
                            required
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all"
                            style={{ fontSize: '16px' }}
                            placeholder="Confirm your new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setStep('verify')}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 px-6 rounded-2xl text-base font-semibold transition-colors"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-4 px-6 rounded-2xl text-base font-semibold shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                          >
                            Reset Password
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  Remember your password?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Sign in instead
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
