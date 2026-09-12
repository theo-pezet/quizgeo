# Quiz GEO

Application mobile (Android, et web) pour apprendre le marketing digital,
l'IA, Python et HTML / CSS / JavaScript. Un chemin d'unités par matière
(comme Duolingo), un deck de vocabulaire en répétition espacée (comme Anki),
et des cas pratiques.

- **Web** : https://theo-pezet.github.io/quizgeo/ (publié à chaque push sur `main`)
- **APK Android** : onglet *Releases* (construit par GitHub Actions sur un tag `v*`,
  ou à la main via *Actions → Android APK → Run workflow*)

## Ce qui est différent de Duolingo

- **Pas de cœurs.** Une erreur ne punit pas : l'exercice revient en fin de
  session (rattrapage), entre dans la file « à revoir » jusqu'à deux bonnes
  réponses d'affilée, et la carte du deck correspondante est replanifiée.
- **Une explication à chaque réponse**, juste ou fausse, avec un exemple.
- **Le deck et le chemin se parlent** : les leçons nourrissent la révision espacée.
- **Des cas pratiques** à plusieurs décisions, avec un retour à chaque étape.
- **Cinq couronnes par unité** : le chemin avance à 3, la maîtrise va à 5,
  et sans révision une couronne se fissure tous les 14 jours.
- **Énergie** (25, une leçon en coûte 5, une erreur 1, un sans-faute en
  rembourse 2, +1 toutes les 12 min) — les révisions restent gratuites.
- **Gemmes** et boutique (recharge, gel de série, boost XP ×2), **quêtes du
  jour**, **ligue hebdomadaire** (30 joueurs, 10 divisions ; adversaires
  simulés hors ligne, remplaçables par un service en ligne).
- Série quotidienne avec gels, 17 badges, niveaux, sessions libres par matière.
- **Blitz** (60 s, XP ×2), **test de sortie** (8/10 sur une unité verrouillée
  valide les précédentes), **rappels locaux** (série en danger, énergie
  rechargée — Android uniquement), trois **rivaux** récurrents en ligue.

## Architecture

```
src/
├── game/       le cœur de règles, pur, testé à 100 % (XP, série, couronnes,
│               révision, badges, répétition espacée, politique de pub)
├── content/    matières, unités, génération d'exercices depuis le deck,
│               exercices écrits à la main (GEO, culture IA, HTML/CSS/JS, code)
├── data/       deck.json (généré depuis docs/deck-source.xlsx) ;
│               les cartes écrites à la main sont dans content/cards.extra.ts
├── features/   la session (machine à états + rendu des 5 types d'exercices)
├── store/      zustand + AsyncStorage : progression et réglages
├── ui/         jetons de design et composants de base
├── lib/        frontières plateforme : pub (vide en v1), haptique, confirm
└── app/        routes expo-router : (tabs)/, session/, deck/
tools/build_deck.py   régénère src/data/deck.json depuis le classeur
```

Types d'exercices : QCM (2 à 4 choix), texte à trous, association, remise en
ordre, cas pratique.

## Développer

```
npm install
npm run typecheck
npm test              # 341 tests ; src/game/ doit rester à 100 % de couverture
npx expo start        # puis w (web), a (Android)
npx expo export --platform web   # build statique dans dist/
```

Régénérer le deck après modification du classeur :

```
python3 tools/build_deck.py docs/deck-source.xlsx src/data/deck.json
```

## Publicité (plus tard)

La règle d'affichage existe déjà (`src/game/ads.ts`, testée) : jamais pendant
un exercice, seulement après une session d'unité, jamais sur les 5 premières
sessions, au plus une fois toutes les 3 sessions et 20 minutes. Le SDK n'est
pas installé : `FEATURES.ads = false` dans `src/config/features.ts`, et
`src/lib/ads.ts` est la seule frontière à remplacer (AdMob + consentement UMP).
AdMob exigeant une fiche Play Store, l'ordre sera : app → Play Store → pubs.
Le `package` Android `fr.citeparlia.quizgeo` ne doit jamais changer.
