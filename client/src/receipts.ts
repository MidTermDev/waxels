/**
 * Capture on-chain receipts for the demo run into web/public/receipts.json.
 *
 * Local test ledgers rotate (old shreds get purged), but the accounts —
 * including every image byte — persist. So right after the demo we archive
 * the transaction receipts: signatures, slots, wire sizes, and the decoded
 * instruction list of every v1 transaction. The explorer serves these
 * receipts alongside LIVE account data.
 *
 *   npx tsx src/receipts.ts
 */
import { writeFileSync } from 'node:fs';
import { fridgePda, pfpPda, waxelPda, WAXELS_PROGRAM } from './waxels.js';

const RPC_URL = process.env.WAXELS_RPC_URL ?? 'http://127.0.0.1:8899';
const CURATOR = process.env.WAXELS_CURATOR ?? 'EtNCYkkZSqHLnLtSQQhX2p3oXsxHAjdv5tjep5iF8ZLv';
const FEATURE_GATE = 'txv1aq4pp281K9um3tnPgkfX8UqtFT6wcVW3hNezGLL';
const OUT = new URL('../../web/public/receipts.json', import.meta.url).pathname;

const WAXELS = [
  { name: 'waxel the weasel', file: 'waxel-the-weasel' },
  { name: 'sunny day', file: 'sun' },
  { name: 'for mom', file: 'heart' },
  { name: 'to the moon', file: 'rocket' },
  { name: 'our house', file: 'house' },
  { name: 'for dad', file: 'flower' },
  { name: 'after the rain', file: 'rainbow' },
  { name: 'brain freeze', file: 'icecream' },
];

const IX_NAMES = ['plug_in_fridge', 'mint', 'scribble', 'wipe', 'seal', 'give', 'set_pfp'];

let rpcId = 0;
async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  const body = (await res.json()) as { result: T; error?: { message: string } };
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58decode(s: string): Uint8Array {
  let n = 0n;
  for (const c of s) {
    const i = B58.indexOf(c);
    if (i < 0) throw new Error('bad base58');
    n = n * 58n + BigInt(i);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  for (const c of s) {
    if (c !== '1') break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

interface JsonTx {
  slot: number;
  blockTime: number | null;
  version: number | string;
  meta: { fee: number; computeUnitsConsumed?: number };
  transaction: {
    message: {
      accountKeys: string[];
      instructions: { programIdIndex: number; accounts: number[]; data: string }[];
    };
  };
}

async function receiptFor(sig: string, kind: string, extra: Record<string, unknown> = {}) {
  const json = await rpc<JsonTx | null>('getTransaction', [
    sig,
    { encoding: 'json', maxSupportedTransactionVersion: 1 },
  ]);
  const b64 = await rpc<{ transaction: [string, string] } | null>('getTransaction', [
    sig,
    { encoding: 'base64', maxSupportedTransactionVersion: 1 },
  ]);
  if (!json || !b64) throw new Error(`transaction ${sig} not found — has the ledger rotated?`);
  const wire = Buffer.from(b64.transaction[0], 'base64');
  const keys = json.transaction.message.accountKeys;
  const instructions = json.transaction.message.instructions
    .filter((ix) => keys[ix.programIdIndex] === WAXELS_PROGRAM)
    .map((ix) => {
      const data = base58decode(ix.data);
      const name = IX_NAMES[data[0]] ?? `unknown(${data[0]})`;
      const out: Record<string, unknown> = { name };
      if (name === 'scribble') out.imageBytes = data.length - 5;
      return out;
    });
  return {
    kind,
    ...extra,
    signature: sig,
    slot: json.slot,
    blockTime: json.blockTime,
    version: json.version, // 1 — a real SIMD-0385 v1 transaction
    wireBytes: wire.length,
    // v1 transactions start with the 0x81 version prefix as the very first
    // byte on the wire (v0 carried its 0x80 prefix inside the message).
    versionPrefix: `0x${wire[0].toString(16)}`,
    feeLamports: json.meta.fee,
    computeUnits: json.meta.computeUnitsConsumed ?? null,
    instructions,
  };
}

async function main() {
  const fridge = await fridgePda();
  const version = await rpc<{ 'solana-core': string }>('getVersion', []);

  // Oldest signature on the fridge = plug_in_fridge.
  const fridgeSigs = await rpc<{ signature: string }[]>('getSignaturesForAddress', [fridge, { limit: 100 }]);
  const plugInSig = fridgeSigs[fridgeSigs.length - 1].signature;

  const steps: { signature: string; instructions: { name?: unknown }[] }[] = [];
  const seen = new Set<string>();
  const push = async (sig: string, kind: string, extra: Record<string, unknown> = {}) => {
    if (seen.has(sig)) return;
    seen.add(sig);
    const receipt = await receiptFor(sig, kind, extra);
    // Classify by what the transaction actually did, not how we found it —
    // a set_pfp tx also touches the waxel account, for example.
    const first = receipt.instructions[0]?.name;
    if (first === 'plug_in_fridge') receipt.kind = 'plug-in';
    else if (first === 'set_pfp') receipt.kind = 'set_pfp';
    else if (first === 'give') receipt.kind = 'give';
    steps.push(receipt as (typeof steps)[number]);
  };

  await push(plugInSig, 'plug-in');

  for (const w of WAXELS) {
    const addr = await waxelPda(CURATOR as Parameters<typeof waxelPda>[0], w.name);
    const sigs = await rpc<{ signature: string }[]>('getSignaturesForAddress', [addr, { limit: 10 }]);
    for (const s of sigs.reverse()) {
      await push(s.signature, 'mint', { waxel: { address: addr, name: w.name, file: w.file } });
    }
  }

  const pfp = await pfpPda(CURATOR as Parameters<typeof pfpPda>[0]);
  const pfpSigs = await rpc<{ signature: string }[]>('getSignaturesForAddress', [pfp, { limit: 10 }]);
  for (const s of pfpSigs.reverse()) {
    await push(s.signature, 'set_pfp', { pfp: { address: pfp, wallet: CURATOR } });
  }

  const receipts = {
    capturedAt: new Date().toISOString(),
    cluster: {
      rpc: 'local Agave test validator',
      version: version['solana-core'],
      featureGate: FEATURE_GATE,
      featureStatus: 'active since slot 0',
    },
    programId: WAXELS_PROGRAM,
    curator: CURATOR,
    fridge,
    steps,
  };
  writeFileSync(OUT, JSON.stringify(receipts, null, 2));
  console.log(`wrote ${OUT} — ${steps.length} receipts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
