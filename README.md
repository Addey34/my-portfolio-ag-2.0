# Portfolio — Adrian Guichard (v2)

Portfolio scrollytelling **Vite + TypeScript strict**. Une scène Three.js persistante accompagne le récit sous une lampe fixe : du pendentif AG et de l'horloge jusqu'aux objets des projets et au contact.

**🌐 Site :** [www.adrianguichard.dev](https://www.adrianguichard.dev/)

## Documents français et anglais

`index.html` est le gabarit commun. Le plugin Vite utilise `tools/localizedHtml.ts`
et parse5 (build uniquement) pour produire `dist/index.html` en français et
`dist/en/index.html` en anglais, avec les mêmes bundles et assets. Les textes
viennent de `src/i18n/dictionary.ts` et `src/content/projects.ts` ; les métadonnées,
l’identité Person et les URLs sont centralisées dans `src/i18n/seo.ts`.
Le sitemap est généré depuis cette même configuration, sans fichier public concurrent.
Le serveur de développement rend également les deux documents explicitement.

L’URL fait autorité sur le stockage et la langue du navigateur. Le lien FR/EN
fonctionne sans JavaScript ; son amélioration progressive conserve le monde 3D,
les réglages et une position dans le récit. Précédent/suivant suit la langue de l’URL.

Cloudflare Pages doit recevoir tout `dist/`, y compris `en/index.html` et `404.html`.
Les chemins inconnus disposent ainsi d’une vraie 404 plutôt que du fallback SPA.
Aucune règle `_redirects` ajoutée : la normalisation native de `/en`, `/en/` et
`/en/index.html` reste à qualifier sur Cloudflare avant publication. Vite Preview
ne reproduit pas toutes ses règles. Les tests CSP appliquent localement la politique
existante de `public/_headers` ; ils ne prouvent pas la prise en compte du JSON-LD
par un moteur de recherche.

Validation ciblée : `pnpm verify`, puis `pnpm exec playwright test
e2e/seo-i18n.spec.ts e2e/visitor-entry.spec.ts --workers=1`. Pour contrôler le build,
servir `dist` avec `pnpm preview` et définir `E2E_BASE_URL` sur son URL exacte.
Les vingt captures de revue du récit sont activables avec `SEO_VISUAL_CAPTURE=1` ;
les assertions fonctionnelles restent actives sans cette option, notamment en CI.

CircleCI exécute les mêmes fichiers SEO/contact dans deux étapes successives,
desktop puis Android, avec un worker et un plafond de dix minutes par profil.
Le plafond Playwright de 570 secondes laisse une marge pour écrire les rapports
avant le garde-fou GNU. Chaque campagne conserve son code de sortie ; Android
est exécuté même après un échec desktop. Aucun job supplémentaire n’est créé.
`E2E_REPORT_DIR` active les rapports JUnit/JSON ; les traces DOM/réseau et la
capture automatique sont conservées seulement en cas d’échec, sans vidéo, sources Git
ou retry automatique. Les rapports sont collectés après chaque campagne, même
rouge. La rétention des artefacts reste celle du projet CircleCI (30 jours par
défaut), sans modification des paramètres du compte.
Les scénarios de liens linguistiques utilisent le bouton d’accès anticipé et gardent
les téléchargements GLB en attente pendant leurs interactions. Le test distinct
de bascule 3D charge les vrais modèles et contrôle le canvas et le ticker.
Les traversées complètes FR et EN ont chacune un cas et un budget indépendants ;
elles chargent les vrais modèles depuis Galaxy puis visitent les dix sections,
du héros au contact. Le budget individuel de 180 secondes reste inchangé.
Les tests du formulaire conservent le chargement 3D et leurs gardes réseau
inchangées : chaque requête est inspectée, toute transmission synthétique bloquée.

## Le parti pris technique : un scroll coordonné

La fluidité dépend notamment de l'appareil et du coût de la scène. Deux choix structurent le parcours :

1. **Lenis** lisse le défilement et **le ticker GSAP** pilote Lenis, ScrollTrigger et le monde 3D. Les chapitres ne possèdent pas leur propre écouteur de scroll.
2. Les animations DOM privilégient **`transform` et `opacity`** ; les déclarations temporaires `will-change` sont retirées après usage.

Voir [`src/core/SmoothScroll.ts`](src/core/SmoothScroll.ts) — c'est la pièce maîtresse.

## Stack

| Lib                  | Rôle                                                    |
| -------------------- | ------------------------------------------------------- |
| Vite                 | Bundler + dev server                                    |
| TypeScript           | Typage strict (`noUnusedLocals` / `noUnusedParameters`) |
| Three.js             | Un seul monde WebGL et des objets 3D par chapitre       |
| `VisualDirector`     | État visuel commun piloté par les sections et le scroll |
| GSAP + ScrollTrigger | Scrub des chapitres, reveals batchés, ticker maître     |
| Lenis                | Smooth-scroll normalisé (anti-jank)                     |
| View Transitions API | Cross-fade du contenu au changement de langue           |

Le contenu HTML, les liens et la navigation restent accessibles si WebGL n'est pas disponible. Le monde 3D respecte `prefers-reduced-motion` et les réglages de l'utilisateur.

## Le cœur du design : une chaîne de métamorphoses

La lampe reste fixe tandis que les objets se succèdent et se transforment. Les formes de projet évoquent leur sujet sans recopier leurs interfaces :

- **Galaxy** — astrolabe et orbites.
- **Ludora** — dé ancien et tuiles de plateau.
- **MagNotes** — grimoire et notes en lévitation.

Le héros ouvre sur le pendentif AG, puis révèle l'horloge éditable dans Blender. Ses pièces s'écartent et deviennent les quatre modules du cube des stacks, associés à 24 technologies dans le HTML. Suivent le monolithe Solutions, les sceaux des projets, leurs objets, les artefacts des études et la lettre de contact. Le texte reste lisible indépendamment du décor.

### Direction des prochaines itérations

- Varier le geste du scroll selon chaque passage ; éviter un morphing identique répété partout.
- Affiner la lisibilité des quatre familles de stacks et de leurs liens aux projets.
- Travailler le trajet inverse, la lumière, la taille mobile et le coût GPU sur de vrais appareils.
- Préserver la reconnaissance des projets sans faux raccord ni reproduction factice de leurs UI.

## Commandes

```bash
pnpm install
pnpm dev            # serveur de dev ; ouvrir l'URL imprimée par Vite
pnpm build          # tsc --noEmit puis build de production → dist/
pnpm preview        # servir le build localement
pnpm typecheck      # vérification de types seule
pnpm test           # tests unitaires Vitest
pnpm exec playwright install chromium webkit  # une fois sur le poste
pnpm test:e2e       # parcours responsive desktop, Android et iPhone émulés
pnpm lint           # ESLint (flat config) ; lint:fix pour corriger
pnpm format         # Prettier
pnpm verify         # tests + format:check + lint + typecheck + build
```

`src/chapters/`, `src/visual/SignalField.ts` et `src/ui/MagneticCursor.ts` conservent les prototypes Canvas et curseur. Ils ne sont pas chargés par le parcours public actuel.

Pour contrôler une prévisualisation publiée, définir `E2E_BASE_URL` avec son URL
avant `pnpm test:e2e` ; Playwright utilise alors cette adresse sans lancer Vite.

## Architecture

```
src/
├── main.ts                 # Racine de composition : câble tout sur la boucle unique
├── style.css               # Design tokens + styles
├── core/
│   ├── SmoothScroll.ts      # Lenis + ticker GSAP + pont ScrollTrigger (anti-jank)
│   ├── reveals.ts           # Reveals à l'entrée du viewport (ScrollTrigger.batch)
│   ├── scrollScenes.ts      # Parallaxe du héros (scrub)
│   └── motion.ts            # Garde-fou prefers-reduced-motion
├── i18n/
│   ├── dictionary.ts        # Dictionnaire FR/EN — SOURCE UNIQUE des textes d'UI
│   └── index.ts             # t()/tl(), toggle, registre dynamique, View Transition
├── visual/
│   ├── VisualDirector.ts    # État artistique global + transitions entre univers
│   ├── StoryWorld3D.ts      # Renderer WebGL unique, géométries et formes projet
│   └── types.ts             # Contrat VisualState partagé par tous les rendus
├── ui/
│   ├── CommandPalette.ts    # Palette Ctrl/⌘+K : navigation, langue, liens
│   ├── ControlPanel.ts      # Réglages ⚙ : décor, pointeur, mouvement (persistés)
│   └── SectionRail.ts       # Navigation et progression entre les sections
├── content/
│   ├── projects.ts          # Catalogue des projets — SOURCE UNIQUE
│   └── renderProjects.ts    # Construit le DOM des chapitres depuis la source unique
└── utils/
    └── FPSCounter.ts        # Sonde FPS (dev only) — détecte les chutes de perf
```

### Ajouter une langue

Une entrée par clé dans `src/i18n/dictionary.ts` (les nœuds `[data-i18n]` du HTML
et tout le contenu localisé `{ fr, en }` de `projects.ts` suivent automatiquement).

### Ajouter un projet (le chemin évolutif)

1. Ajouter une entrée dans `PROJECTS` (`src/content/projects.ts`) : contenu, liens, navigation et palette en dérivent.
2. Ajouter sa signature abstraite dans `StoryWorld3D` et sa cible dans `VisualDirector`, puis vérifier les transitions aller et retour.

## Budget performance (les garde-fous « œil aguerri »)

- Le renderer partage un seul canvas et limite sa surface à 1,6 million de pixels (1 million en mode léger). Le DPR est plafonné à 1,5 sur grand écran, 2 en compact et 1 en mode léger. La cadence vise 45 i/s hors horloge visible, 20 i/s en mode léger ; l'horloge visible n'a pas ce plafond de 45 i/s.
- `prefers-reduced-motion` : Lenis désactivé, reveals instantanés et une composition fixe par scène.
- Le build sépare Three.js du code applicatif. Des mesures sur appareils réels ont été réalisées en octobre 2026 ; elles ne remplacent pas un contrôle après de futurs changements.
- Sonde FPS visible en dev avec `?fps` pour repérer les chutes du ticker JS.

## Fonctionnalités

- **Un monde 3D continu** — une lampe et des objets liés par les transitions du récit.
- **i18n FR/EN** — bascule instantanée (HUD ou palette), persistée, sans framework
  ; le contenu se cross-fade via la View Transitions API.
- **Panneau de réglages ⚙** — visibilité du décor, réaction au pointeur et mouvement 3D persistés.
- **Direction visuelle unifiée** — le pendentif AG devient une horloge, puis ses pièces ouvrent la suite du récit.
- **Command palette Ctrl/⌘+K** — navigation vers sections/projets, changement de
  langue, liens externes ; filtrage et navigation clavier, focus restauré (a11y).

## Pistes suivantes

- Affiner les formes, matériaux et mouvements propres à chaque chapitre ; mesurer les performances sur mobile.
- Vérifier régulièrement les parcours accessibles, les transitions inverses et les appareils mobiles après les changements visuels.

## Intégration GitHub

Le portfolio utilise l’API REST publique de GitHub pour afficher des informations
à jour sur le profil `Addey34` et son activité publique récente.

- API : `https://api.github.com`
- Données : profil public + dépôts publics appartenant au compte
- Authentification : aucune, uniquement des données publiques
- Cache navigateur : 30 minutes pour limiter les requêtes
- Contact : `contact@adrianguichard.dev`

L’intégration est conçue avec un fallback silencieux : une indisponibilité ou un
rate-limit GitHub n’empêche jamais le portfolio de fonctionner.

## Licence

Code sous **PolyForm Noncommercial License 1.0.0** (comme Galaxy / Ludora / MagNotes).
