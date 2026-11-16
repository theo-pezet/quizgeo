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
  { id: 'mkt-bases-1', subjectId: 'marketing', title: 'Core vocabulary', description: 'Conversion, B2B, CPM, segmentation: the words everyone uses.', cards: slice('general', 0, 8) },
  { id: 'mkt-bases-2', subjectId: 'marketing', title: 'Funnel and leads', description: 'ROI, KPI, TOFU / MOFU / BOFU: the prospect’s journey.', cards: slice('strategy', 0, 8) },
  { id: 'mkt-seo-1', subjectId: 'marketing', title: 'SEO: the fundamentals', description: 'Backlinks, authority, SERP, organic traffic.', cards: slice('seo', 0, 8) },
  { id: 'mkt-seo-2', subjectId: 'marketing', title: 'SEO: on-page and keywords', description: 'Sitemap, long tail, white hat / black hat, topic clusters.', cards: slice('seo', 8, 16) },
  { id: 'mkt-seo-3', subjectId: 'marketing', title: 'Technical SEO', description: 'Canonical, 301, robots.txt, schema, E-E-A-T, mobile-first.', cards: slice('seo', 16, 24) },
  { id: 'mkt-seo-4', subjectId: 'marketing', title: 'Intent and Core Web Vitals', description: 'User intent, zero-click, LCP / FID / CLS.', cards: slice('seo', 24, 33) },
  { id: 'mkt-seo-5', subjectId: 'marketing', title: 'Link building and internal links', description: 'Internal and external links, nofollow, DR, negative SEO.', cards: slice('seo', 33, 41) },
  { id: 'mkt-seo-6', subjectId: 'marketing', title: 'Audit and indexing', description: 'Disavow, hreflang, thin content, crawlability.', cards: slice('seo', 41, 54) },
  { id: 'mkt-geo-1', subjectId: 'marketing', title: 'GEO: getting cited by AI', description: 'Generative Engine Optimization: how ChatGPT, Perplexity and AI Overviews pick their sources.', cards: [] },
  { id: 'mkt-case-2', subjectId: 'marketing', title: 'Case studies: SEO, GEO and links', description: 'Get cited by ChatGPT, repair toxic links, structure a big site.', cards: [] },
  { id: 'mkt-paid-1', subjectId: 'marketing', title: 'Ads: the basics', description: 'CPC, PPC, affiliation, remarketing, ROAS.', cards: slice('paid', 0, 8) },
  { id: 'mkt-paid-2', subjectId: 'marketing', title: 'Auctions and programmatic', description: 'Ad Rank, Quality Score, DSP / SSP, RTB.', cards: slice('paid', 11, 22) },
  { id: 'mkt-paid-3', subjectId: 'marketing', title: 'Advanced Google Ads', description: 'PMax, match types, extensions, tCPA / tROAS.', cards: slice('paid', 22, 33) },
  { id: 'mkt-paid-4', subjectId: 'marketing', title: 'Targeting', description: 'Frequency capping, dayparting, audiences, DCO.', cards: slice('paid', 46, 58) },
  { id: 'mkt-analytics-1', subjectId: 'marketing', title: 'Measuring: the metrics', description: 'CTR, CPA, bounce rate, traffic sources.', cards: slice('analytics', 0, 8) },
  { id: 'mkt-analytics-2', subjectId: 'marketing', title: 'Attribution and GA4', description: 'Cohorts, assisted conversions, UTM, GTM.', cards: slice('analytics', 8, 16) },
  { id: 'mkt-analytics-3', subjectId: 'marketing', title: 'Attribution models', description: 'Linear, time decay, data-driven, incrementality.', cards: slice('analytics', 22, 30) },
  { id: 'mkt-analytics-4', subjectId: 'marketing', title: 'Tracking and UTM', description: 'Cross-device, cookieless, source / medium / campaign.', cards: slice('analytics', 31, 39) },
  { id: 'mkt-case-3', subjectId: 'marketing', title: 'Case studies: Ads and analytics', description: 'Falling ROAS, numbers that don’t add up, an A/B test too good to be true.', cards: [] },
  { id: 'mkt-cro-1', subjectId: 'marketing', title: 'Conversion and landing pages', description: 'CTA, conversion rate, A/B test, heatmap.', cards: slice('cro', 0, 8) },
  { id: 'mkt-cro-2', subjectId: 'marketing', title: 'Testing seriously', description: 'Significance, p-value, sample size, friction.', cards: slice('cro', 12, 21) },
  { id: 'mkt-content-1', subjectId: 'marketing', title: 'Content marketing', description: 'Evergreen, copywriting, AIDA, pillar content.', cards: slice('content', 0, 8) },
  { id: 'mkt-email-1', subjectId: 'marketing', title: 'Email marketing', description: 'Open rate, bounces, double opt-in, deliverability.', cards: slice('email', 0, 8) },
  { id: 'mkt-social-1', subjectId: 'marketing', title: 'Social media', description: 'Impressions, reach, engagement, UGC, influence.', cards: slice('social', 0, 8) },
  { id: 'mkt-growth-1', subjectId: 'marketing', title: 'Growth: AARRR', description: 'Acquisition, activation, retention, referral, revenue.', cards: slice('growth', 0, 8) },
  { id: 'mkt-growth-2', subjectId: 'marketing', title: 'Retention and churn', description: 'LTV / CAC, payback, net churn, expansion revenue.', cards: slice('growth', 8, 16) },
  { id: 'mkt-growth-3', subjectId: 'marketing', title: 'SaaS metrics', description: 'MRR, ARR, NRR, GRR, burn rate, runway.', cards: slice('growth', 21, 24).concat(slice('growth', 30, 36)) },
  { id: 'mkt-strategy-1', subjectId: 'marketing', title: 'Personas and positioning', description: 'Demographics, psychographics, USP, inbound / outbound.', cards: slice('strategy', 13, 24) },
  { id: 'mkt-strategy-2', subjectId: 'marketing', title: 'LTV, CAC and pricing', description: 'Segmentation, nurturing, freemium, upsell, NPS.', cards: slice('strategy', 24, 36) },
  { id: 'mkt-strategy-3', subjectId: 'marketing', title: 'Market and growth', description: 'Blue ocean, TAM / SAM / SOM, MVP, product-market fit.', cards: slice('strategy', 73, 85) },
  { id: 'mkt-case-1', subjectId: 'marketing', title: 'Case studies: the big mix', description: 'Traffic, Ads budget, keywords, email, bounce: several decisions to make.', cards: [] },

  // -------------------------------------------------------------------- IA
  { id: 'ia-1', subjectId: 'ia', title: 'The words of AI', description: 'Hallucination, fine-tuning, multimodal, parameters, open source.', cards: slice('ai', 0, 8) },
  { id: 'ia-hist-1', subjectId: 'ia', title: 'A history of AI', description: 'From Turing to ChatGPT: the dates that changed everything.', cards: slice('histoire', 0, 10) },
  { id: 'ia-2', subjectId: 'ia', title: 'Generating: text, image, video', description: 'Text-to-image, bias, agents, ethics.', cards: slice('ai', 8, 17) },
  { id: 'ia-9', subjectId: 'ia', title: 'Who does what: labs and models', description: 'OpenAI, Anthropic, Google, Meta, Mistral, NVIDIA, Hugging Face.', cards: slice('acteurs', 0, 10) },
  { id: 'ia-4', subjectId: 'ia', title: 'How an LLM works', description: 'Tokens, context window, temperature, transformer, attention.', cards: ['ia-context-window', 'ia-temperature', 'ia-tokenization', 'ia-pre-training', 'ia-inference', 'ia-transformer-architecture', 'ia-neural-network', 'ia-attention-mechanism'] },
  { id: 'ia-llm-2', subjectId: 'ia', title: 'Tokens, context and cost', description: 'What a call costs, what a model can read, what a benchmark is worth.', cards: slice('llm', 0, 10) },
  { id: 'ia-3', subjectId: 'ia', title: 'Prompting', description: 'Zero-shot, few-shot, system prompt, chaining, injection.', cards: ['ia-zero-shot', 'ia-few-shot', 'ia-system-prompt', 'ia-in-context-learning', 'ia-prompt-chaining', 'ia-negative-prompt', 'ia-prompt-library', 'ia-prompt-injection'] },
  { id: 'ia-prompt-2', subjectId: 'ia', title: 'Advanced prompting', description: 'Chain of thought, role, output format, delimiters, jailbreak.', cards: slice('prompting', 0, 10) },
  { id: 'ia-5', subjectId: 'ia', title: 'RAG and vector databases', description: 'Embeddings, semantic search, synthetic data, latency.', cards: ['ia-rag', 'ia-embedding', 'ia-vector-database', 'ia-semantic-search', 'ia-synthetic-data', 'ia-latency', 'ia-api-key', 'ia-top-p-nucleus-sampling'] },
  { id: 'ia-data-1', subjectId: 'ia', title: 'Databases for AI', description: 'SQL, NoSQL, indexes, embeddings, pgvector, chunking.', cards: slice('donnees', 0, 10) },
  { id: 'ia-6', subjectId: 'ia', title: 'Training a model', description: 'RLHF, overfitting, LoRA, quantization, backpropagation.', cards: ['ia-rlhf', 'ia-overfitting', 'ia-hyperparameter', 'ia-lora', 'ia-quantization', 'ia-loss-function', 'ia-backpropagation', 'ia-gradient-descent'] },
  { id: 'ia-train-2', subjectId: 'ia', title: 'Building an LLM, step by step', description: 'Corpus, tokenizer, scaling laws, SFT, DPO, evaluation, cost.', cards: slice('entrainement', 0, 10) },
  { id: 'ia-agents-1', subjectId: 'ia', title: 'Agents, tools and MCP', description: 'Tool calls, agentic loop, memory, guardrails, human in the loop.', cards: slice('agents', 0, 10) },
  { id: 'ia-8', subjectId: 'ia', title: 'Advanced models', description: 'Agentic workflows, MoE, diffusion, SLM, model collapse.', cards: ['ia-agent', 'ia-agentic-workflow', 'ia-moe', 'ia-diffusion-model', 'ia-small-language-model-slm', 'ia-model-collapse', 'ia-emergent-behavior', 'ia-inference-cost'] },
  { id: 'ia-7', subjectId: 'ia', title: 'Safety and alignment', description: 'Constitutional AI, red teaming, guardrails, algorithmic bias.', cards: ['ia-alignment', 'ia-constitutional-ai', 'ia-rlaif', 'ia-red-teaming', 'ia-safety-guardrails', 'ia-algorithmic-bias', 'ia-explainable-ai-xai', 'ia-data-privacy-ai'] },
  { id: 'ia-reg-1', subjectId: 'ia', title: 'Law, ethics and society', description: 'AI Act, GDPR, copyright, deepfakes, energy.', cards: slice('regulation', 0, 8) },
  { id: 'ia-mkt-1', subjectId: 'ia', title: 'AI for marketing', description: 'AI Overviews, GEO, brand mentions, chatbots, synthetic personas.', cards: slice('marketing-ia', 0, 10) },
  { id: 'ia-case-1', subjectId: 'ia', title: 'Case studies', description: 'RAG or fine-tuning? Which model for which need? Designing an agent.', cards: [] },

  // ---------------------------------------------------------------- Python
  { id: 'py-1', subjectId: 'python', title: 'The terminal', description: 'pwd, ls, cd, mkdir: moving around and creating files.', cards: slice('terminal', 0, 8) },
  { id: 'py-2', subjectId: 'python', title: 'First steps', description: 'print, type, int / str / float, input, f-strings.', cards: ['python-print', 'python-type', 'python-int', 'python-str', 'python-float', 'python-input', 'python-f-strings-f', 'python-len'] },
  { id: 'py-concepts-1', subjectId: 'python', title: 'Variables, booleans and None', description: 'Assignment, True / False, None, comments, indentation, mutable or not.', cards: slice('concepts', 0, 9) },
  { id: 'py-3', subjectId: 'python', title: 'Conditions, loops, functions', description: 'if / else, for, while, range, def, return, import.', cards: ['python-if-else', 'python-for-loop', 'python-while-loop', 'python-range', 'python-try-except', 'python-def', 'python-return', 'python-import'] },
  { id: 'py-4', subjectId: 'python', title: 'Lists and dictionaries', description: 'list, dict, append, split, join, sum, max, sorted.', cards: ['python-list', 'python-dict', 'python-append', 'python-split', 'python-join', 'python-sum', 'python-max', 'python-sorted'] },
  { id: 'py-concepts-2', subjectId: 'python', title: 'Collections and comprehensions', description: 'Tuples, sets, slicing, comprehensions, lambda, scope, modules, PEP 8.', cards: slice('concepts', 9, 18) },
  { id: 'py-5', subjectId: 'python', title: 'Working with text', description: 'upper, lower, strip, replace, split, join, capitalize, title.', cards: slice('chaines', 0, 8) },
  { id: 'py-6', subjectId: 'python', title: 'Checking and formatting text', description: 'startswith, find, count, isdigit, format, lstrip.', cards: slice('chaines', 8, 18) },
  { id: 'py-7', subjectId: 'python', title: 'Reading errors', description: 'SyntaxError, NameError, TypeError, KeyError…', cards: slice('erreurs', 0, 8) },
  { id: 'py-8', subjectId: 'python', title: 'Operators', description: '+ − × ÷, integer division, modulo, booleans.', cards: slice('operateurs', 0, 8) },
  { id: 'py-pratiques-1', subjectId: 'python', title: 'Writing clean code', description: 'try / except, assert, pytest, docstrings, type hints, DRY, naming.', cards: slice('pratiques', 0, 8) },
  { id: 'py-outils-1', subjectId: 'python', title: 'The developer’s workshop', description: 'venv, requirements.txt, notebooks, __main__, breakpoint, logging, .env.', cards: slice('outils', 0, 8) },
  { id: 'py-9', subjectId: 'python', title: 'Pandas: reading data', description: 'read_csv, read_excel, head, info, describe.', cards: slice('pandas', 0, 8) },
  { id: 'py-10', subjectId: 'python', title: 'Pandas: cleaning and aggregating', description: 'rename, drop, dropna, fillna, groupby, sum, mean.', cards: slice('pandas', 8, 16) },
  { id: 'py-11', subjectId: 'python', title: 'Pandas: analyzing', description: 'loc, iloc, apply, merge, value_counts, pivot_table.', cards: slice('pandas', 16, 24) },
  { id: 'py-data-1', subjectId: 'python', title: 'Pandas: the concepts', description: 'DataFrame, Series, dtype, NaN, index, joins, dates, charts, export.', cards: slice('donnees-py', 0, 10) },
  { id: 'py-12', subjectId: 'python', title: 'HTTP requests', description: 'requests.get / post, status_code, json, headers, params.', cards: slice('requests', 0, 7) },
  { id: 'py-13', subjectId: 'python', title: 'Files', description: 'open, with, write, os.listdir.', cards: slice('fichiers', 0, 4) },
  { id: 'py-web-1', subjectId: 'python', title: 'APIs, JSON and scraping', description: 'REST, endpoints, API keys, timeouts, BeautifulSoup, gspread, cron.', cards: slice('web-py', 0, 10) },
  { id: 'py-case-1', subjectId: 'python', title: 'Case studies', description: 'Automate a report, clean an export, monitor prices.', cards: [] },

  // ------------------------------------------------------------------ HTML
  { id: 'web-1', subjectId: 'html', title: 'The web, client and server side', description: 'Front-end, back-end, browser, deployment, bug.', cards: slice('code', 0, 7) },
  { id: 'web-2', subjectId: 'html', title: 'HTML: the basics', description: 'Tags, page structure, headings, links, images.', cards: [] },
  { id: 'web-html-2', subjectId: 'html', title: 'HTML: semantics and SEO', description: 'Semantic tags, headings, title, meta, canonical, robots, forms.', cards: slice('html', 0, 10) },
  { id: 'web-mkt-1', subjectId: 'html', title: 'The marketer’s web', description: 'GTM, dataLayer, pixels, consent, JSON-LD, Open Graph, LCP.', cards: slice('web-mkt', 0, 10) },

  // ------------------------------------------------------------------- CSS
  { id: 'web-3', subjectId: 'css', title: 'CSS: the basics', description: 'Selectors, properties, box model, flexbox.', cards: [] },
  { id: 'web-css-2', subjectId: 'css', title: 'CSS: responsive layout', description: 'Specificity, flexbox, grid, media queries, units, variables, CLS.', cards: slice('css', 0, 10) },
  { id: 'web-css-3', subjectId: 'css', title: 'CSS: colors, fonts and animations', description: 'hsl, rem, font-family, transitions, @keyframes, :hover, shadows, dark mode.', cards: ['web-x-couleurs-css', 'web-x-unites-rem-et-em', 'web-x-pile-de-polices', 'web-x-position-et-z-index', 'web-x-animation-et-keyframes', 'web-x-pseudo-classes-hover-et-focus', 'web-x-ombre-et-arrondi', 'web-x-mode-sombre-prefers-color-scheme'] },

  // ------------------------------------------------------------ JavaScript
  { id: 'web-4', subjectId: 'js', title: 'JavaScript: the basics', description: 'Variables, functions, arrays, DOM, events.', cards: [] },
  { id: 'web-js-2', subjectId: 'js', title: 'JavaScript: the browser', description: 'DOM, events, arrays, JSON, async / await, fetch, console.', cards: slice('js', 0, 10) },
  { id: 'web-5', subjectId: 'js', title: 'Developer tools', description: 'Git, GitHub, variables, functions, frameworks, SDK.', cards: slice('code', 0, 9) },
  { id: 'web-6', subjectId: 'js', title: 'Performance and security', description: 'Minification, cache, SSL, DevTools, cookies, data layer.', cards: slice('code', 9, 18) },
  { id: 'web-7', subjectId: 'js', title: 'Rendering and architecture', description: 'AJAX, SSR / CSR, headless, DNS, CDN, lazy loading.', cards: slice('code', 18, 30) },
  { id: 'web-case-1', subjectId: 'js', title: 'Case studies', description: 'Tracking that doesn’t fire, a slow page, an ugly share preview.', cards: [] },
];

export const UNIT_BY_ID: ReadonlyMap<string, Unit> = new Map(UNITS.map((u) => [u.id, u]));
