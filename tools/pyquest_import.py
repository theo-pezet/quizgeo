#!/usr/bin/env python3
"""
Importe le contenu de PyQuest (application HTML d'un proche de l'auteur,
utilisée avec son accord) : 193 questions « lis le code » et 12 scripts à
auditer, en français. Produit des lots au format attendu par
tools/integrate_code.py, MAIS en français seulement : les champs en/es sont
copiés du français et marqués à traduire ("TODO:" en tête), un agent de
traduction les remplace ensuite.

Usage : python3 tools/pyquest_import.py <pyquest.html> <out_dir>
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

# Unité PyQuest → unité Skilltrail qui reçoit les exercices.
UNIT_MAP = {
    'v': 'py-8',            # Valeurs & opérateurs → Opérateurs
    's': 'py-5',            # Chaînes → Manipuler du texte
    'l': 'py-4',            # Listes → Listes et dictionnaires
    'b': 'py-concepts-1',   # Conditions & booléens → Variables, booléens et None
    'f': 'py-3',            # Boucles → Conditions, boucles, fonctions
    'd': 'py-4',            # Dictionnaires → Listes et dictionnaires
    'n': 'py-3',            # Fonctions → Conditions, boucles, fonctions
    'e': 'py-7',            # Pièges & erreurs → Lire les erreurs
    't': 'py-concepts-2',   # Tuples & ensembles → Collections et compréhensions
    'm': 'py-concepts-2',   # Modules & imports
    'o': 'py-oop-1',        # Objets & classes
    'x': 'py-advanced-1',   # Le Python moderne
    'j': 'py-web-1',        # JSON & données imbriquées
    'w': 'py-13',           # Fichiers
    'r': 'py-12',           # API & requêtes web
    'p': 'py-data-1',       # pandas & numpy
    'h1': 'py-ia-1',        # Les maths de l'IA (numpy) → Python pour l'IA (nouvelle unité)
    'h2': 'py-ia-1',        # Apprendre : la théorie
    'h3': 'py-ia-1',        # Réseaux avec PyTorch
    'h4': 'py-ia-1',        # Texte, LLM & transformers
}

TAG = re.compile(r'</?(?:code|b|i|em|strong|br|span|p)\b[^>]*>')
NBSP = ' '


def clean(html: str) -> str:
    """HTML → texte : <code>x</code> devient « x », <b> disparaît, &nbsp; devient une espace fine."""
    text = re.sub(r'<code>(.*?)</code>', r'« \1 »', html, flags=re.S)
    text = TAG.sub('', text)
    text = text.replace('&nbsp;', NBSP).replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    text = text.replace('« « ', '« ').replace(' » »', ' »')
    return text.replace(' — ', ' : ').replace('—', ',').strip()


def extract(js: str, name: str) -> list:
    """Évalue le tableau JavaScript `const NAME = [...]` avec Node."""
    m = re.search(r'const ' + name + r'\s*=\s*\[', js)
    if not m:
        raise SystemExit(f'{name} introuvable')
    start = m.end() - 1
    depth = 0
    i = start
    in_str = None
    while i < len(js):
        c = js[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == in_str:
                in_str = None
        elif c in '"\'`':
            in_str = c
        elif c == '[':
            depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0:
                break
        i += 1
    literal = js[start:i + 1]
    out = subprocess.run(['node', '-e', 'process.stdout.write(JSON.stringify(' + literal + '))'], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def tri(fr: str) -> dict:
    return {'fr': fr, 'en': 'TODO: ' + fr, 'es': 'TODO: ' + fr}


def convert_item(it: dict, unit: str, n: int) -> dict | None:
    key = f'{unit}:c:{n}'
    base = {'key': key, 'unitId': unit, 'priority': True}
    mode = it['m']
    explain = tri(clean(it['w']))
    if mode in ('qcm', 'trou'):
        choices = [clean(o[0]) for o in it['o']]
        why = [tri(clean(o[1])) if (i != it['k'] and o[1]) else None for i, o in enumerate(it['o'])]
        prompt = clean(it['p']) if it.get('p') else 'Qu’affiche ce code ?'
        out = {**base, 'kind': 'qcm', 'prompt': tri(prompt), 'code': {'lang': 'python', 'src': it['c']}, 'choices': [tri(c) for c in choices], 'answer': it['k'], 'whyWrong': why, 'explain': explain}
        if mode == 'qcm' and not it.get('p'):
            out['output'] = choices[it['k']]
        return out
    if mode == 'vf':
        return {**base, 'kind': 'vf', 'prompt': tri(clean(it['st'])), 'isTrue': bool(it['k']), 'explain': explain}
    if mode == 'bug':
        return {**base, 'kind': 'bugline', 'prompt': tri(clean(it['p'])), 'lang': 'python', 'lines': it['lines'], 'answer': it['k'], 'explain': explain}
    if mode == 'compose':
        return {**base, 'kind': 'compose', 'prompt': tri(clean(it['p'])), 'lang': 'python', 'tokens': it['sol'], 'extra': it.get('extra', []), 'explain': explain}
    return None


def main() -> None:
    src, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    html = src.read_text(encoding='utf-8')
    js = html[html.index('<script>') + 8:html.rindex('</script>')]
    # UNITS est complété plus bas par UNITS.push(...) : on évalue tout le segment.
    seg = js[js.index('const UNITS'):js.index('const SCRIPTS')]
    res = subprocess.run(['node', '-e', seg + '\nprocess.stdout.write(JSON.stringify(UNITS))'], capture_output=True, text=True, check=True)
    units = json.loads(res.stdout)
    scripts = extract(js, 'SCRIPTS')

    per_unit: dict[str, list[dict]] = {}
    counters: dict[str, int] = {}
    for u in units:
        target = UNIT_MAP[u['id']]
        for it in u['items']:
            counters[target] = counters.get(target, 0) + 1
            ex = convert_item(it, target, counters[target])
            if ex:
                per_unit.setdefault(target, []).append(ex)
    for unit, items in per_unit.items():
        (out_dir / f'pyquest-{unit}.json').write_text(json.dumps({'exercises': items}, ensure_ascii=False, indent=1))

    # Les 12 scripts à auditer forment une unité à part : « L'IA t'a écrit ça ».
    audit = []
    for n, s in enumerate(scripts, 1):
        choices = [clean(o[0]) for o in s['o']]
        why = [tri(clean(o[1])) if (i != s['k'] and o[1]) else None for i, o in enumerate(s['o'])]
        audit.append({
            'key': f'py-audit-1:c:{n}', 'unitId': 'py-audit-1', 'priority': True, 'kind': 'qcm',
            'prompt': tri(f"{clean(s['t'])}. {clean(s['p'])}"),
            'code': {'lang': 'python', 'src': s['c']},
            'choices': [tri(c) for c in choices], 'answer': s['k'], 'whyWrong': why, 'explain': tri(clean(s['w'])),
        })
    (out_dir / 'pyquest-py-audit-1.json').write_text(json.dumps({'exercises': audit}, ensure_ascii=False, indent=1))
    total = sum(len(v) for v in per_unit.values())
    print(f'{total} exercices sur {len(per_unit)} unités + {len(audit)} scripts à auditer → {out_dir}')
    for unit, items in sorted(per_unit.items()):
        print(f'  {unit}: {len(items)}')


if __name__ == '__main__':
    main()
