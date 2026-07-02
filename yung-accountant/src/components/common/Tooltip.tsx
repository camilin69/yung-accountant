import React, { useState, useRef, useCallback, useEffect } from 'react';
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
 */
const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'bottom',
  delay = 400,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).slice(2, 9)}`);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  const clearTimer = useCallback(() => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
  }, []);

  const show = useCallback(() => {
    if (isTouchDevice) return;
    clearTimer();
    showTimer.current = setTimeout(() => setVisible(true), delay);
  }, [delay, isTouchDevice, clearTimer]);

  const hide = useCallback(() => { clearTimer(); setVisible(false); }, [clearTimer]);

  useEffect(() => { return clearTimer; }, [clearTimer]);

  const positionStyles: Record<string, React.CSSProperties> = {
    top:    { bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)' },
    left:   { right: 'calc(100% + 10px)', top: '50%', transform: 'translateY(-50%)' },
    right:  { left: 'calc(100% + 10px)', top: '50%', transform: 'translateY(-50%)' },
  };

  const arrowStyles: Record<string, React.CSSProperties> = {
    top:    { bottom: '-5px', left: '50%', marginLeft: '-5px', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid var(--theme-background-glass)' },
    bottom: { top: '-5px', left: '50%', marginLeft: '-5px', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid var(--theme-background-glass)' },
    left:   { right: '-5px', top: '50%', marginTop: '-5px', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '5px solid var(--theme-background-glass)' },
    right:  { left: '-5px', top: '50%', marginTop: '-5px', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '5px solid var(--theme-background-glass)' },
  };

  return (
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
      {visible && !isTouchDevice && (
        <div
          id={tooltipId.current}
          role="tooltip"
          className="absolute z-[10001] px-3 py-1.5 whitespace-nowrap pointer-events-none text-[0.75rem] font-medium rounded-xl select-none animate-fade-in-up"
          style={{
            ...positionStyles[position],
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
        </div>
      )}
    </div>
  );
};

export default Tooltip;
