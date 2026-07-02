import { useEffect } from 'react';

/**
 * useDocumentTitle — Sets document.title per route and restores previous on unmount.
 * @param title Page title (appended to " | Yung Accountant")
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Yung Accountant`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
