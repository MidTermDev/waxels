use anchor_lang::prelude::*;

/// Hard cap on on-chain image size. One SIMD-0385 v1 transaction is 4096
/// bytes total, so a full-size image takes at most two crayon strokes
/// (chunks); anything under ~3.6 KB mints in a single transaction.
#[constant]
pub const MAX_IMAGE_BYTES: usize = 4096;

/// Max waxel name length in bytes (also part of the waxel PDA seed).
#[constant]
pub const MAX_NAME_LEN: usize = 32;

pub const FRIDGE_SEED: &[u8] = b"fridge";
pub const WAXEL_SEED: &[u8] = b"waxel";
pub const PFP_SEED: &[u8] = b"pfp";

/// Image formats a waxel can declare. Stored as a single byte.
pub const MIME_PNG: u8 = 0;
pub const MIME_GIF: u8 = 1;
pub const MIME_JPG: u8 = 2;
pub const MIME_WEBP: u8 = 3;
pub const MIME_SVG: u8 = 4;
pub const MIME_BMP: u8 = 5;
pub const MIME_MAX: u8 = MIME_BMP;
