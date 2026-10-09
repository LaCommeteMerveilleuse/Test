# BlackPhage — site vitrine

Site statique (HTML, CSS, JavaScript — sans étape de build) qui présente BlackPhage, sa plateforme de
conception de protéines et les Smart Binders.

## Lancer en local

Les pages utilisent des modules ES et une `importmap` : il faut les servir en HTTP.

```bash
python3 -m http.server 8000     # puis http://127.0.0.1:8000/
```

## Structure

```
index.html              accueil (mission, Smart Binders, plateforme, applications)
careers.html            carrières / Work with us
assets/css/style.css    styles (variables de design en tête de fichier)
assets/js/ui.js         menu, apparitions au défilement, onglets — sans dépendance 3D
assets/js/main.js       scène 3D, cadrée à partir de la mise en page ([data-stage])
assets/js/molecule.js   la cible : surface moléculaire (shader « argile » + occlusion ambiante)
assets/js/binder.js     la protéine générée : poses, assemblage piloté par le pH, animation de génération
assets/js/cartoon.js    rubans (hélices), flèches (feuillets) et tubes, reconstruits à chaque image
assets/js/viewer.js     démonstration interactive : pH, étiquettes, courbe, mesures
assets/js/chem.js       Henderson–Hasselbalch pour l'histidine
assets/data/            adk.* (surface de la cible) et binder.json (binder idéalisé et ses poses)
assets/img/             aperçus de secours (appareils sans WebGL)
assets/fonts/           Inter (auto-hébergée, licence OFL)
assets/vendor/three/    three.js r160 (MIT)
tools/build_protein.py  génère assets/data/adk.* à partir des coordonnées atomiques
tools/build_binder.py   génère assets/data/binder.json (domaines, placement, lieur, assemblage)
tools/slim_target.py    retire de adk.bin les données de charnière devenues inutiles
```

## Ce qui est réel, ce qui est mis en scène

| Élément | Statut |
| --- | --- |
| **Surface de la cible** (gris-teal) | **Réelle** : surface exclue au solvant de l'adénylate kinase d'*E. coli* (méthode EDT, sonde de 1,4 Å, rayons de Bondi), calculée par `build_protein.py`. L'occlusion ambiante est précalculée. |
| Mode « Électrostatique » | **Calculé** : potentiel de Coulomb écranté à partir des charges CHARMM du modèle atomique. |
| **Protéine rose (le binder)** | **Idéalisée**, pas issue d'un modèle de conception : deux domaines de type ferrédoxine (β-α-β-β-α-β) construits par `build_binder.py` à partir de coordonnées standard d'hélice α (100°/résidu, 1,5 Å) et de feuillet β (3,3 Å), reliés par un lieur de 17 résidus. Liaisons CA–CA de 3,80–3,83 Å, aucun contact anormal. |
| Placement sur la cible | **Recherche géométrique** (complémentarité de forme, absence de collision, extrémités dégagées) : ce n'est **pas** un docking validé et rien ne dit que ce binder se fixerait. |
| Assemblage (« auto-association ») | **Illustration** : empaquetage de trois copies où la face de chaque domaine qui contacterait la cible est tournée vers l'intérieur. |
| Animation de génération | **Mise en scène** d'un processus de diffusion : un nuage de positions bruitées se condense, un squelette lissé s'étend et se précise, les éléments de structure se cristallisent résidu par résidu. **Aucun modèle n'est exécuté.** L'interface le dit. |
| Histidines protonées | **Calculé** : Henderson–Hasselbalch, pKa fixé à 6,5. |
| Passage « histidines protonées → l'assemblage se dissocie → les domaines se fixent » | **Hypothèse de conception** : c'est le principe que BlackPhage cherche à réaliser. Il n'est pas démontré. |

La page l'écrit en toutes lettres (encadré « Ce que cette illustration montre — et ne montre pas »), ainsi que
« l'adaptation au pH et l'efficacité biologique restent à démontrer ».

### Régénérer les données 3D

```bash
pip install numpy scipy scikit-image trimesh fast-simplification
python3 tools/build_protein.py --data <dossier avec adk_open.pdb, adk_closed.pdb, adk_open.pqr> --out assets/data
python3 tools/slim_target.py   --data assets/data
python3 tools/build_binder.py  --data assets/data --out assets/data/binder.json [--plot controle.png]
```

`build_binder.py` est déterministe (graines fixes). `--plot` produit des projections de contrôle du placement.

## Provenance et licences

- **Cible** : modèle tout-atome dérivé de l'entrée PDB 4AKE (Müller *et al.*, 1996), tel que distribué dans le paquet
  de tests de MDAnalysis (LGPL-3+), car les serveurs PDB n'étaient pas joignables au moment de la construction.
  **Avant mise en ligne**, il est recommandé de repartir de l'entrée PDB d'origine (domaine public) : générer le
  fichier PQR avec PDB2PQR, puis relancer les deux scripts.
- **Police** : Inter, licence SIL OFL 1.1 (`assets/fonts/LICENSE-Inter.txt`).
- **three.js** : licence MIT (`assets/vendor/three/LICENSE`).
- Bruit simplex du shader : Ashima Arts / Stefan Gustavson, MIT.

## Avant de publier

- Remplacer les adresses `contact@`, `careers@`, `partnerships@blackphage.com` par les vraies.
- **Les postes de `careers.html` sont des exemples** : les remplacer par les vrais postes (ou retirer la section).
- Confirmer que la mention de **diffusion** décrit bien la plateforme : la page ne parle de diffusion que pour
  l'animation illustrative.
- Ajouter une image `og:image` (1200×630) si le site est partagé sur les réseaux.
- Aucun cookie ni traceur : les polices sont hébergées localement, donc pas de transfert vers des tiers.
- Les mentions « reste à démontrer » et l'avertissement de pied de page font partie du contenu : à conserver.

## Accessibilité et performance

- `prefers-reduced-motion` : pas d'animation de génération, transitions instantanées, ondulation très ralentie.
- Onglets conformes au motif WAI-ARIA ; curseur de pH avec `aria-valuetext` ; étapes du récit utilisables au clavier.
- Sans WebGL 2, la page s'affiche avec un aperçu de la même scène et les mesures du curseur restent actives.
- Poids : ~2,2 Mo de données 3D, ~0,7 Mo pour three.js (minifié), ~0,13 Mo de polices.
