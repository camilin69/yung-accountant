import { useMediaQuery } from './useMediaQuery';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

interface ResponsiveInfo {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
}

/**
 * useResponsive — Returns the current breakpoint and convenience booleans.
 *
 * Breakpoints:
 * - mobile:  < 480px
 * - tablet:  480px – 1023px
 * - desktop: 1024px – 1399px
 * - wide:    ≥ 1400px
 */
export function useResponsive(): ResponsiveInfo {
  const isWide = useMediaQuery('(min-width: 1400px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 480px)');
  // isMobile is the fallback (< 480px)

  const breakpoint: Breakpoint = isWide
    ? 'wide'
    : isDesktop
    ? 'desktop'
    : isTablet
    ? 'tablet'
    : 'mobile';

  return {
    breakpoint,
    isMobile: !isTablet,
    isTablet: isTablet && !isDesktop,
    isDesktop: isDesktop && !isWide,
    isWide,
  };
}
