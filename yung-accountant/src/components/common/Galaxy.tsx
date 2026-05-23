// /src/components/common/Galaxy.tsx
import React, { useMemo } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  type: 'static' | 'twinkle' | 'shooting';
}

const Galaxy: React.FC = () => {
  const stars = useMemo<Star[]>(() => {
    const generated: Star[] = [];
    
    // Estrellas estáticas (fondo base)
    for (let i = 0; i < 80; i++) {
      generated.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        duration: 0,
        delay: 0,
        type: 'static',
      });
    }
    
    // Estrellas titilantes (efecto Van Gogh)
    for (let i = 80; i < 130; i++) {
      generated.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 3,
        type: 'twinkle',
      });
    }
    
    // Estrellas fugaces
    for (let i = 130; i < 138; i++) {
      generated.push({
        id: i,
        x: Math.random() * 90 + 5,
        y: Math.random() * 80 + 5,
        size: Math.random() * 2 + 1,
        opacity: 0,
        duration: Math.random() * 4 + 3,
        delay: Math.random() * 8,
        type: 'shooting',
      });
    }
    
    return generated;
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Fondo galáctico base */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, var(--theme-background-glass-hover) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, var(--theme-background-glass) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 80%, var(--theme-background-glass-hover) 0%, transparent 45%)
          `,
        }}
      />
      
      {/* Estrellas */}
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            background: `radial-gradient(circle, var(--theme-text-primary) 0%, transparent 70%)`,
            boxShadow: star.type === 'twinkle' 
              ? `0 0 ${star.size * 3}px ${star.size}px rgba(255,255,255,0.04)`
              : 'none',
            animation: star.type === 'twinkle'
              ? `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`
              : star.type === 'shooting'
              ? `shooting ${star.duration}s linear ${star.delay}s infinite`
              : 'none',
          }}
        />
      ))}
      
      {/* Estilo para keyframes */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.7); }
          30% { opacity: 0.9; transform: scale(1.4); }
          50% { opacity: 0.3; transform: scale(0.85); }
          70% { opacity: 0.85; transform: scale(1.25); }
          85% { opacity: 0.2; transform: scale(0.75); }
        }
        
        @keyframes shooting {
          0% { 
            opacity: 0; 
            transform: translate(0, 0) scale(1); 
          }
          5% { 
            opacity: 0.9; 
            transform: translate(-30px, 20px) scale(1.5); 
          }
          10% { 
            opacity: 0.6; 
            transform: translate(-80px, 50px) scale(2); 
          }
          15% { 
            opacity: 0; 
            transform: translate(-200px, 120px) scale(3); 
          }
          100% { 
            opacity: 0; 
            transform: translate(-200px, 120px) scale(3); 
          }
        }
      `}</style>
    </div>
  );
};

export default Galaxy;