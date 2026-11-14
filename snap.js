/** Snap: a flip phone, partly open at rest, unfolding when the pointer enters.
 * The screen, earpiece, hinge and twelve keys carry its identity without labels.
 * A fixed hit envelope covers both poses; the slider sets the opening angle.
 */
const {
  Cam, clamp, facing, fit, hull, mk, open, pointer, poly, prism, proj,
  put, rad, rings, ringAt, run, solid, tdone, tset, tval, tween, unproj,
  disposer, register,
} = HL;

const REST = 75, WIDTH = 64, LENGTH = 92, HINGE = 11;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value, active = false, hovered = false, selected = -1, drawn = null;
  const readNode = stage.parentElement.querySelector("#read");
  stage.setAttribute("role", "group");
  svg.removeAttribute("aria-hidden");
  readNode.setAttribute("aria-live", "polite");
  bag.add(() => {
    stage.setAttribute("role", "img"); svg.setAttribute("aria-hidden", "true");
    readNode.removeAttribute("aria-live");
  });
  const angle = tween(REST);
  const C = Cam(45, 0.5, 1.9);
  const bodyRings = rings(-WIDTH / 2, 0, WIDTH / 2, LENGTH, 8, 1.6);
  const lidRings = rings(-WIDTH / 2, 0, WIDTH / 2, 90, 8, 1.6);

  function world(u, v, thickness, degrees) {
    const a = rad(degrees), c = Math.cos(a), s = Math.sin(a);
    return [u, v * c - thickness * s, HINGE + v * s + thickness * c];
  }

  const bounds = [];
  for (const degrees of [REST, 90, 125, 145, 165]) {
    for (const q of lidRings[0]) {
      bounds.push(world(q.u, q.v, 0, degrees), world(q.u, q.v, 5, degrees));
    }
  }
  for (const q of bodyRings[0]) bounds.push([q.u, q.v, 0], [q.u, q.v, 10]);
  fit(C, bounds, 200, 166);
  const P = proj(C), front = facing(C);
  const root = mk("g", {}, svg);

  const body = solid(root);
  put(body, prism(P, front, ...bodyRings, 0, 8));

  // Real controls only: a navigation key, two soft keys and a twelve-key pad.
  const controls = [[-23, 17, -14, 23, 2, "left"], [-6, 14, 6, 26, 3, "menu"], [14, 17, 23, 23, 2, "right"]];
  const labels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const x = (col - 1) * 17, y = 36 + row * 12;
      controls.push([x - 6.5, y, x + 6.5, y + 8, 2.5, "key " + labels[row * 3 + col]]);
    }
  }
  const keys = controls.map(([x0, y0, x1, y1, radius, label], index) => {
    const shape = solid(root), footprint = rings(x0, y0, x1, y1, radius, 0.65);
    shape.g.setAttribute("role", "button");
    shape.g.setAttribute("tabindex", "0");
    shape.g.setAttribute("aria-label", label);
    shape.g.setAttribute("aria-pressed", "false");
    const on = (type, handler) => {
      shape.g.addEventListener(type, handler);
      bag.add(() => shape.g.removeEventListener(type, handler));
    };
    on("focus", () => setActive(true));
    on("blur", () => { if (!hovered) setActive(false); });
    on("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!event.repeat) { setActive(true); pressKey(index); }
    });
    return { shape, footprint, x0, y0, x1, y1, label, depth: tween(9.5), drawn: null };
  });

  const hinge = solid(root);
  put(hinge, prism(P, front, ...rings(-29, -3, 29, 5, 3.5, 1), 6, 13));
  hinge.sil.classList.add("hi");
  const lid = solid(root);
  const screen = mk("path", { class: "nf" }, lid.g);
  const screenInset = mk("path", { class: "nf lo" }, lid.g);
  const speaker = mk("path", { class: "nf lo" }, lid.g);
  const screenRing = rings(-24, 20, 24, 72, 4, 1.5);
  const speakerRing = rings(-10, 79, 10, 82, 1.5, 0.5)[0];

  function draw(degrees) {
    if (degrees === drawn) return;
    drawn = degrees;
    const a = rad(degrees), c = Math.cos(a), s = Math.sin(a);
    const Q = (u, v, thickness) => P(...world(u, v, thickness, degrees));
    const lidFront = (q) => q.nu * Math.SQRT1_2 + q.nv * (c * Math.SQRT1_2 + s / Math.sqrt(3)) > 0;
    // The inner face faces the viewer; the shell thickness lies behind it.
    put(lid, {
      sil: poly(hull(ringAt(Q, lidRings[0], 0).concat(ringAt(Q, lidRings[0], 5)))),
      crease: open(ringAt(Q, run(lidRings[1], lidFront), 0)),
    });
    screen.setAttribute("d", poly(ringAt(Q, screenRing[0], -0.05)));
    screenInset.setAttribute("d", poly(ringAt(Q, screenRing[1], -0.05)));
    speaker.setAttribute("d", poly(ringAt(Q, speakerRing, -0.05)));
  }

  // Hit the static envelope, not the moving shell or the SVG's bounds.
  const hitRing = hull(bounds.map((q) => P(...q)));
  function hit([x, y]) {
    let inside = false;
    for (let i = 0, j = hitRing.length - 1; i < hitRing.length; j = i++) {
      const a = hitRing[i], b = hitRing[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }

  const loop = register(stage, (_dt, now) => {
    draw(tval(angle, now));
    let moving = !tdone(angle, now);
    for (const key of keys) {
      const height = tval(key.depth, now);
      if (height !== key.drawn) {
        put(key.shape, prism(P, front, ...key.footprint, 8, height));
        key.drawn = height;
      }
      if (!tdone(key.depth, now)) moving = true;
    }
    return moving;
  });
  bag.add(loop.unregister);

  function setActive(next) {
    if (next === active) return;
    active = next;
    tset(angle, active ? reach : REST, performance.now(), 0);
    if (!active) pressKey(-1);
    updateAccent();
    loop.wake();
  }

  function updateAccent() {
    hinge.sil.classList.toggle("hi", !active);
    lid.sil.classList.toggle("hi", active && selected < 0);
    keys.forEach((key, index) => key.shape.sil.classList.toggle("hi", index === selected));
    read.textContent = selected >= 0 ? keys[selected].label : active ? "open" : "rest";
  }

  function pressKey(index) {
    selected = index;
    const now = performance.now();
    keys.forEach((key, i) => {
      tset(key.depth, i === index ? 8.3 : 9.5, now, 0);
      key.shape.g.setAttribute("aria-pressed", String(i === index));
    });
    updateAccent();
    loop.wake();
  }

  bag.add(pointer(stage, {
    move(point) { hovered = hit(point); setActive(hovered); },
    down(point) {
      const [x, y] = unproj(C, ...point, 9.5);
      const index = keys.findIndex((key) => x >= key.x0 && x <= key.x1 && y >= key.y0 && y <= key.y1);
      if (index >= 0) { setActive(true); pressKey(index); }
    },
    leave() { hovered = false; setActive(false); },
  }));
  bag.add(() => svg.replaceChildren());
  read.textContent = "rest";
  draw(REST);

  return {
    set(v) {
      reach = clamp(v, 125, 165);
      if (active) {
        tset(angle, reach, performance.now(), 0);
        loop.wake();
      }
    },
    destroy: bag.dispose,
  };
}

hairline({
  name: "snap",
  means: "Hover to open the flip phone. Click a button to press it, or focus it and use Enter or Space. Leave to fold back.",
  rules: [1, 3, 5, 8, 9, 10],
  range: [125, 145, 165],
  mount,
});
