#!/usr/bin/env python3
"""
Applique les corrections produites à la relecture (fichiers *.fixes.json au
format de tools/review/GUIDE.md) dans les sources du contenu :

  cartes du deck Excel   → src/data/deck.json (en), src/data/i18n/deck.fr.json, deck.es.json
  cartes manuelles       → src/content/cards.extra.ts (fr, remplacement littéral),
                           src/data/i18n/xcards.en.json, xcards.es.json
  cartes des unités JSON → src/data/units.extra.json (3 langues en place)
  exercices extras.ts    → src/content/extras.ts (fr, remplacement littéral),
                           src/data/i18n/extras.en.json, extras.es.json
  exercices JSON         → src/data/units.extra.json
  groupes confondables   → tools/review/confusables.manual.json

Usage : python3 tools/review/apply_fixes.py <export_dir> <fixes_dir>
  export_dir : l'export JSON du contenu AVANT correction (anciennes valeurs
               françaises, nécessaires pour retrouver les littéraux TypeScript)
  fixes_dir  : dossier contenant les *.fixes.json
Relancer ensuite tools/build_confusables.py, puis npm test.
"""
from __future__ import annotations

import glob
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'src' / 'data'
LANGS = ('fr', 'en', 'es')
CARD_FIELDS = ('term', 'definition', 'example', 'cloze')

failures: list[str] = []
counts = {'cards': 0, 'exercises': 0, 'confusable': 0, 'fields': 0}


def load(p: Path):
    return json.load(open(p, encoding='utf-8'))


def dump(p: Path, obj, indent=1) -> None:
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=indent) + '\n', encoding='utf-8')


def clean(value):
    """Refuse les tirets cadratins ; normalise les espaces."""
    if isinstance(value, str):
        return value.replace(' — ', ' : ').replace('—', ',').replace('  ', ' ').strip()
    if isinstance(value, list):
        return [clean(v) for v in value]
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    return value


class TsSource:
    """Remplacement de littéraux de chaîne dans un fichier TypeScript."""

    def __init__(self, path: Path):
        self.path = path
        self.text = path.read_text(encoding='utf-8')
        self.changed = False

    @staticmethod
    def literals(value: str) -> list[str]:
        return [
            "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'",
            '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"',
            '`' + value + '`',
        ]

    def replace(self, old: str, new: str, where: str) -> bool:
        if old == new:
            return True
        for lit in self.literals(old):
            n = self.text.count(lit)
            if n == 1:
                quote = lit[0]
                if quote == "'":
                    new_lit = "'" + new.replace('\\', '\\\\').replace("'", "\\'") + "'"
                elif quote == '"':
                    new_lit = '"' + new.replace('\\', '\\\\').replace('"', '\\"') + '"'
                else:
                    new_lit = '`' + new + '`'
                self.text = self.text.replace(lit, new_lit)
                self.changed = True
                return True
            if n > 1:
                failures.append(f'{where}: littéral présent {n} fois dans {self.path.name}')
                return False
        failures.append(f'{where}: littéral introuvable dans {self.path.name} : {old[:60]}…')
        return False

    def save(self) -> None:
        if self.changed:
            self.path.write_text(self.text, encoding='utf-8')


def main() -> None:
    export, fixes_dir = Path(sys.argv[1]), Path(sys.argv[2])
    old_cards = {l: {c['id']: c for c in load(export / f'cards.{l}.json')} for l in LANGS}
    old_ex = {l: {e['key']: e for e in load(export / f'exercises.{l}.json')} for l in LANGS}

    deck = load(DATA / 'deck.json')
    deck_list = deck['cards'] if isinstance(deck, dict) else deck
    deck_by_id = {c['id']: c for c in deck_list}
    deck_i18n = {'fr': load(DATA / 'i18n' / 'deck.fr.json'), 'es': load(DATA / 'i18n' / 'deck.es.json')}
    xcards = {'en': load(DATA / 'i18n' / 'xcards.en.json'), 'es': load(DATA / 'i18n' / 'xcards.es.json')}
    extras_i18n = {'en': load(DATA / 'i18n' / 'extras.en.json'), 'es': load(DATA / 'i18n' / 'extras.es.json')}
    units_extra = load(DATA / 'units.extra.json')
    json_cards = {c['id']: c for u in units_extra['units'] for c in u['cards']}
    json_ex = {e['key']: e for u in units_extra['units'] for e in u['exercises']}
    cards_ts = TsSource(ROOT / 'src' / 'content' / 'cards.extra.ts')
    extras_ts = TsSource(ROOT / 'src' / 'content' / 'extras.ts')
    manual_path = ROOT / 'tools' / 'review' / 'confusables.manual.json'
    manual: list[list[str]] = load(manual_path) if manual_path.exists() else []
    known = {tuple(sorted(g)) for g in manual}

    for f in sorted(glob.glob(str(fixes_dir / '*.fixes.json'))):
        try:
            fx = load(Path(f))
        except Exception as e:  # noqa: BLE001
            failures.append(f'{Path(f).name}: JSON invalide ({e})')
            continue
        name = Path(f).name

        for fix in fx.get('cards', []):
            cid = fix.get('id')
            if cid not in old_cards['fr']:
                failures.append(f'{name}: carte inconnue {cid}')
                continue
            touched = False
            for lang in LANGS:
                changes = fix.get(lang) or {}
                for field, value in changes.items():
                    if field not in CARD_FIELDS or not isinstance(value, str) or not value.strip():
                        failures.append(f'{name}: {cid}.{lang}.{field} ignoré')
                        continue
                    value = clean(value)
                    if field == 'cloze' and '{{c1::' not in value:
                        failures.append(f'{name}: {cid}.{lang}.cloze sans trou, ignoré')
                        continue
                    where = f'{name}:{cid}.{lang}.{field}'
                    if cid in json_cards:
                        if field == 'cloze':
                            continue
                        json_cards[cid][field][lang] = value
                    elif cid in deck_by_id:
                        if lang == 'en':
                            deck_by_id[cid][field] = value
                        else:
                            entry = deck_i18n[lang].setdefault(cid, {})
                            for k in ('term', 'definition', 'example', 'cloze'):
                                if k not in entry and old_cards[lang][cid].get(k):
                                    entry[k] = old_cards[lang][cid][k]
                            entry[field] = value
                    else:  # carte manuelle
                        if lang == 'fr':
                            old = old_cards['fr'][cid].get(field, '')
                            if not cards_ts.replace(old, value, where):
                                continue
                        else:
                            entry = xcards[lang].setdefault(cid, {})
                            for k in ('term', 'definition', 'example'):
                                if k not in entry and old_cards[lang][cid].get(k):
                                    entry[k] = old_cards[lang][cid][k]
                            entry[field] = value
                    counts['fields'] += 1
                    touched = True
            if touched:
                counts['cards'] += 1

        for grp in fx.get('confusable', []):
            ids = [i for i in grp if i in old_cards['fr']]
            if len(ids) < 2:
                continue
            key = tuple(sorted(set(ids)))
            if key not in known:
                known.add(key)
                manual.append(list(key))
                counts['confusable'] += 1

        for fix in fx.get('exercises', []):
            key = fix.get('key')
            if key not in old_ex['fr']:
                failures.append(f'{name}: exercice inconnu {key}')
                continue
            kind = old_ex['fr'][key]['kind']
            touched = False
            for lang in LANGS:
                changes = fix.get(lang) or {}
                for field, value in changes.items():
                    value = clean(value)
                    where = f'{name}:{key}.{lang}.{field}'
                    old_e = old_ex[lang][key]
                    if field in ('choices', 'steps') and (not isinstance(value, list) or len(value) != len(old_e.get(field, []))):
                        failures.append(f'{where}: taille différente, ignoré')
                        continue
                    if field not in ('prompt', 'choices', 'explain', 'steps', 'title', 'scenario'):
                        failures.append(f'{where}: champ ignoré')
                        continue
                    ok = True
                    if key in json_ex:
                        je = json_ex[key]
                        if je['kind'] == 'vf' and field == 'choices':
                            continue
                        if field in ('prompt', 'explain', 'title', 'scenario'):
                            je[field][lang] = value
                        elif field == 'choices':
                            for i, v in enumerate(value):
                                je['choices'][i][lang] = v
                        elif field == 'steps' and je['kind'] == 'order':
                            for i, v in enumerate(value):
                                je['steps'][i][lang] = v
                        elif field == 'steps' and je['kind'] == 'case':
                            for i, st in enumerate(value):
                                for sub in ('prompt', 'feedback'):
                                    if sub in st:
                                        je['steps'][i][sub][lang] = st[sub]
                                if 'choices' in st and len(st['choices']) == len(je['steps'][i]['choices']):
                                    for j, v in enumerate(st['choices']):
                                        je['steps'][i]['choices'][j][lang] = v
                    elif lang == 'fr':
                        if field in ('prompt', 'explain', 'title', 'scenario'):
                            ok = extras_ts.replace(old_e[field], value, where)
                        elif field in ('choices',) or (field == 'steps' and kind == 'order'):
                            for o, v in zip(old_e[field], value):
                                ok = extras_ts.replace(o, v, where) and ok
                        elif field == 'steps' and kind == 'case':
                            for o, st in zip(old_e['steps'], value):
                                for sub in ('prompt', 'feedback'):
                                    if sub in st:
                                        ok = extras_ts.replace(o[sub], st[sub], where) and ok
                                if 'choices' in st:
                                    for oc, nc in zip(o['choices'], st['choices']):
                                        ok = extras_ts.replace(oc, nc, where) and ok
                    else:
                        entry = extras_i18n[lang].setdefault(key, {})
                        if field == 'steps' and kind == 'case':
                            for i, st in enumerate(value):
                                for sub in ('prompt', 'feedback', 'choices'):
                                    if sub in st:
                                        entry['steps'][i][sub] = st[sub]
                        else:
                            entry[field] = value
                    if ok:
                        counts['fields'] += 1
                        touched = True
            if touched:
                counts['exercises'] += 1

    if isinstance(deck, dict):
        deck['cards'] = deck_list
    dump(DATA / 'deck.json', deck)
    dump(DATA / 'i18n' / 'deck.fr.json', deck_i18n['fr'], indent=None)
    dump(DATA / 'i18n' / 'deck.es.json', deck_i18n['es'], indent=None)
    dump(DATA / 'i18n' / 'xcards.en.json', xcards['en'], indent=None)
    dump(DATA / 'i18n' / 'xcards.es.json', xcards['es'], indent=None)
    dump(DATA / 'i18n' / 'extras.en.json', extras_i18n['en'], indent=None)
    dump(DATA / 'i18n' / 'extras.es.json', extras_i18n['es'], indent=None)
    dump(DATA / 'units.extra.json', units_extra, indent=None)
    cards_ts.save()
    extras_ts.save()
    dump(manual_path, manual)
    # Les fichiers traités sont déplacés dans applied/ : le script est incrémental
    # (les remplacements littéraux ne sont pas rejouables).
    applied = fixes_dir / 'applied'
    applied.mkdir(exist_ok=True)
    for f in glob.glob(str(fixes_dir / '*.fixes.json')):
        Path(f).rename(applied / Path(f).name)
    print(f"{counts['cards']} cartes et {counts['exercises']} exercices corrigés ({counts['fields']} champs), {counts['confusable']} groupes confondables ajoutés")
    if failures:
        print(f'{len(failures)} problèmes :')
        for x in failures:
            print(' -', x)


if __name__ == '__main__':
    main()
