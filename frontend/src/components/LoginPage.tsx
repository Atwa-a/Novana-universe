
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../utils/api';

interface LoginPageProps {
  onLogin: (token: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      onLogin(data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Sticky header (matches Signup) */}
      <div className="space-nav">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gradient truncate">
              Novana Universe
            </span>
            <span className="hidden sm:block text-xs text-gray-400">Welcome back</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/signup" className="space-button text-xs sm:text-sm px-3 sm:px-4 py-2">
              Create account
            </Link>
          </div>
        </div>
      </div>

      {/* Spacer below fixed header */}
      <div className="h-4 sm:h-6" />

      {/* Main content (mirrors Signup spacing/layout) */}
      <main className="min-h-screen px-4 pt-12 sm:pt-14 z-10 relative overflow-hidden">
        {/* Ambient halos */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 w-[30rem] h-[30rem] rounded-full bg-star/15 blur-3xl" />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
         
          <section className="lg:col-span-7">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
              <span className="text-gradient">Welcome aboard,</span>
              <br className="hidden sm:block" />
              the memory ship 🚀
            </h1>

            <p className="mt-4 text-gray-300/90 text-sm sm:text-base max-w-prose">
              Capture stories, save keepsakes, and share moments with the people who matter.
              Start your constellation today—one memory at a time.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
              <div>
                <div className="text-lg">✨</div>
                <div className="font-semibold mt-1">Memory Stars</div>
                <div className="text-xs text-gray-400 mt-1">
                  Photos, videos, audio & notes become a glowing sky.
                </div>
              </div>
              <div>
                <div className="text-lg">🔒</div>
                <div className="font-semibold mt-1">Private by Default</div>
                <div className="text-xs text-gray-400 mt-1">
                  Share selectively when you want to.
                </div>
              </div>
              <div>
                <div className="text-lg">👨‍👩‍👧‍👦</div>
                <div className="font-semibold mt-1">Together</div>
                <div className="text-xs text-gray-400 mt-1">
                  Invite family & friends to add memories.
                </div>
              </div>
              <div>
                <div className="text-lg">🌠</div>
                <div className="font-semibold mt-1">Calm & Timeless</div>
                <div className="text-xs text-gray-400 mt-1">
                  A peaceful place to revisit and remember.
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="mt-10">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">Getting started</div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="glass-chip">1. Create account</span>
                <span className="glass-chip">2. Add a loved one</span>
                <span className="glass-chip">3. Drop your first memory</span>
              </div>
            </div>
          </section>

          {/* Sign-in form */}
          <section className="lg:col-span-5 w-full">
            <form onSubmit={handleSubmit} className="max-w-md lg:ml-auto w-full">
              <div className="text-center">
                <div className="text-3xl mb-2">🌌</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gradient">
                  Sign in to continue
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Use your registered email and password.
                </p>
              </div>

              {/* Divider */}
              <div className="mt-6 border-t border-white/10" />

              {error && (
                <div className="mt-4 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <label htmlFor="email" className="block text-xs text-gray-400 mb-1 mt-4">Email</label>
              <input
                id="email"
                type="email"
                className="space-input w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@planet.com"
                required
                disabled={loading}
              />

              <label htmlFor="password" className="block text-xs text-gray-400 mb-1 mt-4">Password</label>
              <input
                id="password"
                type="password"
                className="space-input w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />

              <button
                type="submit"
                className="space-button-primary w-full mt-6"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Signing in…
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>

              <div className="text-center text-sm text-gray-400 mt-4">
                New here?{' '}
                <Link to="/signup" className="text-accent hover:text-accent/80 transition-colors">
                  Create an account
                </Link>
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 px-4 sm:px-6 py-4 text-center text-[12px] text-gray-400">
        © {new Date().getFullYear()} — All rights reserved • created by <span className="text-gradient font-semibold">A_ATWA</span>
      </footer>
    </>
  );
};

export default LoginPage;
