# Blender ↔ portfolio : atelier commun

Ce flux sert à Adrian, Codex, Claude Code et OpenCode. La source de vérité d'un objet est son fichier `.blend`. Le `.glb` est un export pour Three.js ; les PNG servent à discuter de la direction visuelle. Le décor actif reste piloté par `StoryWorld3D`, `VisualDirector` et le ticker GSAP.

## Démarrage

Sur ce PC, Blender 5.2 LTS est installé dans `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`. L'outil cherche aussi `blender.exe` dans le `PATH`. Après un déplacement ou une mise à jour, définir `BLENDER_EXE` avec le nouveau chemin.

Depuis la racine du dépôt, dans PowerShell :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 doctor
```

La politique d'exécution PowerShell de ce PC bloque l'appel direct à un `.ps1` ; cette commande ne change pas la politique du système. Le résultat contient `BLENDER_BRIDGE_JSON` avec la version de Blender et de Python.

## Fichiers et commandes

Pour chaque scène, conserver un seul `.blend` éditable dans `assets/blender/`. Créer dans Blender une collection nommée exactement `WEB_EXPORT` et y placer uniquement les objets à afficher sur le site. Garder les caméras, lumières et fonds de rendu hors de cette collection. Les images utilisées par les matériaux doivent être empaquetées dans le `.blend` ou conservées avec lui sous des chemins relatifs.

Les exemples ci-dessous utilisent `assets/blender/clock.blend` dès qu'il existe :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 inspect -BlendFile assets/blender/clock.blend
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 render -BlendFile assets/blender/clock.blend -Output docs/private/clock-preview.png
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 export -BlendFile assets/blender/clock.blend -Output public/models/clock.glb
```

`tools/remove_clock_screws.py` retire uniquement les quatre anciennes vis de la lèvre externe du `.blend` sauvegardé. `tools/edit_clock.py` ne les recrée plus. Lancer le script ciblé via `blender.ps1 script -BlendFile assets/blender/clock.blend -Script tools/remove_clock_screws.py`, puis réexporter, si une ancienne source contient encore ces vis.

La suspension du héros possède sa propre source éditable et son export :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 inspect -BlendFile assets/blender/lamp.blend
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 render -BlendFile assets/blender/lamp.blend -Output docs/private/lamp-preview.png
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 export -BlendFile assets/blender/lamp.blend -Output public/models/lamp.glb
```

`tools/build_lamp.py` décrit sa construction reproductible. Dans l'Outliner, `LAMP_SWING` est le pivot supérieur des pièces de `WEB_EXPORT`. `Filament / glowing coil` est la bobine émissive visible derrière `Bulb / clear glass envelope` ; ses deux supports sont éditables séparément. Le groupe `LAMP_SWING_RUNTIME` dans Three.js reprend ce point d'attache ; la suspension reste fixe pour le moment, mais le pivot pourra porter une interaction future. Le studio Blender reste hors du GLB.

`tools/edit_lamp.py` reprend le `.blend` existant pour élargir le profil de `Shade / spun metal shell` et déplacer `Shade / rolled brass lip` et `Shade / fine lower seam`. Il conserve la douille, le verre, le filament, le câble et le pivot. Pour réappliquer cette géométrie de manière idempotente après une édition locale sauvegardée :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 script -BlendFile assets/blender/lamp.blend -Script tools/edit_lamp.py
```

Le pendentif AG ne modifie pas la source de l'horloge. Ouvrir `assets/blender/pendant.blend` : dans `WEB_EXPORT`, les bagues rhodium, graphite et titane forment le contour ; `PENDANT / rear inset plate`, les gorges, le chanfrein, la gravure AG et le trait de signature finissent le revers. `PENDANT / welded top lug`, `PENDANT / hinge cross pin` et `PENDANT / pierced bail` forment une seule accroche visible. L'ancien collier en boucle a été retiré. Les matières de titane et de rhodium contiennent leurs cartes de rugosité et de normales brossées, empaquetées dans le `.blend`. `tools/build_pendant.py` reconstruit la base depuis zéro ; `tools/edit_pendant.py` affine la source sauvegardée de façon idempotente. Ne pas relancer le premier après des retouches manuelles à conserver. Le site charge `public/models/pendant.glb` sur le boîtier persistant de l'horloge. Le grand monogramme de face est une géométrie éditable dans `StoryWorld3D`, abaissée sur le disque et réduite pour garder une marge régulière dans le cercle.

L'audit du 20/10 conserve les 12 objets utiles de `WEB_EXPORT` et abaisse à 10 les segments de section des bagues secondaires et de la bélière ; les trois bagues de face gardent leur profil détaillé. L'export courant pèse 568 384 octets pour 25 892 triangles. Dans Three.js, seules la bélière et la patte soudée projettent une ombre depuis cet export ; les autres pièces reçoivent toujours les ombres et les reflets. Après toute retouche de profil, vérifier la rondeur en WebGL de face et de côté avant de réduire davantage la géométrie.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 inspect -BlendFile assets/blender/pendant.blend
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 script -BlendFile assets/blender/pendant.blend -Script tools/edit_pendant.py
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 export -BlendFile assets/blender/pendant.blend -Output public/models/pendant.glb
```

Inspecter puis exporter le GLB et contrôler le résultat dans WebGL sur bureau et mobile ; le reflet très clair de l'intérieur peut différer du rendu Cycles.

La section stacks possède sa source `assets/blender/stack_iris.blend`. `tools/build_stack_iris.py` construit quatre grands secteurs dans `WEB_EXPORT`, chacun sous un pivot `STACK / sector 01 pivot` à `04 pivot`. Chaque secteur contient un corps en titane, une gorge graphite, un accent coloré et trois petits objets `STACK / fragment 01 01` à `04 03`. Les accents reprennent les quatre familles visibles en HTML. `STACK / central bearing`, `central recess` et `central pin` terminent le noyau initial, puis disparaissent de la composition éclatée. `STUDIO_RENDER_ONLY` contient seulement la caméra et deux lumières pour le PNG, hors export. Le site anime les pivots et fragments depuis le scroll ; ne pas appliquer leurs transformations dans Blender sans adapter `StoryWorld3D`.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 inspect -BlendFile assets/blender/stack_iris.blend
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 render -BlendFile assets/blender/stack_iris.blend -Output docs/private/stack-iris-preview.png
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 export -BlendFile assets/blender/stack_iris.blend -Output public/models/stack_iris.glb
```

`tools/build_stack_iris.py` recrée une source neuve : ne pas le relancer sur un `.blend` retouché et non sauvegardé ailleurs. Modifier les pièces dans Blender, sauvegarder, puis réexporter. Vérifier l'état AG, le passage où le boîtier se retire, l'éclatement sans boîtier et le trajet inverse dans WebGL ; le PNG ne montre que la géométrie assemblée dans Blender.

Le raccord public actuel part du médaillon AG, montre l'horloge à l'introduction, puis sépare **ses propres pièces** à Stacks. `tools/build_clock_breakup.py` duplique les maillages de `clock.blend` dans `assets/blender/clock_breakup.blend` ; ne pas relancer le script sur des retouches manuelles à conserver. Dans `WEB_EXPORT`, ouvrir les pivots `CLOCK_BREAK / 01 interface pivot` (verre et biseau), `02 interaction pivot` (aiguilles), `03 services pivot` (cadran et rouages), `04 delivery pivot` (boîtier et dos). Chacun possède une part des index ; `CLOCK_BREAK / mechanism pivot` regroupe trois rouages éditables dans la famille Services. Le site charge `public/models/clock_breakup.glb` et écarte ces pivots selon le scroll. Le rendu Blender contrôle l'assemblage ; juger l'éclatement dans WebGL à Stacks et refaire le trajet inverse.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 inspect -BlendFile assets/blender/clock_breakup.blend
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 render -BlendFile assets/blender/clock_breakup.blend -Output docs/private/clock-breakup-preview.png
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 export -BlendFile assets/blender/clock_breakup.blend -Output public/models/clock_breakup.glb
```

L'ancienne étude AG → Stacks (`ag_breakup.blend`) est conservée pour comparaison et n'est plus chargée par le parcours public. `tools/build_ag_breakup.py` reconstruit cette source séparée sans toucher à `pendant.blend`. Dans `WEB_EXPORT`, les quatre groupes `AG_BREAK / family 01 pivot` à `04 pivot` contiennent chacun un groupe `shell` avec trois segments de bague, un groupe `fragments` avec trois éclats, et un groupe `module`. Les quatre modules montrent respectivement un écran d'interface, des orbites et un cœur 3D, un réseau de services, puis un parcours de livraison. Les matières d'accent cobalt, cyan, violet et ambre correspondent aux quatre familles HTML et comportent une faible émission. Le site pilotait ces groupes par la progression du scroll et conservait les quatre traits du monogramme Three.js dans la composition éclatée. Le rendu Blender montre les pièces assemblées sans ces traits. L'ancien `stack_iris.blend` reste aussi une étude historique.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 inspect -BlendFile assets/blender/ag_breakup.blend
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 render -BlendFile assets/blender/ag_breakup.blend -Output docs/private/ag-breakup-preview.png
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 export -BlendFile assets/blender/ag_breakup.blend -Output public/models/ag_breakup.glb
```

Comme pour les autres scripts `build_*`, ne pas le relancer sur des retouches Blender à conserver : éditer le `.blend`, sauvegarder, puis réexporter. Comparer toujours avec le raccord AG réel dans le navigateur, dans les deux sens.

`inspect` énumère objets, matériaux, collections, animations et images externes manquantes. `render` utilise la caméra et les réglages de rendu enregistrés dans le `.blend`. `export` prend la collection `WEB_EXPORT` et exclut caméras et lumières. Les commandes affichent le chemin et la taille du fichier créé ; une erreur Python fait échouer la commande.

Pour modifier une scène de manière reproductible, l'agent écrit un script `bpy` en UTF-8, puis lance :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\blender.ps1 script -BlendFile assets/blender/clock.blend -Script tools/edit_clock.py
```

Le script doit enregistrer explicitement le `.blend` s'il change la source (`bpy.ops.wm.save_as_mainfile`). Garder le script lorsqu'il décrit la construction reproductible de l'objet ; éviter les scripts jetables dans le dépôt. Inspecter et rendre après chaque changement significatif, puis exporter et intégrer une première tranche au site pour juger aussi le vrai rendu WebGL. Faire évoluer l'esthétique avec Adrian à partir de ce résultat visible.

Pour créer une scène depuis le fichier de démarrage Blender, lancer `script -Script <chemin.py>` sans `-BlendFile` ; le script crée les collections et enregistre le nouveau `.blend`.

## Pièces maîtresses des produits (Galaxy, Ludora, MagNotes)

Les trois sculptures des chapitres sont fabriquées par `tools/build_galaxy_astrolabe.py`, `tools/build_ludora_dice.py` et `tools/build_magnotes_grimoire.py`, avec la boîte à outils `tools/blender_craft.py` (profils tournés `lathe`, anneaux à section, engrenages, bras effilés, graduations, plots hexagonaux) en plus de `tools/blender_kit.py`. Les profils sont des polylignes `(r, z)` anti-horaires : les points d'une même polyligne restent lisses (congés), chaque jonction garde une arête franche.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .	oolslender.ps1 script -Script tools/build_galaxy_astrolabe.py
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .	oolslender.ps1 export -BlendFile assets/blender/galaxy_astrolabe.blend -Output public/models/galaxy_astrolabe.glb
```

Chaque script recrée sa source : ne pas le relancer sur un `.blend` retouché à la main. Les pièces de même matière sont fusionnées par pivot (`join_by_material`) pour limiter les appels de rendu ; les pivots animés par `StoryWorld3D` restent séparés.

Contrat d'intégration, vérifié par `src/visual/craftedAssets.test.ts` (noms de pivots, matières, budgets de triangles et d'octets, aucune texture embarquée) :

- Galaxy : `ASTRO / ring 1..3 spin` ; matières `aged brass`, `sun`, `energy ring`, `rune`.
- Ludora : `DICE / die pivot`, `DICE / board pivot`, `DICE / tile 1..6 pivot` (rayon de base 1,2) ; matières `titanium`, `cyan index`, `indigo enamel`.
- MagNotes : `BOOK / book pivot`, `NOTE / 01..06 pivot` centrés sur leur fiche, face visible vers -Y.

## Travail à deux dans Blender

1. Adrian ouvre le `.blend` dans Blender et apprend à repérer les objets dans l'**Outliner**, les collections et les matériaux. La vue **Material Preview** aide à juger la matière ; **F12** lance le rendu avec l'éclairage et la caméra enregistrés.
2. Adrian sauvegarde avant qu'un agent lance une commande sur ce fichier. L'agent lance `inspect`, puis travaille à partir de cette version. Éviter deux écritures simultanées du même `.blend`.
3. L'agent montre un rendu et explique les changements en termes Blender concrets : géométrie, biseaux, UV, rugosité, lumière et caméra. Adrian peut modifier la scène dans l'interface, enregistrer et demander une nouvelle inspection.
4. Le passage AG → horloge, puis l'éclatement horloge → stacks, doivent être évalués à 0 %, 50 % et 100 % du scroll, dans les deux sens. Vérifier aussi l'affichage sans WebGL, le mouvement réduit et les profils mobiles du dépôt avant de déclarer le travail terminé.

Un `.blend` peut contenir davantage de détails que le site : la collection `WEB_EXPORT` fixe précisément ce qui part dans le `.glb`. Mesurer la taille du modèle, le temps de chargement et la fluidité après intégration ; le rendu Blender seul ne prouve pas le résultat WebGL.

## Première cible

Construire l'horloge du héros comme un objet crédible : cadran, verre, métal, aiguilles, profondeur, reflets et ombres lisibles. Conserver le cobalt/cyan et l'accent ambre du site. L'animation au scroll est conçue avec les pièces de cette horloge pour composer AG ; elle doit rester réversible. Évaluer ce premier passage dans le navigateur avant de produire les autres scènes. Le plan de reprise et les critères de validation sont en tête de `docs/private/AG_v2.md`.
