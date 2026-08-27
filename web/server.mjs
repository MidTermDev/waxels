// WAXELS localnet explorer server.
//
// Serves the static site (./out) plus a tiny curated API over the local
// validator. The validator RPC itself stays bound to 127.0.0.1 — only
// these read-only endpoints face the internet:
//
//   GET /api/state                → live cluster + fridge + waxel accounts
//   GET /api/waxel/:address/image → the image, byte-for-byte from the account
//
// Zero dependencies. PORT env overrides 4646.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RPC_URL = process.env.WAXELS_RPC_URL ?? 'http://127.0.0.1:8899';
const PORT = Number(process.env.PORT ?? 4646);
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'out');
const PROGRAM_ID = '6WGNQ6jzy7TyEPHAQZzKTjoWeVqW9ciWKGtHpjpXRCFt';
const FRIDGE = 'GtG657SfcA6JAzxZZPaGQE3f72vjPhR2Dw1KzUh8HCYq'; // PDA ["fridge"]
const CURATOR = 'EtNCYkkZSqHLnLtSQQhX2p3oXsxHAjdv5tjep5iF8ZLv';
const WAXEL_ACCOUNT_SIZE = 4232;
const MIMES = ['image/png', 'image/gif', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/bmp'];

let rpcId = 0;
async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58encode(bytes) {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = '';
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = '1' + out;
  }
  return out;
}

// Waxel account layout (see docs/PROTOCOL.md). Offsets include the 8-byte
// discriminator.
function decodeWaxel(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const nameLen = view.getUint16(96, true);
  const imageLen = view.getUint16(133, true);
  return {
    id: Number(view.getBigUint64(8, true)),
    createdAt: Number(view.getBigInt64(16, true)),
    sealedAt: Number(view.getBigInt64(24, true)),
    artist: base58encode(data.subarray(32, 64)),
    owner: base58encode(data.subarray(64, 96)),
    name: Buffer.from(data.subarray(98, 98 + nameLen)).toString('utf8'),
    mime: MIMES[data[130]] ?? 'image/png',
    sealed: data[131] === 1,
    imageBytes: imageLen,
  };
}

let stateCache = { at: 0, body: null };
async function apiState() {
  if (Date.now() - stateCache.at < 5000 && stateCache.body) return stateCache.body;
  const [version, slot, fridgeInfo, accounts] = await Promise.all([
    rpc('getVersion', []),
    rpc('getSlot', [{ commitment: 'confirmed' }]),
    rpc('getAccountInfo', [FRIDGE, { encoding: 'base64' }]),
    rpc('getProgramAccounts', [
      PROGRAM_ID,
      { encoding: 'base64', filters: [{ dataSize: WAXEL_ACCOUNT_SIZE }] },
    ]),
  ]);
  let fridge = null;
  if (fridgeInfo?.value) {
    const data = Buffer.from(fridgeInfo.value.data[0], 'base64');
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    fridge = {
      totalMinted: Number(view.getBigUint64(8, true)),
      totalSealed: Number(view.getBigUint64(16, true)),
      curator: base58encode(data.subarray(24, 56)),
    };
  }
  const all = (accounts ?? []).map((a) => ({
    address: a.pubkey,
    lamports: a.account.lamports,
    ...decodeWaxel(Buffer.from(a.account.data[0], 'base64')),
  }));
  // The gallery shows the curator's waxels; localnet is an open sandbox, so
  // anything minted by other keys is just counted.
  const waxels = all.filter((w) => w.artist === CURATOR).sort((a, b) => a.id - b.id);
  const body = JSON.stringify({
    live: true,
    fetchedAt: new Date().toISOString(),
    cluster: { version: version['solana-core'], slot },
    programId: PROGRAM_ID,
    fridge,
    waxels,
    otherWaxels: all.length - waxels.length,
  });
  stateCache = { at: Date.now(), body };
  return body;
}

async function apiWaxelImage(address) {
  const info = await rpc('getAccountInfo', [address, { encoding: 'base64' }]);
  if (!info?.value) return null;
  const data = Buffer.from(info.value.data[0], 'base64');
  if (data.length !== WAXEL_ACCOUNT_SIZE) return null;
  const w = decodeWaxel(data);
  return { bytes: data.subarray(135, 135 + w.imageBytes), mime: w.mime };
}

const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.woff2': 'font/woff2',
};

async function serveStatic(res, urlPath) {
  const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const candidates = [safe, `${safe}.html`, join(safe, 'index.html')].map((p) => join(ROOT, p));
  for (const file of candidates) {
    if (!file.startsWith(ROOT)) continue;
    try {
      const s = await stat(file);
      if (!s.isFile()) continue;
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': STATIC_TYPES[extname(file)] ?? 'application/octet-stream',
        'cache-control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=300',
      });
      res.end(body);
      return true;
    } catch {
      /* next candidate */
    }
  }
  return false;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    // Receipts rotate with every sandbox refresh — serve the source of
    // truth (public/) rather than the copy baked into out/ at build time.
    if (url.pathname === '/receipts.json') {
      const body = await readFile(
        join(fileURLToPath(new URL('.', import.meta.url)), 'public', 'receipts.json'),
      );
      res.writeHead(200, {
        'content-type': 'application/json',
        'cache-control': 'no-cache',
        'access-control-allow-origin': '*',
      });
      res.end(body);
      return;
    }
    // The API is public read-only data; let waxels.app (and anyone else)
    // fetch it cross-origin.
    if (url.pathname === '/api/state') {
      const body = await apiState();
      res.writeHead(200, {
        'content-type': 'application/json',
        'cache-control': 'no-cache',
        'access-control-allow-origin': '*',
      });
      res.end(body);
      return;
    }
    const img = url.pathname.match(/^\/api\/waxel\/([1-9A-HJ-NP-Za-km-z]{32,44})\/image$/);
    if (img) {
      const out = await apiWaxelImage(img[1]);
      if (!out) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('no waxel here');
        return;
      }
      res.writeHead(200, {
        'content-type': out.mime,
        'cache-control': 'public, max-age=30',
        'access-control-allow-origin': '*',
        'x-waxels': 'served byte-for-byte from Solana account data',
      });
      res.end(out.bytes);
      return;
    }
    if (await serveStatic(res, url.pathname === '/' ? '/index.html' : url.pathname)) return;
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404 — nothing on this part of the fridge');
  } catch (e) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ live: false, error: String(e.message ?? e) }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`waxels explorer on http://127.0.0.1:${PORT} (rpc: ${RPC_URL})`);
});
