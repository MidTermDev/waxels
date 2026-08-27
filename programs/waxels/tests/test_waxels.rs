//! Full lifecycle tests for the waxels program, run against LiteSVM.
//!
//! plug in the fridge → mint → scribble → seal → give → set_pfp,
//! plus every "the wax is sealed" failure path.

use {
    anchor_lang::{
        accounts::Account, bytemuck, programs::System,
        solana_program::instruction::Instruction, Address, Id, InstructionData, Space,
        ToAccountMetas,
    },
    anchor_v2_testing::{Keypair, LiteSVM, Message, Signer, VersionedMessage, VersionedTransaction},
    waxels::state::{Fridge, PfpRegistry, Waxel},
};

const MAX_IMAGE_BYTES: usize = 4096;

struct Ctx {
    svm: LiteSVM,
    program_id: Address,
    payer: Keypair,
}

fn setup() -> Ctx {
    let program_id = waxels::id();
    let mut svm = anchor_v2_testing::svm();
    let bytes = include_bytes!("../../../target/deploy/waxels.so");
    svm.add_program(program_id, bytes).unwrap();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();
    Ctx { svm, program_id, payer }
}

fn fridge_pda(program_id: &Address) -> Address {
    Address::find_program_address(&[b"fridge"], program_id).0
}

fn waxel_pda(program_id: &Address, artist: &Address, name: &[u8; 32]) -> Address {
    Address::find_program_address(&[b"waxel", artist.as_ref(), name.as_ref()], program_id).0
}

fn pfp_pda(program_id: &Address, wallet: &Address) -> Address {
    Address::find_program_address(&[b"pfp", wallet.as_ref()], program_id).0
}

fn padded_name(name: &str) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[..name.len()].copy_from_slice(name.as_bytes());
    out
}

fn send(ctx: &mut Ctx, instructions: &[Instruction], signers: &[&Keypair]) -> Result<(), String> {
    // Fresh blockhash per send so identical retries don't collide with
    // LiteSVM's duplicate-signature check.
    ctx.svm.expire_blockhash();
    let blockhash = ctx.svm.latest_blockhash();
    let msg = Message::new_with_blockhash(instructions, Some(&signers[0].pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), signers).unwrap();
    ctx.svm
        .send_transaction(tx)
        .map(|_| ())
        .map_err(|e| format!("{:?}", e.err))
}

fn plug_in_ix(ctx: &Ctx, curator: &Address) -> Instruction {
    Instruction::new_with_bytes(
        ctx.program_id,
        &waxels::instruction::PlugInFridge {}.data(),
        waxels::accounts::PlugInFridge {
            curator: *curator,
            fridge: fridge_pda(&ctx.program_id),
            system_program: System::id(),
        }
        .to_account_metas(None),
    )
}

fn mint_ix(ctx: &Ctx, artist: &Address, name: &str, mime: u8) -> Instruction {
    let name_arr = padded_name(name);
    Instruction::new_with_bytes(
        ctx.program_id,
        &waxels::instruction::Mint {
            name: name_arr,
            name_len: name.len() as u8,
            mime,
        }
        .data(),
        waxels::accounts::Mint {
            artist: *artist,
            fridge: fridge_pda(&ctx.program_id),
            waxel: waxel_pda(&ctx.program_id, artist, &name_arr),
            system_program: System::id(),
        }
        .to_account_metas(None),
    )
}

fn scribble_ix(ctx: &Ctx, artist: &Address, waxel: &Address, data: Vec<u8>) -> Instruction {
    Instruction::new_with_bytes(
        ctx.program_id,
        &waxels::instruction::Scribble { data }.data(),
        waxels::accounts::Scribble { artist: *artist, waxel: *waxel }.to_account_metas(None),
    )
}

fn wipe_ix(ctx: &Ctx, artist: &Address, waxel: &Address) -> Instruction {
    Instruction::new_with_bytes(
        ctx.program_id,
        &waxels::instruction::Wipe {}.data(),
        waxels::accounts::Wipe { artist: *artist, waxel: *waxel }.to_account_metas(None),
    )
}

fn seal_ix(ctx: &Ctx, artist: &Address, waxel: &Address) -> Instruction {
    Instruction::new_with_bytes(
        ctx.program_id,
        &waxels::instruction::Seal {}.data(),
        waxels::accounts::Seal {
            artist: *artist,
            fridge: fridge_pda(&ctx.program_id),
            waxel: *waxel,
        }
        .to_account_metas(None),
    )
}

fn give_ix(ctx: &Ctx, owner: &Address, waxel: &Address, new_owner: Address) -> Instruction {
    Instruction::new_with_bytes(
        ctx.program_id,
        &waxels::instruction::Give { new_owner }.data(),
        waxels::accounts::Give { owner: *owner, waxel: *waxel }.to_account_metas(None),
    )
}

fn set_pfp_ix(ctx: &Ctx, owner: &Address, waxel: &Address) -> Instruction {
    Instruction::new_with_bytes(
        ctx.program_id,
        &waxels::instruction::SetPfp {}.data(),
        waxels::accounts::SetPfp {
            owner: *owner,
            waxel: *waxel,
            pfp: pfp_pda(&ctx.program_id, owner),
            system_program: System::id(),
        }
        .to_account_metas(None),
    )
}

fn read_waxel(ctx: &Ctx, addr: &Address) -> Waxel {
    let account = ctx.svm.get_account(addr).expect("waxel account");
    assert_eq!(account.data.len(), <Account<Waxel> as Space>::INIT_SPACE);
    *bytemuck::from_bytes::<Waxel>(&account.data[8..])
}

fn read_fridge(ctx: &Ctx) -> Fridge {
    let account = ctx.svm.get_account(&fridge_pda(&ctx.program_id)).expect("fridge account");
    *bytemuck::from_bytes::<Fridge>(&account.data[8..])
}

#[test]
fn full_lifecycle() {
    let mut ctx = setup();
    let artist = ctx.payer.insecure_clone();
    let artist_pk = artist.pubkey();

    // Plug in the fridge.
    let ix = plug_in_ix(&ctx, &artist_pk);
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    let fridge = read_fridge(&ctx);
    assert_eq!(fridge.total_minted, 0);
    assert_eq!(fridge.total_sealed, 0);
    assert_eq!(fridge.curator, artist_pk);

    // Mint a blank waxel.
    let name = padded_name("waxel the weasel");
    let waxel_addr = waxel_pda(&ctx.program_id, &artist_pk, &name);
    let ix = mint_ix(&ctx, &artist_pk, "waxel the weasel", 0);
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    let waxel = read_waxel(&ctx, &waxel_addr);
    assert_eq!(waxel.id, 0);
    assert_eq!(waxel.artist, artist_pk);
    assert_eq!(waxel.owner, artist_pk);
    assert_eq!(waxel.name.as_slice(), b"waxel the weasel");
    assert_eq!(waxel.sealed, 0);
    assert_eq!(waxel.image.len(), 0);
    assert_eq!(read_fridge(&ctx).total_minted, 1);

    // Scribble two chunks; bytes land in order.
    let chunk_a: Vec<u8> = (0..900u32).map(|i| (i % 251) as u8).collect();
    let chunk_b: Vec<u8> = (0..500u32).map(|i| (i % 13) as u8).collect();
    let ix = scribble_ix(&ctx, &artist_pk, &waxel_addr, chunk_a.clone());
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    let ix = scribble_ix(&ctx, &artist_pk, &waxel_addr, chunk_b.clone());
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    let waxel = read_waxel(&ctx, &waxel_addr);
    assert_eq!(waxel.image.len(), 1400);
    assert_eq!(&waxel.image.as_slice()[..900], &chunk_a[..]);
    assert_eq!(&waxel.image.as_slice()[900..], &chunk_b[..]);

    // Seal the wax.
    let ix = seal_ix(&ctx, &artist_pk, &waxel_addr);
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    let waxel = read_waxel(&ctx, &waxel_addr);
    assert_eq!(waxel.sealed, 1);
    assert_eq!(read_fridge(&ctx).total_sealed, 1);

    // Sealed means sealed: no more scribbles, no wipe.
    let ix = scribble_ix(&ctx, &artist_pk, &waxel_addr, vec![1, 2, 3]);
    assert!(send(&mut ctx, &[ix], &[&artist]).is_err(), "scribble after seal must fail");
    let ix = wipe_ix(&ctx, &artist_pk, &waxel_addr);
    assert!(send(&mut ctx, &[ix], &[&artist]).is_err(), "wipe after seal must fail");

    // Give it to a friend. Artist stays, owner changes.
    let friend = Keypair::new();
    ctx.svm.airdrop(&friend.pubkey(), 1_000_000_000).unwrap();
    let ix = give_ix(&ctx, &artist_pk, &waxel_addr, friend.pubkey());
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    let waxel = read_waxel(&ctx, &waxel_addr);
    assert_eq!(waxel.owner, friend.pubkey());
    assert_eq!(waxel.artist, artist_pk);

    // Old owner can no longer give it away.
    let ix = give_ix(&ctx, &artist_pk, &waxel_addr, artist_pk);
    assert!(send(&mut ctx, &[ix], &[&artist]).is_err(), "give by non-owner must fail");

    // New owner hangs it as their pfp.
    let ix = set_pfp_ix(&ctx, &friend.pubkey(), &waxel_addr);
    send(&mut ctx, &[ix], &[&friend]).unwrap();
    let pfp_addr = pfp_pda(&ctx.program_id, &friend.pubkey());
    let account = ctx.svm.get_account(&pfp_addr).expect("pfp account");
    let pfp = bytemuck::from_bytes::<PfpRegistry>(&account.data[8..]);
    assert_eq!(pfp.wallet, friend.pubkey());
    assert_eq!(pfp.waxel, waxel_addr);

    // But the artist (no longer the owner) cannot.
    let ix = set_pfp_ix(&ctx, &artist_pk, &waxel_addr);
    assert!(send(&mut ctx, &[ix], &[&artist]).is_err(), "pfp of unowned waxel must fail");
}

#[test]
fn max_size_image_fills_exactly() {
    let mut ctx = setup();
    let artist = ctx.payer.insecure_clone();
    let artist_pk = artist.pubkey();
    let ix = plug_in_ix(&ctx, &artist_pk);
    send(&mut ctx, &[ix], &[&artist]).unwrap();

    let name = padded_name("chonk");
    let waxel_addr = waxel_pda(&ctx.program_id, &artist_pk, &name);
    let ix = mint_ix(&ctx, &artist_pk, "chonk", 0);
    send(&mut ctx, &[ix], &[&artist]).unwrap();

    // Fill the whole 4096-byte canvas in 900-byte strokes.
    let image: Vec<u8> = (0..MAX_IMAGE_BYTES as u32).map(|i| (i % 241) as u8).collect();
    for chunk in image.chunks(900) {
        let ix = scribble_ix(&ctx, &artist_pk, &waxel_addr, chunk.to_vec());
        send(&mut ctx, &[ix], &[&artist]).unwrap();
    }
    let waxel = read_waxel(&ctx, &waxel_addr);
    assert_eq!(waxel.image.len(), MAX_IMAGE_BYTES);
    assert_eq!(waxel.image.as_slice(), &image[..]);

    // One byte more than 4096 is one byte too many.
    let ix = scribble_ix(&ctx, &artist_pk, &waxel_addr, vec![0xFF]);
    assert!(send(&mut ctx, &[ix], &[&artist]).is_err(), "4097th byte must overflow");

    let ix = seal_ix(&ctx, &artist_pk, &waxel_addr);
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    assert_eq!(read_waxel(&ctx, &waxel_addr).image.len(), MAX_IMAGE_BYTES);
}

#[test]
fn wipe_restarts_and_empty_seal_fails() {
    let mut ctx = setup();
    let artist = ctx.payer.insecure_clone();
    let artist_pk = artist.pubkey();
    let ix = plug_in_ix(&ctx, &artist_pk);
    send(&mut ctx, &[ix], &[&artist]).unwrap();

    let name = padded_name("oops");
    let waxel_addr = waxel_pda(&ctx.program_id, &artist_pk, &name);
    let ix = mint_ix(&ctx, &artist_pk, "oops", 0);
    send(&mut ctx, &[ix], &[&artist]).unwrap();

    // Sealing a blank page fails.
    let ix = seal_ix(&ctx, &artist_pk, &waxel_addr);
    assert!(send(&mut ctx, &[ix], &[&artist]).is_err(), "sealing empty image must fail");

    // Scribble, regret it, wipe, redraw.
    let ix = scribble_ix(&ctx, &artist_pk, &waxel_addr, vec![9; 100]);
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    let ix = wipe_ix(&ctx, &artist_pk, &waxel_addr);
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    assert_eq!(read_waxel(&ctx, &waxel_addr).image.len(), 0);

    let ix = scribble_ix(&ctx, &artist_pk, &waxel_addr, vec![7; 42]);
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    let ix = seal_ix(&ctx, &artist_pk, &waxel_addr);
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    let waxel = read_waxel(&ctx, &waxel_addr);
    assert_eq!(waxel.image.as_slice(), &[7u8; 42][..]);

    // An unsealed waxel can't be given away or hung up (mint a second one).
    let name2 = padded_name("wip");
    let waxel2 = waxel_pda(&ctx.program_id, &artist_pk, &name2);
    let ix = mint_ix(&ctx, &artist_pk, "wip", 0);
    send(&mut ctx, &[ix], &[&artist]).unwrap();
    let friend = Keypair::new();
    ctx.svm.airdrop(&friend.pubkey(), 1_000_000_000).unwrap();
    let ix = give_ix(&ctx, &artist_pk, &waxel2, friend.pubkey());
    assert!(send(&mut ctx, &[ix], &[&artist]).is_err(), "give unsealed must fail");
    let ix = set_pfp_ix(&ctx, &artist_pk, &waxel2);
    assert!(send(&mut ctx, &[ix], &[&artist]).is_err(), "pfp unsealed must fail");
}

#[test]
fn single_transaction_mint_scribble_seal() {
    // The v1-transaction flow: mint + scribble + seal batched in one tx.
    // Under SIMD-0385 this same batch fits a real 4096-byte wire
    // transaction for images up to ~3.6 KB.
    let mut ctx = setup();
    let artist = ctx.payer.insecure_clone();
    let artist_pk = artist.pubkey();
    let ix = plug_in_ix(&ctx, &artist_pk);
    send(&mut ctx, &[ix], &[&artist]).unwrap();

    let name = padded_name("one shot");
    let waxel_addr = waxel_pda(&ctx.program_id, &artist_pk, &name);
    let image: Vec<u8> = (0..3600u32).map(|i| (i % 199) as u8).collect();

    let batch = [
        mint_ix(&ctx, &artist_pk, "one shot", 0),
        scribble_ix(&ctx, &artist_pk, &waxel_addr, image.clone()),
        seal_ix(&ctx, &artist_pk, &waxel_addr),
    ];
    send(&mut ctx, &batch, &[&artist]).unwrap();

    let waxel = read_waxel(&ctx, &waxel_addr);
    assert_eq!(waxel.sealed, 1);
    assert_eq!(waxel.image.as_slice(), &image[..]);
}
