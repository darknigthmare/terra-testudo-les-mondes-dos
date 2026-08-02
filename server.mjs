import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const modulePath = fileURLToPath(import.meta.url);
const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const realRoot = realpath(root);
const publicFiles = new Set([
  'index.html',
  'styles.css',
  'sw.js',
  'manifest.webmanifest',
]);
const publicDirectories = ['assets/', 'src/'];
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function isInside(base, target) {
  const pathFromBase = relative(base, target);
  return pathFromBase === ''
    || (!isAbsolute(pathFromBase) && pathFromBase !== '..' && !pathFromBase.startsWith(`..${sep}`));
}

function requestPath(requestUrl) {
  const encodedPath = (requestUrl || '/').split(/[?#]/, 1)[0];
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(encodedPath).replaceAll('\\', '/');
  } catch {
    return null;
  }

  if (!decodedPath.startsWith('/') || decodedPath.includes('\0')) return null;
  const segments = decodedPath.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..' || segment.startsWith('.'))) {
    return null;
  }

  const requested = segments.length === 0 ? 'index.html' : segments.join('/');
  const isPublic = publicFiles.has(requested)
    || publicDirectories.some((directory) => requested.startsWith(directory));
  return isPublic ? requested : null;
}

async function findPublicFile(requestUrl) {
  const requested = requestPath(requestUrl);
  if (!requested) return null;

  let candidate = resolve(root, requested);
  if (!isInside(root, candidate)) return null;

  let info = await stat(candidate).catch(() => null);
  if (info?.isDirectory()) {
    candidate = resolve(candidate, 'index.html');
    info = await stat(candidate).catch(() => null);
  }
  if (!info?.isFile()) return null;

  const [base, actual] = await Promise.all([
    realRoot,
    realpath(candidate).catch(() => null),
  ]);
  return actual && isInside(base, actual) ? actual : null;
}

async function handleRequest(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {
      Allow: 'GET, HEAD',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end('Methode non autorisee');
    return;
  }

  try {
    const file = await findPublicFile(req.url);
    if (!file) throw new Error('Not found');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end('Fichier introuvable');
  }
}

export function createStaticServer() {
  return createServer(handleRequest);
}

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const port = Number(process.env.PORT || 4173);
  const server = createStaticServer();
  server.listen(port, '0.0.0.0', () => {
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : port;
    console.log(`Terra Testudo : http://localhost:${activePort}`);
  });
}
