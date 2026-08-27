# WAXELS protocol spec

For integrators: everything you need to read waxels without our client, and
to write one in any language. Verified against the program's own encoders in
[`programs/waxels/tests/wire_format.rs`](../programs/waxels/tests/wire_format.rs).

- Program: `6WGNQ6jzy7TyEPHAQZzKTjoWeVqW9ciWKGtHpjpXRCFt`
- Feature gate (SIMD-0385 v1 transactions): `txv1aq4pp281K9um3tnPgkfX8UqtFT6wcVW3hNezGLL`
- Requires Agave 4.2+ for single-transaction mints. The program itself is
  transaction-version-agnostic — legacy transactions work with chunked
  `scribble` calls.

## PDAs

| account | seeds |
|---|---|
| Fridge | `["fridge"]` |
| Waxel | `["waxel", artist: 32 bytes, name: 32 bytes zero-padded]` |
| PfpRegistry | `["pfp", wallet: 32 bytes]` |

Names are UTF-8, 1–32 bytes, zero-padded to 32 for the seed; padding bytes
must be zero (enforced at mint, so each `(artist, name)` maps to exactly one
canonical PDA).

## Instructions

Instruction data = 1-byte discriminator, then args in order, little-endian.
`Vec<u8>` = u32-LE length prefix + bytes.

| # | name | args | accounts (in order) |
|---|---|---|---|
| 0 | `plug_in_fridge` | — | curator (ws), fridge (w), system |
| 1 | `mint` | `name: [u8;32]`, `name_len: u8`, `mime: u8` | artist (ws), fridge (w), waxel (w), system |
| 2 | `scribble` | `data: Vec<u8>` | artist (s), waxel (w) |
| 3 | `wipe` | — | artist (s), waxel (w) |
| 4 | `seal` | — | artist (s), fridge (w), waxel (w) |
| 5 | `give` | `new_owner: [u8;32]` | owner (s), waxel (w) |
| 6 | `set_pfp` | — | owner (ws), waxel (r), pfp (w), system |

(`s` = signer, `w` = writable, `ws` = writable signer.)

Rules the program enforces:

- `scribble` appends; total image ≤ 4096 bytes; artist only; unsealed only.
- `wipe` clears the image; artist only; unsealed only.
- `seal` requires a non-empty image; after it, **nothing** can write to the
  image — there is no code path that mutates a sealed waxel.
- `give` and `set_pfp` require the waxel to be sealed, and the signer to be
  the current owner.
- `mime`: 0 png · 1 gif · 2 jpg · 3 webp · 4 svg · 5 bmp.

## Account layouts

All accounts are zero-copy `repr(C)`, prefixed by Anchor's 8-byte
discriminator. Offsets below are relative to the start of account data.

### Waxel (4,232 bytes)

| offset | size | field |
|---|---|---|
| 0 | 8 | discriminator |
| 8 | 8 | `id: u64` — mint number |
| 16 | 8 | `created_at: i64` |
| 24 | 8 | `sealed_at: i64` (0 while unsealed) |
| 32 | 32 | `artist` — never changes |
| 64 | 32 | `owner` — changes via `give` |
| 96 | 2 | `name` length (u16) |
| 98 | 32 | `name` bytes |
| 130 | 1 | `mime` |
| 131 | 1 | `sealed` (0/1) |
| 132 | 1 | `bump` |
| 133 | 2 | `image` length (u16) |
| 135 | 4096 | `image` bytes ← **the art** |
| 4231 | 1 | reserved |

To render any waxel from raw RPC in ~4 lines: read u16 at 133, slice
`[135, 135+len)`, and you're holding a complete image file.

### Fridge (64 bytes)

| offset | size | field |
|---|---|---|
| 8 | 8 | `total_minted: u64` |
| 16 | 8 | `total_sealed: u64` |
| 24 | 32 | `curator` (commemorative; no authority anywhere in the program) |
| 56 | 1 | `bump` |
| 57 | 7 | reserved |

### PfpRegistry (88 bytes)

| offset | size | field |
|---|---|---|
| 8 | 8 | `set_at: i64` |
| 16 | 32 | `wallet` |
| 48 | 32 | `waxel` |
| 80 | 1 | `bump` |
| 81 | 7 | reserved |

## v1 transaction notes (hard-won)

- **Unset config fields resolve to zero.** A v1 transaction without an
  explicit `loadedAccountsDataSizeLimit` fails with
  `Transaction exceeded max loaded accounts data size cap` before your
  program even runs. Always set `computeUnitLimit` and
  `loadedAccountsDataSizeLimit` in the message config.
- Single-transaction mint budget: 4,096 bytes total wire size. With one
  signer, our three-instruction batch (`mint` + `scribble` + `seal`), and the
  message overhead, images up to roughly **3.7 KB** fit in one transaction;
  anything up to 4,096 bytes fits in two.
- `solana-test-validator` activates every registered feature at genesis, so
  on Agave 4.2+ v1 transactions are live from slot 0 — and SBPF v0 deploys
  are *disabled* (the deprecation feature is active too). Build the program
  with `cargo-build-sbf --arch v3`.
