export const GAME_VERSION = '1.1.0';
export const MAX_GRID = 21;

export const TIERS = [
  {
    id: 'hatchling',
    name: 'Tortillon',
    subtitle: 'Un foyer sur une jeune carapace',
    grid: 7,
    populationCap: 12,
    prosperityRequired: 0,
    spiritRequired: 0,
    growthRequired: 0,
    description: 'Un petit monde fragile, idéal pour bâtir une maison, quelques cultures et un premier poste de guet.',
    unlocks: ['home', 'farm', 'lumberCamp', 'well', 'watchtower'],
  },
  {
    id: 'wanderer',
    name: 'Tortue nomade',
    subtitle: 'Du foyer au hameau voyageur',
    grid: 11,
    populationCap: 35,
    prosperityRequired: 85,
    spiritRequired: 22,
    growthRequired: 36,
    description: 'La carapace s’élargit. Le hameau peut commercer, exploiter la pierre et prendre la mer.',
    unlocks: ['quarry', 'market', 'harbor', 'palisade', 'healer'],
  },
  {
    id: 'citadel',
    name: 'Tortue-citadelle',
    subtitle: 'Une ville fortifiée sur l’océan',
    grid: 15,
    populationCap: 80,
    prosperityRequired: 250,
    spiritRequired: 70,
    growthRequired: 125,
    description: 'Votre créature-monde porte désormais une véritable cité, capable de se défendre par mer et dans les airs.',
    unlocks: ['workshop', 'ballista', 'skyDock', 'reservoir', 'academy'],
  },
  {
    id: 'ancient',
    name: 'Tortue ancienne',
    subtitle: 'Une région entière sur le dos',
    grid: 19,
    populationCap: 170,
    prosperityRequired: 620,
    spiritRequired: 180,
    growthRequired: 320,
    description: 'Montagnes, bourgs et districts se partagent la carapace d’un être vieux comme les marées.',
    unlocks: ['temple', 'aerie', 'stoneWall', 'greatMarket', 'worldRoot'],
  },
  {
    id: 'worldback',
    name: 'Tortue-monde elder',
    subtitle: 'Un royaume vivant entre mer et ciel',
    grid: 21,
    populationCap: 320,
    prosperityRequired: 1350,
    spiritRequired: 420,
    growthRequired: 760,
    description: 'La créature est devenue un monde. Elle peut fédérer, conquérir ou protéger tout l’archipel des géants.',
    unlocks: ['citadel', 'stormCannon', 'grandSanctuary', 'worldGate'],
  },
];

export const TERRAIN = {
  grass: { name: 'Prairie de carapace', buildable: true, production: null },
  fertile: { name: 'Terreau fertile', buildable: true, production: 'food' },
  forest: { name: 'Bosquet dorsal', buildable: true, production: 'wood' },
  rock: { name: 'Écaille rocheuse', buildable: true, production: 'stone' },
  spring: { name: 'Source sacrée', buildable: true, production: 'spirit' },
  ridge: { name: 'Crête ancienne', buildable: false, production: null },
};

export const BUILDINGS = {
  home: {
    name: 'Maison-coquille', icon: '⌂', category: 'habitat',
    description: 'Abrite quatre habitants et améliore la stabilité du hameau.',
    cost: { wood: 18, stone: 6 }, production: {}, upkeep: { food: 0.03 },
    housing: 4, workers: 0, defense: 0, prosperity: 10, allowed: ['grass', 'fertile', 'forest', 'rock', 'spring'],
  },
  farm: {
    name: 'Terrasse nourricière', icon: '♨', category: 'production',
    description: 'Produit de la nourriture. Rendement doublé sur un terreau fertile.',
    cost: { wood: 12, stone: 2 }, production: { food: 1.45 }, upkeep: {},
    housing: 0, workers: 1, defense: 0, prosperity: 7, allowed: ['grass', 'fertile'],
  },
  lumberCamp: {
    name: 'Bosquet cultivé', icon: '♣', category: 'production',
    description: 'Entretient et récolte les arbres qui poussent entre les écailles.',
    cost: { wood: 6, stone: 4 }, production: { wood: 0.95 }, upkeep: { food: 0.02 },
    housing: 0, workers: 1, defense: 0, prosperity: 7, allowed: ['forest'],
  },
  well: {
    name: 'Puits de rosée', icon: '◉', category: 'support',
    description: 'Condense l’humidité des nuages et soutient les fermes voisines.',
    cost: { wood: 8, stone: 10 }, production: { food: 0.28, spirit: 0.05 }, upkeep: {},
    housing: 0, workers: 0, defense: 0, prosperity: 6, allowed: ['grass', 'fertile', 'rock', 'spring'],
  },
  watchtower: {
    name: 'Tour de vigie', icon: '♜', category: 'defense',
    description: 'Repère les raids et tire sur les petites menaces maritimes ou aériennes.',
    cost: { wood: 22, stone: 14 }, production: {}, upkeep: { food: 0.01 },
    housing: 0, workers: 1, defense: 6, range: 0.72, targets: ['sea', 'air'], fireRate: 1.35,
    prosperity: 12, allowed: ['grass', 'fertile', 'rock', 'spring'],
  },
  quarry: {
    name: 'Carrière d’écaille', icon: '◆', category: 'production',
    description: 'Extrait la pierre minérale accumulée sur les plaques les plus anciennes.',
    cost: { wood: 16, stone: 4 }, production: { stone: 0.82 }, upkeep: { food: 0.02 },
    housing: 0, workers: 1, defense: 0, prosperity: 8, allowed: ['rock'],
  },
  market: {
    name: 'Marché des marées', icon: '¤', category: 'commerce',
    description: 'Transforme une partie des surplus en perles et augmente le bonheur.',
    cost: { wood: 28, stone: 16 }, production: { pearls: 0.20 }, upkeep: { food: 0.05 },
    housing: 0, workers: 2, defense: 0, prosperity: 18, harmony: 2, allowed: ['grass', 'fertile', 'rock', 'spring'],
  },
  harbor: {
    name: 'Port d’écaille', icon: '⚓', category: 'military',
    description: 'Déploie des navires, ouvre les expéditions maritimes et renforce la défense navale.',
    cost: { wood: 42, stone: 22, pearls: 8 }, production: {}, upkeep: { food: 0.05 },
    housing: 0, workers: 2, defense: 11, range: 0.90, targets: ['sea'], fireRate: 1.0,
    prosperity: 22, allowed: ['grass', 'fertile', 'rock', 'spring'],
  },
  palisade: {
    name: 'Palisade vivante', icon: '▥', category: 'defense',
    description: 'Renforce la résistance de la carapace aux abordages.',
    cost: { wood: 15, stone: 5 }, production: {}, upkeep: {},
    housing: 0, workers: 0, defense: 3, armor: 18, prosperity: 5, allowed: ['grass', 'fertile', 'forest', 'rock', 'spring'],
  },
  healer: {
    name: 'Maison des soigneurs', icon: '✚', category: 'support',
    description: 'Restaure lentement la vitalité de la tortue et limite les pertes lors des raids.',
    cost: { wood: 26, stone: 18, spirit: 8 }, production: { vitality: 0.05 }, upkeep: { food: 0.06 },
    housing: 0, workers: 2, defense: 0, prosperity: 14, allowed: ['grass', 'fertile', 'rock', 'spring'],
  },
  workshop: {
    name: 'Atelier dorsal', icon: '⚙', category: 'industry',
    description: 'Produit des mécanismes nécessaires aux défenses lourdes et aux réparations.',
    cost: { wood: 50, stone: 38, pearls: 12 }, production: { parts: 0.18 }, upkeep: { food: 0.08 },
    housing: 0, workers: 3, defense: 0, prosperity: 30, allowed: ['grass', 'rock'],
  },
  ballista: {
    name: 'Baliste des horizons', icon: '➹', category: 'defense',
    description: 'Arme lourde polyvalente contre les monstres marins et les raiders du ciel.',
    cost: { wood: 46, stone: 44, parts: 8 }, production: {}, upkeep: { food: 0.04 },
    housing: 0, workers: 2, defense: 17, range: 1.08, targets: ['sea', 'air'], fireRate: 0.72,
    prosperity: 28, allowed: ['grass', 'rock', 'ridge'],
  },
  skyDock: {
    name: 'Aérodrome suspendu', icon: '⌁', category: 'military',
    description: 'Lance planeurs et dirigeables, autorisant l’exploration et la guerre aériennes.',
    cost: { wood: 58, stone: 30, pearls: 20, parts: 4 }, production: {}, upkeep: { food: 0.09 },
    housing: 0, workers: 3, defense: 13, range: 0.98, targets: ['air'], fireRate: 0.82,
    prosperity: 34, allowed: ['grass', 'rock', 'ridge'],
  },
  reservoir: {
    name: 'Réservoir nuageux', icon: '◒', category: 'support',
    description: 'Stocke l’eau et augmente fortement la production des fermes adjacentes.',
    cost: { wood: 30, stone: 42, parts: 3 }, production: { food: 0.42 }, upkeep: {},
    housing: 0, workers: 1, defense: 0, prosperity: 16, allowed: ['grass', 'fertile', 'rock', 'spring'],
  },
  academy: {
    name: 'Académie des navigateurs', icon: '⌘', category: 'science',
    description: 'Accélère les expéditions et révèle davantage d’informations sur les créatures-mondes.',
    cost: { wood: 52, stone: 40, pearls: 24 }, production: { spirit: 0.10 }, upkeep: { food: 0.08 },
    housing: 0, workers: 3, defense: 0, prosperity: 32, allowed: ['grass', 'fertile', 'rock', 'spring'],
  },
  temple: {
    name: 'Temple des Quatre Piliers', icon: 'Ψ', category: 'spirit',
    description: 'Honore le mythe de la tortue-monde et génère une grande quantité d’essence.',
    cost: { wood: 76, stone: 88, pearls: 35, spirit: 30 }, production: { spirit: 0.56 }, upkeep: { food: 0.12 },
    housing: 0, workers: 4, defense: 0, prosperity: 55, harmony: 6, allowed: ['spring', 'rock', 'grass'],
  },
  aerie: {
    name: 'Nid des grands planeurs', icon: '⋀', category: 'military',
    description: 'Escadre aérienne d’élite capable d’intercepter les menaces avant l’abordage.',
    cost: { wood: 70, stone: 48, pearls: 40, parts: 15 }, production: {}, upkeep: { food: 0.14 },
    housing: 0, workers: 5, defense: 27, range: 1.26, targets: ['air'], fireRate: 0.52,
    prosperity: 58, allowed: ['ridge', 'rock', 'grass'],
  },
  stoneWall: {
    name: 'Muraille de basalte', icon: '▰', category: 'defense',
    description: 'Protège les districts et renforce la vitalité maximale de la tortue ancienne.',
    cost: { stone: 65, parts: 5 }, production: {}, upkeep: {},
    housing: 0, workers: 0, defense: 7, armor: 52, prosperity: 18, allowed: ['grass', 'fertile', 'forest', 'rock', 'spring'],
  },
  greatMarket: {
    name: 'Grand bazar intermonde', icon: '◈', category: 'commerce',
    description: 'Attire des marchands de toutes les créatures-mondes et produit des perles.',
    cost: { wood: 90, stone: 62, pearls: 50, spirit: 18 }, production: { pearls: 0.72 }, upkeep: { food: 0.16 },
    housing: 0, workers: 5, defense: 0, prosperity: 70, harmony: 4, allowed: ['grass', 'fertile', 'rock', 'spring'],
  },
  worldRoot: {
    name: 'Racine du monde', icon: 'ϟ', category: 'spirit',
    description: 'Relie la cité au rêve profond de sa tortue et accélère sa croissance.',
    cost: { wood: 110, stone: 90, spirit: 80 }, production: { spirit: 0.45, growth: 0.34 }, upkeep: { food: 0.12 },
    housing: 0, workers: 3, defense: 0, prosperity: 78, harmony: 8, allowed: ['spring'],
  },
  citadel: {
    name: 'Citadelle des mondes-dos', icon: '♛', category: 'monument',
    description: 'Cœur politique et militaire d’un royaume porté par une tortue elder.',
    cost: { wood: 180, stone: 220, pearls: 120, spirit: 90, parts: 45 }, production: { pearls: 0.65, spirit: 0.34 }, upkeep: { food: 0.30 },
    housing: 20, workers: 8, defense: 34, range: 1.18, targets: ['sea', 'air'], fireRate: 0.48,
    prosperity: 160, harmony: 10, allowed: ['grass', 'rock', 'spring'], unique: true,
  },
  stormCannon: {
    name: 'Canon de tempête', icon: '☈', category: 'defense',
    description: 'Frappe les formations ennemies avec l’énergie des nuages captifs.',
    cost: { stone: 130, pearls: 90, spirit: 55, parts: 36 }, production: {}, upkeep: { food: 0.10 },
    housing: 0, workers: 4, defense: 46, range: 1.42, targets: ['sea', 'air'], fireRate: 0.36, splash: true,
    prosperity: 92, allowed: ['ridge', 'rock'],
  },
  grandSanctuary: {
    name: 'Sanctuaire de la Première Carapace', icon: '✦', category: 'spirit',
    description: 'Stabilise toute la région, soigne la tortue et rayonne sur les alliés.',
    cost: { wood: 120, stone: 160, pearls: 80, spirit: 140 }, production: { spirit: 1.0, vitality: 0.18 }, upkeep: { food: 0.22 },
    housing: 0, workers: 6, defense: 0, prosperity: 120, harmony: 15, allowed: ['spring', 'grass'], unique: true,
  },
  worldGate: {
    name: 'Porte des grands courants', icon: '◎', category: 'monument',
    description: 'Permet de voyager instantanément entre les créatures-mondes alliées.',
    cost: { stone: 180, pearls: 150, spirit: 160, parts: 60 }, production: { pearls: 0.35 }, upkeep: { food: 0.16 },
    housing: 0, workers: 6, defense: 12, prosperity: 145, allowed: ['rock', 'spring'], unique: true,
  },
};

export const BUILD_CATEGORIES = [
  { id: 'all', name: 'Tout' },
  { id: 'habitat', name: 'Habitat' },
  { id: 'production', name: 'Production' },
  { id: 'support', name: 'Soutien' },
  { id: 'commerce', name: 'Commerce' },
  { id: 'defense', name: 'Défense' },
  { id: 'military', name: 'Forces' },
  { id: 'industry', name: 'Industrie' },
  { id: 'science', name: 'Savoir' },
  { id: 'spirit', name: 'Spirituel' },
  { id: 'monument', name: 'Monuments' },
];

export const WORLD_NODE_ARCHETYPES = [
  {
    kind: 'turtle', icon: '🐢', names: ['Ammara', 'Khelon', 'Orméane', 'Talassar', 'Virdos'],
    factions: ['Pèlerins de Jade', 'Ligue des Carapaces', 'Veilleurs des Courants'],
    relation: 18, power: [18, 48], preferred: 'trade', description: 'Une autre tortue-monde portant villages et jardins suspendus.',
  },
  {
    kind: 'whale', icon: '◖', names: ['Mhor-Gale', 'Abyssa', 'Uulmar'],
    factions: ['Cités du Grand Souffle', 'Chorale des Profondeurs'],
    relation: 4, power: [35, 74], preferred: 'spirit', description: 'Une baleine-monde couverte de temples sonores et de ports en ivoire marin.',
  },
  {
    kind: 'crab', icon: '♋', names: ['Bastion-Krabe', 'Rouge-Marche', 'Karsk'],
    factions: ['Clans de la Pince', 'Forgeurs de Sel'],
    relation: -12, power: [42, 92], preferred: 'war', description: 'Un crabe titanesque hérissé de forteresses et de chantiers navals.',
  },
  {
    kind: 'manta', icon: '⌁', names: ['Célestine', 'Manta-Lune', 'Aër-Nava'],
    factions: ['Nomades du Zénith', 'Cour du Vent Blanc'],
    relation: 12, power: [28, 66], preferred: 'air', description: 'Une raie céleste glissant entre les nuages, portant des cités de toile et de verre.',
  },
  {
    kind: 'leviathan', icon: '∿', names: ['Voremar', 'Nhal-Abysse', 'Le Long Silence'],
    factions: ['Essaim des Fosses', 'Sans-Port'],
    relation: -42, power: [58, 130], preferred: 'raid', description: 'Un monstre-monde prédateur dont les excroissances abritent des pillards.',
  },
  {
    kind: 'island', icon: '△', names: ['Atoll des Ancêtres', 'Éclat de Nacre', 'Ruines de l’Aube'],
    factions: ['Site neutre'],
    relation: 0, power: [8, 30], preferred: 'explore', description: 'Un site fixe riche en ressources, légendes et dangers oubliés.',
  },
];

export const EXPEDITIONS = [
  {
    id: 'shoreForage', name: 'Récifs dérivants', icon: '⚑', mode: 'sea', duration: 24,
    requirements: {}, description: 'Récolter bois flotté, pierre ponce et vivres le long des récifs.',
    reward: { wood: [18, 34], stone: [10, 22], food: [20, 38] }, danger: 0.08,
  },
  {
    id: 'deepSalvage', name: 'Épave sous la pluie', icon: '⚓', mode: 'sea', duration: 42,
    requirements: { harbor: 1 }, description: 'Une expédition navale vers une épave chargée de mécanismes anciens.',
    reward: { pearls: [12, 26], parts: [4, 12], stone: [16, 30] }, danger: 0.20,
  },
  {
    id: 'cloudHarvest', name: 'Moisson des nuages', icon: '☁', mode: 'air', duration: 46,
    requirements: { skyDock: 1 }, description: 'Les planeurs captent essence, eau pure et spores célestes.',
    reward: { spirit: [15, 32], food: [22, 46], pearls: [8, 18] }, danger: 0.17,
  },
  {
    id: 'ancientMap', name: 'Route de la Première Écaille', icon: '✧', mode: 'mixed', duration: 70,
    requirements: { academy: 1 }, description: 'Suivre une carte mythique vers un lieu lié à l’origine des tortues-mondes.',
    reward: { spirit: [35, 70], pearls: [25, 52], growth: [35, 72] }, danger: 0.28,
  },
  {
    id: 'kelpPilgrimage', name: 'Jardins de varech', icon: '≋', mode: 'sea', duration: 36,
    requirements: { harbor: 1 }, description: 'Longer les jardins flottants pour recueillir vivres, bois souple et essence marine.',
    reward: { food: [32, 58], wood: [20, 38], spirit: [8, 18] }, danger: 0.12,
  },
  {
    id: 'thunderSurvey', name: 'Veille de l’orage', icon: 'ϟ', mode: 'air', duration: 58,
    requirements: { skyDock: 1, workshop: 1 }, description: 'Observer le front d’orage et récupérer les mécanismes abandonnés dans les courants hauts.',
    reward: { parts: [10, 22], pearls: [18, 36], spirit: [20, 42] }, danger: 0.24,
  },
  {
    id: 'basaltWay', name: 'Chemin des écailles noires', icon: '◆', mode: 'mixed', duration: 64,
    requirements: { harbor: 1, academy: 1 }, description: 'Cartographier une chaîne de récifs basaltiques où reposent des traces de migrations anciennes.',
    reward: { stone: [42, 78], spirit: [24, 48], growth: [24, 52] }, danger: 0.22,
  },
  {
    id: 'elderConvoy', name: 'Convoi des mondes-dos', icon: '◎', mode: 'mixed', duration: 88,
    requirements: { greatMarket: 1, academy: 1 }, description: 'Escorter un convoi entre plusieurs créatures-mondes et rapporter les présents échangés en chemin.',
    reward: { pearls: [58, 105], parts: [20, 40], growth: [48, 90] }, danger: 0.30,
  },
];

export const QUESTS = [
  { id: 'firstFarm', title: 'Nourrir le dos vivant', text: 'Construire une Terrasse nourricière.', type: 'building', target: 'farm', amount: 1, reward: { food: 30, spirit: 5 } },
  { id: 'firstHomes', title: 'Un véritable hameau', text: 'Construire trois Maisons-coquilles.', type: 'building', target: 'home', amount: 3, reward: { wood: 34, stone: 20, pearls: 8 } },
  { id: 'firstWell', title: 'La rosée des hauteurs', text: 'Construire un Puits de rosée.', type: 'building', target: 'well', amount: 1, reward: { wood: 14, stone: 14, spirit: 6 } },
  { id: 'firstWatchtower', title: 'Les yeux sur l’horizon', text: 'Construire une Tour de vigie avant le premier grand raid.', type: 'building', target: 'watchtower', amount: 1, reward: { wood: 24, stone: 16, spirit: 8 } },
  { id: 'population8', title: 'Les voix sur la carapace', text: 'Atteindre 8 habitants.', type: 'population', amount: 8, reward: { spirit: 12, prosperity: 12 } },
  { id: 'firstEvolution', title: 'Le premier grand éveil', text: 'Faire évoluer la tortue au rang Tortue nomade.', type: 'tier', amount: 1, reward: { wood: 65, stone: 45, pearls: 18 } },
  { id: 'firstMarket', title: 'Le pacte des marées', text: 'Construire un Marché des marées.', type: 'building', target: 'market', amount: 1, reward: { food: 35, pearls: 20, prosperity: 12 } },
  { id: 'firstHarbor', title: 'Au-delà de la carapace', text: 'Construire un Port d’écaille.', type: 'building', target: 'harbor', amount: 1, reward: { pearls: 30, food: 60 } },
  { id: 'firstExpedition', title: 'Le monde est un archipel', text: 'Terminer une expédition.', type: 'expedition', amount: 1, reward: { spirit: 25, parts: 8 } },
  { id: 'firstVictory', title: 'La carapace tient bon', text: 'Remporter un raid.', type: 'victory', amount: 1, reward: { pearls: 40, spirit: 30, prosperity: 25 } },
  { id: 'citadelAwakening', title: 'La ville prend racine', text: 'Faire évoluer la tortue au rang Tortue-citadelle.', type: 'tier', amount: 2, reward: { pearls: 45, parts: 12, spirit: 30 } },
  { id: 'firstAcademy', title: 'Lire les grands courants', text: 'Construire une Académie des navigateurs.', type: 'building', target: 'academy', amount: 1, reward: { pearls: 35, parts: 12, growth: 25 } },
  { id: 'seasonedVoyagers', title: 'Des routes entre les mondes', text: 'Terminer cinq expéditions.', type: 'expedition', amount: 5, reward: { pearls: 60, parts: 24, spirit: 45 } },
  { id: 'elder', title: 'Une région vivante', text: 'Atteindre le rang Tortue ancienne.', type: 'tier', amount: 3, reward: { pearls: 110, parts: 35, spirit: 80 } },
  { id: 'worldback', title: 'Le monde sur son dos', text: 'Accomplir la campagne en devenant une Tortue-monde elder.', type: 'tier', amount: 4, reward: { pearls: 180, parts: 60, spirit: 140, prosperity: 100 } },
];

export const RANDOM_EVENTS = [
  {
    id: 'gentleRain', title: 'Pluie tiède', text: 'Une pluie nourricière enveloppe la carapace.',
    choices: [{ label: 'Ouvrir les citernes', effect: { food: 28, harmony: 2 } }],
  },
  {
    id: 'shellCracks', title: 'Écailles fissurées', text: 'Une ancienne plaque se soulève sous un quartier.',
    choices: [
      { label: 'Réparer avec de la pierre', cost: { stone: 22 }, effect: { vitality: 10, prosperity: 3 } },
      { label: 'Laisser la tortue guérir', effect: { vitality: -8, spirit: 8 } },
    ],
  },
  {
    id: 'driftingMerchants', title: 'Marchands dérivants', text: 'Une flottille propose des outils rares contre des vivres.',
    choices: [
      { label: 'Échanger 30 vivres', cost: { food: 30 }, effect: { parts: 8, pearls: 10 } },
      { label: 'Décliner poliment', effect: { harmony: 1 } },
    ],
  },
  {
    id: 'turtleDream', title: 'Le rêve de la tortue', text: 'La nuit, toute la cité entend un chant venu des profondeurs.',
    choices: [
      { label: 'Écouter en silence', effect: { spirit: 18, growth: 7 } },
      { label: 'Organiser une fête', cost: { food: 20 }, effect: { harmony: 5, prosperity: 6 } },
    ],
  },
  {
    id: 'skyShadow', title: 'Ombre dans les nuages', text: 'Une formation inconnue survole la tortue. Amie ou éclaireuse ennemie ?',
    choices: [
      { label: 'Envoyer un signal', effect: { pearls: 8, relation: 3 } },
      { label: 'Armer les tours', effect: { temporaryDefense: 12 } },
    ],
  },
  {
    id: 'lanternMigration', title: 'Migration des lanternes', text: 'Des méduses lumineuses suivent la tortue et éclairent les quartiers bas.',
    choices: [
      { label: 'Partager les réserves', cost: { food: 18 }, effect: { harmony: 4, spirit: 12 } },
      { label: 'Récolter les filaments', effect: { pearls: 14, harmony: -1 } },
    ],
  },
  {
    id: 'deepCurrent', title: 'Le courant profond', text: 'La tortue infléchit soudain sa route vers une mer agitée.',
    choices: [
      { label: 'Renforcer les amarres', cost: { wood: 20 }, effect: { temporaryDefense: 10, vitality: 5 } },
      { label: 'Suivre son instinct', effect: { growth: 12, vitality: -5 } },
    ],
  },
  {
    id: 'lostGlider', title: 'Planeur à la dérive', text: 'Un petit équipage céleste demande refuge après avoir perdu son aérostat.',
    choices: [
      { label: 'Offrir des mécanismes', cost: { parts: 4 }, effect: { spirit: 14, pearls: 12 } },
      { label: 'Récupérer l’épave vide', effect: { parts: 7, wood: 10 } },
    ],
  },
  {
    id: 'shellGarden', title: 'Jardin d’écaille', text: 'Une mousse irisée fleurit autour d’une source sacrée.',
    choices: [
      { label: 'La laisser s’étendre', effect: { spirit: 16, growth: 9 } },
      { label: 'Dégager les chemins', effect: { wood: 14, prosperity: 5 } },
    ],
  },
  {
    id: 'saltFestival', title: 'Fête du sel neuf', text: 'Les habitants veulent célébrer la première récolte de sel de la saison.',
    choices: [
      { label: 'Préparer un grand repas', cost: { food: 28 }, effect: { harmony: 7, prosperity: 8 } },
      { label: 'Organiser une veillée sobre', cost: { food: 10 }, effect: { harmony: 3, spirit: 8 } },
    ],
  },
];

export const ENEMY_TYPES = {
  skiff: { name: 'Skiff pillard', type: 'sea', hp: 24, speed: 0.030, damage: 7, icon: '⛵', reward: { pearls: 4 } },
  rammer: { name: 'Bélier des récifs', type: 'sea', hp: 52, speed: 0.020, damage: 16, icon: '◁', reward: { stone: 7, pearls: 6 } },
  abyssSpawn: { name: 'Rejeton abyssal', type: 'sea', hp: 78, speed: 0.015, damage: 23, icon: '∿', reward: { spirit: 8, pearls: 9 } },
  glider: { name: 'Planeur pirate', type: 'air', hp: 22, speed: 0.038, damage: 6, icon: '⌁', reward: { pearls: 5 } },
  bomber: { name: 'Bombardier des nuages', type: 'air', hp: 48, speed: 0.024, damage: 15, icon: '◇', reward: { parts: 3, pearls: 7 } },
  stormRay: { name: 'Raie-tempête', type: 'air', hp: 82, speed: 0.018, damage: 25, icon: '⋀', reward: { spirit: 10, pearls: 10 } },
};

export const RESOURCE_META = {
  wood: { name: 'Bois', icon: '♣' },
  stone: { name: 'Pierre', icon: '◆' },
  food: { name: 'Vivres', icon: '●' },
  spirit: { name: 'Essence', icon: '✦' },
  pearls: { name: 'Perles', icon: '¤' },
  parts: { name: 'Mécanismes', icon: '⚙' },
};

export const PROGRESS_META = {
  prosperity: { name: 'Prospérité', icon: '◇' },
  growth: { name: 'Croissance', icon: '◉' },
  harmony: { name: 'Harmonie', icon: '♥' },
  vitality: { name: 'Vitalité', icon: '✚' },
  relation: { name: 'Relation', icon: '↗' },
  temporaryDefense: { name: 'Défense temporaire', icon: '♜' },
};
