# BlackPhage, site vitrine

Site statique (HTML, CSS, JavaScript, sans étape de build côté navigateur) de BlackPhage, société privée dont l'agent autonome
conçoit des Smart Binders, des médicaments protéiques dépendants du pH. Brevets en cours, marchés américain et européen.
Il n'y a plus de vente directe : le site présente la société, son pipeline, son équipe et ses offres d'emploi.

## Pages

| Page | Rôle |
| --- | --- |
| `index.html` | Accueil. Un monde moléculaire que traverse un poisson combattant bioluminescent à mesure qu'on descend la page, l'idée, le moteur, les Smart Binders, le programme phare, le bandeau de contact. |
| `pipeline.html` | Pipeline. Les programmes, lus dans `assets/data/programs.json`, mis à jour par l'agent. |
| `program.html#glp-1r` | Détail d'un programme : les problèmes du marché, notre réponse, où nous en sommes. Une protéine de verre flotte à côté du titre. |
| `a-propos.html` | À propos : mission, principes, méthode, logos officiels (blanc et noir, à télécharger), contact (partenaires, presse, recrutement). |
| `careers.html` | Carrières : profil recherché, compétences, postes ouverts, candidature. |

Chaque page existe en français (racine) et en anglais (dossier `en/`).

## Modifier le contenu

Trois endroits suffisent.

1. **Le pipeline** : `assets/data/programs.json`. Chaque programme est un objet avec des champs `{ "fr": "...", "en": "..." }`.
   Pour ajouter un composé, copiez l'entrée `glp-1r`, changez `id` (l'adresse devient `program.html#<id>`), les textes, et le tour est joué : la page Pipeline,
   la page du programme, la carte de l'accueil (`teaser`) et le pied de page se mettent à jour sans reconstruire quoi que ce soit.
   `"detail": false` affiche une carte sans page de détail (utile pour « Prochains programmes », confidentiels jusqu'aux brevets).
   Les champs : `name`, `area`, `stage`, `status`, `tagline`, `summary`, `teaser` (paires « sur le marché → avec BlackPhage »), `intro`, `problems`, `answers`, `where`, `disclaimer`.
   Mettez aussi `updated` (date) à jour : elle s'affiche en tête de la page Pipeline.
2. **Les coordonnées** : `assets/data/site.json` (partenaires et investisseurs, presse, recrutement). Les adresses y sont **des exemples à remplacer**.
3. **Les textes des pages** : `tools/content.py` (chaque clé existe en français et en anglais). Après modification, lancez

   ```bash
   python3 tools/build_site.py
   ```

   Le script réécrit les dix pages (`*.html` et `en/*.html`). Il refuse d'écrire si un texte visible contient un tiret long, un point-virgule ou un deux-points,
   ou si un champ du pipeline n'existe pas dans les deux langues.

**Les postes de `careers.html`, les adresses e-mail, les statuts et dates du pipeline, et la carte « Prochains programmes » sont des exemples.**
Remplacez-les avant toute mise en ligne.

### Ce que le site affirme

BlackPhage ne publie pas de données scientifiques. Les objectifs de conception (dépendant du pH, moins toxique, plus précis) sont présentés comme des objectifs,
accompagnés de la mention « Expérimental. Préclinique. Non approuvé par la FDA, l'EMA ni aucune autorité » (`disclaimer` de chaque programme et pied de page).
Le site s'adresse aux partenaires, investisseurs et journalistes des États-Unis **et** d'Europe.
Les constats sur la classe thérapeutique actuelle s'appuient sur les notices et la littérature publiques : faites-les relire avant publication.

## Langues

- **Redirection automatique.** À la première page d'une visite, la langue du navigateur décide : français pour un navigateur français, anglais pour tous les autres.
  La décision n'est prise qu'une fois par visite et jamais contre un choix explicite. Un clic sur FR / EN mémorise la langue (`localStorage`, clé `bp-lang`) et elle prime ensuite.
  Sans stockage disponible, il n'y a pas de redirection. Le script est le même dans toutes les pages (repères `langue:debut` et `langue:fin`) ;
  `tools/build_site.py` l'insère, avec les liens `hreflang`.
- Le sélecteur de langue garde la page et l'ancre (`program.html#glp-1r` devient `en/program.html#glp-1r`).
- Les textes écrits par le JavaScript sont dans `assets/js/i18n.js`. Les champs `{ fr, en }` des fichiers de données sont lus avec `L()`.
- Le texte suit la même règle dans les deux langues : ni tiret long, ni point-virgule, ni deux-points.

## Identité visuelle

L'idée : **un poisson de lumière qui traverse un monde moléculaire.** Un ciel d'indigo qui s'approfondit à mesure qu'on descend, des molécules en boules et bâtons,
de l'ADN, des protéines en rubans, une membrane et son récepteur, et des lueurs corail que le poisson répand autour de lui.

| Élément | Où | Rôle |
| --- | --- | --- |
| **Le poisson** | `assets/js/fish.js` | Un combattant construit par code, sans fichier de modèle : un corps fin et translucide (écailles qui s'allument, squelette vu par transparence, opercule), des **yeux de verre** (un liseré violet, un iris doré translucide, une pupille qui laisse voir à travers) et de grandes nageoires en voile avec leurs rayons (queue en éventail, dorsale, anale, ventrales en rubans, pectorales). **Le corps ondule comme en nageant** : une onde court du museau à la queue en grandissant (la tête presque immobile, la queue qui balance le plus), dessinée dans le plan que voit la caméra puisqu'une onde latérale resterait invisible de profil, et chaque section du corps penche avec l'axe, nageoires et yeux compris. Chaque nageoire porte en plus une **onde qui court de sa base vers son bord libre**, en travers du plan et dans le plan, et la lumière suit le relief du voile. La bioluminescence se compose de grandes taches, de veines, de vagues régulières qui descendent le corps et d'impulsions qui filent le long des rayons. |
| **Le parcours** | `assets/js/scene.js` | **Six stations, une par section de l'accueil.** Le défilement, lissé, avance le poisson le long d'un chemin ; la caméra le suit de profil, c'est le monde qui défile. Il reste à sa place à l'écran : un léger flottement, un corps qui ondule doucement au repos et plus largement quand on défile, et il penche à peine vers le pointeur. **Un clic ou une touche sur lui lance une vague de bioluminescence** qui part du point touché, traverse le corps puis s'allume dans les nageoires. Un bouton caché (`data-fish-wave`, visible au focus) permet le même geste au clavier. Rendu three.js, organisé comme une scène react-three-fiber. |
| **Le monde** | `assets/js/world.js`, `assets/js/molecules.js` | Tout est du code. Station 1 : l'air libre des petites molécules (eau, benzène, sucre, purine, acide aminé, phosphate) ; 2 : la double hélice d'ADN ; 3 : la boucle du moteur, un anneau de molécules qui tourne ; 4 : la protéine cible, de verre, et ses liants ; 5 : la membrane (deux feuillets de sphères) et ses récepteurs à sept hélices ; 6 : une vue d'ensemble. Les molécules sont instanciées (une commande de dessin par modèle et par tranche du chemin), la brume de profondeur fond les formes lointaines dans le fond, **le poisson éclaire les molécules voisines**, et une voie reste libre autour de lui pour qu'il se lise. Chaque ensemble n'est dessiné que près de l'endroit où il se trouve. |
| **La brume** | `assets/js/mist.js` | Le ciel des pages intérieures : indigo, nappes de lumière qui dérivent, poussières lumineuses. Un petit rendu WebGL2 sans bibliothèque. |
| **La protéine** | `assets/js/protein.js`, `assets/data/surface.json` | Sur la page d'un programme, une surface en verre réfracte la brume et s'allume de l'intérieur de la même lumière corail que le poisson. Le même maillage sert de protéine cible dans le monde de l'accueil. |
| **Le verre** | `assets/js/glass.js`, classe `.glass` | Surfaces translucides avec lisière lumineuse qui suit le pointeur. |
| **Le logo** | `assets/img/blackphage-logo-blanc.svg`, `blackphage-logo-noir.svg`, `symbole.svg`, `assets/favicon.svg` | Les fichiers officiels, **jamais modifiés** : le blanc sur fond sombre (en-tête, pied de page), le noir sur fond clair (bloc « logos » de la page À propos). `symbole.svg` est le « A » du logotype avec son point, utilisé pour le favicon et la page À propos. |
| **La scène** | `assets/js/stage.js` | Une seule boucle d'animation pour tout le site (modèle `useFrame`), pause onglet caché, défilement et pointeur lissés, qualité adaptative. |

Palette : indigo `#151a3c`, encre `#f6f7ff`, iris `#b9c2ff`, pêche `#ffdac9`, corail `#ff9f82`. Titres en Space Grotesk, accent en Instrument Serif italique
(le mot *frontier*), texte en Inter. Le titre de l'accueil lit « Push the frontier of the treatable. »
Un voile sombre s'installe entre le monde et le texte quand on quitte le premier écran (variable CSS `--veil`, posée par `scene.js`).
En portrait (téléphone, tablette), le texte occupe le haut de l'écran et le poisson la moitié basse.

Sans WebGL, l'accueil garde une image fixe de l'œuvre (`assets/img/fond-accueil.webp`, et `fond-accueil-portrait.webp` en portrait) et les autres pages un dégradé.
L'image sert aussi de premier affichage, puis fond vers la scène vivante. Avec « réduire les animations », le monde reste immobile sur le premier écran,
avec une vague de lumière sur le corps du poisson. Si l'appareil peine, la qualité baisse toute seule (résolution, lissage, nombre de molécules, de rubans et de lipides).

Réglages utiles : `PATH` (le chemin, une station par point), `corridor()` (la voie libre autour du poisson, la densité), `N` (nombre de petites molécules) et `buildWorld()` dans `world.js` ;
`cameraRig()` (où le poisson apparaît à l'écran, la distance) ; les amplitudes de nage et d'ondulation (`F.amp`, `F.phase`, `F.fin`, `uFlutter`) dans la boucle de `scene.js`, et la forme de l'onde du corps (`SWIM` dans `fish.js` : nombre d'ondes, part de la tête, plan de l'onde) ;
les amplitudes d'ondulation de chaque nageoire (`kr`, `ka`, `ao`, `ai`) dans `FISH_VERT` de `fish.js`.
Ajoutez `?t=4` à l'adresse de l'accueil pour figer l'animation sur cet instant (captures d'écran, tests), et `?u=3` (de 0 à 5) pour choisir la station affichée.

## Lancer en local

```bash
python3 -m http.server 8000     # puis http://localhost:8000/
```

Un double-clic sur `index.html` ne fonctionne pas : le navigateur bloque le chargement des modules et des données.

## Licences

Polices Space Grotesk, Instrument Serif, Inter et Montserrat sous licence OFL (dossier `assets/fonts`). three.js sous licence MIT (`assets/vendor/three`).
