# BlackPhage, site vitrine

Site statique (HTML, CSS, JavaScript, sans étape de build côté navigateur) de BlackPhage, société privée dont l'agent autonome
conçoit des Smart Binders, des médicaments protéiques dépendants du pH. Brevets en cours, marché américain.
Il n'y a plus de vente directe : le site présente la société, son pipeline, son équipe et ses offres d'emploi.

## Pages

| Page | Rôle |
| --- | --- |
| `index.html` | Accueil. L'œuvre (deux mains de marbre sous l'eau), l'idée, le moteur, les Smart Binders, le programme phare, le bandeau de contact. |
| `pipeline.html` | Pipeline. Les programmes, lus dans `assets/data/programs.json`, mis à jour par l'agent. |
| `program.html#glp-1r` | Détail d'un programme : les problèmes du marché, notre réponse, où nous en sommes. Une protéine de verre flotte à côté du titre. |
| `a-propos.html` | À propos : mission, principes, méthode, contact (partenaires, presse, recrutement). |
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
accompagnés de la mention « Expérimental. Préclinique. Non approuvé par la FDA ni par aucune autorité » (`disclaimer` de chaque programme et pied de page).
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

L'idée : **la lumière sous l'eau.** Une eau profonde, des rayons d'or qui descendent de la surface, du verre et de la pierre.

| Élément | Où | Rôle |
| --- | --- | --- |
| **L'œuvre** | `assets/js/scene.js`, `assets/data/hands.json` | Deux mains de marbre, sous l'eau, cherchent à se toucher (un clin d'œil à *La Création d'Adam*). Seize secondes par cycle : deux tentatives, puis un retrait. Quand les index sont tout près, une étincelle d'or éclate et des braises montent. Les rayons se reflètent dans un sol d'eau noire (miroir ondulé, flou, fondu vers l'obscurité) que le pointeur fait onduler. Rendu three.js, organisé comme une scène react-three-fiber. |
| **L'abysse** | `assets/js/abyss.js` | Le même décor, plus calme, derrière les autres pages : rayons, caustiques, neige marine. Un petit rendu WebGL2 sans bibliothèque. Les fonctions GLSL (`ABYSS_GLSL`) sont partagées avec l'œuvre, pour que les rayons éclairent aussi la pierre. |
| **La protéine** | `assets/js/protein.js`, `assets/data/surface.json` | Sur la page d'un programme, une surface en verre réfracte les rayons et accroche l'or sur ses arêtes. Elle suit la zone `.phero__art` de la page. |
| **Le verre** | `assets/js/glass.js`, classe `.glass` | Surfaces translucides avec lisière lumineuse qui suit le pointeur (liquidglass.js). |
| **Le signe** | `assets/js/mark.js`, `assets/favicon.svg` | Un lambda (le bactériophage) en gouttes de liquide. Une petite goutte, la cible, se glisse entre les deux pieds. |
| **La scène** | `assets/js/stage.js` | Une seule boucle d'animation pour tout le site (modèle `useFrame`), pause onglet caché, défilement et pointeur lissés, qualité adaptative. |

Palette : eau `#02080b`, encre `#f5fbfd`, aigue-marine `#8fe3f2`, or `#ffe2ae`, perle `#f6fdff`. Titres en Space Grotesk, accent en Instrument Serif italique
(le mot *frontier*), texte en Inter, logotype en Montserrat. Le titre de l'accueil lit « Push the frontier of the treatable. »

Sans WebGL, l'accueil garde une image fixe de l'œuvre (`assets/img/fond-accueil.webp`) et les autres pages un dégradé. L'image sert aussi de premier affichage,
puis fond vers la scène vivante. Avec « réduire les animations », tout est figé sur l'instant où les doigts se rejoignent. Si l'appareil peine, la qualité baisse toute seule
(résolution, lissage, réfractions).

Réglages utiles : `HORIZON`, `TIP_Y` et `GAP` (composition de l'œuvre) en tête de `scene.js`, les couleurs des rayons dans `abyss.js`, la matière de la pierre dans `HAND_FRAG`.
Ajoutez `?t=4.4` à l'adresse de l'accueil pour figer l'animation sur cet instant (captures d'écran, tests).

## Reconstruire les mains

Les deux mains sont modélisées par du code, sans aucun fichier d'artiste : des champs de distance (anatomie de la main), un marching cubes, une décimation,
puis occlusion ambiante et épaisseur par échantillonnage du champ. Le résultat est quantifié dans `assets/data/hands.json` (environ 1,8 Mo, 60 000 triangles par main).

```bash
pip install numpy scikit-image scipy fast-simplification
python3 tools/hands/build.py --h 0.09 --faces 60000     # qualité finale, quelques minutes
python3 tools/hands/build.py --h 0.14 --faces 40000     # aperçu rapide
```

Les poses (`POSES` dans `tools/hands/build.py`) et l'anatomie (`tools/hands/hand.py`) se règlent à la main. L'image fixe se refait avec une capture de l'accueil
sans texte (`?t=4.4`).

## Lancer en local

```bash
python3 -m http.server 8000     # puis http://localhost:8000/
```

Un double-clic sur `index.html` ne fonctionne pas : le navigateur bloque le chargement des modules et des données.

## Licences

Polices Space Grotesk, Instrument Serif, Inter et Montserrat sous licence OFL (dossier `assets/fonts`). three.js sous licence MIT (`assets/vendor/three`).
