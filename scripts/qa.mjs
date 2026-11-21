import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { request } from 'node:http';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createStaticServer } from '../server.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const javascriptExtensions = new Set(['.js', '.mjs']);

async function collectJavaScriptFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJavaScriptFiles(path));
    } else if (entry.isFile() && javascriptExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

function runNode(args, label) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${label} a echoue${result.signal ? ` (${result.signal})` : ''}`);
}

async function checkSyntax() {
  const targets = [
    join(projectRoot, 'server.mjs'),
    join(projectRoot, 'sw.js'),
    ...await collectJavaScriptFiles(join(projectRoot, 'src')),
    ...await collectJavaScriptFiles(join(projectRoot, 'tests')),
    ...await collectJavaScriptFiles(join(projectRoot, 'scripts')),
  ].sort();

  for (const target of targets) runNode(['--check', target], `Syntaxe invalide: ${target}`);
  console.log(`Syntaxe valide pour ${targets.length} fichiers JavaScript.`);
}

function runTests() {
  runNode(['tests/state.test.mjs'], 'Tests de logique');
  runNode(['tests/data.test.mjs'], 'Tests de contenu');
}

// Offline support only works if every module the game imports is in the Service Worker precache.
function parsePrecache(source) {
  const block = source.match(/const FILES = \[([\s\S]*?)\];/);
  assert.ok(block, 'Liste FILES introuvable dans sw.js');
  return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function normalizePrecacheEntry(entry) {
  const cleaned = entry.replace(/^\.\//, '');
  return cleaned === '' ? 'index.html' : cleaned.replaceAll('\\', '/');
}

function moduleSpecifiers(source) {
  const specifiers = new Set();
  for (const match of source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) specifiers.add(match[1]);
  for (const match of source.matchAll(/\bimport\s*\(?\s*['"]([^'"]+)['"]/g)) specifiers.add(match[1]);
  return specifiers;
}

// Legibility controls: a redraw must stay on the 24 grid, keep the interface
// sizes that make pictograms readable, and keep the hard-coded colours apart.
const SVG_GRID = 24;
const GRID_TOLERANCE = 0.6;

const ICON_SIZE_FLOORS = {
  '.resource-icon .icon': 15,
  '.cost-chip .icon': 11,
  '.reward-chip .icon': 12,
  '.building-icon .icon': 20,
  '.tile-symbol .icon': 20,
  '.selected-build-banner strong .icon': 14,
  '.tile-title h3 .icon': 16,
  '.empty-symbol .icon': 30,
  '.card-symbol .icon': 23,
  '.legacy-goal > span .icon': 17,
  '.quest-card h3 .icon': 16,
  '.icon-button .icon': 18,
  '.brand-mark .icon': 22,
  '.event-symbol .icon': 26,
  '.campaign-crown .icon': 34,
};

const ICON_STROKE_RULES = [
  '.cost-chip .icon g',
  '.reward-chip .icon g',
  '.building-icon .icon g',
  '.tile-symbol .icon g',
  '.card-symbol .icon g',
  '.legacy-goal > span .icon g',
];

function parseCssRules(css) {
  const rules = new Map();
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((selector) => selector.trim()).filter(Boolean);
    for (const selector of selectors) {
      if (selector.startsWith('@')) continue;
      rules.set(selector, match[2]);
    }
  }
  return rules;
}

function cssPixels(body, property) {
  const match = body?.match(new RegExp(`(?:^|;|\\s)${property}:\\s*([\\d.]+)px`));
  return match ? Number(match[1]) : null;
}

function sampleArc(x1, y1, rx, ry, rotation, largeArc, sweep, x2, y2) {
  if (!rx || !ry || rotation) return [[x2, y2]];
  const radiusX = Math.abs(rx);
  const radiusY = Math.abs(ry);
  const halfX = (x1 - x2) / 2;
  const halfY = (y1 - y2) / 2;
  const scale = (halfX * halfX) / (radiusX * radiusX) + (halfY * halfY) / (radiusY * radiusY);
  const factor = scale > 1 ? Math.sqrt(scale) : 1;
  const rx2 = (radiusX * factor) ** 2;
  const ry2 = (radiusY * factor) ** 2;
  const denominator = rx2 * halfY * halfY + ry2 * halfX * halfX;
  if (!denominator) return [[x2, y2]];
  const numerator = Math.max(0, rx2 * ry2 - rx2 * halfY * halfY - ry2 * halfX * halfX);
  const coefficient = (largeArc === sweep ? -1 : 1) * Math.sqrt(numerator / denominator);
  const centerX = coefficient * (radiusX * factor * halfY) / (radiusY * factor) + (x1 + x2) / 2;
  const centerY = -coefficient * (radiusY * factor * halfX) / (radiusX * factor) + (y1 + y2) / 2;
  const startAngle = Math.atan2((y1 - centerY) / (radiusY * factor), (x1 - centerX) / (radiusX * factor));
  const endAngle = Math.atan2((y2 - centerY) / (radiusY * factor), (x2 - centerX) / (radiusX * factor));
  let delta = endAngle - startAngle;
  if (sweep && delta < 0) delta += Math.PI * 2;
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  const points = [];
  const steps = 24;
  for (let step = 1; step < steps; step += 1) {
    const angle = startAngle + (delta * step) / steps;
    points.push([
      centerX + radiusX * factor * Math.cos(angle),
      centerY + radiusY * factor * Math.sin(angle),
    ]);
  }
  return points;
}

function traceIconPath(data) {
  const tokens = data.match(/[A-Za-z]|-?\d*\.?\d+/g) || [];
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const add = (x, y) => {
    box.minX = Math.min(box.minX, x);
    box.minY = Math.min(box.minY, y);
    box.maxX = Math.max(box.maxX, x);
    box.maxY = Math.max(box.maxY, y);
  };
  let index = 0;
  let command = null;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const next = () => Number(tokens[index++]);

  while (index < tokens.length) {
    if (/[A-Za-z]/.test(tokens[index])) command = tokens[index++];
    if (!command) break;
    switch (command) {
      case 'M':
      case 'm': {
        const dx = next();
        const dy = next();
        x = command === 'm' ? x + dx : dx;
        y = command === 'm' ? y + dy : dy;
        startX = x;
        startY = y;
        add(x, y);
        command = command === 'm' ? 'l' : 'L';
        break;
      }
      case 'L':
      case 'l': {
        const dx = next();
        const dy = next();
        x = command === 'l' ? x + dx : dx;
        y = command === 'l' ? y + dy : dy;
        add(x, y);
        break;
      }
      case 'H':
      case 'h': {
        const dx = next();
        x = command === 'h' ? x + dx : dx;
        add(x, y);
        break;
      }
      case 'V':
      case 'v': {
        const dy = next();
        y = command === 'v' ? y + dy : dy;
        add(x, y);
        break;
      }
      case 'C':
      case 'c': {
        const relative = command === 'c';
        const baseX = x;
        const baseY = y;
        const points = [];
        for (let step = 0; step < 3; step += 1) points.push([next(), next()]);
        for (let step = 0; step < 2; step += 1) {
          add(relative ? baseX + points[step][0] : points[step][0], relative ? baseY + points[step][1] : points[step][1]);
        }
        x = relative ? baseX + points[2][0] : points[2][0];
        y = relative ? baseY + points[2][1] : points[2][1];
        add(x, y);
        break;
      }
      case 'S':
      case 's':
      case 'Q':
      case 'q': {
        const relative = command === command.toLowerCase();
        const controlX = relative ? x + next() : next();
        const controlY = relative ? y + next() : next();
        add(controlX, controlY);
        const endX = relative ? x + next() : next();
        const endY = relative ? y + next() : next();
        x = endX;
        y = endY;
        add(x, y);
        break;
      }
      case 'T':
      case 't': {
        const relative = command === 't';
        const endX = relative ? x + next() : next();
        const endY = relative ? y + next() : next();
        x = endX;
        y = endY;
        add(x, y);
        break;
      }
      case 'A':
      case 'a': {
        const relative = command === 'a';
        const rx = next();
        const ry = next();
        const rotation = next();
        const largeArc = next();
        const sweep = next();
        const endX = relative ? x + next() : next();
        const endY = relative ? y + next() : next();
        add(x, y);
        add(endX, endY);
        // Sample the real arc so a rounded corner is not mistaken for an overflow.
        for (const point of sampleArc(x, y, rx, ry, rotation, largeArc, sweep, endX, endY)) add(point[0], point[1]);
        x = endX;
        y = endY;
        break;
      }
      case 'Z':
      case 'z':
        x = startX;
        y = startY;
        break;
      default:
        index += 1;
    }
  }
  return box;
}

function relativeLuminance([r, g, b]) {
  const channel = (value) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(first, second) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function parseColor(value) {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((digit) => digit + digit).join('') : hex[1];
    return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16));
  }
  const rgb = value.match(/rgba?\(([^)]+)\)/);
  if (!rgb) throw new Error(`Couleur illisible: ${value}`);
  return rgb[1].split(',').slice(0, 3).map((channel) => Number(channel.trim()));
}

async function checkReadability() {
  const problems = [];
  const iconsSource = await readFile(join(projectRoot, 'src/icons.js'), 'utf8');
  const css = await readFile(join(projectRoot, 'styles.css'), 'utf8');
  const render = await readFile(join(projectRoot, 'src/render.js'), 'utf8');

  if (!iconsSource.includes('viewBox="0 0 24 24"')) problems.push('svg() ne construit plus une grille 24');

  // Enemy pictograms are stored as raw path data so the canvas can stroke them with Path2D.
  const enemyBlock = iconsSource.match(/const ENEMY_ICONS = \{([\s\S]*?)\n\};/);
  if (!enemyBlock) problems.push('Bloc ENEMY_ICONS introuvable');
  const enemyPaths = [...(enemyBlock?.[1] || '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
  if (enemyBlock && enemyPaths.length !== 6) problems.push(`ENEMY_ICONS doit contenir 6 tracés, ${enemyPaths.length} trouvés`);

  const paths = [
    ...[...iconsSource.matchAll(/ d="([^"]+)"/g)].map((match) => match[1]),
    ...enemyPaths,
  ];
  const shapes = [...iconsSource.matchAll(/<(circle|ellipse) ([^>]+)>/g)].map((match) => ({ kind: match[1], attrs: match[2] }));
  if (!paths.length) problems.push('Aucun tracé de pictogramme trouvé');

  let worstOverflow = 0;
  for (const data of paths) {
    const box = traceIconPath(data);
    const overflow = Math.max(-box.minX, -box.minY, box.maxX - SVG_GRID, box.maxY - SVG_GRID);
    worstOverflow = Math.max(worstOverflow, overflow);
    if (overflow > GRID_TOLERANCE) problems.push(`Tracé hors grille 24 (débordement ${overflow.toFixed(2)}) : ${data.slice(0, 42)}…`);
  }
  for (const shape of shapes) {
    const read = (name) => Number((shape.attrs.match(new RegExp(`${name}="([\\d.]+)"`)) || [])[1]);
    const cx = read('cx');
    const cy = read('cy');
    const rx = read('rx') || read('r');
    const ry = read('ry') || read('r');
    const overflow = Math.max(-(cx - rx), -(cy - ry), cx + rx - SVG_GRID, cy + ry - SVG_GRID);
    worstOverflow = Math.max(worstOverflow, overflow);
    if (overflow > GRID_TOLERANCE) problems.push(`Forme hors grille 24 (débordement ${overflow.toFixed(2)}) : ${shape.attrs.slice(0, 42)}…`);
  }

  const rules = parseCssRules(css);
  for (const [selector, floor] of Object.entries(ICON_SIZE_FLOORS)) {
    const body = rules.get(selector);
    if (!body) {
      problems.push(`Règle de taille absente : ${selector}`);
      continue;
    }
    const width = cssPixels(body, 'width');
    const height = cssPixels(body, 'height');
    if (width === null || height === null) problems.push(`Taille non déclarée en px : ${selector}`);
    else if (width !== height) problems.push(`Icône non carrée : ${selector} (${width}×${height})`);
    else if (width < floor) problems.push(`Icône trop petite dans ${selector} : ${width}px < ${floor}px`);
  }
  for (const selector of ICON_STROKE_RULES) {
    const body = rules.get(selector);
    if (!body) {
      problems.push(`Règle de trait absente : ${selector}`);
      continue;
    }
    const stroke = Number((body.match(/stroke-width:\s*([\d.]+)/) || [])[1]);
    if (!Number.isFinite(stroke)) problems.push(`Trait non déclaré : ${selector}`);
    else if (stroke < 1.3) problems.push(`Trait trop fin dans ${selector} : ${stroke}`);
  }

  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootBlock) problems.push('Palette :root introuvable');
  const palette = Object.fromEntries([...(rootBlock?.[1] || '').matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)]
    .map((match) => [match[1], match[2].trim()]));
  const readPalette = (name) => {
    if (!palette[name]) throw new Error(`Variable de palette absente: --${name}`);
    return parseColor(palette[name].startsWith('#') ? palette[name] : palette[name]);
  };

  const combatSource = render.slice(render.indexOf('drawCombat(state, centerX, centerY, shellW, shellH) {'));
  const enemyFill = combatSource.match(/enemy\.type === 'air' \? '(#[0-9a-f]{6})' : '(#[0-9a-f]{6})'/i);
  const enemyStroke = combatSource.match(/ctx\.strokeStyle = '(#[0-9a-f]{6})';/i);
  if (!enemyFill || !enemyStroke) {
    problems.push('Couleurs du pictogramme ennemi introuvables dans render.js');
  }

  const pairs = [
    {
      label: 'trait ennemi / pastille maritime',
      foreground: enemyStroke ? parseColor(enemyStroke[1]) : null,
      background: enemyFill ? parseColor(enemyFill[2]) : null,
      minimum: 4.5,
      usage: 'pictogramme porteur d’information',
    },
    {
      label: 'trait ennemi / pastille aérienne',
      foreground: enemyStroke ? parseColor(enemyStroke[1]) : null,
      background: enemyFill ? parseColor(enemyFill[1]) : null,
      minimum: 4.5,
      usage: 'pictogramme porteur d’information',
    },
    {
      label: 'texte principal / fond profond',
      foreground: readPalette('text'),
      background: readPalette('bg-deep'),
      minimum: 4.5,
      usage: 'texte',
    },
    {
      label: 'texte discret / panneau',
      foreground: readPalette('faint'),
      background: readPalette('panel'),
      minimum: 4.5,
      usage: 'texte',
    },
    {
      label: 'texte doré / panneau',
      foreground: readPalette('gold-bright'),
      background: readPalette('panel'),
      minimum: 4.5,
      usage: 'texte',
    },
    {
      label: 'segment actif / or clair',
      foreground: parseColor('#171208'),
      background: readPalette('gold-bright'),
      minimum: 4.5,
      usage: 'texte',
    },
  ];
  for (const pair of pairs) {
    if (!pair.foreground || !pair.background) continue;
    const ratio = contrastRatio(pair.foreground, pair.background);
    if (ratio < pair.minimum) problems.push(`Contraste insuffisant pour ${pair.label} : ${ratio.toFixed(2)}:1 < ${pair.minimum}:1`);
  }

  assert.equal(problems.length, 0, `Lisibilité des pictogrammes:\n- ${problems.join('\n- ')}`);
  const ratios = pairs
    .filter((pair) => pair.foreground && pair.background)
    .map((pair) => `${pair.label} ${contrastRatio(pair.foreground, pair.background).toFixed(2)}:1`);
  console.log(`Lisibilité valide : ${paths.length} tracés et ${shapes.length} formes sur grille 24, ${Object.keys(ICON_SIZE_FLOORS).length} tailles CSS et ${ICON_STROKE_RULES.length} traits contrôlés.`);
  console.log(`Contrastes : ${ratios.join(' · ')}.`);
}

async function checkPrecache() {
  const root = projectRoot;
  const swSource = await readFile(join(root, 'sw.js'), 'utf8');
  const entries = parsePrecache(swSource);
  const precached = new Set(entries.map(normalizePrecacheEntry));
  const problems = [];

  for (const file of precached) {
    const info = await stat(join(root, file)).catch(() => null);
    if (!info?.isFile()) problems.push(`sw.js preache ${file}, introuvable`);
  }

  for (const file of precached) {
    if (!javascriptExtensions.has(extname(file))) continue;
    const source = await readFile(join(root, file), 'utf8');
    for (const specifier of moduleSpecifiers(source)) {
      if (!specifier.startsWith('.')) {
        problems.push(`${file} importe ${specifier}, module externe impossible a precacher`);
        continue;
      }
      const target = normalizePrecacheEntry(
        relative(root, resolve(root, dirname(file), specifier)).split(sep).join('/'),
      );
      if (!precached.has(target)) problems.push(`${file} importe ${specifier}, absent du preache`);
    }
  }

  const html = await readFile(join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)) {
    const entry = normalizePrecacheEntry(match[1]);
    if (!precached.has(entry)) problems.push(`index.html charge ${match[1]}, absent du preache`);
  }

  assert.equal(problems.length, 0, `Preache hors ligne incomplet:\n- ${problems.join('\n- ')}`);
  console.log(`Preache hors ligne couvert : ${precached.size} fichiers, imports des modules verifies.`);
}

function requestOnce(port, path, method = 'GET') {
  return new Promise((resolveRequest, rejectRequest) => {
    const outgoing = request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: { Connection: 'close' },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolveRequest({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }));
    });
    outgoing.once('error', rejectRequest);
    outgoing.end();
  });
}

async function listen(server) {
  await new Promise((resolveListen, rejectListen) => {
    const onError = (error) => rejectListen(error);
    server.once('error', onError);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', onError);
      resolveListen();
    });
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object', 'Adresse du serveur indisponible');
  return address.port;
}

async function close(server) {
  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}

async function smokeServer() {
  const server = createStaticServer();
  const port = await listen(server);

  try {
    const home = await requestOnce(port, '/');
    assert.equal(home.status, 200);
    assert.match(home.headers['content-type'] || '', /^text\/html/);
    assert.match(home.body.toString('utf8'), /Terra Testudo/);

    const module = await requestOnce(port, '/src/main.js');
    assert.equal(module.status, 200);
    assert.match(module.headers['content-type'] || '', /^text\/javascript/);

    const manifest = await requestOnce(port, '/manifest.webmanifest');
    assert.equal(manifest.status, 200);
    assert.match(manifest.headers['content-type'] || '', /^application\/manifest\+json/);

    const head = await requestOnce(port, '/', 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);

    for (const forbidden of [
      '/package.json',
      '/.env',
      '/.git/config',
      '/../package.json',
      '/src/../package.json',
      '/src/%2e%2e/package.json',
      '/src/%2e%2e%5cpackage.json',
      '/%E0%A4%A',
    ]) {
      const response = await requestOnce(port, forbidden);
      assert.equal(response.status, 404, `${forbidden} doit rester inaccessible`);
    }

    const post = await requestOnce(port, '/', 'POST');
    assert.equal(post.status, 405);
    assert.equal(post.headers.allow, 'GET, HEAD');
  } finally {
    await close(server);
  }

  console.log('Smoke HTTP valide: fichiers publics, HEAD, methodes et chemins interdits.');
}

const mode = process.argv[2] || 'all';

try {
  if (mode === 'syntax') {
    await checkSyntax();
  } else if (mode === 'smoke') {
    await smokeServer();
  } else if (mode === 'precache') {
    await checkPrecache();
  } else if (mode === 'readability') {
    await checkReadability();
  } else if (mode === 'all') {
    await checkSyntax();
    runTests();
    await checkPrecache();
    await checkReadability();
    await smokeServer();
  } else {
    throw new Error(`Mode inconnu: ${mode}. Utilisez syntax, smoke, precache, readability ou all.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
