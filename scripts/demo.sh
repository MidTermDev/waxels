#!/usr/bin/env bash
# The whole WAXELS story on a local validator:
#   deploy → plug in the fridge → mint waxel the weasel in ONE v1
#   transaction → mint the fridge gallery → hang a pfp → read every
#   byte back out of the chain and prove it's the same drawing.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_442="$HOME/.local/share/solana/install/releases/4.2.0/solana-release/bin"
AGAVE_BIN="${AGAVE_BIN:-$([ -d "$DEFAULT_442" ] && echo "$DEFAULT_442" || dirname "$(command -v solana)")}"
RPC="http://127.0.0.1:8899"
KEYPAIR="${WAXELS_KEYPAIR:-$HOME/.config/solana/id.json}"
CLI="npx tsx $ROOT/client/src/cli.ts"

step() { printf '\n\033[1m🖍️  %s\033[0m\n' "$*"; }

step "drawing the art"
node "$ROOT/art/build.mjs"

step "deploying the waxels program"
"$AGAVE_BIN/solana" airdrop 100 -u "$RPC" --keypair "$KEYPAIR" >/dev/null || true
"$AGAVE_BIN/solana" program deploy "$ROOT/target/deploy/waxels.so" \
  --program-id "$ROOT/target/deploy/waxels-keypair.json" \
  --keypair "$KEYPAIR" \
  -u "$RPC" --commitment confirmed

step "plugging in the fridge"
(cd "$ROOT/client" && $CLI plug-in)

step "minting waxel the weasel — the whole image in ONE v1 transaction"
(cd "$ROOT/client" && $CLI mint "$ROOT/assets/chain/waxel-the-weasel.png" --name "waxel the weasel")

step "minting the fridge gallery"
(cd "$ROOT/client" && $CLI mint "$ROOT/assets/chain/sun.png" --name "sunny day")
(cd "$ROOT/client" && $CLI mint "$ROOT/assets/chain/heart.png" --name "for mom")
(cd "$ROOT/client" && $CLI mint "$ROOT/assets/chain/rocket.png" --name "to the moon")

step "hanging waxel the weasel on the fridge door (pfp)"
(cd "$ROOT/client" && $CLI pfp --name "waxel the weasel")
(cd "$ROOT/client" && $CLI pfp-of)

step "reading the drawing back out of the chain"
(cd "$ROOT/client" && $CLI show --name "waxel the weasel" --out /tmp/waxel-from-chain.png)

step "proving the bytes survived"
a=$(sha256sum "$ROOT/assets/chain/waxel-the-weasel.png" | cut -d' ' -f1)
b=$(sha256sum /tmp/waxel-from-chain.png | cut -d' ' -f1)
echo "  minted file:  $a"
echo "  chain bytes:  $b"
if [ "$a" = "$b" ]; then
  echo "  ✓ identical. the drawing IS the account."
else
  echo "  ✗ mismatch!" && exit 1
fi

step "the fridge"
(cd "$ROOT/client" && $CLI fridge)
