import React, { useMemo } from 'react';

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

interface MemoryStarProps {
  memory: Memory;
  index: number;
  onSelect: (memory: Memory) => void;
}

/**
 * MemoryStar positions a clickable star with floating/glow animations.
 * Now colors change by memory.type:
 *  - photo/image  -> gold
 *  - video        -> pink/purple
 *  - audio/mp3    -> baby blue
 *  - text/note    -> light green
 *  - default      -> soft white
 */
const MemoryStar: React.FC<MemoryStarProps> = ({ memory, index, onSelect }) => {
  // --- Color palette by type ---
  const palette = useMemo(() => {
    const t = (memory.type || '').toLowerCase().trim();

    if (t.includes('photo') || t.includes('image') || t === 'picture') {
      // gold
      return {
        gradient: 'linear-gradient(135deg, #F5D76E 0%, #FFF2B3 55%, #FFFFFF 100%)',
        ring: 'rgba(245, 215, 110, 0.35)',
        glow: 'rgba(245, 215, 110, 0.55)',
      };
    }
    if (t.includes('video') || t === 'mp4' || t === 'mov') {
      // pink/purple
      return {
        gradient: 'linear-gradient(135deg, #D66BFF 0%, #FFB3FF 55%, #FFFFFF 100%)',
        ring: 'rgba(214, 107, 255, 0.35)',
        glow: 'rgba(214, 107, 255, 0.55)',
      };
    }
    if (t.includes('audio') || t.includes('mp3') || t.includes('sound')) {
      // baby blue
      return {
        gradient: 'linear-gradient(135deg, #7ECBFF 0%, #DFF2FF 55%, #FFFFFF 100%)',
        ring: 'rgba(126, 203, 255, 0.35)',
        glow: 'rgba(126, 203, 255, 0.55)',
      };
    }
    if (t.includes('text') || t.includes('note') || t === 'txt') {
      // light green
      return {
        gradient: 'linear-gradient(135deg, #8DF1A6 0%, #E8FFE9 55%, #FFFFFF 100%)',
        ring: 'rgba(141, 241, 166, 0.35)',
        glow: 'rgba(141, 241, 166, 0.55)',
      };
    }
    // default white
    return {
      gradient: 'linear-gradient(135deg, #FFFFFF 0%, #F2F2F2 55%, #FFFFFF 100%)',
      ring: 'rgba(255, 255, 255, 0.28)',
      glow: 'rgba(255, 255, 255, 0.5)',
    };
  }, [memory.type]);

  // --- Deterministic center-based placement / motion ---
  const centerX = 50;
  const centerY = 50;
  const radius = 20;

  const angle = (index * 137.5) % 360; // golden angle
  const distance = radius * (0.3 + (index * 0.7) % 0.7);

  const x = centerX + Math.cos((angle * Math.PI) / 180) * distance;
  const y = centerY + Math.sin((angle * Math.PI) / 180) * distance;

  const size = 8 + ((index * 23) % 8);      // 8–15 px
  const floatDelay = ((index * 13) % 8) / 2;
  const glowDelay = ((index * 7) % 4) / 2;
  const floatDuration = 8 + ((index * 5) % 4);
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(memory);
  };

  return (
    <button
      onClick={handleClick}
      title={`${memory.title}${memory.date ? ` - ${new Date(memory.date).toLocaleDateString()}` : ''}`}
      className="memory-star group absolute transition-all duration-500 hover:scale-125 hover:z-20"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        animation: `float ${floatDuration}s ease-in-out infinite`,
        animationDelay: `${floatDelay}s`,
        // soft outer glow matching the palette
        boxShadow: `0 0 10px ${palette.glow}, 0 0 22px ${palette.glow}`,
      }}
      aria-label={`Memory: ${memory.title}`}
    >
      <span className="sr-only">{memory.title}</span>

      {/* Main star body */}
      <div
        className="absolute inset-0 rounded-full animate-glow"
        style={{
          background: palette.gradient,
          animationDelay: `${glowDelay}s`,
        }}
      />

      {/* Inner glow pulse */}
      <div className="absolute inset-0 rounded-full opacity-60 animate-pulse" style={{ background: 'rgba(255,255,255,0.65)' }} />

      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full animate-ping"
        style={{
          border: `2px solid ${palette.ring}`,
          animationDelay: `${glowDelay + 1}s`,
        }}
      />

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-4 py-3 bg-black/90 backdrop-blur-md text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-30 border border-white/10 shadow-2xl">
        <div className="font-semibold text-white">{memory.title}</div>
        {memory.date && (
          <div className="text-gray-300 text-xs mt-1">
            {new Date(memory.date).toLocaleDateString()}
          </div>
        )}
        {memory.type && (
          <div className="text-xs mt-1 capitalize" style={{ color: palette.glow }}>
            {memory.type}
          </div>
        )}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
      </div>

      {/* Click/hover highlight */}
      <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-150" />
    </button>
  );
};

export default MemoryStar;
