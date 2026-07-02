import { useState, useEffect, useRef } from 'react';

/**
 * useCountUp — Animated number counting from 0 to target.
 * Uses requestAnimationFrame with easeOutExpo easing.
 *
 * @param target - The final number to count to
 * @param duration - Animation duration in ms (default 1500)
 * @param enabled - Whether the animation should run (default true)
 * @returns The current display value during animation
 */
export function useCountUp(
  target: number,
  duration: number = 1500,
  enabled: boolean = true
): number {
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayValue(target);
      return;
    }

    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const current = startValueRef.current + (target - startValueRef.current) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration, enabled]);

  return displayValue;
}
