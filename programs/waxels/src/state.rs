use anchor_lang::prelude::*;

use crate::constants::{MAX_IMAGE_BYTES, MAX_NAME_LEN};

/// Global protocol state. Every kitchen has one fridge; every fridge is
/// covered in crayon drawings. Seeds: ["fridge"].
#[account]
pub struct Fridge {
    /// Total waxels ever minted (also the next waxel's id).
    pub total_minted: u64,
    /// Total waxels sealed (finished, immutable forever).
    pub total_sealed: u64,
    /// Whoever plugged in the fridge. Purely commemorative — the curator
    /// has no special powers. Waxels has no admin keys.
    pub curator: Address,
    pub bump: u8,
    pub _reserved: [u8; 7],
}

/// One fully on-chain image. The pixels live in `image`, inside this very
/// account, on Solana, forever. No IPFS hash, no URL, no promises — bytes.
/// Seeds: ["waxel", artist, name (zero-padded to 32)].
#[account]
pub struct Waxel {
    /// Mint number (0-based, from the fridge counter).
    pub id: u64,
    /// Unix time the waxel was minted.
    pub created_at: i64,
    /// Unix time the wax was sealed (0 while still a work in progress).
    pub sealed_at: i64,
    /// Original artist. Never changes, even after the waxel is given away.
    pub artist: Address,
    /// Current owner. Changes via `give`.
    pub owner: Address,
    /// UTF-8 name, up to 32 bytes.
    pub name: PodVec<u8, MAX_NAME_LEN>,
    /// Image format (see constants::MIME_*).
    pub mime: u8,
    /// 1 once sealed. A sealed waxel's image can never be modified again —
    /// there is no instruction that writes to a sealed waxel.
    pub sealed: u8,
    pub bump: u8,
    /// The actual image bytes. The whole point.
    pub image: PodVec<u8, MAX_IMAGE_BYTES>,
    pub _reserved: [u8; 1],
}

impl Waxel {
    pub fn is_sealed(&self) -> bool {
        self.sealed != 0
    }

    pub fn name_str(&self) -> &str {
        // Name is UTF-8 validated at mint.
        core::str::from_utf8(self.name.as_slice()).unwrap_or("<unnamed>")
    }
}

/// A wallet's profile picture: a pointer from a wallet to the waxel it has
/// proudly hung on the fridge door. Seeds: ["pfp", wallet].
#[account]
pub struct PfpRegistry {
    /// Unix time the pfp was last set.
    pub set_at: i64,
    /// The wallet this pfp belongs to.
    pub wallet: Address,
    /// The waxel being shown off.
    pub waxel: Address,
    pub bump: u8,
    pub _reserved: [u8; 7],
}
