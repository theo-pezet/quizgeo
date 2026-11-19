import type { Exercise } from '@/game';

import { DEMO_HTML, buildSandboxDoc, sandboxSource } from '../sandbox';

const base = { key: 'k', unitId: 'u' };

describe('bac à sable', () => {
  it('reprend le code des exercices qui peuvent tourner', () => {
    const qcm: Exercise = { ...base, kind: 'qcm', prompt: 'p', choices: ['a', 'b'], answer: 0, code: { lang: 'css', src: 'h1 { color: red; }' } };
    expect(sandboxSource(qcm)).toEqual({ lang: 'css', code: 'h1 { color: red; }' });
    expect(sandboxSource({ ...qcm, code: { lang: 'python', src: 'print(1)' } })).toBeNull();
    expect(sandboxSource({ ...qcm, code: undefined })).toBeNull();

    const bug: Exercise = { ...base, kind: 'bugline', prompt: 'p', lang: 'js', lines: ['let a = 1;', 'consol.log(a);'], answer: 1 };
    expect(sandboxSource(bug)).toEqual({ lang: 'js', code: 'let a = 1;\nconsol.log(a);' });
    expect(sandboxSource({ ...bug, lang: 'python' })).toBeNull();

    const compose: Exercise = { ...base, kind: 'compose', prompt: 'p', lang: 'css', tokens: ['p', '{', 'color', ':', 'gray', ';', '}'], extra: [] };
    expect(sandboxSource(compose)).toEqual({ lang: 'css', code: 'p { color : gray ; }' });
    // Une simple déclaration CSS, sans sélecteur, ne s'affiche pas.
    expect(sandboxSource({ ...compose, tokens: ['font-size', ':', '20px', ';'] })).toBeNull();
    expect(sandboxSource({ ...compose, lang: 'js', tokens: ['console.log', '(', '3', ')'] })).toEqual({ lang: 'js', code: 'console.log ( 3 )' });
    expect(sandboxSource({ ...compose, lang: 'python' })).toBeNull();

    expect(sandboxSource({ ...base, kind: 'order', prompt: 'p', steps: ['a', 'b', 'c'] })).toBeNull();
  });

  it('construit une page par langage, sans laisser le code fermer sa balise', () => {
    const css = buildSandboxDoc({ lang: 'css', code: 'h1 { color: red; } </style><b>x</b>' });
    expect(css).toContain('h1 { color: red; }');
    expect(css).toContain('<\\/style>');
    expect(css).toContain(DEMO_HTML);

    const html = buildSandboxDoc({ lang: 'html', code: '<p>Hi</p>' });
    expect(html).toContain('<body><p>Hi</p></body>');
    expect(html).toContain('ReactNativeWebView');

    const js = buildSandboxDoc({ lang: 'js', code: 'console.log("</script>")' });
    expect(js).toContain('<\\/script>');
    expect(js).toContain('try {');
    expect(js).toContain(DEMO_HTML);
  });
});
