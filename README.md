# BlackPhage, site vitrine

Site statique (HTML, CSS, JavaScript, sans étape de build côté navigateur) de BlackPhage, société privée spécialisée dans le **drug rescue** :
reprendre des médicaments prometteurs mis de côté et les reconcevoir en Smart Binders, des protéines dépendantes du pH, avec son agent autonome **NovaDiff active**.
Le site est blanc, épuré, dans l'esprit d'une landing page SaaS, et raconte un parcours de haut en bas. Marché international, deux langues (français et anglais).

## Les pages

| Page | Rôle |
| --- | --- |
| `index.html` | L'accueil, section par section : le titre « Discovering the future of medicine » et le cerveau, « Engineering medicines that change lives » (trois familles de composés), notre pourquoi (le drug rescue) et le carrousel de visuels, « Meet NovaDiff » (le robot), « Small structures. Big questions. » (le récepteur, le binder, la cascade), « Our articles for startups & people » (douze articles dans un carrousel infini), puis la sphère et le bouton Contact. |
| `careers.html` | Carrières : pourquoi nous rejoindre, profil, compétences, l'offre à la une **Serial Biotech Builder** (garant scientifique, valeur de la licence, exigences d'une vente après l'in vivo) et les autres postes. |

## Ce que fait l'agent (le fil conducteur)

Un même objet traverse la page, et il change de forme à chaque section.

1. **Cerveau** sous le titre : un cerveau lisse et réaliste, aux lobes teintés, parcouru d'impulsions (des fronts de lumière et des faisceaux bleus).
2. **Trois amas** sur les trois cartes (métabolisme, muscle, inflammation) : une planète et son anneau, un haltère, une étoile à pointes.
3. **Robot** à côté de « Meet NovaDiff » : un robot mignon, lisse, à la visière sombre et aux yeux ambre.
4. **Le récepteur** (scène épinglée, un défilement de plusieurs écrans) : le robot descend, se fractionne en cubes et se replie en une vraie protéine de style AlphaFold (trois hélices, une épingle bêta, des boucles, couleurs de confiance aux teintes de la marque) qui s'insère dans la poche d'un récepteur couplé aux protéines G, dans une membrane. Le récepteur s'active, puis la vue passe de l'autre côté de la membrane : une cascade de signalisation s'allume, nœud après nœud.
5. **La grille** : un carré 1 × 1 éclairé, 3 × 3, 9 × 9, 27 × 27, 81 × 81, 243 × 243 (59 049 cubes), puis la grille se referme en **sphère** lisse. Le bouton Contact est posé dessus et ouvre une petite fenêtre (nom, prénom, activité, message).

**Règle de rendu.** Au repos, chaque section montre un objet **lisse et réaliste**. Entre deux sections, l'objet **se fractionne en petits cubes métalliques** qui filent le long d'une traînée fine (un trait de cubes, jamais un nuage) puis se recomposent en lisse. Le survol du curseur fait de même : l'objet se brise en cubes qui s'écartent, puis il se reforme.

### Comment c'est fait (`assets/js/agent/`)

| Fichier | Rôle |
| --- | --- |
| `agent.js` | Le moteur de cubes (three.js, un seul `InstancedMesh`, tout dans les shaders). Les cubes sont des boîtes biseautées, au petit bombé et au reflet métallique calculés dans le fragment shader (un studio de lumière). Chaque forme est un tableau de positions ; les cubes partent un à un, filent sur une route courbe commune et se posent. Les formes n'utilisent que quelques milliers de cubes, le reste du nuage (59 049 en tout) reste en réserve pour la sphère. |
| `shape-brain.js`, `shape-split.js`, `shape-robot.js`, `shape-ligand.js`, `shape-stream.js` | Les formes : un champ de distance signée, rempli de cubes (coque de voxels). Elles exportent aussi le champ pour le maillage lisse. |
| `mesher.js`, `smooth-build.js`, `mesh.worker.js` | Le maillage lisse : Surface Nets sur le champ de distance, couleurs, matières et phases d'impulsion reportées depuis les cubes. Tout tourne dans un **worker** ; l'affiche (une image du même objet lisse) reste à l'écran au plus 7 secondes. |
| `smooth.js` | Les objets lisses : matériau physique (clearcoat, reflets d'un petit studio de lumière), impulsions du cerveau, et le « dissolve » par cases cubiques qui fait passer du lisse aux cubes (le même hachage que le moteur de cubes, donc jamais de trou). |
| `receptor.js`, `binder.js` | La membrane, le récepteur à sept hélices et le binder (protéine style AlphaFold, rubans extrudés et colorés par confiance). `shape-ligand.js` en est la version en cubes. |
| `signal.js`, `shape-stream.js` | La protéine G et la cascade de signalisation, en maillage, et le flux de cubes correspondant. |
| `director.js` | Le chef d'orchestre : lit les emplacements dans la page (`data-slot`), la progression des scènes épinglées, le curseur, et règle à chaque image l'objet lisse, les cubes et la caméra. |
| `frame.js` | Le repère commun (membrane, poche, cascade). |

Les nombres de cubes : 59 049 (243 × 243) pour la grille et la sphère, environ 20 000 pour les formes sur ordinateur, 6 561 sur mobile ou machine modeste (`weak`).
Sans WebGL 2, ou avec `?nogl`, le site garde les images fixes (`assets/img/agent-brain.webp`, `agent-robot.webp`). Avec `prefers-reduced-motion`, l'agent reste sobre (pas de suivi du curseur, pas de dispersion).
Paramètres utiles dans l'adresse de l'accueil : `?n=low` (peu de cubes), `?t=4` (fige le temps), `?nogl` (images fixes).

## Modifier le contenu

1. **Les textes** : `tools/content.py`. Chaque clé existe en français et en anglais (offres, articles, légendes, formulaire). Ensuite

   ```bash
   python3 tools/build_site.py
   ```

   réécrit `index.html`, `careers.html` et `assets/data/strings.js`. Le script **refuse d'écrire** si un texte visible contient un tiret long, un point-virgule ou un deux-points, ou si une clé manque dans une des deux langues.
2. **Les visuels du carrousel** : les légendes et les textes alternatifs sont dans `assets/data/culture-science.json` et `culture-startup.json` (une entrée par image de `assets/img/culture/`).
3. **Les adresses** : `assets/data/site.json`. **Les adresses (partners@ et careers@blackphage.com) sont des exemples à remplacer.** Le formulaire de contact tente un `mailto:` et affiche toujours l'adresse et le texte à copier, car le `mailto:` ne s'ouvre pas partout.

## Langues

Le texte est écrit en anglais dans la page. Le bouton **FR / EN** remplace tout le texte sans recharger, depuis `assets/data/strings.js` (généré), et mémorise le choix (`localStorage`, clé `bp-lang`). Les attributs lus par les lecteurs d'écran (`aria-label`, `alt`, `title`) sont traduits aussi.

## Identité visuelle

- Logo : les logos officiels (`assets/img/blackphage-logo-noir.svg`, `-blanc.svg`) et le symbole « A » (`symbole.svg`) sont inchangés.
- Couleurs : Morning Haze `#e7eef0`, Cliff Mist `#c8d1d3`, Timber Glow `#e0a35c`, Deep Canyon Blue `#2a5f86`, Shadow Pine `#27463d`. **Ces valeurs hexadécimales sont une interprétation des noms** : remplacez-les par vos valeurs exactes dans `assets/css/site.css` (variables `:root`) et dans `PALETTE` de `agent.js`.
- Police : Neue Haas Grotesk Text Pro en premier choix ; **la licence n'est pas fournie avec le site**, la pile retombe sur Inter (fichiers locaux dans `assets/fonts/`).
- Effets : curseur personnalisé (point, anneau, mot sur les cartes), pastille de navigation qui suit le survol, menu plein écran, carrousel infini qui se met en pause au survol, révélations différentes à chaque section, projecteur de lumière derrière le curseur.

## Outils de développement (`tools/`)

- `tools/lab/lab.html` : le labo du moteur. `?a=0` (cerveau), `1` (amas), `2` (robot), `3` (binder), `4` (flux), `5` (grille) ; `&smooth=1` montre l'objet lisse, `&dis=0.5` le fractionne, `&b=2&mix=0.5` montre le voyage d'une forme à l'autre, `&m=20000` règle le nombre de cubes.
- `tools/lab/receptor.html` et `tools/lab/signal.html` : les visionneuses du récepteur (avec le binder) et de la cascade.
- `tools/lab/variants/robot-2.js` : une autre mascotte (« l'assistant de labo »), non utilisée.
- `tools/illustrations/` : les dioramas en voxels des visuels du carrousel (`scene.html?scene=lab-bench`, `startup.html?scene=pitch-day`...). Ils sont rendus avec three.js puis convertis en WebP.
- `tools/e2e.mjs` : les tests de bout en bout (Playwright) : langues, menu, fenêtre de contact, carrousel, curseur, étapes de l'agent, survol, mobile, carrières. `node tools/e2e.mjs http://127.0.0.1:8099/` avec un serveur statique lancé (`python3 -m http.server 8099`).

## À valider avant une mise en ligne

- **Les visuels sont des illustrations originales en voxels, pas des photographies** de scientifiques et de startups (aucune photo n'était accessible depuis l'environnement de création).
- **Les textes scientifiques** (composés GLP-1R / GIPR, anti-NCOA1 / SRC-1, Bax Inhibitor-1 / TMBIM6, myostatine GDF-8 / activine A avec « Sweeper » et « Latent-Lock », TNF alpha), les **douze articles** et **les offres d'emploi** sont des exemples rédigés pour le site : à faire relire par les scientifiques. Le site ne publie pas de données, présente les objectifs comme des objectifs de recherche, et ne parle pas de brevets.
- Les performances ont été vérifiées avec un rendu logiciel (SwiftShader), pas sur un vrai GPU.
