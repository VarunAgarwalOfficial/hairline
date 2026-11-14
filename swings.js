/**
 * Swings: a swing set over a sand bed, a kid on each of its four seats. The
 * swing under the pointer is pushed high, toward the viewer; its neighbours
 * swing after it, less the farther they are, staggered outwards on the 700ms
 * lift curve. At rest each swing is caught at a different point of its arc,
 * and the highest is bright. The slider is the stagger, in ms.
 *
 * Wherever two parts cross on screen, the one with the larger x is nearer,
 * whatever the seats' angles, so the swings go in by x. Within a swing, the
 * seat moves from behind the kid to in front once its underside shows. The
 * hit test reads each chain at its rest angle, which never moves.
 */
const {
  Cam, clamp, facing, fit, hull, poly, prism, proj, put, rad, rings, rrect, seg, solid, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, register,
} = HL;

const S = 1.65, N = 4, G = 34, HB = 72, BR = 2, TOP = HB - BR, L = 52;
const SW = 8, SD = 3.5, T = 1.4, CW = 6.5, SEAT = rrect(-SW, -SD, SW, SD, 2, 4);
const XA = -22, XB = (N - 1) * G + 22, SP = 32, LR = 1.8, PB = 5;
const BX0 = -32, BY0 = -42, BX1 = XB + 10, BY1 = 52;
// A kid, in the seat's own frame (u across, v forward, w down the chains), as [from, to, radius]:
// a big head, hands up on the chains, legs kicked out, and on every other kid a ponytail.
const KID = {
  tail: [[0, -3.5, -17.5], [0, -8.5, -15], 1.5],
  armL: [[-2.6, 0, -7.5], [-CW, 0, -11.5], 1.2], armR: [[2.6, 0, -7.5], [CW, 0, -11.5], 1.2],
  body: [[0, -0.5, -3.5], [0, -0.5, -8], 3.4], head: [[0, -0.5, -14.5], [0, -0.5, -14.5], 4.4],
  legL: [[-1.8, 0.5, -1.6], [-2, 11, 2.5], 1.5], legR: [[1.8, 0.5, -1.6], [2, 11, 2.5], 1.5],
};
// Back to front, seen from above the seat and from below it.
const UP = ["seat", "tail", "armL", "body", "head", "armR", "legL", "legR"];
const DOWN = ["tail", "armL", "head", "body", "armR", "legL", "legR", "seat"];
const REST = [28, 2, 14, 8], MARK = 0, PUSH = 54, FALL = [1, 0.45, 0.2, 0.08], REACH = 36;

/** A round bar between two points, through projection Q: the camera is orthographic, so each rounded end shows as a circle of radius r × S. */
function bar(Q, a, b, r) {
  const pts = [];
  for (const [x, y] of [Q(...a), Q(...b)]) for (let k = 0; k < 24; k++) {
    const t = (k / 24) * 2 * Math.PI;
    pts.push([x + Math.cos(t) * r * S, y + Math.sin(t) * r * S]);
  }
  return poly(hull(pts));
}

/** The distance from screen point p to the segment from a to b. */
function toSeg([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Every pose stays over the bed, so fitting the bed and the beam fits them all.
  const C = Cam(45, 0.5, S);
  fit(C, [[BX0, BY0, -PB], [BX1, BY1, -PB], [BX1, BY0, -PB], [BX0, BY1, -PB], [XA - 6, 0, HB + BR], [XB + 6, 0, HB + BR]], 200, 166);
  const P = proj(C), front = facing(C);
  // Up a ray through the screen is toward the camera: the face of a seat that leans that way is the one seen.
  const u0 = unproj(C, 200, 166, 0), u1 = unproj(C, 200, 166, 1), toCamY = u1[1] - u0[1];

  /** The seat of the swing at x, hanging th degrees toward the viewer: (u, v) across its top, w down the chains. */
  const seatAt = (x, th) => {
    const s = Math.sin(rad(th)), c = Math.cos(rad(th)), y = L * s, z = TOP - L * c;
    return (u, v, w) => P(x + u, y + v * c + w * s, z + v * s - w * c);
  };

  const g = mk("g", {}, svg);
  const [br, bi] = rings(BX0, BY0, BX1, BY1, 10, 2);
  put(solid(g), prism(P, front, br, bi, -PB, 0));
  const leg = (x, y) => mk("path", { d: bar(P, [x, y, LR], [x, 0, HB], LR), class: "sil" }, g);
  leg(XA, -SP); leg(XB, -SP);
  mk("path", { d: bar(P, [XA - 6, 0, HB], [XB + 6, 0, HB], BR), class: "sil" }, g);
  leg(XA, SP);
  const swings = [];
  for (let i = 0; i < N; i++) {
    const lit = i === MARK ? " hi" : "";
    const left = mk("path", { class: "nf" + lit }, g), stack = mk("g", {}, g), seat = mk("g", {}, stack);
    const back = mk("path", { class: "lo" }, seat), face = mk("path", { class: "sil" + lit }, seat);
    const kid = {};
    for (const k in KID) if (k !== "tail" || i % 2 === 0) kid[k] = mk("path", { class: "sil" }, stack);
    swings.push({ x: i * G, a: tween(REST[i]), drawn: NaN, up: null, left, stack, back, face, kid: { seat, ...kid }, right: mk("path", { class: "nf" + lit }, g) });
  }
  leg(XB, SP);

  function draw(sw, th) {
    const at = seatAt(sw.x, th);
    const top = poly(SEAT.map((q) => at(q.u, q.v, 0))), under = poly(SEAT.map((q) => at(q.u, q.v, T)));
    const up = Math.cos(rad(th)) - Math.sin(rad(th)) * toCamY > 0;
    sw.left.setAttribute("d", seg(P(sw.x - CW, 0, TOP), at(-CW, 0, 0)));
    sw.right.setAttribute("d", seg(P(sw.x + CW, 0, TOP), at(CW, 0, 0)));
    sw.back.setAttribute("d", up ? under : top);
    sw.face.setAttribute("d", up ? top : under);
    for (const k in KID) if (sw.kid[k]) sw.kid[k].setAttribute("d", bar(at, ...KID[k]));
    // Seen from above, the kid sits on the seat; seen from below, the seat hides where the kid sits.
    if (up !== sw.up) {
      sw.up = up;
      for (const k of up ? UP : DOWN) if (sw.kid[k]) sw.stack.append(sw.kid[k]);
    }
  }

  // hit: each chain at its REST angle, from the beam to the seat. It never moves, and nothing draws it.
  const lines = swings.map((sw, i) => [P(sw.x, 0, TOP), seatAt(sw.x, REST[i])(0, 0, 0)]);
  function hit(p) {
    let best = -1, near = REACH;
    lines.forEach(([a, b], i) => { const d = toSeg(p, a, b); if (d < near) { near = d; best = i; } });
    return best;
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const sw of swings) {
      const th = tval(sw.a, now);
      if (th !== sw.drawn) { sw.drawn = th; draw(sw, th); }
      if (!tdone(sw.a, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  let act = -1;
  /** Pushes swing a (-1 lets them all back to rest). The stagger spreads out from the one pushed, or the one let go. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act, lit = a >= 0 ? a : MARK;
    act = a;
    swings.forEach((sw, i) => {
      tset(sw.a, a < 0 ? REST[i] : PUSH * FALL[Math.abs(i - a)], now, Math.abs(i - from) * stag);
      for (const el of [sw.left, sw.right, sw.face]) el.classList.toggle("hi", i === lit);
    });
    read.textContent = a < 0 ? "rest" : `swing ${a + 1}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "swings",
  means: "Kids on a swing set: the swing under the pointer is pushed high, and its neighbours swing after it, less and later.",
  rules: [1, 2, 5, 8],
  range: [0, 40, 90],
  mount,
});
