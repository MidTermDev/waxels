
use {
    anchor_lang::{
        accounts::Account, bytemuck, programs::System,
        solana_program::instruction::Instruction, Id, InstructionData, Space, ToAccountMetas,
    },
    anchor_v2_testing::{Keypair, LiteSVM, Message, Signer, VersionedMessage, VersionedTransaction},
};

#[test]
fn test_initialize() {
    let program_id = waxels::id();
    let payer = Keypair::new();
    let counter = Keypair::new();

    // `svm()` is `LiteSVM::new()` by default. When this crate is built
    // with `--features profile` (which `anchor test --profile` and
    // `anchor debugger` set automatically), it also installs the
    // register-tracing callback that writes per-test SBF traces under
    // `target/anchor-v2-profile/`. The cfg switch lives inside
    // `anchor-v2-testing` so test code stays clean either way.
    let mut svm = anchor_v2_testing::svm();
    let bytes = include_bytes!("../../../target/deploy/waxels.so");
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    let instruction = Instruction::new_with_bytes(
        program_id,
        &waxels::instruction::Initialize {}.data(),
        waxels::accounts::Initialize {
            payer: payer.pubkey(),
            counter: counter.pubkey(),
            system_program: System::id(),
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[instruction], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(
        VersionedMessage::Legacy(msg),
        &[&payer, &counter],
    )
    .unwrap();

    let res = svm.send_transaction(tx);
    assert!(res.is_ok(), "send_transaction failed: {:?}", res);

    // Verify the counter account was initialized. Size comes from the same
    // `Space::INIT_SPACE` expression the `init` constraint allocates with,
    // so the assertion doesn't rot if `Counter` gains fields. The payload
    // tail is a `Pod` struct, so we cast directly and read fields by name
    // instead of hand-slicing bytes.
    let account = svm.get_account(&counter.pubkey()).expect("counter account");
    assert_eq!(account.data.len(), <Account<waxels::state::Counter> as Space>::INIT_SPACE);
    let counter_state: &waxels::state::Counter = bytemuck::from_bytes(&account.data[8..]);
    assert_eq!(counter_state.count, 0);
    assert_eq!(counter_state.authority, payer.pubkey());
}
