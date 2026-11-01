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
s('rescue_p', 'BlackPhage est spécialisé en drug rescue. Trop de molécules prometteuses sont mises de côté, non parce qu\'elles ne fonctionnent pas, mais parce qu\'elles sont trop toxiques, trop brutes ou trop difficiles à doser. Nous croyons qu\'elles méritent une seconde chance. Avec NovaDiff, nous comprenons pourquoi un candidat a calé, puis nous le reconcevons en Smart Binder plus fin, qui agit là où il le doit et épargne le reste. Pour les patients, pour les scientifiques qui ont consacré des années à ces idées, et pour les startups qui osent les reprendre.',
  'BlackPhage specializes in drug rescue. Too many promising molecules are set aside, not because they fail to work, but because they are too toxic, too blunt or too hard to dose. We believe they deserve a second chance. With NovaDiff we study why a candidate stalled, then redesign it into a sharper Smart Binder that acts where it should and spares the rest. For patients, for the scientists who spent years on these ideas, and for the startups that dare to pick them back up.')
s('rescue_s1', 'Comprendre pourquoi il a calé', 'Understand why it stalled')
s('rescue_s2', 'Le reconcevoir en Smart Binder', 'Redesign it as a Smart Binder')
s('rescue_s3', 'Le ramener aux patients', 'Bring it back to patients')
s('prog_title', 'Programmes actuels', 'Current programs')
for i, (fr, en) in enumerate([
    ('GLP-1R / GIPR', 'GLP-1R / GIPR'),
    ('Anti-NCOA1 / SRC-1', 'Anti-NCOA1 / SRC-1'),
    ('Bax Inhibitor-1 / TMBIM6', 'Bax Inhibitor-1 / TMBIM6'),
    ('Myostatine (GDF-8) / Activine A', 'Myostatin (GDF-8) / Activin A'),
    ('Sweeper', 'Sweeper'),
    ('Latent-Lock', 'Latent-Lock'),
    ('TNF alpha', 'TNF alpha'),
], 1):
    s(f'prog_{i}', fr, en)
s('culture_title', 'Là où la science rencontre l\'esprit startup', 'Where science meets the startup spirit')

# ------------------------------------------------------------------ NovaDiff
s('nova_eyebrow', 'Notre agent', 'Our agent')
s('nova_title', 'Découvrez NovaDiff', 'Meet NovaDiff')
s('nova_text', 'NovaDiff est notre agent autonome, un modèle interne conçu spécialement pour repousser les frontières actuelles de la conception de médicaments. Ses objectifs sont la médecine personnalisée et une durée moyenne de vie en bonne santé au-delà de 100 ans.',
  'NovaDiff is our in-house autonomous agent, a model designed specifically to push the current frontiers of drug design. Its goals are personalized medicine and an average healthy lifespan beyond 100 years.')
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
s('story_lead', 'Concevoir une protéine pour une cible, c\'est fabriquer la bonne clé pour la bonne serrure et répondre à une question biologique.',
  'Designing a protein for a target means building the right key for the right lock, to answer a biological question.')
s('story_s1t', 'Choisir une cible', 'Pick a target')
s('story_s1', 'Un récepteur à la surface de la cellule commande une voie biologique, une chaîne de signaux qui dit à la cellule quoi faire.',
  'A receptor on the cell surface commands a biological pathway, a chain of signals that tells the cell what to do.')
s('story_s2t', 'Générer par diffusion', 'Generate by diffusion')
s('story_s2', 'Notre agent part du bruit et façonne une protéine en 3D pas à pas, comme un sculpteur qui révèle une forme, jusqu\'à épouser la cible.',
  'Our agent starts from noise and shapes a 3D protein step by step, like a sculptor revealing a form, until it fits the target.')
s('story_s3t', 'Optimiser en temps réel', 'Optimize in real time')
s('story_s3', 'Il affine la structure en continu et vérifie qu\'elle se replie, reste stable et se fixe fermement, jusqu\'à être biophysiquement optimisée.',
  'It keeps refining the structure and checks that it folds, stays stable and binds tightly, until it is biophysically optimized.')
s('story_s4t', 'Activer ou inhiber la voie', 'Turn the pathway on or off')
s('story_s4', 'Fixée à sa cible, la protéine active le récepteur, comme une clé qui tourne, ou le bloque. La voie s\'accélère ou s\'arrête, comme voulu.',
  'Bound to its target, the protein either activates the receptor, like a key turning, or blocks it. The pathway speeds up or stops, as designed.')

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
     'À quoi ressemblera une startup biotech en 2027', 'What a biotech startup will look like in 2027',
     'La donnée est-elle le nouveau pétrole ? Peut-être, mais on ne la pompe pas, on la fabrique, de plus en plus dans des laboratoires que l\'on pilote depuis un écran.',
     'Is data the new oil? Perhaps, but it is not pumped, it is made, more and more in laboratories driven from a screen.',
     ['Imaginez un mardi soir de 2027. À Lyon, une fondatrice relit trois conceptions de protéines proposées par son agent, en retient deux et valide le protocole d\'un clic. Pendant la nuit, dans un bâtiment qu\'elle n\'a jamais visité, des bras robotisés pipettent, mélangent, mesurent. Au petit-déjeuner, les résultats sont là, et l\'agent les a déjà relus. La scène est imaginée, mais ses ingrédients existent déjà.',
      '« Les données sont le nouveau pétrole » est une formule attribuée au mathématicien britannique Clive Humby, en 2006. Il ajoutait une précision souvent oubliée, le pétrole brut ne vaut rien tant qu\'on ne l\'a pas raffiné. Vingt ans plus tard, les géants de l\'intelligence artificielle ont déjà beaucoup puisé dans les textes et les images du web. La biologie n\'a jamais eu de puits aussi généreux. La Protein Data Bank, lancée en 1971 avec sept structures, en compte aujourd\'hui plus de deux cent mille, et c\'est sur elle que s\'est entraîné AlphaFold.',
      'Voilà pourquoi la formule n\'est juste qu\'à moitié. En biologie, la donnée rare n\'est pas celle que l\'on trouve dans les publications. Les articles racontent les réussites et taisent les échecs, si bien qu\'un modèle entraîné dessus apprend la moitié de l\'histoire. Ce qui manque, ce sont des mesures faites dans les mêmes conditions, avec les résultats négatifs, et qui répondent à sa propre question. Cette donnée-là ne se trouve pas, elle se fabrique, expérience après expérience.',
      'Premier pari, et c\'est celui de notre vision. La prochaine vague de réussites ne viendra sans doute pas des modèles généralistes, qui deviennent des commodités que tout le monde loue, mais d\'entreprises d\'intelligence artificielle spécialistes. Elles se consacrent à un seul problème, concevoir des protéines qui se fixent sur un récepteur par exemple, et le connaissent à fond. Leur avantage tient moins au modèle, que d\'autres peuvent copier, qu\'à la donnée propriétaire qu\'elles accumulent en l\'utilisant. Isomorphic Labs, née chez DeepMind, Xaira ou Recursion en sont, chacune à sa manière, des illustrations.',
      'Second pari, l\'outil. Un cloud lab est un laboratoire robotisé que l\'on pilote par logiciel. On envoie un protocole écrit comme un programme, des robots l\'exécutent dans un bâtiment équipé d\'instruments, les données reviennent sur l\'écran. Emerald Cloud Lab, aux États-Unis, fait partie des pionniers, et des universités en ont déjà fait un outil d\'enseignement. Pour une startup, la conséquence est vertigineuse. Un laboratoire n\'est plus un investissement de plusieurs millions à amortir, c\'est une dépense à l\'usage, comme l\'hébergement d\'un site web.',
      'Branchez l\'agent sur le cloud lab et la boucle se ferme. Le modèle propose, le laboratoire mesure, le résultat, bon ou mauvais, revient entraîner le modèle, qui propose mieux. Là où une équipe classique attendait des semaines entre deux expériences, la boucle se compte en jours. La donnée ne dort plus sur un disque, elle est raffinée en continu, et le puits de la formule devient une raffinerie. Les équipes de 2027 comptent donc quelques personnes et beaucoup d\'agents, et se jugent au nombre de boucles bouclées par mois.',
      'Rien de cela ne supprime les difficultés. Un cloud lab ne remplace ni les modèles animaux ni les essais cliniques, il ne sait pas encore tout mesurer et il crée une dépendance envers son fournisseur. Les protocoles doivent être écrits avec une rigueur de programmeur, ce qui est une contrainte autant qu\'une qualité. Mais la direction est tracée. Chez BlackPhage, notre agent génère une protéine par diffusion, puis l\'optimise en temps réel, et chaque mesure qui revient l\'aide à mieux concevoir la suivante.',
      'La donnée est-elle donc le nouveau pétrole ? Nous dirions plutôt qu\'elle est le minerai et que la boucle est le moteur. Le pétrole appartient à celui qui possède le puits. La donnée de 2027 appartiendra à celui qui boucle le plus vite et le plus proprement, et qui dit honnêtement quand il s\'est trompé.'],
     ['Imagine a Tuesday evening in 2027. In Lyon, a founder reviews three protein designs proposed by her agent, keeps two and approves the protocol with a click. Overnight, in a building she has never visited, robotic arms pipette, mix and measure. By breakfast the results are in, and the agent has already read them. The scene is imagined, but its ingredients already exist.',
      '"Data is the new oil" is a phrase attributed to the British mathematician Clive Humby, in 2006. He added a detail often forgotten, crude oil is worth nothing until it is refined. Twenty years on, the giants of artificial intelligence have already drawn heavily on the text and images of the web. Biology never had a well that generous. The Protein Data Bank, launched in 1971 with seven structures, now holds more than two hundred thousand, and AlphaFold learned from it.',
      'That is why the phrase is only half right. In biology, the scarce data is not what you find in publications. Papers tell of successes and stay silent on failures, so a model trained on them learns half the story. What is missing are measurements made under the same conditions, negative results included, answering your own question. That kind of data is not found, it is made, experiment after experiment.',
      'First bet, and it is the one in our vision. The next wave of successes will probably not come from general-purpose models, which are becoming commodities everyone rents, but from specialist artificial intelligence companies. They devote themselves to a single problem, designing proteins that bind a receptor for instance, and know it inside out. Their edge lies less in the model, which others can copy, than in the proprietary data they accumulate by using it. Isomorphic Labs, born at DeepMind, Xaira or Recursion are, each in its own way, illustrations.',
      'Second bet, the tool. A cloud lab is a robotic laboratory driven by software. You send a protocol written like a program, robots run it in a building full of instruments, the data comes back to your screen. Emerald Cloud Lab, in the United States, is among the pioneers, and universities have already made it a teaching tool. For a startup the consequence is staggering. A laboratory is no longer a multimillion investment to amortize, it is a pay-per-use expense, like hosting a website.',
      'Plug the agent into the cloud lab and the loop closes. The model proposes, the laboratory measures, the result, good or bad, comes back to train the model, which proposes better. Where a traditional team waited weeks between two experiments, the loop is counted in days. Data no longer sleeps on a disk, it is refined continuously, and the well of the phrase becomes a refinery. The teams of 2027 therefore number a few people and many agents, and judge themselves by the loops completed per month.',
      'None of this removes the difficulties. A cloud lab replaces neither animal models nor clinical trials, it cannot yet measure everything and it creates dependence on its provider. Protocols must be written with a programmer\'s rigor, which is a constraint as much as a quality. But the direction is set. At BlackPhage, our agent generates a protein by diffusion, then optimizes it in real time, and every measurement that comes back helps it design the next one better.',
      'Is data, then, the new oil? We would rather say it is the ore and the loop is the engine. Oil belongs to whoever owns the well. The data of 2027 will belong to whoever loops fastest and most cleanly, and says honestly when they were wrong.']),
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
