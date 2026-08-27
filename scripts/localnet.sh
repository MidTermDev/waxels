#!/usr/bin/env bash
# Start/stop a local validator with v1 transactions live.
#
# solana-test-validator activates every feature at genesis, so on Agave
# 4.2.0+ the SIMD-0385 feature gate (txv1aq4pp281K9um3tnPgkfX8UqtFT6wcVW3hNezGLL)
# is active from slot 0. Point AGAVE_BIN at a 4.2+ install if your PATH
# has an older toolchain.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_442="$HOME/.local/share/solana/install/releases/4.2.0/solana-release/bin"
AGAVE_BIN="${AGAVE_BIN:-$([ -d "$DEFAULT_442" ] && echo "$DEFAULT_442" || dirname "$(command -v solana-test-validator)")}"
LEDGER="$ROOT/.localnet"
PIDFILE="$LEDGER/validator.pid"
RPC="http://127.0.0.1:8899"
TXV1_GATE="txv1aq4pp281K9um3tnPgkfX8UqtFT6wcVW3hNezGLL"

start() {
  mkdir -p "$LEDGER"
  echo "validator: $("$AGAVE_BIN/solana-test-validator" --version)"
  "$AGAVE_BIN/solana-test-validator" \
    --reset --quiet \
    --ledger "$LEDGER/ledger" \
    --mint "$("$AGAVE_BIN/solana-keygen" pubkey "$HOME/.config/solana/id.json")" \
    >"$LEDGER/validator.log" 2>&1 &
  echo $! >"$PIDFILE"
  for _ in $(seq 1 60); do
    if "$AGAVE_BIN/solana" cluster-version -u "$RPC" >/dev/null 2>&1; then
      echo "validator up at $RPC"
      "$AGAVE_BIN/solana" feature status "$TXV1_GATE" -u "$RPC" | head -2 || true
      return 0
    fi
    sleep 1
  done
  echo "validator did not come up; see $LEDGER/validator.log" >&2
  exit 1
}

stop() {
  if [ -f "$PIDFILE" ]; then
    kill "$(cat "$PIDFILE")" 2>/dev/null || true
    rm -f "$PIDFILE"
    echo "validator stopped"
  fi
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  *) echo "usage: $0 [start|stop]" >&2; exit 1 ;;
esac
