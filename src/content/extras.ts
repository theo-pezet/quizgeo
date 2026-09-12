/**
 * Exercices écrits à la main. Ils complètent (ou constituent) les unités qui
 * ne peuvent pas se contenter du deck : GEO, culture IA, HTML / CSS / JS,
 * lecture de code Python, cas pratiques.
 *
 * Convention de clé : `<unitId>:x:<n>`. Ne jamais renommer une clé existante :
 * la progression de l'utilisateur y est rattachée.
 */

import type { Exercise } from '@/game';

const qcm = (
  unitId: string,
  n: number,
  prompt: string,
  choices: string[],
  explain: string,
  extra: Partial<Extract<Exercise, { kind: 'qcm' }>> = {},
): Exercise => ({ kind: 'qcm', key: `${unitId}:x:${n}`, unitId, prompt, choices, answer: 0, explain, ...extra });

const vf = (unitId: string, n: number, prompt: string, isTrue: boolean, explain: string): Exercise => ({
  kind: 'qcm',
  key: `${unitId}:x:${n}`,
  unitId,
  prompt,
  choices: ['Vrai', 'Faux'],
  answer: isTrue ? 0 : 1,
  explain,
});

export const EXTRA_EXERCISES: readonly Exercise[] = [
  // ============================================================ GEO (mkt-geo-1)
  qcm('mkt-geo-1', 1, 'Que désigne le GEO (Generative Engine Optimization) ?', [
    'Optimiser un contenu pour être repris et cité par les moteurs génératifs (ChatGPT, Perplexity, AI Overviews)',
    'Optimiser un site pour les recherches géolocalisées',
    'Générer automatiquement des pages avec une IA',
    'Une nouvelle norme de balisage HTML',
  ], 'Le GEO vise la citation par les réponses générées, là où le SEO vise le classement dans une liste de liens. Les deux se recoupent, mais le GEO récompense surtout la clarté, l’autorité et la « citabilité » d’un passage.'),
  qcm('mkt-geo-1', 2, 'Quelle différence principale entre SEO et GEO ?', [
    'Le SEO cherche un rang dans une liste de liens ; le GEO cherche à être cité dans une réponse synthétisée',
    'Le GEO ne concerne que les images',
    'Le SEO est payant, le GEO est gratuit',
    'Aucune : ce sont deux noms pour la même chose',
  ], 'Dans une réponse générée, il n’y a pas dix positions : il y a quelques sources citées. Être « bien classé » ne suffit plus, il faut être la source que le modèle choisit de reprendre.'),
  qcm('mkt-geo-1', 3, 'Lequel de ces signaux aide le plus un passage à être cité par une IA ?', [
    'Une réponse directe, factuelle et autonome en 2 ou 3 phrases, sous un titre explicite',
    'Un long paragraphe d’introduction avant d’arriver au fait',
    'Des mots-clés répétés dix fois',
    'Une police de caractères plus grande',
  ], 'Les moteurs génératifs extraient des passages. Un bloc court, qui répond seul à la question posée par le titre, se cite sans réécriture — c’est exactement ce que le modèle cherche.'),
  qcm('mkt-geo-1', 4, 'Que signifie « Information Gain » pour un contenu ?', [
    'Il apporte une information que les autres sources n’ont pas (données, retour d’expérience, exemple original)',
    'Il est plus long que la concurrence',
    'Il contient plus de liens sortants',
    'Il a été publié plus récemment',
  ], 'Un contenu qui répète ce que dix autres disent déjà n’a aucune raison d’être choisi. Une donnée inédite, un test réel, un chiffre original donnent au modèle une raison de vous citer.'),
  qcm('mkt-geo-1', 5, 'Que sont les « AI Overviews » de Google ?', [
    'Des réponses générées par IA affichées en haut des résultats, avec des liens vers les sources citées',
    'Un outil payant d’analyse de site',
    'Un nouveau format de publicité vidéo',
    'Le nom du crawler de Google',
  ], 'Les AI Overviews (ex-SGE) synthétisent une réponse au-dessus des liens classiques. Y être cité capte une part du trafic que les résultats organiques perdent (zero-click).'),
  qcm('mkt-geo-1', 6, 'Pourquoi les mentions de marque (même sans lien) comptent en GEO ?', [
    'Les modèles apprennent l’association marque ↔ sujet à partir de tout le web, liens ou pas',
    'Google les compte comme des backlinks',
    'Elles augmentent le PageRank',
    'Elles ne comptent pas',
  ], 'Un LLM n’a pas besoin d’un lien pour relier votre marque à un sujet : il lui suffit que l’association apparaisse souvent dans ses données. La notoriété textuelle devient un levier à part entière.'),
  vf('mkt-geo-1', 7, 'Un fichier llms.txt à la racine du site garantit d’être cité par les IA.', false, 'llms.txt est une proposition pour guider les modèles vers vos contenus importants. Utile et peu coûteux, mais aucun moteur ne garantit de le lire, et encore moins de vous citer.'),
  vf('mkt-geo-1', 8, 'Les données structurées (schema.org) aident les moteurs génératifs à comprendre une page.', true, 'Le balisage explicite le type de contenu (FAQ, produit, auteur, avis). Les pipelines de recherche des moteurs génératifs s’appuient largement sur l’index classique, où ce balisage compte.'),
  {
    kind: 'order',
    key: 'mkt-geo-1:x:9',
    unitId: 'mkt-geo-1',
    prompt: 'Remets dans l’ordre les étapes pour optimiser une page en GEO',
    steps: [
      'Identifier les questions que les gens posent aux IA sur le sujet',
      'Écrire une réponse directe et autonome sous chaque question, en titre',
      'Ajouter une information inédite (donnée, exemple, retour d’expérience)',
      'Baliser la page (auteur, FAQ, dates) et la rendre facilement crawlable',
      'Vérifier dans ChatGPT / Perplexity si la page est citée, et ajuster',
    ],
    explain: 'On part de la demande réelle, on structure pour l’extraction, on se rend unique, on se rend lisible, puis on mesure. Sans la mesure finale, on ne sait jamais si ça marche.',
  },

  // ==================================================== Cas pratiques marketing
  {
    kind: 'case',
    key: 'mkt-case-1:x:1',
    unitId: 'mkt-case-1',
    title: 'Le trafic s’effondre',
    scenario: 'Tu gères le blog d’une PME. Depuis 3 semaines, le trafic organique a chuté de 40 %. La Search Console ne montre aucune pénalité manuelle. Les positions ont baissé sur presque toutes les requêtes, pas seulement quelques-unes.',
    steps: [
      {
        prompt: 'Quelle est la première chose à vérifier ?',
        choices: ['Une mise à jour d’algorithme Google aux mêmes dates', 'Acheter des backlinks pour compenser', 'Réécrire toutes les pages avec une IA', 'Augmenter le budget Google Ads'],
        answer: 0,
        feedback: 'Une baisse large et simultanée, sans pénalité manuelle, signe presque toujours une core update. On date la chute et on la compare au calendrier des mises à jour.',
      },
      {
        prompt: 'La chute coïncide avec une core update. Tu constates que tes articles reprennent surtout ce que disent les concurrents. Que fais-tu ?',
        choices: ['Enrichir les pages clés avec des données ou retours d’expérience originaux', 'Multiplier les articles courts sur les mêmes sujets', 'Supprimer tous les articles', 'Attendre sans rien changer'],
        answer: 0,
        feedback: 'Les core updates récompensent le contenu utile et original (E-E-A-T, information gain). Le volume n’aide pas ; la valeur ajoutée, oui.',
      },
      {
        prompt: 'Quand mesurer l’effet de tes changements ?',
        choices: ['À la prochaine core update, quelques semaines à quelques mois plus tard', 'Le lendemain', 'Jamais, ce n’est pas mesurable', 'Après avoir changé de CMS'],
        answer: 0,
        feedback: 'Les effets d’une core update se réévaluent surtout à la suivante. On continue à améliorer, on suit les positions, et on juge sur plusieurs semaines.',
      },
    ],
    explain: 'Diagnostic (dater, croiser avec les updates), traitement (qualité et originalité), mesure (patience et suivi). Le réflexe « acheter des liens » aggrave presque toujours la situation.',
  },
  {
    kind: 'case',
    key: 'mkt-case-1:x:2',
    unitId: 'mkt-case-1',
    title: 'Le budget Ads brûle',
    scenario: 'Une campagne Google Ads Search dépense 2 000 € / mois. Le CTR est correct (5 %), mais le taux de conversion est de 0,3 % et le CPA explose. La landing page est la page d’accueil du site.',
    steps: [
      {
        prompt: 'Où est le problème le plus probable ?',
        choices: ['Après le clic : la page d’accueil ne répond pas à la promesse de l’annonce', 'Le CTR est trop bas', 'Les mots-clés ne génèrent pas d’impressions', 'Le budget est trop faible'],
        answer: 0,
        feedback: 'Un bon CTR avec une mauvaise conversion pointe vers la page d’atterrissage. Une page d’accueil généraliste ne convertit pas une intention précise.',
      },
      {
        prompt: 'Que mets-tu en place en priorité ?',
        choices: ['Une landing page dédiée par groupe d’annonces, avec un seul CTA', 'Un pop-up sur la page d’accueil', 'Des mots-clés en requête large', 'Une vidéo de présentation de l’entreprise'],
        answer: 0,
        feedback: 'Cohérence annonce → page, message unique, un seul appel à l’action : c’est la base du CRO pour le paid.',
      },
      {
        prompt: 'Comment vérifier que la nouvelle page fait mieux ?',
        choices: ['Un A/B test avec assez de trafic pour être significatif', 'Comparer au feeling après deux jours', 'Demander l’avis de l’équipe', 'Regarder uniquement le CTR'],
        answer: 0,
        feedback: 'On teste, on attend la significativité statistique, on décide sur le taux de conversion — pas sur l’impression.',
      },
    ],
    explain: 'Bon CTR + mauvaise conversion = problème de page, pas d’annonce. Landing dédiée, un CTA, A/B test.',
  },

  {
    kind: 'case',
    key: 'mkt-case-1:x:3',
    unitId: 'mkt-case-1',
    title: 'Choisir ses mots-clés',
    scenario: 'Tu lances le blog d’un cabinet de conseil en IA pour PME. Tu as deux candidats : « intelligence artificielle » (110 000 recherches / mois, concurrence énorme) et « intégrer chatgpt dans une pme » (400 recherches / mois, peu de concurrence).',
    steps: [
      {
        prompt: 'Par quel mot-clé commencer ?',
        choices: ['La longue traîne : « intégrer chatgpt dans une pme »', '« intelligence artificielle », pour le volume', 'Les deux en même temps sur la même page', 'Aucun : le SEO ne marche plus'],
        answer: 0,
        feedback: 'Un site neuf ne se classera pas sur une requête générique face à Wikipédia et aux grands médias. La longue traîne a moins de volume, mais une intention précise et une vraie chance de classement.',
      },
      {
        prompt: 'Comment structurer le contenu autour de ce mot-clé ?',
        choices: ['Une page pilier « ChatGPT en PME » + des articles satellites liés entre eux (topic cluster)', 'Dix articles identiques avec des variantes du mot-clé', 'Une seule page de 200 mots', 'Une page par synonyme, sans lien entre elles'],
        answer: 0,
        feedback: 'Le topic cluster montre à Google une expertise sur tout le sujet, et le maillage interne fait circuler l’autorité vers la page pilier.',
      },
      {
        prompt: 'Trois mois plus tard, la page pilier est en position 4. Quel levier pour passer dans le top 3 ?',
        choices: ['Obtenir quelques backlinks de sites pertinents et enrichir la page avec un cas client', 'Répéter le mot-clé 30 fois de plus', 'Acheter 500 liens sur des annuaires', 'Changer le nom de domaine'],
        answer: 0,
        feedback: 'Autorité (liens de qualité) + valeur ajoutée (information gain). Le keyword stuffing et les fermes de liens sont pénalisés.',
      },
    ],
    explain: 'Longue traîne d’abord, topic cluster ensuite, autorité et originalité pour finir.',
  },
  qcm('mkt-case-1', 4, 'Ton taux d’ouverture email passe de 35 % à 12 % en une semaine, sans changement d’objet ni de fréquence. Cause la plus probable ?', [
    'Un problème de délivrabilité : réputation d’expéditeur ou authentification (SPF / DKIM / DMARC)',
    'Les abonnés ont tous perdu intérêt en même temps',
    'Le CTA est mal placé',
    'Le logo a changé',
  ], 'Une chute brutale et générale du taux d’ouverture signe presque toujours un passage en spam. On vérifie l’authentification, la réputation du domaine et les listes noires avant de toucher au contenu.'),
  qcm('mkt-case-1', 5, 'Ta page produit a un taux de rebond de 85 % depuis une campagne Meta Ads. Que regardes-tu en premier ?', [
    'La cohérence entre la promesse de l’annonce et ce que la page montre en premier écran',
    'Le nombre de pages du site',
    'La couleur du bouton',
    'Le nombre de followers',
  ], 'Un rebond massif venant d’une seule source de trafic pointe vers un décalage annonce → page (ou une page trop lente sur mobile). On commence par la cohérence du message et le temps de chargement.'),

  // ===================================================== Culture IA (ia-9)
  qcm('ia-9', 1, 'Qui développe Claude ?', ['Anthropic', 'OpenAI', 'Google DeepMind', 'Meta'], 'Anthropic, fondée en 2021 par d’anciens chercheurs d’OpenAI. Claude est sa famille de modèles ; l’entreprise met en avant la sécurité et l’alignement (Constitutional AI).'),
  qcm('ia-9', 2, 'Qui développe ChatGPT ?', ['OpenAI', 'Anthropic', 'Microsoft', 'Mistral AI'], 'OpenAI a lancé ChatGPT en novembre 2022, sur la base de GPT-3.5. C’est le lancement qui a fait entrer les LLM dans le grand public.'),
  qcm('ia-9', 3, 'Gemini est la famille de modèles de…', ['Google', 'Apple', 'Amazon', 'xAI'], 'Gemini (Google DeepMind) a succédé à Bard fin 2023 et alimente les AI Overviews de la recherche Google.'),
  qcm('ia-9', 4, 'Quelle entreprise française est connue pour ses modèles à poids ouverts ?', ['Mistral AI', 'Hugging Face', 'Doctolib', 'Dassault'], 'Mistral AI (Paris, 2023) publie des modèles open-weights comme Mistral 7B ou Mixtral. Hugging Face est aussi française d’origine, mais c’est une plateforme, pas un laboratoire de modèles.'),
  qcm('ia-9', 5, 'Que veut dire « open-weights » pour un modèle ?', ['Ses poids sont téléchargeables et exécutables chez soi', 'Son code d’entraînement et ses données sont publics', 'Il est gratuit à utiliser via une API', 'Il n’a aucune restriction d’usage'], 'Open-weights : on peut télécharger les paramètres (Llama, Mistral, Gemma). Ce n’est pas forcément open source au sens strict : données et licence peuvent rester fermées.'),
  qcm('ia-9', 6, 'Llama est la famille de modèles open-weights de…', ['Meta', 'Amazon', 'Microsoft', 'IBM'], 'Meta a publié Llama en 2023 et a fait des modèles à poids ouverts le cœur de sa stratégie IA.'),
  qcm('ia-9', 7, 'Qu’est-ce qu’une base de données vectorielle ?', ['Une base qui stocke des embeddings et retrouve les plus proches d’une requête', 'Une base SQL classique avec des index', 'Un tableur très grand', 'Un fichier JSON'], 'Pinecone, Weaviate, pgvector… : elles servent au RAG. On transforme textes et question en vecteurs, on cherche les voisins les plus proches, on donne ces passages au modèle.'),
  qcm('ia-9', 8, 'Un « token », c’est…', ['Un morceau de texte (souvent un bout de mot) que le modèle lit et produit un par un', 'Un mot entier', 'Une phrase', 'Un caractère'], 'En anglais, 1 000 tokens ≈ 750 mots. Le contexte, le prix et la vitesse d’un modèle se comptent en tokens.'),
  vf('ia-9', 9, 'Un LLM comprend le monde comme un humain et ne se trompe jamais sur les faits.', false, 'Un LLM prédit le token suivant. Il peut être extrêmement utile et tout à fait convaincant en se trompant : c’est l’hallucination. Toujours vérifier les faits importants.'),
  {
    kind: 'order',
    key: 'ia-9:x:10',
    unitId: 'ia-9',
    prompt: 'Remets dans l’ordre les grandes étapes de fabrication d’un LLM',
    steps: [
      'Collecter et nettoyer un très grand corpus de textes',
      'Pré-entraîner le modèle à prédire le token suivant (des semaines de GPU)',
      'Affiner sur des exemples d’instructions et de réponses (fine-tuning)',
      'Aligner avec des retours humains ou IA (RLHF / RLAIF)',
      'Évaluer, red-teamer, puis déployer derrière une API',
    ],
    explain: 'Données → pré-entraînement → fine-tuning → alignement → évaluation et déploiement. Le pré-entraînement coûte le plus ; l’alignement est ce qui rend le modèle utilisable.',
  },

  // ======================================================= Cas pratiques IA
  {
    kind: 'case',
    key: 'ia-case-1:x:1',
    unitId: 'ia-case-1',
    title: 'RAG ou fine-tuning ?',
    scenario: 'Ton entreprise veut un assistant qui répond aux questions des clients à partir de 400 pages de documentation, mise à jour chaque semaine.',
    steps: [
      {
        prompt: 'Quelle approche choisir ?',
        choices: ['RAG : chercher les passages pertinents et les donner au modèle', 'Fine-tuner un modèle sur les 400 pages', 'Coller les 400 pages dans chaque prompt', 'Entraîner un LLM de zéro'],
        answer: 0,
        feedback: 'La documentation change chaque semaine : le RAG se met à jour en réindexant, le fine-tuning demanderait de réentraîner. Et le RAG permet de citer ses sources.',
      },
      {
        prompt: 'Les réponses sont parfois inventées. Que faire en premier ?',
        choices: ['Contraindre le modèle à ne répondre qu’à partir des passages fournis, et dire « je ne sais pas » sinon', 'Augmenter la température', 'Réduire la taille des passages à une phrase', 'Changer de langue'],
        answer: 0,
        feedback: 'Le system prompt cadre le comportement : répondre depuis le contexte seulement, citer, admettre l’absence de réponse. Baisser la température aide aussi.',
      },
      {
        prompt: 'Comment mesurer la qualité avant la mise en production ?',
        choices: ['Un jeu de questions-réponses de référence, évalué automatiquement et par des humains', 'Demander à un collègue de tester cinq minutes', 'Regarder le nombre de tokens consommés', 'Attendre les plaintes des clients'],
        answer: 0,
        feedback: 'Un jeu d’évaluation (questions, réponses attendues, sources) permet de comparer des versions et de détecter les régressions.',
      },
    ],
    explain: 'Contenu qui bouge + besoin de sources = RAG. Puis on cadre le modèle, et on évalue avec un jeu de référence.',
  },

  {
    kind: 'case',
    key: 'ia-case-1:x:2',
    unitId: 'ia-case-1',
    title: 'Quel modèle pour quel besoin ?',
    scenario: 'Tu dois automatiser trois tâches : classer 50 000 emails entrants par catégorie, rédiger des réponses délicates à des clients mécontents, et résumer chaque matin 200 articles de presse.',
    steps: [
      {
        prompt: 'Pour classer 50 000 emails en catégories simples, tu choisis…',
        choices: ['Un petit modèle rapide et peu coûteux (SLM ou modèle « mini »), en few-shot', 'Le modèle le plus gros du marché', 'Un humain par email', 'Un modèle de génération d’images'],
        answer: 0,
        feedback: 'Tâche répétitive, catégories fermées, volume énorme : le coût d’inférence par appel prime. Un petit modèle bien prompté fait le travail.',
      },
      {
        prompt: 'Pour les réponses délicates aux clients mécontents…',
        choices: ['Un modèle frontière, avec un system prompt strict et une relecture humaine avant envoi', 'Le modèle le moins cher, envoi automatique', 'Pas d’IA du tout, jamais', 'Un modèle de traduction'],
        answer: 0,
        feedback: 'Faible volume, fort enjeu : on paie la qualité, on cadre le ton, et on garde un humain dans la boucle.',
      },
      {
        prompt: 'Pour résumer 200 articles chaque matin, quel point technique vérifier en premier ?',
        choices: ['La fenêtre de contexte : les articles longs doivent tenir (ou être découpés)', 'La couleur de l’interface', 'Le nombre de paramètres exact du modèle', 'La date de création de l’entreprise'],
        answer: 0,
        feedback: 'Un article tronqué donne un résumé faux. On vérifie la longueur en tokens, on découpe si besoin, et on compare le coût sur 200 appels / jour.',
      },
    ],
    explain: 'Volume et enjeu décident : petit modèle pour le répétitif, gros modèle et humain pour le sensible, et toujours vérifier contexte et coût.',
  },
  qcm('ia-case-1', 3, 'Un collègue colle un contrat confidentiel dans un chatbot grand public pour le résumer. Quel est le problème principal ?', [
    'Les données peuvent être conservées et servir à l’entraînement ; il faut une offre pro avec garantie de non-utilisation',
    'Le résumé sera trop court',
    'Le chatbot ne lit pas les contrats',
    'Aucun problème',
  ], 'Confidentialité et conformité (RGPD) : on vérifie les conditions d’utilisation des données avant d’y mettre quoi que ce soit de sensible.'),
  qcm('ia-case-1', 4, 'Ton assistant RAG répond bien, mais lentement (8 s). Quelle piste en premier ?', [
    'Réduire le nombre et la taille des passages envoyés, et tester un modèle plus petit', 'Augmenter la température', 'Ajouter plus de documents', 'Passer en zero-shot'],
    'La latence dépend surtout du nombre de tokens en entrée et en sortie et de la taille du modèle. Moins de contexte inutile = réponse plus rapide et moins chère.'),
  qcm('ia-case-1', 5, 'Tu veux qu’un modèle produise toujours un JSON valide avec les mêmes champs. Le plus fiable ?', [
    'Donner un exemple de sortie (few-shot), fixer une température basse et valider le JSON côté code', 'Demander poliment', 'Augmenter la température', 'Utiliser un modèle d’image'],
    'Exemple + contrainte + validation programmatique : le prompt guide, le code vérifie. Certaines API proposent en plus un « mode JSON » ou des schémas de sortie.'),

  // ============================================================ HTML (web-2)
  qcm('web-2', 1, 'Que signifie HTML ?', ['HyperText Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'HyperText Machine Logic'], 'HTML décrit la STRUCTURE d’une page : titres, paragraphes, liens, images. Ce n’est pas un langage de programmation, c’est un langage de balisage.'),
  qcm('web-2', 2, 'Quelle balise crée un lien ?', ['<a>', '<link>', '<href>', '<url>'], '<a href="https://…">texte</a>. L’attribut href porte l’adresse. <link> sert à charger une feuille de style, pas à créer un lien cliquable.', { code: { lang: 'html', src: '<a href="https://exemple.fr">Voir le site</a>' } }),
  qcm('web-2', 3, 'Quel est le titre principal d’une page, pour le SEO comme pour l’accessibilité ?', ['<h1>', '<title>', '<header>', '<h6>'], '<h1> est le titre visible de plus haut niveau, un seul par page. <title> est le titre de l’onglet (important aussi, mais différent).'),
  qcm('web-2', 4, 'Que produit ce code ?', ['Une liste à puces de deux éléments', 'Une liste numérotée', 'Un tableau', 'Deux paragraphes'], '<ul> = unordered list (puces), <ol> = ordered list (numéros), <li> = list item.', { code: { lang: 'html', src: '<ul>\n  <li>SEO</li>\n  <li>GEO</li>\n</ul>' } }),
  qcm('web-2', 5, 'À quoi sert l’attribut alt d’une image ?', ['Décrire l’image pour les lecteurs d’écran et les moteurs de recherche', 'Définir sa taille', 'Ajouter une bordure', 'La rendre cliquable'], '<img src="logo.png" alt="Logo de la marque">. Indispensable pour l’accessibilité, et un signal SEO pour Google Images.'),
  qcm('web-2', 6, 'Quelle balise contient le contenu visible de la page ?', ['<body>', '<head>', '<html>', '<main>'], '<head> contient les métadonnées (title, meta, liens CSS) ; <body> contient tout ce qui s’affiche. <main> est une section sémantique DANS le body.'),
  qcm('web-2', 7, 'Quelle balise va dans <head> pour décrire la page dans les résultats Google ?', ['<meta name="description" content="…">', '<description>…</description>', '<p class="description">', '<summary>'], 'La meta description ne change pas le classement mais influence le taux de clic dans la SERP.'),
  {
    kind: 'order',
    key: 'web-2:x:8',
    unitId: 'web-2',
    prompt: 'Remets dans l’ordre la structure minimale d’une page HTML',
    steps: ['<!DOCTYPE html>', '<html>', '<head> … </head>', '<body> … </body>', '</html>'],
    explain: 'Le doctype annonce HTML5, puis <html> enveloppe <head> (métadonnées) et <body> (contenu).',
  },
  {
    kind: 'match',
    key: 'web-2:x:9',
    unitId: 'web-2',
    prompt: 'Associe chaque balise à son rôle',
    pairs: [
      { left: '<p>', right: 'Un paragraphe' },
      { left: '<img>', right: 'Une image' },
      { left: '<h2>', right: 'Un titre de section' },
      { left: '<button>', right: 'Un bouton cliquable' },
    ],
  },

  // ============================================================= CSS (web-3)
  qcm('web-3', 1, 'À quoi sert CSS ?', ['Décrire l’apparence : couleurs, tailles, positions', 'Structurer le contenu', 'Rendre la page interactive', 'Stocker des données'], 'Cascading Style Sheets. HTML structure, CSS habille, JavaScript anime.'),
  qcm('web-3', 2, 'Que fait cette règle ?', ['Met tous les titres <h1> en bleu', 'Met tout le texte de la page en bleu', 'Crée un titre bleu', 'Rien : la syntaxe est fausse'], 'Sélecteur (h1) + bloc de déclarations { propriété: valeur; }.', { code: { lang: 'css', src: 'h1 {\n  color: blue;\n}' } }),
  qcm('web-3', 3, 'Comment cibler tous les éléments qui ont class="cta" ?', ['.cta', '#cta', 'cta', '<cta>'], 'Le point cible une classe (réutilisable), le dièse cible un id (unique).'),
  qcm('web-3', 4, 'Dans le box model, dans quel ordre trouve-t-on les couches, de l’intérieur vers l’extérieur ?', ['contenu → padding → border → margin', 'contenu → margin → border → padding', 'margin → border → padding → contenu', 'padding → contenu → border → margin'], 'Padding = espace intérieur (entre contenu et bordure) ; margin = espace extérieur (entre la bordure et les voisins).'),
  qcm('web-3', 5, 'Que fait display: flex sur un conteneur ?', ['Il aligne ses enfants sur une ligne (ou une colonne) avec des règles de répartition simples', 'Il cache le conteneur', 'Il rend le texte flexible en taille', 'Il transforme le conteneur en tableau'], 'Flexbox est l’outil de mise en page le plus courant : justify-content répartit sur l’axe principal, align-items sur l’axe secondaire.'),
  qcm('web-3', 6, 'Quelle unité s’adapte à la taille de police du parent ?', ['em', 'px', 'cm', 'pt'], 'em est relative à la police du parent, rem à celle de la racine (<html>). px est absolue.'),
  vf('web-3', 7, 'En CSS, une règle écrite plus bas dans le fichier l’emporte sur une règle identique écrite plus haut.', true, 'C’est la « cascade » : à spécificité égale, la dernière déclaration gagne.'),
  {
    kind: 'match',
    key: 'web-3:x:8',
    unitId: 'web-3',
    prompt: 'Associe chaque propriété à son effet',
    pairs: [
      { left: 'color', right: 'Couleur du texte' },
      { left: 'background-color', right: 'Couleur de fond' },
      { left: 'font-size', right: 'Taille du texte' },
      { left: 'margin', right: 'Espace extérieur' },
    ],
  },

  // ====================================================== JavaScript (web-4)
  qcm('web-4', 1, 'À quoi sert JavaScript dans une page web ?', ['Réagir aux actions de l’utilisateur et modifier la page sans la recharger', 'Décrire la structure de la page', 'Définir les couleurs', 'Héberger le site'], 'JS s’exécute dans le navigateur : clics, formulaires, animations, appels réseau (fetch).'),
  qcm('web-4', 2, 'Qu’affiche ce code ?', ['3', '"12"', '12', 'Une erreur'], 'Deux nombres : + additionne. Avec une chaîne ("1" + 2), + concaténerait en "12".', { code: { lang: 'js', src: 'const a = 1;\nconst b = 2;\nconsole.log(a + b);' } }),
  qcm('web-4', 3, 'Quelle déclaration crée une variable qu’on ne pourra PAS réassigner ?', ['const', 'let', 'var', 'static'], 'const empêche la réassignation (mais un objet const reste modifiable). let est la variable modifiable moderne ; var est l’ancienne forme, à éviter.'),
  qcm('web-4', 4, 'Qu’affiche ce code ?', ['3', '2', '[1, 2, 3]', 'undefined'], '.length donne le nombre d’éléments d’un tableau.', { code: { lang: 'js', src: 'const liste = ["seo", "sea", "geo"];\nconsole.log(liste.length);' } }),
  qcm('web-4', 5, 'Comment sélectionner le premier élément qui a la classe "cta" ?', ['document.querySelector(".cta")', 'document.getElement(".cta")', 'document.find("cta")', 'window.select(".cta")'], 'querySelector accepte n’importe quel sélecteur CSS et rend le premier élément trouvé ; querySelectorAll les rend tous.'),
  qcm('web-4', 6, 'Que fait ce code ?', ['Affiche « Merci ! » dans la console quand on clique sur le bouton', 'Affiche « Merci ! » au chargement', 'Crée un bouton', 'Rien : il manque un point-virgule'], 'addEventListener attache une fonction (ici une fonction fléchée) à un événement. C’est la base de l’interactivité.', { code: { lang: 'js', src: 'const btn = document.querySelector("button");\nbtn.addEventListener("click", () => {\n  console.log("Merci !");\n});' } }),
  qcm('web-4', 7, 'Qu’affiche ce code ?', ['true', 'false', '"1"', 'Une erreur'], '=== compare valeur ET type : le nombre 1 et la chaîne "1" sont différents. == (double égal) aurait converti et rendu true — d’où la règle : toujours ===.', { code: { lang: 'js', src: 'console.log(1 === "1");' } }),
  vf('web-4', 8, 'fetch() permet d’appeler une API depuis le navigateur.', true, 'fetch("https://api…").then(r => r.json()) : c’est ainsi qu’une page charge des données sans se recharger (le « A » de AJAX, en version moderne).'),

  // ==================================================== Python : lire du code
  qcm('py-2', 101, 'Qu’affiche ce code ?', ['Bonjour Lia', 'Bonjour {prenom}', 'prenom', 'Une erreur'], 'Le f devant la chaîne active l’interpolation : {prenom} est remplacé par la valeur de la variable.', { code: { lang: 'python', src: 'prenom = "Lia"\nprint(f"Bonjour {prenom}")' } }),
  qcm('py-2', 102, 'Qu’affiche ce code ?', ["<class 'str'>", "<class 'int'>", '42', 'Une erreur'], 'Entre guillemets, "42" est une chaîne de caractères, pas un nombre. int("42") le convertirait.', { code: { lang: 'python', src: 'x = "42"\nprint(type(x))' } }),
  qcm('py-3', 101, 'Qu’affiche ce code ?', ['0 1 2', '1 2 3', '0 1 2 3', '3'], 'range(3) produit 0, 1, 2 : la borne de fin est exclue.', { code: { lang: 'python', src: 'for i in range(3):\n    print(i, end=" ")' } }),
  qcm('py-3', 102, 'Qu’affiche ce code ?', ['Grand', 'Petit', 'Rien', 'Une erreur'], 'La condition est vraie (12 > 10), donc la première branche s’exécute.', { code: { lang: 'python', src: 'budget = 12\nif budget > 10:\n    print("Grand")\nelse:\n    print("Petit")' } }),
  qcm('py-3', 103, 'Que rend cet appel ?', ['15', '5', 'None', 'Une erreur'], 'La fonction multiplie son argument par 3 et RETOURNE le résultat. Sans return, elle rendrait None.', { code: { lang: 'python', src: 'def triple(n):\n    return n * 3\n\ntriple(5)' } }),
  qcm('py-4', 101, 'Qu’affiche ce code ?', ["['seo', 'geo', 'sea']", "['seo', 'geo']", "['sea', 'seo', 'geo']", 'Une erreur'], 'append ajoute à la FIN de la liste, en la modifiant sur place.', { code: { lang: 'python', src: 'canaux = ["seo", "geo"]\ncanaux.append("sea")\nprint(canaux)' } }),
  qcm('py-4', 102, 'Qu’affiche ce code ?', ['1200', 'cpc', "{'cpc': 0.5, 'budget': 1200}", 'Une erreur'], 'On accède à une valeur de dictionnaire par sa clé, entre crochets.', { code: { lang: 'python', src: 'campagne = {"cpc": 0.5, "budget": 1200}\nprint(campagne["budget"])' } }),
  qcm('py-4', 103, 'Qu’affiche ce code ?', ["['a', 'b', 'c']", "'a,b,c'", "['a,b,c']", '3'], 'split découpe une chaîne sur le séparateur donné et rend une liste.', { code: { lang: 'python', src: 'print("a,b,c".split(","))' } }),
  qcm('py-8', 101, 'Qu’affiche ce code ?', ['3 1', '3.33 1', '3 0', '3.0 1'], '// est la division entière (quotient), % le modulo (reste). 10 = 3 × 3 + 1.', { code: { lang: 'python', src: 'print(10 // 3, 10 % 3)' } }),
  qcm('py-7', 101, 'Quelle erreur produit ce code ?', ['KeyError', 'IndexError', 'TypeError', 'NameError'], 'La clé "cpa" n’existe pas dans le dictionnaire. IndexError concernerait une liste ; NameError une variable inconnue.', { code: { lang: 'python', src: 'stats = {"cpc": 0.5}\nprint(stats["cpa"])' } }),
];
