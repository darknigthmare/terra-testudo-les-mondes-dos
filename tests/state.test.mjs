import assert from 'node:assert/strict';
import { BUILDINGS, MAX_GRID, TIERS } from '../src/data.js';
import {
  activeBounds,
  attackNode,
  canEvolve,
  createGame,
  demolishBuilding,
  evolve,
  exploreNode,
  getEconomy,
  getTile,
  hasSave,
  hydrateGame,
  loadGame,
  placeBuilding,
  saveGame,
  simulateCombat,
  simulateSecond,
  startExpedition,
  startRaid,
  tradeWithNode,
} from '../src/state.js';

function center() {
  return Math.floor(MAX_GRID / 2);
}

function addInfrastructure(state, buildingId) {
  const bounds = activeBounds(state);
  for (let y = bounds.start; y <= bounds.end; y += 1) {
    for (let x = bounds.start; x <= bounds.end; x += 1) {
      const tile = getTile(state, x, y);
      if (!tile.building) {
        tile.building = { id: buildingId, level: 1, hp: 100, cooldown: 0 };
        return tile;
      }
    }
  }
  throw new Error(`No free tile for ${buildingId}`);
}

function readyToEvolve(seed) {
  const state = createGame({ seed });
  const next = TIERS[1];
  state.prosperity = next.prosperityRequired;
  state.resources.spirit = next.spiritRequired + 20;
  state.growth = next.growthRequired;
  state.harmony = 80;
  state.satiety = 80;
  return state;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function testNewGame() {
  const state = createGame({ seed: 12345, cityName: 'Test', turtleName: 'Atlas' });
  assert.equal(state.cityName, 'Test');
  assert.equal(state.turtleName, 'Atlas');
  assert.equal(state.tier, 0);
  assert.equal(activeBounds(state).size, 7);
  assert.equal(getTile(state, center(), center()).building.id, 'home');
  assert.equal(getTile(state, center() + 1, center()).terrain, 'fertile');
  assert.equal(getTile(state, center() - 1, center()).terrain, 'forest');
}

function testBuildingAndEconomy() {
  const state = createGame({ seed: 77 });
  const x = center() + 1;
  const y = center();
  const beforeWood = state.resources.wood;
  const result = placeBuilding(state, 'farm', x, y);
  assert.equal(result.ok, true);
  assert.equal(getTile(state, x, y).building.id, 'farm');
  assert.ok(state.resources.wood < beforeWood);
  const economy = getEconomy(state);
  assert.ok(economy.production.food > 1.45, 'fertile ground should boost farm output');
  const occupied = placeBuilding(state, 'well', x, y);
  assert.equal(occupied.ok, false);
}

function testEvolution() {
  const state = readyToEvolve(9);
  assert.equal(canEvolve(state).ok, true);
  const result = evolve(state);
  assert.equal(result.ok, true);
  assert.equal(state.tier, 1);
  assert.equal(activeBounds(state).size, 11);
}

function testExpedition() {
  const state = createGame({ seed: 101 });
  state.nextEventIn = 99999;
  state.nextRaidIn = 99999;
  const result = startExpedition(state, 'shoreForage');
  assert.equal(result.ok, true);
  assert.equal(state.expeditions.length, 1);
  for (let i = 0; i < 40; i += 1) simulateSecond(state, 1);
  assert.equal(state.expeditions.length, 0);
  assert.equal(state.stats.expeditionsCompleted, 1);
}

function testTrade() {
  const state = createGame({ seed: 212 });
  const node = state.worldNodes.find((item) => item.discovered && item.relation >= -25);
  assert.ok(node);
  addInfrastructure(state, node.altitude === 'air' ? 'skyDock' : 'harbor');
  node.relation = 10;
  state.resources.food = 100;
  const beforeVisits = state.stats.worldsVisited;
  const result = tradeWithNode(state, node.id);
  assert.equal(result.ok, true);
  assert.equal(node.visited, true);
  assert.equal(state.stats.worldsVisited, beforeVisits + 1);
}

function testWorldAccessAndCooldowns() {
  const airState = createGame({ seed: 601 });
  const airNode = airState.worldNodes[0];
  Object.assign(airNode, { altitude: 'air', kind: 'manta', preferred: 'air', relation: 10, discovered: true, defeated: false, cooldown: 0 });
  airState.resources.food = 1000;
  airState.nextEventIn = 99999;
  airState.nextRaidIn = 99999;
  assert.equal(tradeWithNode(airState, airNode.id).ok, false, 'air trade requires an air route');
  addInfrastructure(airState, 'skyDock');
  assert.equal(tradeWithNode(airState, airNode.id).ok, true);
  assert.ok(airNode.cooldown > 0);
  assert.equal(tradeWithNode(airState, airNode.id).ok, false, 'trade cannot be spammed during cooldown');
  simulateSecond(airState, airNode.cooldown + 1);
  assert.equal(tradeWithNode(airState, airNode.id).ok, true, 'trade reopens after cooldown');

  const seaState = createGame({ seed: 602 });
  const seaNode = seaState.worldNodes[0];
  Object.assign(seaNode, { altitude: 'sea', kind: 'island', relation: 0, discovered: true, defeated: false, cooldown: 0 });
  seaState.resources.food = 1000;
  assert.equal(exploreNode(seaState, seaNode.id).ok, false, 'sea exploration requires a port');
  addInfrastructure(seaState, 'harbor');
  assert.equal(exploreNode(seaState, seaNode.id).ok, true);
  assert.equal(exploreNode(seaState, seaNode.id).ok, false, 'exploration cannot be spammed during cooldown');

  const attackState = createGame({ seed: 603 });
  const attackNodeRef = attackState.worldNodes[0];
  Object.assign(attackNodeRef, { altitude: 'air', relation: 0, discovered: true, defeated: false, cooldown: 0 });
  attackState.resources.food = 1000;
  attackState.resources.pearls = 100;
  const foodBefore = attackState.resources.food;
  assert.equal(attackNode(attackState, attackNodeRef.id, 'air').ok, false, 'air assault requires an air route');
  assert.equal(attackState.resources.food, foodBefore, 'failed assault does not consume resources');
  addInfrastructure(attackState, 'skyDock');
  assert.equal(attackNode(attackState, attackNodeRef.id, 'air').ok, true);
  assert.equal(attackState.combat.sourceNodeId, attackNodeRef.id);
  assert.ok(attackNodeRef.cooldown > 0);
}

function testWorldPowerScalesRaid() {
  const threat = (power) => {
    const state = createGame({ seed: 700 });
    state.tier = 2;
    state.prosperity = 300;
    state.totalSeconds = 50;
    const source = { id: 'test-source', power };
    assert.equal(startRaid(state, 'sea', source).ok, true);
    return state.combat.enemies.reduce((total, enemy) => total + enemy.maxHp + enemy.damage, 0);
  };
  const lowPowerThreat = threat(10);
  const highPowerThreat = threat(130);
  assert.ok(highPowerThreat > lowPowerThreat * 1.2, 'displayed world power must materially increase raid threat');
}

function testEvolutionBlockedDuringCrises() {
  const pending = readyToEvolve(801);
  pending.pendingRaid = { type: 'sea', countdown: 8 };
  assert.equal(canEvolve(pending).ok, false);
  assert.equal(evolve(pending).ok, false);
  assert.equal(pending.tier, 0);

  const eventState = readyToEvolve(802);
  eventState.event = { id: 'test-event' };
  assert.equal(canEvolve(eventState).ok, false);
  assert.equal(evolve(eventState).ok, false);
  assert.equal(eventState.tier, 0);

  const combatState = readyToEvolve(803);
  combatState.vitality = 1;
  assert.equal(startRaid(combatState, 'sea').ok, true);
  assert.equal(canEvolve(combatState).ok, false);
  assert.equal(evolve(combatState).ok, false);
  assert.equal(combatState.vitality, 1, 'evolution cannot heal the turtle during combat');
  assert.equal(combatState.tier, 0);
}

function testNewestSaveWinsAndFallbackWorks() {
  globalThis.localStorage = memoryStorage();
  const state = createGame({ seed: 901 });
  state.resources.wood = 111;
  assert.equal(saveGame(state, false), true);
  state.resources.wood = 222;
  assert.equal(saveGame(state, true), true);
  assert.equal(loadGame().resources.wood, 222, 'newer autosave must win over an older manual save');

  localStorage.setItem('terra-testudo-save-v1', '{invalid json');
  assert.equal(loadGame().resources.wood, 222, 'valid autosave must survive a malformed manual save');
}

function testMalformedHydrationIsSanitized() {
  const source = createGame({ seed: 902 });
  const malformed = JSON.parse(JSON.stringify(source));
  Object.assign(malformed, {
    cityName: 123,
    turtleName: [],
    difficulty: 'impossible',
    tier: 99,
    population: -50,
    prosperity: 'not-a-number',
    growth: -100,
    harmony: 999,
    vitality: 'broken',
    satiety: -4,
    day: 0,
    dayProgress: 2,
    totalSeconds: -5,
    gameSpeed: 99,
    weather: {},
    resources: { wood: '12.5', stone: -8, food: 'broken', spirit: null, pearls: Infinity, parts: {} },
    stats: 'broken',
    questProgress: [],
    completedQuests: ['unknown-quest'],
    claimedQuests: ['firstFarm', 'unknown-quest'],
    worldNodes: [null, { id: 'duplicate' }, { id: 'duplicate' }],
    messages: [null, { text: 7 }, { id: 8, text: 'Message restauré', tone: 'invalid', at: -2 }],
    expeditions: [{ dataId: 'missing' }],
    combat: { enemies: [{ id: 'missing' }] },
    pendingRaid: { type: 'invalid', countdown: 'soon' },
    selectedWorldNodeId: 'missing',
    paused: true,
    event: { id: 'stale-event' },
  });
  const centerIndex = center() * MAX_GRID + center();
  malformed.tiles[centerIndex] = { x: 'wrong', y: 999, terrain: 'void', building: { id: 'missing' }, damage: 'broken' };

  const state = hydrateGame(malformed, false);
  assert.ok(state);
  assert.equal(state.tier, TIERS.length - 1);
  assert.equal(activeBounds(state).size, MAX_GRID);
  assert.equal(state.cityName, 'Havre-d’Écaille');
  assert.equal(state.turtleName, 'Oroméa');
  assert.equal(state.difficulty, 'voyage');
  assert.deepEqual(state.resources, { wood: 12.5, stone: 0, food: 105, spirit: 12, pearls: 7, parts: 0 });
  assert.equal(state.population, 1);
  assert.equal(state.prosperity, 14);
  assert.equal(state.growth, 0);
  assert.equal(state.harmony, 100);
  assert.equal(state.satiety, 0);
  assert.equal(state.day, 1);
  assert.equal(state.dayProgress, 0.999999);
  assert.equal(state.totalSeconds, 0);
  assert.equal(state.gameSpeed, 1);
  assert.equal(state.weather, 'Clair');
  assert.equal(state.paused, false);
  assert.equal(state.event, null);
  assert.equal(state.pendingRaid, null);
  assert.equal(state.combat, null);
  assert.equal(state.selectedWorldNodeId, null);
  assert.equal(state.tiles.length, MAX_GRID * MAX_GRID);
  assert.equal(state.tiles[centerIndex].x, center());
  assert.equal(state.tiles[centerIndex].y, center());
  assert.equal(state.tiles[centerIndex].terrain, 'grass');
  assert.equal(state.tiles[centerIndex].building, null);
  assert.equal(state.worldNodes.length, 9);
  assert.equal(new Set(state.worldNodes.map((node) => node.id)).size, 9);
  assert.ok(state.messages.every((message) => typeof message.text === 'string' && Number.isFinite(message.at)));
  assert.ok(!state.completedQuests.includes('unknown-quest'));
  assert.deepEqual(state.claimedQuests, ['firstFarm']);
  assert.equal(state.expeditions.length, 0);
  state.nextEventIn = 99999;
  state.nextRaidIn = 99999;
  assert.doesNotThrow(() => simulateSecond(state, 1));
  assert.ok(Object.values(state.resources).every(Number.isFinite));
}

function testMalformedNewestSaveDoesNotMaskAutosave() {
  globalThis.localStorage = memoryStorage();
  const garbage = { seed: 999, savedAt: Number.MAX_SAFE_INTEGER, resources: {}, tiles: [] };
  localStorage.setItem('terra-testudo-save-v1', JSON.stringify(garbage));
  assert.equal(hasSave(), false, 'structurally invalid snapshots are not advertised as resumable');

  const valid = createGame({ seed: 903 });
  valid.resources.wood = 333;
  assert.equal(saveGame(valid, true), true);
  assert.equal(hasSave(), true);
  assert.equal(loadGame().resources.wood, 333, 'invalid newer manual snapshot must not mask a valid autosave');
}

function testDemolitionRemovesBuildingProgress() {
  const state = createGame({ seed: 904 });
  state.resources.wood = 1000;
  state.resources.stone = 1000;
  const baseline = { prosperity: state.prosperity, growth: state.growth };
  const x = center() + 1;
  const y = center();

  assert.equal(placeBuilding(state, 'farm', x, y).ok, true);
  assert.ok(state.prosperity > baseline.prosperity);
  assert.ok(state.growth > baseline.growth);
  assert.equal(demolishBuilding(state, x, y).ok, true);
  assert.equal(state.prosperity, baseline.prosperity);
  assert.equal(state.growth, baseline.growth);
  assert.equal(placeBuilding(state, 'farm', x, y).ok, true);
  assert.equal(demolishBuilding(state, x, y).ok, true);
  assert.equal(state.prosperity, baseline.prosperity, 'repeated construction-demolition cannot farm prosperity');
  assert.equal(state.growth, baseline.growth, 'repeated construction-demolition cannot farm growth');

  assert.equal(placeBuilding(state, 'farm', x, y).ok, true);
  const legacy = JSON.parse(JSON.stringify(state));
  delete legacy.tiles[y * MAX_GRID + x].building.progressContribution;
  const migrated = hydrateGame(legacy, false);
  assert.ok(migrated.tiles[y * MAX_GRID + x].building.progressContribution, 'old buildings receive a derived contribution');
  assert.equal(demolishBuilding(migrated, x, y).ok, true);
  assert.equal(migrated.prosperity, baseline.prosperity);
  assert.equal(migrated.growth, baseline.growth);
}

function testExplorationFirstVisitAndRecurringRewards() {
  const state = createGame({ seed: 905 });
  const node = state.worldNodes[0];
  Object.assign(node, {
    altitude: 'sea',
    kind: 'island',
    discovered: true,
    visited: false,
    explored: false,
    explorationCount: 0,
    defeated: false,
    cooldown: 0,
  });
  addInfrastructure(state, 'harbor');
  state.resources.food = 1000;
  state.nextEventIn = 99999;
  state.nextRaidIn = 99999;
  const knownBefore = state.worldNodes.filter((item) => item.discovered).length;

  const first = exploreNode(state, node.id);
  assert.equal(first.ok, true);
  assert.equal(first.firstExploration, true);
  assert.deepEqual(first.reward, { wood: 36, stone: 32, spirit: 14, growth: 9 });
  assert.equal(node.explorationCount, 1);
  const knownAfterFirst = state.worldNodes.filter((item) => item.discovered).length;
  assert.equal(knownAfterFirst, knownBefore + 1);
  assert.equal(exploreNode(state, node.id).ok, false, 'cooldown still gates repeat exploration');

  simulateSecond(state, node.cooldown + 1);
  const recurring = exploreNode(state, node.id);
  assert.equal(recurring.ok, true);
  assert.equal(recurring.firstExploration, false);
  assert.deepEqual(recurring.reward, { wood: 9, stone: 8, spirit: 3, growth: 2 });
  assert.equal(node.explorationCount, 2);
  assert.equal(state.worldNodes.filter((item) => item.discovered).length, knownAfterFirst, 'repeat exploration does not reveal another world');

  const legacy = createGame({ seed: 906 });
  const legacyNode = legacy.worldNodes[0];
  legacyNode.visited = true;
  delete legacyNode.explored;
  delete legacyNode.explorationCount;
  const migrated = hydrateGame(JSON.parse(JSON.stringify(legacy)), false);
  assert.equal(migrated.worldNodes[0].explored, true, 'visited legacy worlds cannot reclaim the full discovery reward');
  assert.equal(migrated.worldNodes[0].explorationCount, 1);
}

function testHomeNeighborSupportIsUseful() {
  const adjacent = createGame({ seed: 907 });
  const remote = createGame({ seed: 907 });
  const market = { id: 'market', level: 1, hp: 100, cooldown: 0 };
  getTile(adjacent, center() + 1, center()).building = { ...market };
  const bounds = activeBounds(remote);
  getTile(remote, bounds.end, bounds.end).building = { ...market };
  const adjacentEconomy = getEconomy(adjacent);
  const remoteEconomy = getEconomy(remote);
  assert.equal(adjacentEconomy.housing, remoteEconomy.housing + 1, 'supported homes gain one housing per adjacent civic building');
  assert.equal(adjacentEconomy.harmonyBonus, remoteEconomy.harmonyBonus + 2, 'supported homes improve harmony');
}

function testCombatVictory() {
  const state = createGame({ seed: 333 });
  state.nextEventIn = 99999;
  state.nextRaidIn = 99999;
  const bounds = activeBounds(state);
  let placed = 0;
  for (let y = bounds.start; y <= bounds.end && placed < 14; y += 1) {
    for (let x = bounds.start; x <= bounds.end && placed < 14; x += 1) {
      const tile = getTile(state, x, y);
      if (!tile.building) {
        tile.building = { id: 'stormCannon', level: 1, hp: 100, cooldown: 0 };
        placed += 1;
      }
    }
  }
  assert.equal(BUILDINGS.stormCannon.targets.includes('sea'), true);
  assert.equal(startRaid(state, 'sea').ok, true);
  for (let i = 0; i < 2000 && !state.combat.outcome; i += 1) simulateCombat(state, 0.05);
  assert.equal(state.combat.outcome, 'victory');
  assert.equal(state.stats.raidsWon, 1);
}

function testSettingsPersistence() {
  const state = createGame({ seed: 99 });
  state.settings = { reduceMotion: true, textScale: 1.3, highContrast: true, soundVolume: 0.35, ambientVolume: 0 };
  const copy = hydrateGame(JSON.parse(JSON.stringify(state)), false);
  assert.deepEqual(copy.settings, { reduceMotion: true, textScale: 1.3, highContrast: true, soundVolume: 0.35, ambientVolume: 0 });

  const hostile = JSON.parse(JSON.stringify(state));
  hostile.settings = { reduceMotion: 'yes', textScale: 9, highContrast: 1, soundVolume: 4, ambientVolume: -2 };
  const repaired = hydrateGame(hostile, false);
  assert.deepEqual(repaired.settings, { reduceMotion: false, textScale: 1, highContrast: false, soundVolume: 1, ambientVolume: 0 });
  assert.deepEqual(createGame({ seed: 7 }).settings, { reduceMotion: false, textScale: 1, highContrast: false, soundVolume: 0.8, ambientVolume: 0.6 });
}

function testHydration() {
  const state = createGame({ seed: 456, cityName: 'Persistante' });
  state.resources.wood = 321;
  const copy = hydrateGame(JSON.parse(JSON.stringify(state)), false);
  assert.equal(copy.cityName, 'Persistante');
  assert.equal(copy.resources.wood, 321);
  assert.equal(copy.tiles.length, MAX_GRID * MAX_GRID);
}

const tests = [
  testNewGame,
  testBuildingAndEconomy,
  testEvolution,
  testExpedition,
  testTrade,
  testWorldAccessAndCooldowns,
  testWorldPowerScalesRaid,
  testEvolutionBlockedDuringCrises,
  testNewestSaveWinsAndFallbackWorks,
  testMalformedHydrationIsSanitized,
  testMalformedNewestSaveDoesNotMaskAutosave,
  testDemolitionRemovesBuildingProgress,
  testExplorationFirstVisitAndRecurringRewards,
  testHomeNeighborSupportIsUseful,
  testCombatVictory,
  testSettingsPersistence,
  testHydration,
];

for (const test of tests) {
  test();
  console.log(`✓ ${test.name}`);
}
console.log(`\n${tests.length} tests réussis.`);
