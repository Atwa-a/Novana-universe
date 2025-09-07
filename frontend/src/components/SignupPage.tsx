import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup, login } from '../utils/api';

interface SignupPageProps {
  onSignup: (token: string) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignup }) => {
  const navigate = useNavigate();

  // form state
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree]       = useState(true);
  const [showPw, setShowPw]     = useState(false);

  // ui state
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setError('Please accept the Terms to continue.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signup(username, email, password);
      const data = await login(email, password);
      onSignup(data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* header */}
      <div className="space-nav">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl sm:text-2xl font-bold text-gradient truncate">
              Novana Universe
            </span>
            <span className="hidden sm:block text-xs text-gray-400">Welcome</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="space-button text-xs sm:text-sm px-3 sm:px-4 py-2">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* spacer below fixed header */}
      <div className="h-4 sm:h-6" />

      {/* main */}
      <main className="min-h-screen px-4 pt-12 sm:pt-14 z-10 relative overflow-hidden">
        {/* ambient halos (not a card) */}
        <div className="pointer-events-none absolute -top-24 -right-20 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 w-[30rem] h-[30rem] rounded-full bg-star/15 blur-3xl" />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* left: welcome hero (no card) */}
          <section className="lg:col-span-6">
            <div className="relative">
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                <span className="text-gradient">Welcome aboard,</span>
                <br className="hidden sm:block" />
                the memory ship 🚀
              </h1>
              <p className="text-gray-300/90 text-sm sm:text-base max-w-prose mt-4">
                Capture stories, save keepsakes, and share moments with the people who matter.
                Start your constellation today—one memory at a time.
              </p>

              {/* benefits */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-lg">🌟</div>
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
                  <div className="text-lg">✨</div>
                  <div className="font-semibold mt-1">Calm & Timeless</div>
                  <div className="text-xs text-gray-400 mt-1">
                    A peaceful place to revisit and remember.
                  </div>
                </div>
              </div>

              {/* steps */}
              <div className="mt-10">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Getting started</div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="glass-chip">1. Create account</span>
                  <span className="glass-chip">2. Add a loved one</span>
                  <span className="glass-chip">3. Drop your first memory</span>
                </div>
              </div>
            </div>
          </section>

          {/* right: form (clean, sectioned, no card) */}
          <section className="lg:col-span-6">
            <div className="max-w-md lg:ml-auto">
              <div className="text-center">
                <div className="text-3xl mb-2">🌌</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gradient">
                  Create your account
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  It's free and takes less than a minute.
                </p>
              </div>

              <div className="mt-6 border-t border-white/10" />

              {error && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs text-gray-400 mb-1" htmlFor="name">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="space-input w-full"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="space-input w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="you@planet.com"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      className="space-input w-full pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7 0-1.032.375-2 1-2.825M6.219 6.219A9.955 9.955 0 0112 5c5 0 9 4 9 7 0 1.07-.388 2.067-1.055 2.915M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-400 select-none">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-white/10"
                  />
                  I agree to the <span className="underline cursor-pointer">Terms</span> and{' '}
                  <span className="underline cursor-pointer">Privacy</span>.
                </label>

                <button type="submit" className="space-button-primary w-full" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating account…
                    </div>
                  ) : (
                    'Create account'
                  )}
                </button>

                <div className="text-center pt-2">
                  <p className="text-gray-400 text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-accent hover:text-accent/80 transition-colors">
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>

              {/* bottom reassurance */}
              <div className="mt-6 text-[11px] text-gray-500 text-center">
                You can invite family & friends after sign-up. No spam, ever.
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* footer */}
      <footer className="w-full border-t border-white/10 px-4 sm:px-6 py-4 text-center text-[12px] text-gray-400">
        © {new Date().getFullYear()} — All rights reserved • created by <span className="text-gradient font-semibold">A_ATWA</span>
      </footer>
    </>
  );
};

export default SignupPage;
