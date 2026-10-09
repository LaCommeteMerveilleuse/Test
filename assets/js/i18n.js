// BlackPhage - langue de la page (fr ou en) et textes générés par le JavaScript.
// Les pages anglaises vivent dans en/ et déclarent data-base="../" sur <html>.
export const LANG = document.documentElement.lang === 'en' ? 'en' : 'fr';
export const BASE = document.documentElement.dataset.base || '';

const D = {
  fr: {
    nav_catalogue: 'Catalogue', nav_about: 'À propos', nav_careers: 'Carrières', nav_order: 'Ma commande', nav_request: 'Demander une cible',
    nav_menu: 'Ouvrir le menu', nav_main: 'Navigation principale', nav_items: 'articles', home_aria: 'BlackPhage, accueil',
    foot_tagline: 'Le Smart Binder de votre cible, prêt à commander ou créé pour vous.',
    foot_shop: 'Boutique', foot_company: 'Société', foot_faq: 'Questions fréquentes', foot_contact: 'Contact',
    reply_within: 'Réponse sous {x}', lang_switch: 'English', lang_switch_label: 'Switch to English',
    from: 'À partir de', in_stock: 'En stock', on_demand: 'Sur commande', only_left: 'Plus que {n} en stock',
    all_catalogue: 'Tout le catalogue', no_result: 'Aucun résultat', n_binders: '{n} Smart Binder{s}',
    no_binder_for: 'Pas encore de Smart Binder pour « {q} »', new_target: 'Nouvelle cible', your_target: 'Votre cible',
    see_n_results: 'Voir les {n} résultats', can_create: 'Nous pouvons le créer pour vous',
    not_found: 'Produit introuvable', not_exist: "Ce Smart Binder n'existe pas", find_or_custom: 'Retrouvez-le dans le catalogue ou demandez-le sur mesure.',
    see_catalogue: 'Voir le catalogue', request_target: 'Demander une cible', crumbs: "Fil d'Ariane",
    choose_format: 'Choisissez votre format', format: 'Format', our_advice: 'Notre conseil', quantity: 'Quantité', less: 'Moins', more: 'Plus',
    add_to_order: 'Ajouter à ma commande', tick_delivery: 'Livraison suivie en', tick_question: 'Une question avant de commander ? Notre équipe répond sous',
    tick_quote: 'Vous recevez un devis clair avant tout paiement.', ideal_for: 'Idéal pour', ask_team: "Poser une question à l'équipe",
    same_world: 'Dans le même univers', added: '{n} ajouté à votre commande.', see_order: 'Voir ma commande',
    q_subject: 'Question sur {n}', q_body: "Bonjour,\n\nJ'ai une question sur {n}.\n\n",
    remove: 'Retirer',
    mail_hello: 'Bonjour,', mail_thanks: 'Merci.', quote_intro: 'Je souhaite recevoir un devis pour la commande suivante.',
    line: '- {n}, {f} ({d}), quantité {q}, {t}', est_total: 'Total estimé', name: 'Nom', email: 'E-mail', org: 'Organisation', not_given: 'non précisée', message: 'Message',
    quote_subject: 'Demande de devis de {n}', err_name: 'Indiquez votre nom.', err_email: 'Indiquez une adresse e-mail valide.', err_target: 'Indiquez la cible qui vous intéresse.',
    copied: 'Texte copié', copy_manual: 'Sélectionnez le texte puis copiez-le',
    step_of: 'Étape {i} sur {n}', good_news: 'Bonne nouvelle.', exists_now: 'Ce Smart Binder existe déjà, vous pouvez le commander tout de suite.', or: 'ou',
    custom_intro: 'Je souhaite faire créer un Smart Binder sur mesure.', target: 'Cible', usage: 'Usage', unspecified: 'Non précisé', qty_wanted: 'Quantité souhaitée', timeline: 'Échéance', details: 'Précisions',
    custom_subject: 'Demande sur mesure pour {n}',
  },
  en: {
    nav_catalogue: 'Catalogue', nav_about: 'About', nav_careers: 'Careers', nav_order: 'My order', nav_request: 'Request a target',
    nav_menu: 'Open the menu', nav_main: 'Main navigation', nav_items: 'items', home_aria: 'BlackPhage, home',
    foot_tagline: 'The Smart Binder for your target, ready to order or made for you.',
    foot_shop: 'Shop', foot_company: 'Company', foot_faq: 'Frequently asked questions', foot_contact: 'Contact',
    reply_within: 'Reply within {x}', lang_switch: 'Français', lang_switch_label: 'Passer en français',
    from: 'From', in_stock: 'In stock', on_demand: 'Made to order', only_left: 'Only {n} left in stock',
    all_catalogue: 'Whole catalogue', no_result: 'No results', n_binders: '{n} Smart Binder{s}',
    no_binder_for: 'No Smart Binder yet for "{q}"', new_target: 'New target', your_target: 'Your target',
    see_n_results: 'See all {n} results', can_create: 'We can make it for you',
    not_found: 'Product not found', not_exist: 'This Smart Binder does not exist', find_or_custom: 'Find it in the catalogue or request it as a custom order.',
    see_catalogue: 'Browse the catalogue', request_target: 'Request a target', crumbs: 'Breadcrumb',
    choose_format: 'Choose your size', format: 'Size', our_advice: 'Our advice', quantity: 'Quantity', less: 'Less', more: 'More',
    add_to_order: 'Add to my order', tick_delivery: 'Tracked delivery in', tick_question: 'A question before you order? Our team replies within',
    tick_quote: 'You receive a clear quote before any payment.', ideal_for: 'Ideal for', ask_team: 'Ask the team a question',
    same_world: 'In the same category', added: '{n} added to your order.', see_order: 'See my order',
    q_subject: 'Question about {n}', q_body: 'Hello,\n\nI have a question about {n}.\n\n',
    remove: 'Remove',
    mail_hello: 'Hello,', mail_thanks: 'Thank you.', quote_intro: 'I would like to receive a quote for the following order.',
    line: '- {n}, {f} ({d}), quantity {q}, {t}', est_total: 'Estimated total', name: 'Name', email: 'Email', org: 'Organisation', not_given: 'not given', message: 'Message',
    quote_subject: 'Quote request from {n}', err_name: 'Please enter your name.', err_email: 'Please enter a valid email address.', err_target: 'Please enter the target you are interested in.',
    copied: 'Text copied', copy_manual: 'Select the text then copy it',
    step_of: 'Step {i} of {n}', good_news: 'Good news.', exists_now: 'This Smart Binder already exists, you can order it right away.', or: 'or',
    custom_intro: 'I would like to have a custom Smart Binder made.', target: 'Target', usage: 'Use', unspecified: 'Not specified', qty_wanted: 'Quantity wanted', timeline: 'Timeline', details: 'Details',
    custom_subject: 'Custom request for {n}',
  },
};

export function t(key, vars = {}) {
  const s = (D[LANG][key] ?? D.fr[key] ?? key);
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));
}

/** Adresse de la même page dans l'autre langue. */
export function otherLangHref() {
  const file = location.pathname.split('/').pop() || 'index.html';
  const rest = location.search + location.hash;
  return (LANG === 'en' ? `../${file}` : `en/${file}`) + rest;
}
