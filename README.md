# BlackPhage, boutique en ligne

Site statique (HTML, CSS, JavaScript, sans étape de build) pour présenter les Smart Binders BlackPhage,
vendre le catalogue existant et recevoir les demandes sur mesure.

## Langues

Le site existe en français (racine) et en anglais (dossier `en/`). Un bouton dans l'en-tête et le pied de page passe de l'une à l'autre.

- Les pages anglaises sont **générées** par `python tools/build_en.py` à partir des pages françaises et de `tools/en_strings.py`.
  Le script échoue si un texte n'a pas de traduction. Après toute modification d'une page française, relancez-le.
- Les textes produits par le JavaScript sont dans `assets/js/i18n.js`.
- Dans `products.json` et `shop.json`, les champs finissant par `_en` portent la version anglaise (`name_en`, `target_en`, `summary_en`, `uses_en`, `label_en`, `delivery_en`, ...).
- Le texte anglais suit la même règle que le français : ni tiret long, ni point-virgule, ni deux-points.

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
- `assets/js/bg.js` dessine le fond de l'accueil avec three.js : une petite molécule et une protéine qui se génère autour d'elle par diffusion (bruit, puis squelette, puis hélices), en boucle. Les données viennent de `assets/data/pocket.json`, produit par `tools/build_background.py`. Sans WebGL, une image fixe prend le relais.
- Les flacons de `assets/img/vials/` sont des rendus de synthèse (verre, liquide, étiquette au nom de la cible). Un fichier par produit, plus `custom-fr.webp` et `custom-en.webp`. Pour un nouveau produit, ajoutez un rendu du même nom que son identifiant.
- Polices Inter et Montserrat hébergées dans le dépôt (licence SIL OFL), three.js sous licence MIT.
- Texte du site sans tiret long, point-virgule ni deux-points, comme demandé.
- Respect de `prefers-reduced-motion`, navigation au clavier, formulaires avec messages d'erreur.
