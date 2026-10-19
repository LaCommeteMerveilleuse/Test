"""Textes des pages statiques du site, en français et en anglais côte à côte.
Chaque clé existe dans les deux langues, sinon la génération échoue.
Règle de rédaction : phrases courtes, ton affirmé, jamais de tiret long, de point-virgule ni de deux-points dans le texte visible."""

STR = {'fr': {}, 'en': {}}


def s(key, fr, en):
    assert key not in STR['en'], f'clé en double {key}'
    STR['fr'][key] = fr
    STR['en'][key] = en


# ------------------------------------------------------------------ communs
s('nav_home', 'Accueil', 'Home')
s('nav_pipeline', 'Pipeline', 'Pipeline')
s('nav_about', 'À propos', 'About')
s('nav_careers', 'Carrières', 'Careers')
s('nav_partner', 'Devenir partenaire', 'Partner with us')
s('nav_menu', 'Ouvrir le menu', 'Open the menu')
s('nav_main', 'Navigation principale', 'Main navigation')
s('home_aria', 'BlackPhage, accueil', 'BlackPhage, home')
s('lang_switch_label', 'Switch to English', 'Passer en français')
s('skip', 'Aller au contenu', 'Skip to content')
s('foot_tagline', 'Repousser la frontière du traitable.', 'Push the frontier of the treatable.')
s('foot_company', 'Société', 'Company')
s('foot_programs', 'Programmes', 'Programs')
s('foot_contact', 'Contact', 'Contact')
s('legal', 'Brevets en cours. Programmes expérimentaux, non approuvés par la FDA ni par aucune autorité.',
  'Patents pending. Investigational programs, not approved by the FDA or any regulator.')
s('rights', 'Tous droits réservés', 'All rights reserved')
s('brand_tag', 'Smart Binders', 'Smart Binders')
s('strip_1', 'Brevets en cours', 'Patents pending')
s('strip_2', 'Société privée', 'Private company')
s('strip_3', 'Conçu pour le marché américain', 'Built for the U.S. market')
s('cta_pipeline', 'Explorer le pipeline', 'Explore the pipeline')
s('cta_partner', 'Devenir partenaire', 'Partner with us')

# ------------------------------------------------------------------ accueil
s('home_title', 'BlackPhage', 'BlackPhage')
s('home_desc', 'Un agent autonome qui conçoit des médicaments protéiques plus intelligents. Dépendants du pH. Précis. Brevets en cours.',
  'An autonomous agent that designs smarter protein medicines. pH-dependent. Precise. Patents pending.')
s('home_h1_a', 'Repousser la', 'Push the')
s('home_h1_b', 'frontière', 'frontier')
s('home_h1_c', 'du traitable.', 'of the treatable.')
s('home_lead', 'Un agent autonome qui conçoit des médicaments protéiques plus intelligents. Dépendants du pH. Précis. Brevets en cours.',
  'An autonomous agent that designs smarter protein medicines. pH-dependent. Precise. Patents pending.')

s('idea_eyebrow', 'L\'idée', 'The idea')
s('idea_1', 'Comprendre le vivant.', 'Understand life.')
s('idea_1n', 'Notre agent lit la biologie à grande échelle.', 'Our agent reads biology at scale.')
s('idea_2', 'Concevoir l\'intervention.', 'Design the intervention.')
s('idea_2n', 'Il dessine, évalue et affine de nouvelles protéines.', 'It drafts, scores and refines new proteins.')
s('idea_3', 'Reprendre le contrôle.', 'Take back control.')
s('idea_3n', 'Chaque variante agit là où elle le doit, et nulle part ailleurs.', 'Every variant acts where it should, and nowhere else.')

s('engine_eyebrow', 'Le moteur', 'The engine')
s('engine_h2', 'Un agent. Plusieurs pathologies.', 'One agent. Many diseases.')
s('engine_lead', 'BlackPhage fait tourner une boucle de conception autonome. Elle propose. Elle juge. Elle apprend. Puis elle recommence.',
  'BlackPhage runs an autonomous design loop. It proposes. It judges. It learns. Then it starts again.')
s('step_1', 'Lire', 'Read')
s('step_1n', 'Cartographie la biologie de la maladie et de la cible.', 'Maps the disease biology and the target.')
s('step_2', 'Concevoir', 'Design')
s('step_2n', 'Dessine des Smart Binders à partir de zéro.', 'Drafts Smart Binders from scratch.')
s('step_3', 'Juger', 'Judge')
s('step_3n', 'Note chaque candidat sur la précision et la sécurité.', 'Scores each candidate for precision and safety.')
s('step_4', 'Apprendre', 'Learn')
s('step_4n', 'Réinjecte chaque résultat dans le tour suivant.', 'Feeds every result into the next round.')

s('class_eyebrow', 'Smart Binders', 'Smart Binders')
s('class_h2', 'Une nouvelle classe de médicaments.', 'A new class of medicine.')
s('class_lead', 'Des protéines conçues de zéro pour se lier à une seule cible, avec intention.', 'Proteins designed from scratch to bind one target, with intent.')
s('pillar_1', 'Dépendant du pH', 'pH-dependent')
s('pillar_1n', 'Conçu pour s\'activer là où le pH local le permet.', 'Built to switch on where the local pH calls for it.')
s('pillar_2', 'Plus doux', 'Gentler')
s('pillar_2n', 'Pensé pour un profil de toxicité plus bas.', 'Designed for a lower toxicity profile.')
s('pillar_3', 'Précis', 'Precise')
s('pillar_3n', 'Une sélectivité plus fine au niveau de la cible.', 'Sharper selectivity at the target.')

s('lead_eyebrow', 'Pipeline', 'Pipeline')
s('lead_h2', 'Programme phare. GLP-1R.', 'Lead program. GLP-1R.')
s('lead_p', 'Le récepteur le plus convoité de la médecine. Notre réponse est dépendante du pH, plus douce et plus précise.',
  'The most wanted receptor in medicine. Our answer is pH-dependent, gentler and sharper.')
s('lead_cta', 'Voir le programme', 'View the program')
s('lead_next', 'Prochains programmes', 'Next programs')
s('lead_next_p', 'Confidentiels jusqu\'aux dépôts de brevets.', 'Undisclosed until filings land.')

s('end_h2', 'La frontière est ouverte.', 'The frontier is open.')
s('end_p', 'Nous parlons aux partenaires pharmaceutiques américains, aux investisseurs et à la presse.', 'We speak with U.S. pharma partners, investors and press.')

# ------------------------------------------------------------------ pipeline
s('pipe_title', 'Pipeline', 'Pipeline')
s('pipe_desc', 'Les programmes de BlackPhage, mis à jour par notre agent.', 'The BlackPhage programs, updated by our agent.')
s('pipe_eyebrow', 'Pipeline', 'Pipeline')
s('pipe_h1', 'Les composés sur lesquels nous travaillons.', 'The compounds we are working on.')
s('pipe_lead', 'Notre agent ajoute et affine les programmes en continu. Cette page suit.', 'Our agent adds and refines programs continuously. This page follows.')
s('pipe_note', 'Les programmes suivants restent confidentiels tant que les brevets ne sont pas déposés.', 'Further programs stay private until patents are filed.')

# ------------------------------------------------------------------ programme
s('prog_title', 'Programme', 'Program')
s('prog_desc', 'Un programme BlackPhage en détail. Les limites des traitements actuels et notre réponse.', 'A BlackPhage program in detail. The limits of today\'s drugs and our answer.')

# ------------------------------------------------------------------ à propos
s('about_title', 'À propos', 'About us')
s('about_desc', 'BlackPhage est une société privée. Son agent autonome conçoit des médicaments protéiques dépendants du pH.',
  'BlackPhage is a private company. Its autonomous agent designs pH-dependent protein medicines.')
s('about_eyebrow', 'À propos', 'About us')
s('about_h1', 'Nous construisons la frontière du médicament protéique.', 'We build the frontier of protein medicine.')
s('about_lead', 'BlackPhage est une société privée. Son agent autonome conçoit des Smart Binders, une nouvelle classe de médicaments protéiques dépendants du pH, pour des maladies qui manquent encore de bonnes réponses.',
  'BlackPhage is a private company. Its autonomous agent designs Smart Binders, a new class of pH-dependent protein medicines, for diseases that still lack good answers.')
s('drive_eyebrow', 'Ce qui nous porte', 'What drives us')
s('drive_h2', 'Trois principes.', 'Three principles.')
s('drive_1', 'La frontière d\'abord', 'Frontier first')
s('drive_1n', 'Nous allons là où les outils actuels s\'arrêtent.', 'We go where today\'s tools run out.')
s('drive_2', 'La précision avant le volume', 'Precision over volume')
s('drive_2n', 'Une molécule précise vaut mieux que mille molécules grossières.', 'One sharp molecule beats a thousand blunt ones.')
s('drive_3', 'Les patients fixent la barre', 'Patients set the bar')
s('drive_3n', 'Chaque choix de conception répond à quelqu\'un qui attend mieux.', 'Every design choice answers to someone waiting for better.')
s('how_eyebrow', 'Notre méthode', 'How we work')
s('how_h2', 'L\'agent mène. Les scientifiques décident.', 'Agent-led. Scientist-decided.')
s('how_1', 'L\'agent propose, les scientifiques tranchent.', 'The agent proposes. Scientists decide.')
s('how_2', 'Chaque tour apprend au suivant.', 'Every round teaches the next.')
s('how_3', 'Privé par défaut. Protégé avant d\'être public.', 'Private by default. Protected before public.')
s('contact_eyebrow', 'Contact', 'Contact')
s('contact_h2', 'Devenir partenaire.', 'Partner with us.')
s('contact_p', 'Dites-nous ce que vous construisez. Nous répondons aux partenaires pharmaceutiques américains, aux investisseurs et à la presse.',
  'Tell us what you are building. We answer U.S. pharma partners, investors and press.')
s('contact_partners', 'Partenaires et investisseurs', 'Partners and investors')
s('contact_press', 'Presse', 'Press')
s('contact_careers', 'Recrutement', 'Hiring')

# ------------------------------------------------------------------ carrières
s('car_title', 'Carrières', 'Careers')
s('car_desc', 'Rejoignez BlackPhage et aidez à concevoir une nouvelle classe de médicaments protéiques.', 'Join BlackPhage and help design a new class of protein medicines.')
s('car_eyebrow', 'Carrières', 'Careers')
s('car_h1', 'Un impact qui change le monde naît d\'une culture pensée pour l\'innovation.', 'World-changing impact starts with a culture built for innovation.')
s('car_lead', 'Chez BlackPhage, nous construisons un agent autonome qui conçoit de nouveaux médicaments. Notre équipe réunit biologie, apprentissage automatique et ingénierie, avec une même envie de repousser la frontière du traitable.',
  'At BlackPhage, we build an autonomous agent that designs new medicines. Our team brings together biology, machine learning and engineering, with one shared drive to move the frontier of the treatable.')
s('why_eyebrow', 'Pourquoi nous rejoindre', 'Why join us')
s('why_h2', 'Un endroit où vos idées comptent.', 'A place where your ideas count.')
s('why_1', 'Une équipe petite et affûtée', 'A small, sharp team')
s('why_1n', 'Des décisions rapides, peu d\'intermédiaires et des idées qui deviennent des programmes.', 'Fast decisions, few layers, and ideas that turn into programs.')
s('why_2', 'Un impact concret', 'Real impact')
s('why_2n', 'Votre travail s\'attaque à des maladies qui n\'ont pas encore de bonne réponse.', 'Your work goes after diseases that still lack a good answer.')
s('why_3', 'Un cadre qui vous fait grandir', 'A place to grow')
s('why_3n', 'Vous apprenez chaque semaine, aux côtés de collègues qui aiment transmettre.', 'You learn every week, alongside colleagues who love to share what they know.')
s('prof_eyebrow', 'Le profil que nous recherchons', 'Who we are looking for')
s('prof_h2', 'Cinq qualités que nous valorisons.', 'Five qualities we value.')
s('q_1', 'Réflexion', 'Thoughtful')
s('q_1n', 'Vous prenez le temps de comprendre un problème avant d\'y répondre.', 'You take the time to understand a problem before answering it.')
s('q_2', 'Curiosité', 'Curious')
s('q_2n', 'Vous posez des questions, explorez d\'autres disciplines et aimez apprendre.', 'You ask questions, explore other disciplines and love to learn.')
s('q_3', 'Créativité', 'Creative')
s('q_3n', 'Vous imaginez des solutions que personne n\'a encore essayées.', 'You imagine solutions nobody has tried yet.')
s('q_4', 'Détermination', 'Determined')
s('q_4n', 'Face à un obstacle, vous cherchez une autre voie jusqu\'à ce que cela fonctionne.', 'When you hit an obstacle, you find another way until it works.')
s('q_5', 'Esprit d\'équipe', 'Collaborative')
s('q_5n', 'Vous donnez le meilleur de vous-même à plusieurs et vous partagez ce que vous savez.', 'You do your best work with others and share what you know.')
s('skill_eyebrow', 'Les compétences', 'Skills')
s('skill_h2', 'Des savoir-faire variés, une même exigence.', 'Varied expertise, one shared standard.')
s('skill_lead', 'Nous recrutons des personnes qui allient rigueur scientifique et esprit de bâtisseur. Selon les postes, nous recherchons ces compétences.',
  'We hire people who combine scientific rigor with a builder\'s mindset. Depending on the role, we look for these skills.')
for i, (fr, en) in enumerate([
    ('Conception de protéines', 'Protein design'),
    ('Apprentissage automatique et agents IA', 'Machine learning and AI agents'),
    ('Biologie computationnelle', 'Computational biology'),
    ('Biochimie et biologie moléculaire', 'Biochemistry and molecular biology'),
    ('Ingénierie logicielle', 'Software engineering'),
    ('Propriété intellectuelle et réglementaire', 'IP and regulatory strategy'),
    ('Partenariats et développement commercial', 'Partnerships and business development'),
    ('Communication claire', 'Clear communication'),
], 1):
    s(f'sk_{i}', fr, en)
s('jobs_eyebrow', 'Postes ouverts', 'Open positions')
s('jobs_h2', 'Nous recrutons.', 'We are hiring.')
s('jobs_lead', 'Écrivez-nous à cette adresse. Joignez un CV et quelques lignes sur ce qui vous motive.', 'Write to us at this address. Attach a CV and a few lines on what drives you.')
s('job_full', 'Temps plein', 'Full time')
s('job_apply', 'Postuler', 'Apply')
s('job_1_team', 'Équipe agent', 'Agent team')
s('job_1', 'Ingénierie des agents IA', 'AI agent engineer')
s('job_1n', 'Construire les boucles qui permettent à notre agent de planifier, concevoir et apprendre seul.', 'Build the loops that let our agent plan, design and learn on its own.')
s('job_2_team', 'Conception', 'Design')
s('job_2', 'Recherche en conception de protéines', 'Protein design scientist')
s('job_2n', 'Transformer les propositions de l\'agent en binders qui fonctionnent au laboratoire.', 'Turn the agent\'s proposals into binders that work in the lab.')
s('job_3_team', 'Biologie', 'Biology')
s('job_3', 'Biologie computationnelle', 'Computational biologist')
s('job_3n', 'Cartographier la biologie des maladies et choisir les cibles qui valent la peine.', 'Map disease biology and choose the targets worth pursuing.')
s('job_4_team', 'Partenariats', 'Partnerships')
s('job_4', 'Développement commercial, États-Unis', 'Business development lead, U.S.')
s('job_4n', 'Ouvrir les portes des partenaires pharmaceutiques et des investisseurs américains.', 'Open doors with U.S. pharma partners and investors.')
s('car_end_h2', 'Postulez maintenant pour résoudre l\'un des problèmes les plus urgents de la découverte de médicaments.', 'Apply now to solve one of the most urgent real-world problems in drug discovery.')
s('car_end_p', 'Aucun poste ne vous correspond ? Écrivez-nous quand même et dites-nous ce qui vous donne envie.', 'No role fits? Write to us anyway and tell us what excites you.')
s('car_end_cta', 'Postuler maintenant', 'Apply now')
s('mail_subject_apply', 'Candidature', 'Application')

# ------------------------------------------------------------------ divers
s('art_alt', 'Deux mains de marbre, sous l\'eau, se tendent l\'une vers l\'autre dans des rayons de lumière dorée.',
  'Two marble hands underwater reach toward each other through shafts of golden light.')
s('facts_label', 'Repères', 'Company facts')
s('tz_from', 'Sur le marché', 'On the market')
s('tz_to', 'Avec BlackPhage', 'With BlackPhage')
s('noscript_list', 'Activez JavaScript pour voir les programmes.', 'Turn on JavaScript to see the programs.')
s('noscript_prog', 'Activez JavaScript pour voir ce programme.', 'Turn on JavaScript to see this program.')
s('sec_updated', 'Mis à jour', 'Updated')
s('prog_count', 'programmes', 'programs')
