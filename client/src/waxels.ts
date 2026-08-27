/**
 * WAXELS program bindings. Wire format is verified against the program's
 * own encoding in programs/waxels/tests/wire_format.rs:
 *
 *   instruction data = [1-byte discriminator] ++ args in declaration order
 *   [u8; 32] raw · u8 raw · Vec<u8> = u32-LE length prefix ++ bytes
 */
import {
  AccountRole,
  address,
  type Address,
  getAddressDecoder,
  getAddressEncoder,
  getProgramDerivedAddress,
  type Instruction,
} from '@solana/kit';

export const WAXELS_PROGRAM: Address = address(
  '6WGNQ6jzy7TyEPHAQZzKTjoWeVqW9ciWKGtHpjpXRCFt',
);
export const SYSTEM_PROGRAM: Address = address('11111111111111111111111111111111');

export const MAX_IMAGE_BYTES = 4096;
export const MAX_NAME_LEN = 32;

/** v1 transactions are 4096 bytes on the wire, total. */
export const V1_TX_MAX_BYTES = 4096;

export const MIME = { png: 0, gif: 1, jpg: 2, webp: 3, svg: 4, bmp: 5 } as const;
export type MimeName = keyof typeof MIME;
export const MIME_NAMES = Object.keys(MIME) as MimeName[];

const enc = getAddressEncoder();

export async function fridgePda(): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: WAXELS_PROGRAM,
    seeds: [Buffer.from('fridge')],
  });
  return pda;
}

/** Names are zero-padded to 32 bytes; the padded bytes are the PDA seed. */
export function paddedName(name: string): Uint8Array {
  const bytes = new TextEncoder().encode(name);
  if (bytes.length === 0) throw new Error('every masterpiece needs a name');
  if (bytes.length > MAX_NAME_LEN) throw new Error(`name over ${MAX_NAME_LEN} bytes`);
  const out = new Uint8Array(MAX_NAME_LEN);
  out.set(bytes);
  return out;
}

export async function waxelPda(artist: Address, name: string): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: WAXELS_PROGRAM,
    seeds: [Buffer.from('waxel'), enc.encode(artist), paddedName(name)],
  });
  return pda;
}

export async function pfpPda(wallet: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: WAXELS_PROGRAM,
    seeds: [Buffer.from('pfp'), enc.encode(wallet)],
  });
  return pda;
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

const ro = (a: Address) => ({ address: a, role: AccountRole.READONLY });
const wr = (a: Address) => ({ address: a, role: AccountRole.WRITABLE });
const sg = (a: Address) => ({ address: a, role: AccountRole.READONLY_SIGNER });
const wsg = (a: Address) => ({ address: a, role: AccountRole.WRITABLE_SIGNER });

function ix(accounts: Instruction['accounts'], data: Uint8Array): Instruction {
  return { programAddress: WAXELS_PROGRAM, accounts, data };
}

export function plugInFridgeIx(curator: Address, fridge: Address): Instruction {
  return ix([wsg(curator), wr(fridge), ro(SYSTEM_PROGRAM)], Uint8Array.of(0));
}

export function mintIx(
  artist: Address,
  fridge: Address,
  waxel: Address,
  name: string,
  mime: number,
): Instruction {
  const nameBytes = new TextEncoder().encode(name);
  const data = new Uint8Array(1 + 32 + 1 + 1);
  data[0] = 1;
  data.set(paddedName(name), 1);
  data[33] = nameBytes.length;
  data[34] = mime;
  return ix([wsg(artist), wr(fridge), wr(waxel), ro(SYSTEM_PROGRAM)], data);
}

export function scribbleIx(artist: Address, waxel: Address, chunk: Uint8Array): Instruction {
  const data = new Uint8Array(1 + 4 + chunk.length);
  data[0] = 2;
  new DataView(data.buffer).setUint32(1, chunk.length, true);
  data.set(chunk, 5);
  return ix([sg(artist), wr(waxel)], data);
}

export function wipeIx(artist: Address, waxel: Address): Instruction {
  return ix([sg(artist), wr(waxel)], Uint8Array.of(3));
}

export function sealIx(artist: Address, fridge: Address, waxel: Address): Instruction {
  return ix([sg(artist), wr(fridge), wr(waxel)], Uint8Array.of(4));
}

export function giveIx(owner: Address, waxel: Address, newOwner: Address): Instruction {
  const data = new Uint8Array(33);
  data[0] = 5;
  data.set(enc.encode(newOwner), 1);
  return ix([sg(owner), wr(waxel)], data);
}

export function setPfpIx(owner: Address, waxel: Address, pfp: Address): Instruction {
  return ix([wsg(owner), ro(waxel), wr(pfp), ro(SYSTEM_PROGRAM)], Uint8Array.of(6));
}

// ---------------------------------------------------------------------------
// Account decoding — fixed repr(C) layouts behind an 8-byte discriminator.
// ---------------------------------------------------------------------------

export interface WaxelAccount {
  id: bigint;
  createdAt: bigint;
  sealedAt: bigint;
  artist: Address;
  owner: Address;
  name: string;
  mime: MimeName;
  sealed: boolean;
  bump: number;
  image: Uint8Array;
}

const dec = getAddressDecoder();

function readAddress(data: Uint8Array, offset: number): Address {
  return dec.decode(data.subarray(offset, offset + 32));
}

export function decodeWaxel(data: Uint8Array): WaxelAccount {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const body = 8; // skip account discriminator
  const nameLen = view.getUint16(body + 88, true);
  const imageLen = view.getUint16(body + 125, true);
  return {
    id: view.getBigUint64(body, true),
    createdAt: view.getBigInt64(body + 8, true),
    sealedAt: view.getBigInt64(body + 16, true),
    artist: readAddress(data, body + 24),
    owner: readAddress(data, body + 56),
    name: new TextDecoder().decode(data.subarray(body + 90, body + 90 + nameLen)),
    mime: MIME_NAMES[data[body + 122]] ?? 'png',
    sealed: data[body + 123] !== 0,
    bump: data[body + 124],
    image: data.subarray(body + 127, body + 127 + imageLen),
  };
}

export interface FridgeAccount {
  totalMinted: bigint;
  totalSealed: bigint;
  curator: Address;
}

export function decodeFridge(data: Uint8Array): FridgeAccount {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    totalMinted: view.getBigUint64(8, true),
    totalSealed: view.getBigUint64(16, true),
    curator: readAddress(data, 24),
  };
}

export interface PfpAccount {
  setAt: bigint;
  wallet: Address;
  waxel: Address;
}

export function decodePfp(data: Uint8Array): PfpAccount {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    setAt: view.getBigInt64(8, true),
    wallet: readAddress(data, 16),
    waxel: readAddress(data, 48),
  };
}
