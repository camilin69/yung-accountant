import { useEffect } from 'react';

const DEFAULT_DESC =
  'App de finanzas personales gratis. Gestiona billeteras, transacciones, deudas, metas de ahorro, hábitos y más. Controla tu dinero desde un solo lugar.';

export function useDocumentTitle(title: string, description?: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Yung Accountant`;

    // Set meta description
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description || DEFAULT_DESC);

    return () => {
      document.title = previous;
    };
  }, [title, description]);
}
