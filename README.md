# BlackPhage, site vitrine

Site statique (HTML, CSS, JavaScript, sans étape de build côté navigateur) de BlackPhage, société privée spécialisée dans le **drug rescue** :
reprendre des médicaments prometteurs mis de côté et les reconcevoir en Smart Binders, des protéines dépendantes du pH, avec son agent autonome **NovaDiff**.
Le site est blanc, épuré, dans l'esprit d'une landing page SaaS, et raconte un parcours de haut en bas. Marché international, deux langues (français et anglais).

## Les pages

| Page | Rôle |
| --- | --- |
| `index.html` | L'accueil, dans cet ordre : **le titre** « Discovering the future of medicine » (une animation 3D d'ouverture, puis le titre seul, au centre), **Our why** (la raison d'être, le drug rescue), **Where science meets the startup spirit** (un carrousel infini d'images), **Our agent** (NovaDiff, le robot, et les programmes actuels en puces), **Science** « Small structures. Big questions. » (le récepteur, le binder, la cascade), **le blog** « Our articles for startups & people » (six articles dans un carrousel infini) et **Contact** (un seul bouton, qui répond au curseur). |
| `careers.html` | Carrières : pourquoi nous rejoindre, profil, compétences et l'offre **Serial Biotech Builder** (garant scientifique, valeur de la licence, exigences d'une vente après l'in vivo, capacité à les défendre). |

## Ce que fait l'agent (le fil conducteur)

Un même objet traverse la page. Le canevas 3D est **derrière le texte** (l'animation ne passe jamais par-dessus).

1. **Le titre.** Les cubes arrivent en tourbillon, s'assemblent en cerveau, puis le cerveau devient un cerveau réaliste **translucide** : on voit à l'intérieur ses faisceaux de fibres et les impulsions qui les parcourent, tandis que des fronts d'onde balaient tout le cortex. Le titre apparaît ensuite, seul.
2. **Our why.** Le cerveau glisse à droite du texte.
3. **De la culture à l'agent.** Le cerveau se brise en petits cubes métalliques qui filent en une traînée fine jusqu'au robot NovaDiff, lisse et réaliste. Le robot est un **vrai personnage animé en 3D** : il se retourne sur lui-même en se formant (un tour, lié au défilement), puis salue ; il flotte, pivote doucement, se penche quand on défile vite, sa tête et ses yeux suivent le curseur, ses yeux clignent, son bras droit salue (l'épaule lève le bras, le coude balance l'avant-bras, le poignet agite la main), son anneau tourne, sa flamme vacille. Le curseur qui s'en approche le fait saluer, **un clic le fait tourner sur lui-même**.
4. **Science** (une scène épinglée de plusieurs écrans). Le robot descend, se brise en cubes qui se replient en une vraie protéine de style AlphaFold (trois hélices, une épingle bêta, des boucles, colorées par confiance aux teintes de la marque) qui s'insère dans la poche d'un récepteur couplé aux protéines G, dans une membrane. Le récepteur s'active, puis une cascade de signalisation s'allume, nœud après nœud.
5. **Le blog, puis Contact.** La scène remonte avec la page. Le bouton Contact est attiré par le curseur, une lueur ambrée le suit sur sa surface et de petits cubes s'envolent derrière lui (un clic en lance une gerbe).

**Règle de rendu.** Au repos, chaque section montre un objet **lisse**. Entre deux sections, l'objet **se fractionne en petits cubes métalliques** qui filent le long d'une traînée fine (jamais un nuage). Le curseur fait de même, mais **localement** : seul un petit rayon autour de lui se brise en cubes, qui s'écartent puis se reforment.
Tout ce qui dépend du défilement est **amorti** (l'animation reste fluide même quand la molette avance par à-coups), et le **fond** de la page change de teinte en continu d'une section à l'autre (aucun panneau, aucune coupure).

### Comment c'est fait (`assets/js/agent/`)

| Fichier | Rôle |
| --- | --- |
| `agent.js` | Le moteur de cubes (three.js, un seul `InstancedMesh`, tout dans les shaders). Les cubes sont des boîtes biseautées, au reflet métallique calculé dans le fragment shader (un studio de lumière). Les cubes partent un à un, filent sur une route courbe commune et se posent ; il y a aussi l'assemblage d'ouverture et la dissolution locale autour du curseur. |
| `shape-brain.js`, `shape-robot.js`, `shape-ligand.js`, `shape-stream.js` | Les formes : un champ de distance signée, rempli de cubes (coque de voxels). Elles exportent aussi leur champ pour le maillage lisse (`shape-split.js` n'est plus utilisé). |
| `mesher.js`, `smooth-build.js`, `refine.js`, `mesh.worker.js`, `brain-fibers.js` | Le maillage lisse : Surface Nets sur le champ de distance, teintes, occlusion, et pour le cerveau les faisceaux de fibres et les foyers d'impulsions. Pour le robot, `refine.js` recoupe les seuls triangles qui touchent une frontière entre deux matières, pour que les liserés (visière, joints) soient nets et sans escalier. Tout tourne dans un **worker** ; l'affiche (une image du même cerveau) reste à l'écran au plus 7 secondes. |
| `smooth.js` | Les objets lisses : le cerveau translucide (coque en deux passes, fibres en rubans où courent des impulsions) et le robot (matériau physique, une matière par sommet : plaques blanches vernies, métal brossé, verre sombre, yeux ambrés qui brillent ; chaque pièce s'anime dans le vertex shader : la **tête suit le curseur**, les **yeux clignent**, les **bras sont écorchés en douceur** (épaule, coude, poignet : le bras droit salue), l'anneau tourne, l'antenne oscille, la flamme vacille ; le mouvement d'ensemble, le tour d'arrivée et le clic sont réglés par `director.js`). Le « dissolve » par cases cubiques utilise le même hachage que le moteur de cubes : jamais de trou ni de doublon. |
| `receptor.js`, `binder.js` | La membrane, le récepteur à sept hélices et le binder (protéine style AlphaFold, rubans extrudés et colorés par confiance). `shape-ligand.js` en est la version en cubes. |
| `signal.js`, `shape-stream.js` | La protéine G et la cascade de signalisation, en maillage, et le flux de cubes correspondant. |
| `director.js` | Le chef d'orchestre : lit les emplacements dans la page (`data-slot`), la progression de la scène épinglée, le curseur, et règle à chaque image l'objet lisse, les cubes et la caméra. |

Les nombres de cubes : environ 40 000 par forme sur ordinateur, 6 561 sur mobile ou machine modeste (`weak`).
Sans WebGL 2, ou avec `?nogl`, le site garde les images fixes (`assets/img/agent-brain.webp`, `agent-robot.webp`) et affiche le titre tout de suite. Avec `prefers-reduced-motion`, l'agent reste sobre (pas d'ouverture, pas de suivi du curseur).
Paramètres utiles dans l'adresse de l'accueil : `?n=low` (peu de cubes), `?t=4` (fige le temps), `?nogl` (images fixes).

## Modifier le contenu

1. **Les textes** : `tools/content.py`. Chaque clé existe en français et en anglais (offre, articles, légendes, formulaire). Ensuite

   ```bash
   python3 tools/build_site.py
   ```

   réécrit `index.html`, `careers.html` et `assets/data/strings.js`. Le script **refuse d'écrire** si un texte visible contient un tiret long, un point-virgule ou un deux-points, ou si une clé manque dans une des deux langues.
2. **Les images du carrousel « Where science meets the startup spirit »** : `assets/data/culture-gallery.json` décrit chaque image de `assets/img/gallery/` (légendes, textes alternatifs, mention `credit_en` et `credit_fr` affichée sous la légende). Pour y mettre de **vraies photographies** (en accès libre, avec leur licence), déposez les fichiers dans `assets/img/gallery/`, mettez à jour le JSON (la mention doit citer l'auteur et la licence) et relancez le script. Sans ce fichier, le site retombe sur les illustrations en voxels (`culture-science.json`, `culture-startup.json`).
3. **Les adresses** : `assets/data/site.json`. **Les adresses (partners@ et careers@blackphage.com) sont des exemples à remplacer.** Le formulaire de contact tente un `mailto:` et affiche toujours l'adresse et le texte à copier, car le `mailto:` ne s'ouvre pas partout.

## Langues

Le texte est écrit en anglais dans la page. Le bouton **FR / EN** remplace tout le texte sans recharger, depuis `assets/data/strings.js` (généré), et mémorise le choix (`localStorage`, clé `bp-lang`). Les attributs lus par les lecteurs d'écran (`aria-label`, `alt`, `title`) sont traduits aussi.

## Identité visuelle

- Logo : les logos officiels (`assets/img/blackphage-logo-noir.svg`, `-blanc.svg`) et le symbole « A » (`symbole.svg`) sont inchangés.
- Couleurs : Morning Haze `#e7eef0`, Cliff Mist `#c8d1d3`, Timber Glow `#e0a35c`, Deep Canyon Blue `#2a5f86`, Shadow Pine `#27463d`. **Ces valeurs hexadécimales sont une interprétation des noms** : remplacez-les par vos valeurs exactes dans `assets/css/site.css` (variables `:root`), dans `PALETTE` de `agent.js` et dans `assets/js/fx/flow.js` (le fond).
- Police : Neue Haas Grotesk Text Pro en premier choix ; **la licence n'est pas fournie avec le site**, la pile retombe sur Inter (fichiers locaux dans `assets/fonts/`).
- Effets : curseur personnalisé (point, anneau, mot sur les cartes et sur le bouton Contact), pastille de navigation qui suit le survol, menu plein écran, carrousels infinis qui se mettent en pause au survol, révélations différentes à chaque section, fond qui coule d'une teinte à l'autre.

## Outils de développement (`tools/`)

- `tools/lab/lab.html` : le labo du moteur. `?a=0` (cerveau), `2` (robot), `3` (binder), `4` (flux) ; `&smooth=1` montre l'objet lisse, `&dis=0.5` le fractionne, `&b=2&mix=0.5` montre le voyage d'une forme à l'autre, `&m=40000` règle le nombre de cubes.
- `tools/lab/receptor.html` et `tools/lab/signal.html` : les visionneuses du récepteur (avec le binder) et de la cascade.
- `tools/lab/variants/robot-2.js` : une autre mascotte (« l'assistant de labo »), non utilisée.
- `tools/illustrations/` : les dioramas en voxels (les couvertures des articles et le repli du carrousel), rendus avec three.js puis convertis en WebP.
- `tools/renders/` : les **images de synthèse réalistes** du carrousel, calculées par lancer de rayons avec [Mitsuba 3](https://www.mitsuba-renderer.org/) (`pip install mitsuba opencv-python-headless pillow numpy`, puis `bash tools/renders/batch.sh`, puis `python3 tools/renders/to_webp.py` pour écrire les WebP dans `assets/img/gallery/`). Chaque scène (éprouvettes, double hélice d'ADN, boîtes de Petri, fioles, bureau, mur de notes, ampoule, avion en papier) est un script Python lisible ; elles sont reproductibles et modifiables.
- `tools/e2e.mjs` : les tests de bout en bout (Playwright) : langues, menu, ordre des sections, fenêtre de contact et bouton, carrousels, curseur, étapes de l'agent, survol, mobile, carrières. `node tools/e2e.mjs http://127.0.0.1:8099/` avec un serveur statique lancé (`python3 -m http.server 8099`).

## À valider avant une mise en ligne

- **Les images du carrousel sont des images de synthèse réalistes** (lancer de rayons), pas des photographies : aucune banque d'images n'était accessible depuis l'environnement de création. Le site les signale comme telles (« Image de synthèse »). Les couvertures des articles sont des illustrations en voxels, conservées volontairement.
- **Les textes scientifiques** (composés GLP-1R / GIPR, anti-NCOA1 / SRC-1, Bax Inhibitor-1 / TMBIM6, myostatine GDF-8 / activine A avec « Sweeper » et « Latent-Lock », TNF alpha), les **six articles** et **l'offre d'emploi** sont des exemples rédigés pour le site : à faire relire par les scientifiques. Le site ne publie pas de données, présente les objectifs comme des objectifs de recherche, et ne parle pas de brevets.
- Les performances ont été vérifiées avec un rendu logiciel (SwiftShader), pas sur un vrai GPU.
