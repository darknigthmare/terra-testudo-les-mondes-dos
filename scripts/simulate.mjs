#!/usr/bin/env node
// Harnais de simulation headless : joue N parties avec les règles réelles de
// `src/state.js` (aucun rendu, aucun DOM) et sort les courbes de rythme.
//
//   node scripts/simulate.mjs --games 3000
//   node scripts/simulate.mjs --games 200 --max-minutes 90 --difficulty tempete
//
// Le joueur automatique suit une politique fixe et documentée plus bas : il ne
// triche pas, il ne connaît que l'état public et les actions du jeu. Le but est
// de comparer des centaines de graines, pas de trouver le meilleur build.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { BUILDINGS, EXPEDITIONS, TIERS } from '../src/data.js';
import {
  activeBounds,
  buildingCostAt,
  canAfford,
  canEvolve,
  claimQuest,
  closeCombat,
  countBuildings,
  createGame,
  evolve,
  expeditionAvailable,
  feedTurtle,
  getEconomy,
  getTile,
  isTileActive,
  mulberry32,
  placeBuilding,
  repairBuilding,
  resolveEvent,
  simulateSecond,
  startExpedition,
} from '../src/state.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_TIER = TIERS.length - 1;

// Terrain qui maximise chaque bâtiment, pour que le bot ne gaspille pas un
// terreau fertile avec une carrière.
const PREFERRED_TERRAIN = {
  farm: 'fertile',
  lumberCamp: 'forest',
  quarry: 'rock',
  temple: 'spring',
  worldRoot: 'spring',
  greatMarket: 'fertile',
  reservoir: 'fertile',
};

const DIFFICULTIES = ['conte', 'voyage', 'tempete'];

const DEFAULTS = {
  games: 500,
  seed: 20261120,
  maxMinutes: 240,
  decisionEvery: 6,
  builds: 2,
  bucketSeconds: 300,
  difficulty: 'voyage',
  out: join('artifacts', 'sim'),
  workers: Math.min(4, availableParallelism()),
  renderOnly: null,
  quiet: false,
};

const VALUE_OPTIONS = {
  '--games': 'games',
  '--seed': 'seed',
  '--max-minutes': 'maxMinutes',
  '--decision-every': 'decisionEvery',
  '--builds': 'builds',
  '--bucket': 'bucketSeconds',
  '--difficulty': 'difficulty',
  '--out': 'out',
  '--workers': 'workers',
  '--render-only': 'renderOnly',
};

const FLAG_OF = Object.fromEntries(Object.entries(VALUE_OPTIONS).map(([flag, key]) => [key, flag]));
const TEXT_OPTIONS = new Set(['difficulty', 'out', 'renderOnly']);
const COUNT_OPTIONS = ['games', 'maxMinutes', 'decisionEvery', 'builds', 'bucketSeconds', 'workers'];

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--quiet') { options.quiet = true; continue; }
    if (arg === '--help' || arg === '-h') {
      console.log(`Options : --quiet, ${Object.keys(VALUE_OPTIONS).join(', ')}`);
      process.exit(0);
    }
    const key = VALUE_OPTIONS[arg];
    if (!key) throw new Error(`Option inconnue : ${arg}`);
    const value = argv[index + 1];
    if (value === undefined) throw new Error(`Option sans valeur : ${arg}`);
    options[key] = TEXT_OPTIONS.has(key) ? value : Number(value);
    index += 1;
  }
  for (const key of COUNT_OPTIONS) {
    if (!Number.isInteger(options[key]) || options[key] <= 0) throw new Error(`Option invalide : ${FLAG_OF[key]}`);
  }
  if (!Number.isInteger(options.seed)) throw new Error(`Option invalide : ${FLAG_OF.seed}`);
  if (!DIFFICULTIES.includes(options.difficulty)) {
    throw new Error(`Difficulté inconnue : ${options.difficulty} (${DIFFICULTIES.join(', ')})`);
  }
  return options;
}

// `state.js` utilise Math.random pour les identifiants et Date.now pour les
// messages : on les rend déterministes pour qu'une graine rejoue la même partie.
function installDeterminism(seed) {
  const random = mulberry32(seed >>> 0);
  Math.random = random;
  let clock = 1_700_000_000_000;
  Date.now = () => { clock += 1; return clock; };
}

function quantile(sorted, ratio) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * ratio;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

function summarize(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    p10: quantile(sorted, 0.1),
    p50: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    max: sorted[sorted.length - 1],
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
  };
}

// ---------------------------------------------------------------------------
// Politique du joueur automatique
// ---------------------------------------------------------------------------

// Ordre de priorité des constructions : d'abord ce qui nourrit et loge, puis ce
// qui produit de la prospérité (chaque bâtiment en donne à la pose), enfin les
// monuments. Les besoins ponctuels sont insérés avant cette liste.
const BUILD_ORDER = [
  'watchtower', 'farm', 'home', 'well', 'lumberCamp', 'quarry', 'palisade',
  'market', 'harbor', 'reservoir', 'healer', 'workshop', 'ballista', 'skyDock',
  'academy', 'temple', 'greatMarket', 'stoneWall', 'aerie', 'worldRoot',
  'citadel', 'grandSanctuary', 'stormCannon', 'worldGate',
].filter((id) => BUILDINGS[id]);

// Cases libres et éveillées, dans l'ordre de balayage : un seul scan par
// décision suffit, les placements suivants retirent leur case de la liste.
function freeTiles(state) {
  const { start, end } = activeBounds(state);
  const tiles = [];
  for (let y = start; y <= end; y += 1) {
    for (let x = start; x <= end; x += 1) {
      const tile = getTile(state, x, y);
      if (tile && !tile.building && isTileActive(state, x, y)) tiles.push(tile);
    }
  }
  return tiles;
}

function findSpot(free, buildingId) {
  const { allowed } = BUILDINGS[buildingId];
  const preferred = PREFERRED_TERRAIN[buildingId];
  if (preferred && allowed.includes(preferred)) {
    const match = free.find((tile) => tile.terrain === preferred);
    if (match) return match;
  }
  return free.find((tile) => allowed.includes(tile.terrain)) || null;
}

// Renvoie la liste des bâtiments que le bot veut poser maintenant, du plus
// urgent au moins urgent. Les doublons sont éliminés en gardant la priorité.
function desiredBuildings(state, economy) {
  const urgent = [];
  const nextTier = TIERS[Math.min(state.tier + 1, MAX_TIER)];
  if (economy.housing <= state.population + 1) urgent.push('home');
  if (economy.net.food < 0.5) urgent.push('farm');
  if (economy.net.wood < 0.25) urgent.push('lumberCamp');
  if (economy.net.stone < 0.25) urgent.push('quarry');
  if (state.resources.spirit < nextTier.spiritRequired * 0.75) urgent.push('well', 'temple');
  if (economy.defense < 8 + state.tier * 12) urgent.push('watchtower', 'palisade', 'harbor', 'ballista', 'skyDock', 'aerie');
  if (state.satiety < 55) urgent.push('farm');
  return [...new Set([...urgent, ...BUILD_ORDER])];
}

function tryBuild(state, economy, ctx) {
  const free = freeTiles(state);
  let placed = 0;
  for (const buildingId of desiredBuildings(state, economy)) {
    if (placed >= ctx.buildsPerDecision) break;
    // Le coût monte avec le nombre de bâtiments déjà posés : on vérifie le
    // coût réel avant de chercher une case.
    if (!canAfford(state, buildingCostAt(state, buildingId))) continue;
    const spot = findSpot(free, buildingId);
    if (!spot) continue;
    if (!placeBuilding(state, buildingId, spot.x, spot.y).ok) continue;
    free.splice(free.indexOf(spot), 1);
    placed += 1;
    ctx.buildingsPlaced += 1;
  }
}

function repairDamaged(state) {
  let repairs = 0;
  for (const tile of state.tiles) {
    if (repairs >= 2) break;
    if (!tile.building || tile.building.hp > 70) continue;
    if (repairBuilding(state, tile.x, tile.y).ok) repairs += 1;
  }
}

function resolvePendingEvent(state, ctx) {
  const { event } = state;
  const chosen = event.choices.findIndex((choice) => !choice.cost || canAfford(state, choice.cost));
  if (chosen < 0) {
    // Aucune réponse payable : le jeu reste en pause (`resolveEvent` seul
    // remet `paused` à false), donc c'est un vrai blocage de la partie.
    ctx.blockedBy = `événement ${event.id}`;
    return false;
  }
  resolveEvent(state, chosen);
  ctx.eventsResolved += 1;
  return true;
}

function decide(state, ctx) {
  if (state.event) return resolvePendingEvent(state, ctx);
  if (state.combat) {
    if (state.combat.outcome) closeCombat(state);
    return true;
  }

  for (const questId of state.completedQuests) {
    if (!state.claimedQuests.includes(questId)) claimQuest(state, questId);
  }

  if (canEvolve(state).ok) evolve(state);

  if (state.satiety < 70 && state.resources.food > 60) feedTurtle(state);

  if (state.resources.food > 55) {
    const slots = 2 + (countBuildings(state, 'academy') > 0 ? 1 : 0);
    for (const expedition of EXPEDITIONS) {
      if (state.expeditions.length >= slots) break;
      if (state.resources.food < 40) break;
      if (!expeditionAvailable(state, expedition)) continue;
      startExpedition(state, expedition.id);
    }
  }

  const economy = getEconomy(state);
  tryBuild(state, economy, ctx);
  repairDamaged(state);
  return true;
}

// ---------------------------------------------------------------------------
// Une partie
// ---------------------------------------------------------------------------

function runGame(gameIndex, options) {
  const seed = (options.seed + gameIndex * 7919) >>> 0;
  // Une graine par partie : même résultat quel que soit l'ordre des parties ou
  // le nombre de workers.
  installDeterminism(seed);
  const state = createGame({ seed, difficulty: options.difficulty });
  const ctx = {
    buildingsPlaced: 0,
    eventsResolved: 0,
    blockedBy: null,
    buildsPerDecision: options.builds,
  };
  const iterations = options.maxMinutes * 60;
  const raidsByAge = new Array(TIERS.length).fill(0);
  const timeByAge = new Array(TIERS.length).fill(0);
  const prosperityAtUp = new Array(TIERS.length).fill(null);
  const raidsAtUp = new Array(TIERS.length).fill(0);
  const samples = [];
  let raidsSeen = 0;
  let lastTier = state.tier;
  let ageStart = 0;
  let nextSample = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    if (iteration % options.decisionEvery === 0 && !decide(state, ctx)) break;
    simulateSecond(state, 1);

    const raids = state.stats.raidsWon + state.stats.raidsLost;
    if (raids > raidsSeen) {
      raidsByAge[state.tier] += raids - raidsSeen;
      raidsSeen = raids;
    }

    if (state.tier !== lastTier) {
      timeByAge[lastTier] = state.totalSeconds - ageStart;
      prosperityAtUp[lastTier] = state.prosperity;
      raidsAtUp[lastTier] = raidsSeen;
      lastTier = state.tier;
      ageStart = state.totalSeconds;
    }

    // Une seule mesure par tranche : la première fois qu'on la franchit.
    if (state.totalSeconds >= nextSample) {
      const bucket = Math.floor(state.totalSeconds / options.bucketSeconds) * options.bucketSeconds;
      samples.push({
        bucket,
        tier: state.tier,
        prosperity: state.prosperity,
        population: state.population,
        raids: raidsSeen,
      });
      nextSample += options.bucketSeconds;
    }

    if (state.tier >= MAX_TIER) break;
  }

  timeByAge[lastTier] = state.totalSeconds - ageStart;
  // La simulation s'arrête en pause si un événement est encore ouvert (le bot
  // n'a pas eu de décision avant le plafond) : c'est un blocage à signaler.
  if (state.event && !ctx.blockedBy) ctx.blockedBy = `événement ${state.event.id}`;
  const finalTier = state.tier;
  return {
    completed: finalTier >= MAX_TIER,
    blockedBy: ctx.blockedBy,
    totalSeconds: state.totalSeconds,
    finalTier,
    samples,
    raidsByAge,
    timeByAge,
    prosperityAtUp,
    raidsAtUp,
    prosperity: state.prosperity,
    population: state.population,
    raidsWon: state.stats.raidsWon,
    raidsLost: state.stats.raidsLost,
    buildingsPlaced: ctx.buildingsPlaced,
    buildingsLost: state.stats.buildingsLost,
    expeditions: state.stats.expeditionsCompleted,
    eventsResolved: ctx.eventsResolved,
  };
}

// ---------------------------------------------------------------------------
// Agrégation
// ---------------------------------------------------------------------------

function createAggregate() {
  return {
    games: 0,
    completed: 0,
    blocked: new Map(),
    durations: TIERS.map(() => []),
    prosperityAtUp: TIERS.map(() => []),
    raidsAtUp: TIERS.map(() => []),
    raidsByAge: TIERS.map(() => []),
    timeByAge: TIERS.map(() => []),
    reached: TIERS.map(() => 0),
    samples: new Map(),
    totals: {
      seconds: [],
      prosperity: [],
      population: [],
      raidsWon: [],
      raidsLost: [],
      buildingsLost: [],
      buildingsPlaced: [],
      expeditions: [],
      events: [],
    },
  };
}

function bucketSamples(map, samples) {
  for (const sample of samples) {
    if (!map.has(sample.bucket)) map.set(sample.bucket, { prosperity: [], raids: [], population: [], tier: [] });
    const entry = map.get(sample.bucket);
    entry.prosperity.push(sample.prosperity);
    entry.raids.push(sample.raids);
    entry.population.push(sample.population);
    entry.tier.push(sample.tier);
  }
}

function accumulate(aggregate, game) {
  aggregate.games += 1;
  if (game.completed) aggregate.completed += 1;
  if (game.blockedBy) aggregate.blocked.set(game.blockedBy, (aggregate.blocked.get(game.blockedBy) || 0) + 1);

  for (let tier = 0; tier <= game.finalTier; tier += 1) {
    aggregate.reached[tier] += 1;
    aggregate.raidsByAge[tier].push(game.raidsByAge[tier]);
    aggregate.timeByAge[tier].push(game.timeByAge[tier]);
    // Un âge quitté fournit sa durée ; le dernier est interrompu par la fin de
    // partie ou le plafond de temps, il n'a pas de palier suivant.
    if (tier < game.finalTier) {
      aggregate.durations[tier].push(game.timeByAge[tier]);
      aggregate.prosperityAtUp[tier].push(game.prosperityAtUp[tier]);
      aggregate.raidsAtUp[tier].push(game.raidsAtUp[tier]);
    }
  }
  bucketSamples(aggregate.samples, game.samples);

  aggregate.totals.seconds.push(game.totalSeconds / 60);
  aggregate.totals.prosperity.push(game.prosperity);
  aggregate.totals.population.push(game.population);
  aggregate.totals.raidsWon.push(game.raidsWon);
  aggregate.totals.raidsLost.push(game.raidsLost);
  aggregate.totals.buildingsLost.push(game.buildingsLost);
  aggregate.totals.buildingsPlaced.push(game.buildingsPlaced);
  aggregate.totals.expeditions.push(game.expeditions);
  aggregate.totals.events.push(game.eventsResolved);
}

function buildReport(aggregate, options) {
  const ages = TIERS.map((tier, index) => {
    const durations = aggregate.durations[index];
    const time = aggregate.timeByAge[index];
    const raids = aggregate.raidsByAge[index];
    const totalHours = time.reduce((sum, value) => sum + value, 0) / 3600;
    const totalRaids = raids.reduce((sum, value) => sum + value, 0);
    return {
      tier: index,
      id: tier.id,
      name: tier.name,
      requirement: tier.prosperityRequired,
      reached: aggregate.reached[index],
      reachedShare: aggregate.games ? aggregate.reached[index] / aggregate.games : 0,
      minutes: summarize(durations.map((value) => value / 60)),
      prosperityAtUp: summarize(aggregate.prosperityAtUp[index]),
      raidsAtUp: summarize(aggregate.raidsAtUp[index]),
      raidsPerHour: totalHours > 0 ? totalRaids / totalHours : null,
      meanHours: time.length ? time.reduce((sum, value) => sum + value, 0) / time.length / 3600 : null,
      // Combien de prospérité le bot avait en trop au moment de monter : au-delà
      // de 2,5×, le palier est franchi d'un coup plutôt que joué.
      overShoot: tier.prosperityRequired > 0 && aggregate.prosperityAtUp[index].length
        ? summarize(aggregate.prosperityAtUp[index]).p50 / tier.prosperityRequired
        : null,
    };
  });

  const buckets = [...aggregate.samples.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([second, entry]) => ({
      minute: second / 60,
      prosperity: summarize(entry.prosperity),
      raids: summarize(entry.raids),
      population: summarize(entry.population),
      tier: summarize(entry.tier),
      games: entry.prosperity.length,
    }));

  const durations = ages.map((age) => age.minutes?.p50).filter((value) => Number.isFinite(value));
  const globalMedian = durations.length ? summarize(durations).p50 : null;
  const flags = [];

  for (const age of ages) {
    if (age.reachedShare < 1) {
      flags.push({ kind: 'jamais atteint', tier: age.tier, detail: `${Math.round((1 - age.reachedShare) * 100)} % des parties n'atteignent pas ${age.name}` });
    }
    // Le dernier âge n'a pas de palier suivant : pas de durée à mesurer.
    if (!age.minutes) continue;
    if (globalMedian && age.minutes.p50 > globalMedian * 2) {
      flags.push({ kind: 'traîne', tier: age.tier, detail: `${age.name} : ${age.minutes.p50.toFixed(1)} min de médiane, ${(age.minutes.p50 / globalMedian).toFixed(1)}× la médiane des âges` });
    }
    if (age.minutes.p10 < 3) {
      flags.push({ kind: 's’emballe', tier: age.tier, detail: `${age.name} : 10 % des parties passent en moins de ${age.minutes.p10.toFixed(1)} min` });
    }
    if (age.overShoot && age.overShoot > 2.5) {
      flags.push({ kind: 'palier sauté', tier: age.tier, detail: `${age.name} : montée à ${Math.round(age.prosperityAtUp.p50)} de prospérité pour ${age.requirement} requis (${age.overShoot.toFixed(1)}×)` });
    }
    if (age.raidsPerHour) {
      const others = ages.filter((item) => item.tier !== age.tier && item.raidsPerHour).map((item) => item.raidsPerHour);
      const baseline = others.length ? summarize(others).p50 : null;
      if (baseline && age.raidsPerHour > baseline * 3) {
        flags.push({ kind: 'raids', tier: age.tier, detail: `${age.name} : ${age.raidsPerHour.toFixed(2)} raids/h, ${(age.raidsPerHour / baseline).toFixed(1)}× les autres âges` });
      }
    }
  }

  const blocked = [...aggregate.blocked.entries()].map(([reason, count]) => ({ reason, count }));

  return {
    meta: {
      games: options.games,
      seed: options.seed,
      difficulty: options.difficulty,
      maxMinutes: options.maxMinutes,
      bucketSeconds: options.bucketSeconds,
      // Cadence du joueur automatique : ce que mesurent les courbes.
      bot: {
        policy: 'fixe : logement, vivres, essence et défense, puis prospérité',
        decisionEverySeconds: options.decisionEvery,
        buildingsPerDecision: options.builds,
      },
      generatedAt: new Date().toISOString(),
    },
    completion: {
      completed: aggregate.completed,
      share: aggregate.games ? aggregate.completed / aggregate.games : 0,
      blocked,
      totals: Object.fromEntries(Object.entries(aggregate.totals).map(([key, values]) => [key, summarize(values)])),
    },
    ages,
    buckets,
    flags,
  };
}

// ---------------------------------------------------------------------------
// Sorties
// ---------------------------------------------------------------------------

function formatMinutes(minutes, digits = 1) {
  if (!minutes) return '—';
  const value = minutes.p50;
  const spread = minutes.p90 - minutes.p10;
  return `${value.toFixed(digits)} (${minutes.p10.toFixed(digits)}–${minutes.p90.toFixed(digits)}, ±${spread.toFixed(digits)})`;
}

// Taille de tranche lisible, quelle que soit l'option --bucket (en secondes).
function formatBucket(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '5 min';
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round((seconds / 60) * 10) / 10;
  return `${minutes} min`;
}

// Un ancien summary.json peut ne pas avoir meta.bucketSeconds : on le déduit
// de l'écart entre deux tranches, sinon on retombe sur l'ancien libellé.
function bucketSecondsOf(report) {
  if (Number.isFinite(report.meta.bucketSeconds)) return report.meta.bucketSeconds;
  const buckets = report.buckets;
  if (buckets.length > 1) return Math.round((buckets[1].minute - buckets[0].minute) * 60);
  return 300;
}

function printReport(report) {
  const { completion, ages, buckets, flags } = report;
  const line = '─'.repeat(96);
  console.log(`\nSimulation headless — ${report.meta.games} parties, graine ${report.meta.seed}, difficulté ${report.meta.difficulty}, plafond ${report.meta.maxMinutes} min`);
  console.log(line);
  console.log(`Campagne terminée : ${completion.completed}/${report.meta.games} (${(completion.share * 100).toFixed(1)} %)`);
  const bot = report.meta.bot;
  if (bot) {
    const plural = bot.buildingsPerDecision > 1 ? 's' : '';
    console.log(`Bot : une décision toutes les ${bot.decisionEverySeconds} s, ${bot.buildingsPerDecision} bâtiment${plural} par décision — ${bot.policy}`);
  }
  const blocked = completion.blocked.reduce((sum, entry) => sum + entry.count, 0);
  if (blocked) console.log(`Parties bloquées : ${blocked} (${completion.blocked.map((entry) => `${entry.reason} ×${entry.count}`).join(', ')})`);
  console.log(line);
  console.log('Durée par âge (minutes de jeu : p50 et intervalle p10–p90)');
  console.log('  âge'.padEnd(26) + 'atteint'.padEnd(12) + 'durée'.padEnd(28) + 'prospérité (×requis)'.padEnd(26) + 'raids/h');
  for (const age of ages) {
    const reached = `${age.reached}/${report.meta.games}`;
    const duration = age.minutes ? formatMinutes(age.minutes) : '—';
    const prosperity = age.prosperityAtUp ? `${age.prosperityAtUp.p50.toFixed(0)}${age.overShoot ? ` (×${age.overShoot.toFixed(1)})` : ''}` : '—';
    const raids = age.raidsPerHour === null ? '—' : age.raidsPerHour.toFixed(2);
    console.log(`  ${age.tier} ${age.name}`.padEnd(26) + reached.padEnd(12) + duration.padEnd(28) + prosperity.padEnd(26) + raids);
  }
  console.log(line);
  console.log(`Courbes (médiane par tranche de ${formatBucket(bucketSecondsOf(report))})`);
  console.log('  t (min)'.padEnd(12) + 'prospérité'.padEnd(22) + 'raids cumulés'.padEnd(20) + 'population'.padEnd(16) + 'parties au point');
  const stride = Math.max(1, Math.round(buckets.length / 14));
  for (let index = 0; index < buckets.length; index += stride) {
    const bucket = buckets[index];
    const prosperity = `${bucket.prosperity.p50.toFixed(0)} (${bucket.prosperity.p10.toFixed(0)}–${bucket.prosperity.p90.toFixed(0)})`;
    const raids = `${bucket.raids.p50.toFixed(0)} (${bucket.raids.p90.toFixed(0)} p90)`;
    console.log(`  ${bucket.minute.toFixed(0)}`.padEnd(12) + prosperity.padEnd(22) + raids.padEnd(20) + bucket.population.p50.toFixed(1).padEnd(16) + bucket.games);
  }
  console.log(line);
  if (flags.length) {
    console.log('Points de rythme signalés');
    for (const flag of flags) console.log(`  ! ${flag.kind.toUpperCase()} — ${flag.detail}`);
  } else {
    console.log('Aucun palier ne se détache : durées et raids restent dans la bande habituelle.');
  }
  console.log(line);
}

function agesCsv(report) {
  const rows = ['tier,id,name,requirement,reached,reached_share,minutes_p10,minutes_p50,minutes_p90,prosperity_p50,over_shoot,raids_per_hour,mean_hours'];
  for (const age of report.ages) {
    rows.push([
      age.tier, age.id, age.name, age.requirement, age.reached, age.reachedShare.toFixed(3),
      age.minutes ? age.minutes.p10.toFixed(2) : '',
      age.minutes ? age.minutes.p50.toFixed(2) : '',
      age.minutes ? age.minutes.p90.toFixed(2) : '',
      age.prosperityAtUp ? age.prosperityAtUp.p50.toFixed(0) : '',
      age.overShoot ? age.overShoot.toFixed(2) : '',
      age.raidsPerHour === null ? '' : age.raidsPerHour.toFixed(2),
      age.meanHours === null ? '' : age.meanHours.toFixed(2),
    ].join(','));
  }
  return rows.join('\n');
}

function toCsv(report) {
  const rows = ['minute,tier_p50,prosperity_p10,prosperity_p50,prosperity_p90,raids_p50,raids_p90,population_p50,games'];
  for (const bucket of report.buckets) {
    rows.push([
      bucket.minute.toFixed(0),
      bucket.tier.p50.toFixed(1),
      bucket.prosperity.p10.toFixed(1),
      bucket.prosperity.p50.toFixed(1),
      bucket.prosperity.p90.toFixed(1),
      bucket.raids.p50.toFixed(1),
      bucket.raids.p90.toFixed(1),
      bucket.population.p50.toFixed(1),
      bucket.games,
    ].join(','));
  }
  return rows.join('\n');
}

function toSvg(report) {
  const width = 1080;
  const panelHeight = 300;
  const topOffset = 52;
  const padding = { left: 64, right: 24, top: 28, bottom: 34 };
  const height = panelHeight * 3 + topOffset + 20;
  const colors = ['#f0c36a', '#8fd3c4', '#e08a76'];
  const buckets = report.buckets;
  const maxMinute = Math.max(1, ...buckets.map((bucket) => bucket.minute));
  const maxProsperity = Math.max(1, ...buckets.map((bucket) => bucket.prosperity.p90));
  const maxRaids = Math.max(1, ...buckets.map((bucket) => bucket.raids.p90));
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = panelHeight - padding.top - padding.bottom;

  const x = (minute) => padding.left + (minute / maxMinute) * plotWidth;
  const axis = (panel, maxValue, showMinutes = true) => {
    const top = topOffset + panel * panelHeight + padding.top;
    const parts = [];
    for (let step = 0; step <= 4; step += 1) {
      const value = (maxValue * step) / 4;
      const y = top + plotHeight - (step / 4) * plotHeight;
      parts.push(`<line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}" stroke="#ffffff" stroke-opacity="0.08"/>`);
      parts.push(`<text x="${padding.left - 8}" y="${(y + 4).toFixed(1)}" fill="#9fb3ad" font-size="11" text-anchor="end">${Math.round(value)}</text>`);
    }
    if (showMinutes) {
      for (let minute = 0; minute <= maxMinute; minute += Math.max(5, Math.round(maxMinute / 8))) {
        parts.push(`<text x="${x(minute).toFixed(1)}" y="${(top + plotHeight + 14).toFixed(1)}" fill="#9fb3ad" font-size="11" text-anchor="middle">${minute}</text>`);
      }
    }
    return parts.join('');
  };
  const series = (panel, key, maxValue, color) => {
    const top = topOffset + panel * panelHeight + padding.top;
    const y = (value) => top + plotHeight - (value / maxValue) * plotHeight;
    const points = buckets.map((bucket) => `${x(bucket.minute).toFixed(1)},${y(bucket[key].p50).toFixed(1)}`);
    const band = [
      ...buckets.map((bucket) => `${x(bucket.minute).toFixed(1)},${y(bucket[key].p90).toFixed(1)}`),
      ...buckets.slice().reverse().map((bucket) => `${x(bucket.minute).toFixed(1)},${y(bucket[key].p10).toFixed(1)}`),
    ];
    return `<polygon points="${band.join(' ')}" fill="${color}" fill-opacity="0.14"/>`
      + `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;
  };
  const titles = ['Prospérité médiane (bande p10–p90)', 'Raids cumulés (médiane et p90)', 'Achèvement de la campagne'];
  const panels = [
    `${axis(0, maxProsperity)}${series(0, 'prosperity', maxProsperity, colors[0])}`,
    `${axis(1, maxRaids)}${series(1, 'raids', maxRaids, colors[1])}`,
    (() => {
      const top = topOffset + 2 * panelHeight + padding.top;
      const maxDuration = Math.max(1, ...report.ages.map((age) => age.minutes?.p90 || 0));
      const barWidth = plotWidth / report.ages.length;
      const bars = report.ages.map((age, index) => {
        if (!age.minutes) return '';
        const barHeight = (age.minutes.p50 / maxDuration) * plotHeight;
        const bx = padding.left + index * barWidth + barWidth * 0.2;
        const by = top + plotHeight - barHeight;
        return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(barWidth * 0.6).toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${colors[2]}" fill-opacity="0.55"/>`
          + `<text x="${(bx + barWidth * 0.3).toFixed(1)}" y="${(by - 6).toFixed(1)}" fill="#e6d9bd" font-size="11" text-anchor="middle">${age.minutes.p50.toFixed(0)}</text>`
          + `<text x="${(bx + barWidth * 0.3).toFixed(1)}" y="${(top + plotHeight + 16).toFixed(1)}" fill="#9fb3ad" font-size="10" text-anchor="middle">${age.name}</text>`;
      }).join('');
      return `${axis(2, maxDuration, false)}${bars}`;
    })(),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0b1f24"/>
  <text x="${padding.left}" y="22" fill="#edd69c" font-family="Georgia, serif" font-size="16">Terra Testudo — rythme de ${report.meta.games} parties (minutes de jeu)</text>
  ${panels.map((content, index) => `<g><text x="${padding.left}" y="${topOffset + index * panelHeight - 6}" fill="#cfd8d1" font-family="Georgia, serif" font-size="13">${titles[index]}</text>${content}</g>`).join('')}
  <text x="${padding.left}" y="${height - 6}" fill="#6f8580" font-size="10">graine ${report.meta.seed} · difficulté ${report.meta.difficulty} · tranche ${formatBucket(bucketSecondsOf(report))} · dernier âge : ${report.ages[report.ages.length - 1].name}</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// Parallélisme : les parties sont indépendantes, chaque worker agrège son lot
// puis le processus principal fusionne les tableaux.

function mergeAggregate(target, source) {
  target.games += source.games;
  target.completed += source.completed;
  for (const [reason, count] of source.blocked) target.blocked.set(reason, (target.blocked.get(reason) || 0) + count);
  for (let tier = 0; tier < TIERS.length; tier += 1) {
    target.durations[tier].push(...source.durations[tier]);
    target.prosperityAtUp[tier].push(...source.prosperityAtUp[tier]);
    target.raidsAtUp[tier].push(...source.raidsAtUp[tier]);
    target.raidsByAge[tier].push(...source.raidsByAge[tier]);
    target.timeByAge[tier].push(...source.timeByAge[tier]);
    target.reached[tier] += source.reached[tier];
  }
  for (const [bucket, entry] of source.samples) {
    if (!target.samples.has(bucket)) target.samples.set(bucket, { prosperity: [], raids: [], population: [], tier: [] });
    const merged = target.samples.get(bucket);
    for (const key of ['prosperity', 'raids', 'population', 'tier']) merged[key].push(...entry[key]);
  }
  for (const [key, values] of Object.entries(source.totals)) target.totals[key].push(...values);
}

function runChunk(options, start, count) {
  return new Promise((resolveChunk, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: { simulate: true, options, start, count } });
    worker.once('message', (data) => resolveChunk({
      ...data,
      blocked: new Map(data.blocked),
      samples: new Map(data.samples),
    }));
    worker.once('error', reject);
    worker.once('exit', (code) => { if (code !== 0) reject(new Error(`Worker arrêté (code ${code})`)); });
  });
}

async function writeOutputs(report, outDir, options) {
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(join(outDir, 'curves.csv'), `${toCsv(report)}\n`);
  await writeFile(join(outDir, 'ages.csv'), `${agesCsv(report)}\n`);
  await writeFile(join(outDir, 'curves.svg'), toSvg(report));
  console.log(`Écrit : ${options.out}/summary.json, curves.csv, ages.csv, curves.svg`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = resolve(projectRoot, options.out);

  // Recalcule seulement les sorties depuis un summary.json déjà produit.
  if (options.renderOnly) {
    const source = resolve(projectRoot, options.renderOnly);
    const report = JSON.parse(await readFile(source, 'utf8'));
    printReport(report);
    await writeOutputs(report, outDir, options);
    return;
  }

  const aggregate = createAggregate();
  const started = performance.now();
  const workers = Math.max(1, Math.min(options.workers, options.games));

  if (workers === 1) {
    for (let index = 0; index < options.games; index += 1) {
      accumulate(aggregate, runGame(index, options));
      if (!options.quiet && (index + 1) % 100 === 0) {
        const elapsed = ((performance.now() - started) / 1000).toFixed(0);
        process.stdout.write(`  ${index + 1}/${options.games} parties (${elapsed} s)\r`);
      }
    }
  } else {
    const chunkSize = Math.ceil(options.games / workers);
    let done = 0;
    const chunks = [];
    for (let worker = 0; worker < workers; worker += 1) {
      const start = worker * chunkSize;
      const count = Math.min(chunkSize, options.games - start);
      if (count > 0) chunks.push({ start, count });
    }
    await Promise.all(chunks.map(async ({ start, count }) => {
      const partial = await runChunk(options, start, count);
      mergeAggregate(aggregate, partial);
      done += count;
      if (!options.quiet) {
        const elapsed = ((performance.now() - started) / 1000).toFixed(0);
        process.stdout.write(`  ${done}/${options.games} parties sur ${workers} workers (${elapsed} s)\r`);
      }
    }));
  }
  if (!options.quiet) process.stdout.write(`${' '.repeat(48)}\r`);

  const report = buildReport(aggregate, options);
  printReport(report);
  await writeOutputs(report, outDir, options);
  const seconds = (performance.now() - started) / 1000;
  console.log(`${seconds.toFixed(1)} s pour ${options.games} parties.`);
}

if (!isMainThread && workerData?.simulate) {
  const { options, start, count } = workerData;
  const aggregate = createAggregate();
  for (let index = start; index < start + count; index += 1) {
    accumulate(aggregate, runGame(index, options));
  }
  parentPort.postMessage({ ...aggregate, blocked: [...aggregate.blocked], samples: [...aggregate.samples] });
} else {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
