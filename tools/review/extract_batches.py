#!/usr/bin/env python3
"""
Découpe le contenu exporté (cartes et exercices écrits à la main, 3 langues)
en lots JSON à relire par un relecteur (humain ou agent IA), selon
tools/review/GUIDE.md.

Usage : python3 tools/review/extract_batches.py <export_dir> <out_dir>
  export_dir : produit par  EXPORT_CONTENT_DIR=… npx jest src/content/__tests__/export.test.ts
  out_dir    : reçoit cards-<n>-<sujet>-<topic>.json et exercises-<n>.json
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

LANGS = ('fr', 'en', 'es')
CARDS_PER_BATCH = 55
EXERCISES_PER_BATCH = 45


def merged_cards(export: Path) -> list[dict]:
    per = {l: {c['id']: c for c in json.load(open(export / f'cards.{l}.json'))} for l in LANGS}
    out = []
    for cid, c in per['fr'].items():
        rec = {'id': cid, 'subject': c['subject'], 'topic': c['topic']}
        for field in ('term', 'definition', 'example'):
            rec[field] = {l: per[l][cid].get(field, '') for l in LANGS}
        if c.get('cloze'):
            rec['cloze'] = {l: per[l][cid].get('cloze', '') for l in LANGS}
        out.append(rec)
    return out


def merged_exercises(export: Path) -> list[dict]:
    per = {l: {e['key']: e for e in json.load(open(export / f'exercises.{l}.json'))} for l in LANGS}
    out = []
    for key, e in per['fr'].items():
        if ':x:' not in key:
            continue  # généré depuis les cartes : relu via les cartes
        rec = {'key': key, 'unitId': e['unitId'], 'kind': e['kind']}
        if e['kind'] == 'qcm':
            rec['prompt'] = {l: per[l][key]['prompt'] for l in LANGS}
            rec['choices'] = {l: per[l][key]['choices'] for l in LANGS}
            rec['answer'] = e['answer']
            rec['explain'] = {l: per[l][key].get('explain', '') for l in LANGS}
            if e.get('code'):
                rec['code'] = e['code']
        elif e['kind'] == 'order':
            rec['prompt'] = {l: per[l][key]['prompt'] for l in LANGS}
            rec['steps'] = {l: per[l][key]['steps'] for l in LANGS}
            rec['explain'] = {l: per[l][key].get('explain', '') for l in LANGS}
        elif e['kind'] == 'case':
            rec['title'] = {l: per[l][key]['title'] for l in LANGS}
            rec['scenario'] = {l: per[l][key]['scenario'] for l in LANGS}
            rec['steps'] = {l: per[l][key]['steps'] for l in LANGS}
        else:
            rec['raw'] = {l: per[l][key] for l in LANGS}
        out.append(rec)
    return out


def chunks(items: list, n: int) -> list[list]:
    if not items:
        return []
    k = max(1, round(len(items) / n))
    size = -(-len(items) // k)
    return [items[i:i + size] for i in range(0, len(items), size)]


def main() -> None:
    export, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    cards = merged_cards(export)
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for c in cards:
        groups[(c['subject'], c['topic'])].append(c)
    # Les petits sous-thèmes d'une même matière sont regroupés.
    batches: list[tuple[str, list[dict]]] = []
    pending: dict[str, list[dict]] = defaultdict(list)
    for (subject, topic), items in sorted(groups.items()):
        if len(items) >= 30:
            for i, part in enumerate(chunks(items, CARDS_PER_BATCH)):
                batches.append((f'{subject}-{topic}-{i + 1}', part))
        else:
            pending[subject].extend(items)
    for subject, items in pending.items():
        for i, part in enumerate(chunks(items, CARDS_PER_BATCH)):
            batches.append((f'{subject}-divers-{i + 1}', part))
    n = 0
    for name, part in batches:
        n += 1
        (out / f'cards-{n:02d}-{name}.json').write_text(json.dumps(part, ensure_ascii=False, indent=1))
    exercises = merged_exercises(export)
    exercises.sort(key=lambda e: e['key'])
    m = 0
    for part in chunks(exercises, EXERCISES_PER_BATCH):
        m += 1
        (out / f'exercises-{m:02d}.json').write_text(json.dumps(part, ensure_ascii=False, indent=1))
    print(f'{len(cards)} cartes → {n} lots ; {len(exercises)} exercices écrits → {m} lots ; dossier {out}')


if __name__ == '__main__':
    main()
