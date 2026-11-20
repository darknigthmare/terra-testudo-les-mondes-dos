import {
  BUILD_CATEGORIES,
  BUILDINGS,
  EXPEDITIONS,
  GAME_VERSION,
  PROGRESS_META,
  QUESTS,
  RESOURCE_META,
  TERRAIN,
  TIERS,
} from './data.js';
import {
  buildingIcon,
  combatIcon,
  controlIcon,
  eventIcon,
  expeditionIcon,
  goalIcon,
  questIcon,
  resourceIcon,
  terrainIcon,
  worldIcon,
} from './icons.js';
import {
  activeBounds,
  attackNode,
  buildingCostAt,
  canAfford,
  canEvolve,
  claimQuest,
  closeCombat,
  countBuildings,
  createGame,
  currentQuest,
  deleteSave,
  demolishBuilding,
  evolve,
  expeditionAvailable,
  exploreNode,
  feedTurtle,
  getEconomy,
  getTile,
  hasSave,
  hydrateGame,
  isTileActive,
  loadGame,
  placeBuilding,
  questValue,
  repairBuilding,
  resolveEvent,
  saveGame,
  simulateSecond,
  startExpedition,
  startRaid,
  tradeWithNode,
  unlockedBuildingIds,
} from './state.js';
import { TurtleRenderer } from './render.js';
import { AudioManager } from './audio.js';

const $ = (selector) => document.querySelector(selector);
const elements = {
  startScreen: $('#startScreen'),
  gameApp: $('#gameApp'),
  newGameForm: $('#newGameForm'),
  continueBtn: $('#continueBtn'),
  startVersion: $('#startVersion'),
  cityNameInput: $('#cityNameInput'),
  turtleNameInput: $('#turtleNameInput'),
  brandCity: $('#brandCity'),
  brandTier: $('#brandTier'),
  resourceBar: $('#resourceBar'),
  pauseBtn: $('#pauseBtn'),
  speedBtn: $('#speedBtn'),
  saveBtn: $('#saveBtn'),
  soundBtn: $('#soundBtn'),
  helpBtn: $('#helpBtn'),
  commandPanel: $('#commandPanel'),
  inspectorPanel: $('#inspectorPanel'),
  commandTabs: $('#commandTabs'),
  commandContent: $('#commandContent'),
  inspectorContent: $('#inspectorContent'),
  gameCanvas: $('#gameCanvas'),
  shellViewBtn: $('#shellViewBtn'),
  worldViewBtn: $('#worldViewBtn'),
  worldStatus: $('#worldStatus'),
  raidBanner: $('#raidBanner'),
  canvasHint: $('#canvasHint'),
  mobileCommandBtn: $('#mobileCommandBtn'),
  mobileInspectorBtn: $('#mobileInspectorBtn'),
  cameraControls: $('#cameraControls'),
  zoomOutBtn: $('#zoomOutBtn'),
  zoomInBtn: $('#zoomInBtn'),
  recenterBtn: $('#recenterBtn'),
  closeCommandMobile: $('#closeCommandMobile'),
  closeInspectorMobile: $('#closeInspectorMobile'),
  eventModal: $('#eventModal'),
  eventTitle: $('#eventTitle'),
  eventText: $('#eventText'),
  eventChoices: $('#eventChoices'),
  eventSymbol: $('#eventSymbol'),
  combatModal: $('#combatModal'),
  combatResultSymbol: $('#combatResultSymbol'),
  combatResultTitle: $('#combatResultTitle'),
  combatResultText: $('#combatResultText'),
  combatReward: $('#combatReward'),
  closeCombatBtn: $('#closeCombatBtn'),
  helpModal: $('#helpModal'),
  closeHelpBtn: $('#closeHelpBtn'),
  helpScenes: $('#helpScenes'),
  helpStoryLead: $('#helpStoryLead'),
  helpStepLabel: $('#helpStepLabel'),
  helpBackBtn: $('#helpBackBtn'),
  helpNextBtn: $('#helpNextBtn'),
  helpDoneBtn: $('#helpDoneBtn'),
  gameAnnouncements: $('#gameAnnouncements'),
  campaignModal: $('#campaignModal'),
  campaignCrown: $('#campaignCrown'),
  campaignTitle: $('#campaignTitle'),
  campaignLead: $('#campaignLead'),
  campaignStats: $('#campaignStats'),
  campaignExportBtn: $('#campaignExportBtn'),
  campaignContinueBtn: $('#campaignContinueBtn'),
  toastStack: $('#toastStack'),
  brandMark: $('#brandMark'),
};

// Static chrome marks are drawn like every other pictogram, never set as a font glyph.
function paintStaticIcons() {
  elements.brandMark.innerHTML = worldIcon('turtle');
  elements.pauseBtn.innerHTML = controlIcon('pause');
  elements.saveBtn.innerHTML = controlIcon('save');
  elements.soundBtn.innerHTML = controlIcon('sound');
  elements.helpBtn.innerHTML = controlIcon('help');
  elements.campaignCrown.innerHTML = goalIcon('elder');
}

paintStaticIcons();

let state = null;
let renderer = null;
const audio = new AudioManager();
const ui = {
  activePanel: 'build',
  buildCategory: 'all',
  selectedBuildId: null,
  selectedTile: null,
  selectedWorldNodeId: null,
  view: 'shell',
  dismissedCombatId: null,
  newGame: false,
};

let lastFrame = performance.now();
let lastTopRender = 0;
let lastPanelRender = 0;
let lastAutosave = 0;
let lastCombatId = null;
let lastCombatOutcome = null;
let lastShotAt = 0;
let lastPendingRaid = false;
let lastRenderedEventId = null;
let lastRenderedCombatKey = null;
let helpStep = 0;
let modalReturnFocus = null;
const seenMessages = new Set();
const touchPoints = new Map();
let pinchGesture = null;
let suppressTap = false;
let suppressTapTimer = 0;

const ALL_META = { ...RESOURCE_META, ...PROGRESS_META };
const LEGACY_GOALS = [
  { id: 'elder', title: 'Porteuse d’un royaume', target: 4, value: (next) => next.tier },
  { id: 'population', title: 'Cent voix sur le dos', target: 100, value: (next) => Math.floor(next.population) },
  { id: 'expeditions', title: 'Maître des courants', target: 8, value: (next) => next.stats.expeditionsCompleted },
  { id: 'raids', title: 'Carapace imprenable', target: 5, value: (next) => next.stats.raidsWon },
  { id: 'enemies', title: 'Gardienne de l’archipel', target: 30, value: (next) => next.stats.enemiesDefeated },
  { id: 'worlds', title: 'Tous les mondes connus', target: 9, value: (next) => next.stats.worldsVisited },
  { id: 'allies', title: 'Fédération des géants', target: 3, value: (next) => next.worldNodes.filter((node) => node.relation >= 25 && !node.defeated).length },
  { id: 'monuments', title: 'Trois merveilles elder', target: 3, value: (next) => ['citadel', 'grandSanctuary', 'worldGate'].filter((id) => countBuildings(next, id) > 0).length },
];

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatNumber(value, precise = false) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(1)}k`;
  if (precise && Math.abs(number) < 100) return number.toFixed(1);
  return Math.floor(number).toLocaleString('fr-FR');
}

function formatRate(value) {
  if (Math.abs(value) < 0.005) return '±0/s';
  return `${value > 0 ? '+' : ''}${value.toFixed(Math.abs(value) < 1 ? 2 : 1)}/s`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes > 0 ? `${minutes} min ${rest.toString().padStart(2, '0')} s` : `${rest} s`;
}

function phaseName(progress) {
  if (progress < 0.18) return 'Nuit';
  if (progress < 0.31) return 'Aube';
  if (progress < 0.69) return 'Plein jour';
  if (progress < 0.82) return 'Crépuscule';
  return 'Nuit';
}

function relationInfo(value) {
  if (value >= 25) return { className: 'friendly', label: 'Allié' };
  if (value <= -25) return { className: 'hostile', label: 'Hostile' };
  return { className: 'neutral', label: 'Prudent' };
}

function resourceListHtml(values, stateRef = state, markMissing = false) {
  return Object.entries(values || {}).map(([resource, amount]) => {
    const meta = ALL_META[resource] || { name: resource };
    const missing = markMissing && resource in (stateRef?.resources || {}) && (stateRef.resources[resource] || 0) < amount;
    return `<span class="cost-chip ${missing ? 'missing' : ''}" title="${esc(meta.name)}"><span>${resourceIcon(resource)}</span>${formatNumber(amount, amount < 10)}</span>`;
  }).join('');
}

function rewardListHtml(values) {
  return Object.entries(values || {}).map(([resource, amount]) => {
    const meta = ALL_META[resource] || { name: resource };
    return `<span class="reward-chip"><span>${resourceIcon(resource)}</span><strong>${formatNumber(amount, amount < 10)}</strong> ${esc(meta.name)}</span>`;
  }).join('');
}

function buildingProductionText(data) {
  const parts = [];
  for (const [resource, amount] of Object.entries(data.production || {})) {
    const meta = ALL_META[resource] || { name: resource };
    parts.push(`+${amount}/s ${meta.name.toLowerCase()}`);
  }
  if (data.housing) parts.push(`+${data.housing} logements`);
  if (data.defense && data.targets?.length) parts.push(`${data.defense} défense`);
  if (data.armor) parts.push(`+${data.armor} vitalité max.`);
  return parts.join(' · ') || 'Infrastructure de soutien';
}

function requirementText(requirements) {
  const entries = Object.entries(requirements || {});
  if (!entries.length) return 'Disponible immédiatement';
  return entries.map(([id, amount]) => `${amount} ${BUILDINGS[id]?.name || id}`).join(', ');
}

function showToast(text, tone = 'info', duration = 3200) {
  const toast = document.createElement('div');
  toast.className = `toast ${tone}`;
  toast.textContent = text;
  elements.toastStack.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(16px)';
    window.setTimeout(() => toast.remove(), 180);
  }, duration);
}

function announce(text) {
  if (!elements.gameAnnouncements) return;
  elements.gameAnnouncements.textContent = '';
  window.setTimeout(() => { elements.gameAnnouncements.textContent = text; }, 20);
}

function rememberModalFocus() {
  if (
    document.activeElement instanceof HTMLElement
    && document.activeElement !== document.body
    && !document.activeElement.closest('.modal-layer')
  ) {
    modalReturnFocus = document.activeElement;
  }
}

function restoreModalFocus() {
  const target = modalReturnFocus?.isConnected ? modalReturnFocus : elements.gameCanvas;
  modalReturnFocus = null;
  target?.focus({ preventScroll: true });
}

function renderHelpStep() {
  const scenes = [...elements.helpScenes.querySelectorAll('[data-help-step]')];
  helpStep = Math.max(0, Math.min(scenes.length - 1, helpStep));
  for (const scene of scenes) {
    const active = Number(scene.dataset.helpStep) === helpStep;
    scene.hidden = !active;
    scene.classList.toggle('active', active);
  }
  elements.helpStepLabel.textContent = `Étape ${helpStep + 1} sur ${scenes.length}`;
  elements.helpBackBtn.hidden = helpStep === 0;
  elements.helpNextBtn.hidden = helpStep === scenes.length - 1;
  elements.helpDoneBtn.hidden = helpStep !== scenes.length - 1;
}

function openHelp(step = 0) {
  if (!state) return;
  rememberModalFocus();
  helpStep = step;
  elements.helpStoryLead.textContent = `${state.turtleName}, jeune tortue, confie sa carapace à ${state.cityName}. Une Maison-coquille est déjà debout ; l’équilibre entre la cité et l’être qui la porte décidera de leur avenir.`;
  renderHelpStep();
  elements.helpModal.hidden = false;
  elements.helpModal.querySelector('[data-help-step]:not([hidden]) h2')?.focus({ preventScroll: true });
  audio.play('click');
}

function closeHelp() {
  if (elements.helpModal.hidden) return;
  elements.helpModal.hidden = true;
  if (state) {
    state.tutorialStep = Math.max(1, Number(state.tutorialStep) || 0);
    saveGame(state, true);
  }
  restoreModalFocus();
}

function campaignStatsHtml() {
  const values = [
    ['Jours vécus', state.day],
    ['Habitants', Math.floor(state.population)],
    ['Bâtiments', countBuildings(state)],
    ['Expéditions', state.stats.expeditionsCompleted],
    ['Raids gagnés', state.stats.raidsWon],
    ['Mondes visités', state.stats.worldsVisited],
  ];
  return values.map(([label, value]) => `<div class="campaign-stat"><strong>${formatNumber(value)}</strong><span>${esc(label)}</span></div>`).join('');
}

function openCampaignConclusion() {
  if (!state || state.tier < TIERS.length - 1) return;
  rememberModalFocus();
  state.campaign = {
    ...(state.campaign || {}),
    completedAt: state.campaign?.completedAt || Date.now(),
    celebrated: false,
  };
  elements.campaignLead.textContent = `${state.turtleName} porte désormais ${state.cityName} comme un véritable monde. Des générations ont grandi sur sa carapace, entre les courants de la mer et les routes du ciel.`;
  elements.campaignStats.innerHTML = campaignStatsHtml();
  elements.campaignModal.hidden = false;
  elements.campaignTitle.focus({ preventScroll: true });
  saveGame(state, false);
  audio.play('victory');
}

function closeCampaignConclusion() {
  if (elements.campaignModal.hidden) return;
  elements.campaignModal.hidden = true;
  if (state) {
    state.campaign = { ...(state.campaign || {}), completedAt: state.campaign?.completedAt || Date.now(), celebrated: true };
    saveGame(state, false);
  }
  restoreModalFocus();
  renderAll(true);
}

function trapModalFocus(event, modal) {
  if (event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button:not([disabled]):not([hidden]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((item) => item instanceof HTMLElement && item.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function selectPanel(panel) {
  ui.activePanel = panel;
  for (const button of elements.commandTabs.querySelectorAll('button[data-panel]')) {
    const active = button.dataset.panel === panel;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  }
  if (panel === 'world') setView('world');
  renderPanels(true);
}

function setView(view) {
  ui.view = view;
  renderer?.setMode(view);
  elements.shellViewBtn.classList.toggle('active', view === 'shell');
  elements.worldViewBtn.classList.toggle('active', view === 'world');
  elements.shellViewBtn.setAttribute('aria-pressed', String(view === 'shell'));
  elements.worldViewBtn.setAttribute('aria-pressed', String(view === 'world'));
  elements.cameraControls.hidden = view !== 'shell';
  if (view === 'world') {
    ui.selectedBuildId = null;
    elements.gameCanvas.classList.remove('build-cursor');
  }
  renderTopUI();
  renderPanels(true);
}

function enterGame(nextState, isNew = false) {
  state = nextState;
  ui.newGame = isNew;
  ui.activePanel = 'build';
  ui.buildCategory = 'all';
  ui.selectedBuildId = null;
  ui.selectedTile = null;
  ui.selectedWorldNodeId = state.selectedWorldNodeId || null;
  ui.view = 'shell';
  ui.dismissedCombatId = null;
  elements.startScreen.hidden = true;
  elements.gameApp.hidden = false;

  if (!renderer) renderer = new TurtleRenderer(elements.gameCanvas);
  renderer.setMode('shell');
  renderer.resetCamera();
  elements.cameraControls.hidden = false;
  for (const message of state.messages) seenMessages.add(message.id);
  lastCombatId = state.combat?.id || null;
  lastCombatOutcome = state.combat?.outcome || null;
  lastPendingRaid = Boolean(state.pendingRaid);
  elements.commandPanel.classList.toggle('mobile-open', window.innerWidth <= 980 && isNew);
  elements.inspectorPanel.classList.remove('mobile-open');
  renderAll(true);
  saveGame(state, true);
  if ((isNew || Number(state.tutorialStep) < 1) && state.tier === 0) {
    window.setTimeout(() => openHelp(0), 0);
  } else if (state.tier >= TIERS.length - 1 && !state.campaign?.celebrated) {
    window.setTimeout(openCampaignConclusion, 0);
  } else {
    elements.gameCanvas.focus({ preventScroll: true });
  }
}

function updateResourceBar(economy) {
  elements.resourceBar.innerHTML = Object.entries(RESOURCE_META).map(([resource, meta]) => {
    const value = state.resources[resource] || 0;
    const rate = economy.net[resource] || 0;
    const rateClass = rate > 0.005 ? 'positive' : rate < -0.005 ? 'negative' : '';
    return `<div class="resource-chip" title="${esc(meta.name)}" aria-label="${esc(meta.name)} : ${formatNumber(value)}, ${esc(formatRate(rate))}">
      <span class="resource-icon">${resourceIcon(resource)}</span>
      <strong>${formatNumber(value)}</strong>
      <small class="${rateClass}">${formatRate(rate)}</small>
      <span class="sr-only">${esc(meta.name)}</span>
    </div>`;
  }).join('');
}

function updateRaidBanner() {
  if (state.combat && !state.combat.outcome) {
    const alive = state.combat.enemies.filter((enemy) => enemy.hp > 0).length;
    elements.raidBanner.hidden = false;
    elements.raidBanner.textContent = `${state.combat.type === 'air' ? 'RAID AÉRIEN' : 'RAID MARITIME'} · ${alive} ennemi${alive > 1 ? 's' : ''} encore en approche`;
  } else if (state.pendingRaid) {
    elements.raidBanner.hidden = false;
    elements.raidBanner.textContent = `MENACE ${state.pendingRaid.type === 'air' ? 'AÉRIENNE' : 'MARITIME'} · impact dans ${Math.max(0, Math.ceil(state.pendingRaid.countdown))} s`;
  } else {
    elements.raidBanner.hidden = true;
  }
}

function renderTopUI() {
  if (!state) return;
  const touchInput = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const economy = getEconomy(state);
  elements.brandCity.textContent = state.cityName;
  elements.brandTier.textContent = TIERS[state.tier].name;
  updateResourceBar(economy);
  elements.pauseBtn.innerHTML = controlIcon(state.paused ? 'play' : 'pause');
  elements.pauseBtn.classList.toggle('active', state.paused);
  elements.pauseBtn.setAttribute('aria-pressed', String(state.paused));
  elements.speedBtn.textContent = `×${state.gameSpeed}`;
  elements.soundBtn.classList.toggle('active', audio.enabled);
  elements.soundBtn.setAttribute('aria-pressed', String(audio.enabled));
  elements.worldStatus.innerHTML = `<strong>Jour ${state.day}</strong><span>${phaseName(state.dayProgress)} · ${esc(state.weather)}</span><span>Défense ${Math.round(economy.defense)}</span>`;
  updateRaidBanner();

  if (ui.view === 'world') {
    elements.canvasHint.textContent = 'Sélectionnez une créature-monde pour explorer, commercer ou lancer un assaut.';
  } else if (ui.selectedBuildId) {
    elements.canvasHint.textContent = `${BUILDINGS[ui.selectedBuildId].name} sélectionné — ${touchInput ? 'touchez' : 'cliquez sur'} une case compatible. Échap pour annuler.`;
  } else if (state.combat && !state.combat.outcome) {
    elements.canvasHint.textContent = 'Les défenses tirent automatiquement. Les ennemis qui atteignent la carapace infligent des dégâts.';
  } else {
    elements.canvasHint.textContent = touchInput
      ? 'Touchez une case pour l’inspecter. Pincez à deux doigts pour zoomer.'
      : 'Cliquez sur une case pour l’inspecter. Utilisez la molette pour zoomer.';
  }
}

function renderBuildPanel() {
  const unlocked = unlockedBuildingIds(state);
  const filtered = unlocked.filter((id) => ui.buildCategory === 'all' || BUILDINGS[id].category === ui.buildCategory);
  const nextTier = TIERS[state.tier + 1];
  const selected = ui.selectedBuildId ? BUILDINGS[ui.selectedBuildId] : null;

  return `<div class="section-block">
    ${selected ? `<div class="selected-build-banner">
      <strong>${buildingIcon(ui.selectedBuildId)} ${esc(selected.name)}</strong>
      <small>${esc(selected.description)}</small>
      <div class="inline-actions"><button class="small-button" data-action="cancel-build" type="button">Annuler la pose</button></div>
    </div>` : `<div class="info-card"><h3>Édifier sur la carapace</h3><p>Choisissez un bâtiment, puis cliquez sur une case. Le terrain et les voisins modifient les rendements.</p></div>`}

    <div class="filter-row" aria-label="Filtres de bâtiments">
      ${BUILD_CATEGORIES.map((category) => `<button class="filter-chip ${ui.buildCategory === category.id ? 'active' : ''}" data-action="build-category" data-id="${category.id}" type="button">${esc(category.name)}</button>`).join('')}
    </div>

    <div class="building-list">
      ${filtered.map((id) => {
        const data = BUILDINGS[id];
        const cost = buildingCostAt(state, id);
        const affordable = canAfford(state, cost);
        const count = countBuildings(state, id);
        return `<button class="building-card ${ui.selectedBuildId === id ? 'active' : ''}" data-action="select-build" data-id="${id}" type="button">
          <span class="building-icon">${buildingIcon(id)}</span>
          <span class="building-body">
            <span class="building-title-row"><strong>${esc(data.name)}</strong><small>${count > 0 ? `×${count}` : affordable ? 'Disponible' : 'À financer'}</small></span>
            <small>${esc(buildingProductionText(data))}</small>
            <span class="cost-row">${resourceListHtml(cost, state, true)}</span>
          </span>
        </button>`;
      }).join('') || `<div class="empty-state"><div><div class="empty-symbol">${buildingIcon('home')}</div><p>Aucun bâtiment dans cette catégorie.</p></div></div>`}
    </div>

    ${nextTier ? `<div class="info-card gold"><h3>Prochain âge : ${esc(nextTier.name)}</h3><p>${nextTier.unlocks.map((id) => BUILDINGS[id].name).join(' · ')}</p></div>` : ''}
  </div>`;
}

function renderExpeditionPanel() {
  const crewsBusy = Boolean(state.event || state.pendingRaid || state.combat);
  return `<div class="section-block">
    <div class="info-card"><h3>Partir au-delà du dos</h3><p>Les missions consomment des vivres. Les ports ouvrent la mer, les aérodromes le ciel et l’académie accélère les départs.</p></div>

    ${state.expeditions.length ? `<div class="section-title-row"><h3>Équipes en route</h3><small>${state.expeditions.length}/${2 + (countBuildings(state, 'academy') > 0 ? 1 : 0)}</small></div>
      <div class="card-list">${state.expeditions.map((running) => {
        const data = EXPEDITIONS.find((item) => item.id === running.dataId);
        const percent = 100 * (1 - running.remaining / running.total);
        return `<article class="expedition-card">
          <div class="card-header"><div><span class="card-symbol">${expeditionIcon(data.id)}</span><div><h4>${esc(data.name)}</h4><small>${data.mode === 'air' ? 'Voie aérienne' : data.mode === 'sea' ? 'Voie maritime' : 'Route mixte'}</small></div></div><small>${formatDuration(running.remaining)}</small></div>
          <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, percent)}%"></div></div>
          <div class="progress-labels"><span>En route</span><span>${Math.floor(percent)} %</span></div>
        </article>`;
      }).join('')}</div>` : ''}

    <div class="section-title-row"><h3>Missions disponibles</h3><small>${EXPEDITIONS.length} routes</small></div>
    <div class="card-list">
      ${EXPEDITIONS.map((data) => {
        const available = expeditionAvailable(state, data);
        const foodCost = Math.max(8, Math.ceil(data.duration * 0.32));
        const capacity = state.expeditions.length < 2 + (countBuildings(state, 'academy') > 0 ? 1 : 0);
        const canLaunch = available && capacity && !crewsBusy && state.resources.food >= foodCost;
        return `<article class="expedition-card ${available ? '' : 'locked'}">
          <div class="card-header"><div><span class="card-symbol">${expeditionIcon(data.id)}</span><div><h4>${esc(data.name)}</h4><small>${formatDuration(data.duration)} · danger ${Math.round(data.danger * 100)} %</small></div></div></div>
          <p class="card-description">${esc(data.description)}</p>
          <div class="cost-row"><span class="cost-chip ${state.resources.food < foodCost ? 'missing' : ''}"><span>${resourceIcon('food')}</span>${foodCost}</span><span class="cost-chip">Requis : ${esc(requirementText(data.requirements))}</span></div>
          <div class="cost-row">${Object.entries(data.reward).map(([resource, range]) => `<span class="cost-chip production-chip"><span>${resourceIcon(resource)}</span>${range[0]}–${range[1]}</span>`).join('')}</div>
          <button class="small-button ${canLaunch ? 'accent' : ''}" data-action="start-expedition" data-id="${data.id}" type="button" ${canLaunch ? '' : 'disabled'}>${crewsBusy ? 'Équipages mobilisés' : available ? capacity ? 'Préparer le départ' : 'Équipes occupées' : 'Infrastructure manquante'}</button>
        </article>`;
      }).join('')}
    </div>
  </div>`;
}

function renderEvolutionPanel() {
  const economy = getEconomy(state);
  const current = TIERS[state.tier];
  const next = TIERS[state.tier + 1];
  const validation = canEvolve(state);
  const path = TIERS.map((tier, index) => `<div class="tier-step ${index < state.tier ? 'completed' : index === state.tier ? 'current' : ''}">
    <span class="step-index">${index < state.tier ? '✓' : index + 1}</span>
    <div><strong>${esc(tier.name)}</strong><small>${tier.grid}×${tier.grid} · ${tier.populationCap} habitants max.</small></div>
  </div>`).join('');

  return `<div class="section-block">
    <div class="info-card gold"><h3>${esc(state.turtleName)} — ${esc(current.name)}</h3><p>${esc(current.description)}</p></div>

    <div class="metric-grid">
      ${metricCard('Satiété', state.satiety, 100, `${Math.round(state.satiety)} %`, 'satiety')}
      ${metricCard('Croissance', state.growth, next?.growthRequired || state.growth, `${formatNumber(state.growth, true)}${next ? `/${next.growthRequired}` : ''}`, 'growth')}
      ${metricCard('Harmonie', state.harmony, 100, `${Math.round(state.harmony)} %`, 'harmony')}
      ${metricCard('Vitalité', state.vitality, economy.maxVitality, `${Math.round(state.vitality)}/${Math.round(economy.maxVitality)}`, 'vitality')}
    </div>

    <button class="button secondary full" data-action="feed-turtle" type="button" ${state.resources.food >= 28 && state.satiety < 99 ? '' : 'disabled'}>Nourrir ${esc(state.turtleName)} · 28 vivres</button>

    ${next ? `<article class="tier-card">
      <div class="card-header"><div><span class="card-symbol">${questIcon('tier')}</span><div><h4>Éveil vers ${esc(next.name)}</h4><small>${next.grid}×${next.grid} cases · ${next.populationCap} habitants</small></div></div></div>
      <p class="card-description">${esc(next.description)}</p>
      <div class="requirement-list">
        ${requirementItem('Prospérité', state.prosperity, next.prosperityRequired)}
        ${requirementItem('Essence', state.resources.spirit, next.spiritRequired)}
        ${requirementItem('Croissance', state.growth, next.growthRequired)}
        ${requirementItem('Harmonie', state.harmony, 45)}
        ${requirementItem('Satiété', state.satiety, 35)}
      </div>
      <div class="cost-row"><span class="cost-chip">Rituel : ${resourceIcon('spirit')} ${Math.ceil(next.spiritRequired * 0.45)}</span></div>
      <button class="button primary full" data-action="evolve" type="button" ${validation.ok ? '' : 'disabled'}>Faire grandir la tortue-monde</button>
      ${validation.ok ? '' : `<small>${esc(validation.reason)}</small>`}
    </article>` : `<div class="info-card gold"><h3>Forme elder accomplie</h3><p>${esc(state.turtleName)} porte désormais un royaume vivant. Continuez à fédérer ou dominer l’archipel.</p></div>`}

    <div class="section-title-row"><h3>Chemin des âges</h3><small>${TIERS.length} formes</small></div>
    <div class="tier-path">${path}</div>
  </div>`;
}

function metricCard(label, value, max, text, className) {
  const percent = max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 100;
  return `<div class="metric-card" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${Math.max(0, max)}" aria-valuenow="${Math.max(0, value)}"><div class="metric-head"><span>${esc(label)}</span><strong>${esc(text)}</strong></div><div class="bar-track"><div class="bar-fill ${className}" style="width:${percent}%"></div></div></div>`;
}

function requirementItem(label, value, needed) {
  const done = value >= needed;
  return `<div class="requirement-item ${done ? 'done' : 'missing'}"><span>${esc(label)}</span><strong>${formatNumber(value, true)} / ${formatNumber(needed, true)}</strong></div>`;
}

function renderWorldPanel() {
  const nodes = state.worldNodes.filter((node) => node.discovered);
  return `<div class="section-block">
    <div class="info-card"><h3>L’archipel des géants</h3><p>D’autres peuples vivent sur des tortues, baleines, raies célestes et monstres-mondes. Vos décisions modifient durablement leurs relations.</p></div>
    <button class="button primary full" data-action="set-view" data-view="world" type="button">Ouvrir la carte de l’archipel</button>
    <div class="section-title-row"><h3>Mondes connus</h3><small>${nodes.length}/${state.worldNodes.length}</small></div>
    <div class="card-list">
      ${nodes.map((node) => {
        const relation = relationInfo(node.relation);
        return `<article class="node-card ${node.defeated ? 'locked' : ''}">
          <div class="card-header"><div><span class="card-symbol">${worldIcon(node.kind)}</span><div><h4>${esc(node.name)}</h4><small>${esc(node.faction)}</small></div></div><span class="node-relation ${relation.className}">${relation.label} ${node.relation > 0 ? '+' : ''}${node.relation}</span></div>
          <p class="card-description">${esc(node.description)}</p>
          <div class="stat-pairs"><div class="stat-pair"><span>Puissance</span><strong>${Math.round(node.power)}</strong></div><div class="stat-pair"><span>Accès</span><strong>${node.altitude === 'air' ? 'Ciel' : 'Mer'}</strong></div></div>
          <button class="small-button" data-action="select-node" data-id="${node.id}" type="button" ${node.defeated ? 'disabled' : ''}>Observer ce monde</button>
        </article>`;
      }).join('')}
    </div>
  </div>`;
}

function renderLegacyGoals() {
  const completed = LEGACY_GOALS.filter((goal) => goal.value(state) >= goal.target).length;
  return `<div class="section-title-row"><h3>Héritages du monde</h3><small>${completed}/${LEGACY_GOALS.length}</small></div>
    <div class="legacy-grid">
      ${LEGACY_GOALS.map((goal) => {
        const value = Math.max(0, goal.value(state));
        const done = value >= goal.target;
        return `<article class="legacy-goal ${done ? 'done' : ''}"><span>${goalIcon(goal.id)}</span><div><strong>${esc(goal.title)}</strong><small>${done ? 'Accompli' : 'Objectif de mode libre'}</small></div><em>${formatNumber(Math.min(value, goal.target))}/${goal.target}</em></article>`;
      }).join('')}
    </div>`;
}

function renderChroniclePanel() {
  const stats = state.stats;
  return `<div class="section-block">
    <div class="stat-pairs">
      <div class="stat-pair"><span>Bâtiments posés</span><strong>${stats.buildingsPlaced}</strong></div>
      <div class="stat-pair"><span>Expéditions</span><strong>${stats.expeditionsCompleted}</strong></div>
      <div class="stat-pair"><span>Raids remportés</span><strong>${stats.raidsWon}</strong></div>
      <div class="stat-pair"><span>Ennemis vaincus</span><strong>${stats.enemiesDefeated}</strong></div>
      <div class="stat-pair"><span>Mondes visités</span><strong>${stats.worldsVisited}</strong></div>
      <div class="stat-pair"><span>Échanges</span><strong>${stats.trades}</strong></div>
    </div>

    ${renderLegacyGoals()}

    <div class="info-card danger"><h3>Éprouver les défenses</h3><p>Lance immédiatement un véritable raid. Les dégâts et récompenses sont conservés.</p>
      <div class="inline-actions" style="margin-top:9px">
        <button class="small-button danger" data-action="manual-raid" data-type="sea" type="button" ${state.combat || state.pendingRaid ? 'disabled' : ''}>Raid maritime</button>
        <button class="small-button danger" data-action="manual-raid" data-type="air" type="button" ${state.combat || state.pendingRaid ? 'disabled' : ''}>Raid aérien</button>
      </div>
    </div>

    <div class="section-title-row"><h3>Journal du voyage</h3><small>Jour ${state.day}</small></div>
    <div class="message-list">${state.messages.map((message) => `<div class="message-item ${message.tone}"><span class="message-dot"></span><div><p>${esc(message.text)}</p><time>${message.at < 1 ? 'Départ' : `J${Math.max(1, Math.floor(message.at / 72) + 1)}`}</time></div></div>`).join('')}</div>

    <div class="info-card"><h3>Sauvegarde</h3><p>La partie est enregistrée automatiquement. Vous pouvez aussi exporter un fichier JSON pour la transférer.</p>
      <div class="inline-actions" style="margin-top:9px">
        <button class="small-button" data-action="manual-save" type="button">Sauvegarder</button>
        <button class="small-button" data-action="export-save" type="button">Exporter</button>
        <button class="small-button" data-action="import-save" type="button">Importer</button>
        <button class="small-button danger" data-action="reset-game" type="button">Nouvelle partie</button>
      </div>
    </div>
  </div>`;
}

function renderCommandPanel() {
  const scrollTop = elements.commandContent.scrollTop;
  if (ui.activePanel === 'build') elements.commandContent.innerHTML = renderBuildPanel();
  else if (ui.activePanel === 'expeditions') elements.commandContent.innerHTML = renderExpeditionPanel();
  else if (ui.activePanel === 'evolution') elements.commandContent.innerHTML = renderEvolutionPanel();
  else if (ui.activePanel === 'world') elements.commandContent.innerHTML = renderWorldPanel();
  else elements.commandContent.innerHTML = renderChroniclePanel();
  elements.commandContent.scrollTop = scrollTop;
}

function renderQuestCard() {
  const quest = currentQuest(state);
  if (!quest)   return `<article class="quest-card ready"><span class="eyebrow">DESTIN ACCOMPLI</span><h3>${questIcon('victory')} Chronique complète</h3><p>Tous les objectifs fondateurs sont achevés. Le monde continue librement.</p></article>`;
  const value = questValue(state, quest);
  const percent = Math.min(100, value / quest.amount * 100);
  const ready = state.completedQuests.includes(quest.id) && !state.claimedQuests.includes(quest.id);
  return `<article class="quest-card ${ready ? 'ready' : ''}">
    <span class="eyebrow">OBJECTIF ACTUEL</span>
    <h3>${questIcon(quest.type)} ${esc(quest.title)}</h3>
    <p>${esc(quest.text)}</p>
    <div class="progress-track" role="progressbar" aria-label="Progression de l’objectif" aria-valuemin="0" aria-valuemax="${quest.amount}" aria-valuenow="${value}"><div class="progress-fill" style="width:${percent}%"></div></div>
    <div class="progress-labels"><span>${formatNumber(value, true)} / ${quest.amount}</span><span>${Math.floor(percent)} %</span></div>
    <div class="cost-row">${resourceListHtml(quest.reward)}</div>
    ${ready ? `<button class="small-button accent" data-action="claim-quest" data-id="${quest.id}" type="button">Recevoir la récompense</button>` : ''}
  </article>`;
}

function renderVitalSummary(economy) {
  return `<div class="metric-grid">
    ${metricCard('Population', state.population, economy.housing, `${Math.floor(state.population)}/${economy.housing}`, 'population')}
    ${metricCard('Vitalité', state.vitality, economy.maxVitality, `${Math.round(state.vitality)}/${Math.round(economy.maxVitality)}`, 'vitality')}
    ${metricCard('Harmonie', state.harmony, 100, `${Math.round(state.harmony)} %`, 'harmony')}
    ${metricCard('Satiété', state.satiety, 100, `${Math.round(state.satiety)} %`, 'satiety')}
  </div>`;
}

function renderEconomyInspector(economy) {
  const bounds = activeBounds(state);
  return `<article class="info-card">
    <h3>${esc(state.cityName)}</h3>
    <p>${esc(TIERS[state.tier].subtitle)}. ${bounds.size}×${bounds.size} cases éveillées sur la carapace.</p>
  </article>
  <div class="stat-pairs">
    <div class="stat-pair"><span>Ouvriers</span><strong>${Math.floor(state.population * 0.72)}/${economy.workersRequired}</strong></div>
    <div class="stat-pair"><span>Efficacité</span><strong>${Math.round(economy.workerEfficiency * 100)} %</strong></div>
    <div class="stat-pair"><span>Défense mer</span><strong>${Math.round(economy.seaDefense)}</strong></div>
    <div class="stat-pair"><span>Défense air</span><strong>${Math.round(economy.airDefense)}</strong></div>
  </div>
  <article class="info-card"><h3>Conseil de la cité</h3><p>${economy.net.food < 0 ? 'Les vivres diminuent. Ajoutez des fermes ou des réservoirs avant d’accueillir de nouveaux habitants.' : economy.workerEfficiency < 0.72 ? 'Les bâtiments manquent d’ouvriers. Construisez des maisons et laissez la population croître.' : economy.defense < 8 ? 'La cité reste vulnérable. Une tour de vigie limitera les dégâts du prochain raid.' : 'La cité est stable. Préparez la prochaine évolution ou ouvrez une route vers l’archipel.'}</p></article>`;
}

function renderTileInspector(tile) {
  const terrain = TERRAIN[tile.terrain];
  if (!tile.building) {
    const compatible = unlockedBuildingIds(state)
      .filter((id) => BUILDINGS[id].allowed.includes(tile.terrain))
      .slice(0, 4)
      .map((id) => BUILDINGS[id].name)
      .join(' · ');
    return `<article class="tile-card">
      <div class="tile-title"><div><h3>${esc(terrain.name)}</h3><small>Case ${tile.x + 1}, ${tile.y + 1}</small></div><span class="tile-symbol">${terrainIcon(tile.terrain)}</span></div>
      <p class="card-description">Case libre de la carapace. ${terrain.production ? `Affinité naturelle : ${RESOURCE_META[terrain.production]?.name || terrain.production}.` : 'Terrain polyvalent.'}</p>
      <div class="detail-row"><span>Constructible</span><strong>${compatible ? 'Oui' : 'Non'}</strong></div>
      <div class="info-card"><h3>Constructions adaptées</h3><p>${compatible || 'Aucun bâtiment actuellement débloqué.'}</p></div>
      <button class="small-button" data-action="open-build-for-tile" type="button">Choisir un bâtiment</button>
    </article>`;
  }

  const data = BUILDINGS[tile.building.id];
  const hp = tile.building.hp;
  return `<article class="tile-card">
    <div class="tile-title"><div><h3>${buildingIcon(tile.building.id)} ${esc(data.name)}</h3><small>${esc(terrain.name)}${tile.building.level > 1 ? ` · niveau ${tile.building.level}` : ''}</small></div><span class="tile-symbol">${buildingIcon(tile.building.id)}</span></div>
    <p class="card-description">${esc(data.description)}</p>
    <div class="progress-track"><div class="progress-fill ${hp < 45 ? 'danger' : ''}" style="width:${Math.max(0, hp)}%"></div></div>
    <div class="progress-labels"><span>Intégrité</span><span>${Math.round(hp)} %</span></div>
    <div class="detail-row"><span>Production</span><strong>${esc(buildingProductionText(data))}</strong></div>
    <div class="detail-row"><span>Ouvriers</span><strong>${data.workers || 0}</strong></div>
    ${data.defense && data.targets?.length ? `<div class="detail-row"><span>Défense</span><strong>${data.defense} · ${data.targets.map((target) => target === 'air' ? 'Ciel' : 'Mer').join(' + ')}</strong></div>` : ''}
    ${data.armor ? `<div class="detail-row"><span>Armure</span><strong>+${data.armor} vitalité max.</strong></div>` : ''}
    <div class="inline-actions">
      <button class="small-button" data-action="repair-building" type="button" ${hp >= 99.5 ? 'disabled' : ''}>Réparer</button>
      <button class="small-button danger" data-action="demolish-building" type="button">Démolir</button>
    </div>
  </article>`;
}

function renderWorldNodeInspector(node) {
  const relation = relationInfo(node.relation);
  const seaAvailable = countBuildings(state, 'harbor') > 0;
  const airAvailable = countBuildings(state, 'skyDock') + countBuildings(state, 'aerie') > 0;
  const accessAvailable = node.altitude === 'air' ? airAvailable : seaAvailable;
  const assaultMode = node.altitude === 'air' ? 'air' : 'sea';
  const cooldown = Math.max(0, Math.ceil(Number(node.cooldown) || 0));
  const crewsBusy = Boolean(state.event || state.pendingRaid || state.combat);
  const actionsLocked = node.defeated || !accessAvailable || cooldown > 0 || crewsBusy;
  const tradeCost = node.preferred === 'spirit' ? { spirit: 12 } : { food: 24 };
  return `<article class="node-card">
    <div class="card-header"><div><span class="card-symbol">${worldIcon(node.kind)}</span><div><h4>${esc(node.name)}</h4><small>${esc(node.faction)}</small></div></div><span class="node-relation ${relation.className}">${relation.label} ${node.relation > 0 ? '+' : ''}${node.relation}</span></div>
    <p class="card-description">${esc(node.description)}</p>
    <div class="stat-pairs">
      <div class="stat-pair"><span>Puissance</span><strong>${Math.round(node.power)}</strong></div>
      <div class="stat-pair"><span>Milieu</span><strong>${node.altitude === 'air' ? 'Céleste' : 'Maritime'}</strong></div>
      <div class="stat-pair"><span>Visité</span><strong>${node.visited ? 'Oui' : 'Non'}</strong></div>
      <div class="stat-pair"><span>État</span><strong>${node.defeated ? 'Vaincu' : cooldown > 0 ? `Retour dans ${cooldown} s` : accessAvailable ? 'Disponible' : node.altitude === 'air' ? 'Voie aérienne requise' : 'Port requis'}</strong></div>
    </div>
    <div class="section-title-row"><h3>Diplomatie</h3><small>Les choix persistent</small></div>
    <div class="inline-actions">
      <button class="small-button" data-action="explore-node" data-id="${node.id}" type="button" ${actionsLocked || state.resources.food < 18 ? 'disabled' : ''}>${cooldown > 0 ? `Équipage en route · ${cooldown} s` : node.visited ? `Revisiter · ${resourceIcon('food')} 18` : `Première approche · ${resourceIcon('food')} 18`}</button>
      <button class="small-button" data-action="trade-node" data-id="${node.id}" type="button" ${actionsLocked || node.relation <= -25 || !canAfford(state, tradeCost) ? 'disabled' : ''}>Échanger · ${resourceListHtml(tradeCost)}</button>
    </div>
    <div class="section-title-row"><h3>Assaut</h3><small>Coût : ${resourceIcon('food')} 26 · ${resourceIcon('pearls')} 6</small></div>
    <div class="inline-actions">
      <button class="small-button danger" data-action="attack-node" data-id="${node.id}" type="button" ${node.defeated || !accessAvailable || cooldown > 0 || crewsBusy ? 'disabled' : ''}>${assaultMode === 'air' ? 'Assaut aérien' : 'Assaut maritime'}</button>
    </div>
  </article>`;
}

function renderInspector() {
  const scrollTop = elements.inspectorContent.scrollTop;
  const economy = getEconomy(state);
  let context = '';
  if (ui.view === 'world' && ui.selectedWorldNodeId) {
    const node = state.worldNodes.find((item) => item.id === ui.selectedWorldNodeId);
    context = node ? renderWorldNodeInspector(node) : renderEconomyInspector(economy);
  } else if (ui.view === 'shell' && ui.selectedTile) {
    const tile = getTile(state, ui.selectedTile.x, ui.selectedTile.y);
    context = tile && isTileActive(state, tile.x, tile.y) ? renderTileInspector(tile) : renderEconomyInspector(economy);
  } else {
    context = renderEconomyInspector(economy);
  }

  elements.inspectorContent.innerHTML = `<div class="section-block">${renderVitalSummary(economy)}${renderQuestCard()}${context}</div>`;
  elements.inspectorContent.scrollTop = scrollTop;
}

function renderPanels(force = false) {
  if (!state) return;
  renderCommandPanel();
  renderInspector();
  for (const button of elements.commandTabs.querySelectorAll('button[data-panel]')) {
    const active = button.dataset.panel === ui.activePanel;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  }
  if (force) lastPanelRender = performance.now();
}

function renderEventModal() {
  if (!state?.event) {
    elements.eventModal.hidden = true;
    lastRenderedEventId = null;
    return;
  }
  if (!elements.eventModal.hidden && lastRenderedEventId === state.event.id) return;
  elements.eventModal.hidden = false;
  lastRenderedEventId = state.event.id;
  elements.eventSymbol.innerHTML = eventIcon(state.event.id);
  elements.eventTitle.textContent = state.event.title;
  elements.eventText.textContent = state.event.text;
  elements.eventChoices.innerHTML = state.event.choices.map((choice, index) => {
    const available = !choice.cost || canAfford(state, choice.cost);
    return `<button class="choice-button" data-choice="${index}" type="button" ${available ? '' : 'disabled'}>
      <strong>${esc(choice.label)}</strong>
      <small>${choice.cost ? `Coût : ${stripTags(resourceListHtml(choice.cost))}` : 'Aucun coût'} · Effet : ${stripTags(resourceListHtml(choice.effect || {}))}</small>
    </button>`;
  }).join('');
}

function stripTags(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function renderCombatModal() {
  const combat = state?.combat;
  if (!combat?.outcome || ui.dismissedCombatId === combat.id) {
    elements.combatModal.hidden = true;
    lastRenderedCombatKey = null;
    return;
  }
  const combatKey = `${combat.id}-${combat.outcome}`;
  if (!elements.combatModal.hidden && lastRenderedCombatKey === combatKey) return;
  elements.combatModal.hidden = false;
  lastRenderedCombatKey = combatKey;
  const victory = combat.outcome === 'victory';
  elements.combatResultSymbol.innerHTML = combatIcon(victory ? 'victory' : 'defeat');
  elements.combatResultTitle.textContent = victory ? (combat.breaches ? 'La carapace a survécu' : 'La carapace tient bon') : 'La tortue a dû plonger';
  elements.combatResultText.textContent = victory
    ? `${combat.kills || 0} assaillant${(combat.kills || 0) > 1 ? 's ont' : ' a'} été neutralisé${(combat.kills || 0) > 1 ? 's' : ''}${combat.breaches ? ` et ${combat.breaches} ont atteint le dos` : ''}. Le résultat modifie les récompenses et le prestige du monde.`
    : `La cité a survécu, mais ${state.turtleName} est blessée. Réparez les quartiers, restaurez les vivres et renforcez les défenses.`;
  elements.combatReward.innerHTML = victory ? rewardListHtml(combat.reward) : `<span class="reward-chip">Dégâts subis : ${Math.round(combat.damageTaken)}</span>`;
}

function renderAll(force = false) {
  renderTopUI();
  renderPanels(force);
  renderEventModal();
  renderCombatModal();
  if (force) {
    lastTopRender = performance.now();
    lastPanelRender = performance.now();
  }
}

function handleResult(result, successMessage = null, sound = 'click') {
  if (!result?.ok) {
    audio.play('error');
    showToast(result?.reason || 'Action impossible.', 'danger');
    return false;
  }
  audio.play(sound);
  if (successMessage) showToast(successMessage, 'good');
  renderAll(true);
  return true;
}

function handleCommandAction(action, target) {
  if (!state) return;
  switch (action) {
    case 'select-build': {
      const id = target.dataset.id;
      ui.selectedBuildId = ui.selectedBuildId === id ? null : id;
      if (ui.selectedBuildId) {
        setView('shell');
        elements.gameCanvas.classList.add('build-cursor');
        audio.play('click');
      } else {
        elements.gameCanvas.classList.remove('build-cursor');
      }
      renderAll(true);
      break;
    }
    case 'cancel-build':
      ui.selectedBuildId = null;
      elements.gameCanvas.classList.remove('build-cursor');
      renderAll(true);
      break;
    case 'build-category':
      ui.buildCategory = target.dataset.id;
      renderPanels(true);
      break;
    case 'start-expedition':
      handleResult(startExpedition(state, target.dataset.id), null, 'build');
      break;
    case 'feed-turtle':
      handleResult(feedTurtle(state), null, 'build');
      break;
    case 'evolve': {
      const before = state.tier;
      const result = evolve(state);
      if (handleResult(result, null, 'evolve') && state.tier !== before) {
        renderer.resetCamera();
        ui.selectedTile = null;
        saveGame(state, false);
        if (state.tier === TIERS.length - 1) window.setTimeout(openCampaignConclusion, 220);
      }
      break;
    }
    case 'set-view':
      setView(target.dataset.view || 'world');
      break;
    case 'select-node':
      ui.selectedWorldNodeId = target.dataset.id;
      state.selectedWorldNodeId = ui.selectedWorldNodeId;
      setView('world');
      elements.inspectorPanel.classList.add('mobile-open');
      audio.play('click');
      break;
    case 'manual-raid':
      if (handleResult(startRaid(state, target.dataset.type), null, 'alert')) setView('shell');
      break;
    case 'manual-save':
      if (saveGame(state, false)) {
        audio.play('quest');
        showToast('Partie sauvegardée.', 'good');
      } else showToast('La sauvegarde a échoué.', 'danger');
      break;
    case 'export-save':
      exportSave();
      break;
    case 'import-save':
      importSave();
      break;
    case 'reset-game':
      if (window.confirm('Quitter cette partie et revenir au menu principal ? La sauvegarde actuelle restera disponible tant qu’une nouvelle partie ne la remplace pas.')) {
        saveGame(state, false);
        state = null;
        elements.gameApp.hidden = true;
        elements.startScreen.hidden = false;
        elements.continueBtn.disabled = !hasSave();
      }
      break;
    default:
      break;
  }
}

function handleInspectorAction(action, target) {
  if (!state) return;
  switch (action) {
    case 'claim-quest':
      handleResult(claimQuest(state, target.dataset.id), null, 'quest');
      break;
    case 'open-build-for-tile':
      selectPanel('build');
      elements.commandPanel.classList.add('mobile-open');
      break;
    case 'repair-building':
      if (ui.selectedTile) handleResult(repairBuilding(state, ui.selectedTile.x, ui.selectedTile.y), null, 'build');
      break;
    case 'demolish-building':
      if (ui.selectedTile && window.confirm('Démolir ce bâtiment et récupérer 40 % des matériaux ?')) {
        handleResult(demolishBuilding(state, ui.selectedTile.x, ui.selectedTile.y), null, 'build');
      }
      break;
    case 'explore-node':
      handleResult(exploreNode(state, target.dataset.id), null, 'quest');
      break;
    case 'trade-node':
      handleResult(tradeWithNode(state, target.dataset.id), null, 'quest');
      break;
    case 'attack-node': {
      const result = attackNode(state, target.dataset.id);
      if (handleResult(result, null, 'alert')) setView('shell');
      break;
    }
    default:
      handleCommandAction(action, target);
  }
}

function exportSave() {
  if (!state) return;
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `terra-testudo-${state.cityName.toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'save'}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  audio.play('quest');
  showToast('Sauvegarde exportée.', 'good');
}

function importSave() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const imported = hydrateGame(parsed, true);
      if (!imported) throw new Error('Format invalide');
      enterGame(imported, false);
      saveGame(imported, false);
      showToast('Sauvegarde importée.', 'good');
      audio.play('quest');
    } catch (error) {
      console.error(error);
      showToast('Ce fichier de sauvegarde est invalide.', 'danger');
      audio.play('error');
    }
  }, { once: true });
  input.click();
}

function touchPoint(event) {
  const rect = elements.gameCanvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function touchMidpoint(first, second) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function touchSpan(first, second) {
  return Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
}

function handleCanvasClick(event) {
  if (!state || state.event || suppressTap) return;
  audio.ensure();
  if (ui.view === 'world') {
    const nodeId = renderer.hitTestWorldNode(event.clientX, event.clientY);
    if (nodeId) {
      ui.selectedWorldNodeId = nodeId;
      state.selectedWorldNodeId = nodeId;
      renderer.selectedNodeId = nodeId;
      elements.inspectorPanel.classList.add('mobile-open');
      audio.play('click');
      renderAll(true);
    }
    return;
  }

  const tilePosition = renderer.hitTestTile(state, event.clientX, event.clientY);
  if (!tilePosition) return;
  ui.selectedTile = tilePosition;
  renderer.selectedTile = tilePosition;
  announceSelectedTile();
  if (ui.selectedBuildId) {
    if (state.combat && !state.combat.outcome) {
      showToast('Impossible de construire pendant un raid.', 'warn');
      audio.play('error');
    } else {
      const result = placeBuilding(state, ui.selectedBuildId, tilePosition.x, tilePosition.y);
      handleResult(result, null, result.ok ? 'build' : 'error');
    }
  } else {
    audio.play('click');
    renderPanels(true);
    if (window.innerWidth <= 720) elements.inspectorPanel.classList.add('mobile-open');
  }
}

function selectedTileDescription() {
  if (!state || !ui.selectedTile) return 'Aucune case sélectionnée.';
  const tile = getTile(state, ui.selectedTile.x, ui.selectedTile.y);
  if (!tile) return 'Case indisponible.';
  const terrain = TERRAIN[tile.terrain]?.name || 'Terrain inconnu';
  const occupant = tile.building ? BUILDINGS[tile.building.id]?.name || 'Bâtiment' : 'case libre';
  return `Case ${tile.x + 1}, ${tile.y + 1}, ${terrain}, ${occupant}.`;
}

function announceSelectedTile(extra = '') {
  announce(`${selectedTileDescription()}${extra ? ` ${extra}` : ''}`);
}

function moveTileSelection(dx, dy) {
  if (!state || ui.view !== 'shell') return;
  const bounds = activeBounds(state);
  const start = ui.selectedTile || {
    x: Math.floor((bounds.start + bounds.end) / 2),
    y: Math.floor((bounds.start + bounds.end) / 2),
  };
  ui.selectedTile = {
    x: Math.max(bounds.start, Math.min(bounds.end, start.x + dx)),
    y: Math.max(bounds.start, Math.min(bounds.end, start.y + dy)),
  };
  renderer.selectedTile = ui.selectedTile;
  renderPanels(true);
  announceSelectedTile();
}

function activateSelectedTile() {
  if (!state || ui.view !== 'shell') {
    announce('Passez en vue Carapace pour parcourir les cases au clavier.');
    return;
  }
  if (!ui.selectedTile) moveTileSelection(0, 0);
  if (!ui.selectedBuildId) {
    renderPanels(true);
    announceSelectedTile('Inspection ouverte.');
    return;
  }
  if (state.combat && !state.combat.outcome) {
    showToast('Impossible de construire pendant un raid.', 'warn');
    announce('Construction impossible pendant un raid.');
    audio.play('error');
    return;
  }
  const id = ui.selectedBuildId;
  const result = placeBuilding(state, id, ui.selectedTile.x, ui.selectedTile.y);
  if (handleResult(result, null, result.ok ? 'build' : 'error')) {
    announceSelectedTile(`${BUILDINGS[id].name} construit.`);
  } else {
    announce(result.reason || 'Construction impossible.');
  }
}

function processAudioCues(now) {
  if (!state) return;
  const combatId = state.combat?.id || null;
  if (combatId && combatId !== lastCombatId) {
    audio.play('alert');
    lastCombatId = combatId;
  }
  const outcome = state.combat?.outcome || null;
  if (outcome && outcome !== lastCombatOutcome) {
    audio.play(outcome === 'victory' ? 'victory' : 'error');
    lastCombatOutcome = outcome;
  }
  if (!state.combat) {
    lastCombatId = null;
    lastCombatOutcome = null;
  }
  if (state.combat && state.combat.projectiles.length && now - lastShotAt > 340) {
    audio.play('shot');
    lastShotAt = now;
  }
  const pending = Boolean(state.pendingRaid);
  if (pending && !lastPendingRaid) audio.play('alert');
  lastPendingRaid = pending;
}

function processMessages() {
  if (!state) return;
  const unseen = state.messages.filter((message) => !seenMessages.has(message.id)).slice(0, 3).reverse();
  for (const message of unseen) {
    seenMessages.add(message.id);
    showToast(message.text, message.tone, message.tone === 'danger' ? 4400 : 3200);
  }
  if (seenMessages.size > 160) {
    const keep = new Set(state.messages.map((message) => message.id));
    for (const id of seenMessages) if (!keep.has(id)) seenMessages.delete(id);
  }
}

function frame(now) {
  const delta = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (state && renderer) {
    const simulationBlocked = !elements.helpModal.hidden
      || !elements.campaignModal.hidden
      || Boolean(state.event)
      || Boolean(state.combat?.outcome);
    if (!simulationBlocked) simulateSecond(state, delta);
    renderer.selectedTile = ui.selectedTile;
    renderer.selectedNodeId = ui.selectedWorldNodeId;
    const renderDelta = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : delta;
    renderer.render(state, ui, renderDelta);
    processAudioCues(now);
    processMessages();

    if (now - lastTopRender > 250) {
      renderTopUI();
      renderEventModal();
      renderCombatModal();
      lastTopRender = now;
    }
    if (now - lastPanelRender > 1000) {
      renderPanels();
      lastPanelRender = now;
    }
    if (now - lastAutosave > 12000) {
      saveGame(state, true);
      lastAutosave = now;
    }
  }
  requestAnimationFrame(frame);
}

function bindEvents() {
  elements.startVersion.textContent = GAME_VERSION;
  elements.continueBtn.disabled = !hasSave();

  elements.newGameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (hasSave() && !window.confirm('Fonder un nouveau monde remplacera les sauvegardes locales actuelles. Exportez-les d’abord si vous souhaitez les conserver. Continuer ?')) return;
    const form = new FormData(elements.newGameForm);
    const next = createGame({
      cityName: form.get('cityName'),
      turtleName: form.get('turtleName'),
      difficulty: form.get('difficulty'),
    });
    deleteSave();
    saveGame(next, false);
    enterGame(next, true);
    audio.ensure();
  });

  elements.continueBtn.addEventListener('click', () => {
    const loaded = loadGame();
    if (!loaded) {
      elements.continueBtn.disabled = true;
      showToast('Aucune sauvegarde valide trouvée.', 'danger');
      return;
    }
    enterGame(loaded, false);
    audio.ensure();
  });

  elements.commandTabs.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-panel]');
    if (button) selectPanel(button.dataset.panel);
  });

  elements.commandContent.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (target) handleCommandAction(target.dataset.action, target);
  });

  elements.inspectorContent.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (target) handleInspectorAction(target.dataset.action, target);
  });

  elements.gameCanvas.addEventListener('pointerdown', (event) => {
    if (!state || !renderer || event.pointerType !== 'touch' || ui.view !== 'shell') return;
    touchPoints.set(event.pointerId, touchPoint(event));
    try { elements.gameCanvas.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
    if (touchPoints.size !== 2) return;
    const [first, second] = [...touchPoints.values()];
    const midpoint = touchMidpoint(first, second);
    pinchGesture = {
      startDistance: touchSpan(first, second),
      startMidX: midpoint.x,
      startMidY: midpoint.y,
      startZoom: renderer.camera.zoom,
      startOriginX: renderer.layout?.originX ?? renderer.width * 0.5,
      startOriginY: renderer.layout?.originY ?? renderer.height * 0.42,
    };
    window.clearTimeout(suppressTapTimer);
    suppressTap = true;
  });

  const endTouchPointer = (event) => {
    if (event.pointerType !== 'touch') return;
    touchPoints.delete(event.pointerId);
    if (touchPoints.size < 2) pinchGesture = null;
    if (touchPoints.size === 0) {
      window.clearTimeout(suppressTapTimer);
      suppressTapTimer = window.setTimeout(() => { suppressTap = false; }, 350);
    }
  };
  window.addEventListener('pointerup', endTouchPointer);
  window.addEventListener('pointercancel', endTouchPointer);

  elements.gameCanvas.addEventListener('pointermove', (event) => {
    if (!state || !renderer) return;
    if (event.pointerType === 'touch' && touchPoints.has(event.pointerId)) {
      touchPoints.set(event.pointerId, touchPoint(event));
      if (pinchGesture) {
        const [first, second] = [...touchPoints.values()];
        if (first && second) {
          const midpoint = touchMidpoint(first, second);
          renderer.applyPinch({
            scale: touchSpan(first, second) / pinchGesture.startDistance,
            startZoom: pinchGesture.startZoom,
            startOriginX: pinchGesture.startOriginX,
            startOriginY: pinchGesture.startOriginY,
            startMidX: pinchGesture.startMidX,
            startMidY: pinchGesture.startMidY,
            midX: midpoint.x,
            midY: midpoint.y,
          });
          return;
        }
      }
    }
    renderer.updateHover(state, event.clientX, event.clientY);
  });
  elements.gameCanvas.addEventListener('pointerleave', () => {
    if (!renderer) return;
    renderer.hoverTile = null;
    renderer.hoverNodeId = null;
  });
  elements.gameCanvas.addEventListener('click', handleCanvasClick);
  elements.gameCanvas.addEventListener('keydown', (event) => {
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (directions[event.key]) {
      event.preventDefault();
      moveTileSelection(...directions[event.key]);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activateSelectedTile();
    }
  });
  elements.gameCanvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    renderer?.setZoom(event.deltaY);
  }, { passive: false });
  elements.gameCanvas.addEventListener('dblclick', () => { if (!suppressTap) renderer?.resetCamera(); });

  elements.shellViewBtn.addEventListener('click', () => setView('shell'));
  elements.worldViewBtn.addEventListener('click', () => setView('world'));

  elements.pauseBtn.addEventListener('click', () => {
    if (!state || state.event) return;
    state.paused = !state.paused;
    audio.play('click');
    renderTopUI();
  });

  elements.speedBtn.addEventListener('click', () => {
    if (!state) return;
    const speeds = [1, 2, 4];
    const index = speeds.indexOf(state.gameSpeed);
    state.gameSpeed = speeds[(index + 1) % speeds.length];
    state.paused = false;
    audio.play('click');
    renderTopUI();
  });

  elements.saveBtn.addEventListener('click', () => {
    if (!state) return;
    if (saveGame(state, false)) {
      showToast('Partie sauvegardée.', 'good');
      audio.play('quest');
    }
  });

  elements.soundBtn.addEventListener('click', () => {
    const enabled = audio.toggle();
    elements.soundBtn.classList.toggle('active', enabled);
    showToast(enabled ? 'Son activé.' : 'Son coupé.', 'info');
  });

  elements.helpBtn.addEventListener('click', () => openHelp(0));
  elements.closeHelpBtn.addEventListener('click', closeHelp);
  elements.helpDoneBtn.addEventListener('click', closeHelp);
  elements.helpBackBtn.addEventListener('click', () => {
    helpStep -= 1;
    renderHelpStep();
    elements.helpScenes.querySelector('[data-help-step]:not([hidden]) h2')?.focus({ preventScroll: true });
  });
  elements.helpNextBtn.addEventListener('click', () => {
    helpStep += 1;
    renderHelpStep();
    elements.helpScenes.querySelector('[data-help-step]:not([hidden]) h2')?.focus({ preventScroll: true });
  });

  elements.campaignExportBtn.addEventListener('click', exportSave);
  elements.campaignContinueBtn.addEventListener('click', closeCampaignConclusion);

  elements.eventChoices.addEventListener('click', (event) => {
    const button = event.target.closest('[data-choice]');
    if (!button || !state?.event) return;
    const result = resolveEvent(state, Number(button.dataset.choice));
    handleResult(result, null, result.ok ? 'quest' : 'error');
  });

  elements.closeCombatBtn.addEventListener('click', () => {
    if (!state?.combat) return;
    ui.dismissedCombatId = state.combat.id;
    closeCombat(state);
    elements.combatModal.hidden = true;
    renderAll(true);
  });

  elements.mobileCommandBtn.addEventListener('click', () => {
    elements.commandPanel.classList.add('mobile-open');
    elements.inspectorPanel.classList.remove('mobile-open');
  });
  elements.mobileInspectorBtn.addEventListener('click', () => {
    elements.inspectorPanel.classList.add('mobile-open');
    elements.commandPanel.classList.remove('mobile-open');
  });
  elements.zoomOutBtn.addEventListener('click', () => renderer?.setZoom(1));
  elements.zoomInBtn.addEventListener('click', () => renderer?.setZoom(-1));
  elements.recenterBtn.addEventListener('click', () => renderer?.recenter());
  elements.closeCommandMobile.addEventListener('click', () => elements.commandPanel.classList.remove('mobile-open'));
  elements.closeInspectorMobile.addEventListener('click', () => elements.inspectorPanel.classList.remove('mobile-open'));

  window.addEventListener('keydown', (event) => {
    if (!state) return;
    const activeModal = [elements.helpModal, elements.eventModal, elements.combatModal, elements.campaignModal]
      .find((modal) => !modal.hidden);
    if (activeModal) {
      trapModalFocus(event, activeModal);
      if (event.key === 'Escape') {
        if (activeModal === elements.helpModal) closeHelp();
        else if (activeModal === elements.campaignModal) closeCampaignConclusion();
      }
      return;
    }
    if (event.key === 'Escape') {
      ui.selectedBuildId = null;
      elements.gameCanvas.classList.remove('build-cursor');
      elements.commandPanel.classList.remove('mobile-open');
      elements.inspectorPanel.classList.remove('mobile-open');
      renderAll(true);
    } else if (event.code === 'Space') {
      event.preventDefault();
      state.paused = !state.paused;
      renderTopUI();
    } else if (['1', '2', '3'].includes(event.key)) {
      state.gameSpeed = [1, 2, 4][Number(event.key) - 1];
      state.paused = false;
      renderTopUI();
    } else if (event.key.toLowerCase() === 'm') {
      setView(ui.view === 'world' ? 'shell' : 'world');
    } else if (event.key.toLowerCase() === 'b') {
      selectPanel('build');
      elements.commandPanel.classList.add('mobile-open');
    }
  });

  window.addEventListener('beforeunload', () => {
    if (state) saveGame(state, true);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state) saveGame(state, true);
  });
}

bindEvents();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
