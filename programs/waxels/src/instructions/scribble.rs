use anchor_lang::prelude::*;

use crate::{error::WaxelError, state::Waxel};

/// Append image bytes to an unsealed waxel. Only the artist can scribble.
///
/// On a legacy 1232-byte transaction an image takes a handful of strokes;
/// on a v1 (SIMD-0385) 4096-byte transaction the whole drawing usually
/// lands in one.
#[derive(Accounts)]
pub struct Scribble {
    pub artist: Signer,
    #[account(mut, has_one = artist)]
    pub waxel: Account<Waxel>,
}

pub fn handler(ctx: &mut Context<Scribble>, data: Vec<u8>) -> Result<()> {
    let waxel = &mut ctx.accounts.waxel;
    if waxel.is_sealed() {
        return Err(WaxelError::AlreadySealed.into());
    }
    if data.is_empty() {
        return Err(WaxelError::EmptyScribble.into());
    }
    waxel
        .image
        .try_extend_from_slice(&data)
        .map_err(|_| WaxelError::ImageOverflow)?;
    msg!(
        "Scribbled {} bytes ({} on the page)",
        data.len(),
        waxel.image.len()
    );
    Ok(())
}
