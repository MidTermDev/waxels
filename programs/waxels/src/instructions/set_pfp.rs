use anchor_lang::prelude::*;

use crate::{
    constants::PFP_SEED,
    error::WaxelError,
    state::{PfpRegistry, Waxel},
};

/// Hang a waxel on your fridge door: set it as your wallet's profile
/// picture. Anyone can resolve ["pfp", wallet] and read the pixels straight
/// off chain — no metadata server, no image CDN, no link rot.
#[derive(Accounts)]
pub struct SetPfp {
    #[account(mut)]
    pub owner: Signer,
    #[account(has_one = owner)]
    pub waxel: Account<Waxel>,
    #[account(
        init_if_needed,
        payer = owner,
        seeds = [PFP_SEED, owner.address().as_ref()],
        bump
    )]
    pub pfp: Account<PfpRegistry>,
    pub system_program: Program<System>,
}

pub fn handler(ctx: &mut Context<SetPfp>) -> Result<()> {
    let waxel = &ctx.accounts.waxel;
    if !waxel.is_sealed() {
        return Err(WaxelError::NotSealed.into());
    }
    let waxel_address = *waxel.account().address();
    let pfp = &mut ctx.accounts.pfp;
    pfp.set_at = Clock::get()?.unix_timestamp;
    pfp.wallet = *ctx.accounts.owner.address();
    pfp.waxel = waxel_address;
    pfp.bump = ctx.bumps.pfp;
    msg!("New pfp hung on the fridge door");
    Ok(())
}
