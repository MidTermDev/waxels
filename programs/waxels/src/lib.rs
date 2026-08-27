pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;

declare_id!("6WGNQ6jzy7TyEPHAQZzKTjoWeVqW9ciWKGtHpjpXRCFt");

#[program]
pub mod waxels {
    use super::*;

    pub fn initialize(ctx: &mut Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }
}
