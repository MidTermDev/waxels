use anchor_lang::prelude::*;

use crate::{
    constants::{FRIDGE_SEED, MAX_NAME_LEN, MIME_MAX, WAXEL_SEED},
    error::WaxelError,
    state::{Fridge, Waxel},
};

/// Mint a blank waxel: allocate the on-chain canvas. The image arrives via
/// `scribble` and is locked with `seal`. With v1 transactions (SIMD-0385),
/// mint + scribble + seal all fit in ONE 4096-byte transaction.
///
/// `name` is zero-padded to 32 bytes and doubles as the PDA seed, so each
/// artist can mint one waxel per name.
#[derive(Accounts)]
#[instruction(name: [u8; MAX_NAME_LEN])]
pub struct Mint {
    #[account(mut)]
    pub artist: Signer,
    #[account(mut, seeds = [FRIDGE_SEED], bump = fridge.bump)]
    pub fridge: Account<Fridge>,
    #[account(
        init,
        payer = artist,
        seeds = [WAXEL_SEED, artist.address().as_ref(), name.as_ref()],
        bump
    )]
    pub waxel: Account<Waxel>,
    pub system_program: Program<System>,
}

pub fn handler(
    ctx: &mut Context<Mint>,
    name: [u8; MAX_NAME_LEN],
    name_len: u8,
    mime: u8,
) -> Result<()> {
    let name_len = name_len as usize;
    if name_len == 0 {
        return Err(WaxelError::NameEmpty.into());
    }
    if name_len > MAX_NAME_LEN {
        return Err(WaxelError::NameTooLong.into());
    }
    // Padding must be zero so (artist, name) maps to exactly one PDA.
    if name[name_len..].iter().any(|&b| b != 0) {
        return Err(WaxelError::NameNotCanonical.into());
    }
    if core::str::from_utf8(&name[..name_len]).is_err() {
        return Err(WaxelError::NameNotUtf8.into());
    }
    if mime > MIME_MAX {
        return Err(WaxelError::UnknownMime.into());
    }

    let now = Clock::get()?.unix_timestamp;
    let fridge = &mut ctx.accounts.fridge;
    let waxel = &mut ctx.accounts.waxel;

    waxel.id = fridge.total_minted;
    waxel.created_at = now;
    waxel.sealed_at = 0;
    waxel.artist = *ctx.accounts.artist.address();
    waxel.owner = *ctx.accounts.artist.address();
    waxel.name.set_from_slice(&name[..name_len]);
    waxel.mime = mime;
    waxel.sealed = 0;
    waxel.bump = ctx.bumps.waxel;

    fridge.total_minted = fridge
        .total_minted
        .checked_add(1)
        .expect("u64 mint counter overflow");

    msg!("Fresh page on the fridge: waxel #{}", waxel.id);
    Ok(())
}
