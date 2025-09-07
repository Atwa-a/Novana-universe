
import React, { useEffect, useState } from 'react';
import { getPersons, getPerson } from '../utils/api';
import PersonCard from './PersonCard';
import ChatSection from './ChatSection';
import MemoryStar from './MemoryStar';
import AddPersonModal from './AddPersonModal';
import AddMemoryModal from './AddMemoryModal';
import MemoryModal from './MemoryModal';
import InviteCollaboratorModal from './InviteCollaboratorModal';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';

interface DashboardPageProps {
  token: string;
  onLogout: () => void;
}

interface Person {
  id: number;
  name: string;
  relationship?: string;
  birth_date?: string | null;
  death_date?: string | null;
  photo?: string | null;
  role?: string; 
}

interface Memory {
  id: number;
  title: string;
  description?: string;
  type: string;
  file_path?: string | null;
  date?: string | null;
  is_private?: boolean;
  created_at?: string;
}

interface PersonWithMemories extends Person {
  memories: Memory[];
}

const DashboardPage: React.FC<DashboardPageProps> = ({ token, onLogout }) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonWithMemories | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [loadingPersons, setLoadingPersons] = useState(false);
  const [loadingPersonDetails, setLoadingPersonDetails] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const navigate = useNavigate();

  const loadPersons = async () => {
    setLoadingPersons(true);
    try {
      
      const data = await getPersons();
      setPersons(data);
      if (!selectedPerson && data.length > 0) {
        loadPersonDetails(data[0].id);
      }
    } catch {
      setPersons([]);
    } finally {
      setLoadingPersons(false);
    }
  };

  const loadPersonDetails = async (personId: number) => {
    setLoadingPersonDetails(true);
    try {
      
      const data = await getPerson(personId);
      setSelectedPerson(data);
    } catch {
      setSelectedPerson(null);
      if (persons.length > 0) {
        const first = persons.find((p) => p.id !== personId);
        if (first) loadPersonDetails(first.id);
      }
    } finally {
      setLoadingPersonDetails(false);
    }
  };

  useEffect(() => {
    loadPersons();
   
  }, [token]);

  useEffect(() => {
    if (selectedPerson && persons.length > 0) {
      const ok = persons.find((p) => p.id === selectedPerson.id);
      if (!ok && persons.length > 0) {
        loadPersonDetails(persons[0].id);
      }
    }
    
  }, [persons, selectedPerson]);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleMemorySelect = (memory: Memory) => setSelectedMemory(memory);

  return (
    <div className="h-screen max-h-screen flex flex-col z-10 relative overflow-hidden">
      {/* Top navigation bar */}
      <div className="space-nav">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-4 sm:px-6 py-3 sm:py-4 gap-3">
          {/* Brand + status */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gradient truncate">
              Novana Universe
            </h1>
            {selectedPerson && (
              <div className="text-xs sm:text-sm text-gray-400 truncate">
                Exploring {selectedPerson.name}&apos;s memories
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowAddPerson(true)}
                className="space-button-primary text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
              >
                + Person
              </button>

              <button
                onClick={() => {
                  if (!selectedPerson) {
                    alert('Select a person first'); // why: prevent silent no-op
                    return;
                  }
                  setShowAddMemory(true);
                }}
                className="space-button-primary text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
              >
                + Memory
              </button>

              {selectedPerson && selectedPerson.role === 'owner' && (
                <button
                  onClick={() => setShowInvite(true)}
                  className="space-button text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
                >
                  Invite
                </button>
              )}

              <button
                onClick={() => navigate('/profile')}
                className="space-button text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
              >
                Profile
              </button>

              <button
                onClick={handleLogout}
                className="space-button bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden pt-20 sm:pt-24">
        {/* Loved Ones */}
        <div className="w-full lg:w-80 p-3 sm:p-4 space-y-3 sm:space-y-4 lg:space-y-4">
          <div className="glass-card p-3 sm:p-4 floating">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Loved Ones</h2>

            <div className="mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="space-input w-full text-xs sm:text-sm"
              />
            </div>

            {loadingPersons && (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-accent" />
              </div>
            )}

            {!loadingPersons && persons.length === 0 && (
              <div className="text-center py-6 sm:py-8">
                <div className="text-gray-400 mb-2 text-2xl sm:text-3xl">✨</div>
                <p className="text-sm text-gray-400">No loved ones yet</p>
                <p className="text-xs text-gray-500 mt-1">Add one to begin your journey</p>
              </div>
            )}

            {/* First 5 visible; then this list scrolls */}
            <div className="space-y-2 sm:space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {persons
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (p.relationship &&
                      p.relationship.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map((p) => (
                  <PersonCard
                    key={p.id}
                    person={p}
                    selected={selectedPerson?.id === p.id}
                    onSelect={() => loadPersonDetails(p.id)}
                  />
                ))}
            </div>
          </div>
        </div>

        {/* Star map */}
        <div className="flex-1 relative min-h-96 lg:min-h-0">
          {loadingPersonDetails && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="glass-card p-6 sm:p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-accent mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-300 text-sm sm:text-base">Loading memories...</p>
              </div>
            </div>
          )}

          {selectedPerson && !loadingPersonDetails && (
            <>
              {selectedPerson.memories.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="glass-card p-6 sm:p-8 text-center max-w-md">
                    <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">✨</div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                      No memories yet for {selectedPerson.name}
                    </h3>
                    <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
                      Add your first memory to light up the sky
                    </p>
                    <button
                      onClick={() => setShowAddMemory(true)}
                      className="space-button-primary text-sm sm:text-base"
                    >
                      Create First Memory
                    </button>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-0">
                    {selectedPerson.memories.map((memory, idx) => (
                      <MemoryStar
                        key={memory.id}
                        memory={memory}
                        index={idx}
                        onSelect={handleMemorySelect}
                      />
                    ))}
                  </div>

                  {/* Add Memory FAB */}
                  <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 z-10">
                    <button
                      onClick={() => setShowAddMemory(true)}
                      className="space-button-primary rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shadow-2xl hover:shadow-accent/50 transition-all duration-300 hover:scale-110"
                      title="Add Memory"
                    >
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat column */}
        {selectedPerson && (
          <div className="w-full lg:w-80 p-3 sm:p-4 h-full">
            <div className="floating" style={{ animationDelay: '0.8s' }}>
              {/* Keep token prop as-is if ChatSection expects it */}
              <ChatSection personId={selectedPerson.id} token={token} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 px-4 sm:px-6 py-3 text-center text-[12px] text-gray-400">
        © {new Date().getFullYear()} — All rights reserved • created by <span className="text-gradient font-semibold">A_ATWA</span>
      </footer>

      {/* Modals */}
      <AddPersonModal
        isOpen={showAddPerson}
        onClose={() => setShowAddPerson(false)}
        token={token}
        onPersonCreated={() => loadPersons()}
      />
      {selectedPerson && (
        <AddMemoryModal
          isOpen={showAddMemory}
          onClose={() => setShowAddMemory(false)}
          personId={selectedPerson.id}
          onMemoryCreated={() => loadPersonDetails(selectedPerson.id)}
        />
      )}
      <Modal isOpen={!!selectedMemory} onClose={() => setSelectedMemory(null)}>
        <MemoryModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
      </Modal>

      {selectedPerson && (
        <InviteCollaboratorModal
          isOpen={showInvite}
          onClose={() => setShowInvite(false)}
          token={token}
          personId={selectedPerson.id}
          onInvited={() => loadPersonDetails(selectedPerson.id)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
