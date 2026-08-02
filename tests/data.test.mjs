import assert from 'node:assert/strict';
import {
  BUILDINGS,
  EXPEDITIONS,
  GAME_VERSION,
  PROGRESS_META,
  QUESTS,
  RANDOM_EVENTS,
  RESOURCE_META,
  TIERS,
} from '../src/data.js';

const resourceKeys = new Set(Object.keys(RESOURCE_META));
const effectKeys = new Set([...resourceKeys, ...Object.keys(PROGRESS_META)]);
const questTypes = new Set(['building', 'population', 'tier', 'expedition', 'victory']);
const expeditionModes = new Set(['sea', 'air', 'mixed']);

function assertUniqueIds(items, label) {
  const ids = items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, `${label} must have unique IDs`);
}

assert.equal(GAME_VERSION, '1.1.0');
assert.equal(QUESTS.length, 15, 'the campaign must expose 15 progressive quests');
assert.equal(EXPEDITIONS.length, 8, 'the expedition board must expose 8 routes');
assert.equal(RANDOM_EVENTS.length, 10, 'the event pool must expose 10 events');

assertUniqueIds(QUESTS, 'quests');
assertUniqueIds(EXPEDITIONS, 'expeditions');
assertUniqueIds(RANDOM_EVENTS, 'events');

for (const quest of QUESTS) {
  assert.ok(questTypes.has(quest.type), `unsupported quest type: ${quest.type}`);
  assert.ok(Number.isInteger(quest.amount) && quest.amount > 0, `invalid quest amount: ${quest.id}`);
  if (quest.type === 'building') assert.ok(BUILDINGS[quest.target], `unknown quest building: ${quest.target}`);
  if (quest.type === 'tier') assert.ok(quest.amount < TIERS.length, `unreachable quest tier: ${quest.id}`);
  for (const key of Object.keys(quest.reward)) assert.ok(effectKeys.has(key), `unknown quest reward: ${key}`);
}

const finalQuest = QUESTS.at(-1);
assert.equal(finalQuest.id, 'worldback');
assert.equal(finalQuest.type, 'tier');
assert.equal(finalQuest.amount, TIERS.length - 1);

for (const expedition of EXPEDITIONS) {
  assert.ok(expeditionModes.has(expedition.mode), `unsupported expedition mode: ${expedition.mode}`);
  assert.ok(expedition.duration > 0, `invalid expedition duration: ${expedition.id}`);
  assert.ok(expedition.danger >= 0 && expedition.danger <= 1, `invalid expedition danger: ${expedition.id}`);
  for (const [buildingId, amount] of Object.entries(expedition.requirements)) {
    assert.ok(BUILDINGS[buildingId], `unknown expedition requirement: ${buildingId}`);
    assert.ok(Number.isInteger(amount) && amount > 0, `invalid requirement amount: ${expedition.id}`);
  }
  for (const [key, range] of Object.entries(expedition.reward)) {
    assert.ok(effectKeys.has(key), `unknown expedition reward: ${key}`);
    assert.equal(range.length, 2, `invalid reward range: ${expedition.id}/${key}`);
    assert.ok(range[0] >= 0 && range[1] >= range[0], `reversed reward range: ${expedition.id}/${key}`);
  }
}

for (const event of RANDOM_EVENTS) {
  assert.ok(event.choices.length > 0, `event without choices: ${event.id}`);
  for (const choice of event.choices) {
    for (const key of Object.keys(choice.cost || {})) assert.ok(resourceKeys.has(key), `unspendable event cost: ${key}`);
    for (const key of Object.keys(choice.effect || {})) assert.ok(effectKeys.has(key), `unknown event effect: ${key}`);
  }
}

console.log('✓ contenu 1.1.0 cohérent : 15 quêtes, 8 expéditions, 10 événements.');
