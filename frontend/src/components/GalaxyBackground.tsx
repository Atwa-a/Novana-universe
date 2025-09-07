import React, { useMemo } from 'react';


const GalaxyBackground: React.FC = () => {
  // Generate a fixed set of star coordinates when the component mounts
  const stars = useMemo(() => {
    const count = 200; // Increased star count
    const coords: { x: number; y: number; size: number; delay: number; opacity: number }[] = [];
    for (let i = 0; i < count; i++) {
      coords.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1, // Slightly larger stars
        delay: Math.random() * 4,
        opacity: Math.random() * 0.8 + 0.2, // Varied opacity
      });
    }
    return coords;
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none" aria-hidden="true">
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-primary/50"></div>
      
      {/* Animated stars */}
      {stars.map((star, idx) => (
        <div
          key={idx}
          className="bg-white rounded-full absolute animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            opacity: star.opacity,
            boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, ${star.opacity * 0.5})`,
          }}
        />
      ))}
      
      {/* Occasional shooting stars */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '5s' }}></div>
      <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '8s' }}></div>
    </div>
  );
};

export default GalaxyBackground;