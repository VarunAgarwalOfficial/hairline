/** Two kids on swings. Static rest-pose picking, staggered 700ms tweens, and the fixed Hairline palette. */
const {
  Cam, clamp, facing, fillet, fit, hull, place, poly, prism, proj, put, rad, rings, rrect, seg, solid, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, register,
} = HL;

const GAP = 52, TOP = 88, LENGTH = 62, CHAIN = 9, THICKNESS = 1.6;
const REST = [-9, 21], MARK = 1;
const SEAT = rrect(-12, -5, 12, 5, 3, 6);
// Broad cheeks, compact clothing, and short limbs, in the seat's local frame.
const SHIRT = fillet([[-4, -13], [4, -13], [5.5, -10], [5, -1], [-5, -1], [-5.5, -10]], [2, 2, 2, 2, 2, 2], 6);
const HEAD = [];
for (let j = 0; j <= 20; j++) for (let k = 0; k < 48; k++) {
  const latitude = -Math.PI / 2 + j * Math.PI / 20, longitude = k * Math.PI / 24;
  const round = Math.cos(latitude), chin = 1 - 0.12 * Math.max(0, Math.sin(latitude));
  HEAD.push([7 * round * Math.cos(longitude) * chin, 1 + 5.5 * round * Math.sin(longitude), -20.5 + 6.8 * Math.sin(latitude)]);
}

function distanceToSegment([x, y], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let push = value, active = -1;
  const C = Cam(45, 0.5, 1.85);
  fit(C, [[-30, -38, -3], [82, -38, -3], [-30, 52, -3], [82, 52, -3], [-25, 0, 93], [77, 0, 93]], 200, 166);
  const P = proj(C), front = facing(C);
  const origin = P(0, 0, 0), unit = P(1, -1, 0);
  const scale = Math.hypot(unit[0] - origin[0], unit[1] - origin[1]) / Math.sqrt(2);
  const ray0 = unproj(C, 200, 166, 0), ray1 = unproj(C, 200, 166, 1);
  const cameraY = ray1[1] - ray0[1];

  // A round tube has no vertical corner or extra box edges.
  function tube(project, a, b, radius) {
    const points = [];
    for (const end of [a, b]) {
      const [x, y] = project(...end);
      for (let k = 0; k < 32; k++) {
        const angle = k * Math.PI / 16;
        points.push([x + radius * scale * Math.cos(angle), y + radius * scale * Math.sin(angle)]);
      }
    }
    return poly(hull(points));
  }

  // One rounded outline at a bent knee, rather than two overlapping capsules.
  function limb(project, points, radius) {
    if (points.length === 2) return tube(project, points[0], points[1], radius);
    const [a, b, c] = points.map((point) => project(...point)), r = radius * scale;
    const direction = (p, q) => {
      const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
      return [(q[0] - p[0]) / length, (q[1] - p[1]) / length];
    };
    const d0 = direction(a, b), d1 = direction(b, c);
    const n0 = [-d0[1], d0[0]], n1 = [-d1[1], d1[0]];
    const denominator = 1 + n0[0] * n1[0] + n0[1] * n1[1];
    const middle = [(n0[0] + n1[0]) / denominator, (n0[1] + n1[1]) / denominator];
    const offset = (p, n, side) => [p[0] + n[0] * r * side, p[1] + n[1] * r * side];
    const start = offset(a, d0, -1), end = offset(c, d1, 1);
    const outline = [offset(start, n0, 1), offset(b, middle, 1), offset(end, n1, 1),
      offset(end, n1, -1), offset(b, middle, -1), offset(start, n0, -1)];
    return poly(fillet(outline, outline.map(() => r), 6));
  }

  function seatAt(x, angle) {
    const s = Math.sin(rad(angle)), c = Math.cos(rad(angle));
    return (u, v, w) => P(x + u, LENGTH * s + v * c + w * s, TOP - LENGTH * c + v * s - w * c);
  }

  const group = mk("g", {}, svg);
  const [ground, inset] = rings(-30, -38, 82, 52, 9, 1.5);
  put(solid(group), prism(P, front, ground, inset, -3, 0));
  function leg(x, y) {
    mk("path", { d: tube(P, [x, y, 2], [x, 0, 90], 2), class: "sil" }, group);
  }
  leg(-22, -31); leg(74, -31);
  mk("path", { d: tube(P, [-27, 0, 90], [79, 0, 90], 2.5), class: "sil" }, group);
  leg(-22, 31);

  const swings = REST.map((angle, i) => {
    const swing = mk("g", {}, group);
    const left = mk("path", { class: "nf" }, swing);
    const right = mk("path", { class: "nf" }, swing);
    const stack = mk("g", {}, swing);
    const seat = mk("g", {}, stack);
    const back = mk("path", { class: "lo" }, seat);
    const face = mk("path", { class: "sil" }, seat);
    const limbs = [-1, 1].map(() => ({
      arm: mk("path", { class: "sil" }, stack), leg: mk("path", { class: "sil" }, stack), shoe: mk("path", { class: "sil" }, stack),
    }));
    const body = solid(stack);
    const hands = [-1, 1].map(() => mk("path", { class: "sil" }, stack));
    const head = mk("path", { class: "sil" }, stack);
    stack.append(hands[1]);
    const hair = mk("path", { class: "nf lo" }, stack), mouth = mk("path", { class: "nf lo" }, stack);
    const eyes = [-1, 1].map(() => mk("circle", { r: 0.65 * scale, class: "dot m" }, stack));
    return { index: i, x: i * GAP, angle: tween(angle), drawn: NaN, up: true, left, right, stack, seat, back, face, limbs, body, head, hands, hair, mouth, eyes };
  });
  leg(74, 31);

  function draw(sw, angle) {
    const at = seatAt(sw.x, angle);
    const top = poly(SEAT.map((q) => at(q.u, q.v, 0)));
    const bottom = poly(SEAT.map((q) => at(q.u, q.v, THICKNESS)));
    const up = Math.cos(rad(angle)) - Math.sin(rad(angle)) * cameraY > 0;
    sw.left.setAttribute("d", seg(P(sw.x - CHAIN, 0, TOP), at(-CHAIN, 0, 0)));
    sw.right.setAttribute("d", seg(P(sw.x + CHAIN, 0, TOP), at(CHAIN, 0, 0)));
    sw.back.setAttribute("d", up ? bottom : top);
    sw.face.setAttribute("d", up ? top : bottom);
    // The kids sit upright instead of rotating rigidly with their seats. Hands stay on the chains.
    const lean = rad(angle * 0.35), s = Math.sin(rad(angle)), c = Math.cos(rad(angle));
    const kidAt = (u, v, w) => Math.abs(u) === CHAIN ? at(u, v, w) :
      P(sw.x + u, LENGTH * s + v * Math.cos(lean) + w * Math.sin(lean), TOP - LENGTH * c + v * Math.sin(lean) - w * Math.cos(lean));
    [-1, 1].forEach((side, i) => {
      const arm = [[side * 3.5, 0, -11], [side * 7, 0, -10], [side * CHAIN, 0, -18]];
      const leg = [[side * 2.8, 2, -1], [side * 2.8, 8, 0], [side * 2.8, 10, 6]];
      sw.limbs[i].arm.setAttribute("d", limb(kidAt, arm, 1.6));
      sw.limbs[i].leg.setAttribute("d", limb(kidAt, leg, 2));
      sw.limbs[i].shoe.setAttribute("d", tube(kidAt, [side * 2.8, 10, 6], [side * 2.8, 12.5, 6], 1.8));
      sw.hands[i].setAttribute("d", tube(at, [side * CHAIN, 0, -18], [side * CHAIN, 0, -18], 1.6));
      place(sw.eyes[i], kidAt(side * 2.2, 6, -21));
    });
    put(sw.body, {
      sil: poly(hull(SHIRT.flatMap(([u, w]) => [kidAt(u, -3, w), kidAt(u, 3, w)]))),
      crease: seg(kidAt(-3.5, 3, -2), kidAt(3.5, 3, -2)),
    });
    sw.head.setAttribute("d", poly(hull(HEAD.map((point) => kidAt(...point)))));
    const curve = (a, b, c) => `M${kidAt(...a).join(",")}Q${kidAt(...b).join(",")} ${kidAt(...c).join(",")}`;
    sw.hair.setAttribute("d", sw.index === 0 ? curve([-5, 3, -24], [-1, 6, -24], [4, 3, -26]) : curve([-5, 3, -24], [0, 6, -26], [5, 3, -24]));
    sw.mouth.setAttribute("d", curve([-1.6, 6, -18.8], [0, 6.3, -17.3], [1.6, 6, -18.8]));
    if (up !== sw.up) {
      sw.up = up;
      if (up) sw.stack.prepend(sw.seat);
      else sw.stack.append(sw.seat);
    }
  }

  const bands = swings.map((sw, i) => [P(sw.x, 0, TOP), seatAt(sw.x, REST[i])(0, 0, 0)]);
  function hit(point) {
    let chosen = -1, nearest = 22;
    bands.forEach(([a, b], i) => {
      const distance = distanceToSegment(point, a, b);
      if (distance < nearest) { nearest = distance; chosen = i; }
    });
    return chosen;
  }

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    for (const sw of swings) {
      const angle = tval(sw.angle, now);
      if (angle !== sw.drawn) { sw.drawn = angle; draw(sw, angle); }
      if (!tdone(sw.angle, now)) moving = true;
    }
    return moving;
  });
  bag.add(loop.unregister);

  function retarget(from) {
    const now = performance.now(), bright = active < 0 ? MARK : active;
    swings.forEach((sw, i) => {
      const distance = Math.abs(i - from);
      const angle = active < 0 ? REST[i] : i === active ? push : REST[i] + (push - REST[active]) * 0.35;
      tset(sw.angle, angle, now, distance * 45);
      for (const edge of [sw.left, sw.right, sw.face]) edge.classList.toggle("hi", i === bright);
    });
    read.textContent = active < 0 ? "rest" : `swing ${active + 1}`;
    loop.wake();
  }

  function choose(next) {
    if (next === active) return;
    const from = next < 0 ? active : next;
    active = next;
    retarget(from);
  }
  retarget(MARK);
  bag.add(pointer(stage, { move: (point) => choose(hit(point)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (next) => { push = next; if (active >= 0) retarget(active); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "two-swings",
  means: "Two kids on park swings: hover over either swing to push it forward, with its neighbour following less and later.",
  rules: [1, 2, 4, 5, 8, 9],
  range: [28, 36, 44],
  mount,
});
