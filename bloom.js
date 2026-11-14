/**
 * Bloom: a house in a garden of shrubs. The pointer is where the water falls:
 * each shrub takes its height from its distance to that point, on its own
 * spring, and never drops below its rest height. At rest the tallest shrub, at
 * the end of the path, is bright; under the pointer, the shrub it is over is,
 * or on bare lawn the shrub nearest it.
 * The slider is the radius, in world units.
 *
 * The house sits in the back corner, so it is painted first and every shrub
 * after it, nearest last.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, lerp, open, poly, prism, proj, rings, ringAt, rrect, run,
  unproj, spring, stepS, mk, pointer, put, register, disposer, solid,
} = HL;

// The garden from above: one row per y cell, one character per x cell.
// H house, : a path stone, . lawn, a digit a shrub whose rest height is that digit times four.
const PLAN = [
  "HHH.246",
  "HHH.234",
  "2:2.3.2",
  "3:22.23",
  "4:.232.",
  "6:32.22",
  "8:4.22.",
];
const N = 7, CELL = 18, EXT = N * CELL, PB = 5, HMAX = 50;
const HOUSE = { x0: 3, x1: 51, y0: 3, y1: 33, wall: 20, ridge: 36, eave: 2 };
const YM = (HOUSE.y0 + HOUSE.y1) / 2;
const CHIMNEY = { x0: 10, x1: 16, y0: 7, y1: 13, top: 43 };
// A shrub's outline, foot to tip: [share of its radius, share of its height].
const PROFILE = [[1, 0], [0.9, 0.45], [0.6, 0.8], [0.3, 1]];

/** How far a shrub grows from its rest height to full height, at u radii from the water: 1 there, 0 from one radius out. */
const growth = (u) => (u < 1 ? (1 - u * u) ** 2 : 0);

// A shrub's radius widens as it grows; the ring of samples at a given radius round its centre.
const radius = (h) => clamp(4.5 + h * 0.12, 5, 8);
const circle = (s, r) => rrect(s.cx - r, s.cy - r, s.cx + r, s.cy + r, r);

const inBox = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

/** Whether the world point is inside the house: walls, then the gable roof narrowing to its ridge, then the chimney. */
function inHouse(x, y, z) {
  const H = HOUSE, e = H.eave;
  if (z <= H.wall) return inBox(H, x, y);
  const half = (YM - H.y0 + e) * (H.ridge - z) / (H.ridge - H.wall);
  if (z <= H.ridge && x >= H.x0 - e && x <= H.x1 + e && Math.abs(y - YM) <= half) return true;
  return z <= CHIMNEY.top && inBox(CHIMNEY, x, y);
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.55);
  const shrubs = [], stones = [];
  PLAN.forEach((row, j) => [...row].forEach((ch, i) => {
    const cx = (i + 0.5) * CELL, cy = (j + 0.5) * CELL;
    if (ch === ":") stones.push({ cx, cy });
    if (ch >= "1" && ch <= "9") shrubs.push({ i, j, cx, cy, h0: Number(ch) * 4 });
  }));
  // Fit to the tallest pose: every shrub at full height, and the chimney.
  fit(C, [
    [-6, -6, -PB], [EXT + 6, EXT + 6, -PB], [EXT + 6, -6, -PB], [-6, EXT + 6, -PB],
    [CHIMNEY.x0, CHIMNEY.y0, CHIMNEY.top], ...shrubs.map((s) => [s.cx, s.cy, HMAX]),
  ], 200, 166);
  const P = proj(C), front = facing(C);
  let R = value, over = null;

  const g = mk("g", {}, svg);
  const [lr, li] = rings(-6, -6, EXT + 6, EXT + 6, 9, 2.2);
  put(solid(g), prism(P, front, lr, li, -PB, 0));

  const H = HOUSE, e = H.eave;
  const [wr, wi] = rings(H.x0, H.y0, H.x1, H.y1, 2, 1.2);
  put(solid(g), prism(P, front, wr, wi, 0, H.wall));
  // The door and windows, dim, on the two walls the camera sees: +y (the front) and +x (the gable end).
  const mark = (pts) => mk("path", { class: "nf lo", d: poly(fillet(pts.map((p) => P(...p)), [1.2, 1.2, 1.2, 1.2])) }, g);
  const onFront = (x0, x1, z0, z1) => mark([[x0, H.y1, z0], [x1, H.y1, z0], [x1, H.y1, z1], [x0, H.y1, z1]]);
  onFront(24, 31, 1, 13);
  onFront(8, 15, 8, 14);
  onFront(39, 46, 8, 14);
  mark([[H.x1, 14, 8], [H.x1, 22, 8], [H.x1, 22, 14], [H.x1, 14, 14]]);
  // The chimney stands on the back slope, so the roof, painted after it, hides its foot.
  const [cr, ci] = rings(CHIMNEY.x0, CHIMNEY.y0, CHIMNEY.x1, CHIMNEY.y1, 1.2, 0.8);
  put(solid(g), prism(P, front, cr, ci, H.wall, CHIMNEY.top));
  // The roof: the hull of the eaves and the ridge. Its crease is the near rake of the gable end.
  const eaves = rrect(H.x0 - e, H.y0 - e, H.x1 + e, H.y1 + e, 1.5);
  const ridge = rrect(H.x0 - e, YM - 1.2, H.x1 + e, YM + 1.2, 1.2);
  put(solid(g), {
    sil: poly(hull(ringAt(P, eaves, H.wall).concat(ringAt(P, ridge, H.ridge)))),
    crease: open([P(H.x1 + e - 0.6, YM + 1, H.ridge - 0.4), P(H.x1 + e - 0.6, H.y1 + e - 0.6, H.wall + 0.3)]),
  });

  // The garden, back to front.
  const parts = [...shrubs, ...stones].sort((a, b) => a.cx + a.cy - (b.cx + b.cy));
  for (const s of parts) {
    s.el = solid(g);
    if (!s.h0) {
      const [sr, si] = rings(s.cx - 5, s.cy - 3.5, s.cx + 5, s.cy + 3.5, 2.5, 1);
      put(s.el, prism(P, front, sr, si, 0, 1.2));
      continue;
    }
    s.r = radius(s.h0);
    s.sp = spring(s.h0, { eps: 0.04 });
    s.drawn = NaN;
  }
  const peak = shrubs.reduce((a, b) => (b.h0 > a.h0 ? b : a));

  // A shrub whose spring hasn't moved keeps its paths.
  function drawShrub(s) {
    const h = Math.max(1, s.sp.x);
    if (h === s.drawn) return;
    s.drawn = h;
    const r = radius(h), pts = PROFILE.flatMap(([k, f]) => ringAt(P, circle(s, k * r), h * f));
    const inner = circle(s, PROFILE[2][0] * r - 0.8);
    put(s.el, { sil: poly(hull(pts)), crease: open(ringAt(P, run(inner, front), h * PROFILE[2][1])) });
  }

  const B = register(stage, (dt) => {
    let moving = false;
    for (const s of shrubs) { if (stepS(s.sp, dt)) moving = true; drawShrub(s); }
    return moving;
  });
  bag.add(B.unregister);

  // What the pointer is on, tested against the rest pose (rule 01): walk the ray
  // under it down from above the garden. The first thing it meets is in front.
  // The house takes no water; off the lawn is rest.
  function pick(sx, sy) {
    const a = unproj(C, sx, sy, 0), b = unproj(C, sx, sy, HMAX);
    for (let z = HMAX; z >= 0; z -= 0.5) {
      const x = lerp(a[0], b[0], z / HMAX), y = lerp(a[1], b[1], z / HMAX);
      if (inHouse(x, y, z)) return null;
      const s = shrubs.find((s) => z <= s.h0 && Math.hypot(x - s.cx, y - s.cy) <= s.r);
      if (s) return { s, at: [x, y] };
    }
    if (a[0] < -6 || a[1] < -6 || a[0] > EXT + 6 || a[1] > EXT + 6) return null;
    const dist = (s) => Math.hypot(a[0] - s.cx, a[1] - s.cy);
    return { s: shrubs.reduce((m, s) => (dist(s) < dist(m) ? s : m)), at: a };
  }

  function retarget() {
    for (const s of shrubs) {
      const d = over ? Math.hypot(s.cx - over.at[0], s.cy - over.at[1]) : Infinity;
      s.sp.t = s.h0 + (HMAX - s.h0) * growth(d / R);
      s.el.sil.classList.toggle("hi", s === (over ? over.s : peak));
    }
    read.textContent = over ? `shrub ${over.s.i}·${over.s.j}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = pick(p[0], p[1]); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { R = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "bloom",
  means: "Shrubs round a house grow where the pointer waters the garden, less the farther they stand from it.",
  rules: [1, 3, 5, 9],
  range: [28, 46, 72],
  mount,
});
