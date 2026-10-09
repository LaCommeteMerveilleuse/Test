# BlackPhage, boutique en ligne

Site statique (HTML, CSS, JavaScript, sans étape de build) pour présenter les Smart Binders BlackPhage,
vendre le catalogue existant et recevoir les demandes sur mesure.

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

- `assets/js/shop.js` regroupe données, moteur de recherche, panier (stocké dans le navigateur) et flacon illustré.
- `assets/js/bg.js` dessine le fond de l'accueil avec three.js. Sans WebGL, une image fixe prend le relais.
- Polices Inter et Montserrat hébergées dans le dépôt (licence SIL OFL), three.js sous licence MIT.
- Texte du site sans tiret long, point-virgule ni deux-points, comme demandé.
- Respect de `prefers-reduced-motion`, navigation au clavier, formulaires avec messages d'erreur.
