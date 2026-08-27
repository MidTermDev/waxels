'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';

const FEATURE_GATE = 'txv1aq4pp281K9um3tnPgkfX8UqtFT6wcVW3hNezGLL';
const GITHUB = 'https://github.com/MidTermDev/waxels';

interface Receipt {
  kind: string;
  signature: string;
  slot: number;
  blockTime: number | null;
  version: number | string;
  wireBytes: number;
  versionPrefix: string;
  feeLamports: number;
  computeUnits: number | null;
  instructions: { name: string; imageBytes?: number }[];
  waxel?: { address: string; name: string; file: string };
}

interface Receipts {
  capturedAt: string;
  cluster: { version: string; featureGate: string; featureStatus: string };
  programId: string;
  curator: string;
  fridge: string;
  steps: Receipt[];
}

interface LiveWaxel {
  address: string;
  id: number;
  name: string;
  artist: string;
  owner: string;
  sealed: boolean;
  sealedAt: number;
  imageBytes: number;
  mime: string;
}

interface LiveState {
  live: boolean;
  cluster: { version: string; slot: number };
  fridge: { totalMinted: number; totalSealed: number; curator: string } | null;
  waxels: LiveWaxel[];
  otherWaxels: number;
}

const KIND_LABEL: Record<string, [string, string]> = {
  'plug-in': ['🔌', 'plug in the fridge'],
  mint: ['🖍️', 'mint a waxel'],
  set_pfp: ['🚪', 'hang it on the fridge door'],
  give: ['🎁', 'give it away'],
};

const IX_EXPLAIN: Record<string, string> = {
  plug_in_fridge: 'one-time protocol init — creates the global counter account. no admin keys.',
  mint: 'allocates a 4,096-byte canvas account, owned by the artist.',
  scribble: 'writes the actual image bytes INTO the account.',
  seal: 'melts the wax — from this instruction on, the image can never change.',
  set_pfp: 'points the wallet’s ["pfp", wallet] registry at a waxel it owns.',
  give: 'transfers ownership. the artist field never changes.',
};

function short(sig: string) {
  return `${sig.slice(0, 8)}…${sig.slice(-8)}`;
}

export default function Localnet() {
  const [receipts, setReceipts] = useState<Receipts | null>(null);
  const [state, setState] = useState<LiveState | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    fetch('/receipts.json').then((r) => r.json()).then(setReceipts).catch(() => {});
    const load = () =>
      fetch('/api/state')
        .then((r) => r.json())
        .then((s: LiveState) => (s.live ? setState(s) : setOffline(true)))
        .catch(() => setOffline(true));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <main>
      <div className="hero" style={{ paddingTop: '0.5rem' }}>
        <p style={{ marginBottom: 0 }}>
          <a href="/">← waxels home</a>
        </p>
        <h1>
          <span className="crayon-underline" style={{ color: 'var(--blue)' }}>
            the localnet explorer
          </span>
        </h1>
        <p style={{ maxWidth: 640, margin: '0 auto' }}>
          You&apos;re looking at a <b>real Solana validator</b> (Agave{' '}
          {state?.cluster.version ?? receipts?.cluster.version ?? '4.2.0'}) running on
          this server with{' '}
          <a href="https://github.com/solana-foundation/transaction-v1-examples">
            SIMD-0385 v1 transactions
          </a>{' '}
          enabled — the upgrade that raises transactions from 1,232 to{' '}
          <b>4,096 bytes</b>. Below: the actual transactions that put whole
          images on chain, and the images themselves, served{' '}
          <b>byte-for-byte out of account data</b>. No image files exist on
          this web server.
        </p>
        <p>
          {offline ? (
            <span className="card" style={{ padding: '0.4rem 1rem', display: 'inline-block' }}>
              ⚪ live RPC unreachable right now — showing archived receipts
            </span>
          ) : (
            <span className="card tilt-l" style={{ padding: '0.4rem 1rem', display: 'inline-block' }}>
              🟢 <b>live</b> · slot {state?.cluster.slot?.toLocaleString() ?? '…'} ·{' '}
              {state?.fridge
                ? `${state.fridge.totalMinted} minted / ${state.fridge.totalSealed} sealed`
                : 'fridge warming up'}
            </span>
          )}
        </p>
      </div>

      {/* ------------------------------------------------ for newcomers */}
      <section>
        <h2>
          <span className="crayon-underline" style={{ color: 'var(--green)' }}>
            new here? what actually happened
          </span>
        </h2>
        <ol className="steps">
          <li style={{ ['--step-color' as string]: 'var(--red)' }}>
            A normal NFT stores a <i>link</i> to an image on chain, and the
            image lives on somebody&apos;s server. Waxels stores{' '}
            <b>the image</b> — the PNG bytes sit inside a Solana account.
          </li>
          <li style={{ ['--step-color' as string]: 'var(--orange)' }}>
            That was impossible in one step before, because a whole
            transaction had to fit in 1,232 bytes. SIMD-0385&apos;s{' '}
            <b>v1 transactions</b> raise the ceiling to 4,096 bytes — you can
            spot one by its first wire byte, <code className="pill">0x81</code>.
          </li>
          <li style={{ ['--step-color' as string]: 'var(--blue)' }}>
            So one single transaction now carries three instructions:{' '}
            <code className="pill">mint</code> (make the canvas),{' '}
            <code className="pill">scribble</code> (write the image bytes),{' '}
            <code className="pill">seal</code> (lock it forever). One
            signature. Permanent art.
          </li>
          <li style={{ ['--step-color' as string]: 'var(--violet)' }}>
            Every image in the gallery below is fetched from the validator
            when the page loads — the URL{' '}
            <code className="pill">/api/waxel/&lt;address&gt;/image</code>{' '}
            reads the account and streams the bytes back out.
          </li>
        </ol>
      </section>

      {/* ------------------------------------------------ receipts */}
      <section>
        <h2>
          <span className="crayon-underline" style={{ color: 'var(--red)' }}>
            the transactions
          </span>
        </h2>
        <p>
          Captured from this validator right after the demo run
          {receipts ? ` (${new Date(receipts.capturedAt).toUTCString()})` : ''}. Program:{' '}
          <code className="pill">{receipts?.programId}</code> · feature gate{' '}
          <code className="pill">{FEATURE_GATE}</code> —{' '}
          {receipts?.cluster.featureStatus ?? 'active since slot 0'}.
        </p>
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          {(receipts?.steps ?? []).map((s, i) => {
            const [emoji, label] = KIND_LABEL[s.kind] ?? ['🖍️', s.kind];
            return (
              <div className={`card ${i % 2 ? 'tilt-r' : 'tilt-l'}`} key={s.signature}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <b style={{ fontSize: '1.05rem' }}>
                    {emoji} {label}
                    {s.waxel ? <> — “{s.waxel.name}”</> : null}
                  </b>
                  <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>
                    slot {s.slot.toLocaleString()}
                    {s.blockTime ? ` · ${new Date(s.blockTime * 1000).toUTCString()}` : ''}
                  </span>
                </div>
                <p style={{ margin: '0.4rem 0', fontSize: '0.9rem' }}>
                  <code className="pill">{short(s.signature)}</code> ·{' '}
                  <b>version {s.version}</b> (wire prefix{' '}
                  <code className="pill">{s.versionPrefix}</code>) ·{' '}
                  <b>{s.wireBytes.toLocaleString()} bytes</b> of 4,096 ·{' '}
                  {s.computeUnits?.toLocaleString()} CU · fee{' '}
                  {(s.feeLamports / 1e9).toFixed(6)} SOL
                </p>
                <table style={{ fontSize: '0.9rem' }}>
                  <tbody>
                    {s.instructions.map((ix, j) => (
                      <tr key={j}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <code className="pill">
                            {ix.name}
                            {ix.imageBytes ? `(${ix.imageBytes.toLocaleString()} bytes)` : ''}
                          </code>
                        </td>
                        <td>{IX_EXPLAIN[ix.name] ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {s.kind === 'mint' && s.instructions.length === 3 ? (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', opacity: 0.85 }}>
                    ☝️ all three in <b>one transaction</b> — this is the thing
                    that was impossible before SIMD-0385.
                  </p>
                ) : null}
              </div>
            );
          })}
          {!receipts && <p>loading receipts…</p>}
        </div>
      </section>

      {/* ------------------------------------------------ live gallery */}
      <section>
        <h2>
          <span className="crayon-underline" style={{ color: 'var(--orange)' }}>
            live from the chain
          </span>
        </h2>
        <p>
          These images are being served from validator account data{' '}
          <i>right now</i>. View any image URL&apos;s response headers and
          you&apos;ll find{' '}
          <code className="pill">x-waxels: served byte-for-byte from Solana account data</code>.
        </p>
        <div className="gallery">
          {(state?.waxels ?? []).map((w) => (
            <figure key={w.address}>
              <img src={`/api/waxel/${w.address}/image`} alt={w.name} />
              <figcaption>
                <b>“{w.name}”</b> · waxel #{w.id}
                <br />
                {w.imageBytes.toLocaleString()} bytes on chain ·{' '}
                {w.sealed ? 'sealed 🔒' : 'work in progress'}
                <br />
                <code className="pill" style={{ fontSize: '0.7rem' }}>{short(w.address)}</code>
              </figcaption>
            </figure>
          ))}
        </div>
        {state && state.otherWaxels > 0 ? (
          <p style={{ opacity: 0.7, fontSize: '0.85rem' }}>
            (+{state.otherWaxels} waxel{state.otherWaxels === 1 ? '' : 's'} minted by other
            keys on this open sandbox)
          </p>
        ) : null}
        {offline && !state ? <p>validator offline — the gallery needs the live RPC.</p> : null}
      </section>

      {/* ------------------------------------------------ diy */}
      <section>
        <h2>
          <span className="crayon-underline" style={{ color: 'var(--violet)' }}>
            don&apos;t trust us — read the account
          </span>
        </h2>
        <p>
          The byte layout is documented in{' '}
          <a href={`${GITHUB}/blob/main/docs/PROTOCOL.md`}>PROTOCOL.md</a>:
          image length is a u16 at offset 133, image bytes start at 135.
          Decode any waxel yourself from raw RPC:
        </p>
        <pre>{`curl -s <RPC> -X POST -H 'content-type: application/json' -d '{
  "jsonrpc":"2.0","id":1,"method":"getAccountInfo",
  "params":["<WAXEL_ADDRESS>", {"encoding":"base64"}]
}' | python3 -c "
import sys, json, base64
raw = base64.b64decode(json.load(sys.stdin)['result']['value']['data'][0])
n = int.from_bytes(raw[133:135], 'little')
open('waxel.png','wb').write(raw[135:135+n])
"  # waxel.png is your image. no gateway, no metadata server.`}</pre>
        <p>
          When SIMD-0385 activates on mainnet-beta, this same program, client,
          and page work unchanged — the only thing that moves is the RPC URL.{' '}
          Follow <a href="https://x.com/WaxelsProtocol">@WaxelsProtocol</a> for
          the activation countdown.
        </p>
      </section>

      <footer>
        <img src="/chain/pfp.png" alt="waxel the weasel" />
        <p>
          <a href="/">waxels home</a> · <a href={GITHUB}>github</a> ·{' '}
          <a href="https://x.com/WaxelsProtocol">@WaxelsProtocol</a>
        </p>
      </footer>
    </main>
  );
}
