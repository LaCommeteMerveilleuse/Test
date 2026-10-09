# BlackPhage — site vitrine

Site statique (HTML / CSS / JavaScript, sans build) présentant BlackPhage et sa
plateforme de conception de protéines.

## Lancer en local

Les pages utilisent des modules ES et un `importmap`, il faut donc les servir en HTTP
(un double-clic sur le fichier ne suffit pas) :

```bash
python3 -m http.server 8000
# puis http://127.0.0.1:8000/
```

## Structure

```
index.html              page d'accueil
careers.html            page Carrières / Work with us
assets/css/style.css    styles (tokens de design en haut du fichier)
assets/js/main.js       scène 3D, chorégraphie au défilement, curseur de pH, filtres
assets/js/protein.js    génération de la surface de protéine et de son site de liaison
assets/js/journey.js    schéma animé du trajet d'un Smart Binder (canvas 2D)
assets/vendor/three/    three.js r160 (trois fichiers seulement), licence MIT incluse
```

## Visuels

- **La protéine** est générée au chargement : une chaîne repliée est convertie en
  surface par *marching cubes*, puis colorée comme une carte électrostatique.
  La surface ondule légèrement et son site de liaison s'ouvre ou se referme.
- **Le curseur de pH** (section Smart Binders) pilote cette ouverture. C'est une
  **démonstration de principe**, pas une courbe expérimentale.
- **Le schéma de trajet** (section Our goals) est dessiné sur un canvas 2D.

Les deux animations respectent `prefers-reduced-motion` et se mettent en pause quand
elles sortent de l'écran. Sans WebGL, la page s'affiche sans la protéine 3D.

## Contenu

Les formulations décrivent des objectifs de recherche. Les mentions précisant que
l'adaptation au pH et l'efficacité biologique restent à démontrer, ainsi que
l'avertissement en pied de page, font partie du contenu : merci de les conserver si
le texte évolue.
