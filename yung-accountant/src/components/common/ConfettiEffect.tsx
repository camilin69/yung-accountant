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
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0, y: 0.6 },
        startVelocity: 25,
        colors: ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'],
      });
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 1, y: 0.6 },
        startVelocity: 25,
        colors: ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'],
      });
      
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { x: 0.5, y: 0.5 },
          startVelocity: 30,
          colors: ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        });
      }, 150);
      
      setTimeout(() => {
        confetti({
          particleCount: 200,
          spread: 120,
          origin: { x: 0.5, y: 0.7 },
          startVelocity: 20,
          colors: ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'],
        });
      }, 500);
      
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  return null;
};

export default ConfettiEffect;