//! WAXELS — wax + pixels. Crayon-colored art, melted permanently into
//! Solana.
//!
//! Every waxel is an image whose bytes live INSIDE its own account on
//! Solana. Not a URL to the image. Not a hash of the image. The image.
//! Built for SIMD-0385 v1 transactions (4096 bytes), where a whole drawing
//! mints in a single transaction.

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

use crate::constants::MAX_NAME_LEN;
pub use instructions::*;

declare_id!("6WGNQ6jzy7TyEPHAQZzKTjoWeVqW9ciWKGtHpjpXRCFt");

#[program]
pub mod waxels {
    use super::*;

    /// One-time protocol init. No admin keys — the curator is decorative.
    #[discrim = 0]
    pub fn plug_in_fridge(ctx: &mut Context<PlugInFridge>) -> Result<()> {
        plug_in_fridge::handler(ctx)
    }

    /// Allocate a blank 4096-byte canvas owned by the artist.
    #[discrim = 1]
    pub fn mint(
        ctx: &mut Context<Mint>,
        name: [u8; MAX_NAME_LEN],
        name_len: u8,
        mime: u8,
    ) -> Result<()> {
        mint::handler(ctx, name, name_len, mime)
    }

    /// Append image bytes (artist only, until sealed).
    #[discrim = 2]
    pub fn scribble(ctx: &mut Context<Scribble>, data: Vec<u8>) -> Result<()> {
        scribble::handler(ctx, data)
    }

    /// Clear an unsealed canvas and start over.
    #[discrim = 3]
    pub fn wipe(ctx: &mut Context<Wipe>) -> Result<()> {
        wipe::handler(ctx)
    }

    /// Lock the image forever. No code path can modify a sealed waxel.
    #[discrim = 4]
    pub fn seal(ctx: &mut Context<Seal>) -> Result<()> {
        seal::handler(ctx)
    }

    /// Transfer a sealed waxel to a new owner.
    #[discrim = 5]
    pub fn give(ctx: &mut Context<Give>, new_owner: Address) -> Result<()> {
        give::handler(ctx, new_owner)
    }

    /// Point your wallet's pfp registry at a waxel you own.
    #[discrim = 6]
    pub fn set_pfp(ctx: &mut Context<SetPfp>) -> Result<()> {
        set_pfp::handler(ctx)
    }
}
