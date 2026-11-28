#!/usr/bin/env python3
"""Intègre des unités rédigées au format JSON (voir docs/GUIDE-DEV.txt, section
« Ajouter une unité ») dans src/data/units.extra.json, le fichier que l'app
charge au démarrage (src/content/extra.ts).

    python3 tools/integrate_units.py chemin/vers/dossier/*.json

Types d'exercice : qcm (bonne réponse en premier ; code, output et whyWrong
facultatifs), vf, order, case, compose (morceaux à assembler) et bugline
(ligne fautive).

Chaque fichier décrit une unité, ses cartes et ses exercices, en anglais (l'app
est en anglais uniquement depuis la 1.3 ; un texte peut s'écrire "…" ou {"en": "…"}).
Le script valide la structure, dérive les identifiants (cartes :
`<matière>-x-<slug>`, exercices : `<unité>:x:<n>`), refuse les doublons et
réécrit units.extra.json (ordre conservé, nouvelles unités à la fin). Relancer le script avec
le même fichier remplace l'unité (mêmes identifiants : la progression survit).
"""

import json
import re
import sys
from pathlib import Path

LANGS = ("en",)
TARGET = Path("src/data/units.extra.json")
DECK = Path("src/data/deck.json")
DASH = re.compile("[—–]")


def text(value, where):
    """Un texte anglais : une chaîne, ou {"en": "…"} (ancien format multilingue, les autres langues sont ignorées)."""
    if isinstance(value, dict):
        value = value.get("en")
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{where} : texte anglais manquant")
    return DASH.sub(",", value).strip()


def texts(values, where, n=None):
    if not isinstance(values, list) or (n is not None and len(values) != n):
        raise ValueError(f"{where} : liste attendue{'' if n is None else f' de {n}'}")
    return [text(v, f"{where}[{i}]") for i, v in enumerate(values)]


def convert(doc: dict) -> dict:
    u = doc["unit"]
    unit_id, subject = u["id"], u["subjectId"]
    if not re.fullmatch(r"[a-z0-9-]+", unit_id):
        raise ValueError(f"identifiant d'unité invalide : {unit_id}")
    cards = []
    slugs = set()
    for c in doc["cards"]:
        slug = c["slug"]
        if not re.fullmatch(r"[a-z0-9-]+", slug) or slug in slugs:
            raise ValueError(f"{unit_id} : slug invalide ou en double : {slug}")
        slugs.add(slug)
        if c.get("level") not in ("debutant", "intermediaire", "avance"):
            raise ValueError(f"{unit_id} : niveau invalide pour {slug}")
        cards.append({
            "id": f"{subject}-x-{slug}",
            "subject": subject,
            "topic": u["topic"],
            "level": c["level"],
            "term": text(c["term"], f"{slug}.term"),
            "definition": text(c["definition"], f"{slug}.definition"),
            "example": text(c["example"], f"{slug}.example"),
            **({"alts": texts(c["alts"], f"{slug}.alts")} if c.get("alts") else {}),
        })
    # Cartes déjà présentes dans le deck (src/data/deck.json), réutilisées telles quelles.
    deck_ids = list(doc.get("deckCards", []))
    if deck_ids:
        known = {c["id"] for c in json.load(open(DECK))["cards"]}
        unknown = [i for i in deck_ids if i not in known]
        if unknown:
            raise ValueError(f"{unit_id} : cartes absentes du deck : {unknown}")
    if len(cards) + len(deck_ids) < 6:
        raise ValueError(f"{unit_id} : au moins 6 cartes")
    exercises = []
    for i, e in enumerate(doc["exercises"], start=1):
        key = f"{unit_id}:x:{i}"
        kind = e["kind"]
        base = {"key": key, "unitId": unit_id}
        if kind == "qcm":
            choices = texts(e["choices"], f"{key}.choices")
            if not 2 <= len(choices) <= 4:
                raise ValueError(f"{key} : 2 à 4 choix")
            out = {**base, "kind": "qcm", "prompt": text(e["prompt"], key), "choices": choices, "answer": 0, "explain": text(e["explain"], key)}
            if "code" in e:
                out["code"] = {"lang": e["code"]["lang"], "src": e["code"]["src"]}
            if "output" in e:
                out["output"] = e["output"]
            if "whyWrong" in e:
                # Une explication par mauvais choix, alignée sur `choices` (la bonne réponse, en tête, n'en a pas).
                why = e["whyWrong"]
                if not isinstance(why, list) or len(why) != len(choices) - 1:
                    raise ValueError(f"{key} : whyWrong attend une entrée par mauvais choix")
                out["whyWrong"] = [None] + texts(why, f"{key}.whyWrong")
            # Autres formulations (bonne réponse en premier, comme la question).
            if e.get("variants"):
                out["variants"] = [{"prompt": text(v["prompt"], f"{key}.variant"), "choices": texts(v["choices"], f"{key}.variant.choices"), "answer": 0, **({"explain": text(v["explain"], f"{key}.variant.explain")} if v.get("explain") else {})} for v in e["variants"]]
        elif kind == "vf":
            out = {**base, "kind": "vf", "prompt": text(e["prompt"], key), "isTrue": bool(e["isTrue"]), "explain": text(e["explain"], key)}
            if e.get("variants"):
                out["variants"] = [{"prompt": text(v["prompt"], f"{key}.variant"), "isTrue": bool(v["isTrue"]), **({"explain": text(v["explain"], f"{key}.variant.explain")} if v.get("explain") else {})} for v in e["variants"]]
        elif kind == "order":
            steps = texts(e["steps"], f"{key}.steps")
            if not 3 <= len(steps) <= 6:
                raise ValueError(f"{key} : 3 à 6 étapes")
            out = {**base, "kind": "order", "prompt": text(e["prompt"], key), "steps": steps, "explain": text(e["explain"], key)}
        elif kind == "case":
            steps = []
            for j, s in enumerate(e["steps"]):
                choices = texts(s["choices"], f"{key}.steps[{j}].choices")
                if len(choices) < 2:
                    raise ValueError(f"{key} : décision {j} sans choix")
                steps.append({"prompt": text(s["prompt"], key), "choices": choices, "answer": 0, "feedback": text(s["feedback"], key)})
            if len(steps) < 2:
                raise ValueError(f"{key} : au moins 2 décisions")
            out = {**base, "kind": "case", "title": text(e["title"], key), "scenario": text(e["scenario"], key), "steps": steps, "explain": text(e["explain"], key)}
        elif kind == "compose":
            tokens, extra = e["tokens"], e.get("extra", [])
            if len(tokens) < 3 or len(extra) > 4 or any(x in tokens for x in extra):
                raise ValueError(f"{key} : au moins 3 morceaux, 0 à 4 intrus distincts des morceaux")
            out = {**base, "kind": "compose", "prompt": text(e["prompt"], key), "lang": e["lang"], "tokens": tokens, "extra": extra, "explain": text(e["explain"], key)}
        elif kind == "bugline":
            lines, answer = e["lines"], e["answer"]
            if not 2 <= len(lines) <= 8 or not 0 <= answer < len(lines):
                raise ValueError(f"{key} : 2 à 8 lignes, réponse dans les bornes")
            out = {**base, "kind": "bugline", "prompt": text(e["prompt"], key), "lang": e["lang"], "lines": lines, "answer": answer, "explain": text(e["explain"], key)}
        else:
            raise ValueError(f"{key} : kind inconnu {kind}")
        exercises.append(out)
    if len(exercises) < 5:
        raise ValueError(f"{unit_id} : au moins 5 exercices")
    return {
        "unit": {
            "id": unit_id,
            "subjectId": subject,
            "topic": u["topic"],
            "world": u["world"],
            "title": text(u["title"], "unit.title"),
            "description": text(u["description"], "unit.description"),
            "cardIds": [c["id"] for c in cards] + deck_ids,
        },
        "cards": cards,
        "exercises": exercises,
    }


def main(paths):
    data = json.load(open(TARGET)) if TARGET.exists() else {"units": []}
    # L'ordre du fichier compte : les unités d'un même monde s'y ajoutent dans
    # cet ordre (worlds.ts). Une unité remplacée garde sa place, une nouvelle
    # se range à la fin.
    by_id = {u["unit"]["id"]: u for u in data["units"]}
    for p in paths:
        doc = json.load(open(p))
        unit = convert(doc)
        by_id[unit["unit"]["id"]] = unit
        print(f"{unit['unit']['id']}: {len(unit['cards'])} cartes, {len(unit['exercises'])} exercices")
    units = list(by_id.values())
    # Unicité globale des cartes (rédigées ou reprises du deck).
    seen = set()
    for u in units:
        for cid in u["unit"]["cardIds"]:
            if cid in seen:
                raise ValueError(f"carte en double entre unités : {cid}")
            seen.add(cid)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    json.dump({"units": units}, open(TARGET, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(units)} unités dans {TARGET}")


if __name__ == "__main__":
    main(sys.argv[1:])
