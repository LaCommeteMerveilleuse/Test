// BlackPhage - langue de la page (fr ou en) et textes produits par le JavaScript.
// Les textes des pages statiques sont dans tools/content.py. Ici, seulement ce que le JavaScript écrit lui-même.
// Les pages anglaises vivent dans en/ et déclarent data-base="../" sur <html>.
export const LANG = (document.documentElement.dataset.lang || document.documentElement.lang) === 'en' ? 'en' : 'fr';
export const BASE = document.documentElement.dataset.base || '';

const D = {
  fr: {
    updated: 'Mis à jour le {date}', programs_n: '{n} programmes', program_n: '{n} programme',
    h_program: 'Programme', h_area: 'Domaine', h_stage: 'Phase', h_status: 'Statut',
    view_program: 'Voir le programme', back_pipeline: 'Tout le pipeline',
    not_found: 'Programme introuvable', not_found_p: 'Ce programme n\'existe pas ou n\'est pas public.',
    problem_eyebrow: 'Le problème', problem_h2: 'Ce que les traitements actuels laissent sur la table.',
    answer_eyebrow: 'Notre réponse', answer_h2: 'Un autre type de binder.',
    where_eyebrow: 'Où nous en sommes', where_h2: 'Une avance protégée.',
    cta_h2: 'Écrivons la suite ensemble.', cta_p: 'Nous parlons de {name} avec des partenaires américains. Dites-nous ce que vous construisez.',
    cta_btn: 'Parlons partenariat', cta_all: 'Voir tout le pipeline',
    copy_mail: 'Copier', copied: 'Copié', copy_label: 'Copier l\'adresse {mail}', undisclosed: 'Confidentiel',
    loading: 'Chargement', error: 'Les données ne se sont pas chargées. Réessayez dans un instant.',
    mail_subject: 'Programme {name}',
  },
  en: {
    updated: 'Updated {date}', programs_n: '{n} programs', program_n: '{n} program',
    h_program: 'Program', h_area: 'Area', h_stage: 'Stage', h_status: 'Status',
    view_program: 'View the program', back_pipeline: 'Full pipeline',
    not_found: 'Program not found', not_found_p: 'This program does not exist or is not public.',
    problem_eyebrow: 'The problem', problem_h2: 'What today\'s drugs leave on the table.',
    answer_eyebrow: 'Our answer', answer_h2: 'A different kind of binder.',
    where_eyebrow: 'Where we are', where_h2: 'A protected head start.',
    cta_h2: 'Build the next chapter with us.', cta_p: 'We are speaking with U.S. partners about {name}. Tell us what you are building.',
    cta_btn: 'Talk partnership', cta_all: 'See the full pipeline',
    copy_mail: 'Copy', copied: 'Copied', copy_label: 'Copy the address {mail}', undisclosed: 'Undisclosed',
    loading: 'Loading', error: 'The data did not load. Try again in a moment.',
    mail_subject: '{name} program',
  },
};

export function t(key, vars = {}) {
  const s = (D[LANG][key] ?? D.fr[key] ?? key);
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));
}

/** Choisit la langue d'un champ {fr, en} des fichiers de données. */
export const L = (o) => (o && typeof o === 'object' ? (o[LANG] ?? o.fr ?? '') : (o ?? ''));

const FILES = { accueil: 'index.html', pipeline: 'pipeline.html', programme: 'program.html', 'a-propos': 'a-propos.html', carrieres: 'careers.html' };

/** Adresse de la même page dans l'autre langue (l'ancre est conservée). */
export function otherLangHref() {
  const fromPath = location.pathname.split('/').pop();
  const file = FILES[document.body.dataset.page] || (/\.html$/.test(fromPath) ? fromPath : 'index.html');
  return (LANG === 'en' ? `../${file}` : `en/${file}`) + location.search + location.hash;
}

/** Mémorise le choix de langue de la personne. La redirection automatique ne le contredit plus. */
export function rememberLang(lang) {
  try { localStorage.setItem('bp-lang', lang); } catch { /* stockage indisponible */ }
}
