
import React, { useState } from 'react';
import Modal from './Modal';
import { inviteCollaborator } from '../utils/api';

interface InviteCollaboratorModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Closes the modal */
  onClose: () => void;
  /** Kept for compatibility; auth comes from axios interceptor */
  token: string;
  /** The person for whom we are inviting a collaborator */
  personId: number;
  /** Optional callback after a successful invite */
  onInvited?: () => void;
}

const InviteCollaboratorModal: React.FC<InviteCollaboratorModalProps> = ({
  isOpen,
  onClose,
  token: _token, // intentionally unused
  personId,
  onInvited,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      
      await inviteCollaborator(personId, email.trim());
      setSuccess('Invitation sent successfully');
      setEmail('');
      if (onInvited) onInvited();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setEmail('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Invite Collaborator</h2>
          <p className="text-gray-400 text-sm sm:text-base">Share this memory space with family & friends</p>
        </div>

        {error && (
          <div className="glass-card p-3 border border-red-500/30">
            <div className="flex items-center text-red-300 text-sm sm:text-base">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="glass-card p-3 border border-green-500/30">
            <div className="flex items-center text-green-300 text-sm sm:text-base">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
              Collaborator Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="name@example.com"
              className="space-input w-full text-sm sm:text-base"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="space-button w-full sm:w-auto text-sm sm:text-base"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="space-button-primary w-full sm:w-auto text-sm sm:text-base"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default InviteCollaboratorModal;
