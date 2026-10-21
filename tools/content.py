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
s('nav_tech', 'Notre technologie', 'Our tech')
s('nav_careers', 'Carrières', 'Careers')
s('nav_partner', 'Devenir partenaire', 'Partner with us')
s('nav_menu', 'Ouvrir le menu', 'Open the menu')
s('nav_main', 'Navigation principale', 'Main navigation')
s('home_aria', 'BlackPhage, accueil', 'BlackPhage, home')
s('lang_switch_label', 'Switch to English', 'Passer en français')
s('skip', 'Aller au contenu', 'Skip to content')
s('foot_tagline', 'Repousser la frontière du traitable.', 'Push the frontier of the treatable.')
s('foot_company', 'Société', 'Company')
s('foot_who', 'Qui sommes-nous', 'Who we are')
s('foot_tech', 'Technologie', 'Technology')
s('foot_contact', 'Contact', 'Contact')
s('legal', 'Programmes expérimentaux, non approuvés par la FDA, l\'EMA ni aucune autre autorité.',
  'Investigational programs, not approved by the FDA, the EMA or any other regulator.')
s('rights', 'Tous droits réservés', 'All rights reserved')
s('cta_tech', 'Découvrir notre technologie', 'Explore our tech')
s('cta_partner', 'Devenir partenaire', 'Partner with us')

# ------------------------------------------------------------------ accueil
s('home_title', 'BlackPhage', 'BlackPhage')
s('home_desc', 'NovaDiff active, notre agent autonome, est conçu spécialement pour la construction de Smart Binders. Des protéines dépendantes du pH, plus précises et moins toxiques.',
  'NovaDiff active, our autonomous agent, is designed specifically to build Smart Binders. pH-dependent proteins, sharper and less toxic.')
s('home_h1_a', 'Repousser la', 'Push the')
s('home_h1_b', 'frontière', 'frontier')
s('home_h1_c', 'du traitable.', 'of the treatable.')
s('home_lead', 'Notre agent NovaDiff active est conçu spécialement pour la construction de Smart Binders. Des protéines dépendantes du pH, plus précises et moins toxiques.',
  'Our agent NovaDiff active is designed specifically to build Smart Binders. pH-dependent proteins, sharper and less toxic.')

s('who_eyebrow', 'Qui sommes-nous', 'Who we are')
s('who_p', 'BlackPhage est une société de biotechnologie privée. Notre agent autonome, NovaDiff active, est un modèle interne conçu spécialement pour repousser les frontières actuelles de la conception de médicaments, avec pour objectifs la médecine personnalisée et une durée moyenne de vie en bonne santé repoussée au-delà de 100 ans.',
  'BlackPhage is a private biotechnology company. Our autonomous agent, NovaDiff active, is an in-house model designed specifically to push the current frontiers of drug design, with the goals of personalized medicine and an average healthy lifespan pushed beyond 100 years.')

s('idea_eyebrow', 'L\'idée', 'The idea')
s('idea_1', 'Comprendre le vivant.', 'Understand life.')
s('idea_1n', 'Notre agent lit la biologie à grande échelle.', 'Our agent reads biology at scale.')
s('idea_2', 'Concevoir l\'intervention.', 'Design the intervention.')
s('idea_2n', 'Il dessine, évalue et affine de nouvelles protéines.', 'It drafts, scores and refines new proteins.')
s('idea_3', 'Reprendre le contrôle.', 'Take back control.')
s('idea_3n', 'Chaque variante agit là où elle le doit, et nulle part ailleurs.', 'Every variant acts where it should, and nowhere else.')

s('nova_eyebrow', 'Notre modèle Frontier', 'Our Frontier model')
s('nova_h2', 'NovaDiff active.', 'NovaDiff active.')
s('nova_lead', 'Un agent autonome pour les médicaments biologiques de nouvelle génération. Il permet de repousser les limites du traitable.',
  'An autonomous agent for next-generation biologics. It lets us push the limits of the treatable.')
s('step_1', 'Lire', 'Read')
s('step_1n', 'Il cartographie la biologie de la maladie et de la cible.', 'It maps the disease biology and the target.')
s('step_2', 'Concevoir', 'Design')
s('step_2n', 'Il dessine des Smart Binders à partir de zéro.', 'It drafts Smart Binders from scratch.')
s('step_3', 'Juger', 'Judge')
s('step_3n', 'Il note chaque candidat sur la précision et la sécurité.', 'It scores each candidate for precision and safety.')
s('step_4', 'Apprendre', 'Learn')
s('step_4n', 'Il réinjecte chaque résultat dans le tour suivant.', 'It feeds every result into the next round.')

s('class_eyebrow', 'Smart Binders', 'Smart Binders')
s('class_h2', 'Une nouvelle classe de médicaments.', 'A new class of medicine.')
s('class_lead', 'NovaDiff active construit des Smart Binders. Ce sont des protéines dépendantes du pH, qui changent de conformation pour réduire la toxicité.',
  'NovaDiff active builds Smart Binders. They are pH-dependent proteins that change conformation to reduce toxicity.')
s('pillar_1', 'Dépendant du pH', 'pH-dependent')
s('pillar_1n', 'S\'active là où le pH local le permet.', 'Switches on where the local pH calls for it.')
s('pillar_2', 'Change de conformation', 'Changes conformation')
s('pillar_2n', 'Elle se replie selon son milieu pour agir au bon endroit.', 'It refolds with its surroundings to act in the right place.')
s('pillar_3', 'Moins toxique', 'Less toxic')
s('pillar_3n', 'Pensé dès l\'origine pour un profil de toxicité plus bas.', 'Designed from the start for a lower toxicity profile.')

s('tg_eyebrow', 'Nos cibles', 'Our targets')
s('tg_h2', 'Trois cibles. Un seul agent.', 'Three targets. One agent.')
s('tg_lead', 'Métabolisme, muscle et cerveau. Trois systèmes qui comptent pour bien vieillir.', 'Metabolism, muscle and brain. Three systems that matter for healthy aging.')
s('tg_more', 'Applications potentielles', 'Potential applications')
s('tg_go', 'En savoir plus', 'Learn more')

s('end_h2', 'La frontière est ouverte.', 'The frontier is open.')
s('end_p', 'Nous parlons aux partenaires pharmaceutiques, aux investisseurs et à la presse, partout dans le monde.', 'We speak with pharma partners, investors and press, around the world.')

# ------------------------------------------------------------------ notre technologie
s('tech_title', 'Notre technologie', 'Our tech')
s('tech_desc', 'NovaDiff active, notre agent autonome, construit des Smart Binders dépendants du pH. Trois cibles, GLP-1R, myostatine et TfR1.',
  'NovaDiff active, our autonomous agent, builds pH-dependent Smart Binders. Three targets, GLP-1R, myostatin and TfR1.')
s('tech_eyebrow', 'Notre technologie', 'Our tech')
s('tech_h1', 'Une technologie pour repousser les limites du traitable.', 'Technology built to push the limits of the treatable.')
s('tech_lead', 'Notre agent NovaDiff active est conçu spécialement pour la construction de Smart Binders. Des protéines dépendantes du pH, plus précises et moins toxiques.',
  'Our agent NovaDiff active is designed specifically to build Smart Binders. pH-dependent proteins, sharper and less toxic.')
s('agent_eyebrow', 'NovaDiff active', 'NovaDiff active')
s('agent_h2', 'Pas après pas.', 'Step by step.')
s('agent_lead', 'Notre agent dessine des binders de plus en plus précis. Il lit la biologie, propose, juge, puis apprend de chaque résultat pour viser mieux au tour suivant.',
  'Our agent draws binders that grow ever more precise. It reads the biology, proposes, judges, then learns from every result to aim better in the next round.')
s('sb_eyebrow', 'Smart Binders', 'Smart Binders')
s('sb_h2', 'Une protéine qui s\'adapte à son milieu.', 'A protein that adapts to its surroundings.')
s('targets_eyebrow', 'Nos cibles', 'Our targets')
s('targets_h2', 'Trois cibles et leurs applications potentielles.', 'Three targets and their potential applications.')
s('targets_lead', 'Chaque cible a sa biologie et son besoin médical. Notre agent construit pour chacune un Smart Binder dépendant du pH.',
  'Each target has its own biology and its own medical need. Our agent builds a pH-dependent Smart Binder for each one.')
s('t_apps', 'Applications potentielles', 'Potential applications')
s('t_approach', 'Notre approche', 'Our approach')
s('t_view', 'Voir le programme', 'View the program')
s('goal_eyebrow', 'Notre objectif', 'Our goal')
s('goal_h2', 'Au-delà de 100 ans en bonne santé.', 'Beyond 100 healthy years.')
s('goal_p', 'Le métabolisme, le muscle et le cerveau comptent parmi les systèmes qui pèsent le plus sur la façon dont on vieillit. Chacune de nos cibles agit sur l\'un d\'eux. Notre objectif est de repousser la durée moyenne de vie en bonne santé au-delà de 100 ans.',
  'Metabolism, muscle and brain are among the systems that weigh most on how we age. Each of our targets acts on one of them. Our goal is to push the average healthy lifespan beyond 100 years.')
s('tech_note', 'Les applications décrites sont des objectifs de recherche. Elles ne sont pas des allégations de sécurité ou d\'efficacité. Programmes expérimentaux, non approuvés par la FDA, l\'EMA ni aucune autre autorité.',
  'The applications described are research goals. They are not claims of safety or efficacy. Investigational programs, not approved by the FDA, the EMA or any other regulator.')

# ------------------------------------------------------------------ programme
s('prog_title', 'Programme', 'Program')
s('prog_desc', 'Un programme BlackPhage en détail. Les limites des traitements actuels et notre réponse.', 'A BlackPhage program in detail. The limits of today\'s drugs and our answer.')

# ------------------------------------------------------------------ à propos, fusionné dans l'accueil
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
s('how_3', 'Privé par défaut. Public quand c\'est prêt.', 'Private by default. Public when ready.')
s('contact_eyebrow', 'Contact', 'Contact')
s('contact_h2', 'Devenir partenaire.', 'Partner with us.')
s('contact_p', 'Dites-nous ce que vous construisez. Nous répondons aux partenaires pharmaceutiques, aux investisseurs et à la presse, partout dans le monde.',
  'Tell us what you are building. We answer pharma partners, investors and press, around the world.')
s('contact_partners', 'Partenaires et investisseurs', 'Partners and investors')
s('contact_press', 'Presse', 'Press')
s('contact_careers', 'Recrutement', 'Hiring')

# ------------------------------------------------------------------ carrières
s('car_title', 'Carrières', 'Careers')
s('car_desc', 'Rejoignez BlackPhage et aidez à concevoir une nouvelle classe de médicaments protéiques.', 'Join BlackPhage and help design a new class of protein medicines.')
s('car_eyebrow', 'Carrières', 'Careers')
s('car_h1', 'Un impact qui change le monde naît d\'une culture pensée pour l\'innovation.', 'World-changing impact starts with a culture built for innovation.')
s('car_lead', 'Chez BlackPhage, nous construisons NovaDiff active, un agent autonome qui conçoit de nouveaux médicaments. Notre équipe réunit biologie, apprentissage automatique et ingénierie, avec une même envie de repousser la frontière du traitable.',
  'At BlackPhage, we build NovaDiff active, an autonomous agent that designs new medicines. Our team brings together biology, machine learning and engineering, with one shared drive to move the frontier of the treatable.')
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
s('job_4', 'Développement commercial, international', 'Business development lead, international')
s('job_4n', 'Ouvrir les portes des partenaires pharmaceutiques et des investisseurs, partout dans le monde.', 'Open doors with pharma partners and investors around the world.')
s('car_end_h2', 'Postulez maintenant pour résoudre l\'un des problèmes les plus urgents de la découverte de médicaments.', 'Apply now to solve one of the most urgent real-world problems in drug discovery.')
s('car_end_p', 'Aucun poste ne vous correspond ? Écrivez-nous quand même et dites-nous ce qui vous donne envie.', 'No role fits? Write to us anyway and tell us what excites you.')
s('car_end_cta', 'Postuler maintenant', 'Apply now')
s('mail_subject_apply', 'Candidature', 'Application')

# ------------------------------------------------------------------ divers
s('art_alt', 'Un poisson combattant translucide, couvert de vagues de lumière, nage à travers un monde de molécules, avec de l\'ADN, des protéines, une membrane et son récepteur. Il avance quand vous descendez la page. Touchez-le et une vague de lumière parcourt son corps.',
  'A translucent fighting fish, covered in waves of light, swims through a world of molecules, with DNA, proteins, a membrane and its receptor. It moves forward as you scroll down the page. Touch it and a wave of light runs across its body.')
s('noscript_prog', 'Activez JavaScript pour voir ce programme.', 'Turn on JavaScript to see this program.')

s('fish_touch', 'Toucher le poisson', 'Touch the fish')
s('brand_eyebrow', 'Identité', 'Identity')
s('brand_h2', 'Nos logos.', 'Our logos.')
s('brand_p', 'Pour la presse et les partenaires. Le logo blanc va sur les fonds sombres, le logo noir sur les fonds clairs.', 'For press and partners. Use the white logo on dark backgrounds and the black logo on light ones.')
s('brand_white', 'Logo blanc, SVG', 'White logo, SVG')
s('brand_black', 'Logo noir, SVG', 'Black logo, SVG')
