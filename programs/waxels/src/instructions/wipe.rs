use anchor_lang::prelude::*;

use crate::{error::WaxelError, state::Waxel};

/// Start over: clear the image of an unsealed waxel. Once sealed, nothing
/// can be wiped — that is the whole point.
#[derive(Accounts)]
pub struct Wipe {
    pub artist: Signer,
    #[account(mut, has_one = artist)]
    pub waxel: Account<Waxel>,
}

pub fn handler(ctx: &mut Context<Wipe>) -> Result<()> {
    let waxel = &mut ctx.accounts.waxel;
    if waxel.is_sealed() {
        return Err(WaxelError::AlreadySealed.into());
    }
    waxel.image.clear();
    msg!("Clean page. Try again!");
    Ok(())
}
