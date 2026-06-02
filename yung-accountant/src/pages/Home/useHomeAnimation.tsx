// pages/Home/useHomeAnimation.ts
import { useEffect, useRef, useState } from 'react';

export const useHomeAnimation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const hasScrolled = window.scrollY > 50;
      setScrolled(hasScrolled);
      
      // Ocultar el scroll indicator después del primer scroll
      if (window.scrollY > 10 && showScrollIndicator) {
        setShowScrollIndicator(false);
      }
      
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showScrollIndicator]);

  return { scrolled, heroRef, showScrollIndicator };
};