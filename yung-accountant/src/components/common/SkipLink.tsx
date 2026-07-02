import React from 'react';

/**
 * SkipLink — Primer elemento focusable en la aplicación.
 * Permite a usuarios de teclado saltar directamente al contenido principal.
 * Visible solo al recibir foco (estilo sr-only hasta :focus).
 */
const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className={`
        fixed top-3 left-3 z-[10000]
        px-5 py-3 rounded-xl
        text-sm font-medium
        bg-[var(--theme-background-glass)] text-[var(--theme-text-primary)]
        border border-[var(--theme-border-medium)]
        shadow-[var(--shadow-glass-md)]
        backdrop-blur-xl
        transition-all duration-300
        -translate-y-32 focus:translate-y-0
        outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2
      `}
      style={{
        clip: 'rect(0 0 0 0)',
        clipPath: 'inset(50%)',
        height: '1px',
        overflow: 'hidden',
        position: 'absolute',
        whiteSpace: 'nowrap',
        width: '1px',
      }}
      onFocus={(e) => {
        // Remove sr-only clipping on focus so it becomes visible
        const el = e.currentTarget;
        el.style.clip = 'auto';
        el.style.clipPath = 'none';
        el.style.height = 'auto';
        el.style.overflow = 'visible';
        el.style.position = 'fixed';
        el.style.whiteSpace = 'normal';
        el.style.width = 'auto';
      }}
      onBlur={(e) => {
        // Re-apply sr-only clipping on blur
        const el = e.currentTarget;
        el.style.clip = 'rect(0 0 0 0)';
        el.style.clipPath = 'inset(50%)';
        el.style.height = '1px';
        el.style.overflow = 'hidden';
        el.style.position = 'absolute';
        el.style.whiteSpace = 'nowrap';
        el.style.width = '1px';
      }}
    >
      Skip to main content
    </a>
  );
};

export default SkipLink;
