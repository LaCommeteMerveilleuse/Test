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
assets/js/main.js       scène 3D, positionnée à partir de la mise en page ([data-stage])
assets/js/molecule.js   chargement de la surface et shader (charnière, couleurs, éclairage)
assets/js/viewer.js     démonstration interactive : pH, mesures, courbe, légende
assets/js/chem.js       les quelques calculs de chimie affichés (Henderson–Hasselbalch)
assets/data/            adk.bin + adk.json : surface moléculaire précalculée
assets/img/             aperçus de secours (appareils sans WebGL)
assets/fonts/           Inter (auto-hébergée, licence OFL)
assets/vendor/three/    three.js r160 (MIT)
tools/build_protein.py  génère assets/data à partir des coordonnées atomiques
```

## D'où viennent les visuels

Rien n'est dessiné à la main : la protéine affichée est une **vraie structure** — l'adénylate kinase d'*E. coli*,
une enzyme dont le mouvement de charnière entre une forme ouverte et une forme fermée est bien documenté.
`tools/build_protein.py` en calcule :

| Élément affiché | Calcul |
| --- | --- |
| Surface | surface exclue au solvant (méthode EDT, sonde de 1,4 Å, rayons de Bondi) |
| Mouvement de charnière | translation-rotation rigide des domaines NMP et LID par rapport au cœur, ajustée sur les deux structures (vis hélicoïdale) puis appliquée sur le GPU |
| Couleur « électrostatique » | potentiel de Coulomb écranté (diélectrique dépendant de la distance) à partir des charges CHARMM |
| Couleur « hydrophobie » | échelle de Kyte–Doolittle |
| Région turquoise | résidus dont l'accessibilité au solvant augmente quand la charnière s'ouvre (Shrake–Rupley) |
| Charge nette, histidines protonées | Henderson–Hasselbalch ; pKa de l'histidine fixé à 6,5 pour la démonstration |
| Occlusion ambiante | précalculée par conformation |

Contrôles de cohérence (affichés par le script) : la charge nette calculée à pH 7,4 (−3,99 e) retombe sur la
charge totale du modèle atomique (−4,00 e) ; la surface déformée s'écarte en moyenne de 0,6 Å de la vraie
surface fermée ; les arginines connues du site actif (36, 123, 156, 167) sont bien détectées comme « cachées
à la fermeture ».

### Ce qui est une illustration, et rien d'autre

- **Le pH ne pilote pas cette charnière** dans la nature : c'est le principe que BlackPhage cherche à
  concevoir. Le curseur relie les deux par un modèle simple (fraction d'histidines protonées) pour montrer
  l'intention de conception. La page le dit explicitement.
- L'ondulation de la surface est un effet visuel léger, inspiré de l'agitation thermique.
- Les durées « court / moyen / long terme » des applications sont des horizons indicatifs.

### Régénérer l'asset 3D

```bash
pip install numpy scipy scikit-image trimesh fast-simplification
python3 tools/build_protein.py --data <dossier avec adk_open.pdb, adk_closed.pdb, adk_open.pqr> --out assets/data
```

## Provenance et licences

- **Structures** : modèles tout-atome dérivés des entrées PDB 4AKE (ouverte, Müller *et al.*, 1996) et 1AKE
  (fermée, Müller & Schulz, 1992), tels que distribués dans le paquet de tests de MDAnalysis (LGPL-3+), car les
  serveurs PDB n'étaient pas joignables au moment de la construction. **Avant mise en ligne**, il est
  recommandé de repartir des entrées PDB d'origine (domaine public) : générer les fichiers PQR avec PDB2PQR,
  puis relancer `tools/build_protein.py`.
- **Police** : Inter, licence SIL OFL 1.1 (`assets/fonts/LICENSE-Inter.txt`).
- **three.js** : licence MIT (`assets/vendor/three/LICENSE`).
- Bruit simplex du shader : Ashima Arts / Stefan Gustavson, MIT.

## Avant de publier

- Remplacer les adresses `contact@`, `careers@`, `partnerships@blackphage.com` par les vraies.
- **Les postes de `careers.html` sont des exemples** : les remplacer par les vrais postes (ou retirer la section).
- Ajouter une image `og:image` (1200×630) si le site est partagé sur les réseaux.
- Aucun cookie ni traceur : les polices sont hébergées localement, donc pas de transfert vers des tiers.
- Les mentions « reste à démontrer » et l'avertissement de pied de page font partie du contenu : à conserver.

## Accessibilité et performance

- Respect de `prefers-reduced-motion` (animations très ralenties, apparitions désactivées).
- Onglets conformes au motif WAI-ARIA ; curseur de pH avec `aria-valuetext` ; navigation au clavier.
- Sans WebGL 2, la page s'affiche avec un aperçu de la même protéine et les mesures restent actives.
- Poids : ~2,8 Mo pour la surface 3D, ~0,7 Mo pour three.js (minifié), ~0,13 Mo de polices.
