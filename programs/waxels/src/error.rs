use anchor_lang::prelude::*;

#[error_code]
pub enum WaxelError {
    #[msg("Name doesn't fit on the fridge (max 32 bytes)")]
    NameTooLong,
    #[msg("Every masterpiece needs a name")]
    NameEmpty,
    #[msg("Name bytes past name_len must be zero (canonical PDA seed)")]
    NameNotCanonical,
    #[msg("Name must be valid UTF-8")]
    NameNotUtf8,
    #[msg("Unknown image format")]
    UnknownMime,
    #[msg("The wax is sealed — this drawing is immutable forever")]
    AlreadySealed,
    #[msg("Drawing must be sealed before it can be given away or hung up")]
    NotSealed,
    #[msg("A scribble needs at least one byte of crayon")]
    EmptyScribble,
    #[msg("Too much crayon! Max image size is 4096 bytes")]
    ImageOverflow,
    #[msg("Can't seal an empty page — scribble something first")]
    ImageEmpty,
}
