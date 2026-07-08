// components/common/Carousel.tsx
import React, { useState, useRef, useCallback } from 'react';

interface CarouselProps {
  children: React.ReactNode[];
  className?: string;
}

export const Carousel: React.FC<CarouselProps> = ({ children, className = '' }) => {
  const [active, setActive] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const total = React.Children.count(children);

  const goTo = useCallback((next: number) => {
    setActive(next);
  }, []);

  const prev = () => goTo(active === 0 ? total - 1 : active - 1);
  const next = () => goTo(active === total - 1 ? 0 : active + 1);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) next();
      else prev();
    }
  };

  if (total === 0) return null;

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-3xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {React.Children.map(children, (child, i) => (
            <div key={i} className="w-full flex-shrink-0 px-1">
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === active ? 20 : 6,
                height: 6,
                background: i === active ? 'var(--theme-primary)' : 'rgba(255,255,255,0.12)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Carousel;
