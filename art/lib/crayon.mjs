// The crayon engine: paints scenes on a coarse grid, outlines every shape
// in chunky black like a coloring book, then renders at scale with waxy
// scribble texture — streaky strokes, paper showing through, wobbly edges.
// Fully deterministic: same seed, same drawing.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cheap value noise, bilinear-smoothed hash grid.
export function makeNoise(seed) {
  const rand = mulberry32(seed);
  const table = new Float64Array(512);
  for (let i = 0; i < 512; i++) table[i] = rand();
  const hash = (x, y) => table[(((x * 73) ^ (y * 149)) & 511 + 512) & 511];
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0), b = hash(x0 + 1, y0);
    const c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

export const PAPER = [0xfa, 0xf6, 0xee];

/**
 * Coarse scene grid. Each cell stores a region id; regions carry a color
 * and a stroke angle. Region id 0 is bare paper.
 */
export class Scene {
  /**
   * `zoom` scales all drawing coordinates: a scene planned on a 64×48
   * layout with zoom 1.5 gets 96×72 actual cells — finer curves, same
   * composition. set/get/lineAt always speak actual-cell coordinates.
   */
  constructor(width, height, zoom = 1) {
    this.zoom = zoom;
    this.width = Math.round(width * zoom);
    this.height = Math.round(height * zoom);
    this.cells = new Uint16Array(this.width * this.height); // region ids
    this.regions = [{ color: PAPER, angle: 0, outline: false }]; // id 0 = paper
  }

  region(color, { angle = Math.PI / 4, outline = true } = {}) {
    this.regions.push({ color, angle, outline });
    return this.regions.length - 1;
  }

  set(x, y, id) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.cells[y * this.width + x] = id;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.cells[y * this.width + x];
  }

  // Internal: draws in actual-cell space, no zoom applied.
  _ellipse(cx, cy, rx, ry, id) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, id);
      }
  }

  ellipse(cx, cy, rx, ry, id) {
    const z = this.zoom;
    this._ellipse(cx * z, cy * z, rx * z, ry * z, id);
  }

  rect(x0, y0, x1, y1, id) {
    const z = this.zoom;
    for (let y = Math.round(y0 * z); y <= Math.round((y1 + 1) * z) - 1; y++)
      for (let x = Math.round(x0 * z); x <= Math.round((x1 + 1) * z) - 1; x++)
        this.set(x, y, id);
  }

  // Thick line, for whiskers, sun rays and grass blades.
  stroke(x0, y0, x1, y1, r, id) {
    const z = this.zoom;
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * z * 2) + 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this._ellipse((x0 + (x1 - x0) * t) * z, (y0 + (y1 - y0) * t) * z, r * z, r * z, id);
    }
  }

  // Capsule chain along a quadratic bezier — tails, smiles, tree limbs.
  bezier(p0, p1, p2, r0, r1, id) {
    const z = this.zoom;
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0];
      const y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1];
      const r = r0 + (r1 - r0) * t;
      this._ellipse(x * z, y * z, r * z, r * z, id);
    }
  }

  /**
   * Coloring-book line test at a continuous point. A point is on a line
   * if two differently-colored outlined regions meet within `w` cells of
   * it (paper counts as outlined, so shapes get rims against the page).
   * `friendly` pairs never get a line between them.
   */
  lineAt(sx, sy, w, friendly) {
    const id = this.get(Math.round(sx), Math.round(sy));
    const aOut = id === 0 ? true : this.regions[id].outline;
    if (!aOut) return false;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const id2 = this.get(Math.round(sx + Math.cos(a) * w), Math.round(sy + Math.sin(a) * w));
      if (id2 === id) continue;
      const bOut = id2 === 0 ? true : this.regions[id2].outline;
      if (!bOut) continue;
      if (friendly.has(`${Math.min(id, id2)}:${Math.max(id, id2)}`)) continue;
      return true;
    }
    return false;
  }
}

function friendSet(friends) {
  return new Set(friends.map(([a, b]) => `${Math.min(a, b)}:${Math.max(a, b)}`));
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/**
 * Render a scene to RGBA at `scale`, with full crayon texture.
 * Options: seed, waxiness (stroke contrast), grain (paper show-through),
 * wobble (edge jitter in source-cells).
 */
export function renderCrayon(scene, scale, opts = {}) {
  const {
    seed = 5417,
    waxiness = 0.16,
    grain = 0.1,
    wobble = 0.13,
    lineWidth = 0.2, // half-width of coloring-book lines, in cells
    frame = true,
  } = opts;
  const rand = mulberry32(seed);
  const noise = makeNoise(seed ^ 0x9e3779b9);
  const noise2 = makeNoise(seed ^ 0x51ab3c);
  const W = scene.width * scale;
  const H = scene.height * scale;
  const friendly = friendSet(opts.friends || []);
  const px = new Uint8Array(W * H * 4);
  const fw = lineWidth * 2.2; // frame thickness, in cells

  for (let Y = 0; Y < H; Y++) {
    for (let X = 0; X < W; X++) {
      // Wobbly sampling: hand-drawn lines aren't straight.
      const jx = (noise(X * 0.09, Y * 0.09) - 0.5) * 2 * wobble;
      const jy = (noise2(X * 0.09, Y * 0.09) - 0.5) * 2 * wobble;
      const sx = Math.min(scene.width - 1, Math.max(0, X / scale + jx));
      const sy = Math.min(scene.height - 1, Math.max(0, Y / scale + jy));
      const cx = Math.round(sx), cy = Math.round(sy);
      const id = scene.get(cx, cy);
      const onFrame =
        frame &&
        (sx < fw || sy < fw || sx > scene.width - 1 - fw || sy > scene.height - 1 - fw);
      const isLine = onFrame || scene.lineAt(sx, sy, lineWidth, friendly);
      const reg = scene.regions[id];

      let r, g, b;
      if (isLine) {
        // Waxy black — never a flat #000.
        const v = 18 + noise(X * 0.3, Y * 0.3) * 26 + (rand() - 0.5) * 10;
        r = g = b = clamp255(v);
        if (rand() < 0.04) [r, g, b] = PAPER; // crayon skips
      } else if (id === 0) {
        // Paper with a little tooth.
        const v = (noise(X * 0.22, Y * 0.22) - 0.5) * 10 + (rand() - 0.5) * 6;
        r = clamp255(PAPER[0] + v);
        g = clamp255(PAPER[1] + v);
        b = clamp255(PAPER[2] + v * 0.8);
      } else {
        // Directional scribble strokes.
        const a = reg.angle;
        const u = X * Math.cos(a) + Y * Math.sin(a);
        const v2 = -X * Math.sin(a) + Y * Math.cos(a);
        // Stripes run ALONG the stroke direction, like dragging a crayon.
        const stroke =
          Math.sin(v2 * 0.7 + noise(u * 0.03, v2 * 0.06) * 8) * 0.6 +
          Math.sin(v2 * 0.16 + u * 0.012) * 0.4;
        const shade = 1 + stroke * waxiness + (rand() - 0.5) * 0.07;
        r = clamp255(reg.color[0] * shade);
        g = clamp255(reg.color[1] * shade);
        b = clamp255(reg.color[2] * shade);
        // Paper tooth showing through light pressure.
        const show = noise2(X * 0.17, Y * 0.17);
        if (show > 1 - grain * 0.8 || rand() < 0.012) {
          const mix = 0.55 + rand() * 0.35;
          r = clamp255(r + (PAPER[0] - r) * mix);
          g = clamp255(g + (PAPER[1] - g) * mix);
          b = clamp255(b + (PAPER[2] - b) * mix);
        }
      }
      const o = (Y * W + X) * 4;
      px[o] = r;
      px[o + 1] = g;
      px[o + 2] = b;
      px[o + 3] = 255;
    }
  }
  return { width: W, height: H, pixels: px };
}

/**
 * Render a scene to a small indexed-color image for on-chain minting:
 * 3 quantized shades per region + paper + black. Texture survives, bytes
 * stay tiny.
 */
export function renderIndexed(scene, scale, opts = {}) {
  const {
    seed = 5417, friends = [], lineWidth = 0.45, frame = true,
    shades = [0.88, 1.0, 1.1], // crayon pressure levels per color
    prickRate = 0.015, // paper pinpricks; fewer = smaller file
  } = opts;
  const rand = mulberry32(seed);
  const noise = makeNoise(seed ^ 0xabc123);
  const W = scene.width * scale;
  const H = scene.height * scale;
  const friendly = friendSet(friends);
  const fw = lineWidth * 1.6;

  const palette = [PAPER, [30, 30, 32]]; // 0 = paper, 1 = wax black
  const shadeIndex = new Map(); // `${regionId}:${shade}` -> palette index
  const key = (id, s) => `${id}:${s}`;
  for (let id = 1; id < scene.regions.length; id++) {
    const c = scene.regions[id].color;
    for (const [s, f] of shades.map((f, i) => [i, f])) {
      const shade = c.map((v) => clamp255(v * f));
      // Reuse identical entries so tiny palettes stay tiny.
      const existing = palette.findIndex(
        (p) => p[0] === shade[0] && p[1] === shade[1] && p[2] === shade[2]
      );
      if (existing >= 0) shadeIndex.set(key(id, s), existing);
      else {
        palette.push(shade);
        shadeIndex.set(key(id, s), palette.length - 1);
      }
    }
  }

  const indices = new Uint8Array(W * H);
  for (let Y = 0; Y < H; Y++)
    for (let X = 0; X < W; X++) {
      const sx = Math.min(scene.width - 1, X / scale);
      const sy = Math.min(scene.height - 1, Y / scale);
      const id = scene.get(Math.round(sx), Math.round(sy));
      const onFrame =
        frame &&
        (sx < fw || sy < fw || sx > scene.width - 1 - fw || sy > scene.height - 1 - fw);
      let idx;
      if (onFrame || scene.lineAt(sx, sy, lineWidth, friendly)) idx = 1;
      else if (id === 0) idx = 0;
      else {
        const a = scene.regions[id].angle;
        const u = X * Math.cos(a) + Y * Math.sin(a);
        const v = -X * Math.sin(a) + Y * Math.cos(a);
        const stroke = Math.sin(v * 0.9 + noise(u * 0.06, v * 0.1) * 6);
        const s =
          shades.length === 1 ? 0
          : shades.length === 2 ? (stroke > 0.3 ? 1 : 0)
          : stroke > 0.5 ? 2 : stroke < -0.5 ? 0 : 1;
        idx = shadeIndex.get(key(id, s));
        if (rand() < prickRate) idx = 0; // pinpricks of paper
      }
      indices[Y * W + X] = idx;
    }
  return { width: W, height: H, palette, indices };
}
