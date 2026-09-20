#!/usr/bin/env python3
"""
Intègre des exercices « lis le code » (fichiers JSON {"exercises": [...]}) dans
src/data/code.extra.json, après validation. Chaque exercice est rattaché à une
unité EXISTANTE (unitId) et servi en priorité dans ses leçons.

Format d'un exercice (textes en trois langues {"fr","en","es"} ; le code est
identique dans les trois langues) :

  qcm      : key, unitId, kind, prompt, code {lang, src}, choices [L…] (2 à 4),
             answer (index), whyWrong [L|null…] (aligné sur choices, null pour
             la bonne réponse), output (texte affiché par le code, optionnel),
             explain
  vf       : key, unitId, kind, prompt, isTrue, explain
  bugline  : key, unitId, kind, prompt, lang, lines [str…] (2 à 8), answer, explain
  compose  : key, unitId, kind, prompt, lang, tokens [str…] (solution dans
             l'ordre, ≥ 3), extra [str…] (0 à 4 intrus), explain

Clés : `<unitId>:c:<n>` (import PyQuest) ou `<unitId>:w:<n>` (rédaction).
Une clé déjà présente est remplacée (correction), jamais renumérotée.

Usage : python3 tools/integrate_code.py <fichiers.json…>
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'src' / 'data' / 'code.extra.json'
LANGS = ('fr', 'en', 'es')
CODE_LANGS = {'python', 'html', 'css', 'js', 'text'}


def unit_ids() -> set[str]:
    ids = set(re.findall(r"id: '([a-z0-9-]+)'", (ROOT / 'src' / 'content' / 'units.ts').read_text()))
    extra = json.load(open(ROOT / 'src' / 'data' / 'units.extra.json'))
    ids |= {u['unit']['id'] for u in extra['units']}
    return ids


def tri(v, where: str) -> dict:
    if not isinstance(v, dict) or any(l not in v or not isinstance(v[l], str) or not v[l].strip() for l in LANGS):
        raise ValueError(f'{where} : texte trilingue attendu')
    for l in LANGS:
        if v[l].startswith('TODO'):
            raise ValueError(f'{where}.{l} : traduction manquante')
        v[l] = v[l].replace(' — ', ' : ').replace('—', ',').strip()
    return {l: v[l] for l in LANGS}


def validate(e: dict, units: set[str]) -> dict:
    key = e.get('key', '?')
    if not re.fullmatch(r'[a-z0-9-]+:[cw]:\d+', key):
        raise ValueError(f'{key} : clé invalide')
    unit = e.get('unitId')
    if unit not in units or not key.startswith(unit + ':'):
        raise ValueError(f'{key} : unité inconnue {unit}')
    kind = e.get('kind')
    out = {'key': key, 'unitId': unit, 'kind': kind, 'priority': True, 'explain': tri(e.get('explain'), key + '.explain')}
    if kind == 'qcm':
        choices = e.get('choices') or []
        if not 2 <= len(choices) <= 4:
            raise ValueError(f'{key} : 2 à 4 choix')
        out['prompt'] = tri(e.get('prompt'), key + '.prompt')
        out['choices'] = [tri(c, f'{key}.choices[{i}]') for i, c in enumerate(choices)]
        if not isinstance(e.get('answer'), int) or not 0 <= e['answer'] < len(choices):
            raise ValueError(f'{key} : answer hors bornes')
        out['answer'] = e['answer']
        if e.get('code'):
            if e['code'].get('lang') not in CODE_LANGS or not str(e['code'].get('src', '')).strip():
                raise ValueError(f'{key} : code invalide')
            out['code'] = {'lang': e['code']['lang'], 'src': e['code']['src']}
        why = e.get('whyWrong')
        if why is not None:
            if len(why) != len(choices):
                raise ValueError(f'{key} : whyWrong doit avoir {len(choices)} entrées')
            out['whyWrong'] = [None if (i == e['answer'] or w is None) else tri(w, f'{key}.whyWrong[{i}]') for i, w in enumerate(why)]
        if e.get('output') is not None:
            out['output'] = str(e['output'])
        # deux choix identiques = question cassée (la casse compte quand les choix sont du code)
        for l in LANGS:
            norm = (lambda t: t.strip()) if e.get('code') else (lambda t: t.strip().lower())
            if len({norm(c[l]) for c in out['choices']}) != len(choices):
                raise ValueError(f'{key} : choix en double en {l}')
    elif kind == 'vf':
        out['prompt'] = tri(e.get('prompt'), key + '.prompt')
        if not isinstance(e.get('isTrue'), bool):
            raise ValueError(f'{key} : isTrue booléen attendu')
        out['isTrue'] = e['isTrue']
    elif kind == 'bugline':
        lines = e.get('lines') or []
        if not 2 <= len(lines) <= 8 or not all(isinstance(x, str) for x in lines):
            raise ValueError(f'{key} : 2 à 8 lignes')
        if not isinstance(e.get('answer'), int) or not 0 <= e['answer'] < len(lines):
            raise ValueError(f'{key} : answer hors bornes')
        if e.get('lang') not in CODE_LANGS:
            raise ValueError(f'{key} : lang invalide')
        out.update(prompt=tri(e.get('prompt'), key + '.prompt'), lang=e['lang'], lines=lines, answer=e['answer'])
    elif kind == 'compose':
        tokens, extra = e.get('tokens') or [], e.get('extra') or []
        if len(tokens) < 3 or not 0 <= len(extra) <= 4:
            raise ValueError(f'{key} : ≥ 3 morceaux et 0 à 4 intrus')
        if any(x in tokens for x in extra):
            raise ValueError(f'{key} : un intrus est égal à un morceau de la solution')
        if e.get('lang') not in CODE_LANGS:
            raise ValueError(f'{key} : lang invalide')
        out.update(prompt=tri(e.get('prompt'), key + '.prompt'), lang=e['lang'], tokens=tokens, extra=extra)
    else:
        raise ValueError(f'{key} : kind inconnu {kind}')
    return out


def main() -> None:
    units = unit_ids()
    target = json.load(open(TARGET)) if TARGET.exists() else {'exercises': []}
    by_key = {e['key']: e for e in target['exercises']}
    errors = 0
    added = replaced = 0
    for f in sys.argv[1:]:
        data = json.load(open(f, encoding='utf-8'))
        for e in data['exercises']:
            try:
                v = validate(e, units)
            except ValueError as err:
                errors += 1
                print(f'  ! {Path(f).name}: {err}')
                continue
            if v['key'] in by_key:
                replaced += 1
            else:
                added += 1
            by_key[v['key']] = v
    if errors:
        print(f'{errors} exercices refusés, rien écrit')
        sys.exit(1)
    target['exercises'] = sorted(by_key.values(), key=lambda e: (e['unitId'], int(e['key'].rsplit(':', 1)[1])))
    TARGET.write_text(json.dumps(target, ensure_ascii=False) + '\n', encoding='utf-8')
    per_unit: dict[str, int] = {}
    for e in target['exercises']:
        per_unit[e['unitId']] = per_unit.get(e['unitId'], 0) + 1
    print(f'{added} ajoutés, {replaced} remplacés → {len(target["exercises"])} exercices code dans {TARGET.name}')
    print(' ; '.join(f'{u}: {n}' for u, n in sorted(per_unit.items())))


if __name__ == '__main__':
    main()
