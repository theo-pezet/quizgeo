import { createElement, useEffect } from 'react';

/**
 * L'aperçu du bac à sable sur le web : une iframe isolée (scripts autorisés,
 * rien d'autre) qui affiche la page construite par buildSandboxDoc. Les
 * console.log arrivent par postMessage.
 */
export function Preview({ html, onConsole }: { html: string; onConsole?: (line: string) => void }) {
  useEffect(() => {
    if (!onConsole) return undefined;
    const listener = (e: MessageEvent) => {
      const data = e.data as { sandbox?: boolean; line?: unknown } | null;
      if (data && data.sandbox === true && typeof data.line === 'string') onConsole(data.line);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onConsole]);
  return createElement('iframe', {
    title: 'Preview',
    srcDoc: html,
    sandbox: 'allow-scripts',
    style: { border: 0, width: '100%', height: '100%', backgroundColor: '#ffffff', borderRadius: 12 },
  });
}
