use anchor_lang::prelude::*;

use crate::{error::WaxelError, state::Waxel};

/// Give a sealed waxel to a friend. Ownership moves; the artist field
/// never does. Works in progress can't be given away — finish it first.
#[derive(Accounts)]
pub struct Give {
    pub owner: Signer,
    #[account(mut, has_one = owner)]
    pub waxel: Account<Waxel>,
}

pub fn handler(ctx: &mut Context<Give>, new_owner: Address) -> Result<()> {
    let waxel = &mut ctx.accounts.waxel;
    if !waxel.is_sealed() {
        return Err(WaxelError::NotSealed.into());
    }
    waxel.owner = new_owner;
    msg!("Waxel #{} given away. Made with love.", waxel.id);
    Ok(())
}
