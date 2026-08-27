#!/usr/bin/env bash
# Reset the sandbox and re-run the whole story, then recapture receipts.
#
# Why: an idle test validator's rocksdb WAL grows ~5 GB/hour, and old
# shreds eventually purge — so instead of hoarding history, the sandbox
# resets on a timer (waxels-refresh.timer). PDAs are deterministic, so
# every waxel keeps the same address across resets; only signatures,
# slots, and timestamps rotate, and receipts.json rotates with them.
# Anything minted by visitors between resets is wiped — it's a sandbox.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RPC="http://127.0.0.1:8899"

echo "[refresh] $(date -u +%FT%TZ) resetting ledger"
sudo systemctl stop waxels-validator || true
rm -rf "$ROOT/.localnet/ledger"
sudo systemctl start waxels-validator

for _ in $(seq 1 60); do
  if curl -sf -m 2 "$RPC" -X POST -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' | grep -q '"ok"'; then
    break
  fi
  sleep 2
done

"$ROOT/scripts/demo.sh"
(cd "$ROOT/client" && npx tsx src/receipts.ts)

echo "[refresh] done; disk: $(df -h / | tail -1 | awk '{print $4 " free"}')"
