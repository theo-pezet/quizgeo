/**
 * Le bac à sable de code (écran /sandbox) : modifier le code d'un exercice et
 * voir le résultat en direct. C'est l'étape « Run / Modify » de PRIMM
 * (Sentance et al. 2019) : prédire, exécuter, puis changer le code.
 *
 * Fonctions pures, testées dans __tests__/sandbox.test.ts. L'aperçu lui-même
 * est rendu par features/sandbox/Preview (WebView sur Android, iframe sur le web).
 */

import type { Exercise } from '@/game';

export type SandboxLang = 'css' | 'html' | 'js';

export interface SandboxSource {
  lang: SandboxLang;
  code: string;
}

/**
 * Une petite page de démonstration : les sélecteurs que les exercices CSS et
 * JavaScript utilisent le plus (h1, .card, .price, .cta, #buy, nav a, formulaire…)
 * y trouvent tous un élément.
 */
export const DEMO_HTML = `<nav><a href="#">Home</a> <a href="#">Shop</a></nav>
<h1 class="title">Summer sale</h1>
<h2>Shoes</h2>
<p class="promo">Up to 30% off this week.</p>
<div class="card box">
  <h3>Aero X2</h3>
  <p class="price">49 €</p>
  <button class="cta btn" id="buy">Buy</button>
</div>
<p class="price">99 €</p>
<ul class="list"><li>Free delivery</li><li>30-day returns</li></ul>
<form id="signup"><input id="email" placeholder="Email"> <button id="send">Sign up</button></form>
<p id="count">0</p>`;

const LANGS: readonly string[] = ['css', 'html', 'js'];

function isLang(lang: string): lang is SandboxLang {
  return LANGS.includes(lang);
}

/**
 * Le code d'un exercice, s'il peut tourner dans le bac à sable : bloc de code
 * d'un QCM, lignes d'une « ligne fautive », ou ligne à assembler (CSS seulement
 * si c'est une règle complète, avec ses accolades).
 */
export function sandboxSource(exercise: Exercise): SandboxSource | null {
  switch (exercise.kind) {
    case 'qcm':
      return exercise.code && isLang(exercise.code.lang) ? { lang: exercise.code.lang, code: exercise.code.src } : null;
    case 'bugline':
      return isLang(exercise.lang) ? { lang: exercise.lang, code: exercise.lines.join('\n') } : null;
    case 'compose': {
      if (!isLang(exercise.lang)) return null;
      const code = exercise.tokens.join(' ');
      return exercise.lang === 'css' && !code.includes('{') ? null : { lang: exercise.lang, code };
    }
    default:
      return null;
  }
}

/** Le code ne doit pas pouvoir fermer la balise <script> ou <style> qui l'enveloppe. */
function guard(code: string, tag: 'script' | 'style'): string {
  return code.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);
}

/**
 * Relais de la console : chaque console.log (et chaque erreur) est envoyé à
 * l'appli, par la WebView sur Android, par postMessage sur le web.
 */
const CONSOLE_BRIDGE = `<script>
(function () {
  function send(line) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(line);
    else if (window.parent) window.parent.postMessage({ sandbox: true, line: line }, '*');
  }
  function show(v) {
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  console.log = function () { send(Array.prototype.map.call(arguments, show).join(' ')); };
  window.onerror = function (message) { send('Error: ' + message); };
})();
</script>`;

/** La page complète affichée dans l'aperçu. */
export function buildSandboxDoc(source: SandboxSource): string {
  const head = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
  const base = '<style>body{font-family:system-ui,sans-serif;padding:12px;line-height:1.4}</style>';
  switch (source.lang) {
    case 'css':
      return `${head}${base}<style>${guard(source.code, 'style')}</style></head><body>${DEMO_HTML}</body></html>`;
    case 'html':
      return `${head}${base}${CONSOLE_BRIDGE}</head><body>${source.code}</body></html>`;
    case 'js':
      return `${head}${base}${CONSOLE_BRIDGE}</head><body>${DEMO_HTML}<script>
try {
${guard(source.code, 'script')}
} catch (e) { console.log('Error: ' + e.message); }
</script></body></html>`;
  }
}
