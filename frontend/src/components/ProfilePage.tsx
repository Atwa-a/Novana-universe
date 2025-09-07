
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getProfile,
  getPersons,
  deletePerson,
  deleteMemory,
  deleteAccount,
} from '../utils/api';

interface ProfilePageProps {
  token: string;
  onLogout: () => void;
}

interface ProfileData {
  id: number;
  username: string;
  email: string;
  profile_picture: string | null;
  created_at: string;
}

interface Person {
  id: number;
  name: string;
  relationship?: string;
  role?: string;
  memories?: { id: number; title: string }[];
}

const ProfilePage: React.FC<ProfilePageProps> = ({ token, onLogout }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const me = await getProfile();       
        const list = await getPersons();    
        setProfile(me);
        setPersons(list);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleDeletePerson = async (id: number) => {
    if (!window.confirm('Delete this loved one and all their memories?')) return;
    try {
      setBusy(`person:${id}`);
      await deletePerson(id);               
      setPersons((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Failed to delete person');
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteMemory = async (personId: number, memoryId: number) => {
    if (!window.confirm('Delete this memory permanently?')) return;
    try {
      setBusy(`memory:${personId}:${memoryId}`);
      await deleteMemory(personId, memoryId); // ⬅️ no token arg
      setPersons((prev) =>
        prev.map((p) =>
          p.id === personId
            ? { ...p, memories: p.memories?.filter((m) => m.id !== memoryId) }
            : p
        )
      );
    } catch {
      alert('Failed to delete memory');
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('⚠️ This will permanently delete your account and ALL data. Continue?')) return;
    try {
      setBusy('account');
      await deleteAccount();                
      onLogout();
      navigate('/signup');
    } catch {
      alert('Failed to delete account');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="space-nav">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gradient truncate">
              Novana Universe
            </span>
            <span className="hidden sm:block text-xs text-gray-400">Account Center</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="space-button text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="space-button bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="min-h-screen px-4 pt-16 sm:pt-20 z-10 relative">
        {/* Top intro / errors */}
        <div className="max-w-6xl mx-auto mb-6 sm:mb-8">
          {error && (
            <div className="glass-card border border-red-500/30 p-3 sm:p-4 text-red-300 text-sm">
              {error}
            </div>
          )}
          {loading && (
            <div className="glass-card p-6 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mr-3"></div>
              <span className="text-gray-400">Loading profile…</span>
            </div>
          )}
        </div>

        {!loading && profile && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left column — profile summary */}
            <aside className="lg:col-span-4">
              <div className="glass-card p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-accent/40 to-star/40 flex items-center justify-center border-4 border-white/10 shadow-lg">
                    <span className="text-xl sm:text-2xl font-bold">
                      {profile.username.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-semibold text-base sm:text-lg truncate">
                      {profile.username}
                    </div>
                    <div className="text-gray-400 text-sm truncate">{profile.email}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      Member since {new Date(profile.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button onClick={() => navigate('/dashboard')} className="space-button w-full text-sm py-2">
                    Go to Dashboard
                  </button>
                  <button onClick={() => navigate('/contact')} className="space-button w-full text-sm py-2">
                    Contact Us
                  </button>
                </div>

                <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-red-300 font-semibold">Delete Account</div>
                      <div className="text-xs text-red-200/80 mt-1">Permanently remove all data</div>
                    </div>
                    <button
                      disabled={busy === 'account'}
                      onClick={handleDeleteAccount}
                      className="bg-red-500/30 hover:bg-red-500/40 border border-red-500/50 rounded-md px-3 py-2 text-sm"
                    >
                      {busy === 'account' ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            {/* Right column — lists */}
            <section className="lg:col-span-8">
              <header className="mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">Loved Ones</h2>
                <p className="text-gray-400 text-sm">Manage people and their memories.</p>
              </header>

              <div className="divide-y divide-white/10 rounded-xl overflow-hidden border border-white/10">
                {persons.length === 0 && (
                  <div className="p-6 text-center text-gray-400">No loved ones yet.</div>
                )}

                {persons.map((p) => (
                  <div key={p.id} className="bg-white/5 backdrop-blur-sm">
                    <div className="px-4 sm:px-5 py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{p.name}</div>
                        <div className="text-xs text-gray-400 truncate">{p.relationship || '—'}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate('/dashboard')}
                          className="space-button text-xs px-3 py-1.5"
                          title="View in Dashboard"
                        >
                          Open
                        </button>
                        <button
                          disabled={busy === `person:${p.id}`}
                          onClick={() => handleDeletePerson(p.id)}
                          className="space-button bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-xs px-3 py-1.5"
                          title="Delete person"
                        >
                          {busy === `person:${p.id}` ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>

                    {p.memories && p.memories.length > 0 && (
                      <div className="px-4 sm:px-5 pb-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {p.memories.map((m) => (
                            <div key={m.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                              <span className="text-sm truncate mr-3">{m.title}</span>
                              <button
                                disabled={busy === `memory:${p.id}:${m.id}`}
                                onClick={() => handleDeleteMemory(p.id, m.id)}
                                className="text-xs text-red-300 hover:text-red-200"
                              >
                                {busy === `memory:${p.id}:${m.id}` ? '…' : 'Delete'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="glass-card p-4">
                  <div className="text-sm text-gray-300">Want to add or edit profile details?</div>
                  <div className="mt-3">
                    <button onClick={() => navigate('/dashboard')} className="space-button text-sm">
                      Manage in Dashboard
                    </button>
                  </div>
                </div>
                <div className="glass-card p-4">
                  <div className="text-sm text-gray-300">Need help or have feedback?</div>
                  <div className="mt-3">
                    <button onClick={() => navigate('/contact')} className="space-button text-sm">
                      Contact Us
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 px-4 sm:px-6 py-4 text-center text-[12px] text-gray-400 mt-8">
        © {new Date().getFullYear()} — All rights reserved • created by <span className="text-gradient font-semibold">A_ATWA</span>
      </footer>
    </>
  );
};

export default ProfilePage;
