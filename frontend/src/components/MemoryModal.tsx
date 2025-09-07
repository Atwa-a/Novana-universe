import React from 'react';
import { getFileUrl } from '../utils/api';

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

interface MemoryModalProps {
  memory: Memory | null;
  onClose: () => void;
}


const MemoryModal: React.FC<MemoryModalProps> = ({ memory, onClose }) => {
  if (!memory) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const fileUrl = getFileUrl(memory.file_path);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="border-b border-glass-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 break-words">
              {memory.title}
            </h2>
            {memory.date && (
              <div className="flex items-center text-gray-400 text-sm">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="truncate">{formatDate(memory.date)}</span>
              </div>
            )}
          </div>
          
          {memory.is_private && (
            <div className="flex items-center px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-300 text-xs self-start">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Private
            </div>
          )}
        </div>
      </div>

      {/* Media Content */}
      {fileUrl && (
        <div className="glass-card p-4 sm:p-6">
          {memory.type === 'photo' && (
            <div className="text-center">
              <div className="relative group">
                <img 
                  src={fileUrl} 
                  alt={memory.title} 
                  className="w-full max-w-full h-auto max-h-64 sm:max-h-80 lg:max-h-96 object-contain rounded-xl shadow-2xl mx-auto transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
              </div>
              <div className="hidden text-center mt-4">
                <div className="text-red-300 text-sm mb-2">⚠️ Image could not be loaded</div>
                <div className="text-gray-400 text-xs break-all">{fileUrl}</div>
              </div>
            </div>
          )}
          
          {memory.type === 'video' && (
            <div className="text-center">
              <div className="relative">
                <video 
                  src={fileUrl} 
                  controls 
                  className="w-full max-h-64 sm:max-h-80 lg:max-h-96 rounded-xl shadow-2xl"
                  preload="metadata"
                />
              </div>
              <div className="text-gray-400 text-sm mt-3 flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Video Memory
              </div>
            </div>
          )}
          
          {memory.type === 'audio' && (
            <div className="text-center">
              <div className="glass-card p-6 max-w-md mx-auto">
                <div className="text-4xl mb-4">🎵</div>
                <audio 
                  src={fileUrl} 
                  controls 
                  className="w-full"
                  preload="metadata"
                />
                <div className="text-gray-400 text-sm mt-3 flex items-center justify-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  Audio Memory
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {memory.description && (
        <div className="glass-card p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Description
          </h3>
          <p className="whitespace-pre-line leading-relaxed text-gray-300 text-sm sm:text-base">
            {memory.description}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4 border-t border-glass-border">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
            </svg>
            <span className="capitalize">{memory.type}</span>
          </div>
          
          {fileUrl && (
            <div className="text-xs text-gray-500 max-w-full sm:max-w-xs truncate">
              {fileUrl.split('/').pop()}
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="space-button-primary w-full sm:w-auto"
        >
          Close Memory
        </button>
      </div>
    </div>
  );
};

export default MemoryModal;