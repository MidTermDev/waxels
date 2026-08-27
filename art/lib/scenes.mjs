// Scene definitions. Coordinates live on a coarse grid (1 cell ≈ one fat
// crayon dab); the renderer wobbles and textures everything afterwards.
import { Scene } from './crayon.mjs';

// Crayola-box palette.
export const C = {
  sky: [92, 160, 224],
  sun: [252, 209, 42],
  ray: [244, 196, 48],
  cloud: [248, 246, 240],
  grass: [124, 198, 74],
  blade: [66, 148, 48],
  canopy: [70, 168, 60],
  trunk: [146, 94, 52],
  fur: [158, 100, 46],
  cream: [244, 226, 184],
  pink: [244, 150, 170],
  ink: [38, 32, 34],
  white: [252, 252, 250],
  tipDark: [74, 48, 26],
  red: [238, 32, 77],
  orange: [255, 117, 56],
  green: [28, 172, 120],
  blue: [31, 117, 254],
  violet: [146, 110, 174],
  heart: [242, 60, 90],
};

/**
 * The hero scene: Waxel the Weasel, out in the yard. Laid out on a 64×48
 * plan, drawn at `k`× cell density (k=1.5 → 96×72 cells) so curves and the
 * sun's face keep their shape while staying proudly pixelated.
 */
export function weaselScene(k = 1.5) {
  const s = new Scene(64, 48, k);
  const sky = s.region(C.sky, { angle: Math.PI / 4 });
  const ray = s.region(C.ray, { angle: Math.PI / 3 });
  const sun = s.region(C.sun, { angle: Math.PI / 2.6 });
  const ink = s.region(C.ink, { outline: false });
  const cloud = s.region(C.cloud, { angle: Math.PI / 9 });
  const trunk = s.region(C.trunk, { angle: Math.PI / 2.1 });
  const canopy = s.region(C.canopy, { angle: Math.PI / 5 });
  const grass = s.region(C.grass, { angle: Math.PI / 16 });
  const blade = s.region(C.blade, { outline: false });
  const tail = s.region(C.fur, { angle: Math.PI / 7 });
  const tip = s.region(C.tipDark, { angle: Math.PI / 7 });
  const earL = s.region(C.fur, { angle: Math.PI / 2.2 });
  const earR = s.region(C.fur, { angle: Math.PI / 2.2 });
  const earIn = s.region(C.pink, { outline: false });
  const fur = s.region(C.fur, { angle: Math.PI / 2.2 });
  const footL = s.region(C.fur, { angle: Math.PI / 2.4 });
  const footR = s.region(C.fur, { angle: Math.PI / 2.4 });
  const belly = s.region(C.cream, { angle: Math.PI / 2.05 });
  const pawL = s.region(C.fur, { angle: Math.PI / 2.6 });
  const pawR = s.region(C.fur, { angle: Math.PI / 2.6 });
  const muzzle = s.region(C.cream, { angle: Math.PI / 2.3 });
  const glint = s.region(C.white, { outline: false });
  const tongue = s.region(C.pink, { angle: Math.PI / 2 });

  // Sky fills everything above the lawn.
  s.rect(0, 0, 63, 38, sky);
  s.rect(0, 39, 63, 47, grass);

  // Smiley sun, top-left.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.35;
    s.stroke(
      9 + Math.cos(a) * 6.8, 8 + Math.sin(a) * 6.8,
      9 + Math.cos(a) * 8.6, 8 + Math.sin(a) * 8.6,
      0.9, ray
    );
  }
  s.ellipse(9, 8, 5, 5, sun);
  s.ellipse(7.5, 7.2, 0.7, 0.9, ink);
  s.ellipse(10.5, 7.2, 0.7, 0.9, ink);
  s.bezier([7, 9.2], [9, 11], [11, 9.2], 0.45, 0.45, ink);

  // Clouds.
  s.ellipse(45, 8, 4, 2.6, cloud);
  s.ellipse(49, 6, 4.2, 3, cloud);
  s.ellipse(53, 8, 4, 2.6, cloud);
  s.ellipse(12, 19, 3, 2, cloud);
  s.ellipse(15.5, 17.4, 3.2, 2.2, cloud);
  s.ellipse(18.5, 19, 2.8, 1.9, cloud);

  // Tree, stage right.
  s.rect(52, 27, 55, 40, trunk);
  s.ellipse(53.5, 20, 6.5, 5.5, canopy);
  s.ellipse(48.5, 23, 5, 4.5, canopy);
  s.ellipse(58.5, 23, 5, 4.5, canopy);
  s.ellipse(53.5, 24.5, 6, 4.5, canopy);

  // Grass blades.
  for (const [x, y] of [[6, 40], [14, 43], [45, 41], [24, 45], [59, 44], [40, 46]]) {
    s.stroke(x, y, x - 1.4, y - 3, 0.5, blade);
    s.stroke(x, y, x + 0.2, y - 3.6, 0.5, blade);
    s.stroke(x, y, x + 1.6, y - 2.6, 0.5, blade);
  }

  // Waxel the Weasel. Tail first (it sits behind the body).
  s.bezier([36, 37.5], [43, 44.5], [46, 38.8], 2.1, 2.8, tail);
  s.ellipse(46.5, 37.8, 2.7, 2.4, tip);

  // Ears poke up behind the head.
  s.ellipse(25.5, 4.2, 2.9, 2.9, earL);
  s.ellipse(38.5, 4.2, 2.9, 2.9, earR);

  // Body, feet, belly, paws, head, muzzle.
  s.ellipse(32, 28, 7, 11, fur);
  s.ellipse(28.5, 40.6, 3, 1.7, footL);
  s.ellipse(35.5, 40.6, 3, 1.7, footR);
  s.ellipse(32, 29, 3.9, 8.5, belly);
  s.ellipse(28, 23.4, 2.1, 1.9, pawL);
  s.ellipse(36, 23.4, 2.1, 1.9, pawR);
  s.ellipse(32, 11, 7.5, 6.5, fur);
  s.ellipse(25.5, 4.4, 1.3, 1.3, earIn);
  s.ellipse(38.5, 4.4, 1.3, 1.3, earIn);
  s.ellipse(32, 14.2, 4.6, 3.1, muzzle);

  // Face.
  s.ellipse(28.5, 10, 1.5, 1.7, ink);
  s.ellipse(35.5, 10, 1.5, 1.7, ink);
  s.ellipse(29.1, 9.3, 0.45, 0.5, glint);
  s.ellipse(36.1, 9.3, 0.45, 0.5, glint);
  s.ellipse(32, 13.2, 1.5, 1, ink);
  s.bezier([29.4, 15.1], [32, 17], [34.6, 15.1], 0.45, 0.45, ink);
  s.ellipse(32, 17, 1.5, 1.15, tongue);

  // Whiskers, clear of the head outline so they read as clean strokes.
  s.stroke(25.6, 13.2, 21.8, 12.6, 0.3, ink);
  s.stroke(25.6, 14.4, 21.8, 15.2, 0.3, ink);
  s.stroke(38.4, 13.2, 42.2, 12.6, 0.3, ink);
  s.stroke(38.4, 14.4, 42.2, 15.2, 0.3, ink);

  return s;
}

/** Head-and-shoulders portrait for pfps: 32×32 cells. */
export function pfpScene() {
  const s = new Scene(32, 32);
  const sky = s.region(C.sky, { angle: Math.PI / 4 });
  const ink = s.region(C.ink, { outline: false });
  const earL = s.region(C.fur, { angle: Math.PI / 2.2 });
  const earR = s.region(C.fur, { angle: Math.PI / 2.2 });
  const earIn = s.region(C.pink, { outline: false });
  const fur = s.region(C.fur, { angle: Math.PI / 2.2 });
  const muzzle = s.region(C.cream, { angle: Math.PI / 2.3 });
  const glint = s.region(C.white, { outline: false });
  const tongue = s.region(C.pink, { angle: Math.PI / 2 });

  s.rect(0, 0, 31, 31, sky);
  s.ellipse(8.5, 7.6, 3.6, 3.6, earL);
  s.ellipse(23.5, 7.6, 3.6, 3.6, earR);
  s.ellipse(16, 27, 10.5, 9, fur); // shoulders
  s.ellipse(16, 15, 9.6, 8.8, fur); // head
  s.ellipse(8.5, 7.8, 1.7, 1.7, earIn);
  s.ellipse(23.5, 7.8, 1.7, 1.7, earIn);
  s.ellipse(16, 19, 6, 4.2, muzzle);
  s.ellipse(12, 13.6, 1.7, 2, ink);
  s.ellipse(20, 13.6, 1.7, 2, ink);
  s.ellipse(12.7, 12.8, 0.65, 0.75, glint);
  s.ellipse(20.7, 12.8, 0.65, 0.75, glint);
  s.ellipse(16, 17.4, 1.8, 1.2, ink);
  s.bezier([13, 20], [16, 22.4], [19, 20], 0.55, 0.55, ink);
  s.ellipse(16, 22.4, 1.8, 1.4, tongue);
  // Whiskers float just off the cheeks, clear of the head outline.
  s.stroke(4.9, 17.6, 1, 16.8, 0.5, ink);
  s.stroke(4.9, 19.6, 1, 20.4, 0.5, ink);
  s.stroke(27.1, 17.6, 31, 16.8, 0.5, ink);
  s.stroke(27.1, 19.6, 31, 20.4, 0.5, ink);
  return s;
}

// 5×7 pixel font, just the letters we need.
const FONT = {
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  X: ['#...#', '##.##', '.###.', '..#..', '.###.', '##.##', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
};

/** The WAXELS wordmark: each letter a different crayon, like a kid wrote it. */
export function wordmarkScene() {
  const word = 'WAXELS';
  const colors = [C.red, C.orange, C.green, C.blue, C.violet, C.pink];
  const yJitter = [0, 1, -1, 1, 0, -1];
  const z = 3; // each font pixel becomes a fat z×z crayon dab
  const s = new Scene((word.length * 7 + 3) * z, 13 * z);
  for (let i = 0; i < word.length; i++) {
    const id = s.region(colors[i], { angle: Math.PI / 4 + (i % 3) * 0.5 });
    const glyph = FONT[word[i]];
    for (let gy = 0; gy < 7; gy++)
      for (let gx = 0; gx < 5; gx++) {
        if (glyph[gy][gx] !== '#') continue;
        const x0 = (2 + i * 7 + gx) * z;
        const y0 = (3 + gy + yJitter[i]) * z;
        for (let dy = 0; dy < z; dy++)
          for (let dx = 0; dx < z; dx++) s.set(x0 + dx, y0 + dy, id);
      }
  }
  return s;
}

/** Tiny fridge-door doodles that get minted in the demo gallery. */
export function sunScene() {
  const s = new Scene(24, 24);
  const ray = s.region(C.ray, { angle: Math.PI / 3 });
  const sun = s.region(C.sun, { angle: Math.PI / 2.6 });
  const ink = s.region(C.ink, { outline: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    s.stroke(
      12 + Math.cos(a) * 8, 12 + Math.sin(a) * 8,
      12 + Math.cos(a) * 10.6, 12 + Math.sin(a) * 10.6,
      0.8, ray
    );
  }
  s.ellipse(12, 12, 6, 6, sun);
  s.ellipse(10, 10.6, 0.7, 0.9, ink);
  s.ellipse(14, 10.6, 0.7, 0.9, ink);
  s.bezier([9.4, 13.4], [12, 15.4], [14.6, 13.4], 0.5, 0.5, ink);
  return s;
}

export function heartScene() {
  const s = new Scene(24, 24);
  const heart = s.region(C.heart, { angle: Math.PI / 3.4 });
  const glint = s.region(C.white, { outline: false });
  s.ellipse(8.5, 9, 5, 5, heart);
  s.ellipse(15.5, 9, 5, 5, heart);
  for (let y = 9; y <= 20; y++) {
    const w = Math.max(0.8, 8.4 - (y - 9) * 0.78);
    s.rect(Math.round(12 - w), y, Math.round(12 + w), y, heart);
  }
  s.ellipse(8.4, 8, 1.3, 1.3, glint);
  return s;
}

export function houseScene() {
  const s = new Scene(24, 24);
  const grass = s.region(C.grass, { angle: Math.PI / 16 });
  const wall = s.region(C.cream, { angle: Math.PI / 2.1 });
  const roof = s.region(C.red, { angle: Math.PI / 4.2 });
  const chimney = s.region(C.trunk, { angle: Math.PI / 2.2 });
  const smoke = s.region(C.cloud, { angle: Math.PI / 8, outline: false });
  const door = s.region(C.trunk, { angle: Math.PI / 2.3 });
  const window = s.region(C.sky, { angle: Math.PI / 4 });
  const knob = s.region(C.sun, { outline: false });

  s.rect(0, 20, 23, 23, grass);
  s.rect(15, 4, 17, 9, chimney);
  s.ellipse(18.5, 2.6, 1.6, 1.1, smoke);
  s.ellipse(20.6, 1.4, 1.2, 0.9, smoke);
  // Roof: widening rows from the apex down to the eaves.
  for (let y = 4; y <= 11; y++) {
    const w = 1 + ((y - 4) / 7) * 8.4;
    s.rect(Math.round(11.5 - w), y, Math.round(11.5 + w), y, roof);
  }
  s.rect(5, 12, 18, 20, wall);
  s.rect(9, 15, 13, 20, door);
  s.ellipse(12.2, 17.6, 0.55, 0.55, knob);
  s.rect(15, 14, 17, 16, window);
  return s;
}

export function flowerScene() {
  const s = new Scene(24, 24);
  const grass = s.region(C.grass, { angle: Math.PI / 16 });
  const stem = s.region(C.blade, { angle: Math.PI / 2 });
  const leaf = s.region(C.canopy, { angle: Math.PI / 5 });
  const petal = s.region(C.pink, { angle: Math.PI / 3 });
  const heart = s.region(C.sun, { angle: Math.PI / 2.6 });

  s.rect(0, 20, 23, 23, grass);
  s.stroke(12, 13, 11.6, 21, 0.8, stem);
  s.ellipse(9.2, 17, 2.2, 1.2, leaf);
  s.ellipse(14.6, 18.2, 2.2, 1.2, leaf);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    s.ellipse(12 + Math.cos(a) * 3.6, 8.5 + Math.sin(a) * 3.6, 2.5, 2.5, petal);
  }
  s.ellipse(12, 8.5, 2.3, 2.3, heart);
  return s;
}

export function rainbowScene() {
  const s = new Scene(24, 24);
  const bands = [C.red, C.orange, C.sun, C.green, C.blue, C.violet].map((c, i) =>
    s.region(c, { angle: Math.PI / 4 + i * 0.2 })
  );
  const cloud = s.region(C.cloud, { angle: Math.PI / 9 });
  // Concentric arcs from a center just below the frame.
  bands.forEach((id, i) => {
    const r = 13.2 - i * 1.35;
    for (let t = 0; t <= 44; t++) {
      const a = Math.PI * (0.08 + (0.84 * t) / 44);
      s.ellipse(12 + Math.cos(a) * r, 22.5 - Math.sin(a) * r, 0.85, 0.85, id);
    }
  });
  s.ellipse(3.6, 20.4, 3.1, 2.1, cloud);
  s.ellipse(20.4, 20.4, 3.1, 2.1, cloud);
  return s;
}

export function iceCreamScene() {
  const s = new Scene(24, 24);
  const cone = s.region(C.trunk, { angle: Math.PI / 3.6 });
  const scoopA = s.region(C.pink, { angle: Math.PI / 2.4 });
  const scoopB = s.region(C.cream, { angle: Math.PI / 2.1 });
  const cherry = s.region(C.red, { angle: Math.PI / 3 });
  const ink = s.region(C.ink, { outline: false });

  // Cone: narrowing rows down to the tip.
  for (let y = 12; y <= 21; y++) {
    const w = 4.4 * (1 - (y - 12) / 9.5);
    s.rect(Math.round(12 - w), y, Math.round(12 + w), y, cone);
  }
  s.ellipse(12, 9.6, 4.5, 3.4, scoopA);
  s.ellipse(12, 5.8, 3.6, 2.7, scoopB);
  s.stroke(12.6, 2.8, 13.4, 1.6, 0.4, ink);
  s.ellipse(12.2, 3.2, 1.1, 1.1, cherry);
  return s;
}

export function rocketScene() {
  const s = new Scene(24, 24);
  const body = s.region(C.cloud, { angle: Math.PI / 2.2 });
  const noseW = s.region(C.red, { angle: Math.PI / 3 });
  const fin = s.region(C.red, { angle: Math.PI / 5 });
  const win = s.region(C.sky, { angle: Math.PI / 4 });
  const flame = s.region(C.orange, { angle: Math.PI / 2 });
  const flame2 = s.region(C.sun, { angle: Math.PI / 2 });
  // Nose cone, body, fins, window, flames — pointing up.
  for (let y = 3; y <= 7; y++) {
    const w = ((y - 3) / 4) * 3.4;
    s.rect(Math.round(12 - w), y, Math.round(12 + w), y, noseW);
  }
  s.rect(9, 8, 15, 17, body);
  s.ellipse(12, 11.5, 2, 2, win);
  s.stroke(8.6, 14, 5.6, 19, 1.4, fin);
  s.stroke(15.4, 14, 18.4, 19, 1.4, fin);
  s.ellipse(12, 19.6, 2.6, 2, flame);
  s.ellipse(12, 20.4, 1.2, 1.4, flame2);
  return s;
}
