# BlackPhage, boutique en ligne

Site statique (HTML, CSS, JavaScript, sans étape de build) pour présenter les Smart Binders BlackPhage,
vendre le catalogue existant et recevoir les demandes sur mesure.

## Langues

Le site existe en français (racine) et en anglais (dossier `en/`). Un sélecteur FR / EN dans l'en-tête et le pied de page passe de l'une à l'autre.

- **Redirection automatique.** À la première page d'une visite, la langue du navigateur décide : français pour un navigateur français,
  anglais pour tous les autres. Cette décision n'est prise qu'une fois par visite, et jamais contre un choix explicite.
  Un clic sur le sélecteur mémorise la langue choisie (`localStorage`, clé `bp-lang`) et elle prime ensuite sur le navigateur.
  Sans stockage disponible, il n'y a pas de redirection. Le script est le même dans toutes les pages (repères `langue:debut` et `langue:fin`),
  il est inséré par `tools/build_en.py`, qui ajoute aussi les liens `hreflang` pour les moteurs de recherche.

- Les pages anglaises sont **générées** par `python tools/build_en.py` à partir des pages françaises et de `tools/en_strings.py`.
  Le script échoue si un texte n'a pas de traduction. Après toute modification d'une page française, relancez-le.
- Les textes produits par le JavaScript sont dans `assets/js/i18n.js`.
- Dans `products.json` et `shop.json`, les champs finissant par `_en` portent la version anglaise (`name_en`, `target_en`, `summary_en`, `uses_en`, `label_en`, `delivery_en`, ...).
- Le texte anglais suit la même règle que le français : ni tiret long, ni point-virgule, ni deux-points.

## Identité visuelle

L'idée : **une molécule qui se lie à sa cible, rendue comme un liquide de verre sur fond blanc.** Tout part de là.

| Élément | Où | Rôle |
| --- | --- | --- |
| **Le signe** | `assets/js/mark.js`, `assets/favicon.svg` | Un lambda (le bactériophage, d'où le nom) en gouttes de liquide. Une petite goutte, la cible, se glisse entre les deux pieds puis repart : le Smart Binder se referme sur elle. Le rendu liquide vient d'un filtre SVG, sans WebGL. Les gouttes s'assemblent à la première page d'une visite. |
| **L'aurore** | `assets/js/aurora.js` | Un champ de couleur doux qui coule derrière toutes les pages, dans l'esprit de shadergradient : du bruit déformé par du bruit, quelques lignes de soie bleue, un peu de grain. Calculé en basse résolution, donc léger. Calme à gauche (le texte), plus coloré à droite. |
| **Le verre** | `assets/js/glass.js`, classes `.glass` et `.glass--lens` | Des surfaces translucides à la liquidglass.js : lisière lumineuse qui suit le pointeur avec de l'inertie et, dans les navigateurs Chromium, réfraction réelle des bords (carte de déplacement et filtre SVG). Ailleurs, verre dépoli lumineux. |
| **La protéine** | `assets/js/bg.js` | Sur l'accueil, la surface de la protéine est en verre liquide : elle réfracte l'aurore qui coule derrière elle avec une dispersion des couleurs, un film irisé comme une bulle de savon et de légères bandes de métal liquide. Elle s'efface quand on descend dans la page. |
| **La scène** | `assets/js/stage.js` | Une seule boucle d'animation pour tout le site, sur le modèle de `useFrame` de react-three-fiber : abonnement par `useFrame()`, pause onglet caché, défilement et pointeur lissés, et qualité adaptative (résolution et réfractions baissent d'elles-mêmes si l'appareil peine). |

Palette : encre `#0b1a4f`, cobalt `#1e3ca8`, bleu vif `#2f56d9`, électrique `#5b86ff`, périwinkle `#b3c6ff`, lilas `#d6ccff`, sur du blanc.
Le dégradé de la marque (`--aurora` dans `site.css`) colore les mots mis en valeur (classe `.hl`), les puces, les étapes et le bandeau.
Titres en Montserrat, texte en Inter. Mouvement lent et fluide, toujours une courbe d'accélération douce. Un grain très léger (7 %) unifie l'ensemble.

Réglages utiles : les couleurs et le mouvement de l'aurore sont dans `AURORA_GLSL` (`aurora.js`), la matière de la protéine dans `FRAG` (`bg.js`),
la force des réfractions dans `glass.js` (`bezel` et `scale`), le signe dans `BEADS` (`mark.js`).
Sans WebGL, le site garde un dégradé CSS et l'accueil une image fixe (`assets/img/fond-accueil.webp`). Avec « réduire les animations », tout est figé sur une belle image.

## Pages

| Page | Rôle |
| --- | --- |
| `index.html` | Accueil. Recherche et lien vers le catalogue juste après l'introduction. Fond animé sur toute la page. |
| `catalogue.html` | Moteur de recherche, filtres par univers, tri. Si rien ne correspond, propose la demande sur mesure. |
| `produit.html#identifiant` | Fiche produit, choix du format, ajout à la commande. |
| `panier.html` | Ma commande. Récapitulatif et demande de devis. |
| `sur-mesure.html` | Demande d'une nouvelle cible en trois étapes. |
| `a-propos.html` | Présentation, questions fréquentes, contact. |
| `careers.html` | Carrières. |

## Modifier le contenu

Tout ce qui change souvent est dans deux fichiers.

- `assets/data/products.json` contient les produits, les prix par format, les disponibilités et les mots-clés de recherche.
  Le champ facultatif `stockRestant` (un nombre) affiche « Plus que N en stock » uniquement s'il est renseigné.
- `assets/data/shop.json` contient l'e-mail de contact, les délais annoncés et la mention « réservé à la recherche ».
  La liste `testimonials` (objets `text` et `author`) affiche une section de témoignages dès qu'elle n'est pas vide.

**Le catalogue, les prix, les disponibilités, les délais, les postes de `careers.html` et les adresses e-mail
fournis sont des exemples.** Remplacez-les avant toute mise en ligne.

## Comment arrive une commande

Le site n'a pas de serveur ni de paiement en ligne. Le bouton « Demander mon devis » (ou « Envoyer ma demande »)
ouvre la messagerie du client avec un message déjà rempli. Si rien ne s'ouvre, le texte est affiché pour être copié.
Aucune demande n'est donc enregistrée par le site lui-même. Pour recevoir les demandes automatiquement, il faudra
brancher un service de formulaire ou une boutique en ligne.

## Lancer en local

```bash
python3 -m http.server 8000     # puis http://localhost:8000/
```

Un double-clic sur `index.html` ne fonctionne pas : le navigateur bloque le chargement des modules.

## Principes de vente appliqués

- **Réciprocité** (Cialdini). Conseil gratuit, premier échange offert, prix visibles dès la recherche.
- **Engagement et cohérence.** On commence par une simple recherche, puis un ajout à la commande, puis une demande de devis.
  La demande sur mesure se fait en trois petites étapes.
- **Preuve sociale.** Section de témoignages prête, affichée seulement avec de vrais témoignages.
- **Rareté honnête.** Le message de stock n'apparaît que si le chiffre réel est renseigné.
- **Autorité et sympathie.** Ton direct, équipe joignable, réponses sous un délai annoncé.
- **Offre claire** (Kaufman). Une promesse en une phrase, trois étapes simples, trois formats avec un conseil de l'équipe.
- **Réduction du risque.** Aucun paiement avant l'accord sur le devis, question gratuite avant achat.
- **Facilité.** Moteur de recherche tolérant aux fautes, suggestions, formulaires courts.

## Technique

- `assets/js/shop.js` regroupe données, moteur de recherche, panier (stocké dans le navigateur) et affichage des flacons.
- `assets/js/bg.js` dessine la protéine de l'accueil avec three.js (données dans `assets/data/surface.json`), `assets/js/aurora.js` le fond de toutes les pages en WebGL2 brut, sans three.js. Voir « Identité visuelle ».
- Les flacons de `assets/img/vials/` sont des rendus de synthèse (verre, liquide, étiquette au nom de la cible). Un fichier par produit, plus `custom-fr.webp` et `custom-en.webp`. Pour un nouveau produit, ajoutez un rendu du même nom que son identifiant.
- Polices Inter et Montserrat hébergées dans le dépôt (licence SIL OFL), three.js sous licence MIT.
- Texte du site sans tiret long, point-virgule ni deux-points, comme demandé.
- Respect de `prefers-reduced-motion`, navigation au clavier, formulaires avec messages d'erreur.
