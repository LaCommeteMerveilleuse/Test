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
s('nav_novadiff', 'NovaDiff', 'NovaDiff')
s('nav_science', 'Science', 'Science')
s('nav_articles', 'Articles', 'Articles')
s('art_prev', 'Articles précédents', 'Previous articles')
s('art_next', 'Articles suivants', 'Next articles')
s('art_list', 'Nos articles', 'Our articles')
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

# ------------------------------------------------------------------ accueil
s('home_title', 'BlackPhage', 'BlackPhage')
s('home_desc', 'BlackPhage conçoit des médicaments qui changent la vie des gens. Notre agent NovaDiff sauve et reconçoit des candidats médicaments, du laboratoire à l\'impact concret.',
  'BlackPhage engineers medicine that changes people\'s lives. Our agent NovaDiff rescues and redesigns drug candidates, from the lab to real-world impact.')
s('hero_t1', 'Découvrir le', 'Discovering the')
s('hero_t2', 'futur', 'future')
s('hero_t3', 'de la médecine', 'of medicine')
s('hero_sub', 'Nous concevons des médicaments qui changent la vie des gens, et nous transformons la découverte en impact concret.',
  'We engineer medicine that changes people\'s lives, transforming discovery into real-world impact.')
s('hero_cta1', 'Découvrir NovaDiff', 'Meet NovaDiff')
s('hero_cta2', 'Lire nos articles', 'Read our articles')
s('scroll', 'Défiler', 'Scroll')
s('brain_alt', 'Un cerveau entièrement transparent dont on ne voit que les neurones et leurs connexions, où l\'influx nerveux saute de neurone en neurone.',
  'A fully transparent brain where only the neurons and their connections show, with the nerve impulse jumping from neuron to neuron.')
s('robot_alt', 'NovaDiff, notre agent, un petit robot blanc aux yeux ambrés qui salue d\'une main. Un clic le fait tourner sur lui-même.',
  'NovaDiff, our agent, a small white robot with amber eyes that waves with one hand. Click it and it spins around.')

# ------------------------------------------------------------------ ce que nous construisons

# ------------------------------------------------------------------ notre raison d'être
s('rescue_eyebrow', 'Notre raison d\'être', 'Our why')
s('rescue_title', 'Chaque médicament abandonné est une promesse qui attend d\'être tenue', 'Every shelved drug is a promise waiting to be kept')
s('rescue_p', 'BlackPhage est spécialisé en drug rescue. Trop de molécules prometteuses sont mises de côté, non parce qu\'elles ne fonctionnent pas, mais parce qu\'elles sont trop toxiques, trop brutes ou trop difficiles à doser. Nous croyons qu\'elles méritent une seconde chance. Avec NovaDiff, nous comprenons pourquoi un candidat a calé, puis nous le reconcevons en Smart Binder plus fin, qui agit là où il le doit et épargne le reste. Pour les patients, pour les scientifiques qui ont consacré des années à ces idées, et pour nous, qui osons les reprendre.',
  'BlackPhage specializes in drug rescue. Too many promising molecules are set aside, not because they fail to work, but because they are too toxic, too blunt or too hard to dose. We believe they deserve a second chance. With NovaDiff we study why a candidate stalled, then redesign it into a sharper Smart Binder that acts where it should and spares the rest. For patients, for the scientists who spent years on these ideas, and for us, who dare to pick them back up.')
s('rescue_s1', 'Comprendre pourquoi il a calé', 'Understand why it stalled')
s('rescue_s2', 'Le reconcevoir en Smart Binder', 'Redesign it as a Smart Binder')
s('rescue_s3', 'Le ramener aux patients', 'Bring it back to patients')
s('prog_title', 'Programmes actuels', 'Current programs')
for i, (fr, en) in enumerate([
    ('GLP-1R / GIPR', 'GLP-1R / GIPR'),
    ('Myostatine / Activine A', 'Myostatin / Activin A'),
    ('TNF alpha', 'TNF alpha'),
    ('Oncologie, cibles intracellulaires (programmes propriétaires)', 'Oncology, intracellular targets (proprietary programs)'),
], 1):
    s(f'prog_{i}', fr, en)
s('culture_title', 'Là où la science rencontre l\'esprit startup', 'Where science meets the startup spirit')

# ------------------------------------------------------------------ NovaDiff
s('nova_eyebrow', 'Notre agent', 'Our agent')
s('nova_title', 'Découvrez NovaDiff', 'Meet NovaDiff')
s('nova_text', 'NovaDiff est notre agent autonome, un modèle interne conçu spécialement pour repousser les frontières actuelles de la conception de médicaments. Ses objectifs sont la médecine personnalisée et l\'allongement de l\'espérance de vie en bonne santé.',
  'NovaDiff is our in-house autonomous agent, a model designed specifically to push the current frontiers of drug design. Its goals are personalized medicine and extending healthy life expectancy.')
s('nova_text2', 'Il construit des Smart Binders, des protéines sensibles au micro-environnement biologique, conçues pour agir uniquement là où la maladie est active et épargner les tissus sains.',
  'It builds Smart Binders, proteins sensitive to the biological microenvironment, designed to act only where the disease is active and spare healthy tissue.')
s('nova_f1', 'Il lit la biologie', 'It reads biology')
s('nova_f1n', 'À grande échelle, de la maladie jusqu\'à la cible.', 'At scale, from the disease down to the target.')
s('nova_f2', 'Il dessine, pas après pas', 'It designs, step by step')
s('nova_f2n', 'Des binders de plus en plus précis, tour après tour.', 'Binders that grow ever more precise, round after round.')
s('nova_f3', 'Il apprend de chaque tour', 'It learns from every round')
s('nova_f3n', 'Chaque résultat nourrit le suivant.', 'Every result feeds the next.')
s('nova_c1', 'Sensible au micro-environnement', 'Microenvironment-aware')
s('nova_c2', 'Moins toxique', 'Less toxic')
s('nova_c3', 'Plus précis', 'More precise')

# ------------------------------------------------------------------ le récepteur
s('story_eyebrow', 'Science', 'Science')
s('story_title', 'De petites structures. De grandes questions.', 'Small structures. Big questions.')
s('story_lead', 'Concevoir une protéine pour une cible, c\'est fabriquer la bonne clé pour la bonne serrure et répondre à une question biologique.',
  'Designing a protein for a target means building the right key for the right lock, to answer a biological question.')
s('story_s1t', 'Choisir une cible', 'Pick a target')
s('story_s1', 'Une protéine cible commande une voie biologique, une chaîne de signaux qui dit à la cellule quoi faire.',
  'A target protein commands a biological pathway, a chain of signals that tells the cell what to do.')
s('story_s2t', 'Générer par diffusion', 'Generate by diffusion')
s('story_s2', 'Notre agent part du bruit et façonne une protéine en 3D pas à pas, comme un sculpteur qui révèle une forme, jusqu\'à épouser la cible.',
  'Our agent starts from noise and shapes a 3D protein step by step, like a sculptor revealing a form, until it fits the target.')
s('story_s3t', 'Optimiser en temps réel', 'Optimize in real time')
s('story_s3', 'Il affine la structure en continu et vérifie qu\'elle se replie, reste stable et se fixe fermement, jusqu\'à être biophysiquement optimisée.',
  'It keeps refining the structure and checks that it folds, stays stable and binds tightly, until it is biophysically optimized.')
s('story_s4t', 'Activer ou inhiber la voie', 'Turn the pathway on or off')
s('story_s4', 'Fixée à sa cible, la protéine l\'active, comme une clé qui tourne, ou la bloque. La voie s\'accélère ou s\'arrête, comme voulu.',
  'Bound to its target, the protein either activates it, like a key turning, or blocks it. The pathway speeds up or stops, as designed.')

# ------------------------------------------------------------------ articles
s('art_eyebrow', 'Blog', 'Blog')
s('art_title', 'Nos articles', 'Our articles')
s('art_read', 'Lire l\'article', 'Read the article')
s('art_min', 'min de lecture', 'min read')
s('art_close', 'Fermer l\'article', 'Close the article')
s('art_note', 'Contenu éducatif, pas un avis médical.', 'Educational content, not medical advice.')
ARTICLES = [
    # (rubrique fr/en, minutes, titre fr, titre en, chapô fr, chapô en, [5 paragraphes fr], [5 paragraphes en])
    (('Portrait', 'Profile'), 3,
     'Toronto, 1922. Le garçon qui ne devait pas survivre', 'Toronto, 1922. The boy who was not supposed to live',
     'Un jeune chirurgien sans laboratoire, un étudiant, et une protéine qui allait changer la médecine.',
     'A young surgeon with no laboratory, a student, and a protein that was about to change medicine.',
     ['Au Toronto General Hospital, en janvier 1922, Leonard Thompson a quatorze ans et pèse à peine trente kilos. Atteint de diabète de type 1, il est condamné. À l\'époque, les médecins n\'ont à offrir que des régimes de famine, et la maladie emporte les enfants en quelques mois.',
      'L\'espoir vient de Frederick Banting, un chirurgien canadien peu connu qui, l\'été précédent, a obtenu un modeste coin de laboratoire à l\'université de Toronto, dix chiens et un jeune assistant, Charles Best. Ensemble, ils isolent dans le pancréas une hormone qui règle le sucre dans le sang, l\'insuline.',
      'La première injection est décevante, l\'extrait est trop impur. Le biochimiste James Collip purifie alors la préparation. Le 23 janvier, une nouvelle dose est administrée et la glycémie du garçon retombe vers la normale. Il reprend des forces, et l\'on comprend que quelque chose d\'immense vient d\'arriver.',
      'Banting et Best cèdent leur brevet à l\'université pour un dollar symbolique, afin que personne ne s\'enrichisse sur la souffrance des malades. En 1923, Banting reçoit le prix Nobel de médecine à 32 ans, le plus jeune lauréat de la discipline, et partage sa part avec Best.',
      'Leonard Thompson vivra encore treize ans. L\'insuline est le premier grand médicament issu d\'une protéine du corps humain, et son histoire pose déjà la question qui est la nôtre un siècle plus tard. Comment concevoir, avec précision, une protéine qui parle à la bonne cible ?'],
     ['At Toronto General Hospital, in January 1922, Leonard Thompson is fourteen and weighs barely sixty-five pounds. He has type 1 diabetes, and he is doomed. Doctors of the day have nothing to offer but starvation diets, and the disease takes children within months.',
      'Hope comes from Frederick Banting, a little-known Canadian surgeon who, the summer before, was lent a modest corner of a University of Toronto laboratory, ten dogs and a young assistant, Charles Best. Together they isolate, from the pancreas, a hormone that governs blood sugar. It is called insulin.',
      'The first injection disappoints, the extract is too impure. The biochemist James Collip then purifies the preparation. On January 23 a new dose is given and the boy\'s blood sugar falls back toward normal. He regains strength, and everyone understands that something immense has just happened.',
      'Banting and Best sell their patent to the university for one symbolic dollar, so that no one grows rich on the suffering of the sick. In 1923 Banting receives the Nobel Prize in Medicine at 32, the youngest laureate in the field, and shares his prize money with Best.',
      'Leonard Thompson will live another thirteen years. Insulin is the first great medicine made from a protein of the human body, and its story already raises the question that is ours a century later. How do you design, with precision, a protein that speaks to the right target?']),
    (('Les chiffres', 'By the numbers'), 3,
     'Dix ans, des milliards et neuf échecs sur dix', 'Ten years, billions, and nine failures out of ten',
     'Derrière chaque médicament approuvé, une montagne de projets abandonnés. Les chiffres du drug design donnent le vertige.',
     'Behind every approved medicine, a mountain of abandoned projects. The numbers of drug design are dizzying.',
     ['Mettre un nouveau médicament sur le marché prend en moyenne dix à quinze ans. Selon les estimations les plus citées, la facture dépasse deux milliards de dollars une fois comptés tous les échecs qui précèdent la réussite.',
      'Le chiffre le plus brutal tient en une phrase. Environ neuf candidats sur dix qui entrent en essais cliniques ne seront jamais approuvés. Les analyses publiées ces dernières années désignent trois grands coupables, le manque d\'efficacité chez l\'humain, une toxicité impossible à maîtriser, et des propriétés mal adaptées, comme la dose ou la façon de circuler dans l\'organisme.',
      'La matière première, pourtant, ne manque pas. On estime à plus de dix puissance soixante le nombre de petites molécules théoriquement envisageables, et une protéine de cent acides aminés pourrait prendre plus de dix puissance cent trente formes différentes. Le problème n\'est pas de trouver une molécule, mais de trouver la bonne dans un océan.',
      'C\'est là que le calcul change la donne. Plus un projet s\'appuie sur la structure précise de sa cible, moins il avance à l\'aveugle. Et quand un candidat prometteur échoue pour une raison identifiée, une dose trop forte par exemple, le retravailler coûte souvent moins cher que repartir de zéro. C\'est tout le pari du drug rescue.',
      'Le vrai chiffre à retenir n\'est donc peut-être pas ces neuf échecs sur dix, mais tout ce qui dort dans les tiroirs, des milliers de molécules abandonnées pour des raisons qui, aujourd\'hui, peuvent se corriger.'],
     ['Bringing a new medicine to market takes ten to fifteen years on average. By the most cited estimates, the bill exceeds two billion dollars once every failure that came before the success is counted.',
      'The most brutal number fits in one sentence. About nine candidates out of ten that enter clinical trials will never be approved. Analyses published in recent years point to three main culprits, a lack of efficacy in humans, a toxicity that cannot be managed, and unsuitable properties such as the dose or the way the compound moves through the body.',
      'Raw material, however, is not the problem. There are thought to be more than ten to the power sixty small molecules that could theoretically exist, and a protein of one hundred amino acids could take more than ten to the power one hundred and thirty different forms. The challenge is not to find a molecule, but to find the right one in an ocean.',
      'This is where computation changes the game. The more a project relies on the precise structure of its target, the less it moves blind. And when a promising candidate fails for an identified reason, a dose that is too high for instance, reworking it often costs less than starting over. That is the whole bet of drug rescue.',
      'The number to remember may therefore not be those nine failures out of ten, but everything that sleeps in drawers, thousands of molecules set aside for reasons that, today, can be fixed.']),
    (('Histoire', 'History'), 4,
     'Du hasard à l\'algorithme, un siècle pour apprendre à dessiner un médicament', 'From luck to algorithm, a century of learning to draw a medicine',
     'Pénicilline, propranolol, AlphaFold. Comment la conception de médicaments a cessé d\'être une affaire de chance.',
     'Penicillin, propranolol, AlphaFold. How the design of medicines stopped being a matter of luck.',
     ['En 1928, Alexander Fleming rentre de vacances et découvre qu\'une moisissure a tué les bactéries d\'une de ses boîtes de culture. La pénicilline est née d\'un oubli. Pendant des décennies, trouver un médicament ressemblera à cela, un mélange de flair et de chance, avec des milliers de substances testées une à une.',
      'Le tournant arrive dans les années 1960. Le pharmacologue écossais James Black ne cherche plus au hasard, il raisonne. Pour soulager le coeur, il imagine une molécule qui bloque certains récepteurs de l\'adrénaline et invente les bêtabloquants, puis il met au point un traitement de l\'ulcère qui bloque un récepteur de l\'histamine dans l\'estomac. Il recevra le prix Nobel en 1988.',
      'Vient ensuite l\'ère de la structure. Dans les années 1980 et 1990, les chercheurs voient en trois dimensions la protéine qu\'ils veulent atteindre et dessinent la clé autour de la serrure. Le captopril contre l\'hypertension, puis les inhibiteurs de protéase du VIH, transforment des maladies redoutables en maladies que l\'on sait traiter.',
      'En 2020, l\'intelligence artificielle AlphaFold prédit la forme de protéines avec une précision proche de celle de l\'expérience. Quatre ans plus tard, le prix Nobel de chimie récompense Demis Hassabis et John Jumper, de Google DeepMind, et David Baker, pionnier de la conception de protéines par ordinateur.',
      'Aujourd\'hui, des modèles de diffusion, de la même famille que ceux qui génèrent des images, apprennent à partir d\'un bruit aléatoire à sculpter des protéines inédites, pensées pour se fixer sur une cible donnée. Le médicament n\'est plus seulement découvert. Il est dessiné.'],
     ['In 1928, Alexander Fleming returns from vacation and finds that a mold has killed the bacteria in one of his culture dishes. Penicillin is born of an oversight. For decades, finding a medicine will look like this, a mix of flair and luck, with thousands of substances tested one by one.',
      'The turning point comes in the 1960s. The Scottish pharmacologist James Black no longer searches at random, he reasons. To ease the heart, he imagines a molecule that blocks certain adrenaline receptors and invents the beta blockers, then develops an ulcer treatment that blocks a histamine receptor in the stomach. He will receive the Nobel Prize in 1988.',
      'Then comes the age of structure. In the 1980s and 1990s, researchers see the protein they want to reach in three dimensions and draw the key around the lock. Captopril against high blood pressure, then the HIV protease inhibitors, turn formidable diseases into diseases that can be treated.',
      'In 2020 the artificial intelligence AlphaFold predicts the shape of proteins with a precision close to that of experiments. Four years later the Nobel Prize in Chemistry rewards Demis Hassabis and John Jumper, of Google DeepMind, and David Baker, a pioneer of computational protein design.',
      'Today, diffusion models, of the same family as those that generate images, learn to start from random noise and sculpt brand new proteins, designed to bind a given target. A medicine is no longer only discovered. It is drawn.']),
    (('Culture startup', 'Startup culture'), 5,
     'La biotech en 2027 ?', 'Biotech in 2027?',
     'En 2009, un robot gallois a fait seul une découverte scientifique. Ses héritiers se louent désormais à l\'heure, et ils changent la façon de monter une startup.',
     'In 2009 a Welsh robot made a scientific discovery on its own. Its heirs are now rented by the hour, and they are changing how a startup is built.',
     ['En 2009, dans un laboratoire d\'Aberystwyth, au pays de Galles, un robot nommé Adam passe ses journées à interroger de la levure, celle de la bière et du pain. Personne ne lui dicte quoi faire. Il choisit une question, formule une hypothèse, conçoit l\'expérience, la réalise avec ses bras et ses incubateurs, lit le résultat, puis recommence. Le chercheur Ross King et son équipe le présentent dans la revue Science comme la première machine à avoir découvert seule un morceau de connaissance, la fonction de gènes de levure restés inconnus. Des humains refont ensuite les expériences à la main. Adam avait raison.',
      'Quelques années plus tard, sa petite soeur Eve s\'attaque à un problème bien plus concret, le paludisme. Elle passe au crible des milliers de composés, et chaque essai, réussi ou raté, lui dit où chercher ensuite. Elle finit par pointer un candidat inattendu, le triclosan, un antibactérien que l\'on trouvait dans certains dentifrices, qui bloque une enzyme dont le parasite a besoin. Le plus intéressant n\'est pas la molécule, c\'est la méthode. Dans la boucle, un échec n\'est plus un déchet. C\'est une information qui rend le tour suivant plus intelligent.',
      'Pourtant, pendant quinze ans, ces robots sont restés des curiosités. Ils coûtaient une fortune, ne vivaient que dans quelques universités, et les modèles qui les guidaient savaient encore peu de choses. En 2027, ce qui change tient en une chaîne où chaque maillon rend le suivant possible. Le laboratoire autonome permet l\'entraînement en boucle fermée, et la boucle fermée fait naître des modèles spécialisés.',
      'Le point de départ, c\'est le cloud lab, l\'héritier d\'Adam et d\'Eve. On y envoie un protocole écrit comme un programme, et des robots l\'exécutent dans un bâtiment équipé d\'instruments, sans pause et sans intervention humaine entre deux étapes. Un laboratoire autonome travaille la nuit, le week-end et pendant que l\'équipe réfléchit, il ne fait pas la queue pour un instrument et il renvoie des données déjà prêtes pour un modèle. Emerald Cloud Lab, aux États-Unis, fait partie des pionniers, et pour une startup un laboratoire n\'est plus un investissement de plusieurs millions mais une dépense à l\'usage, comme l\'hébergement d\'un site web.',
      'Cette autonomie rend possible l\'entraînement en boucle fermée. On répète que les données sont le nouveau pétrole, mais en biologie le puits est presque vide de ce qui compte, car les publications racontent les réussites et taisent les échecs. Un modèle classique apprend une fois sur ce passé biaisé, puis il est figé. Branché sur un laboratoire autonome, un modèle propose une conception, reçoit la mesure en quelques jours et se réentraîne dessus avant de proposer la suivante. Là où l\'on attendait des semaines entre deux expériences, la boucle se compte désormais en jours. Les réussites lui apprennent ce qui marche, et chaque échec lui apprend où ne pas aller.',
      'De cette boucle naissent des modèles spécialisés. À chaque tour, le modèle devient un peu meilleur sur la question précise qu\'on lui pose, et sur elle seule. La prochaine vague de réussites ne viendra donc sans doute pas des modèles généralistes, devenus des commodités que tout le monde loue, mais d\'entreprises d\'intelligence artificielle spécialistes. Chacune se consacre à une seule question de la biologie et la connaît à fond. Son avantage tient moins au modèle, que d\'autres peuvent copier, qu\'à la donnée propriétaire, échecs compris, que sa boucle accumule jour après jour. Isomorphic Labs, née chez DeepMind, Xaira ou Recursion en sont, chacune à sa manière, des illustrations.',
      'Rien de cela ne supprime les difficultés. Un cloud lab ne remplace ni les modèles animaux ni les essais cliniques, il ne sait pas encore tout mesurer et il crée une dépendance envers son fournisseur. Mais la direction est tracée. Chez BlackPhage, notre agent génère une protéine par diffusion, puis l\'optimise en temps réel, et chaque mesure qui revient, bonne ou mauvaise, l\'aide à mieux concevoir la suivante.',
      'Adam travaillait seul dans une pièce du pays de Galles. En 2027, de petites équipes pourront disposer de leur propre Adam, loué à l\'heure. La donnée est-elle donc le nouveau pétrole ? Nous dirions plutôt qu\'elle est le minerai et que la boucle est le moteur. Elle appartiendra à celui qui boucle le plus vite et le plus proprement, et qui dit honnêtement quand il s\'est trompé.'],
     ['In 2009, in a laboratory in Aberystwyth, Wales, a robot named Adam spends its days questioning yeast, the kind used in beer and bread. No one tells it what to do. It picks a question, forms a hypothesis, designs the experiment, runs it with its arms and incubators, reads the result, then starts again. The researcher Ross King and his team present it in the journal Science as the first machine to have discovered a piece of knowledge on its own, the function of yeast genes that were still unknown. Humans then repeat the experiments by hand. Adam was right.',
      'A few years later, its little sister Eve takes on a far more concrete problem, malaria. She screens thousands of compounds, and every trial, successful or not, tells her where to look next. She ends up pointing to an unexpected candidate, triclosan, an antibacterial once found in some toothpastes, which blocks an enzyme the parasite needs. The interesting part is not the molecule, it is the method. Inside the loop, a failure is no longer waste. It is information that makes the next round smarter.',
      'Yet for fifteen years these robots remained curiosities. They cost a fortune, lived in only a few universities, and the models guiding them still knew little. In 2027, what changes is a chain in which each link makes the next one possible. The autonomous laboratory makes closed-loop training possible, and the closed loop gives birth to specialist models.',
      'The starting point is the cloud lab, the heir of Adam and Eve. You send a protocol written like a program, and robots run it in a building full of instruments, without a pause and without human intervention between two steps. An autonomous laboratory works at night, on weekends and while the team is thinking, it does not queue for an instrument and it returns data already ready for a model. Emerald Cloud Lab, in the United States, is among the pioneers, and for a startup a laboratory is no longer a multimillion investment but a pay-per-use expense, like hosting a website.',
      'That autonomy makes closed-loop training possible. People repeat that data is the new oil, but in biology the well is nearly empty of what matters, because publications tell of successes and stay silent on failures. A classic model learns once from that biased past, then is frozen. Plugged into an autonomous laboratory, a model proposes a design, receives the measurement within days and retrains on it before proposing the next. Where you used to wait weeks between two experiments, the loop is now counted in days. Successes teach it what works, and every failure teaches it where not to go.',
      'Specialist models are born from that loop. With each round the model gets a little better at the precise question it is asked, and at that alone. The next wave of successes will therefore probably not come from general-purpose models, now commodities everyone rents, but from specialist artificial intelligence companies. Each devotes itself to a single question in biology and knows it inside out. Its edge lies less in the model, which others can copy, than in the proprietary data, failures included, that its loop accumulates day after day. Isomorphic Labs, born at DeepMind, Xaira or Recursion are, each in its own way, illustrations.',
      'None of this removes the difficulties. A cloud lab replaces neither animal models nor clinical trials, it cannot yet measure everything and it creates dependence on its provider. But the direction is set. At BlackPhage, our agent generates a protein by diffusion, then optimizes it in real time, and every measurement that comes back, good or bad, helps it design the next one better.',
      'Adam worked alone in a room in Wales. In 2027, small teams will be able to have an Adam of their own, rented by the hour. Is data, then, the new oil? We would rather say it is the ore and the loop is the engine. It will belong to whoever loops fastest and most cleanly, and says honestly when they were wrong.']),
    (('Cible', 'Target'), 4,
     'Le récepteur, serrure du vivant', 'The receptor, lock of the living',
     'De Langley à Lefkowitz, un siècle d\'intuitions pour comprendre pourquoi tant de médicaments visent un récepteur.',
     'From Langley to Lefkowitz, a century of insight into why so many medicines aim at a receptor.',
     ['En 1905, le physiologiste britannique John Newport Langley observe que la nicotine et le curare agissent sur le muscle en se fixant sur une substance dite réceptrice. Le mot est lâché. Quelques années plus tôt, l\'Allemand Paul Ehrlich avait rêvé d\'une balle magique, une molécule qui ne frapperait que la cause d\'une maladie.',
      'L\'idée reste longtemps abstraite, car personne n\'a jamais vu un récepteur. Dans les années 1970 et 1980, l\'Américain Robert Lefkowitz isole puis clone ceux de l\'adrénaline. En 2011, son ancien collaborateur Brian Kobilka photographie l\'un d\'eux activé, couplé à la protéine G qui relaie son signal. Ils partagent le prix Nobel de chimie 2012.',
      'Pourquoi tant d\'efforts pour une cible ? Parce qu\'un récepteur est une porte d\'entrée. À la surface de la cellule, une poche accueille un signal, à l\'intérieur une cascade s\'enclenche. Agir sur lui, c\'est changer ce que la cellule fait sans avoir à y pénétrer. Une seule famille, les récepteurs couplés aux protéines G, compte environ huit cents membres chez l\'humain et cible à peu près un tiers des médicaments approuvés.',
      'Choisir un récepteur, c\'est aussi choisir une question. Faut-il l\'activer, comme on tourne une clé, ou le bloquer, comme on glisse un capuchon sur la serrure ? C\'est la différence entre un agoniste et un antagoniste, la médecine de précision en miniature.',
      'Concevoir une protéine pour une cible, c\'est donc fabriquer la bonne clé pour la bonne serrure, avec un siècle d\'idées en poche. Chez BlackPhage, l\'agent NovaDiff la génère par diffusion, puis l\'affine jusqu\'à ce qu\'elle réponde à la question posée.'],
     ['In 1905 the British physiologist John Newport Langley observes that nicotine and curare act on muscle by binding to what he calls a receptive substance. The word is out. A few years earlier, the German Paul Ehrlich had dreamed of a magic bullet, a molecule that would strike only the cause of a disease.',
      'For a long time the idea stays abstract, because no one has ever seen a receptor. In the 1970s and 1980s the American Robert Lefkowitz isolates, then clones, those of adrenaline. In 2011 his former collaborator Brian Kobilka captures one of them activated, coupled to the G protein that relays its signal. They share the 2012 Nobel Prize in Chemistry.',
      'Why so much effort for one target? Because a receptor is a doorway. At the surface of the cell, a pocket welcomes a signal, inside a cascade starts. Acting on it changes what the cell does without having to enter it. A single family, the G protein coupled receptors, counts about eight hundred members in humans and is the target of roughly a third of approved medicines.',
      'Choosing a receptor also means choosing a question. Should it be activated, like turning a key, or blocked, like slipping a cap over the lock? That is the difference between an agonist and an antagonist, precision medicine in miniature.',
      'Designing a protein for a target is therefore building the right key for the right lock, with a century of ideas in the pocket. At BlackPhage, the agent NovaDiff generates it by diffusion, then refines it until it answers the question asked.']),
    (('Le saviez-vous', 'Did you know'), 3,
     'Le médicament qui devait soigner le coeur', 'The drug that was meant to heal the heart',
     'Un échec en essai clinique, un effet inattendu et l\'une des plus célèbres secondes vies de la pharmacie.',
     'A clinical trial failure, an unexpected effect and one of the most famous second lives in pharmacy.',
     ['En 1989, dans les laboratoires de Pfizer, à Sandwich, en Angleterre, des chimistes synthétisent une molécule portant le code UK-92480. Elle doit détendre les vaisseaux et soulager l\'angine de poitrine, la douleur d\'un coeur qui manque d\'oxygène.',
      'Les essais du début des années 1990 déçoivent. L\'effet sur le coeur est modeste. Mais les volontaires, des hommes, rechignent à rendre les comprimés restants à la fin de l\'étude. Les équipes comprennent vite pourquoi.',
      'Le projet est réorienté. Le sildénafil, commercialisé sous le nom de Viagra, est approuvé par l\'agence américaine du médicament le 27 mars 1998. Une molécule presque abandonnée devient l\'un des médicaments les plus connus du monde.',
      'L\'épisode illustre un vrai problème scientifique, que la profession appelle le repositionnement. Un composé qui échoue sur son objectif initial peut réussir ailleurs, parce que sa cible existe dans d\'autres tissus. La thalidomide, retirée du marché en 1961 pour ses effets dramatiques chez les femmes enceintes, a elle aussi connu une seconde vie, contre des complications de la lèpre puis contre un cancer de la moelle osseuse.',
      'Reste la difficulté. Presque tous ces rebonds sont survenus par hasard, remarqués par des cliniciens attentifs. Le défi d\'aujourd\'hui est de les provoquer, en comprenant précisément pourquoi une molécule échoue, puis en la redessinant. Un chiffre pour finir, neuf ans séparent la synthèse du sildénafil de son approbation.'],
     ['In 1989, in Pfizer\'s laboratories in Sandwich, England, chemists synthesize a molecule coded UK-92480. It is meant to relax blood vessels and relieve angina, the pain of a heart short of oxygen.',
      'The trials of the early 1990s disappoint. The effect on the heart is modest. But the volunteers, all men, are reluctant to hand back their leftover tablets at the end of the study. The teams soon understand why.',
      'The project is redirected. Sildenafil, sold as Viagra, is approved by the US drug agency on March 27, 1998. A nearly abandoned molecule becomes one of the best known medicines in the world.',
      'The episode illustrates a real scientific problem, which the profession calls repositioning. A compound that fails at its original goal may succeed elsewhere, because its target exists in other tissues. Thalidomide, withdrawn from the market in 1961 for its dramatic effects on pregnant women, also found a second life, against complications of leprosy and then against a cancer of the bone marrow.',
      'The difficulty remains. Almost all of these comebacks happened by chance, noticed by attentive clinicians. Today\'s challenge is to provoke them, by understanding precisely why a molecule fails, then redesigning it. One number to close, nine years separate the synthesis of sildenafil from its approval.']),
    (('Longévité', 'Longevity'), 5,
     'Vendredi 13 novembre 2026. Le jour où l\'humanité devait devenir infinie', 'Friday, November 13, 2026. The day humanity was supposed to become infinite',
     'En 1960, trois chercheurs ont calculé la date exacte d\'une explosion de la population. Cette date arrive dans quelques jours, et la leçon est ailleurs.',
     'In 1960, three researchers calculated the exact date of a population explosion. That date arrives in a few days, and the lesson lies elsewhere.',
     ['En 1960, la revue Science publie un article au titre savoureux, Doomsday, Friday 13 November A.D. 2026, le jour du jugement, daté au vendredi près. Ses trois auteurs, de l\'université de l\'Illinois, dont l\'ingénieur et physicien Heinz von Foerster, ont étudié deux mille ans de démographie et remarqué que le temps nécessaire pour doubler la population ne cessait de raccourcir.',
      'Ils prolongent la courbe jusqu\'au bout. Un jour, le doublement ne prend plus aucun temps et la population part à l\'infini. Ce jour tombe le vendredi 13 novembre 2026, par hasard aussi l\'anniversaire de von Foerster. Leurs arrière-arrière-petits-enfants, écrivent-ils en plaisantant, ne mourront pas de faim, ils mourront écrasés.',
      'Il n\'y a bien sûr pas de catastrophe en vue. Quelques années après la publication, la croissance de la population mondiale atteint son sommet, autour de 2 % par an, et elle a depuis été divisée par plus de deux. La population augmente encore, par inertie, mais la courbe a cassé parce que le système qu\'elle décrivait a changé de comportement. Une courbe n\'est pas un destin.',
      'Pourtant la tentation de prolonger les courbes ne meurt jamais. En 2020, l\'économiste David Roodman applique la même logique à la richesse produite depuis douze mille ans et obtient une accélération explosive vers 2047. Ray Kurzweil situe sa singularité en 2045, avec, au bout, la perspective de vivre indéfiniment. Vivre mille ans, promettent les plus optimistes. Mais à quelle vitesse ?',
      'Reprenons cette question au ralenti, car tout se joue sur le mot « vivre ». Mille ans, cela peut vouloir dire deux choses très différentes. Soit mille tours de la Terre autour du Soleil, soit mille ans d\'expérience, c\'est-à-dire de pensées, de souvenirs et de découvertes. Tant que nous pensons à la vitesse d\'un cerveau humain, les deux coïncident, une seconde vécue dure une seconde. Rien ne garantit que ce soit toujours le cas.',
      'L\'économiste Robin Hanson, de l\'université George Mason, a poussé cette idée jusqu\'au bout dans son livre The Age of Em, paru en 2016. Il imagine des « ems », des cerveaux humains scannés puis copiés dans des ordinateurs. Sur une machine plus rapide, le même cerveau pense plus vite, comme un film que l\'on passe en accéléré. À mille fois notre vitesse, une de nos journées représente pour un em près de trois ans, puisque mille jours font un peu moins de trois ans.',
      'Faites maintenant le calcul à l\'envers. Un em qui vivrait mille ans selon sa propre perception, avec ses saisons, ses amitiés et ses deuils, n\'aurait occupé qu\'une seule année de notre calendrier. Voilà ce que signifie, à nos horloges, une vie très augmentée. Elle peut être immense pour celui qui la vit et minuscule pour nous qui la regardons de l\'extérieur. Vivre mille ans et n\'en vivre qu\'un, les deux sont vrais à la fois, tout dépend de l\'horloge que l\'on consulte. Une vie plus dense, pas forcément plus longue.',
      'Reste une leçon d\'humilité, valable pour les prophètes comme pour les sceptiques. Malthus, très intelligent, s\'est trompé parce qu\'il n\'a pas vu venir les révolutions agricoles. Personne ne sait ce qui se trouve derrière le mur. Chez BlackPhage, nous préférons compter autrement, en années de bonne santé plutôt qu\'en siècles promis, et nous gardons la curiosité pour méthode.'],
     ['In 1960 the journal Science publishes a paper with a delicious title, Doomsday, Friday 13 November A.D. 2026, judgment day dated down to the weekday. Its three authors, from the University of Illinois, among them the engineer and physicist Heinz von Foerster, studied two thousand years of demography and noticed that the time needed to double the population kept getting shorter.',
      'They extend the curve all the way. One day, doubling takes no time at all and the population shoots to infinity. That day falls on Friday, November 13, 2026, which happens to be von Foerster\'s birthday. Their great-great-grandchildren, they joke, will not die of hunger, they will be crushed to death.',
      'Of course, no catastrophe is in sight. A few years after the paper, the growth of the world population peaks at around 2 percent a year, and it has since been cut by more than half. The population still rises, by inertia, but the curve broke because the system it described changed its behavior. A curve is not a destiny.',
      'Yet the temptation to extend curves never dies. In 2020 the economist David Roodman applies the same logic to the wealth produced over twelve thousand years and finds an explosive acceleration around 2047. Ray Kurzweil places his singularity in 2045, with, at the end, the prospect of living indefinitely. Live a thousand years, the most optimistic promise. But at what speed?',
      'Let us take that question slowly, because everything hinges on the word "live". A thousand years can mean two very different things. Either a thousand trips of the Earth around the Sun, or a thousand years of experience, meaning thoughts, memories and discoveries. As long as we think at the speed of a human brain, the two coincide, a lived second lasts a second. Nothing guarantees it will always be so.',
      'The economist Robin Hanson, of George Mason University, pushed this idea to its limit in his book The Age of Em, published in 2016. He imagines "ems", human brains scanned and then copied into computers. On a faster machine the same brain thinks faster, like a film played at high speed. At a thousand times our speed, one of our days is nearly three years for an em, since a thousand days make a little under three years.',
      'Now run the calculation backwards. An em who lived a thousand years by its own perception, with its seasons, friendships and griefs, would have taken up a single year of our calendar. That is what a heavily augmented life means by our clocks. It can be immense for the one who lives it and tiny for us watching from the outside. Living a thousand years and living only one are both true at once, it all depends on which clock you consult. A denser life, not necessarily a longer one.',
      'What remains is a lesson in humility, valid for prophets and skeptics alike. Malthus, very intelligent, was wrong because he did not see the agricultural revolutions coming. No one knows what lies behind the wall. At BlackPhage we prefer to count differently, in years of good health rather than in promised centuries, and we keep curiosity as our method.']),
    (('Éthique', 'Ethics'), 5,
     'Lulu et Nana, les jumelles qui ont divisé la science', 'Lulu and Nana, the twins who divided science',
     'En 2018, un chercheur chinois annonce la naissance de bébés dont le génome a été modifié. Huit ans plus tard, ce que cette affaire a changé, et ce qu\'elle n\'a pas changé.',
     'In 2018 a Chinese researcher announces the birth of babies whose genome was edited. Eight years on, what the affair changed, and what it did not.',
     ['Le 25 novembre 2018, à la veille d\'un congrès international sur l\'édition du génome à Hong Kong, une vidéo apparaît sur YouTube. Un jeune chercheur chinois, He Jiankui, de l\'Université des sciences et technologies du Sud, à Shenzhen, y annonce la naissance de jumelles, Lulu et Nana, dont il affirme avoir modifié le génome au stade d\'embryon. La presse les baptise aussitôt les bébés OGM. En quelques heures, la communauté scientifique passe de la curiosité à la stupeur.',
      'Son idée est de protéger les enfants du virus du sida. Leur père est séropositif, leur mère non. Avec l\'outil CRISPR, le chercheur a désactivé dans les embryons un gène appelé CCR5, qui fabrique la porte d\'entrée que le VIH emprunte pour pénétrer dans certaines cellules immunitaires. Quelques personnes naissent naturellement sans cette porte, et elles résistent à la plupart des souches du virus. Il espère reproduire ce hasard heureux.',
      'Les critiques sont immédiates, et de plusieurs ordres. Le père séropositif ne faisait courir aucun risque réel, car des techniques de lavage du sperme permettent déjà d\'avoir un enfant sain. Les modifications obtenues ne correspondent pas à la variation naturelle connue, et les embryons semblent porter des cellules corrigées de façons différentes, ce que l\'on appelle une mosaïque. Le consentement des parents est mis en doute. Surtout, un embryon modifié transmet ses changements à sa descendance, et personne ne sait ce que fait vraiment ce gène chez un adulte. Les enfants n\'avaient aucune maladie à guérir, et ils portent désormais un risque qu\'ils n\'ont pas choisi.',
      'La sanction tombe. Fin décembre 2019, un tribunal de Shenzhen condamne He Jiankui à trois ans de prison et à trois millions de yuans d\'amende pour pratique médicale illégale. Il est libéré en 2022. La Chine durcit sa réglementation, l\'Organisation mondiale de la santé publie en 2021 un cadre de gouvernance, et le sommet international de Londres, en 2023, conclut que modifier des embryons destinés à naître reste inacceptable en l\'état.',
      'Cette affaire a un mérite, elle force à distinguer deux choses que l\'on confond souvent. Modifier les cellules d\'un patient pour le soigner ne change que cette personne, ses enfants n\'héritent de rien. Modifier un embryon ou des cellules reproductrices touche toutes les générations suivantes. La première voie est celle de la médecine. La seconde est celle que la communauté scientifique a décidé de ne pas emprunter, pour l\'instant.',
      'La première voie a déjà donné des résultats. En novembre 2023, le Royaume-Uni autorise Casgevy, une thérapie CRISPR contre la drépanocytose et la bêta-thalassémie, bientôt suivi par les États-Unis. On prélève des cellules du sang du patient, on les corrige en laboratoire, puis on les lui réinjecte. Pour des malades qui souffraient depuis l\'enfance, l\'effet est considérable.',
      'En 2025, un autre bébé fait l\'actualité, pour une tout autre raison. Atteint d\'une maladie métabolique rare et grave, un déficit en une enzyme appelée CPS1, le nourrisson KJ Muldoon reçoit à l\'hôpital pour enfants de Philadelphie un traitement d\'édition de gènes fabriqué sur mesure, en quelques mois seulement. Les médecins rapportent des premiers résultats encourageants. Leur cas laisse espérer des thérapies conçues pour un seul patient, quand sa mutation est unique.',
      'Deux bébés, deux voies. D\'un côté, un génome modifié sans nécessité médicale, sans l\'accord de la communauté, avec des conséquences que personne ne maîtrise. De l\'autre, un traitement conçu pour une maladie grave, encadré, mesuré, qui ne touche que le patient. La différence ne tient pas à la technique, issue de la même famille d\'outils. Elle tient à la question posée, au consentement et à la preuve apportée. Chez BlackPhage, nous concevons des protéines, pas des humains modifiés, et nous retenons la leçon, la rigueur et la transparence passent avant la vitesse.'],
     ['On November 25, 2018, on the eve of an international conference on genome editing in Hong Kong, a video appears on YouTube. A young Chinese researcher, He Jiankui, of the Southern University of Science and Technology in Shenzhen, announces the birth of twin girls, Lulu and Nana, whose genome he says he edited at the embryo stage. The press immediately dubs them the GMO babies. Within hours the scientific community goes from curiosity to stupor.',
      'His idea is to protect the children from the AIDS virus. Their father is HIV positive, their mother is not. Using the CRISPR tool, the researcher disabled in the embryos a gene called CCR5, which makes the door HIV uses to enter certain immune cells. A few people are born naturally without that door, and they resist most strains of the virus. He hopes to reproduce that lucky accident.',
      'The criticism is immediate, and of several kinds. The HIV positive father posed no real risk, since sperm washing techniques already make it possible to have a healthy child. The changes obtained do not match the known natural variation, and the embryos seem to carry cells corrected in different ways, what is called a mosaic. The parents\' consent is questioned. Above all, an edited embryo passes its changes on to its descendants, and no one really knows what this gene does in an adult. The children had no disease to cure, and they now carry a risk they did not choose.',
      'The sanction follows. At the end of December 2019 a Shenzhen court sentences He Jiankui to three years in prison and a fine of three million yuan for illegal medical practice. He is released in 2022. China tightens its regulations, the World Health Organization publishes a governance framework in 2021, and the international summit in London in 2023 concludes that editing embryos meant to be born remains unacceptable as things stand.',
      'The affair has one merit, it forces a distinction people often blur. Editing a patient\'s cells to treat them changes only that person, their children inherit nothing. Editing an embryo or reproductive cells touches every later generation. The first path is that of medicine. The second is the one the scientific community has decided not to take, for now.',
      'The first path has already delivered. In November 2023 the United Kingdom approves Casgevy, a CRISPR therapy for sickle cell disease and beta thalassemia, soon followed by the United States. Cells are taken from the patient\'s blood, corrected in the laboratory, then given back. For patients who had suffered since childhood, the effect is considerable.',
      'In 2025 another baby makes the news, for a very different reason. Born with a rare and serious metabolic disease, a deficiency in an enzyme called CPS1, the infant KJ Muldoon receives at Children\'s Hospital of Philadelphia a gene editing treatment made to order, in just a few months. The doctors report encouraging early results. His case raises hope for therapies designed for a single patient, when the mutation is unique.',
      'Two babies, two paths. On one side, a genome edited with no medical need, without the community\'s agreement, with consequences no one controls. On the other, a treatment designed for a serious disease, supervised, measured, touching only the patient. The difference is not the technique, which comes from the same family of tools. It lies in the question asked, the consent and the proof provided. At BlackPhage we design proteins, not edited humans, and we take the lesson to heart, rigor and transparency come before speed.']),
    (('Bioimpression', 'Bioprinting'), 5,
     'Imprimer un organe, ou apprendre aux cellules à le construire ?', 'Print an organ, or teach cells to build it?',
     'En 2022, une oreille imprimée avec les cellules d\'une patiente a été implantée. Pour aller plus loin, il ne suffira pas d\'imprimer, il faudra guider.',
     'In 2022 an ear printed with a patient\'s own cells was implanted. To go further, printing will not be enough, cells will have to be guided.',
     ['En mars 2022, à San Antonio, au Texas, une jeune femme née avec une oreille à peine formée, une malformation appelée microtie, reçoit une oreille neuve. Elle n\'a pas été taillée dans un cartilage prélevé ailleurs, ni moulée dans du plastique. Elle a été imprimée, couche après couche, avec un gel contenant les propres cellules de cartilage de la patiente, d\'après le scan de son oreille saine. Les médecins la présentent comme la première implantation d\'un tissu bioimprimé à partir des cellules du patient.',
      'L\'histoire de cette oreille commence bien plus tôt. En 2003, à l\'Université Clemson, en Caroline du Sud, le chercheur Thomas Boland remplace l\'encre d\'une imprimante à jet d\'encre par des cellules vivantes et montre qu\'elles survivent au passage dans la buse. Depuis, les imprimantes ont appris à déposer des cellules, des gels et des fibres avec une précision de quelques dizaines de micromètres, de l\'ordre de l\'épaisseur d\'un cheveu.',
      'L\'enjeu est immense. Plus de cent mille personnes attendent une greffe d\'organe aux États-Unis, et chaque jour certaines meurent avant d\'avoir reçu la leur. Fabriquer un tissu ou un organe à partir des cellules du patient lui-même, sans donneur et sans rejet, serait l\'une des plus grandes transformations de la médecine.',
      'Mais l\'oreille est le cas facile. Le cartilage ne contient pas de vaisseaux sanguins, et ses cellules se contentent de ce qui diffuse jusqu\'à elles. Un tissu plus épais, un morceau de foie, de rein ou de coeur, meurt en quelques heures s\'il n\'est pas irrigué, car l\'oxygène ne parcourt que cent à deux cents micromètres avant d\'être épuisé. Il faut donc imprimer aussi des vaisseaux, jusqu\'aux capillaires, bien plus fins que ce que les imprimantes savent faire aujourd\'hui. Stanford a reçu en 2023 un financement de l\'agence américaine ARPA-H pour tenter d\'imprimer un coeur humain, et des équipes de Carnegie Mellon et de Harvard ont inventé des astuces, imprimer dans un bain de gel ou creuser des canaux dans un tissu vivant, pour s\'en approcher.',
      'Il y a un second obstacle, plus profond. Une imprimante place les cellules, elle ne leur dit pas ce qu\'elles doivent devenir. Or un tissu réel ne se construit pas ainsi. Dans l\'embryon, des protéines de signalisation forment des gradients qui disent à chaque cellule où elle se trouve et ce qu\'elle doit faire. En 2009, l\'équipe de Hans Clevers, aux Pays-Bas, a montré qu\'une seule cellule souche d\'intestin, placée dans un gel avec les bons signaux, construit seule un minuscule intestin avec ses cryptes et ses replis. Les cellules savent bâtir, à condition qu\'on leur parle.',
      'Voilà où nous voulons nous placer. Chez BlackPhage, nous développons un outil de guidance cellulaire. Notre agent conçoit des protéines qui jouent le rôle de ces signaux, elles disent à un type de cellule où aller et quoi faire. Le premier objectif de recherche est modeste, guider une population de cellules en culture. L\'étape suivante est de déposer ces consignes dans l\'espace, avec une imprimante, de sorte que la guidance s\'étende de quelques cellules à un morceau de tissu, puis, à terme, à un tissu entier. On n\'imprimerait plus la forme finale, mais les instructions, et les cellules feraient le reste.',
      'Cela peut sembler fou, mais c\'est une échelle dont chaque barreau se vérifie avant de monter sur le suivant. Une cellule, puis un amas, puis une fine couche de tissu, puis un tissu irrigué, puis un organe. Les premiers barreaux ont déjà une utilité, bien avant la greffe. Des tissus imprimés servent à tester des médicaments sur du tissu humain, et la loi américaine FDA Modernization Act 2.0, adoptée fin 2022, a levé l\'obligation de tests sur l\'animal avant les essais chez l\'homme en autorisant des alternatives. Chaque marche franchie rend la suivante moins hasardeuse.',
      'Il faudra des années, et nous ne présentons rien de cela comme un résultat. Ce sont des objectifs de recherche. Mais l\'oreille de San Antonio a prouvé l\'essentiel, un tissu fabriqué à partir des cellules d\'un patient peut vivre dans son corps. Reste à apprendre aux cellules à construire plus grand, et c\'est précisément le problème que nous voulons apprendre à résoudre à notre agent.'],
     ['In March 2022, in San Antonio, Texas, a young woman born with a barely formed ear, a malformation called microtia, receives a new one. It was not carved from cartilage taken elsewhere, nor molded in plastic. It was printed, layer by layer, with a gel holding the patient\'s own cartilage cells, based on a scan of her healthy ear. The doctors present it as the first implantation of a bioprinted tissue made from the patient\'s own cells.',
      'The story of that ear begins much earlier. In 2003, at Clemson University in South Carolina, the researcher Thomas Boland replaces the ink of an inkjet printer with living cells and shows that they survive the trip through the nozzle. Since then printers have learned to deposit cells, gels and fibers with a precision of a few tens of micrometers, about the thickness of a hair.',
      'The stakes are immense. More than a hundred thousand people are waiting for an organ transplant in the United States, and every day some die before receiving theirs. Making a tissue or an organ from the patient\'s own cells, with no donor and no rejection, would be one of the greatest transformations of medicine.',
      'But the ear is the easy case. Cartilage contains no blood vessels, and its cells make do with what diffuses to them. A thicker tissue, a piece of liver, kidney or heart, dies within hours if it is not irrigated, because oxygen travels only one to two hundred micrometers before it is used up. Vessels must be printed too, down to the capillaries, far finer than what printers can do today. In 2023 Stanford received funding from the US agency ARPA-H to try to print a human heart, and teams at Carnegie Mellon and Harvard have invented tricks, printing inside a gel bath or carving channels into living tissue, to get closer.',
      'There is a second obstacle, a deeper one. A printer places cells, it does not tell them what to become. Yet a real tissue is not built that way. In the embryo, signaling proteins form gradients that tell each cell where it is and what to do. In 2009 the team of Hans Clevers, in the Netherlands, showed that a single intestinal stem cell, placed in a gel with the right signals, builds a tiny intestine on its own, with its crypts and folds. Cells know how to build, provided someone talks to them.',
      'That is where we want to stand. At BlackPhage we are developing a cell guidance tool. Our agent designs proteins that play the role of those signals, telling a type of cell where to go and what to do. The first research goal is modest, guiding a population of cells in culture. The next step is to lay those instructions down in space, with a printer, so that the guidance extends from a few cells to a piece of tissue, then, in time, to a whole tissue. We would no longer print the final shape, but the instructions, and the cells would do the rest.',
      'It may sound crazy, but it is a ladder where each rung is checked before stepping onto the next. A cell, then a cluster, then a thin layer of tissue, then an irrigated tissue, then an organ. The first rungs are already useful, long before any transplant. Printed tissues are used to test drugs on human tissue, and the US FDA Modernization Act 2.0, passed in late 2022, lifted the requirement for animal testing before human trials by allowing alternatives. Every step climbed makes the next one less of a gamble.',
      'It will take years, and we present none of this as a result. These are research goals. But the San Antonio ear proved the essential, a tissue made from a patient\'s own cells can live in their body. What remains is teaching cells to build bigger, and that is precisely the problem we want to teach our agent to solve.']),
    (('Thérapie cellulaire', 'Cell therapy'), 5,
     'Thérapies cellulaires en 2026, quand le médicament est vivant', 'Cell therapies in 2026, when the medicine is alive',
     'En 2012, une fillette de six ans est sauvée par ses propres cellules reprogrammées. Où en est cette médecine en 2026 ?',
     'In 2012 a six-year-old girl is saved by her own reprogrammed cells. Where does this medicine stand in 2026?',
     ['Printemps 2012, à Philadelphie. Emily Whitehead a six ans, une leucémie qui a rechuté deux fois, et des médecins qui n\'ont plus de traitement à proposer. L\'équipe du chercheur Carl June, de l\'université de Pennsylvanie, et celle de l\'hôpital pour enfants de Philadelphie lui prélèvent des globules blancs, des lymphocytes T, et les reprogramment en laboratoire pour qu\'ils reconnaissent les cellules leucémiques. Puis on les lui réinjecte. Quelques jours plus tard, Emily est dans le coma, brûlante de fièvre, ses organes défaillent.',
      'Les médecins découvrent que son système immunitaire s\'emballe, une tempête de molécules inflammatoires dont l\'une, l\'interleukine 6, est à des niveaux extrêmes. Ils lui donnent un médicament contre l\'arthrite qui bloque justement cette molécule. Emily se réveille, et la leucémie a disparu. Plus de dix ans plus tard, elle est toujours en rémission.',
      'Cette thérapie porte un nom, CAR-T. Le principe tient en une phrase, on fabrique un médicament vivant. Les lymphocytes T du patient reçoivent un gène qui leur fait produire un récepteur artificiel, le CAR, capable de reconnaître une marque à la surface des cellules cancéreuses. Ils se multiplient, patrouillent, et peuvent rester des années dans l\'organisme. En 2017, l\'agence américaine du médicament approuve la première, Kymriah, contre une leucémie de l\'enfant, et d\'autres suivent contre des lymphomes et des myélomes.',
      'Mais ce médicament vivant est difficile à produire. Il est fabriqué sur mesure pour chaque patient, ce qui prend des semaines pendant lesquelles la maladie progresse, et il coûte plusieurs centaines de milliers de dollars. Il peut provoquer la même tempête que chez Emily, et il échoue encore face à la plupart des tumeurs solides. En 2026, la recherche avance sur trois fronts.',
      'Premier front, sortir du cancer. À Erlangen, en Allemagne, l\'équipe de Georg Schett a traité dès 2021 des patients atteints de lupus sévère avec des CAR-T qui éliminent les lymphocytes B responsables de la maladie. Plusieurs sont entrés en rémission, sans traitement, le système immunitaire semblant repartir à zéro. Des essais explorent maintenant la sclérose en plaques et d\'autres maladies auto-immunes.',
      'Deuxième front, fabriquer la thérapie dans le corps. Plutôt que de prélever, modifier puis réinjecter les cellules, on injecte un vecteur qui reprogramme les lymphocytes directement chez le patient. Plus d\'usine individuelle, des coûts et des délais bien plus bas, et c\'est ce qui a poussé plusieurs grands groupes pharmaceutiques à racheter en 2025 de jeunes sociétés spécialisées.',
      'Troisième front, remplacer ce qui manque plutôt que détruire ce qui nuit. Des cellules productrices d\'insuline, fabriquées à partir de cellules souches par la société Vertex, ont permis à dix des douze premiers patients diabétiques de type 1 de se passer d\'insuline un an après, selon des résultats publiés en 2025. Des neurones dérivés de cellules souches ont été greffés à des patients atteints de la maladie de Parkinson, avec des premiers résultats publiés la même année. Le médicament n\'est plus une molécule, c\'est un morceau de tissu.',
      'Un fil relie ces trois fronts, les protéines. Un récepteur CAR est une protéine conçue, et rendre les cellules plus sûres, plus précises et plus faciles à produire passe par de meilleures protéines, que l\'on dessine désormais par ordinateur. C\'est aussi l\'idée de notre outil de guidance cellulaire, dire à une cellule quoi faire grâce à une protéine conçue sur mesure. En 2012, le médicament d\'Emily a été fabriqué à la main pour une seule enfant. En 2026, le défi n\'est plus de prouver qu\'une cellule peut soigner, c\'est de la rendre assez sûre et assez simple pour que chaque patient y ait droit.'],
     ['Spring 2012, Philadelphia. Emily Whitehead is six, with a leukemia that has relapsed twice and doctors who have no treatment left to offer. The team of researcher Carl June, of the University of Pennsylvania, and that of Children\'s Hospital of Philadelphia take white blood cells from her, T lymphocytes, and reprogram them in the laboratory to recognize leukemia cells. Then they are given back to her. A few days later Emily is in a coma, burning with fever, her organs failing.',
      'The doctors find that her immune system is running wild, a storm of inflammatory molecules, one of which, interleukin 6, is at extreme levels. They give her an arthritis drug that blocks exactly that molecule. Emily wakes up, and the leukemia is gone. More than ten years later she is still in remission.',
      'The therapy has a name, CAR-T. The principle fits in a sentence, a living medicine is manufactured. The patient\'s T cells receive a gene that makes them produce an artificial receptor, the CAR, able to recognize a mark on the surface of cancer cells. They multiply, patrol, and can stay in the body for years. In 2017 the US drug agency approves the first one, Kymriah, against a childhood leukemia, and others follow against lymphomas and myelomas.',
      'But this living medicine is hard to produce. It is made to order for each patient, which takes weeks during which the disease progresses, and it costs several hundred thousand dollars. It can trigger the same storm as in Emily, and it still fails against most solid tumors. In 2026 research is moving on three fronts.',
      'First front, getting out of cancer. In Erlangen, Germany, the team of Georg Schett has treated patients with severe lupus since 2021 with CAR-T cells that eliminate the B lymphocytes responsible for the disease. Several went into remission, without treatment, the immune system seeming to restart from zero. Trials now explore multiple sclerosis and other autoimmune diseases.',
      'Second front, making the therapy inside the body. Rather than collecting, modifying and re-injecting cells, a vector is injected that reprograms the lymphocytes directly in the patient. No more individual factory, far lower costs and delays, and that is what led several large pharmaceutical groups to buy young specialist companies in 2025.',
      'Third front, replacing what is missing rather than destroying what harms. Insulin-producing cells, made from stem cells by the company Vertex, allowed ten of the first twelve patients with type 1 diabetes to do without insulin a year later, according to results published in 2025. Neurons derived from stem cells have been grafted into patients with Parkinson\'s disease, with first results published the same year. The medicine is no longer a molecule, it is a piece of tissue.',
      'One thread ties these three fronts together, proteins. A CAR receptor is a designed protein, and making cells safer, more precise and easier to produce depends on better proteins, which are now drawn by computer. That is also the idea behind our cell guidance tool, telling a cell what to do through a protein designed to order. In 2012 Emily\'s medicine was made by hand for a single child. In 2026 the challenge is no longer to prove that a cell can heal, it is to make it safe and simple enough that every patient has access.']),
    (('Longévité', 'Longevity'), 5,
     'L\'étrange carrière de la rapamycine, née sous les statues de l\'île de Pâques', 'The strange career of rapamycin, born under the statues of Easter Island',
     'Une bactérie du sol, un antifongique oublié, un médicament de greffe, et peut-être un frein au vieillissement. La longévité est d\'abord une affaire d\'années en bonne santé.',
     'A soil bacterium, a forgotten antifungal, a transplant drug, and perhaps a brake on aging. Longevity is first of all a matter of healthy years.',
     ['En 1997, à Arles, Jeanne Calment s\'éteint à 122 ans et 164 jours. Presque trente ans plus tard, personne n\'a fait mieux. Pendant ce temps, l\'espérance de vie moyenne dans le monde a gagné plus de vingt ans depuis 1950. Nous ne repoussons donc pas le plafond de la vie humaine, nous faisons arriver bien plus de monde jusqu\'à un grand âge.',
      'Or ces années gagnées ne sont pas toutes des années en bonne santé. Selon l\'Organisation mondiale de la santé, il s\'écoule en moyenne près de dix ans entre l\'espérance de vie et l\'espérance de vie en bonne santé, dix ans passés avec une maladie chronique, une perte d\'autonomie ou une douleur. La vraie question de la longévité n\'est pas de vivre jusqu\'à 120 ans. C\'est de vivre bien plus longtemps en bonne santé. C\'est le but que nous fixons à notre travail.',
      'Les chercheurs en gérontologie ont une intuition qui change la perspective. Le vieillissement n\'est pas une maladie, mais c\'est le premier facteur de risque de presque toutes, du cancer au diabète, de la maladie d\'Alzheimer aux maladies du coeur. Si l\'on ralentit le vieillissement lui-même, on retarde en même temps toutes ces maladies. Reste à trouver comment.',
      'Une piste est venue d\'un endroit improbable. En 1964, une expédition médicale canadienne se rend sur l\'île de Pâques, que ses habitants appellent Rapa Nui, et rapporte des échantillons de sol. Dans un laboratoire de Montréal, une bactérie de ce sol produit une substance qui arrête la croissance de champignons. On la baptise rapamycine, du nom de l\'île, et on pense avoir trouvé un antifongique.',
      'La molécule est presque oubliée, avant de connaître trois vies successives. On découvre qu\'elle freine le système immunitaire, et elle est approuvée en 1999 pour éviter le rejet des greffes de rein. On comprend ensuite comment elle agit, en se fixant sur une protéine de la cellule baptisée mTOR, d\'après son nom. Cette protéine joue le rôle d\'un chef de gare, elle dit à la cellule quand croître et quand économiser ses ressources.',
      'La troisième vie commence en 2009. Dans un programme américain qui teste des substances sur des souris dans plusieurs laboratoires à la fois, la rapamycine allonge la durée de vie des animaux, de l\'ordre de dix à quinze pour cent selon le sexe, même quand le traitement commence tard, à un âge équivalent à une soixantaine d\'années chez l\'humain. C\'est l\'un des résultats les plus solides du domaine. Chez l\'humain, en revanche, la preuve n\'existe pas encore.',
      'Car la rapamycine est une molécule brute. Elle freine le système immunitaire, elle provoque des aphtes, elle perturbe le sucre et les graisses du sang. Convenable pour un greffé, difficile à justifier pour une personne en bonne santé qui voudrait seulement vieillir mieux. C\'est exactement le profil d\'une molécule prometteuse mise de côté, trop brute et trop difficile à doser, et c\'est le terrain du drug rescue. Notre objectif de recherche est de concevoir, avec NovaDiff, des binders plus fins, qui agissent là où ils le doivent et épargnent le reste.',
      'La longévité ne sera pas un exploit spectaculaire. Elle sera une succession de molécules reprises, affinées et mesurées, avec l\'honnêteté de dire ce qui marche et ce qui ne marche pas. Notre ambition n\'est pas de battre le record de Jeanne Calment. C\'est d\'allonger l\'espérance de vie en bonne santé, une année à la fois.'],
     ['In 1997, in Arles, Jeanne Calment dies at 122 years and 164 days. Almost thirty years later, no one has done better. Meanwhile, average life expectancy worldwide has gained more than twenty years since 1950. We are not pushing back the ceiling of human life, we are bringing far more people to old age.',
      'Yet those extra years are not all healthy ones. According to the World Health Organization, there is on average a gap of nearly ten years between life expectancy and healthy life expectancy, ten years spent with a chronic disease, a loss of independence or pain. The real question of longevity is not living to 120. It is living much longer in good health. That is the goal we set for our work.',
      'Researchers in gerontology share an intuition that changes the perspective. Aging is not a disease, but it is the leading risk factor for almost all of them, from cancer to diabetes, from Alzheimer\'s disease to heart disease. If you slow aging itself, you delay all those diseases at once. What remains is finding how.',
      'One lead came from an unlikely place. In 1964, a Canadian medical expedition travels to Easter Island, which its inhabitants call Rapa Nui, and brings back soil samples. In a laboratory in Montreal, a bacterium from that soil produces a substance that stops the growth of fungi. It is named rapamycin, after the island, and is thought to be an antifungal.',
      'The molecule is nearly forgotten, before living three successive lives. It is found to slow the immune system, and is approved in 1999 to prevent rejection of kidney transplants. Then researchers work out how it acts, by binding a cell protein named mTOR, after the molecule. That protein plays the role of a station master, telling the cell when to grow and when to save its resources.',
      'The third life begins in 2009. In a US program that tests substances on mice in several laboratories at once, rapamycin lengthens the animals\' lives, by roughly ten to fifteen percent depending on sex, even when treatment starts late, at an age equivalent to about sixty in humans. It is one of the most solid results in the field. In humans, however, the proof does not yet exist.',
      'Because rapamycin is a blunt molecule. It slows the immune system, it causes mouth ulcers, it disturbs blood sugar and fats. Acceptable for a transplant patient, hard to justify for a healthy person who simply wants to age better. That is exactly the profile of a promising molecule set aside, too blunt and too hard to dose, and it is the ground of drug rescue. Our research goal is to design, with NovaDiff, sharper binders that act where they should and spare the rest.',
      'Longevity will not be a spectacular feat. It will be a succession of molecules taken up again, refined and measured, with the honesty to say what works and what does not. Our ambition is not to beat Jeanne Calment\'s record. It is to extend healthy life expectancy, one year at a time.']),
]
for _i, (_tag, _min, _tfr, _ten, _xfr, _xen, _bfr, _ben) in enumerate(ARTICLES, 1):
    s(f'a{_i}_tag', _tag[0], _tag[1])
    s(f'a{_i}_title', _tfr, _ten)
    s(f'a{_i}_ex', _xfr, _xen)
    for _j in range(len(_bfr)):
        s(f'a{_i}_p{_j + 1}', _bfr[_j], _ben[_j])

# ------------------------------------------------------------------ contact : la sphère
s('grid_sub', 'Sauvons ensemble le prochain médicament.', 'Let\'s rescue the next drug together.')
s('grid_btn', 'Contact', 'Contact')
s('form_title', 'Dites bonjour', 'Say hello')
s('form_lead', 'Parlez-nous de ce que vous construisez ou de ce qui vous préoccupe. Nous répondons à tout le monde.', 'Tell us what you are building or what is on your mind. We answer everyone.')
s('form_last', 'Nom', 'Last name')
s('form_first', 'Prénom', 'First name')
s('form_email', 'Adresse e-mail', 'Email address')
s('form_email_bad', 'Merci d\'indiquer une adresse e-mail valide', 'Please enter a valid email address')
s('form_sending', 'Envoi en cours', 'Sending')
s('form_sent_title', 'Merci, votre message est envoyé', 'Thank you, your message has been sent')
s('form_sent_text', 'Nous l\'avons bien reçu et nous vous répondrons à l\'adresse e-mail indiquée.', 'We have received it and will reply to the email address you gave us.')
s('form_fail_text', 'L\'envoi automatique n\'a pas abouti. Votre application de messagerie devrait s\'ouvrir. Sinon, copiez le message ci-dessous et envoyez-le à l\'adresse indiquée.', 'Automatic sending did not go through. Your mail app should open. If it does not, copy the message below and send it to the address shown.')
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
s('car_lead', 'Chez BlackPhage, nous construisons NovaDiff, un agent autonome qui conçoit de nouveaux médicaments. Notre équipe réunit biologie, apprentissage automatique et ingénierie, avec une même envie de repousser la frontière du traitable.',
  'At BlackPhage, we build NovaDiff, an autonomous agent that designs new medicines. Our team brings together biology, machine learning and engineering, with one shared drive to move the frontier of the treatable.')
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
s('car_end_h2', 'Postulez maintenant pour résoudre l\'un des problèmes les plus urgents de la découverte de médicaments.', 'Apply now to solve one of the most urgent real-world problems in drug discovery.')
# ------------------------------------------------------------------ le poste à la une : Serial Biotech Builder
s('sbb_eyebrow', 'Poste à la une', 'Featured role')
s('sbb_team', 'Direction scientifique', 'Scientific leadership')
s('sbb_title', 'Serial Biotech Builder', 'Serial Biotech Builder')
s('sbb_lead',
  'Nous recherchons un Serial Biotech Builder confirmé, qui sera le garant scientifique de BlackPhage et qui maximisera la valeur de chaque licence que nous signons. Vous avez déjà bâti des sociétés de biotechnologie, mené des actifs jusqu\'à la preuve de concept in vivo puis jusqu\'à un accord, et vous savez exactement ce qu\'un acheteur demande ensuite. Vous travaillerez main dans la main avec nos fondateurs, nos scientifiques et NovaDiff, et vous défendrez notre science face aux partenaires pharmaceutiques et aux investisseurs.',
  'We are looking for an accomplished Serial Biotech Builder to be the scientific guarantor of BlackPhage and to maximize the value of every license we sign. You have built biotech companies before, taken assets through in vivo proof of concept and into a deal, and you know exactly what a buyer asks for next. You will work hand in hand with our founders, our scientists and NovaDiff, and you will stand behind our science in front of pharma partners and investors.')
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
