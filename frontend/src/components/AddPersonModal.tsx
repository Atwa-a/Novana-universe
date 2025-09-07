
import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { createPerson } from '../utils/api';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;            // kept for compatibility; axios interceptor handles auth
  onPersonCreated: () => void;
}

const AddPersonModal: React.FC<AddPersonModalProps> = ({
  isOpen,
  onClose,
  token: _token,            // intentionally unused
  onPersonCreated,
}) => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo must be smaller than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setPhoto(file);
      setError(null);

      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('name', name);
      if (relationship) formData.append('relationship', relationship);
      if (birthDate) formData.append('birth_date', birthDate);
      if (deathDate) formData.append('death_date', deathDate);
      if (photo) formData.append('photo', photo);

      // simple progress simulation for UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      //  no token arg: axios interceptor adds Authorization header
      await createPerson(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // reset form
      setName('');
      setRelationship('');
      setBirthDate('');
      setDeathDate('');
      setPhoto(null);
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      onPersonCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to create person');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Add Loved One</h2>
          <p className="text-gray-400 text-sm sm:text-base">Create a new person to remember and honor</p>
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

        {loading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-300">
              <span>Saving person...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-glass-white rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-accent to-star h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2" htmlFor="name">
              Name *
            </label>
            <input
              id="name"
              type="text"
              className="space-input w-full text-sm sm:text-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter their name"
            />
          </div>

          {/* Relationship */}
          <div>
            <label className="block text-sm font-medium text-white mb-2" htmlFor="relationship">
              Relationship
            </label>
            <input
              id="relationship"
              type="text"
              className="space-input w-full text-sm sm:text-base"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              disabled={loading}
              placeholder="e.g., Mother, Father, Grandmother"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2" htmlFor="birthDate">
                Birth Date
              </label>
              <input
                id="birthDate"
                type="date"
                className="space-input w-full text-sm sm:text-base"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2" htmlFor="deathDate">
                Passing Date
              </label>
              <input
                id="deathDate"
                type="date"
                className="space-input w-full text-sm sm:text-base"
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-white mb-2" htmlFor="photo">
              Photo (max 5MB)
            </label>
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={loading}
                className="space-input w-full text-sm sm:text-base file:mr-3 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-medium file:bg-accent/20 file:text-accent hover:file:bg-accent/30 file:cursor-pointer"
              />

              {photoPreview && (
                <div className="relative inline-block">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl border-2 border-glass-border"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors duration-200"
                    disabled={loading}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
              {loading ? 'Saving…' : 'Save Person'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddPersonModal;
