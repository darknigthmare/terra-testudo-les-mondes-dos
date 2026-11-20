import {
  BUILDINGS,
  ENEMY_TYPES,
  EXPEDITIONS,
  GAME_VERSION,
  MAX_GRID,
  QUESTS,
  RANDOM_EVENTS,
  TERRAIN,
  TIERS,
  WORLD_NODE_ARCHETYPES,
} from './data.js';

const SAVE_KEY = 'terra-testudo-save-v1';
const AUTOSAVE_KEY = 'terra-testudo-autosave-v1';
const WORLD_ACTION_COOLDOWNS = {
  trade: 24,
  explore: 42,
  attack: 60,
};

function buildingProgressContribution(buildingId) {
  const data = BUILDINGS[buildingId];
  if (!data) return { prosperity: 0, growth: 0 };
  return {
    prosperity: Math.max(0, Number(data.prosperity) || 0),
    growth: Math.max(1, (Number(data.prosperity) || 0) * 0.12),
  };
}

function removeBuildingProgress(state, building) {
  if (!building) return;
  const fallback = buildingProgressContribution(building.id);
  const stored = building.progressContribution && typeof building.progressContribution === 'object'
    ? building.progressContribution
    : fallback;
  const prosperity = Number.isFinite(Number(stored.prosperity)) ? Math.max(0, Number(stored.prosperity)) : fallback.prosperity;
  const growth = Number.isFinite(Number(stored.growth)) ? Math.max(0, Number(stored.growth)) : fallback.growth;
  state.prosperity = Math.max(0, state.prosperity - prosperity);
  state.growth = Math.max(0, state.growth - growth);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

export function tileKey(x, y) {
  return `${x},${y}`;
}

export function activeBounds(state) {
  const size = TIERS[state.tier].grid;
  const start = Math.floor((MAX_GRID - size) / 2);
  return { start, end: start + size - 1, size };
}

export function isTileActive(state, x, y) {
  const bounds = activeBounds(state);
  return x >= bounds.start && x <= bounds.end && y >= bounds.start && y <= bounds.end;
}

export function getTile(state, x, y) {
  if (x < 0 || y < 0 || x >= MAX_GRID || y >= MAX_GRID) return null;
  return state.tiles[y * MAX_GRID + x] || null;
}

export function getNeighborTiles(state, x, y) {
  return [
    getTile(state, x - 1, y),
    getTile(state, x + 1, y),
    getTile(state, x, y - 1),
    getTile(state, x, y + 1),
  ].filter(Boolean);
}

function generateTerrain(seed) {
  const rng = mulberry32(seed);
  const tiles = [];
  const center = Math.floor(MAX_GRID / 2);

  for (let y = 0; y < MAX_GRID; y += 1) {
    for (let x = 0; x < MAX_GRID; x += 1) {
      const distance = Math.hypot(x - center, y - center) / (MAX_GRID * 0.72);
      const r = rng();
      let terrain = 'grass';
      if (r < 0.15) terrain = 'forest';
      else if (r < 0.27) terrain = 'rock';
      else if (r < 0.39) terrain = 'fertile';
      else if (r < 0.44) terrain = 'spring';
      else if (r > 0.92 && distance > 0.35) terrain = 'ridge';
      tiles.push({ x, y, terrain, building: null, damage: 0 });
    }
  }

  const force = (dx, dy, terrain) => {
    const tile = tiles[(center + dy) * MAX_GRID + center + dx];
    tile.terrain = terrain;
    tile.building = null;
  };
  force(0, 0, 'grass');
  force(1, 0, 'fertile');
  force(-1, 0, 'forest');
  force(0, 1, 'rock');
  force(0, -1, 'spring');
  force(1, 1, 'grass');
  force(-1, -1, 'grass');
  return tiles;
}

function generateWorldNodes(seed) {
  const rng = mulberry32(seed ^ 0x7f4a7c15);
  const nodes = [];
  const count = 9;
  for (let i = 0; i < count; i += 1) {
    const archetype = pick(rng, WORLD_NODE_ARCHETYPES);
    const name = pick(rng, archetype.names);
    const faction = pick(rng, archetype.factions);
    const minDistance = 0.28;
    nodes.push({
      id: `world-${i}-${Math.floor(rng() * 99999)}`,
      kind: archetype.kind,
      name,
      faction,
      description: archetype.description,
      preferred: archetype.preferred,
      relation: clamp(archetype.relation + randomInt(rng, -12, 12), -100, 100),
      power: randomInt(rng, archetype.power[0], archetype.power[1]),
      angle: (Math.PI * 2 * i) / count + rng() * 0.5,
      distance: minDistance + rng() * 0.58,
      altitude: archetype.kind === 'manta' ? 'air' : 'sea',
      discovered: i < 3,
      visited: false,
      explored: false,
      explorationCount: 0,
      defeated: false,
      cooldown: 0,
      tradeCount: 0,
    });
  }
  return nodes;
}

export function createGame(options = {}) {
  const seed = Number.isFinite(options.seed) ? options.seed : Math.floor(Math.random() * 2_000_000_000);
  const tiles = generateTerrain(seed);
  const center = Math.floor(MAX_GRID / 2);
  const difficulty = options.difficulty || 'voyage';
  const difficultyData = {
    conte: { raidMultiplier: 0.72, productionMultiplier: 1.18, label: 'Conte' },
    voyage: { raidMultiplier: 1, productionMultiplier: 1, label: 'Voyage' },
    tempete: { raidMultiplier: 1.32, productionMultiplier: 0.92, label: 'Tempête' },
  }[difficulty] || { raidMultiplier: 1, productionMultiplier: 1, label: 'Voyage' };

  const state = {
    version: GAME_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    savedAt: 0,
    seed,
    cityName: (options.cityName || 'Havre-d’Écaille').trim().slice(0, 32) || 'Havre-d’Écaille',
    turtleName: (options.turtleName || 'Oroméa').trim().slice(0, 28) || 'Oroméa',
    difficulty,
    difficultyData,
    tier: 0,
    resources: {
      wood: 92,
      stone: 62,
      food: 105,
      spirit: 12,
      pearls: 7,
      parts: 0,
    },
    population: 3,
    prosperity: 14,
    growth: 8,
    harmony: 72,
    vitality: 100,
    satiety: 78,
    day: 1,
    dayProgress: 0.24,
    totalSeconds: 0,
    gameSpeed: 1,
    paused: false,
    weather: 'Clair',
    tiles,
    worldNodes: generateWorldNodes(seed),
    selectedWorldNodeId: null,
    expeditions: [],
    combat: null,
    pendingRaid: null,
    temporaryDefense: 0,
    event: null,
    // Laisse au joueur le temps de suivre le guide et d'installer ses premières défenses.
    nextEventIn: 90,
    nextRaidIn: 180,
    messages: [],
    completedQuests: [],
    claimedQuests: [],
    questProgress: {},
    stats: {
      buildingsPlaced: 1,
      buildingsLost: 0,
      expeditionsCompleted: 0,
      raidsWon: 0,
      raidsLost: 0,
      trades: 0,
      worldsVisited: 0,
      enemiesDefeated: 0,
      totalProsperityEarned: 14,
    },
    tutorialStep: 0,
  };

  const centerTile = getTile(state, center, center);
  centerTile.building = {
    id: 'home',
    level: 1,
    hp: 100,
    cooldown: 0,
    progressContribution: buildingProgressContribution('home'),
  };
  pushMessage(state, `Bienvenue à ${state.cityName}, sur le dos de ${state.turtleName}.`, 'good');
  pushMessage(state, 'Construisez une ferme, puis faites grandir la cité et sa tortue-monde.', 'info');
  updateQuestProgress(state);
  return state;
}

export function pushMessage(state, text, tone = 'info') {
  state.messages.unshift({ id: `${Date.now()}-${Math.random()}`, text, tone, at: state.totalSeconds });
  state.messages = state.messages.slice(0, 24);
}

export function countBuildings(state, buildingId = null) {
  let count = 0;
  for (const tile of state.tiles) {
    if (!tile.building) continue;
    if (!buildingId || tile.building.id === buildingId) count += 1;
  }
  return count;
}

export function unlockedBuildingIds(state) {
  const ids = new Set();
  for (let tier = 0; tier <= state.tier; tier += 1) {
    for (const id of TIERS[tier].unlocks) ids.add(id);
  }
  return [...ids];
}

export function canAfford(state, cost = {}) {
  return Object.entries(cost).every(([resource, amount]) => (state.resources[resource] || 0) >= amount);
}

export function spendResources(state, cost = {}) {
  if (!canAfford(state, cost)) return false;
  for (const [resource, amount] of Object.entries(cost)) {
    state.resources[resource] = Math.max(0, (state.resources[resource] || 0) - amount);
  }
  return true;
}

export function addResources(state, reward = {}) {
  for (const [resource, amount] of Object.entries(reward)) {
    if (resource === 'prosperity') {
      state.prosperity += amount;
      state.stats.totalProsperityEarned += Math.max(0, amount);
    } else if (resource === 'growth') {
      state.growth += amount;
    } else if (resource === 'harmony') {
      state.harmony = clamp(state.harmony + amount, 0, 100);
    } else if (resource === 'vitality') {
      state.vitality = clamp(state.vitality + amount, 0, getEconomy(state).maxVitality);
    } else if (resource === 'relation') {
      const node = state.worldNodes.find((item) => item.id === state.selectedWorldNodeId && item.discovered && !item.defeated)
        || state.worldNodes.find((item) => item.discovered && !item.defeated);
      if (node) node.relation = clamp(node.relation + amount, -100, 100);
    } else if (resource === 'temporaryDefense') {
      state.temporaryDefense += amount;
    } else {
      state.resources[resource] = Math.max(0, (state.resources[resource] || 0) + amount);
    }
  }
}

export function buildingCostAt(state, buildingId) {
  const building = BUILDINGS[buildingId];
  if (!building) return {};
  const count = countBuildings(state, buildingId);
  const escalation = building.unique ? 1 : 1 + Math.max(0, count - 1) * 0.06;
  return Object.fromEntries(Object.entries(building.cost).map(([resource, amount]) => [resource, Math.ceil(amount * escalation)]));
}

export function validateBuild(state, buildingId, x, y) {
  const data = BUILDINGS[buildingId];
  const tile = getTile(state, x, y);
  if (!data) return { ok: false, reason: 'Bâtiment inconnu.' };
  if (!unlockedBuildingIds(state).includes(buildingId)) return { ok: false, reason: 'Bâtiment non débloqué.' };
  if (!isTileActive(state, x, y)) return { ok: false, reason: 'Cette partie de la carapace n’est pas encore éveillée.' };
  if (!tile) return { ok: false, reason: 'Case invalide.' };
  if (tile.building) return { ok: false, reason: 'Cette case est déjà occupée.' };
  if (!data.allowed.includes(tile.terrain)) return { ok: false, reason: `Terrain incompatible : ${TERRAIN[tile.terrain].name}.` };
  if (data.unique && countBuildings(state, buildingId) > 0) return { ok: false, reason: 'Ce monument est unique.' };
  const cost = buildingCostAt(state, buildingId);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Ressources insuffisantes.' };
  return { ok: true, cost };
}

export function placeBuilding(state, buildingId, x, y) {
  const validation = validateBuild(state, buildingId, x, y);
  if (!validation.ok) return validation;
  if (!spendResources(state, validation.cost)) return { ok: false, reason: 'Ressources insuffisantes.' };
  const tile = getTile(state, x, y);
  const progressContribution = buildingProgressContribution(buildingId);
  tile.building = { id: buildingId, level: 1, hp: 100, cooldown: 0, progressContribution };
  const data = BUILDINGS[buildingId];
  state.prosperity += progressContribution.prosperity;
  state.growth += progressContribution.growth;
  state.stats.totalProsperityEarned += data.prosperity;
  state.stats.buildingsPlaced += 1;
  state.harmony = clamp(state.harmony + (data.harmony || 0) * 0.35, 0, 100);
  pushMessage(state, `${data.name} construit.`, 'good');
  updateQuestProgress(state);
  return { ok: true };
}

export function demolishBuilding(state, x, y) {
  const tile = getTile(state, x, y);
  if (!tile?.building) return { ok: false, reason: 'Aucun bâtiment.' };
  const data = BUILDINGS[tile.building.id];
  if (tile.x === Math.floor(MAX_GRID / 2) && tile.y === Math.floor(MAX_GRID / 2) && tile.building.id === 'home') {
    return { ok: false, reason: 'Le foyer fondateur ne peut pas être démoli.' };
  }
  const refund = {};
  for (const [resource, amount] of Object.entries(data.cost)) refund[resource] = Math.floor(amount * 0.4);
  addResources(state, refund);
  removeBuildingProgress(state, tile.building);
  tile.building = null;
  pushMessage(state, `${data.name} démoli : une partie des matériaux a été récupérée.`, 'warn');
  updateQuestProgress(state);
  return { ok: true, refund };
}

export function repairBuilding(state, x, y) {
  const tile = getTile(state, x, y);
  if (!tile?.building || tile.building.hp >= 99.5) return { ok: false, reason: 'Aucune réparation nécessaire.' };
  const missing = 100 - tile.building.hp;
  const cost = { wood: Math.ceil(missing * 0.12), stone: Math.ceil(missing * 0.16) };
  if (!spendResources(state, cost)) return { ok: false, reason: 'Matériaux insuffisants.' };
  tile.building.hp = 100;
  pushMessage(state, `${BUILDINGS[tile.building.id].name} réparé.`, 'good');
  return { ok: true };
}

function terrainMultiplier(tile, buildingId) {
  if (buildingId === 'farm' && tile.terrain === 'fertile') return 1.85;
  if (buildingId === 'lumberCamp' && tile.terrain === 'forest') return 1.35;
  if (buildingId === 'quarry' && tile.terrain === 'rock') return 1.35;
  if ((buildingId === 'temple' || buildingId === 'worldRoot') && tile.terrain === 'spring') return 1.35;
  return 1;
}

function homeNeighborSupport(state, tile) {
  return getNeighborTiles(state, tile.x, tile.y)
    .filter((neighbor) => isTileActive(state, neighbor.x, neighbor.y)
      && ['market', 'greatMarket', 'temple', 'grandSanctuary'].includes(neighbor.building?.id))
    .length;
}

function adjacencyMultiplier(state, tile, buildingId) {
  const neighbors = getNeighborTiles(state, tile.x, tile.y);
  let multiplier = 1;
  if (buildingId === 'farm') {
    // The reservoir is described as a strong neighbour boost, so it outweighs the simple well.
    for (const neighbor of neighbors) {
      if (neighbor.building?.id === 'reservoir') multiplier += 0.34;
      else if (neighbor.building?.id === 'well') multiplier += 0.18;
    }
  }
  const data = BUILDINGS[buildingId];
  if (data?.defense > 0 && data.targets?.length) {
    const walls = neighbors.filter((neighbor) => ['palisade', 'stoneWall'].includes(neighbor.building?.id)).length;
    multiplier += walls * 0.08;
  }
  return multiplier;
}

export function getEconomy(state) {
  const totals = {
    production: { wood: 0, stone: 0, food: 0, spirit: 0, pearls: 0, parts: 0, vitality: 0, growth: 0 },
    upkeep: { food: 0 },
    housing: 2,
    workersRequired: 0,
    defense: state.temporaryDefense || 0,
    seaDefense: state.temporaryDefense || 0,
    airDefense: state.temporaryDefense || 0,
    armor: 0,
    harmonyBonus: 0,
    maxVitality: 100 + state.tier * 45,
    buildingCount: 0,
  };

  const activeBuildings = [];
  for (const tile of state.tiles) {
    if (!tile.building || !isTileActive(state, tile.x, tile.y)) continue;
    const data = BUILDINGS[tile.building.id];
    if (!data) continue;
    activeBuildings.push({ tile, data });
    const homeSupport = tile.building.id === 'home' ? homeNeighborSupport(state, tile) : 0;
    totals.housing += (data.housing || 0) + homeSupport;
    totals.workersRequired += data.workers || 0;
    totals.armor += data.armor || 0;
    totals.maxVitality += data.armor || 0;
    totals.harmonyBonus += (data.harmony || 0) + homeSupport * 2;
    totals.buildingCount += 1;
  }

  totals.housing = Math.min(totals.housing, TIERS[state.tier].populationCap);
  const availableWorkers = Math.max(1, Math.floor(state.population * 0.72));
  const workerEfficiency = totals.workersRequired > 0 ? clamp(availableWorkers / totals.workersRequired, 0.28, 1) : 1;
  totals.workerEfficiency = workerEfficiency;

  for (const { tile, data } of activeBuildings) {
    const hpFactor = clamp(tile.building.hp / 100, 0.2, 1);
    const efficiency = data.workers > 0 ? workerEfficiency : 1;
    const multiplier = terrainMultiplier(tile, tile.building.id) * adjacencyMultiplier(state, tile, tile.building.id) * hpFactor * efficiency;
    for (const [resource, amount] of Object.entries(data.production || {})) {
      totals.production[resource] = (totals.production[resource] || 0) + amount * multiplier;
    }
    for (const [resource, amount] of Object.entries(data.upkeep || {})) {
      totals.upkeep[resource] = (totals.upkeep[resource] || 0) + amount * hpFactor;
    }
    if (data.defense) {
      const defense = data.defense * adjacencyMultiplier(state, tile, tile.building.id) * hpFactor * efficiency;
      totals.defense += defense;
      if (data.targets?.includes('sea')) totals.seaDefense += defense;
      if (data.targets?.includes('air')) totals.airDefense += defense;
    }
  }

  totals.upkeep.food += state.population * 0.018;
  const weatherModifiers = {
    'Pluie nourricière': { food: 1.16, spirit: 1.05 },
    'Brume nacrée': { pearls: 1.12, wood: 0.96 },
    'Vents hauts': { spirit: 1.10, food: 0.94 },
    'Mer d’huile': { food: 1.05, pearls: 1.05 },
    'Orage lointain': { parts: 1.08, spirit: 1.08 },
  }[state.weather] || {};
  for (const [resource, multiplier] of Object.entries(weatherModifiers)) {
    totals.production[resource] = (totals.production[resource] || 0) * multiplier;
  }
  totals.net = {};
  for (const resource of ['wood', 'stone', 'food', 'spirit', 'pearls', 'parts']) {
    totals.net[resource] = (totals.production[resource] || 0) * state.difficultyData.productionMultiplier - (totals.upkeep[resource] || 0);
  }
  return totals;
}

export function feedTurtle(state) {
  const cost = { food: 28 };
  if (!spendResources(state, cost)) return { ok: false, reason: 'Il faut 28 vivres.' };
  state.satiety = clamp(state.satiety + 26, 0, 100);
  state.growth += 2.5;
  state.harmony = clamp(state.harmony + 1, 0, 100);
  pushMessage(state, `${state.turtleName} a été nourrie. Sa marche devient plus assurée.`, 'good');
  return { ok: true };
}

export function canEvolve(state) {
  if (state.tier >= TIERS.length - 1) return { ok: false, reason: 'La forme elder ultime est déjà atteinte.' };
  if (state.event) return { ok: false, reason: 'Résolvez l’événement en cours avant de lancer le rituel.' };
  if (state.pendingRaid) return { ok: false, reason: 'La menace en approche doit être repoussée avant le rituel.' };
  if (state.combat) return { ok: false, reason: 'Impossible d’évoluer pendant un raid.' };
  const next = TIERS[state.tier + 1];
  const missing = [];
  if (state.prosperity < next.prosperityRequired) missing.push(`${Math.ceil(next.prosperityRequired - state.prosperity)} prospérité`);
  if (state.resources.spirit < next.spiritRequired) missing.push(`${Math.ceil(next.spiritRequired - state.resources.spirit)} essence`);
  if (state.growth < next.growthRequired) missing.push(`${Math.ceil(next.growthRequired - state.growth)} croissance`);
  if (state.harmony < 45) missing.push('harmonie à 45 minimum');
  if (state.satiety < 35) missing.push('satiété à 35 minimum');
  return missing.length ? { ok: false, reason: `Il manque : ${missing.join(', ')}.` } : { ok: true, next };
}

export function evolve(state) {
  const validation = canEvolve(state);
  if (!validation.ok) return validation;
  const next = validation.next;
  const ritualCost = Math.ceil(next.spiritRequired * 0.45);
  state.resources.spirit = Math.max(0, state.resources.spirit - ritualCost);
  state.tier += 1;
  state.vitality = getEconomy(state).maxVitality;
  state.satiety = clamp(state.satiety - 12, 0, 100);
  state.harmony = clamp(state.harmony + 10, 0, 100);
  state.prosperity += 20 * state.tier;
  state.stats.totalProsperityEarned += 20 * state.tier;
  const revealCount = Math.min(state.worldNodes.length, 3 + state.tier * 2);
  for (let i = 0; i < revealCount; i += 1) state.worldNodes[i].discovered = true;
  pushMessage(state, `${state.turtleName} devient ${next.name}. Une nouvelle région de carapace s’éveille !`, 'legend');
  updateQuestProgress(state);
  return { ok: true, tier: state.tier };
}

export function currentQuest(state) {
  return QUESTS.find((quest) => !state.claimedQuests.includes(quest.id)) || null;
}

export function questValue(state, quest) {
  if (!quest) return 0;
  if (quest.type === 'building') return countBuildings(state, quest.target);
  if (quest.type === 'population') return Math.floor(state.population);
  if (quest.type === 'tier') return state.tier;
  if (quest.type === 'expedition') return state.stats.expeditionsCompleted;
  if (quest.type === 'victory') return state.stats.raidsWon;
  return state.questProgress[quest.id] || 0;
}

export function updateQuestProgress(state) {
  for (const quest of QUESTS) {
    state.questProgress[quest.id] = questValue(state, quest);
    if (questValue(state, quest) >= quest.amount && !state.completedQuests.includes(quest.id)) {
      state.completedQuests.push(quest.id);
      pushMessage(state, `Objectif accompli : ${quest.title}. Récompense disponible.`, 'legend');
    }
  }
}

export function claimQuest(state, questId) {
  const quest = QUESTS.find((item) => item.id === questId);
  if (!quest || !state.completedQuests.includes(questId) || state.claimedQuests.includes(questId)) {
    return { ok: false, reason: 'Récompense indisponible.' };
  }
  addResources(state, quest.reward);
  state.claimedQuests.push(questId);
  pushMessage(state, `Récompense reçue : ${quest.title}.`, 'good');
  updateQuestProgress(state);
  return { ok: true };
}

export function expeditionAvailable(state, expedition) {
  for (const [buildingId, amount] of Object.entries(expedition.requirements || {})) {
    if (countBuildings(state, buildingId) < amount) return false;
  }
  return true;
}

export function startExpedition(state, expeditionId) {
  const data = EXPEDITIONS.find((item) => item.id === expeditionId);
  if (!data) return { ok: false, reason: 'Expédition inconnue.' };
  if (state.event) return { ok: false, reason: 'Résolvez l’événement en cours avant de préparer une expédition.' };
  if (state.pendingRaid) return { ok: false, reason: 'Une menace approche : les équipages doivent défendre la cité.' };
  if (state.combat) return { ok: false, reason: 'Les équipages sont mobilisés par le raid en cours.' };
  if (!expeditionAvailable(state, data)) return { ok: false, reason: 'Infrastructure requise non construite.' };
  if (state.expeditions.length >= 2 + (countBuildings(state, 'academy') > 0 ? 1 : 0)) return { ok: false, reason: 'Toutes les équipes sont déjà parties.' };
  const cost = { food: Math.max(8, Math.ceil(data.duration * 0.32)) };
  if (!spendResources(state, cost)) return { ok: false, reason: 'Pas assez de vivres pour préparer l’expédition.' };
  const academyBonus = countBuildings(state, 'academy') * 0.12;
  state.expeditions.push({
    id: `${data.id}-${Date.now()}-${Math.random()}`,
    dataId: data.id,
    remaining: data.duration * (1 - Math.min(0.35, academyBonus)),
    total: data.duration * (1 - Math.min(0.35, academyBonus)),
    danger: data.danger,
  });
  pushMessage(state, `Expédition lancée : ${data.name}.`, 'info');
  return { ok: true };
}

function rollReward(state, ranges, salt) {
  const rng = mulberry32((state.seed ^ Math.floor(state.totalSeconds * 1000) ^ hashString(salt)) >>> 0);
  const reward = {};
  for (const [resource, [min, max]] of Object.entries(ranges)) reward[resource] = randomInt(rng, min, max);
  return reward;
}

function completeExpedition(state, expedition) {
  const data = EXPEDITIONS.find((item) => item.id === expedition.dataId);
  if (!data) return;
  const reward = rollReward(state, data.reward, expedition.id);
  const rng = mulberry32(hashString(expedition.id) ^ state.seed);
  const accident = rng() < data.danger * state.difficultyData.raidMultiplier;
  if (accident) {
    for (const resource of Object.keys(reward)) reward[resource] = Math.floor(reward[resource] * 0.62);
    state.harmony = clamp(state.harmony - 2, 0, 100);
    pushMessage(state, `${data.name} revient après un incident. La cargaison est réduite.`, 'warn');
  } else {
    pushMessage(state, `${data.name} revient avec une riche cargaison.`, 'good');
  }
  addResources(state, reward);
  state.stats.expeditionsCompleted += 1;
  state.growth += 4 + data.duration * 0.04;
  updateQuestProgress(state);
}

export function triggerRandomEvent(state) {
  if (state.event || state.combat) return false;
  const rng = mulberry32((state.seed + Math.floor(state.totalSeconds * 17)) >>> 0);
  const event = { ...pick(rng, RANDOM_EVENTS), openedAt: state.totalSeconds };
  state.event = event;
  state.paused = true;
  return true;
}

export function resolveEvent(state, choiceIndex) {
  if (!state.event) return { ok: false, reason: 'Aucun événement.' };
  const choice = state.event.choices[choiceIndex];
  if (!choice) return { ok: false, reason: 'Choix invalide.' };
  if (choice.cost && !spendResources(state, choice.cost)) return { ok: false, reason: 'Ressources insuffisantes pour ce choix.' };
  addResources(state, choice.effect || {});
  pushMessage(state, `${state.event.title} : ${choice.label}.`, 'info');
  state.event = null;
  state.paused = false;
  state.nextEventIn = 65 + Math.random() * 55;
  return { ok: true };
}

function buildEnemyWave(state, forcedType = null, sourceNode = null) {
  const rng = mulberry32((state.seed ^ Math.floor(state.totalSeconds * 100) ^ 0xaf35) >>> 0);
  const tier = state.tier;
  const type = forcedType || (rng() > 0.48 ? 'sea' : 'air');
  const pool = type === 'sea' ? ['skiff', 'rammer', 'abyssSpawn'] : ['glider', 'bomber', 'stormRay'];
  const sourcePower = sourceNode ? clamp(Number(sourceNode.power) || 0, 0, 150) : 0;
  const sourceBudgetMultiplier = sourceNode ? clamp(0.75 + sourcePower / 180, 0.78, 1.65) : 1;
  const sourceUnitMultiplier = sourceNode ? clamp(0.9 + sourcePower / 400, 0.9, 1.28) : 1;
  const budget = (28 + tier * 28 + state.prosperity * 0.035) * state.difficultyData.raidMultiplier * sourceBudgetMultiplier;
  const enemies = [];
  let spent = 0;
  let guard = 0;
  while (spent < budget && guard < 18) {
    guard += 1;
    const maxIndex = Math.min(pool.length - 1, Math.floor(tier / 2) + (rng() > 0.72 ? 1 : 0));
    const id = pool[randomInt(rng, 0, maxIndex)];
    const base = ENEMY_TYPES[id];
    const scale = (0.88 + tier * 0.12 + rng() * 0.22) * sourceUnitMultiplier;
    const angle = rng() * Math.PI * 2;
    enemies.push({
      uid: `enemy-${Date.now()}-${guard}-${Math.floor(rng() * 9999)}`,
      id,
      type: base.type,
      hp: base.hp * scale,
      maxHp: base.hp * scale,
      speed: base.speed * (0.86 + rng() * 0.28),
      damage: base.damage * scale,
      angle,
      distance: 1.18 + rng() * 0.25,
      laneOffset: (rng() - 0.5) * 0.20,
      hitFlash: 0,
    });
    spent += base.hp;
  }
  return { type, enemies, sourceNodeId: sourceNode?.id || null };
}

export function startRaid(state, forcedType = null, sourceNode = null) {
  if (state.combat) return { ok: false, reason: 'Un combat est déjà en cours.' };
  const wave = buildEnemyWave(state, forcedType, sourceNode);
  state.combat = {
    id: `raid-${Date.now()}`,
    type: wave.type,
    enemies: wave.enemies,
    projectiles: [],
    elapsed: 0,
    sourceNodeId: wave.sourceNodeId,
    outcome: null,
    reward: {},
    damageTaken: 0,
    breaches: 0,
    kills: 0,
    temporaryCooldown: 0,
  };
  state.pendingRaid = null;
  state.paused = false;
  pushMessage(state, `ALERTE : raid ${wave.type === 'sea' ? 'maritime' : 'aérien'} en approche !`, 'danger');
  return { ok: true };
}

function chooseDefenseTarget(state, data, enemies) {
  const valid = enemies.filter((enemy) => enemy.hp > 0 && (!data.targets || data.targets.includes(enemy.type)) && enemy.distance <= (data.range || 0.75));
  valid.sort((a, b) => a.distance - b.distance);
  return valid[0] || null;
}

function applySplash(enemies, target, damage) {
  for (const enemy of enemies) {
    if (enemy.uid === target.uid || enemy.hp <= 0) continue;
    const angular = Math.abs(Math.atan2(Math.sin(enemy.angle - target.angle), Math.cos(enemy.angle - target.angle)));
    if (angular < 0.28 && Math.abs(enemy.distance - target.distance) < 0.18) {
      enemy.hp -= damage * 0.35;
      enemy.hitFlash = 0.12;
    }
  }
}

function damageRandomBuilding(state, amount, rng) {
  const candidates = state.tiles.filter((tile) => tile.building && isTileActive(state, tile.x, tile.y));
  if (!candidates.length) return;
  const tile = pick(rng, candidates);
  tile.building.hp -= amount;
  if (tile.building.hp <= 0) {
    const name = BUILDINGS[tile.building.id].name;
    removeBuildingProgress(state, tile.building);
    tile.building = null;
    state.stats.buildingsLost += 1;
    state.harmony = clamp(state.harmony - 5, 0, 100);
    pushMessage(state, `${name} a été détruit pendant le raid.`, 'danger');
  }
}

export function simulateCombat(state, delta) {
  const combat = state.combat;
  if (!combat || combat.outcome) return;
  combat.elapsed += delta;
  const economy = getEconomy(state);
  const rng = mulberry32((hashString(combat.id) ^ Math.floor(combat.elapsed * 1000)) >>> 0);

  combat.temporaryCooldown = Math.max(0, (combat.temporaryCooldown || 0) - delta);
  if (state.temporaryDefense > 0.5 && combat.temporaryCooldown <= 0) {
    const target = combat.enemies.filter((enemy) => enemy.hp > 0).sort((a, b) => a.distance - b.distance)[0];
    if (target) {
      const damage = Math.max(2, state.temporaryDefense * 0.55);
      target.hp -= damage;
      target.hitFlash = 0.13;
      const center = Math.floor(MAX_GRID / 2);
      combat.projectiles.push({
        id: `p-temp-${Date.now()}-${Math.random()}`,
        fromX: center,
        fromY: center,
        targetId: target.uid,
        age: 0,
        duration: 0.28,
        heavy: true,
      });
      combat.temporaryCooldown = 1.25;
    }
  }

  for (const tile of state.tiles) {
    if (!tile.building || !isTileActive(state, tile.x, tile.y)) continue;
    const data = BUILDINGS[tile.building.id];
    if (!data?.defense || !data.targets?.length) continue;
    tile.building.cooldown = Math.max(0, (tile.building.cooldown || 0) - delta);
    if (tile.building.cooldown > 0) continue;
    const target = chooseDefenseTarget(state, data, combat.enemies);
    if (!target) continue;
    const efficiency = economy.workerEfficiency * clamp(tile.building.hp / 100, 0.25, 1);
    const damage = data.defense * (0.72 + rng() * 0.28) * efficiency;
    target.hp -= damage;
    target.hitFlash = 0.13;
    if (data.splash) applySplash(combat.enemies, target, damage);
    tile.building.cooldown = 1 / (data.fireRate || 1);
    combat.projectiles.push({
      id: `p-${Date.now()}-${Math.random()}`,
      fromX: tile.x,
      fromY: tile.y,
      targetId: target.uid,
      age: 0,
      duration: 0.22,
      heavy: data.splash || data.defense > 25,
    });
  }

  for (const projectile of combat.projectiles) projectile.age += delta;
  combat.projectiles = combat.projectiles.filter((projectile) => projectile.age < projectile.duration);

  for (const enemy of combat.enemies) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - delta);
    if (enemy.hp <= 0) continue;
    enemy.distance -= enemy.speed * delta;
    if (enemy.distance <= 0.14) {
      const armorFactor = clamp(1 - economy.armor / 650, 0.42, 1);
      const damage = enemy.damage * armorFactor;
      state.vitality = Math.max(0, state.vitality - damage);
      combat.damageTaken += damage;
      combat.breaches = (combat.breaches || 0) + 1;
      enemy.breached = true;
      if (rng() < 0.34) damageRandomBuilding(state, enemy.damage * 1.3, rng);
      enemy.hp = 0;
      pushMessage(state, `${ENEMY_TYPES[enemy.id].name} frappe la carapace (-${Math.ceil(damage)} vitalité).`, 'danger');
    }
  }

  const alive = combat.enemies.filter((enemy) => enemy.hp > 0);
  const defeatedThisTick = combat.enemies.filter((enemy) => enemy.hp <= 0 && !enemy.counted && !enemy.breached);
  for (const enemy of defeatedThisTick) {
    enemy.counted = true;
    combat.kills = (combat.kills || 0) + 1;
    state.stats.enemiesDefeated += 1;
    addResources(state, ENEMY_TYPES[enemy.id].reward || {});
  }
  for (const enemy of combat.enemies.filter((item) => item.breached && !item.counted)) enemy.counted = true;

  if (state.vitality <= 0) {
    combat.outcome = 'defeat';
    state.stats.raidsLost += 1;
    state.harmony = clamp(state.harmony - 16, 0, 100);
    state.vitality = Math.max(25, economy.maxVitality * 0.26);
    state.resources.food = Math.max(0, state.resources.food * 0.72);
    state.resources.pearls = Math.max(0, state.resources.pearls * 0.78);
    pushMessage(state, 'La cité est submergée, mais la tortue plonge et sauve les survivants. Reconstruction nécessaire.', 'danger');
  } else if (alive.length === 0) {
    combat.outcome = 'victory';
    state.stats.raidsWon += 1;
    const killRatio = combat.enemies.length > 0 ? (combat.kills || 0) / combat.enemies.length : 1;
    const survivalFactor = 0.35 + killRatio * 0.65;
    const reward = {
      pearls: Math.max(4, Math.round((16 + state.tier * 9 + combat.enemies.length * 2.5) * survivalFactor)),
      spirit: Math.max(2, Math.round((8 + state.tier * 5) * survivalFactor)),
      prosperity: Math.max(3, Math.round((8 + combat.enemies.length * 1.5) * survivalFactor)),
      growth: Math.max(1, Math.round((4 + state.tier * 2) * survivalFactor)),
    };
    addResources(state, reward);
    combat.reward = reward;
    state.harmony = clamp(state.harmony + 4, 0, 100);
    const breachText = combat.breaches ? `, ${combat.breaches} ont atteint la carapace` : '';
    pushMessage(state, `Raid terminé : ${combat.kills || 0} ennemis neutralisés${breachText}.`, 'legend');
    if (combat.sourceNodeId) {
      const node = state.worldNodes.find((item) => item.id === combat.sourceNodeId);
      if (node) {
        node.power = Math.max(0, node.power - 14 - state.tier * 5);
        if (node.power <= 0) {
          node.defeated = true;
          node.relation = -20;
        }
      }
    }
    updateQuestProgress(state);
  }
}

export function closeCombat(state) {
  if (!state.combat?.outcome) return false;
  state.combat = null;
  state.nextRaidIn = Math.max(85, 145 - state.tier * 8) + Math.random() * 70;
  return true;
}

function worldActionUnavailable(state) {
  if (state.event) return 'Résolvez l’événement en cours avant d’agir dans l’archipel.';
  if (state.pendingRaid) return 'Une menace approche : les équipages doivent défendre la cité.';
  if (state.combat) return 'Les équipages sont mobilisés par le raid en cours.';
  return null;
}

function worldAccessUnavailable(state, mode) {
  if (mode === 'air' && countBuildings(state, 'skyDock') + countBuildings(state, 'aerie') <= 0) {
    return 'Une infrastructure aérienne est nécessaire pour atteindre ce monde.';
  }
  if (mode === 'sea' && countBuildings(state, 'harbor') <= 0) {
    return 'Un port est nécessaire pour atteindre ce monde.';
  }
  return null;
}

function nodeCooldownUnavailable(node) {
  const remaining = Math.max(0, Number(node.cooldown) || 0);
  return remaining > 0 ? `Ce monde sera de nouveau disponible dans ${Math.ceil(remaining)} s.` : null;
}

function setNodeCooldown(node, action) {
  node.cooldown = Math.max(Number(node.cooldown) || 0, WORLD_ACTION_COOLDOWNS[action] || 0);
}

function explorationReward(node, firstExploration) {
  if (node.kind === 'island') {
    return firstExploration
      ? { wood: 36, stone: 32, spirit: 14, growth: 9 }
      : { wood: 9, stone: 8, spirit: 3, growth: 2 };
  }
  return firstExploration
    ? { pearls: 14, spirit: 12, prosperity: 8 }
    : { pearls: 4, spirit: 3, prosperity: 2 };
}

export function tradeWithNode(state, nodeId) {
  const node = state.worldNodes.find((item) => item.id === nodeId && item.discovered && !item.defeated);
  if (!node) return { ok: false, reason: 'Monde inaccessible.' };
  const unavailable = worldActionUnavailable(state) || worldAccessUnavailable(state, node.altitude) || nodeCooldownUnavailable(node);
  if (unavailable) return { ok: false, reason: unavailable };
  if (node.relation <= -25) return { ok: false, reason: 'Cette faction refuse le commerce.' };
  const cost = node.preferred === 'spirit' ? { spirit: 12 } : { food: 24 };
  if (!spendResources(state, cost)) return { ok: false, reason: 'Ressources insuffisantes pour l’échange.' };
  const reward = node.kind === 'crab' ? { stone: 34, parts: 5 } : node.kind === 'manta' ? { pearls: 22, spirit: 9 } : { wood: 26, stone: 18, pearls: 12 };
  addResources(state, reward);
  const firstVisit = !node.visited;
  node.relation = clamp(node.relation + 7, -100, 100);
  node.tradeCount = (Number(node.tradeCount) || 0) + 1;
  node.visited = true;
  setNodeCooldown(node, 'trade');
  state.stats.trades += 1;
  if (firstVisit) state.stats.worldsVisited += 1;
  pushMessage(state, `Échange conclu avec ${node.name}.`, 'good');
  return { ok: true, reward };
}

export function exploreNode(state, nodeId) {
  const node = state.worldNodes.find((item) => item.id === nodeId && item.discovered && !item.defeated);
  if (!node) return { ok: false, reason: 'Monde inaccessible.' };
  const unavailable = worldActionUnavailable(state) || worldAccessUnavailable(state, node.altitude) || nodeCooldownUnavailable(node);
  if (unavailable) return { ok: false, reason: unavailable };
  const cost = { food: 18 };
  if (!spendResources(state, cost)) return { ok: false, reason: 'Il faut 18 vivres.' };
  const firstVisit = !node.visited;
  const firstExploration = !node.explored;
  node.visited = true;
  node.explored = true;
  node.explorationCount = (Number(node.explorationCount) || 0) + 1;
  setNodeCooldown(node, 'explore');
  node.relation = clamp(node.relation + (node.relation >= 0 ? 4 : -2), -100, 100);
  const reward = explorationReward(node, firstExploration);
  addResources(state, reward);
  if (firstVisit) state.stats.worldsVisited += 1;
  if (firstExploration) {
    const undiscovered = state.worldNodes.find((item) => !item.discovered);
    if (undiscovered) undiscovered.discovered = true;
  }
  pushMessage(state, firstExploration ? `Mission d’approche réussie autour de ${node.name}.` : `Nouvelle reconnaissance autour de ${node.name}.`, 'good');
  return { ok: true, reward, firstExploration };
}

export function attackNode(state, nodeId) {
  const node = state.worldNodes.find((item) => item.id === nodeId && item.discovered && !item.defeated);
  if (!node) return { ok: false, reason: 'Cible inaccessible.' };
  const desired = node.altitude === 'air' ? 'air' : 'sea';
  const unavailable = worldActionUnavailable(state) || worldAccessUnavailable(state, desired) || nodeCooldownUnavailable(node);
  if (unavailable) return { ok: false, reason: unavailable };
  const cost = { food: 26, pearls: 6 };
  if (!canAfford(state, cost)) return { ok: false, reason: 'Ressources insuffisantes pour lancer l’assaut.' };
  const raid = startRaid(state, desired, node);
  if (!raid.ok) return raid;
  spendResources(state, cost);
  node.relation = clamp(node.relation - 28, -100, 100);
  setNodeCooldown(node, 'attack');
  return raid;
}

export function simulateSecond(state, delta) {
  if (state.paused) return;
  const scaled = delta * state.gameSpeed;
  state.totalSeconds += scaled;
  state.updatedAt = Date.now();
  state.dayProgress += scaled / 72;
  while (state.dayProgress >= 1) {
    state.dayProgress -= 1;
    state.day += 1;
    const weatherRng = mulberry32((state.seed ^ Math.imul(state.day, 2654435761)) >>> 0);
    state.weather = pick(weatherRng, ['Clair', 'Clair', 'Pluie nourricière', 'Brume nacrée', 'Vents hauts', 'Mer d’huile', 'Orage lointain']);
    state.growth += 1.3 + state.tier * 0.35;
    state.prosperity += 0.6 + state.tier * 0.2;
    state.stats.totalProsperityEarned += 0.6 + state.tier * 0.2;
    pushMessage(state, `Aube du jour ${state.day}.`, 'info');
  }

  const economy = getEconomy(state);
  for (const resource of ['wood', 'stone', 'food', 'spirit', 'pearls', 'parts']) {
    state.resources[resource] = Math.max(0, state.resources[resource] + (economy.net[resource] || 0) * scaled);
  }
  state.growth += (0.018 + (economy.production.growth || 0)) * scaled * (state.satiety / 100) * (state.harmony / 100);
  state.satiety = clamp(state.satiety - 0.012 * scaled * (1 + state.tier * 0.08), 0, 100);

  const foodSecurity = state.resources.food / Math.max(1, state.population * 5);
  const overcrowding = Math.max(0, state.population - economy.housing);
  const harmonyTarget = clamp(55 + economy.harmonyBonus * 0.35 + Math.min(12, foodSecurity * 3) - overcrowding * 4, 12, 92);
  state.harmony += (harmonyTarget - state.harmony) * 0.0025 * scaled;

  if (state.resources.food <= 0.1) {
    state.harmony = clamp(state.harmony - 0.08 * scaled, 0, 100);
    state.population = Math.max(1, state.population - 0.006 * scaled);
  } else if (state.population < economy.housing && state.harmony > 35 && foodSecurity > 1.2) {
    const growthRate = 0.010 + countBuildings(state, 'home') * 0.0014;
    state.population = Math.min(economy.housing, state.population + growthRate * scaled * (state.harmony / 70));
  }

  if (state.satiety < 18) {
    state.vitality = Math.max(0, state.vitality - 0.025 * scaled);
    state.harmony = clamp(state.harmony - 0.02 * scaled, 0, 100);
  } else if (!state.combat) {
    state.vitality = clamp(state.vitality + (0.012 + (economy.production.vitality || 0)) * scaled, 0, economy.maxVitality);
  }

  for (const expedition of state.expeditions) expedition.remaining -= scaled;
  const completed = state.expeditions.filter((expedition) => expedition.remaining <= 0);
  state.expeditions = state.expeditions.filter((expedition) => expedition.remaining > 0);
  for (const expedition of completed) completeExpedition(state, expedition);

  for (const node of state.worldNodes) node.cooldown = Math.max(0, (Number(node.cooldown) || 0) - scaled);
  state.temporaryDefense = Math.max(0, state.temporaryDefense - 0.018 * scaled);

  if (state.combat) {
    simulateCombat(state, scaled);
  } else {
    state.nextEventIn -= scaled;
    state.nextRaidIn -= scaled;
    if (state.nextEventIn <= 0) triggerRandomEvent(state);
    if (state.nextRaidIn <= 0 && !state.event) {
      state.pendingRaid = { type: Math.random() > 0.5 ? 'sea' : 'air', countdown: 12 };
      state.nextRaidIn = 9999;
      pushMessage(state, 'Des éclaireurs signalent une force ennemie. Impact dans quelques instants.', 'warn');
    }
    if (state.pendingRaid) {
      state.pendingRaid.countdown -= scaled;
      if (state.pendingRaid.countdown <= 0) startRaid(state, state.pendingRaid.type);
    }
  }

  updateQuestProgress(state);
}

export function formatReward(reward) {
  return Object.entries(reward || {}).map(([key, value]) => `${key}:${Math.round(value)}`).join(', ');
}

export function saveGame(state, auto = false) {
  try {
    const key = auto ? AUTOSAVE_KEY : SAVE_KEY;
    const snapshot = structuredClone(state);
    const savedAt = Math.max(Date.now(), (Number(state.savedAt) || 0) + 1);
    snapshot.savedAt = savedAt;
    snapshot.updatedAt = savedAt;
    snapshot.paused = false;
    snapshot.event = null;
    localStorage.setItem(key, JSON.stringify(snapshot));
    if (!auto) localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
    state.savedAt = savedAt;
    state.updatedAt = savedAt;
    return true;
  } catch (error) {
    console.error('Save failed', error);
    return false;
  }
}

export function hasSave() {
  try {
    return [SAVE_KEY, AUTOSAVE_KEY].some((key) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? isRecognizableSave(JSON.parse(raw)) : false;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizedNumber(value, fallback, min = -Infinity, max = Infinity, integer = false) {
  if (value === null || value === '' || typeof value === 'boolean') return fallback;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  const bounded = Math.max(min, Math.min(max, number));
  return integer ? Math.floor(bounded) : bounded;
}

function sanitizedText(value, fallback, maxLength) {
  if (typeof value !== 'string') return fallback;
  const text = value.trim().slice(0, maxLength);
  return text || fallback;
}

function sanitizedNumericObject(value, defaults, min = 0, max = 1_000_000_000_000) {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [
    key,
    sanitizedNumber(source[key], fallback, min, max),
  ]));
}

function sanitizedProgressContribution(value, buildingId) {
  const fallback = buildingProgressContribution(buildingId);
  if (!isRecord(value)) return fallback;
  return {
    prosperity: sanitizedNumber(value.prosperity, fallback.prosperity, 0, 1_000_000),
    growth: sanitizedNumber(value.growth, fallback.growth, 0, 1_000_000),
  };
}

function sanitizedBuilding(value) {
  if (!isRecord(value) || typeof value.id !== 'string' || !BUILDINGS[value.id]) return null;
  const hp = sanitizedNumber(value.hp, 100, 0, 100);
  if (hp <= 0) return null;
  return {
    id: value.id,
    level: sanitizedNumber(value.level, 1, 1, 10, true),
    hp,
    cooldown: sanitizedNumber(value.cooldown, 0, 0, 10_000),
    progressContribution: sanitizedProgressContribution(value.progressContribution, value.id),
  };
}

function sanitizedTiles(value, defaults) {
  const source = Array.isArray(value) && value.length === MAX_GRID * MAX_GRID ? value : null;
  return defaults.map((fallback, index) => {
    const loadedTile = source && isRecord(source[index]) ? source[index] : null;
    const terrain = loadedTile && typeof loadedTile.terrain === 'string' && TERRAIN[loadedTile.terrain]
      ? loadedTile.terrain
      : fallback.terrain;
    const hasBuilding = loadedTile && Object.prototype.hasOwnProperty.call(loadedTile, 'building');
    const building = sanitizedBuilding(hasBuilding ? loadedTile.building : fallback.building);
    return {
      x: fallback.x,
      y: fallback.y,
      terrain,
      building,
      damage: sanitizedNumber(loadedTile?.damage, fallback.damage || 0, 0, 100),
    };
  });
}

function sanitizedWorldNodes(value, defaults) {
  const source = Array.isArray(value) ? value : [];
  const validKinds = new Set(WORLD_NODE_ARCHETYPES.map((item) => item.kind));
  const usedIds = new Set();
  return defaults.map((fallback, index) => {
    const loadedNode = isRecord(source[index]) ? source[index] : {};
    let id = sanitizedText(loadedNode.id, fallback.id, 96);
    if (usedIds.has(id)) id = fallback.id;
    if (usedIds.has(id)) id = `${fallback.id}-${index}`;
    usedIds.add(id);
    const explored = typeof loadedNode.explored === 'boolean' ? loadedNode.explored : Boolean(loadedNode.visited);
    return {
      id,
      kind: typeof loadedNode.kind === 'string' && validKinds.has(loadedNode.kind) ? loadedNode.kind : fallback.kind,
      name: sanitizedText(loadedNode.name, fallback.name, 64),
      faction: sanitizedText(loadedNode.faction, fallback.faction, 96),
      description: sanitizedText(loadedNode.description, fallback.description, 320),
      preferred: sanitizedText(loadedNode.preferred, fallback.preferred, 32),
      relation: sanitizedNumber(loadedNode.relation, fallback.relation, -100, 100),
      power: sanitizedNumber(loadedNode.power, fallback.power, 0, 150),
      angle: sanitizedNumber(loadedNode.angle, fallback.angle, -Math.PI * 4, Math.PI * 4),
      distance: sanitizedNumber(loadedNode.distance, fallback.distance, 0.1, 1),
      altitude: loadedNode.altitude === 'air' || loadedNode.altitude === 'sea' ? loadedNode.altitude : fallback.altitude,
      discovered: typeof loadedNode.discovered === 'boolean' ? loadedNode.discovered : fallback.discovered,
      visited: (typeof loadedNode.visited === 'boolean' ? loadedNode.visited : fallback.visited) || explored,
      explored,
      explorationCount: sanitizedNumber(loadedNode.explorationCount, explored ? 1 : 0, 0, 1_000_000, true),
      defeated: typeof loadedNode.defeated === 'boolean' ? loadedNode.defeated : fallback.defeated,
      cooldown: sanitizedNumber(loadedNode.cooldown, 0, 0, 10_000),
      tradeCount: sanitizedNumber(loadedNode.tradeCount, 0, 0, 1_000_000, true),
    };
  });
}

function sanitizedMessages(value, defaults) {
  if (!Array.isArray(value)) return defaults;
  const tones = new Set(['info', 'good', 'warn', 'danger', 'legend']);
  return value.filter(isRecord).filter((message) => typeof message.text === 'string').slice(0, 24).map((message, index) => ({
    id: sanitizedText(message.id, `restored-message-${index}`, 128),
    text: message.text.trim().slice(0, 500),
    tone: tones.has(message.tone) ? message.tone : 'info',
    at: sanitizedNumber(message.at, 0, 0, 1_000_000_000),
  })).filter((message) => message.text);
}

function sanitizedStringArray(value, validIds, maxLength = 256) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === 'string' && validIds.has(id)))].slice(0, maxLength);
}

function sanitizedExpeditions(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((expedition, index) => {
    const data = EXPEDITIONS.find((item) => item.id === expedition.dataId);
    if (!data) return null;
    const total = sanitizedNumber(expedition.total, data.duration, 0.1, 100_000);
    return {
      id: sanitizedText(expedition.id, `${data.id}-restored-${index}`, 128),
      dataId: data.id,
      remaining: sanitizedNumber(expedition.remaining, total, 0, total),
      total,
      danger: sanitizedNumber(expedition.danger, data.danger, 0, 1),
    };
  }).filter(Boolean).slice(0, 3);
}

function sanitizedReward(value) {
  const validIds = new Set(['wood', 'stone', 'food', 'spirit', 'pearls', 'parts', 'prosperity', 'growth', 'harmony', 'vitality']);
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => validIds.has(key))
    .map(([key, amount]) => [key, sanitizedNumber(amount, 0, 0, 1_000_000)]));
}

function sanitizedCombat(value) {
  if (!isRecord(value)) return null;
  const outcome = value.outcome === 'victory' || value.outcome === 'defeat' ? value.outcome : null;
  const enemies = (Array.isArray(value.enemies) ? value.enemies : []).filter(isRecord).map((enemy, index) => {
    const base = typeof enemy.id === 'string' ? ENEMY_TYPES[enemy.id] : null;
    if (!base) return null;
    const maxHp = sanitizedNumber(enemy.maxHp, base.hp, 1, 1_000_000);
    return {
      uid: sanitizedText(enemy.uid, `restored-enemy-${index}`, 128),
      id: enemy.id,
      type: base.type,
      hp: sanitizedNumber(enemy.hp, maxHp, 0, maxHp),
      maxHp,
      speed: sanitizedNumber(enemy.speed, base.speed, 0, 1),
      damage: sanitizedNumber(enemy.damage, base.damage, 0, 1_000_000),
      angle: sanitizedNumber(enemy.angle, 0, -Math.PI * 4, Math.PI * 4),
      distance: sanitizedNumber(enemy.distance, 1.2, -1, 3),
      laneOffset: sanitizedNumber(enemy.laneOffset, 0, -1, 1),
      hitFlash: sanitizedNumber(enemy.hitFlash, 0, 0, 1),
      counted: enemy.counted === true,
      breached: enemy.breached === true,
    };
  }).filter(Boolean).slice(0, 18);
  if (!enemies.length && !outcome) return null;
  const projectiles = (Array.isArray(value.projectiles) ? value.projectiles : []).filter(isRecord).map((projectile, index) => {
    const duration = sanitizedNumber(projectile.duration, 0.25, 0.01, 10);
    return {
      id: sanitizedText(projectile.id, `restored-projectile-${index}`, 128),
      fromX: sanitizedNumber(projectile.fromX, Math.floor(MAX_GRID / 2), 0, MAX_GRID - 1, true),
      fromY: sanitizedNumber(projectile.fromY, Math.floor(MAX_GRID / 2), 0, MAX_GRID - 1, true),
      targetId: sanitizedText(projectile.targetId, '', 128),
      age: sanitizedNumber(projectile.age, 0, 0, duration),
      duration,
      heavy: projectile.heavy === true,
    };
  }).filter((projectile) => projectile.targetId).slice(0, 100);
  return {
    id: sanitizedText(value.id, `restored-raid-${Date.now()}`, 128),
    type: value.type === 'air' || value.type === 'sea' ? value.type : enemies[0]?.type || 'sea',
    enemies,
    projectiles,
    elapsed: sanitizedNumber(value.elapsed, 0, 0, 1_000_000),
    sourceNodeId: typeof value.sourceNodeId === 'string' ? value.sourceNodeId.slice(0, 96) : null,
    outcome,
    reward: sanitizedReward(value.reward),
    damageTaken: sanitizedNumber(value.damageTaken, 0, 0, 1_000_000_000),
    breaches: sanitizedNumber(value.breaches, 0, 0, 1_000_000, true),
    kills: sanitizedNumber(value.kills, 0, 0, 1_000_000, true),
    temporaryCooldown: sanitizedNumber(value.temporaryCooldown, 0, 0, 10_000),
  };
}

function isRecognizableSave(value) {
  if (!isRecord(value) || !isRecord(value.resources) || !Array.isArray(value.tiles) || value.tiles.length !== MAX_GRID * MAX_GRID) return false;
  return sanitizedNumber(value.seed, null, 0, 2_000_000_000, true) !== null;
}

export function hydrateGame(loaded, announce = true) {
  if (!isRecord(loaded)) return null;
  const defaults = createGame({
    seed: sanitizedNumber(loaded.seed, undefined, 0, 2_000_000_000, true),
    cityName: typeof loaded.cityName === 'string' ? loaded.cityName : undefined,
    turtleName: typeof loaded.turtleName === 'string' ? loaded.turtleName : undefined,
    difficulty: ['conte', 'voyage', 'tempete'].includes(loaded.difficulty) ? loaded.difficulty : 'voyage',
  });
  const state = { ...defaults, ...loaded };
  state.seed = defaults.seed;
  state.cityName = sanitizedText(loaded.cityName, defaults.cityName, 32);
  state.turtleName = sanitizedText(loaded.turtleName, defaults.turtleName, 28);
  state.difficulty = defaults.difficulty;
  state.difficultyData = defaults.difficultyData;
  state.createdAt = sanitizedNumber(loaded.createdAt, defaults.createdAt, 0, Number.MAX_SAFE_INTEGER);
  state.updatedAt = sanitizedNumber(loaded.updatedAt, state.createdAt, 0, Number.MAX_SAFE_INTEGER);
  state.savedAt = sanitizedNumber(loaded.savedAt, 0, 0, Number.MAX_SAFE_INTEGER);
  state.tier = sanitizedNumber(loaded.tier, defaults.tier, 0, TIERS.length - 1, true);
  state.resources = sanitizedNumericObject(loaded.resources, defaults.resources);
  state.population = sanitizedNumber(loaded.population, defaults.population, 1, TIERS[state.tier].populationCap);
  state.prosperity = sanitizedNumber(loaded.prosperity, defaults.prosperity, 0, 1_000_000_000_000);
  state.growth = sanitizedNumber(loaded.growth, defaults.growth, 0, 1_000_000_000_000);
  state.harmony = sanitizedNumber(loaded.harmony, defaults.harmony, 0, 100);
  state.satiety = sanitizedNumber(loaded.satiety, defaults.satiety, 0, 100);
  state.day = sanitizedNumber(loaded.day, defaults.day, 1, 1_000_000_000, true);
  state.dayProgress = sanitizedNumber(loaded.dayProgress, defaults.dayProgress, 0, 0.999999);
  state.totalSeconds = sanitizedNumber(loaded.totalSeconds, defaults.totalSeconds, 0, 100_000_000_000);
  state.gameSpeed = [1, 2, 4].includes(loaded.gameSpeed) ? loaded.gameSpeed : 1;
  state.weather = ['Clair', 'Pluie nourricière', 'Brume nacrée', 'Vents hauts', 'Mer d’huile', 'Orage lointain'].includes(loaded.weather)
    ? loaded.weather
    : defaults.weather;
  state.tiles = sanitizedTiles(loaded.tiles, defaults.tiles);
  state.worldNodes = sanitizedWorldNodes(loaded.worldNodes, defaults.worldNodes);
  state.messages = sanitizedMessages(loaded.messages, defaults.messages);
  state.stats = sanitizedNumericObject(loaded.stats, defaults.stats);
  state.questProgress = sanitizedNumericObject(loaded.questProgress, defaults.questProgress);
  const questIds = new Set(QUESTS.map((quest) => quest.id));
  state.claimedQuests = sanitizedStringArray(loaded.claimedQuests, questIds);
  state.completedQuests = [...new Set([
    ...sanitizedStringArray(loaded.completedQuests, questIds),
    ...state.claimedQuests,
  ])];
  state.expeditions = sanitizedExpeditions(loaded.expeditions);
  state.combat = sanitizedCombat(loaded.combat);
  state.pendingRaid = isRecord(loaded.pendingRaid) && (loaded.pendingRaid.type === 'air' || loaded.pendingRaid.type === 'sea')
    ? {
      type: loaded.pendingRaid.type,
      countdown: sanitizedNumber(loaded.pendingRaid.countdown, 12, 0.1, 10_000),
    }
    : null;
  if (state.combat) state.pendingRaid = null;
  state.temporaryDefense = sanitizedNumber(loaded.temporaryDefense, defaults.temporaryDefense, 0, 1_000_000);
  state.nextEventIn = sanitizedNumber(loaded.nextEventIn, defaults.nextEventIn, 0, 10_000_000);
  state.nextRaidIn = sanitizedNumber(loaded.nextRaidIn, defaults.nextRaidIn, 0, 10_000_000);
  state.tutorialStep = sanitizedNumber(loaded.tutorialStep, defaults.tutorialStep, 0, 1_000_000, true);
  state.selectedWorldNodeId = typeof loaded.selectedWorldNodeId === 'string'
    && state.worldNodes.some((node) => node.id === loaded.selectedWorldNodeId)
    ? loaded.selectedWorldNodeId
    : null;
  state.paused = false;
  state.event = null;
  state.vitality = sanitizedNumber(loaded.vitality, defaults.vitality, 0, getEconomy(state).maxVitality);
  state.version = GAME_VERSION;
  if (announce) pushMessage(state, 'Sauvegarde chargée.', 'good');
  updateQuestProgress(state);
  return state;
}

export function loadGame() {
  try {
    const candidates = [SAVE_KEY, AUTOSAVE_KEY].map((key, index) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const snapshot = JSON.parse(raw);
        if (!isRecognizableSave(snapshot)) return null;
        const freshness = sanitizedNumber(snapshot.savedAt, 0, 0, Number.MAX_SAFE_INTEGER)
          || sanitizedNumber(snapshot.updatedAt, 0, 0, Number.MAX_SAFE_INTEGER)
          || sanitizedNumber(snapshot.createdAt, 0, 0, Number.MAX_SAFE_INTEGER);
        return { snapshot, freshness, index };
      } catch {
        return null;
      }
    }).filter(Boolean).sort((a, b) => b.freshness - a.freshness || a.index - b.index);

    for (const candidate of candidates) {
      try {
        const hydrated = hydrateGame(candidate.snapshot, true);
        if (hydrated) return hydrated;
      } catch {
        // Try the other local snapshot when one save is malformed.
      }
    }
    return null;
  } catch (error) {
    console.error('Load failed', error);
    return null;
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}
