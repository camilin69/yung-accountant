import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

/**
 * Tooltip — Keyboard-accessible tooltip with star/sparkle accents.
 * Glass-styled, shows on hover + focus, suppressed on touch devices.
 * Renders via portal to document.body with fixed positioning to avoid
 * being clipped by parent overflow/scroll containers.
 */
const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'bottom',
  delay = 400,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false); // positioned before revealing
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [tooltipCoords, setTooltipCoords] = useState({ top: 0, left: 0 });
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).slice(2, 9)}`);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  const clearTimer = useCallback(() => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
  }, []);

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current || !tooltipRef.current) return;
    const triggerRect = wrapperRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 10;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + gap;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + gap;
        break;
    }

    setTooltipCoords({ top, left });
    setReady(true);
  }, [position]);

  const show = useCallback(() => {
    if (isTouchDevice) return;
    clearTimer();
    showTimer.current = setTimeout(() => {
      setReady(false);
      setVisible(true);
      // Position after render — use rAF to let the DOM update first
      requestAnimationFrame(() => requestAnimationFrame(updatePosition));
    }, delay);
  }, [delay, isTouchDevice, clearTimer, updatePosition]);

  const hide = useCallback(() => { clearTimer(); setVisible(false); setReady(false); }, [clearTimer]);

  // Position update on scroll/resize while visible
  useEffect(() => {
    if (!visible) return;
    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, { capture: true, passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleUpdate, { capture: true });
      window.removeEventListener('resize', handleUpdate);
    };
  }, [visible, updatePosition]);

  useEffect(() => { return clearTimer; }, [clearTimer]);

  const arrowStyles: Record<string, React.CSSProperties> = {
    top:    { bottom: '-5px', left: '50%', marginLeft: '-5px', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid var(--theme-background-glass)' },
    bottom: { top: '-5px', left: '50%', marginLeft: '-5px', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid var(--theme-background-glass)' },
    left:   { right: '-5px', top: '50%', marginTop: '-5px', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '5px solid var(--theme-background-glass)' },
    right:  { left: '-5px', top: '50%', marginTop: '-5px', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '5px solid var(--theme-background-glass)' },
  };

  return (
    <>
      <div
        ref={wrapperRef}
        className={`relative inline-flex ${className}`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        onFocus={show}
        onBlur={hide}
        onMouseEnter={show}
        onMouseLeave={hide}
        aria-describedby={visible ? tooltipId.current : undefined}
      >
        {children}
      </div>
      {visible && !isTouchDevice && createPortal(
        <div
          id={tooltipId.current}
          ref={tooltipRef}
          role="tooltip"
          className={`fixed z-[10001] px-3 py-1.5 whitespace-nowrap pointer-events-none text-[0.75rem] font-medium rounded-xl select-none ${ready ? 'animate-fade-in-up' : ''}`}
          style={{
            top: `${tooltipCoords.top}px`,
            left: `${tooltipCoords.left}px`,
            visibility: ready ? 'visible' : 'hidden',
            background: 'var(--theme-background-glass)',
            color: 'var(--theme-text-primary)',
            border: '1px solid var(--theme-border-dark)',
            backdropFilter: 'blur(20px) saturate(var(--glass-saturation, 1.2))',
            WebkitBackdropFilter: 'blur(20px) saturate(var(--glass-saturation, 1.2))',
            boxShadow: 'var(--shadow-glass-md)',
            fontFamily: "'Onest', 'Inter', system-ui, sans-serif",
          }}
        >
          {/* Star accent */}
          <Sparkles className="absolute -top-1.5 -left-1.5 w-3 h-3" style={{ color: 'var(--theme-primary)', opacity: 0.6 }} />
          <Sparkles className="absolute -bottom-1 -right-1 w-2.5 h-2.5" style={{ color: 'var(--theme-accent)', opacity: 0.5 }} />
          {content}
          <span className="absolute block" style={{ ...arrowStyles[position], width: 0, height: 0 }} />
        </div>,
        document.body
      )}
    </>
  );
};

export default Tooltip;
