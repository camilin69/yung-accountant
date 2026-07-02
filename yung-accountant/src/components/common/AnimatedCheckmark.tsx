import React, { useEffect, useState } from 'react';

interface AnimatedCheckmarkProps {
  /** Show the checkmark */
  visible: boolean;
  /** Called after the animation completes */
  onComplete?: () => void;
  /** Size in pixels */
  size?: number;
  /** Color (defaults to theme primary) */
  color?: string;
}

/**
 * AnimatedCheckmark — SVG circle-to-checkmark draw animation.
 * Show briefly after successful form submissions or actions.
 */
const AnimatedCheckmark: React.FC<AnimatedCheckmarkProps> = ({
  visible,
  onComplete,
  size = 64,
  color,
}) => {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (visible && !animating) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
        onComplete?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [visible, animating, onComplete]);

  if (!visible && !animating) return null;

  const strokeColor = color || 'var(--theme-primary)';

  return (
    <div className="flex items-center justify-center" aria-hidden="true">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className="animate-scale-in"
      >
        {/* Circle */}
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeDasharray="176"
          strokeDashoffset={animating ? '0' : '176'}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
        {/* Checkmark */}
        <path
          d="M20 32 L28 40 L44 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="48"
          strokeDashoffset={animating ? '0' : '48'}
          style={{
            transition: 'stroke-dashoffset 0.4s 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </svg>
    </div>
  );
};

export default AnimatedCheckmark;
