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
  } else if (mode === 'all') {
    await checkSyntax();
    runTests();
    await checkPrecache();
    await smokeServer();
  } else {
    throw new Error(`Mode inconnu: ${mode}. Utilisez syntax, smoke, precache ou all.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
