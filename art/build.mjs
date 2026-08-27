// Render every WAXELS asset into assets/. Deterministic — run it twice,
// get the same bytes. The *-chain.png outputs are the actual images the
// demo mints; each must fit the 4096-byte on-chain canvas.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeRGBA, encodeIndexed } from './lib/png.mjs';
import { renderCrayon, renderIndexed } from './lib/crayon.mjs';
import {
  weaselScene, pfpScene, wordmarkScene, sunScene, heartScene, rocketScene,
} from './lib/scenes.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(join(out, 'chain'), { recursive: true });

function big(name, scene, scale, opts = {}) {
  const { width, height, pixels } = renderCrayon(scene, scale, opts);
  const png = encodeRGBA(width, height, pixels);
  writeFileSync(join(out, `${name}.png`), png);
  console.log(`${name}.png`.padEnd(26), `${width}x${height}`.padEnd(10), `${png.length} bytes`);
}

function chain(name, scene, scale, opts = {}) {
  const { width, height, palette, indices } = renderIndexed(scene, scale, opts);
  const png = encodeIndexed(width, height, palette, indices);
  const fits = png.length <= 4096 ? 'fits ✓' : 'TOO BIG ✗';
  writeFileSync(join(out, 'chain', `${name}.png`), png);
  console.log(
    `chain/${name}.png`.padEnd(26), `${width}x${height}`.padEnd(10),
    `${png.length} bytes`.padEnd(12), `palette ${palette.length}`.padEnd(12), fits
  );
  if (png.length > 4096) process.exitCode = 1;
}

big('banner', weaselScene(), 11, { seed: 5417, lineWidth: 0.3, wobble: 0.2 });
big('wordmark', wordmarkScene(), 5, { seed: 90210, grain: 0.12, frame: false, lineWidth: 0.5 });
big('pfp', pfpScene(), 12, { seed: 777 });

chain('waxel-the-weasel', weaselScene(), 1.5, {
  seed: 5417, lineWidth: 0.55, shades: [1.0, 0.88], prickRate: 0.006,
});
chain('pfp', pfpScene(), 3, { seed: 777 });
chain('sun', sunScene(), 3, { seed: 11 });
chain('heart', heartScene(), 3, { seed: 22 });
chain('rocket', rocketScene(), 3, { seed: 33 });
