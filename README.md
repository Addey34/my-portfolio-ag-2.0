# Portfolio — Adrian Guichard (v2)

Portfolio scrollytelling **Vite + TypeScript strict**. Une scène Three.js persistante fait traverser au même médaillon l'horloge, les initiales AG, les stacks et les projets, sous une lampe fixe.

**🌐 Démo :** _à déployer_

## Le parti pris technique : un scroll qui ne casse jamais

Le problème classique des portfolios animés — « ça saccade en scroll rapide / trackpad / mobile » —
vient de deux erreurs qu'on évite ici par construction :

1. **On ne lie jamais une animation à l'événement `scroll`** (irrégulier, en retard, deltas
   énormes). À la place : **Lenis** lisse le scroll (lerp), et **une seule horloge — le ticker
   GSAP** — pilote Lenis, ScrollTrigger et le monde 3D. Aucun ticker de rendu concurrent.
2. **On n'anime que `transform` et `opacity`** (composité GPU, zéro reflow). `will-change` est posé
   puis _retiré_ après l'animation.

Voir [`src/core/SmoothScroll.ts`](src/core/SmoothScroll.ts) — c'est la pièce maîtresse.

## Stack

| Lib                  | Rôle                                                    |
| -------------------- | ------------------------------------------------------- |
| Vite                 | Bundler + dev server                                    |
| TypeScript           | Typage strict (`noUnusedLocals` / `noUnusedParameters`) |
| Three.js             | Un seul monde WebGL et des formes dans le médaillon      |
| `VisualDirector`     | État visuel commun piloté par les sections et le scroll |
| GSAP + ScrollTrigger | Scrub des chapitres, reveals batchés, ticker maître     |
| Lenis                | Smooth-scroll normalisé (anti-jank)                     |
| View Transitions API | Cross-fade du contenu au changement de langue           |

Le contenu HTML, les liens et la navigation restent accessibles si WebGL n'est pas disponible. Le monde 3D respecte `prefers-reduced-motion` et les réglages de l'utilisateur.

## Le cœur du design : un médaillon qui change de sens

La scène garde la même lampe et le même contour. Le médaillon tourne au passage des sections ; son intérieur évolue avec le récit. Les formes de projet évoquent une idée sans recopier leurs interfaces :

- **Galaxy** — noyau lumineux et orbites spatiales.
- **Ludora** — grille de pièces de jeu en volume.
- **MagNotes** — cartes reliées qui passent de la dispersion à l'organisation.

Le héros ouvre sur le médaillon AG. Son boîtier tourne et laisse apparaître l'horloge GLB éditable dans Blender. À la troisième section, le verre, les aiguilles, le cadran avec ses rouages et le boîtier de cette horloge se séparent en quatre familles liées à 24 technologies visibles dans le HTML et aux projets. Le texte reste sémantique et lisible indépendamment du décor.

### Direction des prochaines itérations

- Varier le geste du scroll selon chaque passage ; éviter un morphing identique répété partout.
- Donner un sens visuel aux quatre familles de stacks à l'intérieur du médaillon.
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

- Le renderer plafonne le DPR à 1,5, la cadence à 45 fps (20 fps en mode léger) et partage un seul canvas.
- `prefers-reduced-motion` : Lenis désactivé, reveals instantanés et une composition fixe par scène.
- Le build sépare Three.js du code applicatif ; le chunk Three.js reste au-dessus de 500 kB minifié. Les mesures GPU sur appareil physique restent à faire.
- Sonde FPS visible en dev avec `?fps` pour repérer les chutes du ticker JS.

## Fonctionnalités

- **Un monde 3D continu** — lampe et médaillon persistent à travers le récit.
- **i18n FR/EN** — bascule instantanée (HUD ou palette), persistée, sans framework
  ; le contenu se cross-fade via la View Transitions API.
- **Panneau de réglages ⚙** — visibilité du décor, réaction au pointeur et mouvement 3D persistés.
- **Direction visuelle unifiée** — l'horloge devient un pendentif AG, puis accueille les formes des sections et des projets.
- **Command palette Ctrl/⌘+K** — navigation vers sections/projets, changement de
  langue, liens externes ; filtrage et navigation clavier, focus restauré (a11y).

## Pistes suivantes

- Affiner les formes, matériaux et mouvements propres à chaque chapitre ; mesurer les performances sur mobile.
- Persistance du thème clair-sombre.
- Préchargement (`link rel=modulepreload`) du premier chapitre.

## Intégration GitHub

Le portfolio utilise l’API REST publique de GitHub pour afficher des informations
à jour sur le profil `Addey34` et son activité publique récente.

- API : `https://api.github.com`
- Données : profil public + dépôts publics appartenant au compte
- Authentification : aucune, uniquement des données publiques
- Cache navigateur : 30 minutes pour limiter les requêtes
- Support : `adrian34470@gmail.com`

L’intégration est conçue avec un fallback silencieux : une indisponibilité ou un
rate-limit GitHub n’empêche jamais le portfolio de fonctionner.

## Licence

Code sous **PolyForm Noncommercial License 1.0.0** (comme Galaxy / Ludora / MagNotes).
