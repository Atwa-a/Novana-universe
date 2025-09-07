
import React, { useState } from 'react';
import Modal from './Modal';
import { createMemory } from '../utils/api';

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: number;
  onMemoryCreated: () => void;
}

const AddMemoryModal: React.FC<AddMemoryModalProps> = ({ isOpen, onClose, personId, onMemoryCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (date) formData.append('date', date);
      if (file) formData.append('file', file);
      formData.append('is_private', isPrivate.toString());
      await createMemory(personId, formData); // ❗ no token
      // Reset form
      setTitle(''); setDescription(''); setDate(''); setFile(null); setIsPrivate(false);
      onMemoryCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create memory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Add Memory</h2>
          <p className="text-gray-400 text-sm sm:text-base">Create a new memory to honor and remember</p>
        </div>

        {error && (
          <div className="glass-card p-3 sm:p-4 border border-red-500/30">
            <div className="flex items-center text-red-300 text-sm sm:text-base">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2" htmlFor="title">Title *</label>
            <input id="title" type="text" className="space-input w-full text-sm sm:text-base"
              value={title} onChange={(e) => setTitle(e.target.value)} required disabled={loading} placeholder="Enter memory title" />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2" htmlFor="description">Description</label>
            <textarea id="description" className="space-input w-full resize-none text-sm sm:text-base"
              value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} rows={4}
              placeholder="Share your memory, story, or thoughts..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2" htmlFor="date">Date</label>
              <input id="date" type="date" className="space-input w-full text-sm sm:text-base"
                value={date} onChange={(e) => setDate(e.target.value)} disabled={loading} />
            </div>
            <div className="flex items-center space-x-3 pt-6 sm:pt-8">
              <input id="private" type="checkbox" checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)} disabled={loading}
                className="w-4 h-4 text-accent bg-glass-white border-glass-border rounded focus:ring-accent/50 focus:ring-2" />
              <label htmlFor="private" className="text-sm text-gray-300">Private Memory</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2" htmlFor="file">Attachment (optional)</label>
            <div className="space-y-3">
              <input id="file" type="file" accept="image/*,audio/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={loading}
                className="space-input w-full text-sm sm:text-base file:mr-3 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-medium file:bg-accent/20 file:text-accent hover:file:bg-accent/30 file:cursor-pointer" />
              <div className="text-xs text-gray-400">Supported: Images (JPG, PNG, GIF), Audio (MP3, WAV, M4A), Video (MP4, MOV, AVI)</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="space-button w-full sm:w-auto text-sm sm:text-base" disabled={loading}>Cancel</button>
            <button type="submit" className="space-button-primary w-full sm:w-auto text-sm sm:text-base" disabled={loading}>
              {loading ? 'Saving…' : 'Save Memory'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddMemoryModal;
