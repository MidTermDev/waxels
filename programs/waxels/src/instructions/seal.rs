use anchor_lang::prelude::*;

use crate::{
    constants::FRIDGE_SEED,
    error::WaxelError,
    state::{Fridge, Waxel},
};

/// Seal the wax. After this, no instruction in the program can touch the
/// image bytes — the drawing is finished, immutable, and on chain forever.
#[derive(Accounts)]
pub struct Seal {
    pub artist: Signer,
    #[account(mut, seeds = [FRIDGE_SEED], bump = fridge.bump)]
    pub fridge: Account<Fridge>,
    #[account(mut, has_one = artist)]
    pub waxel: Account<Waxel>,
}

pub fn handler(ctx: &mut Context<Seal>) -> Result<()> {
    let waxel = &mut ctx.accounts.waxel;
    if waxel.is_sealed() {
        return Err(WaxelError::AlreadySealed.into());
    }
    if waxel.image.is_empty() {
        return Err(WaxelError::ImageEmpty.into());
    }
    waxel.sealed = 1;
    waxel.sealed_at = Clock::get()?.unix_timestamp;

    let fridge = &mut ctx.accounts.fridge;
    fridge.total_sealed = fridge
        .total_sealed
        .checked_add(1)
        .expect("u64 seal counter overflow");

    msg!(
        "Waxel #{} sealed: {} bytes of crayon, on chain forever",
        waxel.id,
        waxel.image.len()
    );
    Ok(())
}
