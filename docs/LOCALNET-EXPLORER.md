# running the public localnet explorer

How [localnet.waxels.app](https://localnet.waxels.app) is wired up, so it
can be reproduced on any box.

```
internet → nginx (:443, TLS via certbot)
         → web/server.mjs (127.0.0.1:4646, zero-dep node)
             ├── serves web/out (the static Next.js site)
             ├── GET /api/state                → curated live RPC reads
             └── GET /api/waxel/:addr/image    → image bytes straight from
                                                 the waxel account
         → solana-test-validator (127.0.0.1:8899, Agave 4.2, SIMD-0385
           active from slot 0 — bound to localhost only)
```

Design choices:

- **The validator RPC never faces the internet.** Only two read-only,
  curated endpoints do. (`scripts/localnet.sh` binds the validator to
  127.0.0.1.)
- **Transaction receipts are archived, account data is live.** Test
  ledgers rotate old shreds, so `client/src/receipts.ts` snapshots the
  demo's transactions (signature, slot, wire size, version prefix, decoded
  instructions) into `web/public/receipts.json` right after the run.
  Accounts — including every image byte — persist, so the gallery is
  always served live from the chain.
- **The explorer gallery only shows waxels minted by the demo wallet.**
  Localnet is an open sandbox; anything else minted on it is counted but
  not displayed.

Setup on a fresh box:

```bash
./scripts/localnet.sh start          # validator, v1 txs live
./scripts/demo.sh                    # deploy + mint everything
(cd client && npx tsx src/receipts.ts)   # archive the receipts
(cd web && npm install && npm run build) # static site → web/out
(cd web && node server.mjs)          # explorer on 127.0.0.1:4646
# then point nginx (or anything) at 127.0.0.1:4646 and run certbot
```

Two systemd units keep it alive unattended: `waxels-validator` runs the
test validator on the persistent ledger (no `--reset`, so accounts survive
restarts and reboots), and `waxels-localnet` runs the explorer:

```ini
[Unit]
Description=WAXELS localnet explorer
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/path/to/waxels/web
ExecStart=/usr/bin/env node server.mjs
Environment=PORT=4646
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
