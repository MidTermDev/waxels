/* eslint-disable @next/next/no-img-element */

const GITHUB = 'https://github.com/MidTermDev/waxels';
const X_URL = 'https://x.com/WaxelsProtocol';
const PROGRAM_ID = '6WGNQ6jzy7TyEPHAQZzKTjoWeVqW9ciWKGtHpjpXRCFt';
const FEATURE_GATE = 'txv1aq4pp281K9um3tnPgkfX8UqtFT6wcVW3hNezGLL';
const TOKEN_MINT = '38ZUxkPYsbpUs8jesMNZfiFZrjTMfLtzaJe8qC5WAXEL';
const SHA = '38ebf2f985ae555e734fe245773fe84b9ffb75758a05cfc75afda864b60ccc94';

const GALLERY = [
  { file: 'waxel-the-weasel', name: 'waxel the weasel', bytes: 3082, tx: 3418 },
  { file: 'sun', name: 'sunny day', bytes: 671, tx: 1007 },
  { file: 'heart', name: 'for mom', bytes: 613, tx: 949 },
  { file: 'rocket', name: 'to the moon', bytes: 622, tx: 958 },
];

const STEP_COLORS = ['var(--red)', 'var(--orange)', 'var(--green)', 'var(--blue)', 'var(--violet)', 'var(--pink)'];

export default function Home() {
  return (
    <main>
      {/* ------------------------------------------------ hero */}
      <div className="hero">
        <img className="wordmark" src="/wordmark.png" alt="WAXELS" />
        <p style={{ fontSize: '1.15rem', maxWidth: 620, margin: '0 auto' }}>
          <b>wax + pixels.</b> crayon art melted permanently into Solana — the
          first NFT protocol where the <i>entire image</i> lives on chain,
          minted in a <b>single transaction</b>.
        </p>
        <div className="btn-row">
          <a className="btn" style={{ ['--btn' as string]: 'var(--ink)' }} href={GITHUB}>
            GitHub ↗
          </a>
          <a className="btn" style={{ ['--btn' as string]: 'var(--blue)' }} href={X_URL}>
            @WaxelsProtocol ↗
          </a>
          <a className="btn" style={{ ['--btn' as string]: 'var(--red)' }} href="/localnet">
            🟢 live localnet explorer
          </a>
          <a className="btn" style={{ ['--btn' as string]: 'var(--green)' }} href="#journey">
            see the proof ↓
          </a>
        </div>
        <img className="banner" src="/banner.png" alt="waxel the weasel, in crayon" />
        <p style={{ opacity: 0.8 }}>
          <i>
            this exact drawing is <b>3,082 bytes</b> and lives inside a Solana
            account. not a link. not a hash. <b>the drawing.</b>
          </i>
        </p>
      </div>

      {/* ------------------------------------------------ premise */}
      <section>
        <h2>
          <span className="crayon-underline" style={{ color: 'var(--red)' }}>
            your NFT is probably a URL
          </span>
        </h2>
        <p>
          The industry&apos;s little secret: most NFTs store a <i>pointer</i> on
          chain and keep the actual image on IPFS, Arweave, or somebody&apos;s
          web server — alive only as long as someone keeps paying for pins,
          gateways, and hosting. If that stops, your art becomes a broken
          image icon that you own very cryptographically.
        </p>
        <div className="card tilt-l">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>regular NFT</th>
                <th>waxel</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>what&apos;s on chain</td>
                <td>a URL</td>
                <td>
                  <b>the image itself</b>
                </td>
              </tr>
              <tr>
                <td>if IPFS unpins it</td>
                <td>🪦 broken image</td>
                <td>still there</td>
              </tr>
              <tr>
                <td>if the startup dies</td>
                <td>🪦 broken image</td>
                <td>still there</td>
              </tr>
              <tr>
                <td>in 100 years</td>
                <td>good luck</td>
                <td>
                  <b>still there</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: '1.2rem' }}>
          If Solana is running, your waxel renders.{' '}
          <b>That&apos;s the whole dependency list.</b>
        </p>
      </section>

      {/* ------------------------------------------------ simd */}
      <section>
        <h2>
          <span className="crayon-underline" style={{ color: 'var(--blue)' }}>
            what changed: SIMD-0385
          </span>
        </h2>
        <p>
          Since genesis, Solana transactions were capped at <b>1,232 bytes</b>{' '}
          — room for a pointer, never a picture.{' '}
          <a href="https://github.com/solana-foundation/transaction-v1-examples">
            v1 transactions
          </a>{' '}
          raise the limit to <b>4,096 bytes</b>. That one number changes what
          an NFT can even be: for the first time, an entire image fits inside
          a single transaction — so <code className="pill">mint</code> +{' '}
          <code className="pill">scribble</code> +{' '}
          <code className="pill">seal</code> ride together in one signature,
          one slot, and the pixels land inside the account itself.
        </p>
        <div className="stat-row">
          <div className="card stat tilt-l">
            <b>1,232 → 4,096</b>
            <span>bytes per transaction</span>
          </div>
          <div className="card stat tilt-r">
            <b>1</b>
            <span>transaction to mint a whole image</span>
          </div>
          <div className="card stat tilt-l">
            <b>0</b>
            <span>servers, gateways, pinning bills</span>
          </div>
          <div className="card stat tilt-r">
            <b>∀</b>
            <span>sealed waxels are immutable forever</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ journey */}
      <section id="journey">
        <h2>
          <span className="crayon-underline" style={{ color: 'var(--green)' }}>
            the journey: pixels → chain, on localnet, today
          </span>
        </h2>
        <p>
          Everything below is a real run from{' '}
          <a href={`${GITHUB}/blob/main/scripts/demo.sh`}>
            <code className="pill">scripts/demo.sh</code>
          </a>{' '}
          against a local Agave 4.2 validator with the SIMD-0385 feature gate
          active from slot 0.
        </p>
        <ol className="steps">
          <li style={{ ['--step-color' as string]: STEP_COLORS[0] }}>
            <b>Draw.</b> <code className="pill">art/build.mjs</code> renders
            waxel the weasel with a zero-dependency crayon engine —
            coloring-book outlines, waxy strokes, paper grain — and
            hand-encodes a 4-bit indexed PNG: <b>3,082 bytes</b>.
          </li>
          <li style={{ ['--step-color' as string]: STEP_COLORS[1] }}>
            <b>Boot a v1 world.</b>{' '}
            <code className="pill">solana-test-validator</code> (Agave 4.2)
            activates every feature at genesis, so{' '}
            <code className="pill">{FEATURE_GATE}</code> is live from slot 0.
          </li>
          <li style={{ ['--step-color' as string]: STEP_COLORS[2] }}>
            <b>Deploy.</b> The waxels program (Anchor v2, SBPF v3) lands at{' '}
            <code className="pill">{PROGRAM_ID}</code>.
          </li>
          <li style={{ ['--step-color' as string]: STEP_COLORS[3] }}>
            <b>Plug in the fridge.</b> One-time protocol init — a 250-byte v1
            transaction. No admin keys; the curator is decorative.
          </li>
          <li style={{ ['--step-color' as string]: STEP_COLORS[4] }}>
            <b>Mint in ONE transaction.</b>{' '}
            <code className="pill">mint + scribble(3,082 bytes) + seal</code>{' '}
            batched into a single v1 transaction — <b>3,418 bytes on the wire</b>,
            well under the 4,096 cap. The image is now account data, sealed,
            immutable forever.
          </li>
          <li style={{ ['--step-color' as string]: STEP_COLORS[5] }}>
            <b>Prove it.</b> The client reads the account back and hashes the
            bytes:
          </li>
        </ol>
        <pre>{`minted file:  ${SHA}
chain bytes:  ${SHA}
✓ identical. the drawing IS the account.`}</pre>
        <p>
          Then <code className="pill">set_pfp</code> hangs the weasel on the
          fridge door: a <code className="pill">[&quot;pfp&quot;, wallet]</code> PDA any
          wallet or explorer can resolve to raw pixels. No metadata server, no
          CDN, no link rot.
        </p>
      </section>

      {/* ------------------------------------------------ gallery */}
      <section>
        <h2>
          <span className="crayon-underline" style={{ color: 'var(--orange)' }}>
            the fridge gallery
          </span>
        </h2>
        <p>
          Four waxels minted in the demo — each one a complete image inside its
          own account, each minted in a single v1 transaction.
        </p>
        <div className="gallery">
          {GALLERY.map((g) => (
            <figure key={g.file}>
              <img src={`/chain/${g.file}.png`} alt={g.name} />
              <figcaption>
                <b>“{g.name}”</b>
                <br />
                {g.bytes.toLocaleString()} bytes on chain · {g.tx.toLocaleString()}-byte v1 tx
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ protocol */}
      <section>
        <h2>
          <span className="crayon-underline" style={{ color: 'var(--violet)' }}>
            the protocol, in crayon
          </span>
        </h2>
        <div className="card tilt-r">
          <table>
            <tbody>
              <tr>
                <td>
                  <code className="pill">mint</code>
                </td>
                <td>pin a fresh 4,096-byte canvas to the fridge</td>
              </tr>
              <tr>
                <td>
                  <code className="pill">scribble</code>
                </td>
                <td>crayon bytes onto it — the whole image at once on v1</td>
              </tr>
              <tr>
                <td>
                  <code className="pill">seal</code>
                </td>
                <td>
                  melt the wax. <b>immutable forever</b> — no instruction can
                  ever write to a sealed image
                </td>
              </tr>
              <tr>
                <td>
                  <code className="pill">give</code>
                </td>
                <td>hand your drawing to a friend</td>
              </tr>
              <tr>
                <td>
                  <code className="pill">set_pfp</code>
                </td>
                <td>hang it on the fridge door — on-chain pfp registry</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------ token */}
      <section>
        <h2>
          <span className="crayon-underline" style={{ color: 'var(--pink)' }}>
            $WAXEL
          </span>
        </h2>
        <div className="card tilt-l">
          <p style={{ marginTop: 0 }}>
            <code className="pill">{TOKEN_MINT}</code>
          </p>
          <p style={{ marginBottom: 0 }}>
            <b>$WAXEL</b> is the protocol token. The mainnet release ships{' '}
            <b>interswapability between NFT and token</b>, 404-style: melt a
            waxel into fungible $WAXEL, or crystallize $WAXEL back into a
            waxel. Two states of the same wax.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ mainnet */}
      <section>
        <h2>
          <span className="crayon-underline" style={{ color: 'var(--green)' }}>
            the road to mainnet
          </span>
        </h2>
        <p>
          Everything you just saw runs on localnet <i>today</i> because Agave
          4.2 already carries the v1 transaction feature behind gate{' '}
          <code className="pill">{FEATURE_GATE}</code>. Feature gates roll out
          the way all Solana upgrades do: testnet → devnet → mainnet-beta
          activation.
        </p>
        <p>
          The program has no localnet-only tricks — it never parses
          transactions, so it doesn&apos;t care which version carried its
          instructions. The client already speaks wire-format v1.{' '}
          <b>
            The moment the gate activates on mainnet-beta, waxels ships —
          </b>{' '}
          same program, same client, same weasel. Until then: legacy 1,232-byte
          transactions can still mint waxels in a few strokes; v1 just makes it
          one.
        </p>
      </section>

      {/* ------------------------------------------------ footer */}
      <footer>
        <img src="/chain/pfp.png" alt="waxel the weasel" />
        <p>
          made with 🖍️ by <a href="https://github.com/MidTermDev">midtermdev</a>{' '}
          · follow <a href={X_URL}>@WaxelsProtocol</a> ·{' '}
          <a href={GITHUB}>fork the fridge</a>
        </p>
        <p style={{ opacity: 0.6 }}>
          every image on this page was generated by{' '}
          <code className="pill">art/build.mjs</code> — deterministic crayon.
        </p>
      </footer>
    </main>
  );
}
