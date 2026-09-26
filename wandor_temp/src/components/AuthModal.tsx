import React, { useState } from 'react';
import { X, Lock, Mail, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userEmail: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.user?.email || email);
        onClose();
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      setAuthError(null);
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await response.json();
      if (response.ok) {
        const userEmail = data.user?.email || email;
        onLoginSuccess(userEmail);
        onClose();
      } else {
        setAuthError(data.error || 'Google login failed');
      }
    } catch (err) {
      setAuthError('Network error during Google login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#FAF6F0] rounded-[28px] border border-white p-7 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-stone-500 hover:text-black rounded-full hover:bg-stone-200/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <span className="font-logo text-3xl font-medium tracking-tight text-[#121212] block mb-2">
            wandor
          </span>
          <h3 className="font-heading text-xl font-bold text-stone-900">
            {isSignUp ? 'Create your Wandor account' : 'Welcome back, traveler'}
          </h3>
          <p className="text-xs text-stone-600 mt-1.5">
            Save your personalized itineraries, sync across devices, and unlock crowd radars.
          </p>
          {authError && <p className="text-xs text-red-600 mt-2 font-medium">{authError}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full text-sm pl-10 pr-3.5 py-2.5 bg-white/95 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 text-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm pl-10 pr-3.5 py-2.5 bg-white/95 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 text-stone-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#121212] hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider py-3 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-stone-300"></div>
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">OR</span>
          <div className="flex-1 h-px bg-stone-300"></div>
        </div>

        <div className="mt-6 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setAuthError('Google login failed. Please try again.');
            }}
            useOneTap
            shape="pill"
          />
        </div>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-stone-600 hover:text-black font-medium transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};
