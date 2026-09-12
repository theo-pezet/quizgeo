/**
 * Le chemin de chaque matière : ses unités, dans l'ordre.
 *
 * Une unité tire ses exercices de cartes du deck (générés, voir generate.ts)
 * et/ou d'exercices écrits à la main (extras.ts). L'ordre ici EST le chemin :
 * chaque unité s'ouvre quand la précédente a au moins une couronne.
 */

import type { CardSlice, Unit } from './types';

const slice = (topic: string, from: number, to: number): CardSlice[] => [{ topic, from, to }];

export const UNITS: readonly Unit[] = [
  // ------------------------------------------------------------- Marketing
  { id: 'mkt-bases-1', subjectId: 'marketing', title: 'Le vocabulaire de base', description: 'Conversion, B2B, CPM, segmentation… les mots que tout le monde emploie.', cards: slice('general', 0, 8) },
  { id: 'mkt-bases-2', subjectId: 'marketing', title: 'Funnel et leads', description: 'ROI, KPI, TOFU / MOFU / BOFU : le parcours du prospect.', cards: slice('strategy', 0, 8) },
  { id: 'mkt-seo-1', subjectId: 'marketing', title: 'SEO : les fondamentaux', description: 'Backlinks, autorité, SERP, trafic organique.', cards: slice('seo', 0, 8) },
  { id: 'mkt-seo-2', subjectId: 'marketing', title: 'SEO : on-page et mots-clés', description: 'Sitemap, longue traîne, white hat / black hat, topic clusters.', cards: slice('seo', 8, 16) },
  { id: 'mkt-seo-3', subjectId: 'marketing', title: 'SEO technique', description: 'Canonical, 301, robots.txt, schema, E-E-A-T, mobile-first.', cards: slice('seo', 16, 24) },
  { id: 'mkt-seo-4', subjectId: 'marketing', title: 'Intention et Core Web Vitals', description: 'User intent, zero-click, LCP / FID / CLS.', cards: slice('seo', 24, 33) },
  { id: 'mkt-seo-5', subjectId: 'marketing', title: 'Netlinking et maillage interne', description: 'Liens internes, externes, nofollow, DR, negative SEO.', cards: slice('seo', 33, 41) },
  { id: 'mkt-seo-6', subjectId: 'marketing', title: 'Audit et indexation', description: 'Disavow, hreflang, thin content, crawlabilité.', cards: slice('seo', 41, 54) },
  { id: 'mkt-geo-1', subjectId: 'marketing', title: 'GEO : être cité par les IA', description: 'Generative Engine Optimization : comment ChatGPT, Perplexity et les AI Overviews choisissent leurs sources.', cards: [] },
  { id: 'mkt-case-2', subjectId: 'marketing', title: 'Cas pratiques : SEO, GEO et netlinking', description: 'Se faire citer par ChatGPT, réparer un netlinking toxique, mailler un gros site.', cards: [] },
  { id: 'mkt-paid-1', subjectId: 'marketing', title: 'Publicité : les bases', description: 'CPC, PPC, affiliation, remarketing, ROAS.', cards: slice('paid', 0, 8) },
  { id: 'mkt-paid-2', subjectId: 'marketing', title: 'Enchères et programmatique', description: 'Ad Rank, Quality Score, DSP / SSP, RTB.', cards: slice('paid', 11, 22) },
  { id: 'mkt-paid-3', subjectId: 'marketing', title: 'Google Ads avancé', description: 'PMax, types de correspondance, extensions, tCPA / tROAS.', cards: slice('paid', 22, 33) },
  { id: 'mkt-paid-4', subjectId: 'marketing', title: 'Ciblage', description: 'Frequency capping, dayparting, audiences, DCO.', cards: slice('paid', 46, 58) },
  { id: 'mkt-analytics-1', subjectId: 'marketing', title: 'Mesurer : les indicateurs', description: 'CTR, CPA, taux de rebond, sources de trafic.', cards: slice('analytics', 0, 8) },
  { id: 'mkt-analytics-2', subjectId: 'marketing', title: 'Attribution et GA4', description: 'Cohortes, conversions assistées, UTM, GTM.', cards: slice('analytics', 8, 16) },
  { id: 'mkt-analytics-3', subjectId: 'marketing', title: 'Modèles d’attribution', description: 'Linéaire, time decay, data-driven, incrémentalité.', cards: slice('analytics', 22, 30) },
  { id: 'mkt-analytics-4', subjectId: 'marketing', title: 'Tracking et UTM', description: 'Cross-device, cookieless, source / medium / campaign.', cards: slice('analytics', 31, 39) },
  { id: 'mkt-case-3', subjectId: 'marketing', title: 'Cas pratiques : Ads et analytics', description: 'ROAS en chute, chiffres qui ne collent pas, A/B test trop beau.', cards: [] },
  { id: 'mkt-cro-1', subjectId: 'marketing', title: 'Conversion et landing pages', description: 'CTA, taux de conversion, A/B test, heatmap.', cards: slice('cro', 0, 8) },
  { id: 'mkt-cro-2', subjectId: 'marketing', title: 'Tester sérieusement', description: 'Significativité, p-value, taille d’échantillon, friction.', cards: slice('cro', 12, 21) },
  { id: 'mkt-content-1', subjectId: 'marketing', title: 'Content marketing', description: 'Evergreen, copywriting, AIDA, pillar content.', cards: slice('content', 0, 8) },
  { id: 'mkt-email-1', subjectId: 'marketing', title: 'Email marketing', description: 'Taux d’ouverture, bounces, double opt-in, délivrabilité.', cards: slice('email', 0, 8) },
  { id: 'mkt-social-1', subjectId: 'marketing', title: 'Réseaux sociaux', description: 'Impressions, reach, engagement, UGC, influence.', cards: slice('social', 0, 8) },
  { id: 'mkt-growth-1', subjectId: 'marketing', title: 'Growth : AARRR', description: 'Acquisition, activation, rétention, referral, revenu.', cards: slice('growth', 0, 8) },
  { id: 'mkt-growth-2', subjectId: 'marketing', title: 'Rétention et churn', description: 'LTV / CAC, payback, net churn, expansion revenue.', cards: slice('growth', 8, 16) },
  { id: 'mkt-growth-3', subjectId: 'marketing', title: 'Les métriques SaaS', description: 'MRR, ARR, NRR, GRR, burn rate, runway.', cards: slice('growth', 21, 24).concat(slice('growth', 30, 36)) },
  { id: 'mkt-strategy-1', subjectId: 'marketing', title: 'Personas et positionnement', description: 'Démographie, psychographie, USP, inbound / outbound.', cards: slice('strategy', 13, 24) },
  { id: 'mkt-strategy-2', subjectId: 'marketing', title: 'LTV, CAC et pricing', description: 'Segmentation, nurturing, freemium, upsell, NPS.', cards: slice('strategy', 24, 36) },
  { id: 'mkt-strategy-3', subjectId: 'marketing', title: 'Marché et croissance', description: 'Blue ocean, TAM / SAM / SOM, MVP, product-market fit.', cards: slice('strategy', 73, 85) },
  { id: 'mkt-case-1', subjectId: 'marketing', title: 'Cas pratiques : le grand mix', description: 'Trafic, budget Ads, mots-clés, email, rebond : plusieurs décisions à prendre.', cards: [] },

  // -------------------------------------------------------------------- IA
  { id: 'ia-1', subjectId: 'ia', title: 'Les mots de l’IA', description: 'Hallucination, fine-tuning, multimodal, paramètres, open source.', cards: slice('ai', 0, 8) },
  { id: 'ia-hist-1', subjectId: 'ia', title: 'Une histoire de l’IA', description: 'De Turing à ChatGPT : les dates qui ont tout changé.', cards: slice('histoire', 0, 10) },
  { id: 'ia-2', subjectId: 'ia', title: 'Générer : texte, image, vidéo', description: 'Text-to-image, biais, agents, éthique.', cards: slice('ai', 8, 17) },
  { id: 'ia-9', subjectId: 'ia', title: 'Qui fait quoi : labos et modèles', description: 'OpenAI, Anthropic, Google, Meta, Mistral, NVIDIA, Hugging Face.', cards: slice('acteurs', 0, 10) },
  { id: 'ia-4', subjectId: 'ia', title: 'Comment fonctionne un LLM', description: 'Tokens, fenêtre de contexte, température, transformer, attention.', cards: ['ia-context-window', 'ia-temperature', 'ia-tokenization', 'ia-pre-training', 'ia-inference', 'ia-transformer-architecture', 'ia-neural-network', 'ia-attention-mechanism'] },
  { id: 'ia-llm-2', subjectId: 'ia', title: 'Tokens, contexte et coût', description: 'Ce que coûte un appel, ce qu’un modèle peut lire, ce qu’un benchmark vaut.', cards: slice('llm', 0, 10) },
  { id: 'ia-3', subjectId: 'ia', title: 'Le prompting', description: 'Zero-shot, few-shot, system prompt, chaînage, injection.', cards: ['ia-zero-shot', 'ia-few-shot', 'ia-system-prompt', 'ia-in-context-learning', 'ia-prompt-chaining', 'ia-negative-prompt', 'ia-prompt-library', 'ia-prompt-injection'] },
  { id: 'ia-prompt-2', subjectId: 'ia', title: 'Prompting avancé', description: 'Chain of thought, rôle, format de sortie, délimiteurs, jailbreak.', cards: slice('prompting', 0, 10) },
  { id: 'ia-5', subjectId: 'ia', title: 'RAG et bases vectorielles', description: 'Embeddings, recherche sémantique, données synthétiques, latence.', cards: ['ia-rag', 'ia-embedding', 'ia-vector-database', 'ia-semantic-search', 'ia-synthetic-data', 'ia-latency', 'ia-api-key', 'ia-top-p-nucleus-sampling'] },
  { id: 'ia-data-1', subjectId: 'ia', title: 'Bases de données pour l’IA', description: 'SQL, NoSQL, index, embeddings, pgvector, chunking.', cards: slice('donnees', 0, 10) },
  { id: 'ia-6', subjectId: 'ia', title: 'Entraîner un modèle', description: 'RLHF, overfitting, LoRA, quantization, backpropagation.', cards: ['ia-rlhf', 'ia-overfitting', 'ia-hyperparameter', 'ia-lora', 'ia-quantization', 'ia-loss-function', 'ia-backpropagation', 'ia-gradient-descent'] },
  { id: 'ia-train-2', subjectId: 'ia', title: 'Fabriquer un LLM, étape par étape', description: 'Corpus, tokenizer, lois d’échelle, SFT, DPO, évaluation, coût.', cards: slice('entrainement', 0, 10) },
  { id: 'ia-agents-1', subjectId: 'ia', title: 'Agents, outils et MCP', description: 'Appels d’outils, boucle agentique, mémoire, garde-fous, humain dans la boucle.', cards: slice('agents', 0, 10) },
  { id: 'ia-8', subjectId: 'ia', title: 'Modèles avancés', description: 'Workflows agentiques, MoE, diffusion, SLM, model collapse.', cards: ['ia-agent', 'ia-agentic-workflow', 'ia-moe', 'ia-diffusion-model', 'ia-small-language-model-slm', 'ia-model-collapse', 'ia-emergent-behavior', 'ia-inference-cost'] },
  { id: 'ia-7', subjectId: 'ia', title: 'Sécurité et alignement', description: 'Constitutional AI, red teaming, garde-fous, biais algorithmique.', cards: ['ia-alignment', 'ia-constitutional-ai', 'ia-rlaif', 'ia-red-teaming', 'ia-safety-guardrails', 'ia-algorithmic-bias', 'ia-explainable-ai-xai', 'ia-data-privacy-ai'] },
  { id: 'ia-reg-1', subjectId: 'ia', title: 'Loi, éthique et société', description: 'AI Act, RGPD, droit d’auteur, deepfakes, énergie.', cards: slice('regulation', 0, 8) },
  { id: 'ia-mkt-1', subjectId: 'ia', title: 'L’IA pour le marketing', description: 'AI Overviews, GEO, mentions de marque, chatbots, personas synthétiques.', cards: slice('marketing-ia', 0, 10) },
  { id: 'ia-case-1', subjectId: 'ia', title: 'Cas pratiques', description: 'RAG ou fine-tuning ? Quel modèle pour quel besoin ? Concevoir un agent.', cards: [] },

  // ---------------------------------------------------------------- Python
  { id: 'py-1', subjectId: 'python', title: 'Le terminal', description: 'pwd, ls, cd, mkdir… se déplacer et créer des fichiers.', cards: slice('terminal', 0, 8) },
  { id: 'py-2', subjectId: 'python', title: 'Premiers pas', description: 'print, type, int / str / float, input, f-strings.', cards: ['python-print', 'python-type', 'python-int', 'python-str', 'python-float', 'python-input', 'python-f-strings-f', 'python-len'] },
  { id: 'py-concepts-1', subjectId: 'python', title: 'Variables, booléens et None', description: 'Affectation, True / False, None, commentaires, indentation, mutable ou pas.', cards: slice('concepts', 0, 9) },
  { id: 'py-3', subjectId: 'python', title: 'Conditions, boucles, fonctions', description: 'if / else, for, while, range, def, return, import.', cards: ['python-if-else', 'python-for-loop', 'python-while-loop', 'python-range', 'python-try-except', 'python-def', 'python-return', 'python-import'] },
  { id: 'py-4', subjectId: 'python', title: 'Listes et dictionnaires', description: 'list, dict, append, split, join, sum, max, sorted.', cards: ['python-list', 'python-dict', 'python-append', 'python-split', 'python-join', 'python-sum', 'python-max', 'python-sorted'] },
  { id: 'py-concepts-2', subjectId: 'python', title: 'Collections et compréhensions', description: 'Tuples, sets, slicing, compréhensions, lambda, portée, modules, PEP 8.', cards: slice('concepts', 9, 18) },
  { id: 'py-5', subjectId: 'python', title: 'Manipuler du texte', description: 'upper, lower, strip, replace, split, join, capitalize, title.', cards: slice('chaines', 0, 8) },
  { id: 'py-6', subjectId: 'python', title: 'Vérifier et formater du texte', description: 'startswith, find, count, isdigit, format, lstrip.', cards: slice('chaines', 8, 18) },
  { id: 'py-7', subjectId: 'python', title: 'Lire les erreurs', description: 'SyntaxError, NameError, TypeError, KeyError…', cards: slice('erreurs', 0, 8) },
  { id: 'py-8', subjectId: 'python', title: 'Opérateurs', description: '+ − × ÷, division entière, modulo, booléens.', cards: slice('operateurs', 0, 8) },
  { id: 'py-pratiques-1', subjectId: 'python', title: 'Écrire du code propre', description: 'try / except, assert, pytest, docstrings, type hints, DRY, nommage.', cards: slice('pratiques', 0, 8) },
  { id: 'py-outils-1', subjectId: 'python', title: 'L’atelier du développeur', description: 'venv, requirements.txt, notebooks, __main__, breakpoint, logging, .env.', cards: slice('outils', 0, 8) },
  { id: 'py-9', subjectId: 'python', title: 'Pandas : lire des données', description: 'read_csv, read_excel, head, info, describe.', cards: slice('pandas', 0, 8) },
  { id: 'py-10', subjectId: 'python', title: 'Pandas : nettoyer et agréger', description: 'rename, drop, dropna, fillna, groupby, sum, mean.', cards: slice('pandas', 8, 16) },
  { id: 'py-11', subjectId: 'python', title: 'Pandas : analyser', description: 'loc, iloc, apply, merge, value_counts, pivot_table.', cards: slice('pandas', 16, 24) },
  { id: 'py-data-1', subjectId: 'python', title: 'Pandas : les concepts', description: 'DataFrame, Series, dtype, NaN, index, jointures, dates, graphiques, export.', cards: slice('donnees-py', 0, 10) },
  { id: 'py-12', subjectId: 'python', title: 'Requêtes HTTP', description: 'requests.get / post, status_code, json, headers, params.', cards: slice('requests', 0, 7) },
  { id: 'py-13', subjectId: 'python', title: 'Fichiers', description: 'open, with, write, os.listdir.', cards: slice('fichiers', 0, 4) },
  { id: 'py-web-1', subjectId: 'python', title: 'API, JSON et scraping', description: 'REST, endpoints, clés d’API, timeouts, BeautifulSoup, gspread, cron.', cards: slice('web-py', 0, 10) },
  { id: 'py-case-1', subjectId: 'python', title: 'Cas pratiques', description: 'Automatiser un rapport, nettoyer un export, surveiller des prix.', cards: [] },

  // ------------------------------------------------------------------- Web
  { id: 'web-1', subjectId: 'web', title: 'Le web, côté client et serveur', description: 'Front-end, back-end, navigateur, déploiement, bug.', cards: slice('code', 0, 7) },
  { id: 'web-2', subjectId: 'web', title: 'HTML : les bases', description: 'Balises, structure d’une page, titres, liens, images.', cards: [] },
  { id: 'web-html-2', subjectId: 'web', title: 'HTML : sémantique et SEO', description: 'Balises sémantiques, titres, title, meta, canonical, robots, formulaires.', cards: slice('html', 0, 10) },
  { id: 'web-3', subjectId: 'web', title: 'CSS : les bases', description: 'Sélecteurs, propriétés, box model, flexbox.', cards: [] },
  { id: 'web-css-2', subjectId: 'web', title: 'CSS : mise en page responsive', description: 'Spécificité, flexbox, grid, media queries, unités, variables, CLS.', cards: slice('css', 0, 10) },
  { id: 'web-4', subjectId: 'web', title: 'JavaScript : les bases', description: 'Variables, fonctions, tableaux, DOM, événements.', cards: [] },
  { id: 'web-js-2', subjectId: 'web', title: 'JavaScript : le navigateur', description: 'DOM, événements, tableaux, JSON, async / await, fetch, console.', cards: slice('js', 0, 10) },
  { id: 'web-5', subjectId: 'web', title: 'Outils du développeur', description: 'Git, GitHub, variables, fonctions, frameworks, SDK.', cards: slice('code', 7, 16) },
  { id: 'web-6', subjectId: 'web', title: 'Performance et sécurité', description: 'Minification, cache, SSL, DevTools, cookies, data layer.', cards: slice('code', 16, 25) },
  { id: 'web-7', subjectId: 'web', title: 'Rendu et architecture', description: 'AJAX, SSR / CSR, headless, DNS, CDN, lazy loading.', cards: slice('code', 25, 37) },
  { id: 'web-mkt-1', subjectId: 'web', title: 'Le web du marketeur', description: 'GTM, dataLayer, pixels, consentement, JSON-LD, Open Graph, LCP.', cards: slice('web-mkt', 0, 10) },
  { id: 'web-case-1', subjectId: 'web', title: 'Cas pratiques', description: 'Un tracking qui ne remonte pas, une page lente, un partage moche.', cards: [] },
];

export const UNIT_BY_ID: ReadonlyMap<string, Unit> = new Map(UNITS.map((u) => [u.id, u]));
