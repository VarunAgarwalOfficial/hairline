/**
 * Flip: a clamshell phone on the desk, its lid on a barrel hinge along the
 * base's far edge. The lid's free edge follows the pointer's x, so the hand
 * swings it from shut to open, on a spring. At rest it stands open a little
 * past upright and the hinge is bright; while the pointer holds the lid, the
 * lid is. The slider is the travel: how far the lid opens at the far end of
 * the scrub, in degrees.
 *
 * The lid and the barrel do not stand straight up, so each is drawn in its own
 * axes: the hull of its two end rings, and a crease on the end that faces the
 * viewer. Once the lid's foot turns away from the viewer, the lid goes behind
 * the barrel, and the barrel behind the base.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, put, rad, rings, rrect, run, solid,
  spring, stepS, disposer, mk, pointer, register,
} = HL;

const W = 44, L = 88, HB = 8, T = 5, R = 6.5, RC = 7, B = 1.4, REST = 110, STOP = 175;
// The direction toward the viewer at Cam(45, 0.5), whose elevation has sine 0.5.
const VIEW = [Math.sqrt(0.375), Math.sqrt(0.375), 0.5];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The world point o + u·U + v·V + w·A, for axes [o, U, V, A]. */
const at = ([o, U, V, A], u, v, w) => [0, 1, 2].map((i) => o[i] + u * U[i] + v * V[i] + w * A[i]);

/** The lid's axes at th degrees open: from the hinge axis, u across, v out to the free edge, w out through its back. */
function lidAxes(th) {
  const c = Math.cos(rad(th)), s = Math.sin(rad(th));
  return [[0, -R, HB], [1, 0, 0], [0, c, s], [0, -s, c]];
}

/** A solid in its own axes, from w 0 to len: the hull of its two end rings, and its crease on the end that faces the viewer. */
function framed(P, ax, ring, inner, len) {
  const [, U, V, A] = ax, end = dot(A, VIEW) > 0 ? len : 0;
  const side = (q) => q.nu * dot(U, VIEW) + q.nv * dot(V, VIEW) > 0;
  const on = (q, w) => P(...at(ax, q.u, q.v, w));
  return {
    sil: poly(hull(ring.map((q) => on(q, 0)).concat(ring.map((q) => on(q, len))))),
    crease: open(run(inner, side).map((q) => on(q, end))),
    end,
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.7);
  // Fitted to the base, the barrel, and the lid's free edge over its whole swing.
  const pts = [[0, L, 0], [W, L, 0], [W, -2 * R, HB + R], [0, -2 * R, HB + R]];
  for (let th = 0; th <= STOP; th += 5) for (const u of [0, W]) for (const w of [0, T]) pts.push(at(lidAxes(th), u, R + L, w));
  fit(C, pts, 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  // The barrel: a round bar behind the base's far edge, the lid's foot riding on it.
  const barrel = solid(g);
  put(barrel, framed(P, [[1.5, -R, HB], [0, 1, 0], [0, 0, 1], [1, 0, 0]], circ(R), circ(R - 0.9), W - 3));
  // The base, with a round navigation key and a 3 × 4 keypad on its top.
  const base = solid(g);
  const [br, bi] = rings(0, 0, W, L, RC, B);
  put(base, prism(P, front, br, bi, 0, HB));
  const keys = [rrect(W / 2 - 6, 13, W / 2 + 6, 25, 6, 6)];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keys.push(rrect(5 + c * 12.5, 33 + r * 11, 14 + c * 12.5, 40 + r * 11, 2, 3));
  mk("path", { class: "nf lo", d: keys.map((k) => poly(k.map((q) => P(q.u, q.v, HB)))).join("") }, base.g);
  // The lid, with a screen and an earpiece slot on the face that shuts onto the keypad.
  const lid = solid(g);
  const [lr, li] = rings(0, R, W, R + L, RC, B);
  const SCREEN = rrect(6, R + 30, W - 6, R + 74, 3, 4), EAR = rrect(W / 2 - 6, R + L - 9.5, W / 2 + 6, R + L - 7, 1.2, 3);
  const screen = mk("path", { class: "nf" }, lid.g), ear = mk("path", { class: "nf lo" }, lid.g);
  let ahead = true;

  function drawLid(th) {
    const ax = lidAxes(th), f = framed(P, ax, lr, li, T);
    put(lid, f);
    // The screen's face shows once the lid's back turns away from the viewer.
    const face = (ring) => (f.end === 0 ? poly(ring.map((q) => P(...at(ax, q.u, q.v, 0)))) : "");
    screen.setAttribute("d", face(SCREEN));
    ear.setAttribute("d", face(EAR));
    const foot = dot(ax[2], VIEW) > 0;
    if (foot !== ahead) {
      ahead = foot;
      if (foot) g.append(lid.g); else g.prepend(lid.g);
    }
  }

  const sp = spring(REST);
  let drawn = NaN;
  const Bk = register(stage, (dt) => {
    const moving = stepS(sp, dt), th = clamp(sp.x, 0, STOP);
    if (th !== drawn) { drawn = th; drawLid(th); }
    return moving;
  });
  bag.add(Bk.unregister);

  // Screen x of the hinge axis, and of the free edge when shut: the free edge's x is linear in cos(angle).
  const hx = P(W / 2, -R, 0)[0], ex = P(W / 2, L, 0)[0];
  let travel = value, px = null;
  function aim() {
    const held = px !== null;
    const th = held ? (Math.acos(clamp((px - hx) / (ex - hx), Math.cos(rad(travel)), 1)) * 180) / Math.PI : REST;
    sp.t = th;
    const shown = Math.round(th / 5) * 5;
    read.textContent = !held ? "rest" : shown === 0 ? "shut" : `open ${shown}°`;
    lid.sil.classList.toggle("hi", held);
    barrel.sil.classList.toggle("hi", !held);
    Bk.wake();
  }
  aim();

  bag.add(pointer(stage, {
    move: (p) => { px = p[0]; aim(); },
    leave: () => { px = null; aim(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { travel = v; aim(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "flip",
  means: "A clamshell phone: its lid swings open and shut on its hinge as the pointer moves across.",
  rules: [3, 6, 8, 9],
  range: [130, 155, 175],
  mount,
});
