import { useEffect, useRef, useCallback } from 'react';

/**
 * useFocusTrap — Traps Tab/Shift+Tab within a container, focuses first element on mount,
 * restores focus to previously focused element on unmount, and calls onClose on Escape.
 *
 * @param containerRef - React ref to the modal/content container
 * @param isActive - Whether the trap is active (typically tied to modal isOpen)
 * @param onClose - Called when Escape is pressed
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  onClose: () => void
): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector));
  }, [containerRef]);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the currently focused element so we can restore later
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable element in the container
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      // Small delay to allow the modal to render
      requestAnimationFrame(() => {
        focusable[0].focus();
      });
    } else {
      // If no focusable elements, focus the container itself
      containerRef.current?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        // Shift+Tab: if we're on the first element, wrap to last
        if (active === first || !containerRef.current?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if we're on the last element, wrap to first
        if (active === last || !containerRef.current?.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that had it before the modal opened
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, containerRef, onClose, getFocusableElements]);
}
