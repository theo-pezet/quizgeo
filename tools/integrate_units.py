#!/usr/bin/env python3
"""Intègre des unités rédigées au format JSON (voir docs/GUIDE-DEV.txt, section
« Ajouter une unité ») dans src/data/units.extra.json, le fichier que l'app
charge au démarrage (src/content/extra.ts).

    python3 tools/integrate_units.py chemin/vers/dossier/*.json

Chaque fichier décrit une unité, ses cartes et ses exercices en trois langues.
Le script valide la structure, dérive les identifiants (cartes :
`<matière>-x-<slug>`, exercices : `<unité>:x:<n>`), refuse les doublons et
réécrit units.extra.json trié par identifiant d'unité. Relancer le script avec
le même fichier remplace l'unité (mêmes identifiants : la progression survit).
"""

import json
import re
import sys
from pathlib import Path

LANGS = ("fr", "en", "es")
TARGET = Path("src/data/units.extra.json")
DASH = re.compile("[—–]")


def text(value, where):
    if not isinstance(value, dict) or any(not isinstance(value.get(l), str) or not value[l].strip() for l in LANGS):
        raise ValueError(f"{where} : texte manquant dans une langue")
    for l in LANGS:
        if DASH.search(value[l]):
            value[l] = DASH.sub(",", value[l])
    return {l: value[l].strip() for l in LANGS}


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
        })
    if len(cards) < 6:
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
        elif kind == "vf":
            out = {**base, "kind": "vf", "prompt": text(e["prompt"], key), "isTrue": bool(e["isTrue"]), "explain": text(e["explain"], key)}
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
            "cardIds": [c["id"] for c in cards],
        },
        "cards": cards,
        "exercises": exercises,
    }


def main(paths):
    data = json.load(open(TARGET)) if TARGET.exists() else {"units": []}
    by_id = {u["unit"]["id"]: u for u in data["units"]}
    for p in paths:
        doc = json.load(open(p))
        unit = convert(doc)
        by_id[unit["unit"]["id"]] = unit
        print(f"{unit['unit']['id']}: {len(unit['cards'])} cartes, {len(unit['exercises'])} exercices")
    units = [by_id[k] for k in sorted(by_id)]
    # Unicité globale des cartes.
    seen = set()
    for u in units:
        for c in u["cards"]:
            if c["id"] in seen:
                raise ValueError(f"carte en double entre unités : {c['id']}")
            seen.add(c["id"])
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    json.dump({"units": units}, open(TARGET, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(units)} unités dans {TARGET}")


if __name__ == "__main__":
    main(sys.argv[1:])
