import React from 'react';
import { getFileUrl } from '../utils/api';

interface Person {
  id: number;
  name: string;
  relationship?: string;
  photo?: string | null;
  
  role?: string;
}

interface PersonCardProps {
  person: Person;
  selected: boolean;
  onSelect: () => void;
}

const PersonCard: React.FC<PersonCardProps> = ({ person, selected, onSelect }) => {
  const photoUrl = getFileUrl(person.photo);

  return (
    <button
      onClick={onSelect}
      className={`glass-card p-3 sm:p-4 transition-all duration-300 w-full text-left group ${
        selected 
          ? 'bg-accent/20 border-accent/50 shadow-lg shadow-accent/20' 
          : 'hover:bg-white/20 hover:border-white/30 hover:scale-105'
      }`}
    >
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={person.name}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-glass-border group-hover:border-accent/50 transition-colors duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-accent/40 to-star/40 flex items-center justify-center border-2 border-glass-border group-hover:border-accent/50 transition-colors duration-300">
              <span className="text-sm sm:text-lg font-bold text-white">{person.name.charAt(0)}</span>
            </div>
          )}
          
          
          <div className="hidden w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-accent/40 to-star/40 flex items-center justify-center border-2 border-glass-border">
            <span className="text-sm sm:text-lg font-bold text-white">{person.name.charAt(0)}</span>
          </div>
          
          
          {selected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-accent rounded-full flex items-center justify-center">
              <svg className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        
        {/* Person info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate group-hover:text-accent transition-colors duration-300 text-sm sm:text-base">
            {person.name}
          </div>
          {person.relationship && (
            <div className="text-xs text-gray-400 truncate mt-0.5">
              {person.relationship}
            </div>
          )}
          {/* Display role if provided and not owner */}
          {person.role && person.role !== 'owner' && (
            <div className="text-xs text-teal-400 mt-0.5 capitalize">
              {person.role}
            </div>
          )}
        </div>
        
        {/* Arrow indicator */}
        <div className={`transition-transform duration-300 flex-shrink-0 ${selected ? 'rotate-90' : 'group-hover:translate-x-1'}`}>
          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
};

export default PersonCard;