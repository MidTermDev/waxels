/**
 * WAXELS CLI — mint crayon drawings straight into Solana accounts.
 *
 *   tsx src/cli.ts plug-in
 *   tsx src/cli.ts mint <image.png> --name "waxel the weasel"
 *   tsx src/cli.ts show --name "waxel the weasel" [--artist <addr>] [--out out.png]
 *   tsx src/cli.ts pfp --name "waxel the weasel"
 *   tsx src/cli.ts pfp-of [<wallet>]
 *   tsx src/cli.ts give --name "waxel the weasel" --to <addr>
 *   tsx src/cli.ts fridge
 *
 * Every transaction sent here is a v1 transaction (SIMD-0385). When the
 * image fits, mint + scribble + seal ride in ONE 4096-byte transaction.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  address,
  type Address,
  appendTransactionMessageInstructions,
  airdropFactory,
  type Blockhash,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getBase64Encoder,
  getTransactionEncoder,
  getSignatureFromTransaction,
  type Instruction,
  type KeyPairSigner,
  lamports,
  pipe,
  createTransactionMessage,
  sendAndConfirmTransactionFactory,
  setTransactionMessageConfig,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from '@solana/kit';
import {
  decodeFridge, decodePfp, decodeWaxel, fridgePda, giveIx, MAX_IMAGE_BYTES,
  MIME, type MimeName, mintIx, pfpPda, plugInFridgeIx, scribbleIx, sealIx,
  setPfpIx, V1_TX_MAX_BYTES, waxelPda,
} from './waxels.js';

const RPC_URL = process.env.WAXELS_RPC_URL ?? 'http://127.0.0.1:8899';
const WS_URL = process.env.WAXELS_WS_URL ?? 'ws://127.0.0.1:8900';
const KEYPAIR_PATH =
  process.env.WAXELS_KEYPAIR ?? `${process.env.HOME}/.config/solana/id.json`;

const rpc = createSolanaRpc(RPC_URL);
const rpcSubscriptions = createSolanaRpcSubscriptions(WS_URL);
const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

type BlockhashLifetime = Readonly<{
  blockhash: Blockhash;
  lastValidBlockHeight: bigint;
}>;

async function loadSigner(): Promise<KeyPairSigner> {
  const raw = JSON.parse(readFileSync(KEYPAIR_PATH, 'utf8')) as number[];
  return createKeyPairSignerFromBytes(Uint8Array.from(raw));
}

async function latestBlockhash(): Promise<BlockhashLifetime> {
  const { value } = await rpc.getLatestBlockhash().send();
  return value;
}

/** Build + sign a v1 transaction; returns it with its exact wire size. */
async function buildV1(
  payer: KeyPairSigner,
  instructions: Instruction[],
  lifetime: BlockhashLifetime,
) {
  const message = pipe(
    createTransactionMessage({ version: 1 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
    // v1 moves the compute budget into the message config — and unset
    // fields resolve to zero, so declare the budget explicitly.
    (m) =>
      setTransactionMessageConfig(
        {
          computeUnitLimit: 400_000,
          loadedAccountsDataSizeLimit: 1_024 * 1_024,
        },
        m,
      ),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
  const tx = await signTransactionMessageWithSigners(message);
  const wireBytes = getTransactionEncoder().encode(tx).length;
  return { tx, wireBytes };
}

async function sendV1(payer: KeyPairSigner, instructions: Instruction[], label: string) {
  const lifetime = await latestBlockhash();
  const { tx, wireBytes } = await buildV1(payer, instructions, lifetime);
  if (wireBytes > V1_TX_MAX_BYTES) {
    throw new Error(`${label}: ${wireBytes} bytes exceeds the v1 limit of ${V1_TX_MAX_BYTES}`);
  }
  await sendAndConfirm(tx as Parameters<typeof sendAndConfirm>[0], {
    commitment: 'confirmed',
  });
  const signature = getSignatureFromTransaction(tx);
  console.log(`  ✓ ${label} — v1 tx, ${wireBytes} bytes on the wire`);
  console.log(`    ${signature}`);
  return signature;
}

async function fetchAccount(addr: Address): Promise<Uint8Array | undefined> {
  const { value } = await rpc.getAccountInfo(addr, { encoding: 'base64' }).send();
  if (!value) return undefined;
  return getBase64Encoder().encode(value.data[0]) as Uint8Array;
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function sniffMime(bytes: Uint8Array, path: string): MimeName {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'gif';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
  if (path.endsWith('.webp')) return 'webp';
  if (path.endsWith('.svg')) return 'svg';
  if (path.endsWith('.bmp')) return 'bmp';
  return 'png';
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdPlugIn() {
  const signer = await loadSigner();
  const fridge = await fridgePda();
  if (await fetchAccount(fridge)) {
    console.log('fridge is already humming.');
    return;
  }
  await sendV1(signer, [plugInFridgeIx(signer.address, fridge)], 'plug in the fridge');
}

async function cmdMint() {
  const path = process.argv[3];
  const name = arg('--name');
  if (!path || !name) throw new Error('usage: mint <image> --name "..."');
  const image = new Uint8Array(readFileSync(path));
  if (image.length > MAX_IMAGE_BYTES) {
    throw new Error(`${image.length} bytes of crayon — the canvas caps at ${MAX_IMAGE_BYTES}`);
  }
  const mime = (arg('--mime') as MimeName) ?? sniffMime(image, path);
  const signer = await loadSigner();
  const fridge = await fridgePda();
  const waxel = await waxelPda(signer.address, name);
  console.log(`minting "${name}" (${image.length} bytes, ${mime}) -> ${waxel}`);

  // Plan A: the whole drawing in ONE v1 transaction.
  const oneShot = [
    mintIx(signer.address, fridge, waxel, name, MIME[mime]),
    scribbleIx(signer.address, waxel, image),
    sealIx(signer.address, fridge, waxel),
  ];
  const lifetime = await latestBlockhash();
  const { wireBytes } = await buildV1(signer, oneShot, lifetime);
  if (wireBytes <= V1_TX_MAX_BYTES) {
    await sendV1(signer, oneShot, `mint+scribble+seal "${name}" in ONE transaction`);
    return;
  }

  // Plan B: it's a big drawing — a few strokes, each still a fat v1 tx.
  console.log(`  image needs ${wireBytes} bytes with overhead; splitting into strokes`);
  const headroom = V1_TX_MAX_BYTES - (wireBytes - image.length);
  const first = image.subarray(0, headroom);
  await sendV1(
    signer,
    [mintIx(signer.address, fridge, waxel, name, MIME[mime]), scribbleIx(signer.address, waxel, first)],
    `mint + first ${first.length}-byte stroke`,
  );
  let offset = headroom;
  while (offset < image.length) {
    const chunk = image.subarray(offset, offset + 3800);
    await sendV1(signer, [scribbleIx(signer.address, waxel, chunk)], `stroke @ ${offset}`);
    offset += chunk.length;
  }
  await sendV1(signer, [sealIx(signer.address, fridge, waxel)], 'seal the wax');
}

async function cmdShow() {
  const name = arg('--name');
  const out = arg('--out');
  const signer = await loadSigner();
  const artist = arg('--artist') ? address(arg('--artist')!) : signer.address;
  const addr = arg('--address')
    ? address(arg('--address')!)
    : await waxelPda(artist, name ?? '');
  const data = await fetchAccount(addr);
  if (!data) throw new Error(`no waxel at ${addr}`);
  const waxel = decodeWaxel(data);
  console.log(`waxel #${waxel.id} "${waxel.name}"`);
  console.log(`  address:  ${addr}`);
  console.log(`  artist:   ${waxel.artist}`);
  console.log(`  owner:    ${waxel.owner}`);
  console.log(`  image:    ${waxel.image.length} bytes (${waxel.mime}), 100% on chain`);
  console.log(`  sealed:   ${waxel.sealed ? `yes — immutable forever` : 'not yet'}`);
  if (out) {
    writeFileSync(out, waxel.image);
    console.log(`  saved:    ${out}`);
  }
}

async function cmdPfp() {
  const name = arg('--name');
  if (!name) throw new Error('usage: pfp --name "..."');
  const signer = await loadSigner();
  const artist = arg('--artist') ? address(arg('--artist')!) : signer.address;
  const waxel = await waxelPda(artist, name);
  const pfp = await pfpPda(signer.address);
  await sendV1(signer, [setPfpIx(signer.address, waxel, pfp)], `hang "${name}" on the fridge door`);
}

async function cmdPfpOf() {
  const signer = await loadSigner();
  const wallet = process.argv[3] ? address(process.argv[3]) : signer.address;
  const data = await fetchAccount(await pfpPda(wallet));
  if (!data) {
    console.log(`${wallet} hasn't hung anything on the fridge door yet.`);
    return;
  }
  const pfp = decodePfp(data);
  console.log(`${wallet} -> ${pfp.waxel}`);
  const waxelData = await fetchAccount(pfp.waxel);
  if (waxelData) {
    const waxel = decodeWaxel(waxelData);
    console.log(`  "${waxel.name}" — ${waxel.image.length} bytes of on-chain crayon`);
  }
}

async function cmdGive() {
  const name = arg('--name');
  const to = arg('--to');
  if (!name || !to) throw new Error('usage: give --name "..." --to <address>');
  const signer = await loadSigner();
  const waxel = await waxelPda(signer.address, name);
  await sendV1(signer, [giveIx(signer.address, waxel, address(to))], `give "${name}" away`);
}

async function cmdFridge() {
  const data = await fetchAccount(await fridgePda());
  if (!data) {
    console.log('fridge not plugged in yet — run: plug-in');
    return;
  }
  const fridge = decodeFridge(data);
  console.log(`🖍️  the fridge`);
  console.log(`  waxels minted: ${fridge.totalMinted}`);
  console.log(`  waxels sealed: ${fridge.totalSealed}`);
  console.log(`  curator:       ${fridge.curator}`);
}

async function cmdAirdrop() {
  const signer = await loadSigner();
  await airdropFactory({ rpc, rpcSubscriptions })({
    commitment: 'confirmed',
    lamports: lamports(10_000_000_000n),
    recipientAddress: signer.address,
  });
  console.log(`airdropped 10 SOL to ${signer.address}`);
}

const commands: Record<string, () => Promise<void>> = {
  'plug-in': cmdPlugIn,
  mint: cmdMint,
  show: cmdShow,
  pfp: cmdPfp,
  'pfp-of': cmdPfpOf,
  give: cmdGive,
  fridge: cmdFridge,
  airdrop: cmdAirdrop,
};

const cmd = commands[process.argv[2]];
if (!cmd) {
  console.error(`unknown command "${process.argv[2] ?? ''}"`);
  console.error(`commands: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}
cmd().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  const context = (e as { context?: Record<string, unknown> }).context;
  if (context)
    console.error(JSON.stringify(context, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
  const cause = (e as { cause?: unknown }).cause;
  if (cause) console.error('cause:', cause);
  process.exit(1);
});
