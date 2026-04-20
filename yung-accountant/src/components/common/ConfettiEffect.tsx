 // components/common/ConfettiEffect.tsx

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiEffectProps {
  active: boolean;
  onComplete?: () => void;
}

const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ active, onComplete }) => {
  useEffect(() => {
    if (active) {
      // Confeti desde la derecha
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 1, y: 0.5 },
        startVelocity: 15,
        colors: ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#EF4444'],
      });
      
      // Confeti desde la izquierda
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0, y: 0.5 },
          startVelocity: 15,
          colors: ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#EF4444'],
        });
      }, 150);
      
      // Confeti desde arriba
      setTimeout(() => {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { x: 0.5, y: 0 },
          startVelocity: 20,
          colors: ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#EF4444'],
        });
      }, 300);
      
      if (onComplete) {
        setTimeout(onComplete, 1000);
      }
    }
  }, [active, onComplete]);

  return null;
};

export default ConfettiEffect;