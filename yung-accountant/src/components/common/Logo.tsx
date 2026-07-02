// components/common/Logo.tsx
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', withText = true, className = '' }) => {
  const sizes = {
    sm: { container: 'w-7 h-7', text: 'text-xs' },
    md: { container: 'w-9 h-9', text: 'text-sm' },
    lg: { container: 'w-14 h-14', text: 'text-base' }
  };

  // Obtener colores del tema
  const getThemeColors = () => {
    if (typeof document !== 'undefined') {
      const styles = getComputedStyle(document.documentElement);
      return {
        primary: styles.getPropertyValue('--theme-primary').trim() || '#5B9EFF',
        textPrimary: styles.getPropertyValue('--theme-text-primary').trim() || '#FFFFFF',
        isDark: (document.documentElement.getAttribute('data-theme') || '').includes('dark'),
      };
    }
    return { primary: '#5B9EFF', textPrimary: '#FFFFFF', isDark: true };
  };

  const [colors, setColors] = React.useState(getThemeColors);

  React.useEffect(() => {
    setColors(getThemeColors());
    
    const observer = new MutationObserver(() => {
      setColors(getThemeColors());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    
    return () => observer.disconnect();
  }, []);

  // El color de contraste será blanco en dark y negro en light
  const contrastColor = colors.isDark ? '#FFFFFF' : '#000000';
  const lineOpacity = colors.isDark ? 0.9 : 0.8;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo SVG */}
      <div className={`${sizes[size].container} flex items-center justify-center flex-shrink-0`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full" data-theme-aware>
          <defs>
            <radialGradient id="innerGlow" cx="30%" cy="30%" r="65%">
              <stop offset="0%" stopColor={contrastColor} stopOpacity="0.12" />
              <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
            </radialGradient>
            <filter id="planetShadow">
              <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#000000" floodOpacity="0.35" />
            </filter>
            <filter id="rocketGlow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
            </filter>
            <linearGradient id="flameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={contrastColor} stopOpacity="0.9" />
              <stop offset="35%" stopColor={contrastColor} stopOpacity="0.45" />
              <stop offset="100%" stopColor={contrastColor} stopOpacity="0.02" />
            </linearGradient>
            <filter id="lineShadow">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Anillo orbital trasero */}
          <ellipse cx="50" cy="50" rx="44" ry="14"
            fill="none" stroke={contrastColor} strokeWidth="1.5"
            opacity={colors.isDark ? 0.2 : 0.15}
            transform="rotate(-25, 50, 50)" strokeLinecap="round" />

          {/* Planeta central — COLOR DEL TEMA */}
          <circle cx="50" cy="50" r="32" fill={colors.primary} opacity="0.9"
            filter="url(#planetShadow)" />
          <circle cx="50" cy="50" r="32" fill="url(#innerGlow)" />

          {/* Anillo orbital frontal — Color de contraste */}
          <ellipse cx="50" cy="50" rx="44" ry="14"
            fill="none" stroke={contrastColor} strokeWidth="3.5"
            opacity={lineOpacity}
            transform="rotate(-25, 50, 50)" strokeLinecap="round" />

          {/* Línea de tendencia — Color de contraste */}
          <polyline points="30,70 42,54 54,58 62,40"
            fill="none" stroke={contrastColor} strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round" opacity={lineOpacity}
            filter="url(#lineShadow)" />

          {/* Puntos de datos — Color de contraste */}
          <circle cx="30" cy="70" r="3.5" fill={contrastColor} opacity={colors.isDark ? 0.7 : 0.55} />
          <circle cx="42" cy="54" r="3.5" fill={contrastColor} opacity={colors.isDark ? 0.8 : 0.65} />
          <circle cx="54" cy="58" r="3.5" fill={contrastColor} opacity={colors.isDark ? 0.8 : 0.65} />

          {/* Cohete — Color de contraste */}
          <g transform="translate(73, 25) rotate(-33)" filter="url(#rocketGlow)">
            {/* Llama */}
            <ellipse cx="-12" cy="0" rx="9" ry="5.5" fill="url(#flameGrad)" />
            <ellipse cx="-14" cy="0" rx="6" ry="3.5" fill={contrastColor} opacity={colors.isDark ? 0.3 : 0.2} />
            <ellipse cx="-16" cy="0" rx="3.5" ry="2" fill={contrastColor} opacity={colors.isDark ? 0.15 : 0.1} />

            {/* Cuerpo del cohete */}
            <path d="M0,-7.5 L15,0 L0,7.5 Z" fill={contrastColor} />

            {/* Ventana — Color del tema */}
            <circle cx="5.5" cy="0" r="2.5" fill={colors.primary} opacity="0.9" />
            <circle cx="5.5" cy="0" r="1.2" fill={contrastColor} opacity="0.6" />

            {/* Aletas */}
            <path d="M8,-6.5 L16,-7.5 L12,-2 Z" fill={contrastColor} />
            <path d="M8,6.5 L16,7.5 L12,2 Z" fill={contrastColor} />
          </g>
        </svg>
      </div>

      {withText && (
        <div>
          <h1 className={`${sizes[size].text} font-medium tracking-[-0.01em]`} style={{ color: 'var(--theme-text-primary)' }}>
            Yung Accountant
          </h1>
          <p className="text-[9px] hidden sm:block font-medium tracking-[0.04em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>
            Track. Save. Grow.
          </p>
        </div>
      )}
    </div>
  );
};