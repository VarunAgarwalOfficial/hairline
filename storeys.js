/**
 * Storeys: two windowed floors, a front door and step, and a pitched roof.
 * Pointer height scrubs the separation; fixed rest silhouettes pick the floor.
 * One spring opens the stack, with twice the travel at the roof.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, mk, open, pointer, poly, prism, proj,
  put, register, ringAt, rings, rrect, seg, solid, spring, stepS, disposer,
} = HL;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value, over = null, active = -1;
  const gap = spring(0);
  const C = Cam(45, 0.5, 1.82);
  const roofSection = fillet(
    [[-45, 0], [45, 0], [45, 3], [0, 24], [-45, 3]],
    [1.5, 1.5, 1.5, 2, 1.5],
  );
  const roofPoints = (z) => [-40, 40].flatMap((y) => roofSection.map(([x, h]) => [x, y, z + h]));
  fit(C, [
    [-44, -39, 0], [44, -39, 0], [-44, 39, 0], [44, 39, 0],
    [-13, 47, 3], [8, 47, 3], ...roofPoints(64 + 36),
    [12, -16, 132], [22, -6, 132],
  ], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const base = rings(-44, -39, 44, 39, 4, 1.5);
  put(solid(g), prism(P, front, ...base, 0, 3));

  const floors = [
    { z: 3, h: 26, name: "ground" },
    { z: 33, h: 25, name: "upstairs" },
  ].map((floor) => {
    const group = mk("g", {}, g);
    return { ...floor, group, body: solid(group), marks: mk("path", { class: "nf" }, group), detail: mk("path", { class: "nf lo" }, group) };
  });
  const step = solid(floors[0].group);
  put(step, prism(P, front, ...rings(-13, 34, 8, 47, 2, 0.8), 3, 5));
  const roof = solid(g);
  const chimney = solid(g), chimneyCap = solid(g);
  const bodyRings = rings(-39, -34, 39, 34, 2.5, 1.2);

  function windowPaths(map, u, z) {
    return {
      frame: poly(rrect(u, z, u + 14, z + 13, 1.3, 5).map((q) => map(q.u, q.v))),
      panes: seg(map(u + 7, z + 1.5), map(u + 7, z + 11.5))
        + seg(map(u + 1.5, z + 5), map(u + 12.5, z + 5)),
    };
  }

  function drawFloor(floor, lift) {
    const z = floor.z + lift;
    put(floor.body, prism(P, front, ...bodyRings, z, z + floor.h));
    const facade = (x, h) => P(x, 34, h), side = (y, h) => P(39, y, h);
    const windows = floor.name === "ground"
      ? [windowPaths(facade, 13, z + 8)]
      : [windowPaths(facade, -28, z + 7), windowPaths(facade, 9, z + 7)];
    windows.push(windowPaths(side, -24, z + 7), windowPaths(side, 8, z + 7));
    let frame = windows.map((w) => w.frame).join("");
    let detail = windows.map((w) => w.panes).join("");
    if (floor.name === "ground") {
      frame += poly(rrect(-10, z + 2, 4, z + 22, 1.4, 5).map((q) => facade(q.u, q.v)));
      detail += seg(facade(0.5, z + 11), facade(1.7, z + 11));
    }
    floor.marks.setAttribute("d", frame);
    floor.detail.setAttribute("d", detail);
  }

  function drawRoof(lift) {
    const z = 64 + lift;
    const outline = hull(roofPoints(z).map((p) => P(...p)));
    const crease = open(roofSection.filter((p) => p[1] > 1.7).map(([x, h]) => P(x * 0.95, 39, z + h - 1)));
    put(roof, {
      sil: poly(fillet(outline, outline.map(() => 1.3))),
      crease: crease + seg(P(0, -38, z + 23), P(0, 38, z + 23)),
    });
    put(chimney, prism(P, front, ...rings(12, -16, 22, -6, 1.2, 0.7), z + 15, z + 30));
    put(chimneyCap, prism(P, front, ...rings(10.5, -17.5, 23.5, -4.5, 1.5, 0.7), z + 30, z + 32));
  }

  // All picking uses the closed house, not the moving stack.
  const restBounds = hull([
    ...ringAt(P, bodyRings[0], 3), ...ringAt(P, bodyRings[0], 58),
    ...roofPoints(64).map((p) => P(...p)),
  ]);
  const bottom = P(0, 34, 3)[1], top = P(0, 0, 88)[1];
  const levels = [P(0, 18, 17)[1], P(0, 18, 46)[1], P(0, 0, 78)[1]];

  function inside([x, y]) {
    let positive = false, negative = false;
    restBounds.forEach((a, i) => {
      const b = restBounds[(i + 1) % restBounds.length];
      const cross = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
      if (cross > 0) positive = true;
      if (cross < 0) negative = true;
    });
    return !(positive && negative);
  }

  function retarget() {
    gap.t = over ? clamp((bottom - over[1]) / (bottom - top), 0, 1) * reach : 0;
    const next = over ? levels.reduce((best, y, i) => Math.abs(y - over[1]) < Math.abs(levels[best] - over[1]) ? i : best, 0) : -1;
    if (next !== active) {
      active = next;
      floors.forEach((floor, i) => floor.body.sil.classList.toggle("hi", active === i));
      roof.sil.classList.toggle("hi", active === 2 || active === -1);
    }
    read.textContent = active < 0 ? "rest" : active === 2 ? "roof" : floors[active].name;
    B.wake();
  }

  let drawn = NaN;
  const B = register(stage, (dt) => {
    const moving = stepS(gap, dt);
    const lift = clamp(gap.x, 0, 18);
    if (lift !== drawn) {
      if (Number.isNaN(drawn)) drawFloor(floors[0], 0);
      drawn = lift;
      drawFloor(floors[1], lift);
      drawRoof(lift * 2);
    }
    return moving;
  });
  bag.add(B.unregister);
  bag.add(pointer(stage, {
    move: (p) => { over = inside(p) ? p : null; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  roof.sil.classList.add("hi");
  read.textContent = "rest";
  B.wake();

  return {
    set: (v) => { reach = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "storeys",
  means: "A two-storey house opens into layers as the pointer moves upward, then settles back under its gabled roof.",
  rules: [1, 3, 5, 8, 9],
  range: [7, 12, 18],
  mount,
});
