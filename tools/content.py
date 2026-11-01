"""Textes du site, en français et en anglais côte à côte (le bouton FR / EN les échange dans la page).
Chaque clé existe dans les deux langues, sinon la génération échoue.
Règle de rédaction : phrases courtes, ton affirmé, jamais de tiret long, de point-virgule ni de deux-points dans le texte visible."""

STR = {'fr': {}, 'en': {}}


def s(key, fr, en):
    assert key not in STR['en'], f'clé en double {key}'
    STR['fr'][key] = fr
    STR['en'][key] = en


# ------------------------------------------------------------------ communs
s('skip', 'Aller au contenu', 'Skip to content')
s('home_aria', 'BlackPhage, accueil', 'BlackPhage, home')
s('nav_main', 'Navigation principale', 'Main navigation')
s('nav_tech', 'Technologie', 'Technology')
s('nav_novadiff', 'NovaDiff', 'NovaDiff')
s('nav_science', 'Science', 'Science')
s('nav_articles', 'Articles', 'Articles')
s('nav_why', 'Pourquoi', 'Why')
s('nav_careers', 'Carrières', 'Careers')
s('nav_contact', 'Contact', 'Contact')
s('nav_menu', 'Ouvrir le menu', 'Open the menu')
s('nav_close', 'Fermer le menu', 'Close the menu')
s('menu_title', 'Menu', 'Menu')
s('lang_aria', 'Passer en anglais', 'Switch to French')
s('lang_hint', 'Traduire la page', 'Translate the page')
s('foot_tagline', 'Découvrir le futur de la médecine.', 'Discovering the future of medicine.')
s('foot_explore', 'Explorer', 'Explore')
s('foot_company', 'Société', 'Company')
s('foot_contact', 'Contact', 'Contact')
s('legal', 'Programmes expérimentaux, non approuvés par la FDA, l\'EMA ni aucune autre autorité. Les articles sont éducatifs et ne remplacent pas un avis médical.',
  'Investigational programs, not approved by the FDA, the EMA or any other regulator. Articles are educational and are not medical advice.')
s('rights', 'Tous droits réservés', 'All rights reserved')
s('cursor_view', 'Lire', 'Read')
s('cursor_open', 'Ouvrir', 'Open')
s('cursor_drag', 'Survoler', 'Hover')

# ------------------------------------------------------------------ accueil
s('home_title', 'BlackPhage', 'BlackPhage')
s('home_desc', 'BlackPhage conçoit des médicaments qui changent la vie des gens. Notre agent NovaDiff active sauve et reconçoit des candidats médicaments, du laboratoire à l\'impact concret.',
  'BlackPhage engineers medicine that changes people\'s lives. Our agent NovaDiff active rescues and redesigns drug candidates, from the lab to real-world impact.')
s('hero_badge', 'Drug rescue, propulsé par NovaDiff', 'Drug rescue, powered by NovaDiff')
s('hero_t1', 'Découvrir le', 'Discovering the')
s('hero_t2', 'futur', 'future')
s('hero_t3', 'de la médecine', 'of medicine')
s('hero_sub', 'Nous concevons des médicaments qui changent la vie des gens, et nous transformons la découverte en impact concret.',
  'We engineer medicine that changes people\'s lives, transforming discovery into real-world impact.')
s('hero_cta1', 'Découvrir NovaDiff', 'Meet NovaDiff')
s('hero_cta2', 'Lire nos articles', 'Read our articles')
s('hero_hint', 'Passez le curseur sur l\'agent', 'Move your cursor over the agent')
s('scroll', 'Défiler', 'Scroll')
s('agent_alt', 'Notre agent NovaDiff, un nuage de milliers de cubes gris qui change de forme au fil de la page. Passez le curseur dessus et il se dissocie.',
  'Our agent NovaDiff, a cloud of thousands of gray cubes that changes shape as you scroll. Move the cursor over it and it dissolves.')

# ------------------------------------------------------------------ ce que nous construisons
s('eng_eyebrow', 'Ce que nous construisons', 'What we build')
s('eng_title', 'Concevoir des médicaments qui changent des vies', 'Engineering medicines that change lives')
s('eng_lead', 'Une approche holistique, trois fronts, un seul agent.', 'One holistic approach, three fronts, one agent.')
s('eng1_tag', 'Métabolisme', 'Metabolism')
s('eng1_title', 'Santé métabolique', 'Metabolic health')
s('eng1_text', 'Une signalisation duale des incrétines par GLP-1R et GIPR, associée à une action anti-NCOA1 / SRC-1 et à la protection des cellules sous stress par Bax Inhibitor-1.',
  'Dual incretin signaling through GLP-1R and GIPR, paired with an anti-NCOA1 / SRC-1 action and protection of cells under stress through Bax Inhibitor-1.')
s('eng1_c1', 'GLP-1R / GIPR', 'GLP-1R / GIPR')
s('eng1_c2', 'Anti-NCOA1 / SRC-1', 'Anti-NCOA1 / SRC-1')
s('eng1_c3', 'Bax Inhibitor-1 / TMBIM6', 'Bax Inhibitor-1 / TMBIM6')
s('eng2_tag', 'Muscle', 'Muscle')
s('eng2_title', 'Anti-sarcopénie', 'Anti-sarcopenia')
s('eng2_text', 'Myostatine (GDF-8) et Activine A sont freinées par deux conceptions complémentaires. Le Sweeper élimine les ligands en circulation. Le Latent-Lock les garde verrouillés sous leur forme inactive.',
  'Myostatin (GDF-8) and Activin A are held back by two complementary designs. The Sweeper clears the circulating ligands. The Latent-Lock keeps them locked in their inactive form.')
s('eng2_c1', 'Myostatine (GDF-8) / Activine A', 'Myostatin (GDF-8) / Activin A')
s('eng2_c2', 'Sweeper', 'Sweeper')
s('eng2_c3', 'Latent-Lock', 'Latent-Lock')
s('eng3_tag', 'Inflammation', 'Inflammation')
s('eng3_title', 'Inflammation chronique', 'Chronic inflammation')
s('eng3_text', 'Le TNF alpha, un signal maître de l\'inflammation, est ciblé par un Smart Binder dépendant du pH pour l\'apaiser là où il le faut.',
  'TNF alpha, a master signal of inflammation, is targeted by a pH-dependent Smart Binder to calm it exactly where it matters.')
s('eng3_c1', 'TNF alpha', 'TNF alpha')
s('eng3_c2', 'Dépendant du pH', 'pH-dependent')
s('eng_note', 'Ensemble, une approche holistique du vieillissement en bonne santé.', 'Together, a holistic approach to healthy ageing.')

# ------------------------------------------------------------------ notre raison d'être
s('rescue_eyebrow', 'Notre raison d\'être', 'Our why')
s('rescue_title', 'Chaque médicament abandonné est une promesse qui attend d\'être tenue', 'Every shelved drug is a promise waiting to be kept')
s('rescue_p', 'BlackPhage est spécialisé en drug rescue. Trop de molécules prometteuses sont mises de côté, non parce qu\'elles ne fonctionnent pas, mais parce qu\'elles sont trop toxiques, trop brutes ou trop difficiles à doser. Nous croyons qu\'elles méritent une seconde chance. Avec NovaDiff active, nous comprenons pourquoi un candidat a calé, puis nous le reconcevons en Smart Binder plus fin, qui agit là où il le doit et épargne le reste. Pour les patients, pour les scientifiques qui ont consacré des années à ces idées, et pour les startups qui osent les reprendre.',
  'BlackPhage specializes in drug rescue. Too many promising molecules are set aside, not because they fail to work, but because they are too toxic, too blunt or too hard to dose. We believe they deserve a second chance. With NovaDiff active we study why a candidate stalled, then redesign it into a sharper Smart Binder that acts where it should and spares the rest. For patients, for the scientists who spent years on these ideas, and for the startups that dare to pick them back up.')
s('rescue_s1', 'Comprendre pourquoi il a calé', 'Understand why it stalled')
s('rescue_s2', 'Le reconcevoir en Smart Binder', 'Redesign it as a Smart Binder')
s('rescue_s3', 'Le ramener aux patients', 'Bring it back to patients')
s('culture_title', 'Là où la science rencontre l\'esprit startup', 'Where science meets the startup spirit')

# ------------------------------------------------------------------ NovaDiff
s('nova_eyebrow', 'Notre agent', 'Our agent')
s('nova_title', 'Découvrez NovaDiff', 'Meet NovaDiff')
s('nova_text', 'NovaDiff active est notre agent autonome, un modèle interne conçu spécialement pour repousser les frontières actuelles de la conception de médicaments. Ses objectifs sont la médecine personnalisée et une durée moyenne de vie en bonne santé au-delà de 100 ans.',
  'NovaDiff active is our in-house autonomous agent, a model designed specifically to push the current frontiers of drug design. Its goals are personalized medicine and an average healthy lifespan beyond 100 years.')
s('nova_text2', 'Il construit des Smart Binders, des protéines dépendantes du pH qui changent de conformation pour réduire la toxicité.',
  'It builds Smart Binders, pH-dependent proteins that change conformation to reduce toxicity.')
s('nova_f1', 'Il lit la biologie', 'It reads biology')
s('nova_f1n', 'À grande échelle, de la maladie jusqu\'à la cible.', 'At scale, from the disease down to the target.')
s('nova_f2', 'Il dessine, pas après pas', 'It designs, step by step')
s('nova_f2n', 'Des binders de plus en plus précis, tour après tour.', 'Binders that grow ever more precise, round after round.')
s('nova_f3', 'Il apprend de chaque tour', 'It learns from every round')
s('nova_f3n', 'Chaque résultat nourrit le suivant.', 'Every result feeds the next.')
s('nova_c1', 'Dépendant du pH', 'pH-dependent')
s('nova_c2', 'Moins toxique', 'Less toxic')
s('nova_c3', 'Plus précis', 'More precise')

# ------------------------------------------------------------------ le récepteur
s('story_eyebrow', 'Science', 'Science')
s('story_title', 'De petites structures. De grandes questions.', 'Small structures. Big questions.')
s('story_c1', 'Un récepteur attend un signal, ancré dans la membrane de la cellule.', 'A receptor waits for a signal, anchored in the cell membrane.')
s('story_c2', 'Au contact, NovaDiff change de forme. De cubes, il devient une protéine en ruban qui épouse la poche.', 'On contact, NovaDiff reshapes itself. From cubes it becomes a ribbon protein that fits the pocket.')
s('story_c3', 'Le récepteur s\'active. De l\'autre côté de la membrane, une cascade de signalisation démarre.', 'The receptor switches on. On the other side of the membrane, a signaling cascade begins.')
s('story_c4', 'Le signal poursuit sa route, vers celles et ceux qui construisent et qui soignent.', 'The signal carries on, toward the people who build and the people who care.')
s('story_step', 'Étape', 'Step')

# ------------------------------------------------------------------ articles
s('art_eyebrow', 'Blog', 'Blog')
s('art_title', 'Nos articles pour les startups et les gens', 'Our articles for startups & people')
s('art_lead', 'Des lectures courtes sur le drug rescue, la science et la création en biotechnologie.', 'Short reads on drug rescue, science and building in biotech.')
s('art_startups', 'Pour les startups', 'For startups')
s('art_people', 'Pour les gens', 'For people')
s('art_read', 'Lire l\'article', 'Read the article')
s('art_min', 'min de lecture', 'min read')
s('art_close', 'Fermer l\'article', 'Close the article')
s('art_note', 'Contenu éducatif, pas un avis médical.', 'Educational content, not medical advice.')
ARTICLES = [
    ('startups', 4,
     'Pourquoi de bons médicaments sont abandonnés, et comment les sauver', 'Why great drugs get shelved, and how to rescue them',
     'La toxicité, la dose et le calendrier font échouer plus de candidats que le manque d\'efficacité. Voici comment fonctionne le sauvetage.',
     'Toxicity, dosing and timing sink more candidates than a lack of efficacy. Here is how rescue works.',
     ['Un candidat médicament échoue rarement pour une seule raison. Beaucoup sont mis en pause à cause d\'effets indésirables à la dose nécessaire, d\'une formulation difficile, d\'un changement de stratégie ou d\'une coupe budgétaire. La molécule elle-même peut garder une vraie promesse.',
      'Le drug rescue commence par une autopsie soignée. Quelle cible était la bonne, quelle propriété posait problème, quels patients répondaient ? Une fois la cause claire, les ingénieurs reconçoivent le point faible, par exemple avec un binder dépendant du pH qui agit là où il le doit et épargne le reste.',
      'Pour une startup, un actif sauvé est une longueur d\'avance. La biologie est connue, les questions de sécurité sont cartographiées, et le travail se concentre sur la seule chose à corriger.'],
     ['A drug candidate rarely fails for a single reason. Many are paused because of side effects at the dose needed, a difficult formulation, a change in strategy or simply a budget cut. The molecule itself may still hold real promise.',
      'Drug rescue starts with a careful autopsy. Which target was right, which property was the problem, which patients responded? Once the cause is clear, engineers can redesign the weak point, for example with a pH-dependent binder that acts where it should and spares the rest.',
      'For a startup, a rescued asset is a head start. The biology is known, the safety questions are mapped, and the work focuses on the one thing to fix.']),
    ('startups', 3,
     'De l\'idée à la paillasse en 90 jours', 'From idea to lab bench in 90 days',
     'Un rythme concret pour les fondateurs qui ont besoin de premières données vite.',
     'A practical rhythm for founders who need first data fast.',
     ['La vitesse, en biotechnologie, ne veut pas dire bâcler. Elle veut dire choisir la plus petite expérience qui répond à la plus grande question.',
      'Commencez par écrire l\'unique affirmation que votre société doit prouver. Concevez ensuite une première étude autour d\'elle, sécurisez tôt les réactifs clés et décidez à l\'avance à quoi ressemblent un oui net et un non net.',
      'Quatre-vingt-dix jours suffisent pour apprendre quelque chose de réel, si chaque semaine se termine par une décision.'],
     ['Speed in biotech does not mean cutting corners. It means choosing the smallest experiment that answers the biggest question.',
      'Start by writing the one claim your company must prove. Then design a first study around it, secure the key reagents early and agree up front on what a clear yes and a clear no look like.',
      'Ninety days is enough to learn something real, as long as every week ends with a decision.']),
    ('startups', 3,
     'Cultiver une culture scientifique dans une startup qui va vite', 'Building a scientific culture inside a fast startup',
     'La rigueur et l\'urgence ne s\'opposent pas. Les meilleures équipes refusent de choisir.',
     'Rigor and urgency are not opposites. The best teams refuse to choose.',
     ['Les startups avancent vite et la science avance avec soin. Les meilleures équipes refusent de choisir.',
      'Elles écrivent leurs hypothèses avant de lancer les expériences, relisent leur travail ensemble, à voix haute, et fêtent un résultat négatif propre autant qu\'une victoire.',
      'Ce mélange d\'urgence et de rigueur est ce qui transforme un laboratoire en une société que les gens ont envie de rejoindre.'],
     ['Startups move fast and science moves carefully. The best teams refuse to choose.',
      'They write down hypotheses before running experiments, review each other\'s work openly and celebrate a clean negative result as much as a win.',
      'That mix of urgency and rigor is what turns a lab into a company people want to join.']),
    ('people', 4,
     'Qu\'est-ce qu\'un récepteur, et pourquoi est-ce important ?', 'What is a receptor, and why does it matter?',
     'Chaque cellule porte des milliers de minuscules antennes. Voici ce qu\'elles font.',
     'Every cell wears thousands of tiny antennas. Here is what they do.',
     ['Chaque cellule porte des milliers de minuscules antennes appelées récepteurs. Chacune attend un signal précis, comme une hormone, et transmet le message à l\'intérieur.',
      'Quand la bonne molécule se glisse dans la poche du récepteur, celui-ci change de forme. Ce petit mouvement déclenche une chaîne d\'événements, la cascade de signalisation, qui dit à la cellule quoi faire.',
      'De nombreux médicaments agissent en se glissant dans la poche d\'un récepteur. Concevoir un meilleur ajustement est l\'une des grandes questions de la médecine moderne.'],
     ['Every cell wears thousands of tiny antennas called receptors. Each one waits for a particular signal, such as a hormone, and passes the message inside.',
      'When the right molecule fits into the receptor\'s pocket, the receptor changes shape. That small movement starts a chain of events, the signaling cascade, that tells the cell what to do.',
      'Many medicines work by fitting into a receptor pocket. Designing a better fit is one of the central questions of modern medicine.']),
    ('people', 3,
     'Pourquoi certains médicaments ont des effets indésirables', 'Why some medicines come with side effects',
     'Un médicament voyage dans tout le corps, pas seulement là où il est utile.',
     'A medicine travels through the whole body, not only where it is needed.',
     ['Un médicament voyage dans tout le corps, pas seulement vers l\'endroit qui en a besoin. Si sa cible existe aussi ailleurs, l\'effet peut apparaître là aussi.',
      'Les scientifiques travaillent à rendre les médicaments plus sélectifs. Une idée consiste à construire des protéines qui ne s\'activent que dans le bon environnement chimique, par exemple là où l\'acidité est différente.',
      'Une meilleure sélectivité peut vouloir dire moins d\'effets indésirables et plus de personnes capables de poursuivre un traitement. Parlez toujours de votre propre traitement avec votre médecin.'],
     ['A medicine travels through the whole body, not only to the place that needs it. If its target also exists elsewhere, the effect can show up there too.',
      'Scientists work to make medicines more selective. One idea is to build proteins that switch on only in the right chemical environment, for example where the acidity is different.',
      'Better selectivity can mean fewer side effects and more people able to stay on a treatment. Always talk to your doctor about your own treatment.']),
    ('people', 3,
     'Des années en bonne santé, pas seulement plus d\'années', 'Healthy years, not just more years',
     'Vivre plus longtemps n\'est que la moitié de l\'histoire.',
     'Living longer is only half of the story.',
     ['Vivre plus longtemps n\'est que la moitié de l\'histoire. Ce que la plupart des gens veulent, ce sont plus d\'années de force, de clarté et d\'autonomie.',
      'Les chercheurs étudient les systèmes qui façonnent notre vieillissement, comme le métabolisme, le muscle et l\'inflammation chronique. S\'en occuper tôt peut aider à protéger les années en bonne santé.',
      'Chez BlackPhage, nous gardons un objectif en tête, repousser la durée moyenne de vie en bonne santé au-delà de 100 ans.'],
     ['Living longer is only half of the story. What most people want is more years of strength, clarity and independence.',
      'Researchers look at the systems that shape how we age, such as metabolism, muscle and chronic inflammation. Caring for them early may help protect healthy years.',
      'At BlackPhage we keep one goal in sight, to push the average healthy lifespan beyond 100 years.']),
]
for _i, (_aud, _min, _tfr, _ten, _xfr, _xen, _bfr, _ben) in enumerate(ARTICLES, 1):
    s(f'a{_i}_title', _tfr, _ten)
    s(f'a{_i}_ex', _xfr, _xen)
    for _j in range(3):
        s(f'a{_i}_p{_j + 1}', _bfr[_j], _ben[_j])

# ------------------------------------------------------------------ contact : la sphère
s('grid_eyebrow', 'Contact', 'Contact')
s('grid_title', 'D\'un seul cube à un monde entier', 'From one cube to a whole world')
s('grid_sub', 'Sauvons ensemble le prochain médicament.', 'Let\'s rescue the next drug together.')
s('grid_cubes', 'cubes', 'cubes')
s('grid_btn', 'Contact', 'Contact')
s('grid_hint', 'Continuez à défiler', 'Keep scrolling')
s('form_title', 'Dites bonjour', 'Say hello')
s('form_lead', 'Parlez-nous de ce que vous construisez ou de ce qui vous préoccupe. Nous répondons à tout le monde.', 'Tell us what you are building or what is on your mind. We answer everyone.')
s('form_last', 'Nom', 'Last name')
s('form_first', 'Prénom', 'First name')
s('form_activity', 'Activité', 'Activity')
s('form_pick', 'Choisir', 'Select')
s('form_a1', 'Startup ou fondateur', 'Startup or founder')
s('form_a2', 'Pharma ou biotech', 'Pharma or biotech')
s('form_a3', 'Investisseur', 'Investor')
s('form_a4', 'Recherche ou université', 'Research or academia')
s('form_a5', 'Clinicien', 'Clinician')
s('form_a6', 'Presse', 'Press')
s('form_a7', 'Patient ou aidant', 'Patient or caregiver')
s('form_a8', 'Autre', 'Other')
s('form_msg', 'Message', 'Message')
s('form_send', 'Envoyer le message', 'Send message')
s('form_close', 'Fermer', 'Close')
s('form_required', 'Merci de remplir ce champ', 'Please fill in this field')
s('form_ok_title', 'Merci, votre message est prêt', 'Thank you, your message is ready')
s('form_ok_text', 'Votre application de messagerie devrait s\'ouvrir. Sinon, copiez le message ci-dessous et envoyez-le à l\'adresse indiquée.', 'Your mail app should open. If it does not, copy the message below and send it to the address shown.')
s('form_copy', 'Copier le message', 'Copy the message')
s('form_copied', 'Copié', 'Copied')
s('form_mail_label', 'Adresse', 'Address')
s('form_subject', 'Message depuis le site BlackPhage', 'Message from the BlackPhage site')

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
    ('Propriété intellectuelle et affaires réglementaires', 'IP and regulatory affairs'),
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
# ------------------------------------------------------------------ le poste à la une : Serial Biotech Builder
s('sbb_eyebrow', 'Poste à la une', 'Featured role')
s('sbb_team', 'Direction scientifique', 'Scientific leadership')
s('sbb_title', 'Serial Biotech Builder', 'Serial Biotech Builder')
s('sbb_lead',
  'Nous recherchons un Serial Biotech Builder confirmé, qui sera le garant scientifique de BlackPhage et qui maximisera la valeur de chaque licence que nous signons. Vous avez déjà bâti des sociétés de biotechnologie, mené des actifs jusqu\'à la preuve de concept in vivo puis jusqu\'à un accord, et vous savez exactement ce qu\'un acheteur demande ensuite. Vous travaillerez main dans la main avec nos fondateurs, nos scientifiques et NovaDiff active, et vous défendrez notre science face aux partenaires pharmaceutiques et aux investisseurs.',
  'We are looking for an accomplished Serial Biotech Builder to be the scientific guarantor of BlackPhage and to maximize the value of every license we sign. You have built biotech companies before, taken assets through in vivo proof of concept and into a deal, and you know exactly what a buyer asks for next. You will work hand in hand with our founders, our scientists and NovaDiff active, and you will stand behind our science in front of pharma partners and investors.')
s('sbb_m1_k', 'Société', 'Company'); s('sbb_m1_v', 'BlackPhage, société privée', 'BlackPhage, private company')
s('sbb_m2_k', 'Lieu', 'Location'); s('sbb_m2_v', 'France ou à distance, avec des déplacements internationaux ponctuels', 'France or remote, with periodic international travel')
s('sbb_m3_k', 'Langues', 'Languages'); s('sbb_m3_v', 'Français et anglais courants', 'Fluent French and English')
s('sbb_m4_k', 'Axes', 'Focus'); s('sbb_m4_v', 'Crédibilité scientifique, stratégie de licence, drug rescue, création de sociétés', 'Scientific credibility, licensing strategy, drug rescue, company building')
SBB = [
    ('Garant scientifique', 'Scientific guarantor', [
        ('Questionner et valider chaque conception, chaque jeu de données et chaque affirmation avant qu\'ils ne quittent la société, pour que notre science reste rigoureuse et ne promette jamais trop.',
         'Challenge and validate every design, dataset and claim before it leaves the company, so our science stays rigorous and never over-promises.'),
        ('Relire la feuille de route scientifique de chaque programme de drug rescue, du choix de la cible aux études in vivo, et décider avec l\'équipe de ce qu\'il faut tester ensuite.',
         'Review the scientific road map of each drug rescue program, from target choice to in vivo studies, and decide with the team what to test next.'),
        ('Incarner la voix scientifique crédible de BlackPhage auprès des collaborateurs académiques, des partenaires et des investisseurs.',
         'Be the credible scientific voice of BlackPhage with academic collaborators, partners and investors.')]),
    ('Licence et valeur', 'Licensing and value', [
        ('Construire la stratégie de licence de chaque actif, du bon partenaire au bon moment jusqu\'à la structure de l\'accord.',
         'Build the licensing strategy of each asset, from the right partner and the right moment to the structure of the deal.'),
        ('Préparer la salle de données et le récit qui l\'accompagne, puis mener la négociation pour maximiser le paiement initial, les étapes et les redevances.',
         'Prepare the data room and the story that goes with it, then lead the negotiation to maximize upfront payments, milestones and royalties.'),
        ('Travailler avec les fondateurs sur les levées de fonds et sur les partenariats stratégiques qui augmentent la valeur du portefeuille.',
         'Work with the founders on financing rounds and on strategic partnerships that raise the value of the portfolio.')]),
    ('Prêt pour la vente après l\'in vivo', 'Ready for a sale after in vivo', [
        ('Connaître et appliquer les exigences d\'une vente ou d\'une licence une fois la preuve de concept in vivo acquise, comme une efficacité reproductible dans des modèles pertinents, la relation dose réponse, l\'exposition et la tolérance, une voie de fabrication crédible, la propriété claire de l\'actif et un parcours réglementaire défini.',
         'Know and apply the requirements of a sale or license once in vivo proof of concept is in hand, such as reproducible efficacy in relevant models, dose response, exposure and tolerability, a credible manufacturing path, clear ownership of the asset and a defined regulatory route.'),
        ('Traduire ces exigences en un plan d\'études et d\'étapes que l\'équipe peut mener, et garder ce plan honnête sur les points faibles.',
         'Turn these requirements into a plan of studies and milestones that the team can execute, and keep that plan honest about gaps.'),
        ('Défendre l\'actif lors de l\'audit préalable (due diligence) et répondre aux questions les plus dures des équipes de développement commercial, scientifiques et juridiques des laboratoires.',
         'Defend the asset in due diligence and answer the hardest questions from pharma business development, scientific and legal teams.')]),
    ('Création de sociétés et partenariats', 'Company building and partnerships', [
        ('Aider à façonner de nouvelles sociétés autour de médicaments sauvés, avec le récit, la stratégie, la constitution de l\'équipe et les premières opérations.',
         'Help shape new ventures around rescued drugs, with narrative, business strategy, team building and early operations.'),
        ('Accompagner les scientifiques et les fondateurs dans leur passage de la recherche à la création de société.',
         'Mentor scientists and founders as they move from research to company formation.'),
        ('Bâtir des relations durables avec les équipes pharmaceutiques, les institutions académiques, les CRO et les investisseurs, et représenter BlackPhage lors des conférences et des rencontres avec les partenaires.',
         'Build lasting relationships with pharma teams, academic institutions, CROs and investors, and represent BlackPhage at conferences and partner meetings.')]),
    ('Profil recherché', 'Qualifications', [
        ('Doctorat dans un domaine pertinent, comme la biologie moléculaire, l\'ingénierie des protéines, la pharmacologie, l\'immunologie ou la bio-ingénierie.',
         'PhD in a relevant field such as molecular biology, protein engineering, pharmacology, immunology or bioengineering.'),
        ('Une grande profondeur technique, alliée à une large compréhension de la science translationnelle et du développement du médicament.',
         'Strong technical depth combined with a broad understanding of translational science and drug development.'),
        ('Entrepreneur serial en biotechnologie, avec un parcours de création, de construction et de financement de sociétés.',
         'Serial biotech entrepreneur with a record of founding, building and funding companies.'),
        ('Des programmes menés avec succès du concept aux études in vivo, puis jusqu\'à une licence ou une vente.',
         'Demonstrated success taking programs from concept through in vivo studies to a license or a sale.'),
        ('Une connaissance concrète de ce que les acheteurs, les licenciés et les investisseurs exigent après la preuve de concept in vivo, et la capacité de le défendre lors d\'un audit préalable.',
         'Hands-on knowledge of what buyers, licensees and investors require after in vivo proof of concept, and the ability to defend it under due diligence.')]),
    ('Réseau et partenariats', 'Partnership and network strength', [
        ('De larges relations dans l\'industrie pharmaceutique, les biotechnologies, le monde académique et la communauté mondiale du capital risque.',
         'Extensive relationships across pharma, biotech, academia and the global venture community.'),
        ('Une capacité démontrée à établir et à faire grandir des partenariats scientifiques et commerciaux de grande valeur.',
         'Demonstrated ability to establish and grow high-value scientific and commercial partnerships.')]),
    ('Ce que nous offrons', 'What we offer', [
        ('Un rôle de direction au cœur d\'une société de drug rescue propulsée par un agent de conception autonome.',
         'A leadership role at the heart of a drug rescue company powered by an autonomous design agent.'),
        ('Une influence directe sur la stratégie de licence et sur la crédibilité scientifique de chaque programme.',
         'Direct influence on the licensing strategy and on the scientific credibility of every program.'),
        ('L\'accès à un réseau mondial de partenaires et de conseillers, et la rare occasion de construire dès les premiers stades.',
         'Access to a global network of partners and advisors, and the rare chance to build at the earliest stage.'),
        ('Un package qui associe un salaire et une participation au capital, à définir ensemble.',
         'A package that combines a salary and an equity stake, to be discussed together.')]),
]
for k, (h_fr, h_en, items) in enumerate(SBB, 1):
    s(f'sbb_s{k}_h', h_fr, h_en)
    for j, (b_fr, b_en) in enumerate(items, 1):
        s(f'sbb_s{k}_{j}', b_fr, b_en)
s('car_end_p', 'Aucun poste ne vous correspond ? Écrivez-nous quand même et dites-nous ce qui vous donne envie.', 'No role fits? Write to us anyway and tell us what excites you.')
s('car_end_cta', 'Postuler maintenant', 'Apply now')


s('c_back', 'Retour à l\'accueil', 'Back to home')
s('copy_mail', 'Copier', 'Copy')
s('copied', 'Copié', 'Copied')
s('copy_label', 'Copier l\'adresse', 'Copy the address')
s('mail_subject_apply', 'Candidature', 'Application')
