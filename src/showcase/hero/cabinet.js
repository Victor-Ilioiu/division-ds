// @ts-nocheck
import { HL } from './hairline-kernel.js'
/**
 * Cabinet: a two-drawer filing cabinet of component folders. Pointing at the
 * closed drawer pulls it out and pushes the other one in; the folder under the
 * pointer then stands up, lifts out, shows a sketch of its component on its
 * face, and a terminal window unfolds from its top edge. The read-out names the
 * component. The slider is the stagger, in ms.
 */
const {
  Cam, fillet, fit, hull, open, poly, proj, rad, ringAt, rings, prism, rrect, run, seg, facing,
  tdone, tset, tval, tween, reducedMotion, disposer, mk, place, pointer, put, solid, register,
} = HL;

const NAMES = [["button", "input", "select", "checkbox", "switch", "slider"], ["dialog", "tabs", "toast", "badge", "data-table", "chart-panel"]];
const N = 6, W = 72, H = 54, G = 11, TW = 20, TH = 6, TABS = [5, 26, 47], TK = 1.4;
const REST = -12, BACK = -22, FWD = 10, LIFT = 34, WIN = 34;
const X0 = -5, X1 = W + 5, L = (N - 1) * G + 26, DZ = 56, WH = 48, WR = 5, WT = 2.2, OUT = L;
const BX0 = X0 - 4, BX1 = X1 + 4, BY0 = -L - 6, BZ = 2 * DZ + 4;
// the Division DS mark, as polygons in its own 24-unit square (y down); the plinth on the lid it floats over
const MARK = [
  [[2, 2], [9, 2], [9, 5], [5, 5], [5, 9], [2, 9]],
  [[22, 2], [22, 9], [19, 9], [19, 5], [15, 5], [15, 2]],
  [[2, 22], [2, 15], [5, 15], [5, 19], [9, 19], [9, 22]],
  [[19, 15], [22, 15], [22, 17.5], [17.5, 22], [15, 22], [15, 19], [16.24, 19], [19, 16.24]],
  [[10, 10], [14, 10], [14, 14], [10, 14]],
];
const PX = (X0 + X1) / 2, PY = -L / 2 - 3, PR = 15, PH = 4, MS = 1.75, MZ = 8, MT = 6, SPIN = 14000;
const zOf = (k) => k * DZ + 3, yOf = (i, s) => s - L + 9 + i * G;

const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** Drawer k pulled out by s: its tray from the cabinet's face to its own front, as [d, class] lists. */
function tray(P, front, k, s) {
  const z0 = zOf(k), y1 = Math.max(s, 0.01);
  const outer = rrect(X0, 0, X1, y1, Math.min(WR, y1 / 2), 6), inner = rrect(X0 + WT, 0, X1 - WT, Math.max(y1 - WT, 0.02), Math.min(WR - WT, y1 / 2), 6);
  const far = s > 3 ? [[poly(hull(ringAt(P, outer, z0).concat(ringAt(P, outer, z0 + WH)))), "sil"], [poly(ringAt(P, inner, z0 + WH)), "nf"]] : [];
  const oT = LR(ringAt(P, run(outer, front), z0 + WH)), oB = LR(ringAt(P, run(outer, front), z0));
  const iF = LR(ringAt(P, run(inner, front), z0 + WH));
  const face = (u0, v0, u1, v1, r) => poly(rrect(u0, v0, u1, v1, r, 5).map((q) => P(q.u, y1, q.v)));
  const hx = (X0 + X1) / 2;
  const near = [
    [face(X0, z0, X1, z0 + WH, 3), "sil"],
    [face(hx - 11, z0 + WH - 9, hx + 11, z0 + WH - 4, 2.5), "nf"],
    [face(hx - 9.4, z0 + WH - 7.8, hx + 9.4, z0 + WH - 5.2, 1.3), "nf lo"],
  ];
  // the front wall, then its rim: the inner top edge keeps the wall from running into the folders behind it
  if (s > 3) near.unshift([poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"], [open(iF), "nf"], [open(oT), "nf lo"]);
  return { far, near };
}

/** A sketch of each component in the folder's own (u, v) plane, as polylines. */
const box = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1], [u0, v0]];
const SKETCH = {
  button: [box(22, 28, 50, 36)],
  input: [box(10, 28, 62, 36), [[16, 30], [16, 34]]],
  select: [box(10, 28, 62, 36), [[52, 33], [55, 31], [58, 33]]],
  checkbox: [box(30, 26, 40, 36), [[32, 31], [35, 28], [39, 34]]],
  switch: [box(24, 28, 46, 36), box(38, 29.5, 44, 34.5)],
  slider: [[[12, 32], [60, 32]], box(34, 29, 40, 35)],
  dialog: [box(14, 22, 58, 38), [[14, 34], [58, 34]], box(42, 24, 54, 28)],
  tabs: [[[10, 26], [62, 26]], box(10, 26, 26, 33), box(28, 26, 44, 31), box(46, 26, 62, 31)],
  toast: [box(18, 27, 56, 36), box(22, 30, 26, 33)],
  badge: [box(26, 29, 46, 35), [[30, 32], [42, 32]]],
  "data-table": [box(10, 22, 62, 38), [[10, 30], [62, 30]], [[10, 34], [62, 34]], [[28, 22], [28, 38]], [[46, 22], [46, 38]]],
  "chart-panel": [box(14, 22, 20, 30), box(26, 22, 32, 36), box(38, 22, 44, 33), box(50, 22, 56, 38)],
};

function folderShape(i) {
  const t0 = TABS[i % 3];
  return { t0, shape: fillet([[0, 0], [W, 0], [W, H], [t0 + TW, H], [t0 + TW, H + TH], [t0, H + TH], [t0, H], [0, H]], [1, 1, 3, 1.6, 2.2, 2.2, 1.6, 3]) };
}

function pose(P, f, s, th, lift, o) {
  // leaning back, a folder near the drawer's back stops at the back wall instead of passing through it
  th = Math.max(th, -Math.asin(Math.min(1, (9 + f.i * G - WT - TK) / (H + TH))) * 180 / Math.PI);
  const yb = yOf(f.i, s), zb = zOf(f.k), sn = Math.sin(rad(th)), c = Math.cos(rad(th));
  const w = (u, v) => P(u, yb + v * sn, zb + v * c + lift);
  const wb = (u, v) => P(u, yb + v * sn - TK * c, zb + v * c + TK * sn + lift);
  const q = {
    back: poly(f.shape.map((p) => wb(p[0], p[1]))), face: poly(f.shape.map((p) => w(p[0], p[1]))),
    rules: [10, 16, 22].map((v) => seg(w(8, v), w(W - 8 - (v === 22 ? 20 : 0), v))).join(""),
    sketch: "",
    punch: [0, 1, 2].map((k) => w(f.t0 + TW / 2 + (k - 1) * 4, H + TH / 2)), win: "", bar: "", code: "",
  };
  if (o > 0.02) {
    const v0 = H - 16, v1 = v0 + (WIN + TH + 20) * o, top = v1 - 6;
    q.win = poly(fillet([[2, v0], [W - 2, v0], [W - 2, v1], [2, v1]], [2, 2, 3, 3]).map((p) => w(p[0], p[1])));
    q.bar = top > H + TH ? seg(w(2, top), w(W - 2, top)) : "";
    // the component is printed on the file, so it rises with it; the folder's face, painted after, hides what is still inside
    q.sketch = SKETCH[f.name].map((l) => open(l.map((p) => w(p[0], p[1] + top - 48)))).join("");
  }
  return q;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const C = Cam(45, 0.5, 1.1);
  const topZ = zOf(1) + H + TH + LIFT + WIN + 6;
  fit(C, [[BX0, BY0, BZ], [BX1, BY0, 0], [X0, OUT, 0], [X1, OUT, 0], [X0, OUT, topZ], [X1, 0, topZ], [BX0, BY0, topZ - 10], [PX, PY, BZ + PH + MZ + 24 * MS + 4]], 200, 150);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const [bring, binner] = rings(BX0, BY0, BX1, 0, 4, 1.6);
  put(solid(g), prism(P, front, bring, binner, 0, BZ));
  // the mark on the cabinet's right side (x = BX1), centred, reading left to right toward the back
  const mark = (u, v) => P(BX1, BY0 / 2 - 15 + u * 1.25, BZ - 22 - v * 1.25);
  for (const m of MARK) mk("path", { d: poly(m.map(([u, v]) => mark(u, v))), class: "mark" }, g);
  // the plinth: a low disc in the middle of the lid
  put(solid(g), prism(P, front, ...rings(PX - PR, PY - PR, PX + PR, PY + PR, PR, 1.4), BZ, BZ + PH));
  // the mark floating over it: a solid, MT thick, turning once every SPIN ms about the vertical axis.
  // Painted far face, then the walls that face the camera far to near, then the near face.
  const mz0 = BZ + PH + MZ + 24 * MS, VIEW = [0.612, 0.612, 0.5];
  const markG = mk("g", { class: "spin" }, g);
  const edges = MARK.flatMap((m) => m.map((p, j) => [p, m[(j + 1) % m.length]]));
  const pool = Array.from({ length: MARK.length * 2 + edges.length }, () => mk("path", {}, markG));
  let lastSpin = "";
  function drawMark(a) {
    const key = a.toFixed(3);
    if (key === lastSpin) return;
    lastSpin = key;
    const f = a - Math.PI / 4, U = [Math.cos(f), Math.sin(f)], Nn = [-Math.sin(f), Math.cos(f)];
    const w = (u, v, d) => [PX + (u - 12) * MS * U[0] + d * Nn[0], PY + (u - 12) * MS * U[1] + d * Nn[1], mz0 - v * MS];
    const near = Nn[0] + Nn[1] > 0 ? MT / 2 : -MT / 2;
    const depth = (q) => q.reduce((t, [x, y, z]) => t + (x + y) * VIEW[0] + z * VIEW[2], 0) / q.length;
    const walls = [];
    for (const [[u, v], [u2, v2]] of edges) {
      const nu = v2 - v, nv = -(u2 - u), nx = nu * U[0], ny = nu * U[1], nz = -nv;
      if (nx * VIEW[0] + ny * VIEW[1] + nz * VIEW[2] <= 0) continue;
      walls.push([w(u, v, near), w(u2, v2, near), w(u2, v2, -near), w(u, v, -near)]);
    }
    walls.sort((A, B) => depth(A) - depth(B));
    const paint = [
      ...MARK.map((m) => [m.map(([u, v]) => w(u, v, -near)), "hi"]),
      ...walls.map((q) => [q, "hi"]),
      ...MARK.map((m) => [m.map(([u, v]) => w(u, v, near)), "hi"]),
    ];
    pool.forEach((el, k) => {
      const it = paint[k];
      el.setAttribute("d", it ? poly(it[0].map(([x, y, z]) => P(x, y, z))) : "");
      if (it) el.setAttribute("class", it[1]);
    });
  }
  drawMark(0);

  const drawers = [0, 1].map((k) => {
    const grp = mk("g", {}, g), farG = mk("g", {}, grp), foldG = mk("g", {}, grp), nearG = mk("g", {}, grp);
    const folders = NAMES[k].map((name, i) => {
      const fg = mk("g", {}, foldG), el = {};
      for (const [key, cls] of [["win", "sil"], ["bar", "nf lo"], ["code", "nf"], ["sketch", "nf"], ["back", "lo"], ["face", "sil"], ["rules", "nf lo"]]) el[key] = mk("path", { class: cls }, fg);
      el.punch = [0, 1, 2].map((j) => mk("circle", { r: 1.05, class: "dot " + (j === i % 3 ? "m" : "off") }, fg));
      return { k, i, name, ...folderShape(i), el, a: tween(REST), z: tween(0), o: tween(0), last: "" };
    });
    return { k, grp, farG, foldG, nearG, folders, s: tween(k === 0 ? OUT : 0), last: -1 };
  });
  // the open drawer paints last, so its folders cover the closed drawer's face (re-sorted each frame below)
  let open1 = 0;
  g.appendChild(drawers[0].grp);

  function drawTray(d, s) {
    if (Math.abs(s - d.last) < 0.01) return;
    d.last = s;
    const t = tray(P, front, d.k, s);
    d.farG.replaceChildren(); d.nearG.replaceChildren();
    for (const [dd, cls] of t.far) mk("path", { d: dd, class: cls }, d.farG);
    for (const [dd, cls] of t.near) mk("path", { d: dd, class: cls }, d.nearG);
  }
  function drawFolder(f, s, now) {
    const th = tval(f.a, now), z = tval(f.z, now), o = tval(f.o, now), seen = yOf(f.i, s) >= 0.5;
    const key = seen ? [s, th, z, o].map((n) => n.toFixed(2)).join() : "x";
    if (key === f.last) return;
    f.last = key;
    const q = seen ? pose(P, f, s, th, z, o) : null;
    for (const k of ["back", "face", "rules", "sketch", "win", "bar", "code"]) f.el[k].setAttribute("d", q ? q[k] : "");
    f.el.punch.forEach((el, j) => { if (q) place(el, q.punch[j]); el.setAttribute("r", q ? 1.05 : 0); });
  }
  let inFront = 0;
  const B = register(stage, (_dt, now) => {
    let moving = false;
    // whichever drawer is pulled further out is nearer the viewer and paints last, so the one
    // still closing covers the one opening until the opening one passes it
    const [s0, s1] = drawers.map((d) => tval(d.s, now)), near = s1 >= s0 ? 1 : 0;
    if (near !== inFront) { inFront = near; g.appendChild(drawers[near].grp); }
    for (const d of drawers) {
      const s = tval(d.s, now);
      drawTray(d, s);
      d.folders.forEach((f) => { drawFolder(f, s, now); if (!tdone(f.a, now) || !tdone(f.z, now) || !tdone(f.o, now)) moving = true; });
      if (!tdone(d.s, now)) moving = true;
    }
    if (reducedMotion()) return moving;
    drawMark(((now % SPIN) / SPIN) * Math.PI * 2);
    return true;
  });
  bag.add(B.unregister);

  // Hit areas from the rest and target poses only: each drawer's closed face, and the open drawer's resting folder tops.
  const faceQuad = (k) => [[X0, zOf(k)], [X1, zOf(k)], [X1, zOf(k) + WH], [X0, zOf(k) + WH]].map(([u, v]) => P(u, 0, v));
  const side = (p, a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const inQuad = (p, q) => { const s = q.map((a, j) => side(p, a, q[(j + 1) % 4])); return s.every((v) => v >= 0) || s.every((v) => v <= 0); };
  const topOf = (k, i) => P(W / 2, yOf(i, OUT) + H * Math.sin(rad(REST)), zOf(k) + H * Math.cos(rad(REST)));
  function hitFolder(k, [x, y]) {
    let best = -1, bd = 26;
    for (let i = 0; i < N; i++) { const t = topOf(k, i), dd = Math.hypot((x - t[0]) * 0.6, y - t[1]); if (dd < bd) { bd = dd; best = i; } }
    return best;
  }

  let act = -1;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act, fs = drawers[open1].folders;
    act = a;
    fs.forEach((f, i) => {
      const delay = Math.abs(i - from) * stag;
      tset(f.a, a < 0 ? REST : i < a ? BACK : i > a ? FWD : 0, now, delay);
      tset(f.z, a === i ? LIFT : 0, now, delay);
      tset(f.o, a === i ? 1 : 0, now, a === i ? delay + 240 : 0);
      f.el.face.classList.toggle("hi", i === a); f.el.win.classList.toggle("hi", i === a);
    });
    read.textContent = a < 0 ? "rest" : fs[a].name;
    B.wake();
  }
  function setDrawer(k) {
    if (k === open1) return;
    const now = performance.now();
    setActive(-1);
    tset(drawers[open1].s, 0, now, 0);
    tset(drawers[k].s, OUT, now, 650);
    open1 = k;
    read.textContent = "drawer " + (k + 1);
    B.wake();
  }
  function move(p) {
    if (inQuad(p, faceQuad(1 - open1))) return setDrawer(1 - open1);
    if (!tdone(drawers[open1].s, performance.now())) return;
    setActive(hitFolder(open1, p));
  }

  bag.add(pointer(stage, { move, leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  B.wake();

  // Where a page's unseen pointer should go for each component: its drawer's face, then its folder's top.
  const mid = (q) => [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2];
  const stops = {};
  NAMES.forEach((row, k) => row.forEach((name, i) => { stops[name] = { drawer: k, face: mid(faceQuad(k)), top: topOf(k, i) }; }));
  return { set: (v) => { stag = v; }, destroy: bag.dispose, stops };
}

export const cabinet = ({
  name: "cabinet",
  means: "A two-drawer cabinet of component folders: point at a drawer to open it, at a folder to lift it and show its component.",
  rules: [1, 2, 8, 10],
  range: [0, 40, 90],
  tour: [[200, 120], [240, 110], [150, 250], [180, 150], null],
  mount,
});
