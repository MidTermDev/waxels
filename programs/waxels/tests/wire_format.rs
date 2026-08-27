//! Wire-format snapshot: prints the exact bytes of every instruction so
//! client implementations (see client/src/waxels.ts) can be checked
//! against ground truth. Run with:
//!   cargo test --test wire_format -- --nocapture

use anchor_lang::{Address, InstructionData, ToAccountMetas};

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn addr(byte: u8) -> Address {
    Address::new_from_array([byte; 32])
}

#[test]
fn dump_wire_format() {
    let mut name = [0u8; 32];
    name[..6].copy_from_slice(b"weasel");

    println!("plug_in_fridge: {}", hex(&waxels::instruction::PlugInFridge {}.data()));
    println!(
        "mint(name=weasel,len=6,mime=0): {}",
        hex(&waxels::instruction::Mint { name, name_len: 6, mime: 0 }.data())
    );
    println!(
        "scribble([de,ad,be,ef]): {}",
        hex(&waxels::instruction::Scribble { data: vec![0xde, 0xad, 0xbe, 0xef] }.data())
    );
    println!("wipe: {}", hex(&waxels::instruction::Wipe {}.data()));
    println!("seal: {}", hex(&waxels::instruction::Seal {}.data()));
    println!(
        "give(new_owner=[0x07;32]): {}",
        hex(&waxels::instruction::Give { new_owner: addr(7) }.data())
    );
    println!("set_pfp: {}", hex(&waxels::instruction::SetPfp {}.data()));

    let metas = waxels::accounts::Mint {
        artist: addr(1),
        fridge: addr(2),
        waxel: addr(3),
        system_program: addr(4),
    }
    .to_account_metas(None);
    for m in &metas {
        println!("mint meta: {} signer={} writable={}", m.pubkey, m.is_signer, m.is_writable);
    }
}
