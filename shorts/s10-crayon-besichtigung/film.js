// s10 „Nachmieter gesucht!“ — Crayon World 3D (style + engine by 2nd1st / lemo-opuscar, MIT; see CREDITS).
// First person, 1080x1920: we are someone looking for a flat. Walking down a crayon lane (bakery with a pretzel sign, lollipop
// trees, bicycles, a stop sign) toward the white house at its end; a paper ad hangs in its window. We stop and read it, the door
// opens, we walk into the furnished room (bed, table, wardrobe; a calendar, a clock) and, at „die Vermieterin ist auch da“,
// turn to the doorway of the second room: the landlady (apple head, tube limbs) waves.
// 3D only computes shapes (engine/npr.js); every drawing is made fresh by engine/crayon.js, 12 times a second.
import * as THREE from 'three';
import { makeComp } from './engine/gl.js';
import * as C from './engine/crayon.js';
import { makeNPR, snap, shapes, silhouette, region, mesh, REG, REGM, RW, RH } from './engine/npr.js';
import { clamp, lerp, seg, eio, hash } from './engine/lib.js';

const W = 1080, H = 1920;
export const DUR = 17.3;   // voice: episode 2, 116.30–133.60 s

// The crayon box (the demo's village box + one story colour: the apple red of her head, used nowhere else)
const P = { line: '#2c2f6b', sky: '#8cc3e8', white: '#ffffff', grass: '#6cb24a', olive: '#8a8f3a', lemon: '#f2d43a', caramel: '#d9932f', earth: '#8a5a35', brick: '#c8452f', rose: '#ec8a9a', cream: '#f4c49a', plum: '#8a4f8c', apple: '#dc2f26' };
const PAPER = [0.957, 0.937, 0.890];

const R = {
  sky: region({ col: P.sky, p: .5, ang: .12, gap: 14, w: 14, ow: 0, cross: 1 }),
  road: region({ col: P.caramel, p: .34, ang: .06, gap: 14, w: 13, ow: 0 }),
  walk: region({ col: P.cream, p: .55, ang: -.1, gap: 12, w: 13, ow: 6 }),
  walk2: region({ col: P.cream, p: .55, ang: .15, gap: 12, w: 13, ow: 6 }),
  wallW: region({ col: P.white, p: 0, nofill: 1, ow: 8 }),
  wallL: region({ col: P.lemon, p: .5, ang: 1.45, gap: 11, w: 12, ow: 8, shade: 1 }),
  wallR: region({ col: P.rose, p: .45, ang: 1.4, gap: 11, w: 12, ow: 8, shade: 1 }),
  wallS: region({ col: P.sky, p: .42, ang: 1.5, gap: 11, w: 12, ow: 8, shade: 1 }),
  wallC: region({ col: P.cream, p: .55, ang: 1.35, gap: 11, w: 12, ow: 8, shade: 1 }),
  roof: region({ col: P.brick, p: .78, ang: .55, gap: 9, w: 11, ow: 8, shade: 1 }),
  roof2: region({ col: P.brick, p: .78, ang: -.5, gap: 9, w: 11, ow: 8, shade: 1 }),
  win: region({ col: P.sky, p: .75, ang: .8, gap: 8, w: 10, ow: 7 }),
  door: region({ col: P.earth, p: .85, ang: 1.5, gap: 8, w: 10, ow: 7 }),
  shop: region({ col: P.sky, p: .62, ang: .5, gap: 9, w: 11, ow: 7 }),
  awning: region({ col: P.brick, p: .9, ang: 1.5, gap: 7, w: 9, ow: 7 }),
  pretzel: region({ col: P.caramel, p: .95, ang: .7, gap: 6, w: 8, ow: 7, shade: 1 }),
  iron: region({ col: P.line, p: .9, ang: 0, gap: 4, w: 5, ow: 3 }),
  trunk: region({ col: P.earth, p: .9, ang: 1.5, gap: 8, w: 10, ow: 7 }),
  crown: region({ col: P.grass, p: .8, ang: .9, gap: 10, w: 12, ow: 8, shade: 1 }),
  crown2: region({ col: P.olive, p: .8, ang: .7, gap: 10, w: 12, ow: 8, shade: 1 }),
  bike: region({ col: P.rose, p: .95, ang: .4, gap: 5, w: 7, ow: 4 }),
  bike2: region({ col: P.sky, p: .95, ang: .4, gap: 5, w: 7, ow: 4 }),
  sign: region({ col: P.grass, p: .95, ang: .6, gap: 6, w: 8, ow: 6 }),
  box: region({ col: P.earth, p: .8, ang: .2, gap: 7, w: 9, ow: 6 }),
  bloom: region({ col: P.rose, p: .95, ang: .5, gap: 5, w: 7, ow: 5 }),
  ad: region({ col: P.white, p: 0, nofill: 1, ow: 6 }),
  glass: region({ col: P.sky, p: .7, ang: .8, gap: 8, w: 10, ow: 7 }),
  // inside
  floor: region({ col: P.caramel, p: .46, ang: .03, gap: 12, w: 13, ow: 0 }),
  wA: region({ col: P.white, p: 0, nofill: 1, ow: 7 }),
  wB: region({ col: P.white, p: 0, nofill: 1, ow: 7 }),
  wC: region({ col: P.white, p: 0, nofill: 1, ow: 7 }),
  ceil: region({ col: P.white, p: 0, nofill: 1, ow: 7 }),
  room2: region({ col: P.rose, p: .34, ang: 1.4, gap: 12, w: 13, ow: 7 }),
  bed: region({ col: P.earth, p: .85, ang: .2, gap: 8, w: 10, ow: 7, shade: 1 }),
  head: region({ col: P.earth, p: .85, ang: 1.4, gap: 8, w: 10, ow: 7 }),
  blanket: region({ col: P.rose, p: .85, ang: .6, gap: 8, w: 10, ow: 7, shade: 1 }),
  pillow: region({ col: P.white, p: 0, nofill: 1, ow: 6 }),
  wardA: region({ col: P.plum, p: .8, ang: 1.45, gap: 8, w: 10, ow: 7, shade: 1 }),
  wardB: region({ col: P.plum, p: .8, ang: 1.25, gap: 8, w: 10, ow: 7, shade: 1 }),
  wtop: region({ col: P.earth, p: .9, ang: .1, gap: 6, w: 8, ow: 6 }),
  table: region({ col: P.caramel, p: .9, ang: .3, gap: 7, w: 9, ow: 7, shade: 1 }),
  chair: region({ col: P.earth, p: .85, ang: .9, gap: 7, w: 9, ow: 6 }),
  rug: region({ col: P.sky, p: .45, ang: -.3, gap: 10, w: 12, ow: 6 }),
  curtain: region({ col: P.lemon, p: .85, ang: 1.5, gap: 7, w: 9, ow: 6 }),
  lamp: region({ col: P.lemon, p: .9, ang: .5, gap: 6, w: 8, ow: 7, shade: 1 }),
  cal: region({ col: P.white, p: 0, nofill: 1, ow: 6 }),
  clock: region({ col: P.white, p: 0, nofill: 1, ow: 7 }),
  vase: region({ col: P.sky, p: .9, ang: 1.2, gap: 5, w: 7, ow: 5 }),
  pic: region({ col: P.cream, p: .7, ang: .4, gap: 6, w: 8, ow: 6 }),
  // her (characters group)
  apple: region({ col: P.apple, p: .95, ang: .65, gap: 7, w: 10, ow: 9, grp: 'ch', shade: 1 }),
  stem: region({ col: P.earth, p: .95, ang: 1.4, gap: 4, w: 6, ow: 5, grp: 'ch' }),
  leaf: region({ col: P.grass, p: .95, ang: .8, gap: 5, w: 7, ow: 5, grp: 'ch' }),
  cardi: region({ col: P.caramel, p: .9, ang: .4, gap: 7, w: 9, ow: 9, grp: 'ch', shade: 1 }),
  dress: region({ col: P.sky, p: .85, ang: -.5, gap: 7, w: 9, ow: 9, grp: 'ch', shade: 1 }),
  apron: region({ col: P.white, p: 0, nofill: 1, ow: 7, grp: 'ch' }),
  limb: region({ col: P.brick, p: .9, ang: 1.3, gap: 5, w: 7, ow: 7, grp: 'ch' }),
  shoe: region({ col: P.earth, p: .95, ang: .3, gap: 5, w: 7, ow: 7, grp: 'ch' }),
};

let comp, N, scene, cam, LY, B = {};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (a, b, h, n = 18) => new THREE.CylinderGeometry(a, b, h, n);
const sph = (r) => new THREE.SphereGeometry(r, 24, 16);
const put = (m, x, y, z, parent = scene) => { m.position.set(x, y, z); parent.add(m); return m; };
const grp = (x, y, z, parent = scene) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const tri = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0); return s; };

// A child's house with its gable to the lane: local front at z = 0 facing +z, body behind it
function gableTop(g, w, d, h, hr, wallReg, roofReg) {
  put(mesh(new THREE.ExtrudeGeometry(tri(w + .5, hr), { depth: d + .4, bevelEnabled: false }), roofReg), 0, h, -d - .2, g);
  put(mesh(new THREE.ShapeGeometry(tri(w - .35, hr - .45)), wallReg), 0, h, .205, g);
  put(mesh(box(.6, .7, .06), R.win), 0, h + hr * .32, .23, g);
}
function house(x, z, ry, { w = 4.6, d = 6, h = 5.6, hr = 2.8, wall = R.wallL, roof = R.roof, door = -1, shop = false } = {}) {
  const g = grp(x, 0, z); g.rotation.y = ry;
  put(mesh(box(w, h, d), wall), 0, h / 2, -d / 2, g);
  gableTop(g, w, d, h, hr, wall, roof);
  const n = Math.max(2, Math.floor(w / 1.5));
  for (let i = 0; i < n; i++) {
    const u = (i + .5) / n * w - w / 2;
    for (const y of [2.7 + .8, h > 6 ? 5.2 : -1]) if (y > 0) put(mesh(box(.75, 1.0, .06), R.win), u, y, .03, g);
    if (!shop && i !== (door < 0 ? 0 : door)) put(mesh(box(.75, 1.0, .06), R.win), u, 1.4, .03, g);
  }
  if (!shop) put(mesh(box(.9, 2.0, .06), R.door), (.5 / n) * w - w / 2 + (door < 0 ? 0 : door * w / n), 1.0, .03, g);
  return g;
}

// The pretzel sign of the bakery: a tube along a pretzel curve, hanging from an iron bracket, its plane across the lane's length
function pretzel(parent) {
  const pts = [[-.36, -.28], [-.14, -.04], [.14, .22], [.33, .33], [.43, .14], [.32, -.2], [0, -.36], [-.32, -.2], [-.43, .14], [-.33, .33], [-.14, .22], [.14, -.04], [.36, -.28]]
    .map(([u, v]) => new THREE.Vector3(0, v * .75, u * .75));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .5);
  return put(mesh(new THREE.TubeGeometry(curve, 90, .06, 8, false), R.pretzel), 0, 0, 0, parent);
}
function tree(x, z, s = 1, reg = R.crown) {
  put(mesh(cyl(.08 * s, .11 * s, 2.2 * s, 10), R.trunk), x, 1.1 * s, z);
  put(mesh(sph(.85 * s), reg), x, 2.75 * s, z);
}
function bike(x, z, reg, parent = scene) {   // parallel to the lane (along z), leaning on the wall
  const g = grp(x, 0, z, parent); g.rotation.z = -.08;
  for (const s of [-1, 1]) { const wh = put(mesh(new THREE.TorusGeometry(.32, .028, 6, 32), R.iron), 0, .33, s * .52, g); wh.rotation.y = Math.PI / 2; }
  const bar = (a, b, r = .028) => { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), m = mesh(cyl(r, r, A.distanceTo(Bv), 6), reg); m.position.copy(A).add(Bv).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize()); g.add(m); };
  bar([0, .33, -.52], [0, .36, 0]); bar([0, .36, 0], [0, .82, -.1]); bar([0, .82, -.1], [0, .8, .38]); bar([0, .36, 0], [0, .8, .38]); bar([0, .8, .38], [0, .33, .52]); bar([0, .8, .38], [0, 1.0, .42]);
  put(mesh(box(.12, .05, .26), R.box), 0, .88, -.12, g);
  put(mesh(box(.5, .03, .03), R.iron), 0, 1.0, .42, g);
}

// The house at the end of the lane: white (paper) front with a door, the window with the ad, a flower box; the furnished flat behind
const FZ = -14, DX0 = -1.45, DX1 = -.35, WX0 = .25, WX1 = 1.85, WY0 = .7, WY1 = 2.35;
const AD = { x: 1.05, y: 1.52, z: FZ - .12, w: 1.18, h: 1.36 };
function target() {
  const fw = 7.4, fh = 6.2, t = .3, zc = FZ - t / 2;
  const piece = (x0, x1, y0, y1) => put(mesh(box(x1 - x0, y1 - y0, t), R.wallW), (x0 + x1) / 2, (y0 + y1) / 2, zc);
  piece(-fw / 2, DX0, 0, fh); piece(DX0, DX1, 2.25, fh); piece(DX1, WX0, 0, fh); piece(WX0, WX1, 0, WY0); piece(WX0, WX1, WY1, fh); piece(WX1, fw / 2, 0, fh);
  const g = grp(0, 0, FZ); gableTop(g, fw, 8, fh, 3.2, R.wallW, R.roof2);
  for (const x of [-1.8, .2, 2.2]) put(mesh(box(.8, 1.05, .06), R.win), x, 4.4, FZ + .03);
  put(mesh(box(WX1 - WX0, WY1 - WY0, .04), R.glass), (WX0 + WX1) / 2, (WY0 + WY1) / 2, FZ - .22);
  const ad = put(mesh(box(AD.w, AD.h, .02), R.ad), AD.x, AD.y, AD.z); ad.rotation.z = .025; B.ad = ad;
  put(mesh(box(1.7, .22, .3), R.box), (WX0 + WX1) / 2, .6, FZ + .14);   // a flower box under the window
  for (let i = 0; i < 6; i++) put(mesh(sph(.1), R.bloom), WX0 + .2 + i * .24, .78 + .04 * (i % 2), FZ + .16);
  const dg = B.door = grp(DX0, 0, FZ - .06); put(mesh(box(DX1 - DX0, 2.25, .07), R.door), (DX1 - DX0) / 2, 1.125, 0, dg);
}
function flat() {
  const z0 = FZ - .3, z1 = -19.8, x0 = -3.4, x1 = 3.4, ch = 2.8, DZ0 = -15.4, DZ1 = -16.6;
  const plane = (w, h, reg) => mesh(new THREE.PlaneGeometry(w, h), reg, THREE.DoubleSide);
  const fl = put(plane(9.6, z0 - z1, R.floor), 1.4, .006, (z0 + z1) / 2); fl.rotation.x = -Math.PI / 2;
  const ce = put(plane(x1 - x0, z0 - z1, R.ceil), 0, ch, (z0 + z1) / 2); ce.rotation.x = Math.PI / 2;
  put(plane(x1 - x0, ch, R.wA), 0, ch / 2, z1);
  const lw = put(plane(z0 - z1, ch, R.wB), x0, ch / 2, (z0 + z1) / 2); lw.rotation.y = Math.PI / 2;
  const rw = (za, zb, ya, yb) => { const m = put(plane(za - zb, yb - ya, R.wC), x1, (ya + yb) / 2, (za + zb) / 2); m.rotation.y = -Math.PI / 2; };
  rw(z0, DZ0, 0, ch); rw(DZ1, z1, 0, ch); rw(DZ0, DZ1, 2.2, ch);
  const r2 = put(plane(z0 - z1, ch, R.room2), 6, ch / 2, (z0 + z1) / 2); r2.rotation.y = -Math.PI / 2;
  const pc = put(mesh(box(.04, .55, .75), R.pic), 5.96, 1.6, -16.0);
  // bed against the back wall, on the left
  put(mesh(box(1.5, .34, 2.1), R.bed), -2.55, .24, -18.72); put(mesh(box(1.5, 1.0, .08), R.head), -2.55, .5, -19.74);
  put(mesh(box(1.46, .16, 1.5), R.blanket), -2.55, .49, -18.42);
  const pw = put(mesh(sph(.3), R.pillow), -2.55, .6, -19.35); pw.scale.set(2.1, .45, 1.0);
  put(mesh(box(.75, .55, .03), R.pic), -2.55, 1.75, -19.78);
  // wardrobe on the right
  put(mesh(box(.8, 2.1, .6), R.wardA), 1.65, 1.05, -19.48); put(mesh(box(.8, 2.1, .6), R.wardB), 2.45, 1.05, -19.48); put(mesh(box(1.72, .1, .66), R.wtop), 2.05, 2.15, -19.48);
  // table, two chairs, rug, a vase of flowers, the lamp
  put(mesh(box(2.2, .012, 1.6), R.rug), .15, .012, -17.6);
  put(mesh(box(1.3, .07, .85), R.table), .15, .76, -17.6);
  for (const [dx, dz] of [[-.55, -.33], [.55, -.33], [-.55, .33], [.55, .33]]) put(mesh(cyl(.035, .035, .74, 8), R.chair), .15 + dx, .37, -17.6 + dz);
  for (const s of [-1, 1]) {
    const cx = .15 + s * .95; put(mesh(box(.45, .05, .45), R.chair), cx, .46, -17.6);
    put(mesh(box(.05, .55, .45), R.chair), cx + s * .22, .74, -17.6);
    for (const [dx, dz] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) put(mesh(cyl(.025, .025, .44, 6), R.chair), cx + dx, .22, -17.6 + dz);
  }
  put(mesh(cyl(.07, .09, .24, 12), R.vase), .15, .91, -17.6);
  for (const [dx, dy] of [[-.06, 1.1], [.06, 1.13], [0, 1.18]]) put(mesh(sph(.065), R.bloom), .15 + dx, dy, -17.6);
  put(mesh(cyl(.012, .012, .45, 5), R.iron), .15, 2.58, -17.6); put(mesh(cyl(.08, .26, .24, 16, 1, true), R.lamp, THREE.DoubleSide), .15, 2.26, -17.6);
  // window with curtains on the left wall
  put(mesh(box(.04, 1.1, 1.2), R.win), x0 + .02, 1.55, -16.4);
  for (const z of [-15.65, -17.15]) put(mesh(box(.05, 1.45, .36), R.curtain), x0 + .05, 1.5, z);
  // calendar and clock on the back wall
  put(mesh(box(.82, 1.0, .02), R.cal), CAL.x, CAL.y, z1 + .02);
  const ck = put(mesh(cyl(CLK.r, CLK.r, .04, 32), R.clock), CLK.x, CLK.y, z1 + .03); ck.rotation.x = Math.PI / 2;
}
const CAL = { x: -.85, y: 1.55, z: -19.77 }, CLK = { x: .55, y: 1.98, z: -19.75, r: .3 };

// Her: apple head (story red), mustard cardigan, blue dress, white apron, tube limbs; standing in the doorway to the second room
const HER = { x: 3.62, z: -16.0 };
function landlady() {
  const g = B.her = grp(HER.x, 0, HER.z); g.rotation.y = Math.atan2(.55 - HER.x, -16.2 - HER.z);
  for (const s of [-1, 1]) { put(mesh(cyl(.05, .05, .6, 8), R.limb), s * .09, .32, 0, g); const sh = put(mesh(new THREE.CapsuleGeometry(.055, .1, 4, 10), R.shoe), s * .09, .05, .05, g); sh.rotation.x = Math.PI / 2; }
  put(mesh(cyl(.17, .31, .58, 22), R.dress), 0, .8, 0, g);
  const ap = put(mesh(box(.3, .46, .02), R.apron), 0, .8, .25, g); ap.rotation.x = -.22;
  put(mesh(cyl(.2, .19, .44, 20), R.cardi), 0, 1.24, 0, g);
  B.arms = [-1, 1].map(s => {
    const sh = grp(s * .23, 1.4, 0, g);
    put(mesh(cyl(.07, .065, .24, 10), R.cardi), 0, -.1, 0, sh);
    put(mesh(cyl(.045, .045, .36, 8), R.limb), 0, -.38, 0, sh);
    put(mesh(sph(.065), R.limb), 0, -.58, 0, sh);
    return sh;
  });
  const hd = B.headG = grp(0, 1.78, 0, g);
  put(mesh(sph(.3), R.apple), 0, 0, 0, hd).scale.set(1.08, .94, 1.0);
  const st = put(mesh(cyl(.018, .026, .14, 6), R.stem), .02, .32, 0, hd); st.rotation.z = -.25;
  const lf = put(mesh(sph(.08), R.leaf), .1, .35, 0, hd); lf.scale.set(1.6, .35, .8); lf.rotation.z = .5;
}

function build() {
  scene = new THREE.Scene();
  put(mesh(new THREE.SphereGeometry(200, 24, 16), R.sky, THREE.BackSide), 0, 0, -10);
  put(mesh(box(4.8, .02, 26), R.road), 0, -.01, -1);
  for (const s of [-1, 1]) put(mesh(box(1.2, .12, 26), s < 0 ? R.walk : R.walk2), s * 3.0, .06, -1);
  put(mesh(box(7.2, .12, 1.3), R.walk), 0, .06, FZ + .65);
  // left side of the lane (fronts facing +x)
  const L = Math.PI / 2, Rr = -Math.PI / 2;
  const bak = house(-3.6, -11.45, L, { w: 4.9, h: 5.4, hr: 2.6, wall: R.wallC, shop: true });
  put(mesh(box(2.6, 1.45, .06), R.shop), -.6, 1.2, .03, bak); put(mesh(box(.9, 2.0, .06), R.door), 1.55, 1.0, .03, bak);
  const aw = put(mesh(box(3.0, .06, .9), R.awning), -.6, 2.3, .4, bak); aw.rotation.x = .38;
  put(mesh(box(.05, .05, .95), R.iron), 1.2, 3.55, .48, bak);   // the bracket (the sign hangs across the lane's length)
  const pg = grp(1.2, 3.05, .82, bak); pretzel(pg); B.pretzel = pg;
  house(-3.6, -6.7, L, { w: 4.6, h: 6.2, hr: 2.9, wall: R.wallR, roof: R.roof2, door: 1 });
  house(-3.6, -2.1, L, { w: 4.6, h: 5.6, hr: 2.7, wall: R.wallL });
  house(-3.6, 2.5, L, { w: 4.6, h: 6.0, hr: 2.8, wall: R.wallS, roof: R.roof2 });
  // right side (fronts facing -x)
  house(3.6, -11.75, Rr, { w: 4.5, h: 6.3, hr: 3.0, wall: R.wallS, door: 2 });
  house(3.6, -7.2, Rr, { w: 4.6, h: 5.5, hr: 2.6, wall: R.wallL, roof: R.roof2, door: 1 });
  house(3.6, -2.6, Rr, { w: 4.6, h: 6.1, hr: 2.9, wall: R.wallR });
  house(3.6, 2.0, Rr, { w: 4.6, h: 5.7, hr: 2.7, wall: R.wallC, roof: R.roof2 });
  bike(3.3, -10.3, R.bike); bike(3.32, -11.45, R.bike2);
  tree(2.75, -6.7, 1, R.crown); tree(-2.75, -7.9, .95, R.crown2); tree(2.8, -3.2, .9, R.crown2); tree(-2.8, -2.4, .9, R.crown);
  // the stop sign: a green disc with a yellow H on a pole
  put(mesh(cyl(.035, .035, 2.6, 8), R.iron), 2.75, 1.3, -8.9);
  const sd = put(mesh(cyl(.27, .27, .04, 28), R.sign), 2.75, 2.75, -8.9); sd.rotation.x = Math.PI / 2; B.sign = sd;
  target(); flat(); landlady();
  cam = new THREE.PerspectiveCamera(78, 9 / 16, .05, 400); scene.add(cam);
}

export async function init() {
  comp = makeComp(document.getElementById('gl'));
  N = makeNPR();
  build();
  const L = () => C.layer();
  LY = { bg: [L(), L()], ch: [L(), L()], fg: [L(), L()], tx: L(), sil: document.createElement('canvas'), knock: L() };
  LY.sil.width = RW; LY.sil.height = RH;
  try { await document.fonts.load('700 100px "Kalam"', 'NACHMIETER gesucht! Kündigungsfrist: Ende März 650 € 11 Uhr'); } catch (e) { }
}

// ───────── camera: one time-based Hermite spline for position and look (from the demo), the gaze direction lagged
const CAMK = [
  [-1.0, [.2, 1.6, -.9], [.6, 1.75, -14]],
  [0.0, [.25, 1.6, -2.6], [.65, 1.75, -14]],           // mid-walk down the lane; the house with the ad at its end
  [1.5, [.4, 1.6, -5.5], [.8, 1.65, -14]],
  [3.0, [.62, 1.6, -8.5], [.95, 1.6, -14.1]],
  [4.3, [.85, 1.6, -10.85], [1.05, 1.62, -14.1]],     // at the window: the ad's title
  [5.5, [.95, 1.6, -11.7], [1.05, 1.5, -14.1]],
  [7.6, [.95, 1.6, -12.0], [1.05, 1.4, -14.1]],
  [8.8, [.7, 1.6, -12.05], [1.0, 1.22, -14.1]],        // down to the tear-off strips (Kaution)
  [9.8, [-.35, 1.6, -11.95], [-.9, 1.3, -14.6]],      // a step to the door; it opens
  [10.8, [-.85, 1.6, -12.7], [-.85, 1.45, -17]],
  [11.9, [-.85, 1.6, -14.4], [-.9, 1.6, -19.8]],       // through the doorway
  [13.0, [-.6, 1.6, -15.5], [-.85, 1.55, -19.8]],      // the calendar (Kündigungsfrist: Ende März)
  [13.9, [-.3, 1.6, -15.9], [-.6, 1.62, -19.8]],
  [14.45, [0, 1.58, -16.1], [.55, 1.9, -19.8]],        // the clock (Samstag um elf)
  [15.4, [.3, 1.57, -16.2], [3.62, 1.3, -16.0]],       // turn to her (die Vermieterin)
  [17.3, [.6, 1.56, -16.25], [3.62, 1.32, -16.0]],
];
function cr(keys, t) {   // time-based Hermite spline (from the demo): passes every key with continuous velocity, rest at the ends
  const n = keys.length; if (t <= keys[0][0]) return keys[0].slice(1); if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
  const t1 = keys[i][0], t2 = keys[i + 1][0], dt = t2 - t1, u = (t - t1) / dt;
  const h00 = 2 * u ** 3 - 3 * u * u + 1, h10 = u ** 3 - 2 * u * u + u, h01 = -2 * u ** 3 + 3 * u * u, h11 = u ** 3 - u * u;
  const m = (j, c, a) => (j <= 0 || j >= n - 1) ? 0 : (keys[j + 1][c][a] - keys[j - 1][c][a]) / (keys[j + 1][0] - keys[j - 1][0]);
  return [1, 2].map(c => [0, 1, 2].map(a => h00 * keys[i][c][a] + h10 * dt * m(i, c, a) + h01 * keys[i + 1][c][a] + h11 * dt * m(i + 1, c, a)));
}
const dirAt = u => { const [p, l] = cr(CAMK, u); const v = [l[0] - p[0], l[1] - p[1], l[2] - p[2]], k = 1 / Math.hypot(...v); return v.map(x => x * k); };
function follow(target, t0, t, tau = .26) {   // two-stage exponential smoothing of the direction, recomputed from t0 every frame
  const dt = 1 / 24, K = 1 - Math.exp(-dt / tau);
  let a = target(t0).slice(), b = a.slice();
  for (let u = t0 + dt; u <= t + 1e-6; u += dt) { const T = target(u); a = a.map((v, i) => v + (T[i] - v) * K); b = b.map((v, i) => v + (a[i] - v) * K); }
  return b;
}
const FOV = t => lerp(78, 66, eio(seg(t, 11.8, 13.0))) + 8 * eio(seg(t, 15.0, 16.2));

function pose(t) {
  const [p] = cr(CAMK, t), [pa] = cr(CAMK, t - .06), [pb] = cr(CAMK, t + .06);
  const v = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]) / .12, k = clamp(v / 1.4);   // walking: a bob with each step, a little sway
  const ph = t * 2 * Math.PI * 1.9;
  const pos = [p[0] + .02 * k * Math.sin(ph / 2), p[1] + .035 * k * Math.abs(Math.sin(ph / 2)) - .018 * k + .006 * Math.sin(t * 1.3), p[2]];
  const d = follow(dirAt, -1, t);
  cam.position.set(...pos); cam.lookAt(pos[0] + d[0], pos[1] + d[1], pos[2] + d[2]);
  const f = FOV(t); if (cam.fov !== f) { cam.fov = f; cam.updateProjectionMatrix(); }
  // the door swings inward as we step up to it
  B.door.rotation.y = 1.75 * eio(seg(t, 9.35, 10.45));
  // the pretzel sign swings a little in the wind
  B.pretzel.rotation.x = .06 * Math.sin(t * 1.7);
  // her: arms down, then a wave (two key drawings, alternating), the head tilts
  const wave = t > 15.85, flip = Math.floor(t * 12 / 3) % 2;
  B.arms[0].rotation.z = -.12; B.arms[1].rotation.z = wave ? lerp(2.2, 2.75, flip) * eio(seg(t, 15.85, 16.1)) + .12 * (1 - eio(seg(t, 15.85, 16.1))) : .12;
  B.headG.rotation.z = wave ? -.1 : .02 * Math.sin(t * 1.4);
}

// ───────── 2D things too small to trace, drawn at projected positions: the ad's lettering, the calendar, the clock, the H
const _p = new THREE.Vector3();
const proj = (x, y, z) => { _p.set(x, y, z).project(cam); return [(_p.x * .5 + .5) * W, (.5 - _p.y * .5) * H, _p.z]; };
const idAt = (S, x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : S.id[Math.floor(y / 2) * RW + Math.floor(x / 2)];
function onSheet(L, S, reg, o, rot, items) {   // o: sheet centre (world); items: [str, u, v, height m, col, maxw m]
  const c = proj(o.x, o.y, o.z); if (c[2] > 1 || idAt(S, c[0], c[1]) !== reg) return null;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const at = (u, v) => proj(o.x + u * cs - v * sn, o.y + u * sn + v * cs, o.z + .015);
  const a = at(0, 0), b = at(.1, 0), pxm = Math.hypot(b[0] - a[0], b[1] - a[1]) * 10, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  if (pxm < 30) return null;
  for (const [str, u, v, h, col, mw, seed] of items) {
    const q = at(u, v); let size = h * pxm;
    L.g.font = `700 ${size}px "Kalam"`; const tw = L.g.measureText(str).width; if (mw && tw > mw * pxm) size *= mw * pxm / tw;
    L.g.save(); L.g.translate(q[0], q[1]); L.g.rotate(ang);
    C.text(L, str, 0, size * .32, { font: 'Kalam', weight: 700, size, col, seed: seed ?? 3 });
    L.g.restore();
  }
  return { at, pxm };
}
function overlays(L, S) {
  // the ad: NACHMIETER GESUCHT! in red, the facts in the line colour, tear-off strips along the bottom
  const r = onSheet(L, S, R.ad, AD, .025, [
    ['NACHMIETER', 0, .43, .19, P.brick, 1.0, 11], ['GESUCHT!', 0, .23, .21, P.brick, 1.0, 12],
    ['2 Zimmer, möbliert', 0, .03, .12, P.line, 1.04, 13], ['650 € kalt', 0, -.15, .13, P.line, 1.0, 14]]);
  if (r) {
    const y0 = -.38, y1 = -.66;
    C.line(L, [r.at(-.56, y0), r.at(.56, y0)].map(q => q.slice(0, 2)), { col: P.line, w: 5, p: .8, seed: 401, closed: false });
    for (let i = 0; i < 8; i++) { const u = -.49 + i * .14; C.line(L, [r.at(u, y0), r.at(u, y1)].map(q => q.slice(0, 2)), { col: P.line, w: 4, p: .7, seed: 410 + i, closed: false }); }
  }
  // the calendar: MÄRZ, a grid, the last day circled
  const c = onSheet(L, S, R.cal, CAL, 0, [['MÄRZ', 0, .33, .2, P.brick, .7, 21]]);
  if (c) {
    const u0 = -.33, u1 = .33, v0 = .18, v1 = -.42, cw = (u1 - u0) / 7, rh = (v0 - v1) / 5;
    for (let i = 0; i <= 5; i++) C.line(L, [c.at(u0, v0 - i * rh), c.at(u1, v0 - i * rh)].map(q => q.slice(0, 2)), { col: P.line, w: 3.5, p: .6, seed: 430 + i, closed: false });
    for (let j = 0; j <= 7; j++) C.line(L, [c.at(u0 + j * cw, v0), c.at(u0 + j * cw, v1)].map(q => q.slice(0, 2)), { col: P.line, w: 3.5, p: .6, seed: 440 + j, closed: false });
    const q = c.at(u0 + 2.5 * cw, v1 + .5 * rh), rr = cw * .62 * c.pxm;
    C.line(L, C.handCircle(q[0], q[1], rr, 7, .18), { col: P.brick, w: 7, p: .95, seed: 451, closed: false });
  }
  // the clock: eleven o'clock
  const k = proj(CLK.x, CLK.y, CLK.z + .03);
  if (k[2] < 1 && idAt(S, k[0], k[1]) === R.clock) {
    const e = proj(CLK.x + CLK.r, CLK.y, CLK.z + .03), rr = Math.hypot(e[0] - k[0], e[1] - k[1]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; C.dab(L, k[0] + Math.sin(a) * rr * .8, k[1] - Math.cos(a) * rr * .8, Math.max(2.5, rr * .045), { col: P.line, p: .9, seed: 460 + i, gap: 3, w: 4 }); }
    const hand = (a, len, w, s) => C.line(L, [[k[0], k[1]], [k[0] + Math.sin(a) * rr * len, k[1] - Math.cos(a) * rr * len]], { col: P.line, w, p: .95, seed: s, closed: false, taper: .1 });
    hand(-Math.PI / 6, .5, Math.max(6, rr * .07), 471); hand(0, .72, Math.max(4.5, rr * .05), 472);
  }
  // the stop sign: a yellow H
  const h = proj(2.75, 2.75, -8.9 + .025);
  if (h[2] < 1 && idAt(S, h[0], h[1]) === R.sign) {
    const e = proj(2.75, 2.75 + .27, -8.9 + .025), rr = Math.hypot(e[0] - h[0], e[1] - h[1]);
    if (rr > 12) C.text(L, 'H', h[0], h[1] + rr * .42, { font: 'Kalam', weight: 700, size: rr * 1.35, col: P.lemon, seed: 31 });
  }
}
// Her face: projected from the 3D head, dot eyes, a smile, rose cheeks
function face(L, S) {
  const hd = B.headG; hd.updateMatrixWorld(true);
  const pr = (x, y, z) => { const q = new THREE.Vector3(x, y, z).applyMatrix4(hd.matrixWorld).project(cam); return [(q.x * .5 + .5) * W, (.5 - q.y * .5) * H, q.z]; };
  const c = pr(0, 0, 0), top = pr(0, .28, 0), r = Math.hypot(top[0] - c[0], top[1] - c[1]); if (r < 8 || c[2] > 1) return;
  const seen = ([x, y]) => idAt(S, x, y) === R.apple;
  for (const s of [-1, 1]) {
    const e = pr(s * .1, .04, .28); if (!seen(e)) continue;
    C.dab(L, e[0], e[1], r * .085, { col: P.line, p: .97, seed: 31 + s, gap: 3, w: 4, sq: 1.25 });
    const ck = pr(s * .17, -.07, .24); C.dab(L, ck[0], ck[1], r * .11, { col: P.rose, p: .8, seed: 51 + s, sq: .7 });
  }
  const m = pr(0, -.08, .29); if (!seen(m)) return;
  C.line(L, C.ellipse(m[0], m[1] - r * .05, r * .15, r * .1, 14, .35, Math.PI - .35), { col: P.line, w: Math.max(4, r * .045), p: .95, seed: 61 });
}

// ───────── words printed on the page, synced to the voice: blank paper is made under them (a ragged patch where the crayon stops)
const BLOCKS = [
  [-.6, 2.23, [['Nachmieter', -.6], ['gesucht!', .66]]],   // already printed on frame 1 (hook)
  [2.23, 4.03, [['möbliert', 2.23], ['provisionsfrei', 2.9]]],
  [4.03, 8.36, [['Kaltmiete 650 €', 4.03], ['+ 180 € Nebenkosten', 5.84]]],
  [8.36, 11.4, [['Kaution:', 8.36], ['3 Kaltmieten', 9.11]]],
  [11.4, 13.74, [['Kündigungsfrist:', 11.4], ['Ende März', 12.8]]],
  [13.74, 15.6, [['Besichtigung:', 13.74], ['Samstag, 11 Uhr', 14.44]]],
  [15.6, 99, [['die Vermieterin', 15.6]]],
];
const WSIZE = 104, WMAX = 900, WY = [392, 512], WYS = 452;
function lay(t) {   // the lines on the page at t: [{str, x, y, size, k (writing progress), tw}]
  const b = BLOCKS.find(([a, z]) => t >= a - .17 && t < z - .17); if (!b) return [];
  const g = LY.tx.g; const out = [];
  b[2].forEach(([str, t0], i) => {
    if (t < t0 - .17) return;
    g.font = `700 ${WSIZE}px "Kalam"`; let tw = g.measureText(str).width, size = WSIZE; if (tw > WMAX) { size *= WMAX / tw; tw = WMAX; }
    const y = b[2].length === 1 ? WYS : WY[i];
    out.push({ str, x: W / 2, y, size, tw, k: clamp((t - t0) / Math.max(.35, str.length * .045)), t0 });
  });
  return out;
}
function patch(g, ln, t) {   // a ragged paper patch around one line, opening just before it is written
  const o = eio(clamp((t - ln.t0 + .17) / .25)), hw = (ln.tw / 2 + 34) * (.55 + .45 * o), top = ln.y - ln.size * .86 - 14, bot = ln.y + ln.size * .3 + 16;
  const pts = []; const n = 28;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, cx = Math.cos(a), cy = Math.sin(a);
    const rx = hw + 10 * (hash(i * 3.1 + ln.y) - .5) * 2, ry = (bot - top) / 2 + 6 * (hash(i * 7.7 + ln.y) - .5) * 2;
    const e = Math.pow(Math.abs(cx), .35) * Math.sign(cx), f = Math.pow(Math.abs(cy), .35) * Math.sign(cy);   // a squircle: wide paper
    pts.push([ln.x + e * rx, (top + bot) / 2 + f * ry]);
  }
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
}
function words(t) {
  const ls = lay(t); if (!ls.length) return false;
  const kg = LY.knock.g; C.clear(LY.knock); kg.fillStyle = '#000'; ls.forEach(l => patch(kg, l, t)); comp.knock(LY.knock.c, PAPER, [0, 0]);
  C.clear(LY.tx);
  ls.forEach((l, i) => { if (l.k > 0) C.text(LY.tx, l.str, l.x, l.y, { font: 'Kalam', weight: 700, size: l.size, col: P.line, reveal: l.k, seed: 5 + i * 4 + Math.round(l.t0 * 10), stroke: 2 }); });
  return true;
}
export function texts(t) { return lay(t).map(l => ({ id: l.str, text: l.str, x0: l.x - l.tw / 2, y0: l.y - l.size, x1: l.x + l.tw / 2, y1: l.y + l.size * .3 })); }

// The sky: only a ragged strip along the top is coloured (under the title); below it the paper stays blank for the words
const SKYBAND = Array.from({ length: 16 }, (_, i) => [i * 72, 236 + 16 * Math.sin(i * 1.7) + 9 * Math.sin(i * 4.1)]);

const _v = new THREE.Vector3();
function anc(r) { const m = REGM[r]?.[0]; if (!m) return undefined; m.getWorldPosition(_v).project(cam); return [(_v.x * .5 + .5) * W, (.5 - _v.y * .5) * H]; }
function openLines(rings) {   // no outline along the frame edge
  const out = [];
  for (const r of rings) {
    let cur = []; const on = ([x, y]) => x > 3 && x < W - 3 && y > 3 && y < H - 3;
    for (const p of r) { if (on(p)) cur.push(p); else { if (cur.length > 3) out.push(cur); cur = []; } }
    if (cur.length > 3) out.push(cur);
    if (out.length && r.every(on)) { out.pop(); out.push([...r, r[0]]); }
  }
  return out;
}

export function frame(t) {
  const step = Math.floor(t * 12 + 1e-6), tq = step / 12;   // 12 drawings a second
  C.BOIL.step = step; C.BOIL.amp = 0;
  pose(tq);
  scene.updateMatrixWorld(true);
  const S = snap(N, scene, cam), SH = shapes(S);
  for (const k of ['bg', 'ch', 'fg']) LY[k].forEach(C.clear);
  const order = Object.keys(SH).map(Number).sort((a, b) => SH[b].n - SH[a].n);
  for (const r of order) {
    const g = REG[r], s = SH[r]; if (!g || !s.rings.length) continue;
    const [F, Ln] = LY[g.grp];
    const p = g.p * (1.05 - .25 * s.shade), anchor = anc(r);
    const col = q => C.fill(F, s.rings, { col: g.col, p: p * q, ang: g.ang, gap: g.gap, w: g.w, over: g.over, seed: r * 7.3, anchor, hand: 1, cross: g.cross, crossP: .55 });
    if (r === R.sky) { F.g.save(); F.g.beginPath(); F.g.moveTo(0, 0); SKYBAND.forEach(([x, y]) => F.g.lineTo(x, y)); F.g.lineTo(W, 0); F.g.closePath(); F.g.clip(); col(1); F.g.restore(); }
    else if (!g.nofill) col(1);
    if (s.dark.length) C.fill(F, s.dark, { col: g.col, p: Math.min(1, g.p + .15), ang: g.ang + 1.1, gap: g.gap * .8, w: g.w * .9, over: 3, seed: r * 7.3 + 50, anchor });
    if (g.ow) openLines(s.rings).forEach((l, i) => C.line(Ln, l, { col: P.line, w: g.ow, p: .92, seed: r * 13 + i, closed: false, taper: .08 }));
  }
  overlays(LY.bg[1], S);
  face(LY.ch[1], S);
  comp.paperCam(0, 0, 1);
  comp.begin(PAPER, [0, 0]);
  const knock = regs => { const g = LY.knock.g; C.clear(LY.knock); g.imageSmoothingEnabled = true; g.drawImage(silhouette(S, regs, LY.sil), 0, 0, W, H); comp.knock(LY.knock.c, PAPER, [0, 0]); };
  const grpRegs = k => new Set(REG.filter(g => g && g.grp === k).map(g => g.id));
  comp.crayon(LY.bg[0].c); comp.crayon(LY.bg[1].c);
  knock(grpRegs('ch')); comp.crayon(LY.ch[0].c); comp.crayon(LY.ch[1].c);
  if (words(tq)) comp.crayon(LY.tx.c);
  comp.finish({ vig: .26, emb: .55, poff: [0, 0] });
}
