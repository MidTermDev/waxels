use anchor_lang::prelude::*;

use crate::{constants::FRIDGE_SEED, state::Fridge};

/// One-time protocol initialization. Plug in the fridge and the gallery
/// is open. The signer is remembered as curator but gets no powers —
/// waxels has no admin keys and no upgrade switches on state.
#[derive(Accounts)]
pub struct PlugInFridge {
    #[account(mut)]
    pub curator: Signer,
    #[account(init, payer = curator, seeds = [FRIDGE_SEED], bump)]
    pub fridge: Account<Fridge>,
    pub system_program: Program<System>,
}

pub fn handler(ctx: &mut Context<PlugInFridge>) -> Result<()> {
    let fridge = &mut ctx.accounts.fridge;
    fridge.total_minted = 0;
    fridge.total_sealed = 0;
    fridge.curator = *ctx.accounts.curator.address();
    fridge.bump = ctx.bumps.fridge;
    msg!("The fridge hums to life. Hang your art.");
    Ok(())
}
