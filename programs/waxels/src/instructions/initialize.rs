use anchor_lang::prelude::*;

use crate::state::Counter;

#[derive(Accounts)]
pub struct Initialize {
    #[account(mut)]
    pub payer: Signer,
    #[account(init, payer = payer)]
    pub counter: Account<Counter>,
    pub system_program: Program<System>,
}

pub fn handler(ctx: &mut Context<Initialize>) -> Result<()> {
    ctx.accounts.counter.count = 0;
    ctx.accounts.counter.authority = *ctx.accounts.payer.address();
    msg!("Counter initialized");
    Ok(())
}
