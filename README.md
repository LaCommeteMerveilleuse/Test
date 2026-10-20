# BlackPhage, site vitrine

Site statique (HTML, CSS, JavaScript, sans étape de build côté navigateur) de BlackPhage, société privée dont l'agent autonome
conçoit des Smart Binders, des médicaments protéiques dépendants du pH. Brevets en cours, marchés américain et européen.
Il n'y a plus de vente directe : le site présente la société, son pipeline, son équipe et ses offres d'emploi.

## Pages

| Page | Rôle |
| --- | --- |
| `index.html` | Accueil. L'œuvre (un Petit Prince joue avec un poisson combattant bioluminescent), l'idée, le moteur, les Smart Binders, le programme phare, le bandeau de contact. |
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

L'idée : **un enfant, un poisson de lumière, et la brume du soir.** Un ciel d'indigo qui s'éclaircit vers l'horizon, un sol brillant qui reflète tout,
des lueurs corail. Le Petit Prince (cheveux blonds, tunique verte, grande écharpe dorée qui flotte) joue avec un poisson combattant (Betta) translucide qui nage dans l'air.

| Élément | Où | Rôle |
| --- | --- | --- |
| **Le poisson** | `assets/js/fish.js` | Un combattant construit par code, sans fichier de modèle : un corps fin et translucide (écailles qui s'allument, squelette vu par transparence, opercule, œil à iris), de grandes nageoires en voile avec leurs rayons (queue en éventail, dorsale, anale, ventrales en rubans, pectorales qui battent). Chaque nageoire porte une **onde qui court de sa base vers son bord libre**, en travers du plan et dans le plan, et la lumière suit le relief du voile. La bioluminescence se compose de grandes taches, de veines, de vagues régulières qui descendent le corps, d'impulsions qui filent le long des rayons. |
| **Le jeu** | `assets/js/scene.js` | Le poisson suit le pointeur (inertie, cap, virage). **Un clic ou une touche sur lui lance une vague de bioluminescence** qui part du point touché, traverse le corps puis s'allume dans les nageoires, et l'enfant sursaute de joie. Au repos, le poisson vient de lui-même toucher le doigt de l'enfant. Un bouton caché (`data-fish-wave`, visible au focus) permet le même geste au clavier. Rendu three.js, organisé comme une scène react-three-fiber. |
| **L'enfant** | `assets/js/child.js`, `assets/data/child.json`, `tools/child/` | Un petit garçon modélisé par code (champs de distance, marching cubes, décimation), avec un squelette de treize os : le bras se tend vers le museau (cinématique inverse à deux os), la tête suit, le buste se penche, un clic le fait sauter. Huit matières aux parts interpolées (tunique, peau, cheveux, bottes, écharpe, manchettes, pantalon, ceinture), visage peint dans le shader. **L'écharpe** a deux pans animés dans le vertex shader (ondes, torsion, vent qui forcit avec le poisson et les clics). |
| **La brume** | `assets/js/mist.js` | Le ciel de tout le site : indigo, nappes de lumière qui dérivent, poussières lumineuses. Sur l'accueil, la scène réutilise les mêmes fonctions GLSL (`MIST_GLSL`) ; sur les autres pages, un petit rendu WebGL2 sans bibliothèque. |
| **Le sol** | `assets/js/scene.js` (passe finale) | Un sol brillant qui reflète la scène en stries horizontales, du halo (bloom) par mipmaps, des rides quand le pointeur le survole, un grain fin. |
| **La protéine** | `assets/js/protein.js`, `assets/data/surface.json` | Sur la page d'un programme, une surface en verre réfracte la brume, s'allume de l'intérieur de la même lumière corail que le poisson et suit la zone `.phero__art` de la page. |
| **Le verre** | `assets/js/glass.js`, classe `.glass` | Surfaces translucides avec lisière lumineuse qui suit le pointeur. |
| **Le logo** | `assets/img/blackphage-logo-blanc.svg`, `blackphage-logo-noir.svg`, `symbole.svg`, `assets/favicon.svg` | Les fichiers officiels, **jamais modifiés** : le blanc sur fond sombre (en-tête, pied de page), le noir sur fond clair (bloc « logos » de la page À propos). `symbole.svg` est le « A » du logotype avec son point, utilisé pour le favicon et le moteur de l'accueil. |
| **La scène** | `assets/js/stage.js` | Une seule boucle d'animation pour tout le site (modèle `useFrame`), pause onglet caché, défilement et pointeur lissés, qualité adaptative. |

Palette : indigo `#151a3c`, encre `#f6f7ff`, iris `#b9c2ff`, pêche `#ffdac9`, corail `#ff9f82`. Titres en Space Grotesk, accent en Instrument Serif italique
(le mot *frontier*), texte en Inter. Le titre de l'accueil lit « Push the frontier of the treatable. »
En portrait (téléphone, tablette), le texte occupe le haut de l'écran et l'œuvre la moitié basse.

Sans WebGL, l'accueil garde une image fixe de l'œuvre (`assets/img/fond-accueil.webp`, et `fond-accueil-portrait.webp` en portrait) et les autres pages un dégradé.
L'image sert aussi de premier affichage, puis fond vers la scène vivante. Avec « réduire les animations », tout est figé sur l'instant où le museau touche le doigt,
une vague de lumière sur le corps. Si l'appareil peine, la qualité baisse toute seule (résolution, lissage).

Réglages utiles : `FISH_UNIT`, `FISH_ABOVE`, `FISH_BELOW` et les dispositions `layout()` (grand écran, portrait) en tête de `scene.js` ; les amplitudes d'ondulation des nageoires
(`kr`, `ka`, `ao`, `ai` par nageoire) dans `FISH_VERT` de `fish.js` ; les couleurs des matières dans `CHILD_FRAG` de `child.js`.
Ajoutez `?t=6.9` à l'adresse de l'accueil pour figer l'animation sur cet instant (captures d'écran, tests).

## Reconstruire l'enfant

Le garçon est modélisé par du code, sans aucun fichier d'artiste : des champs de distance (`tools/child/child.py` : tête, cheveux en mèches, tunique, écharpe, bottes),
un marching cubes, une décimation, puis occlusion ambiante, huit poids de matière et poids de peau par échantillonnage du champ.
Le résultat est quantifié dans `assets/data/child.json` (environ 1,2 Mo, 46 000 triangles).

```bash
pip install numpy scikit-image scipy fast-simplification
python3 tools/child/build.py --h 0.34 --faces 46000     # qualité finale, une vingtaine de secondes
python3 tools/child/build.py --h 0.6 --faces 26000      # aperçu rapide
```

Les mèches (`make_locks`), les proportions et les matières se règlent dans `tools/child/child.py` ; l'écharpe flottante est dans `child.js` (`SCARF_VERT`).
Le poisson n'a pas de fichier de données : tout est dans `fish.js`. L'image fixe se refait avec une capture de l'accueil sans texte (`?t=6.9`).

## Lancer en local

```bash
python3 -m http.server 8000     # puis http://localhost:8000/
```

Un double-clic sur `index.html` ne fonctionne pas : le navigateur bloque le chargement des modules et des données.

## Licences

Polices Space Grotesk, Instrument Serif, Inter et Montserrat sous licence OFL (dossier `assets/fonts`). three.js sous licence MIT (`assets/vendor/three`).
