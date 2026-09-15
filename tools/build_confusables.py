#!/usr/bin/env python3
"""
Construit src/data/confusables.json : pour chaque carte, les cartes de la même
matière qu'il ne faut JAMAIS proposer comme distracteur (ni comme mot d'une
banque de texte à trous), parce qu'un apprenant pourrait légitimement les
confondre : « Domain Authority » et « Domain Rating », « CTR » et « Taux de
clics », etc.

Deux sources :
  1. heuristique lexicale : un mot significatif commun dans les termes (dans
     n'importe laquelle des trois langues), ou des définitions qui partagent
     au moins 30 % de leurs mots significatifs ;
  2. tools/review/confusables.manual.json : les paires relevées à la
     relecture (liste de listes d'identifiants).

Usage :
  EXPORT_CONTENT_DIR=tools/review/export npx jest src/content/__tests__/export.test.ts
  python3 tools/build_confusables.py tools/review/export   (réécrit src/data/confusables.json)
"""
from __future__ import annotations

import itertools
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src' / 'data'

STOP = set('''
the a an of to in on for and or with by from at as is are be that this it its into
de du des la le les un une et ou en au aux pour par sur avec dans est sont ce cette
ces qui que se son sa ses leur leurs plus sans entre vers chez el los las y o con
para por como del al lo su sus se es son una uno unos unas que más sin sobre entre
via not non no pas vs
'''.split())
# Mots trop génériques pour signaler une confusion à eux seuls.
GENERIC = set('''
marketing digital web site sites page pages contenu content contenido google
donnees donnees data datos taux rate tasa analyse analysis analisis utilisateur
utilisateurs user users usuario usuarios client clients customer customers cliente
clientes campagne campagnes campaign campaigns campana campanas outil outils tool
tools herramienta herramientas modele modeles model models modelo modelos
python code fonction fonctions function functions funcion funciones valeur
valeurs value values valor valores liste listes list lists lista listas texte
text texto fichier fichiers file files archivo archivos ligne lignes line lines
linea lineas nombre number numero type types tipo tipos test tests prueba
recherche search busqueda strategie strategy estrategia produit produits
product products producto productos service services servicio servicios
reseau reseaux network networks red redes social sociaux media medios
advanced avance avanzado ads ad action zero achat compra purchase buy
basics bases basico base fondamentaux fundamentals fundamentos
intro introduction introduccion guide guia mode modo methode method metodo
api apis html css javascript js ia ai
'''.split())

def norm(s: str) -> str:
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return s.lower()

def words(s: str, min_len: int) -> set[str]:
    out = set()
    for w in re.findall(r'[a-z0-9]+', norm(s)):
        if len(w) < min_len or w in STOP:
            continue
        # pluriels simples
        if len(w) > 4 and w.endswith('s'):
            w = w[:-1]
        out.add(w)
    return out

def load_cards(export_dir: Path) -> list[dict]:
    """Lit l'export JSON du contenu localisé (voir src/content/__tests__/export.test.ts)."""
    per_lang = {l: {c['id']: c for c in json.load(open(export_dir / f'cards.{l}.json'))} for l in ('fr', 'en', 'es')}
    cards = []
    for cid, c in per_lang['fr'].items():
        cards.append({
            'id': cid, 'subject': c['subject'], 'topic': c['topic'],
            'term': {l: per_lang[l][cid]['term'] for l in ('fr', 'en', 'es')},
            'definition': {l: per_lang[l][cid]['definition'] for l in ('fr', 'en', 'es')},
        })
    return cards

def main() -> None:
    import sys
    export_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'tools' / 'review' / 'export'
    cards = load_cards(export_dir)
    by_subject: dict[str, list[dict]] = {}
    for c in cards:
        by_subject.setdefault(c['subject'], []).append(c)
    pairs: set[tuple[str, str]] = set()
    reasons: dict[tuple[str, str], str] = {}
    for subject, group in by_subject.items():
        tw = {c['id']: set().union(*(words(c['term'][l], 3) for l in ('fr', 'en', 'es'))) - GENERIC for c in group}
        dw = {c['id']: {l: words(c['definition'][l], 4) for l in ('fr', 'en')} for c in group}
        for a, b in itertools.combinations(group, 2):
            key = tuple(sorted((a['id'], b['id'])))
            shared = tw[a['id']] & tw[b['id']]
            if shared:
                pairs.add(key); reasons[key] = 'term:' + ','.join(sorted(shared)); continue
            for l in ('fr', 'en'):
                x, y = dw[a['id']][l], dw[b['id']][l]
                if x and y:
                    j = len(x & y) / len(x | y)
                    if j >= 0.3:
                        pairs.add(key); reasons[key] = f'def-{l}:{j:.2f}'; break
    manual_path = ROOT / 'tools' / 'review' / 'confusables.manual.json'
    n_manual = 0
    if manual_path.exists():
        for grp in json.load(open(manual_path)):
            for a, b in itertools.combinations(sorted(set(grp)), 2):
                key = (a, b)
                if key not in pairs:
                    n_manual += 1
                pairs.add(key); reasons.setdefault(key, 'manual')
    out: dict[str, list[str]] = {}
    for a, b in sorted(pairs):
        out.setdefault(a, []).append(b)
        out.setdefault(b, []).append(a)
    for k in out:
        out[k] = sorted(set(out[k]))
    (DATA / 'confusables.json').write_text(json.dumps(out, ensure_ascii=False, indent=0, sort_keys=True) + '\n')
    print(f'{len(cards)} cartes, {len(pairs)} paires confondables ({n_manual} manuelles seules)')
    report = ROOT / 'tools' / 'review' / 'confusables.report.txt'
    with open(report, 'w') as f:
        for (a, b), r in sorted(reasons.items(), key=lambda kv: kv[1]):
            f.write(f'{r}\t{a}\t{b}\n')
    print('rapport :', report)

if __name__ == '__main__':
    main()
