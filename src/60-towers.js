
const G = {
  B: null, t: 0, gold: 0, lives: 20, maxLives: 20, wave: 0, slain: 0, level: 0, run: 1,
  towers: [], mons: [], men: [], arrows: [], shells: [], stuck: [], fields: [], hbars: [], phase: 'play',
};
const TOWER = {
  archer: { name: 'Archer tower', short: 'Archers', icon: 'archer', cost: [70, 90, 140], range: [6.2, 6.8, 7.4], dmg: [9, 11, 14], rate: [.85, .78, .7], n: [1, 2, 3], air: true, ground: true, light: [80, 105, 140], desc: ['Fast flaming arrows.', 'Can hit flyers.'] },
  bombard: { name: 'Bombard', short: 'Bombard', icon: 'bombard', cost: [120, 130, 190], range: [7.4, 8.0, 8.6], minRange: 2.3, dmg: [36, 60, 98], splash: [1.55, 1.8, 2.1], rate: [2.9, 2.7, 2.5], air: false, ground: true, light: [50, 62, 80], desc: ['Slow shells that burst.', 'Ground targets only.'] },
  spire: { name: 'Storm spire', short: 'Spire', icon: 'spire', cost: [110, 120, 180], range: [5.5, 6.0, 6.5], dmg: [17, 25, 35], jumps: [3, 4, 6], rate: [2.3, 2.1, 1.9], slow: [.36, .42, .48], slowT: [1.3, 1.5, 1.7], air: true, ground: true, light: [16, 20, 26], desc: ['Chain lightning that slows.', 'Can hit flyers.'] },
  guard: { name: 'Guard post', short: 'Guards', icon: 'guard', cost: [80, 90, 150], range: [3.4, 3.7, 4.0], n: [2, 3, 3], hp: [62, 90, 135], dmg: [7, 10, 15], rate: [7, 6, 5], air: false, ground: true, light: [55, 70, 90], desc: ['Footmen who block', 'and duel on the road.'] },
};
const TOWER_KINDS = ['archer', 'bombard', 'spire', 'guard'];
const TOWER_PATHS = {
  archer: [
    { key: 'crossbow', name: 'Crossbow tower', short: 'Crossbow', cost: 250, range: 10.2, dmg: 150, rate: 1.7, n: 1, pierce: .75, light: 95, desc: ['Long-range bolts that', 'punch through armor.'] },
    { key: 'venom', name: 'Venom archers', short: 'Venom', cost: 230, range: 7.6, dmg: 15, rate: .66, n: 3, poison: [14, 3], light: 140, desc: ['Poison arrows that keep', 'hurting for 3 seconds.'] },
  ],
  bombard: [
    { key: 'rocket', name: 'Rocket battery', short: 'Rockets', cost: 280, range: 12.0, minRange: 3.0, dmg: 105, splash: 1.5, rate: 4.2, salvo: 2, light: 90, desc: ['Rocket salvos at', 'very long range.'] },
    { key: 'cannon', name: 'Great cannon', short: 'Cannon', cost: 270, range: 8.4, minRange: 2.6, dmg: 180, splash: 3.0, rate: 3.5, stagger: [.5, .9], light: 95, desc: ['Huge shells, a wide', 'blast that staggers.'] },
  ],
  spire: [
    { key: 'thunder', name: 'Thunder spire', short: 'Thunder', cost: 260, range: 6.9, dmg: 42, jumps: 8, rate: 1.9, slow: .5, slowT: 1.8, roots: [1.25, 15, 2.6], light: 32, desc: ['Longer chains that leave', 'live roots in the ground.'] },
    { key: 'plasma', name: 'Plasma spire', short: 'Plasma', cost: 280, range: 7.2, dmg: 40, beam: [40, 150, 2.4], jumps: 1, light: 34, desc: ['One beam that burns', 'hotter the longer it holds.'] },
  ],
  guard: [
    { key: 'knights', name: 'Knight hall', short: 'Knights', cost: 250, n: 3, hp: 340, dmg: 20, rate: 6, range: 4.2, hold: 3, light: 100, desc: ['Armored knights who', 'hold the road.'] },
    { key: 'assassins', name: 'Assassin den', short: 'Assassins', cost: 240, n: 3, hp: 160, dmg: 26, rate: 5, range: 4.6, dodge: .35, swift: true, light: 70, desc: ['Fast blades that catch', 'spiders and cut wraiths.'] },
  ],
};
const PATH_DEF = {};
for (const kind of TOWER_KINDS) for (const p of TOWER_PATHS[kind]) {
  const b = TOWER[kind], d = Object.assign({}, b, { base: b, path: p.key, name: p.name, short: p.short, desc: p.desc });
  for (const k in b) if (Array.isArray(b[k]) && b[k].length === 3 && typeof b[k][0] === 'number') d[k] = b[k].concat([p[k] !== undefined ? p[k] : b[k][2]]);
  for (const k in p) if (!(k in d) || (!Array.isArray(b[k]) && k !== 'cost')) d[k] = p[k];
  d.cost = b.cost.concat([p.cost]); PATH_DEF[p.key] = d;
}
function upgradeCost(t, pi) { return t.lvl < 2 ? t.def.cost[t.lvl + 1] : t.lvl === 2 ? TOWER_PATHS[t.kind][pi || 0].cost : 0; }

function blueprint(kind, lvl4, path) {
  const lvl = Math.min(lvl4, 2), pieces = [], mounts = {};
  const piece = (id, order, fn) => {
    const S = new Soup(); fn(S); if (!S.verts) return; let minY = 1e9; for (let i = 1; i < S.P.length; i += 3) minY = Math.min(minY, S.P[i]);
    for (let i = 1; i < S.P.length; i += 3) S.P[i] -= minY; pieces.push({ id, order, y: minY, soup: S });
  };
  const rr2 = (r, a, b) => a + (b - a) * r(), w = COL.wood, wd = COL.woodD, wl = COL.woodL, st = COL.stone, sdk = COL.stoneD, sl = COL.stoneL, iron = COL.iron, rng = soupRng;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const brazier = (S, x, y, z, bs) => {
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + .5; S.seg([x + Math.cos(a) * bs * .42, y, z + Math.sin(a) * bs * .42], [x + Math.cos(a) * bs * .2, y + bs * .5, z + Math.sin(a) * bs * .2], .028, .028, iron, { l: L_METAL, n: 4 }); }
    S.cyl(bs * .3, bs * .22, x, y + bs * .56, z, iron, { n: 8, l: L_METAL, rt: 1.5, rough: .6 });
    S.cyl(bs * .4, .04, x, y + bs * .68, z, COL.ember, { n: 8, emis: .55, jit: 0 });
  };
  if (kind === 'archer') {
    const bH = [.25, 1.0, 1.9][lvl], H = [2.0, 2.7, 3.35][lvl], W = [.75, .85, .93][lvl], bs = [.5, .62, .8][lvl];
    piece('base', 0, S => {
      if (lvl === 0) { S.box(1.6, .25, 1.6, 0, .125, 0, sdk, { l: L_MASON }); for (const [a, b] of corners) S.box(.3, .32, .3, a * .66, .16, b * .66, sl, { l: L_MASON }); }
      else {
        S.box(1.8, .3, 1.8, 0, .15, 0, sdk, { l: L_MASON });
        S.cyl(1.02, bH - .3, 0, .3 + (bH - .3) / 2, 0, st, { n: 4, l: L_MASON, rt: .9, r: [0, PI / 4, 0] });
        S.box(1.42, .14, 1.42, 0, bH - .04, 0, sl, { l: L_MASON });
        S.box(.3, .5, .06, 0, .56, .71, COL.black, { jit: 0 });
        if (lvl === 2) { for (const [a, b] of corners) for (let q = 0; q < 3; q++) S.box(.22, .2, .22, a * (.7 - q * .025), .5 + q * .5, b * (.7 - q * .025), sl, { l: L_MASON }); for (const sg of [-1, 1]) S.box(.06, .5, .12, sg * .7, 1.1, 0, COL.black, { jit: 0 }); }
      }
    });
    piece('posts', 1, S => {
      for (const [a, b] of corners) S.seg([a * .62, bH, b * .62], [a * (W - .1), H, b * (W - .1)], .085, .075, wd, { l: L_WOOD });
      const ym = (bH + H) / 2, r = lerp(.62, W - .1, .5);
      for (let k = 0; k < 4; k++) { const [a, b] = corners[k], [c, d] = corners[(k + 1) % 4]; S.seg([a * r, ym, b * r], [c * r, ym, d * r], .05, .05, w, { l: L_WOOD, n: 4 }); }
    });
    piece('brace', 2, S => {
      for (let k = 0; k < 4; k++) { const [a, b] = corners[k], [c, d] = corners[(k + 1) % 4]; S.seg([a * .62, bH + .1, b * .62], [c * (W - .12), H - .15, d * (W - .12)], .035, .035, w, { l: L_WOOD, n: 4 }); S.seg([c * .62, bH + .1, d * .62], [a * (W - .12), H - .15, b * (W - .12)], .035, .035, wl, { l: L_WOOD, n: 4 }); }
    });
    piece('deck', 3, S => {
      S.box(W * 2 + .16, .1, W * 2 + .16, 0, H + .05, 0, w, { l: L_WOOD }); for (const sg of [-1, 1]) S.box(W * 2 + .3, .09, .1, 0, H - .04, sg * (W - .1), wd, { l: L_WOOD });
      for (const sg of [-1, 1]) S.box(.1, .09, W * 2 + .3, sg * (W - .1), H - .04, 0, wd, { l: L_WOOD });
      if (lvl >= 1) for (const [a, b] of corners) S.seg([a * (W - .1), H - .55, b * (W - .1)], [a * (W + .06), H - .02, b * (W + .06)], .04, .04, wd, { l: L_WOOD, n: 4 });
    });
    piece('rail', 4, S => {
      const y0 = H + .1;
      for (let k = 0; k < 4; k++) {
        const ang = k * HPI, cs = Math.cos(ang), sn = Math.sin(ang);
        for (let j = 0; j < 5; j++) {
          if (k === 2 && (j === 1 || j === 2)) continue;
          const u = (j - 2) * W * .42, hh = (j & 1) ? .34 : .5, x = u * cs + (W + .02) * sn, z = -u * sn + (W + .02) * cs;
          S.box(W * .4, hh, .06, x, y0 + hh / 2, z, (j & 1) ? w : wl, { l: L_WOOD, r: [0, ang, 0] });
        }
      }
      for (const [a, b] of corners) S.box(.1, .66, .1, a * (W + .02), y0 + .33, b * (W + .02), wd, { l: L_WOOD });
      if (lvl >= 1) for (const u of lvl === 2 ? [-.5, 0, .5] : [-.35, .35]) { S.cyl(.2, .04, u, y0 + .22, W + .08, lvl === 2 ? COL.ironL : COL.clothB, { n: 8, r: [HPI, 0, 0], l: lvl === 2 ? L_METAL : L_WOOD }); S.sph(.05, u, y0 + .22, W + .11, COL.ironL, { l: L_METAL, w: 5, h: 3, smooth: false }); }
      if (lvl === 2) for (const sg of [-1, 1]) S.cyl(.2, .04, sg * (W + .08), y0 + .22, .1, COL.clothR, { n: 8, r: [0, 0, HPI], l: L_WOOD });
    });
    piece('ladder', 5, S => {
      for (const sg of [-1, 1]) S.seg([sg * .17, 0, -W - .5], [sg * .17, H + .15, -W - .06], .035, .035, wd, { l: L_WOOD, n: 4 });
      for (let y = .3; y < H; y += .34) { const u = y / (H + .15); S.box(.36, .04, .05, 0, y, lerp(-W - .5, -W - .06, u), wl, { l: L_WOOD }); }
    });
    const bx = -W + .34, bz = -W + .36, by = H + .1 + (lvl === 2 ? .35 : 0);
    piece('brazier', 6, S => { if (lvl === 2) S.cyl(.2, .38, bx, H + .29, bz, sdk, { n: 6, l: L_MASON }); brazier(S, bx, by, bz, bs); });
    if (lvl >= 1) piece('flag', 7, S => { S.seg([W - .08, H + .1, -W + .08], [W - .08, H + 1.75, -W + .08], .035, .025, wd, { l: L_WOOD, n: 4 }); const T = new Soup(); clothPanel(T, { x0: 0, x1: .62, yTop: 0, len: .36, z: 0, col: COL.clothR, rng, nx: 3, ny: 2, rag: 0, sway: 1.2 }); S.merge(T, { p: [W - .06, H + 1.7, -W + .08], ao: null }); });
    mounts.flame = [bx, by + bs * .7, bz]; mounts.flameSize = bs; mounts.top = H + 1.7;
    mounts.archers = [[[.12, H + .1, .28]], [[-.3, H + .1, .42], [.42, H + .1, .1]], [[-.35, H + .1, .5], [.5, H + .1, .3], [.25, H + .1, -.4]]][lvl];
    const banners = (S, col, col2, rag) => { for (const sg of [-1, 1]) { const T = new Soup(); clothPanel(T, { x0: -.2, x1: .2, yTop: 0, len: 1.05, z: 0, col, col2, rng, nx: 2, ny: 4, rag, sway: .3 }); S.merge(T, { p: [sg * .5, H - .08, W + .15], ao: null }); } };
    if (path === 'crossbow') {
      piece('plates', 8, S => {
        for (let k = 0; k < 4; k++) { if (k === 2) continue; const ang = k * HPI, cs = Math.cos(ang), sn = Math.sin(ang); for (const u of [-.45, .45]) { const x = u * cs + (W + .1) * sn, z = -u * sn + (W + .1) * cs; S.box(.4, .38, .05, x, H + .32, z, iron, { l: L_METAL, r: [0, ang, 0], rough: .5 }); S.sph(.045, x + sn * .03, H + .32, z + cs * .03, COL.ironL, { l: L_METAL, w: 5, h: 3, smooth: false }); } }
        banners(S, COL.clothR, mulC(COL.gold, .6), .05);
      });
      mounts.archers = []; mounts.ballista = [.12, H + .1, .26]; mounts.crew = [-.42, H + .1, -.38]; mounts.flameSize = .5;
    }
    if (path === 'venom') {
      const vx = .58, vz = -.6;
      piece('vat', 8, S => {
        for (let k = 0; k < 3; k++) { const a = k * TAU / 3; S.seg([vx + Math.cos(a) * .24, H + .1, vz + Math.sin(a) * .24], [vx + Math.cos(a) * .16, H + .3, vz + Math.sin(a) * .16], .03, .03, iron, { l: L_METAL, n: 4 }); }
        S.cyl(.22, .24, vx, H + .38, vz, iron, { n: 8, l: L_METAL, rt: .82, rough: .55 }); S.cyl(.19, .03, vx, H + .5, vz, C(0x5adf3a), { n: 8, emis: .75, jit: 0 });
        banners(S, C(0x2f5a2a), C(0x16240f), .35); PROP.skull(S, 0, H + .74, W + .05, .09, 0);
      });
      mounts.flameCol = [.42, 1, .3]; mounts.vat = [vx, H + .55, vz];
    }
  } else if (kind === 'bombard') {
    const Rr = [1.0, 1.08, 1.15][lvl], H = [1.1, 1.5, 1.9][lvl];
    piece('plinth', 0, S => { S.cyl(Rr + .22, .26, 0, .13, 0, sdk, { n: 10, l: L_MASON }); if (lvl === 2) S.cyl(Rr + .12, .2, 0, .36, 0, st, { n: 10, l: L_MASON }); });
    piece('drum', 1, S => {
      S.cyl(Rr, H, 0, H / 2, 0, st, { n: 10, l: L_MASON, rt: .93, jit: .03 });
      for (let c = 0; c < 2 + lvl; c++) S.cyl(Rr * (1 - .05 * (.5 + c) / (2 + lvl)) + .012, .16, 0, .35 + c * (H - .5) / (1.5 + lvl), 0, mixC(sdk, sl, rng()), { n: 10, l: L_MASON });
      S.box(.34, .55, .1, 0, .3, Rr * .97, COL.black, { jit: 0 });
    });
    if (lvl >= 1) piece('butt', 2, S => { for (let k = 0; k < 4; k++) { const a = k * HPI + PI / 4; S.box(.36, H * .8, .5, Math.cos(a) * (Rr + .06), H * .36, Math.sin(a) * (Rr + .06), sdk, { l: L_MASON, r: [0, -a + HPI, 0] }); S.box(.4, .12, .56, Math.cos(a) * (Rr + .06), H * .78, Math.sin(a) * (Rr + .06), sl, { l: L_MASON, r: [0, -a + HPI, 0] }); } });
    if (lvl >= 1) piece('bands', 3, S => { for (const y of lvl === 2 ? [H * .45, H * .8] : [H * .65]) S.cyl(Rr * .965 + .02, .07, 0, y, 0, iron, { n: 10, l: L_METAL, rough: .55 }); });
    piece('deck', 4, S => { S.cyl(Rr * .93 + .14, .16, 0, H + .02, 0, sl, { n: 10, l: L_MASON }); S.cyl(Rr * .8, .06, 0, H + .12, 0, w, { n: 10, l: L_WOOD }); });
    piece('rim', 5, S => { for (let k = 0; k < 10; k++) { if (k % 5 === 0) continue; const a = (k + .5) / 10 * TAU + HPI; S.box(.46, .34, .22, Math.cos(a) * Rr * .96, H + .27, Math.sin(a) * Rr * .96, lvl === 2 && (k & 1) ? iron : mixC(sdk, sl, rng()), { l: lvl === 2 && (k & 1) ? L_METAL : L_MASON, r: [0, -a + HPI, 0] }); } });
    if (path === 'rocket') piece('ammo', 6, S => { for (const [x, z, a] of [[-.5, -.52, .2], [-.3, -.6, -.1], [.42, -.55, .15]]) { S.box(.34, .12, .26, x, H + .17, z, w, { l: L_WOOD, r: [0, a, 0] }); for (let i = 0; i < 3; i++) S.cyl(.045, .36, x + (i - 1) * .1, H + .27, z, COL.clothR, { n: 6, r: [HPI, a, 0], l: L_WOOD }); } });
    else piece('ammo', 6, S => { for (const [x, z] of [[-.42, -.5], [-.24, -.52], [-.33, -.36]]) S.sph(.09, x, H + .22, z, mulC(iron, .8), { l: L_METAL, w: 6, h: 4, smooth: false }); S.sph(.09, -.33, H + .36, -.46, mulC(iron, .8), { l: L_METAL, w: 6, h: 4, smooth: false }); PROP.barrel(S, .45, H + .13, -.5, .75, rng); });
    const lx = -Rr * .78, lz = .2, lh = H + 1.25 + lvl * .12;
    piece('lantern', 7, S => {
      for (const sg of lvl === 2 ? [-1, 1] : [1]) {
        const x = lx * sg;
        S.seg([x, H + .1, lz], [x, lh, lz], .04, .035, iron, { l: L_METAL, n: 4 }); S.seg([x, lh, lz], [x - sg * -.0, lh, lz + .32], .03, .03, iron, { l: L_METAL, n: 4 });
        S.box(.2, .05, .2, x, lh - .08, lz + .32, iron, { l: L_METAL }); S.box(.16, .2, .16, x, lh - .22, lz + .32, COL.ember, { emis: .8, jit: 0 }); S.box(.2, .04, .2, x, lh - .34, lz + .32, iron, { l: L_METAL });
        for (const [a, b] of corners) S.box(.025, .22, .025, x + a * .09, lh - .22, lz + .32 + b * .09, iron, { l: L_METAL });
      }
    });
    mounts.flame = [lx, lh - .3, lz + .32]; mounts.flameSize = .26 + lvl * .05; mounts.flame2 = lvl === 2 ? [-lx, lh - .3, lz + .32] : null; mounts.top = H + 1.6;
    mounts.gun = [0, H + .15, .05]; mounts.gunLen = [.95, 1.12, 1.25][lvl]; mounts.gunR = [.15, .18, .215][lvl];
    if (path === 'rocket') mounts.launcher = true;
    if (path === 'cannon') {
      piece('bastion', 8, S => { S.cyl(Rr + .36, .3, 0, .15, 0, sdk, { n: 10, l: L_MASON }); for (let k = 0; k < 10; k++) { const a = (k + .5) / 10 * TAU; S.box(.14, H * .72, .12, Math.cos(a) * (Rr + .03), .3 + H * .36, Math.sin(a) * (Rr + .03), iron, { l: L_METAL, r: [0, -a + HPI, 0], rough: .5 }); } });
      mounts.gunLen = 1.7; mounts.gunR = .3;
    }
  } else if (kind === 'spire') {
    const H = [2.7, 3.4, 4.1][lvl], bas = COL.basalt, basL = COL.basaltL, cu = C(0x8a5a3a);
    piece('plinth', 0, S => { S.box(1.55, .22, 1.55, 0, .11, 0, basL, { l: L_ROCK }); S.box(1.18, .2, 1.18, 0, .32, 0, bas, { l: L_ROCK }); if (lvl >= 1) for (const [a, b] of corners) S.cone(.16, .5, a * .62, .5, b * .62, basL, { n: 4, l: L_ROCK }); });
    piece('shaft', 1, S => {
      S.cyl(.62, H - .42, 0, .42 + (H - .42) / 2, 0, bas, { n: 4, l: L_ROCK, rt: .52, r: [0, PI / 4, 0], jit: .03 });
      for (let k = 0; k < 4; k++) { const a = k * HPI, n = 3 + lvl; for (let j = 0; j < n; j++) { const u = (j + .7) / (n + .6), y = .42 + u * (H - .42), rr2 = lerp(.62, .32, u) * .7072 + .012; S.box(.07, .2, .02, Math.sin(a) * rr2, y, Math.cos(a) * rr2, COL.crystal, { emis: .5, jit: 0, r: [-.12, a, 0], ro: 'YXZ' }); } }
    });
    if (lvl >= 1) piece('bands', 2, S => { for (const u of lvl === 2 ? [.3, .58, .82] : [.4, .75]) S.cyl(lerp(.62, .32, u) + .03, .09, 0, .42 + u * (H - .42), 0, cu, { n: 4, l: L_METAL, r: [0, PI / 4, 0], rough: .45 }); });
    piece('claws', 3, S => { for (let k = 0; k < 4; k++) { const a = k * HPI + PI / 4, cs = Math.cos(a), sn = Math.sin(a); S.seg([cs * .22, H - .12, sn * .22], [cs * .46, H + .26, sn * .46], .06, .045, basL, { l: L_ROCK, n: 4 }); S.seg([cs * .46, H + .26, sn * .46], [cs * .26, H + .74, sn * .26], .045, .012, lvl ? cu : basL, { l: lvl ? L_METAL : L_ROCK, n: 4 }); } S.cyl(.34, .12, 0, H - .02, 0, basL, { n: 4, l: L_ROCK, r: [0, PI / 4, 0] }); });
    mounts.crystal = [0, H + .42, 0]; mounts.crystalS = [.2, .24, .29][lvl]; mounts.shards = [0, 2, 4][lvl]; mounts.rings = lvl === 2; mounts.top = H + 1.2; mounts.flame = null; mounts.lightAt = [0, H + .45, 0];
    if (path === 'thunder') {
      piece('roots', 8, S => {
        for (let k = 0; k < 8; k++) { let a = k / 8 * TAU + rng() * .5, r = .62, y = .05, x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
          for (let j = 0; j < 4; j++) { a += rr2(rng, -.45, .45); r += rr2(rng, .22, .38); const x1 = Math.cos(a) * r, z1 = Math.sin(a) * r; S.seg([x0, y, z0], [x1, .02, z1], .045 - j * .008, .035 - j * .008, j ? COL.crystal : cu, { n: 4, emis: j ? .55 : 0, l: j ? undefined : L_METAL, jit: 0 }); if (j === 1) { const b = a + (rng() < .5 ? .7 : -.7); S.seg([x1, .02, z1], [x1 + Math.cos(b) * .3, .02, z1 + Math.sin(b) * .3], .025, .015, COL.crystal, { n: 3, emis: .55, jit: 0 }); } x0 = x1; z0 = z1; y = .02; } }
        for (const u of [.18, .46, .7]) S.cyl(lerp(.62, .32, u) + .05, .05, 0, .42 + u * (H - .42), 0, cu, { n: 4, l: L_METAL, r: [0, PI / 4, 0], rough: .4 });
      });
      mounts.roots = true;
    }
    if (path === 'plasma') {
      piece('prongs', 8, S => { for (let k = 0; k < 4; k++) { const a = k * HPI, cs = Math.cos(a), sn = Math.sin(a); S.seg([cs * .42, H - .35, sn * .42], [cs * .66, H + .45, sn * .66], .055, .04, cu, { l: L_METAL, n: 4 }); S.seg([cs * .66, H + .45, sn * .66], [cs * .42, H + 1.05, sn * .42], .04, .014, cu, { l: L_METAL, n: 4 }); S.ico(.06, cs * .42, H + 1.08, sn * .42, C(0xd890ff), { d: 0, emis: .85, jit: 0 }); } });
      mounts.crystalS = .34; mounts.plasma = true; mounts.top = H + 1.4;
    }
  } else {
    const W = [1.5, 1.7, 1.9][lvl], D = [1.3, 1.4, 1.5][lvl], wh = [1.05, 1.25, 1.5][lvl], stoneWalls = lvl === 2;
    piece('floor', 0, S => { S.box(W + .5, .16, D + .7, 0, .08, .1, sdk, { l: L_MASON }); S.box(.7, .1, .4, 0, .05, D / 2 + .55, st, { l: L_MASON }); });
    piece('walls', 1, S => {
      const wc = stoneWalls ? st : C(0x8f8468), wlay = stoneWalls ? L_MASON : L_PLAIN;
      if (lvl === 1) S.box(W + .04, .5, D + .04, 0, .41, 0, st, { l: L_MASON });
      S.box(W, wh, D, 0, .16 + wh / 2, 0, wc, { l: wlay, jit: .03 });
      if (!stoneWalls) { for (const [a, b] of corners) S.box(.12, wh + .04, .12, a * W / 2, .16 + wh / 2, b * D / 2, wd, { l: L_WOOD }); for (const sg of [-1, 1]) { S.box(W, .1, .08, 0, .16 + wh * .55, sg * D / 2, wd, { l: L_WOOD }); S.seg([sg * W * .5, .2, D / 2 + .01], [sg * W * .22, .16 + wh, D / 2 + .01], .04, .04, wd, { l: L_WOOD, n: 4 }); } S.box(.08, .1, D, W / 2, .16 + wh * .55, 0, wd, { l: L_WOOD }); S.box(.08, .1, D, -W / 2, .16 + wh * .55, 0, wd, { l: L_WOOD }); }
      S.box(.5, .82, .12, 0, .57, D / 2, COL.black, { jit: 0 }); S.box(.66, .1, .16, 0, 1.02, D / 2 + .02, wd, { l: L_WOOD }); for (const sg of [-1, 1]) S.box(.09, .86, .16, sg * .29, .59, D / 2 + .02, wd, { l: L_WOOD });
      S.box(.24, .24, .08, W * .32, .16 + wh * .62, D / 2 + .01, COL.black, { jit: 0 }); S.box(.08, .3, .3, W / 2 + .01, .16 + wh * .6, 0, COL.black, { jit: 0 });
    });
    piece('roof', 2, S => {
      const rl = lvl === 0 ? L_THATCH : L_SLATE, rc = lvl === 0 ? COL.thatch : COL.slate, y0 = .16 + wh, rh = [.75, .85, .9][lvl], sl2 = Math.atan2(rh, D / 2 + .2), len = Math.hypot(rh, D / 2 + .2) + .12;
      for (const sg of [-1, 1]) S.box(W + .36, .09, len, 0, y0 + rh / 2 - .02, sg * (D / 4 + .1), rc, { l: rl, r: [sg * sl2, 0, 0] });
      for (const sg of [-1, 1]) { const T = [[sg * W / 2, y0, -D / 2], [sg * W / 2, y0, D / 2], [sg * W / 2, y0 + rh, 0]]; const gc = stoneWalls ? st : C(0x8f8468); if (sg > 0) S.tri(T[0], T[2], T[1], gc, stoneWalls ? L_MASON : L_PLAIN, .95); else S.tri(T[0], T[1], T[2], gc, stoneWalls ? L_MASON : L_PLAIN, .95); }
      S.box(W + .44, .1, .14, 0, y0 + rh + .02, 0, wd, { l: L_WOOD });
      S.box(.26, .5, .26, -W * .3, y0 + rh * .7 + .1, -D * .2, sdk, { l: L_MASON });
    });
    piece('rack', 3, S => { const x = -W / 2 - .28; S.box(.06, .7, .06, x, .5, -.3, wd, { l: L_WOOD }); S.box(.06, .7, .06, x, .5, .3, wd, { l: L_WOOD }); S.box(.05, .05, .7, x, .78, 0, w, { l: L_WOOD }); for (const z of [-.2, 0, .2]) { S.seg([x + .06, .12, z], [x - .04, 1.5, z], .018, .018, wl, { l: L_WOOD, n: 4 }); S.cone(.035, .14, x - .045, 1.56, z, COL.steel, { n: 4, l: L_METAL }); } if (lvl >= 1) { S.cyl(.2, .04, W / 2 + .03, .75, -.25, COL.clothB, { n: 8, r: [0, 0, HPI], l: L_WOOD }); } });
    if (lvl === 2) piece('turret', 4, S => { const x = W / 2 - .2, z = -D / 2 + .2, th = 2.7; S.box(.8, th, .8, x, th / 2 + .16, z, st, { l: L_MASON }); S.box(.94, .16, .94, x, th + .2, z, sl, { l: L_MASON }); for (const [a, b] of corners) S.box(.24, .26, .24, x + a * .35, th + .4, z + b * .35, mixC(sdk, sl, rng()), { l: L_MASON }); S.box(.1, .4, .06, x, th * .7, z + .41, COL.black, { jit: 0 }); });
    const fx = W / 2 + .12, fz = D / 2 + .5, bs = [.34, .46, .6][lvl];
    piece('fire', 5, S => { if (lvl === 0) { S.seg([fx, 0, fz], [fx, 1.05, fz], .04, .035, wd, { l: L_WOOD, n: 4 }); S.cyl(.07, .12, fx, 1.1, fz, iron, { n: 6, l: L_METAL, rt: 1.4 }); } else brazier(S, fx, .08, fz, bs + .1); });
    if (path === 'knights') piece('banners', 8, S => { for (const sg of [-1, 1]) { const x = sg * .55, z = D / 2 + .14; S.seg([x, .16, z], [x, 2.35, z], .04, .03, wd, { l: L_WOOD, n: 4 }); S.cone(.05, .16, x, 2.43, z, COL.gold, { n: 4, l: L_METAL }); S.seg([x - .22, 2.24, z + .03], [x + .22, 2.24, z + .03], .02, .02, wd, { l: L_WOOD, n: 3 }); const T = new Soup(); clothPanel(T, { x0: -.21, x1: .21, yTop: 0, len: .95, z: 0, col: COL.clothR, col2: mulC(COL.gold, .6), rng, nx: 2, ny: 4, rag: 0, sway: .5 }); S.merge(T, { p: [x, 2.22, z + .05], ao: null }); } });
    if (path === 'assassins') piece('shade', 8, S => { const dk = C(0x2a2032); S.box(1.0, .06, .55, 0, 1.22, D / 2 + .22, dk, { l: L_CLOTH, r: [.35, 0, 0] }); for (const sg of [-1, 1]) S.seg([sg * .48, .16, D / 2 + .46], [sg * .48, 1.12, D / 2 + .46], .03, .03, wd, { l: L_WOOD, n: 4 }); const T = new Soup(); clothPanel(T, { x0: -.5, x1: .5, yTop: 0, len: .3, z: 0, col: dk, col2: C(0x4a3058), rng, nx: 5, ny: 2, rag: .5, sway: .2 }); S.merge(T, { p: [0, 1.12, D / 2 + .48], ao: null }); for (const sg of [-1, 1]) S.box(.16, .24, .04, sg * W * .32, .16 + wh * .62, D / 2 + .03, C(0x6a4a8a), { emis: .25, jit: 0 }); });
    const flagC = path === 'assassins' ? C(0x2a2032) : path === 'knights' ? COL.clothR : COL.clothB;
    piece('flag', 6, S => { const x = lvl === 2 ? W / 2 - .2 : -W / 2 + .1, z = lvl === 2 ? -D / 2 + .2 : -D / 2 + .1, y0 = lvl === 2 ? 3.1 : .2, y1 = lvl === 2 ? 4.5 : 2.9; S.seg([x, y0, z], [x, y1, z], .04, .028, wd, { l: L_WOOD, n: 4 }); const T = new Soup(); clothPanel(T, { x0: 0, x1: .7, yTop: 0, len: .46, z: 0, col: flagC, col2: mulC(COL.gold, .6), rng, nx: 4, ny: 3, rag: .2, sway: 1.1 }); S.merge(T, { p: [x + .03, y1 - .06, z], ao: null }); });
    mounts.flame = lvl === 0 ? [fx, 1.2, fz] : [fx, .08 + (bs + .1) * .72, fz]; mounts.flameSize = bs; mounts.door = [0, 0, D / 2 + .45]; mounts.top = lvl === 2 ? 3.4 : 2.2;
  }
  pieces.sort((a, b) => a.order - b.order);
  return { pieces, mounts };
}

function scaffoldGeo(w, h) {
  const S = new Soup(), c = mulC(COL.woodL, .9), c2 = COL.wood;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) S.seg([a * w, 0, b * w], [a * w, h, b * w], .04, .035, c, { l: L_WOOD, n: 4 });
  for (let y = .9; y < h; y += 1.05) for (let k = 0; k < 4; k++) { const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]], [a, b] = q[k], [cc, d] = q[(k + 1) % 4]; S.seg([a * w, y, b * w], [cc * w, y, d * w], .03, .03, c2, { l: L_WOOD, n: 4 }); if (k & 1) S.seg([a * w, y - .9, b * w], [cc * w, y, d * w], .022, .022, c, { l: L_WOOD, n: 3 }); }
  S.box(w * 1.2, .05, .34, 0, Math.min(h - .2, 1.95), w + .12, c2, { l: L_WOOD }); S.box(.34, .05, w * 1.2, -w - .12, Math.min(h - .25, .95), 0, c, { l: L_WOOD });
  return S.build();
}

let TOWER_STUN = false;
function findTarget(x, z, range, air, ground, minRange = 0, mode = 0, skip = null) {
  if (G.phase !== 'play' || TOWER_STUN) return null;
  let best = null, bp = -1e9; const r2 = range * range, m2 = minRange * minRange;
  for (const m of G.mons) {
    if (m.dead || m.hp <= 0 || !m.vis || m === skip) continue; if (m.fly ? !air : !ground) continue;
    const d = dist2(x, z, m.x, m.z); if (d > r2 || d < m2) continue;
    const sc = mode === 'tough' ? m.hp * (1 + m.prog * .5) : m.prog + (m.fly ? 2 : 0); if (sc > bp) { bp = sc; best = m; }
  }
  return best;
}
function inReach(t, m, range) { return m && !m.dead && m.hp > 0 && m.vis && dist2(t.x, t.z, m.x, m.z) < range * range; }
function aimPoint(m, dt, out) {
  if (m.fly) { out.x = m.x + m.vx * dt; out.y = m.y; out.z = m.z + m.vz * dt; return out; }
  const B = G.B, adv = m.blocked ? 0 : m.spdNow * dt, s2 = Math.min(B.L - .1, m.s + adv);
  pathAt(B, s2, out); out.x += -out.tz * m.lat; out.z += out.tx * m.lat; out.y += m.hitH; return out;
}

const _tv = new THREE.Vector3(), _tq = new THREE.Quaternion(), _tm = new THREE.Matrix4(), _tz = new THREE.Vector3(0, 0, 1), _ts = new THREE.Vector3(1, 1, 1), _ap = { x: 0, y: 0, z: 0, tx: 0, tz: 0 };

class Tower {
  constructor(pad, kind, idx) {
    this.pad = pad; this.kind = kind; this.idx = idx; this.lvl = 0; this.def = TOWER[kind];
    this.x = pad.x; this.y = pad.y; this.z = pad.z; this.yaw = pad.face; this.cs = Math.cos(this.yaw); this.sn = Math.sin(this.yaw);
    this.spent = this.def.cost[0]; this.state = 'build'; this.bt = 0; this.cool = rr(.2, .8); this.kills = 0; this.dealt = 0; this.alive = true; this.recent = 0;
    this.group = new THREE.Group(); this.group.position.set(this.x, this.y, this.z); this.group.rotation.y = this.yaw; R.scene.add(this.group);
    this.pieces = []; this.staticMesh = null; this.scaf = null; this.flame = null; this.flame2 = null; this.archers = []; this.men = []; this.respawn = 0;
    this.em = { x: this.x, y: this.y + 3, z: this.z, r: 1, g: .56, b: .26, I: 0, range: 13, on: 0, alive: true, seed: rnd() * 50, spot: kind !== 'spire', dx: this.sn, dz: this.cs, fl: 1, _spot: 0 };
    LT.emitters[idx] = this.em; pad.tower = this;
    this.gunYaw = 0; this.recoil = 0; this.charge = 0; this.spin = rnd() * 6; this.hover = 0; this.appear = 0;
    this.begin();
  }
  get range() { return this.def.range[this.lvl]; }
  w(l, out) { out.x = this.x + l[0] * this.cs + l[2] * this.sn; out.y = this.y + l[1]; out.z = this.z - l[0] * this.sn + l[2] * this.cs; return out; }
  begin() {
    const bp = blueprint(this.kind, this.lvl, this.path); this.bp = bp; this.mounts = bp.mounts; this.bt = 0; this.state = this.lvl ? 'upgrade' : 'build';
    this.clearModel(true);
    const n = bp.pieces.length, gap = Math.min(.2, 1.45 / n);
    bp.pieces.forEach((p, i) => {
      const mesh = new THREE.Mesh(p.soup.build(), MAT.world); mesh.castShadow = mesh.receiveShadow = true; mesh.visible = false; mesh.position.y = p.y + 2.4;
      this.group.add(mesh); this.pieces.push({ mesh, y: p.y, t0: .32 + i * gap, landed: false, soup: p.soup });
    });
    this.tEnd = .32 + n * gap + .3;
    this.scaf = new THREE.Mesh(scaffoldGeo(1.25, Math.min(4.4, bp.mounts.top + .3)), MAT.world); this.scaf.castShadow = true; this.scaf.scale.set(1, .01, 1); this.group.add(this.scaf);
    fxDust(this.x, this.y + .1, this.z, 7, 1.0, { speed: 1.6 });
    sfx('hammer', this.x, this.z, .8, .3);
  }
  clearModel(keepLights) {
    for (const p of this.pieces) { this.group.remove(p.mesh); p.mesh.geometry.dispose(); } this.pieces.length = 0;
    for (const k of ['staticMesh', 'scaf', 'carriage', 'crystal', 'ballista']) if (this[k]) { this.group.remove(this[k]); this[k].traverse(o => { if (o.geometry) o.geometry.dispose(); }); this[k] = null; }
    this.barrel = null; this.shards = null; this.ringG = null; this.arm = null; this.crew = null;
    removeFlame(this.flame); removeFlame(this.flame2); this.flame = this.flame2 = null; this.em.on = keepLights ? this.em.on * .4 : 0;
    this.archers.length = 0;
  }
  finish() {
    const M = new Soup(); for (const p of this.pieces) M.merge(p.soup, { p: [0, p.y, 0], ao: [0, 1.0, .72] });
    for (const p of this.pieces) { this.group.remove(p.mesh); p.mesh.geometry.dispose(); } this.pieces.length = 0;
    this.staticMesh = new THREE.Mesh(M.build(), MAT.world); this.staticMesh.castShadow = this.staticMesh.receiveShadow = true; this.group.add(this.staticMesh);
    if (this.scaf) { this.group.remove(this.scaf); this.scaf.geometry.dispose(); this.scaf = null; }
    const mt = this.mounts, lvl = this.lvl, d = this.def;
    if (mt.flame) { const p = this.w(mt.flame, {}), fc = mt.flameCol || [1, 1, 1]; this.flame = addFlame({ x: p.x, y: p.y, z: p.z, size: mt.flameSize, on: 0, layers: mt.flameSize > .7 ? 2 : 1, glow: 1, r: fc[0], g: fc[1], b: fc[2] }); this.em.x = p.x; this.em.y = p.y + .25; this.em.z = p.z; this.em.r = mt.flameCol ? .5 : 1; this.em.g = mt.flameCol ? 1 : .56; this.em.b = mt.flameCol ? .3 : .26; }
    if (mt.flame2) { const p = this.w(mt.flame2, {}); this.flame2 = addFlame({ x: p.x, y: p.y, z: p.z, size: mt.flameSize, on: 0 }); }
    if (mt.lightAt) { const p = this.w(mt.lightAt, {}); this.em.x = p.x; this.em.y = p.y; this.em.z = p.z; this.em.r = mt.plasma ? .8 : .45; this.em.g = mt.plasma ? .42 : .72; this.em.b = 1; }
    this.em.I = d.light[lvl]; this.em.range = this.kind === 'archer' ? 12 : 10.5;
    if (this.kind === 'archer') mt.archers.forEach((a, i) => this.archers.push({ l: a, yaw: this.yaw, draw: 0, cool: .4 + i * .3, e: { scale: .82, ph: 0, mv: 0, atk: -1, bow: true, draw: 0, pitch: 0, tint: [1, .9, .7], x: 0, y: 0, z: 0, yaw: 0, flash: 0 } }));
    if (mt.ballista) this.makeBallista();
    if (this.kind === 'bombard') this.makeGun();
    if (this.kind === 'spire') this.makeCrystal();
    if (this.kind === 'guard') { this.respawn = .2; }
    this.state = 'active'; this.appear = 0;
    fxDust(this.x, this.y + .2, this.z, 10, 1.3, { speed: 2.2 });
    sfx('buildDone', this.x, this.z, 1);
    if (this.flame) fxEmbers(this.flame.x, this.flame.y, this.flame.z, 10, .2);
  }
  makeBallista() {
    const mt = this.mounts, S = new Soup(), wd = COL.woodD, w = COL.wood, iron = COL.iron;
    S.cyl(.2, .1, 0, .05, 0, iron, { n: 8, l: L_METAL }); S.cyl(.09, .38, 0, .24, 0, wd, { n: 6, l: L_WOOD }); for (const sg of [-1, 1]) S.box(.05, .2, .18, sg * .12, .45, 0, iron, { l: L_METAL });
    this.ballista = new THREE.Mesh(S.build(), MAT.world); this.ballista.castShadow = true; this.ballista.position.set(mt.ballista[0], mt.ballista[1], mt.ballista[2]); this.ballista.scale.setScalar(1.4); this.group.add(this.ballista);
    const A = new Soup();
    A.box(.13, .12, 1.25, 0, 0, .12, COL.woodD, { l: L_WOOD }); A.box(.15, .05, .4, 0, -.07, .55, COL.clothR, { l: L_WOOD }); A.box(.05, .03, 1.1, 0, .075, .18, wd, { l: L_WOOD }); A.box(.2, .16, .16, 0, -.02, -.42, iron, { l: L_METAL }); for (const sg of [-1, 1]) A.cyl(.07, .05, sg * .13, -.02, -.42, wd, { n: 6, r: [0, 0, HPI], l: L_WOOD });
    for (const sg of [-1, 1]) { A.seg([0, .03, .66], [sg * .42, .04, .58], .055, .045, iron, { l: L_METAL, n: 4 }); A.seg([sg * .42, .04, .58], [sg * .66, .05, .4], .045, .025, iron, { l: L_METAL, n: 4 }); A.seg([sg * .66, .05, .4], [0, .09, -.22], .008, .008, COL.bone, { n: 3, jit: 0 }); }
    A.box(.22, .2, .1, 0, 0, .66, iron, { l: L_METAL });
    this.arm = new THREE.Mesh(A.build(), MAT.world); this.arm.castShadow = true; this.arm.position.set(0, .56, 0); this.ballista.add(this.arm);
    const L = new Soup(); L.box(.03, .03, .78, 0, 0, 0, COL.woodL, { jit: 0 }); L.cone(.05, .14, 0, 0, .44, COL.steel, { n: 4, r: [HPI, 0, 0], l: L_METAL, jit: 0 }); for (const r of [0, HPI]) L.box(.1, .008, .14, 0, 0, -.32, COL.clothR, { r: [0, 0, r], jit: 0 });
    this.loaded = new THREE.Mesh(L.build(), MAT.world); this.loaded.position.set(0, .12, .2); this.arm.add(this.loaded);
    this.gunYaw = this.yaw; this.pitch = 0;
    this.crew = { scale: .82, ph: 0, mv: 0, atk: -1, draw: 0, pitch: 0, tint: [1, .9, .7], x: 0, y: 0, z: 0, yaw: this.yaw, flash: 0, wScale: .8 };
  }
  makeGun() {
    const mt = this.mounts, L = mt.gunLen, r = mt.gunR, S = new Soup(), br = this.lvl >= 2 ? COL.iron : COL.bronze;
    S.cyl(.42, .12, 0, .06, 0, COL.woodD, { n: 8, l: L_WOOD }); for (const sg of [-1, 1]) { S.box(.09, .34, .62, sg * (r + .07), .26, 0, COL.wood, { l: L_WOOD }); S.cyl(.17, .07, sg * (r + .16), .17, -.12, COL.woodD, { n: 8, r: [0, 0, HPI], l: L_WOOD }); }
    this.carriage = new THREE.Mesh(S.build(), MAT.world); this.carriage.castShadow = this.carriage.receiveShadow = true; this.carriage.position.set(mt.gun[0], mt.gun[1], mt.gun[2]); this.group.add(this.carriage);
    const Bq = new Soup(), o = () => ({ n: 8, l: L_METAL, r: [HPI, 0, 0], rough: .42 });
    if (mt.launcher) {
      this.tubes = [];
      Bq.box(.62, .44, .1, 0, 0, -.32, COL.iron, { l: L_METAL }); Bq.box(.62, .44, .1, 0, 0, .52, COL.iron, { l: L_METAL }); for (const sg of [-1, 1]) Bq.box(.05, .5, .95, sg * .32, 0, .1, COL.woodD, { l: L_WOOD });
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = (i - 1) * .19, y = (j - .5) * .2; Bq.cyl(.075, .95, x, y, .1, COL.ironL, Object.assign(o(), { rt: 1 })); Bq.cyl(.05, .02, x, y, .58, COL.black, Object.assign(o(), { jit: 0 })); Bq.cone(.06, .1, x, y, .63, COL.clothR, { n: 6, r: [HPI, 0, 0], l: L_WOOD }); this.tubes.push([x, y, .62]); }
      Bq.box(.3, .2, .2, 0, -.3, -.15, COL.woodD, { l: L_WOOD });
      this.barrel = new THREE.Mesh(Bq.build(), MAT.world); this.barrel.castShadow = this.barrel.receiveShadow = true; this.barrel.position.set(0, .52, 0); this.barrel.rotation.x = -.62; this.carriage.add(this.barrel);
      this.gunYaw = this.yaw; this.salvo = 0; this.salvoT = 0; this.tubeI = 0; return;
    }
    Bq.cyl(r, L, 0, 0, L / 2 - .28, br, Object.assign(o(), { rt: .8 })); Bq.cyl(r * 1.16, .12, 0, 0, L - .3, br, o()); Bq.cyl(r * .62, .03, 0, 0, L - .235, COL.black, Object.assign(o(), { jit: 0 }));
    for (const z of [-.2, L * .25, L * .55]) Bq.cyl(r * 1.1 - z * .03, .07, 0, 0, z, mulC(br, .8), o());
    Bq.sph(r * .9, 0, 0, -.3, br, { l: L_METAL, w: 6, h: 4, smooth: false, rough: .42 }); Bq.sph(r * .32, 0, 0, -.3 - r * .9, mulC(br, .8), { l: L_METAL, w: 5, h: 3, smooth: false });
    this.barrel = new THREE.Mesh(Bq.build(), MAT.world); this.barrel.castShadow = this.barrel.receiveShadow = true; this.barrel.position.set(0, .4, 0); this.barrel.rotation.x = -.42; this.carriage.add(this.barrel);
    this.gunYaw = this.yaw;
  }
  makeCrystal() {
    const mt = this.mounts, mk = (sx, sy) => { const S = new Soup(); S.add(gOct(), { s: [sx, sy, sx], c: [1, 1, 1], jit: 0, cf: v => .55 + .45 * smooth(-sy, sy, v.y) + (v.x > 0 ? .12 : 0) }); return S.build(); };
    this.cmat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(.3, .6, 1) });
    this.crystal = new THREE.Group(); this.crystal.position.set(mt.crystal[0], mt.crystal[1], mt.crystal[2]);
    const c = new THREE.Mesh(mk(mt.crystalS, mt.crystalS * 1.9), this.cmat); c.castShadow = true; this.crystal.add(c); this.core = c;
    this.shards = [];
    for (let i = 0; i < mt.shards; i++) { const s = new THREE.Mesh(mk(.07, .16), this.cmat); this.crystal.add(s); this.shards.push(s); }
    if (mt.rings) { const S = new Soup(); for (let k = 0; k < 7; k++) { if (k === 3) continue; const a = k / 7 * TAU; S.box(.5, .16, .2, Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0, COL.basaltL, { l: L_ROCK, r: [0, -a + HPI, 0] }); } this.ringG = new THREE.Mesh(S.build(), MAT.world); this.ringG.castShadow = true; this.ringG.position.y = -1.25; this.crystal.add(this.ringG); }
    this.group.add(this.crystal);
  }
  upgrade(pi = 0) {
    if (this.lvl >= 3 || this.state !== 'active') return false;
    this.lvl++; if (this.lvl === 3) { const P = TOWER_PATHS[this.kind][pi] || TOWER_PATHS[this.kind][0]; this.path = P.key; this.def = PATH_DEF[P.key]; this.heat = 0; this.beamT = null; }
    this.spent += this.def.cost[this.lvl]; for (const m of this.men) m.lvlUp = true; this.begin(); return true;
  }
  sell() {
    this.alive = false; this.em.alive = false; this.em.on = 0; LT.emitters[this.idx] = null; this.pad.tower = null;
    for (let i = 0; i < 14; i++) { _tm.compose(_tv.set(this.x + rr(-.7, .7), this.y + rr(.3, 2.4), this.z + rr(-.7, .7)), _tq.set(rr(-1, 1), rr(-1, 1), rr(-1, 1), 1).normalize(), _ts.set(1, 1, 1)); addDebris(this.kind === 'archer' || this.kind === 'guard' ? KIT.plank : KIT.rubble, _tm, null, rr(-2, 2), rr(1, 4), rr(-2, 2), rr(3, 9), rr(2, 3.5)); }
    fxDust(this.x, this.y + .4, this.z, 16, 1.6, { speed: 2.6 }); sfx('sell', this.x, this.z, 1);
    for (const m of this.men) m.leave = true;
    this.clearModel(false); R.scene.remove(this.group);
  }
  update(dt) {
    const d = this.def, lvl = this.lvl; this.recent = Math.max(0, this.recent - dt * .25);
    if (this.state !== 'active') {
      this.bt += dt; const bt = this.bt;
      if (this.scaf) this.scaf.scale.y = bt < this.tEnd - .25 ? easeOutBack(bt / .3) : Math.max(.01, 1 - (bt - (this.tEnd - .25)) / .25);
      for (const p of this.pieces) {
        const u = (bt - p.t0) / .24;
        if (u < 0) continue; p.mesh.visible = true;
        if (u < 1) p.mesh.position.y = p.y + (1 - u * u) * 2.2;
        else { p.mesh.position.y = p.y; const sq = clamp((u - 1) / .5, 0, 1); p.mesh.scale.y = 1 - .1 * Math.sin(sq * PI) * (1 - sq);
          if (!p.landed) { p.landed = true; fxDust(this.x + rr(-.5, .5), this.y + p.y + .1, this.z + rr(-.5, .5), 3, .55, { speed: 1.2, a: .4 }); sfx('hammer', this.x, this.z, .7, rnd()); } }
      }
      this.em.on = damp(this.em.on, 0, 4, dt);
      if (bt >= this.tEnd) this.finish();
      return;
    }
    this.appear = Math.min(1, this.appear + dt * 2.2);
    TOWER_STUN = this.stun > 0;
    if (TOWER_STUN) { this.stun -= dt; const k = Math.min(1, this.stun * 2); FX.add.push(this.x, this.y + 1.7, this.z, 4.2, 5.6, 0, 0, .2, .5, 1.2, .3 * k, 2, 0, 0, 0); if (rnd() < dt * 5) { const a = rnd() * TAU, h = rr(.6, 3); fxBolt([this.x + Math.cos(a) * .8, this.y + h, this.z + Math.sin(a) * .8], [this.x + Math.cos(a + 1.2) * .8, this.y + h + rr(-.5, .5), this.z + Math.sin(a + 1.2) * .8], .12, [.5, .85, 1.5], .03); } if (rnd() < dt * 18) fxPart(this.x + rr(-.7, .7), this.y + rr(.4, 3.2), this.z + rr(-.7, .7), 0, rr(-.5, .1), 0, rr(.4, .9), rr(.05, .08), .6, 1.1, 2.0, { drag: .5 }); }
    this.em.on = damp(this.em.on, TOWER_STUN ? .12 : 1, TOWER_STUN ? 8 : 3, dt);
    if (this.flame) this.flame.on = this.em.on; if (this.flame2) this.flame2.on = this.em.on;
    this.cool -= dt;
    if (this.path === 'crossbow') this.updCrossbow(dt, d, lvl);
    else if (this.kind === 'archer') this.updArcher(dt, d, lvl);
    else if (this.kind === 'bombard') this.updBombard(dt, d, lvl);
    else if (this.path === 'plasma') this.updPlasma(dt, d, lvl);
    else if (this.kind === 'spire') this.updSpire(dt, d, lvl);
    else this.updGuard(dt, d, lvl);
    TOWER_STUN = false;
  }
  venomTarget(a, range) {
    let best = null, bp = -1e9; const r2 = range * range;
    for (const m of G.mons) {
      if (m.dead || m.hp <= 0 || !m.vis || dist2(this.x, this.z, m.x, m.z) > r2) continue;
      let sc = m.prog + (m.fly ? 2 : 0) - (m.poisonT > 1 ? 3 : 0); for (const o of this.archers) if (o !== a && o.tgt === m) sc -= 1.5;
      if (sc > bp) { bp = sc; best = m; }
    }
    return best;
  }
  updArcher(dt, d, lvl) {
    const tgt0 = findTarget(this.x, this.z, d.range[lvl], true, true), venom = !!d.poison;
    for (const a of this.archers) {
      const p = this.w(a.l, _ap), e = a.e; e.x = p.x; e.y = p.y - (1 - easeOut(this.appear)) * .5; e.z = p.z; e.scale = .82 * (.3 + .7 * this.appear);
      a.cool -= dt;
      let tgt = tgt0;
      if (venom && tgt0) { if (!inReach(this, a.tgt, d.range[lvl]) || (a.cool < .4 && !a.lock)) { a.tgt = this.venomTarget(a, d.range[lvl]); a.lock = a.cool < .4; } tgt = a.tgt || tgt0; } else a.tgt = null;
      if (tgt) {
        const T = clamp(Math.hypot(tgt.x - p.x, tgt.z - p.z) / 14, .22, .62), q = aimPoint(tgt, T, _ap2);
        a.yaw = angDamp(a.yaw, Math.atan2(q.x - p.x, q.z - p.z), 12, dt);
        e.pitch = clamp(Math.atan2(q.y - (p.y + 1), Math.hypot(q.x - p.x, q.z - p.z)) * .7 + .2, -.5, .6);
        a.draw = a.cool < .34 ? Math.min(1, a.draw + dt * 3.6) : Math.max(0, a.draw - dt * 6);
        if (a.cool <= 0 && a.draw > .95) {
          a.cool = d.rate[lvl] * rr(.9, 1.12); a.draw = 0;
          shootArrow(p.x + Math.sin(a.yaw) * .3, p.y + 1.0, p.z + Math.cos(a.yaw) * .3, tgt, d.dmg[lvl], this, venom ? { poison: d.poison } : null);
          sfx('bow', p.x, p.z, .6, rnd()); a.lock = false;
        }
      } else { a.draw = Math.max(0, a.draw - dt * 3); a.yaw = angDamp(a.yaw, this.yaw + Math.sin(G.t * .5 + a.l[0] * 3) * .5, 2, dt); e.pitch = damp(e.pitch, 0, 4, dt); if (a.cool < .3) a.cool = .3; }
      e.yaw = a.yaw; e.draw = a.draw;
      rigHuman(KIT.foot, SPEC.foot, e);
    }
    if (venom && this.mounts.vat && rnd() < dt * 6) { const v = this.w(this.mounts.vat, _ap); fxPart(v.x + rr(-.12, .12), v.y, v.z + rr(-.12, .12), rr(-.05, .05), rr(.3, .7), rr(-.05, .05), rr(.5, 1), rr(.04, .07), .5, 2.2, .4, { drag: 1, wob: 1, rise: .2 }); }
  }
  updCrossbow(dt, d, lvl) {
    const tgt = findTarget(this.x, this.z, d.range[lvl], true, true, 0, 'tough'), mt = this.mounts, rate = d.rate[lvl];
    this.recoil = Math.max(0, this.recoil - dt * 2.4);
    const b = this.w(mt.ballista, {}); b.y += .56 * 1.4;
    if (tgt) {
      const dist = Math.hypot(tgt.x - b.x, tgt.z - b.z), T = clamp(dist / 26, .1, .42), q = aimPoint(tgt, T, _ap2);
      const want = Math.atan2(q.x - b.x, q.z - b.z); this.gunYaw = angDamp(this.gunYaw, want, 6, dt);
      this.pitch = damp(this.pitch, clamp(Math.atan2(q.y - b.y, dist), -.55, .35), 8, dt);
      if (Math.abs(angDiff(this.gunYaw, want)) < .08 && this.cool <= 0) {
        this.cool = rate * rr(.96, 1.05); this.recoil = 1;
        this.ballista.updateMatrixWorld(true); const tip = _tv.set(0, .12, .7).applyMatrix4(this.arm.matrixWorld);
        shootArrow(tip.x, tip.y, tip.z, tgt, d.dmg[lvl], this, { bolt: true, pierce: d.pierce });
        sfx('crossbow', this.x, this.z, .9, rnd()); fxSmoke(tip.x, tip.y, tip.z, rr(-.2, .2), rr(.1, .4), rr(-.2, .2), .6, .16, .3, .35, .32, .3, .35, { drag: 2 });
      }
    } else { this.gunYaw = angDamp(this.gunYaw, this.yaw + Math.sin(G.t * .35 + this.idx) * .8, 1.4, dt); this.pitch = damp(this.pitch, 0, 2, dt); if (this.cool < .4) this.cool = .4; }
    this.ballista.rotation.y = this.gunYaw - this.yaw; this.arm.rotation.x = -this.pitch; this.arm.position.z = -.14 * this.recoil * this.recoil;
    this.loaded.visible = this.cool < rate * .55;
    const e = this.crew, c = this.w(mt.crew, _ap); e.x = c.x; e.y = c.y - (1 - easeOut(this.appear)) * .5; e.z = c.z; e.scale = .82 * (.3 + .7 * this.appear);
    const winding = this.cool > rate * .55 && this.cool < rate * .95;
    e.yaw = angDamp(e.yaw, Math.atan2(b.x - c.x, b.z - c.z), 8, dt); e.atk = winding ? (G.t * 2.2) % 1 * .5 : -1; e.mv = 0; e.weapon = null;
    rigHuman(KIT.foot, SPEC.foot, e);
  }
  updBombard(dt, d, lvl) {
    if (this.mounts.launcher) return this.updRockets(dt, d, lvl);
    const tgt = findTarget(this.x, this.z, d.range[lvl], false, true, d.minRange), big = this.path === 'cannon';
    this.recoil = Math.max(0, this.recoil - dt * 1.6);
    let aligned = false;
    if (tgt) {
      const dist = Math.hypot(tgt.x - this.x, tgt.z - this.z), T = clamp(dist / 7.2, .75, 1.45), q = aimPoint(tgt, T, _ap2);
      const want = Math.atan2(q.x - this.x, q.z - this.z); this.gunYaw = angDamp(this.gunYaw, want, 5, dt); aligned = Math.abs(angDiff(this.gunYaw, want)) < .12;
      if (aligned && this.cool <= 0) {
        this.cool = d.rate[lvl] * rr(.95, 1.08); this.recoil = 1;
        this.carriage.updateMatrixWorld(true); const mz = _tv.set(0, 0, this.mounts.gunLen - .2).applyMatrix4(this.barrel.matrixWorld);
        const gy = G.B.heightAt(q.x, q.z);
        G.shells.push({ x0: mz.x, y0: mz.y, z0: mz.z, tx: q.x, ty: Math.max(gy, q.y - tgt.hitH) + .05, tz: q.z, t: 0, T, dmg: d.dmg[lvl], splash: d.splash[lvl], tower: this, x: mz.x, y: mz.y, z: mz.z, sm: 0, arc: 1.5 + dist * .2, big, stagger: d.stagger || null });
        const dx = Math.sin(this.gunYaw), dz = Math.cos(this.gunYaw);
        lightFlash(mz.x, mz.y + .2, mz.z, 0xffc880, 420, .16, 15);
        fxTimed(5, mz.x + dx * .2, mz.y + .1, mz.z + dz * .2, 1.9, 1.9, 4, 3, 1.6, 1, .1); fxTimed(3, mz.x + dx * .3, mz.y + .12, mz.z + dz * .3, .9, .9, 4, 3.2, 2.2, 1, .2, { grow: .8 });
        for (let i = 0; i < 6; i++) fxSmoke(mz.x + dx * .3, mz.y + .1, mz.z + dz * .3, dx * rr(1, 3.4) + rr(-.5, .5), rr(.3, 1.2), dz * rr(1, 3.4) + rr(-.5, .5), rr(1.2, 2.4), rr(.35, .6), .9, .3, .29, .28, .5, { drag: 2.2, rise: .2 });
        fxSparks(mz.x + dx * .2, mz.y, mz.z + dz * .2, 8, 5, 3, 1.8, .6, { lo: 0, hi: .6 });
        sfx('cannon', this.x, this.z, 1, big ? 1 : lvl / 2); FX.shake = Math.min(1, FX.shake + (big ? .3 : .12));
        if (big) { lightFlash(mz.x, mz.y + .2, mz.z, 0xffb060, 700, .2, 18); for (let i = 0; i < 5; i++) fxSmoke(mz.x, mz.y, mz.z, rr(-1.5, 1.5), rr(.1, .6), rr(-1.5, 1.5), rr(1.5, 2.6), rr(.5, .8), 1.3, .3, .29, .28, .45, { drag: 2 }); }
      }
    } else this.gunYaw = angDamp(this.gunYaw, this.yaw + Math.sin(G.t * .3 + this.idx) * .7, 1.2, dt);
    this.carriage.rotation.y = this.gunYaw - this.yaw;
    const k = this.recoil; this.barrel.position.z = -(big ? .42 : .3) * k * k; this.barrel.rotation.x = -.42 - .1 * k * k;
    if (this.cool > 0 && this.cool < 1.2 && rnd() < dt * 5) { this.carriage.updateMatrixWorld(true); const mz = _tv.set(0, 0, this.mounts.gunLen - .2).applyMatrix4(this.barrel.matrixWorld); fxSmoke(mz.x, mz.y, mz.z, rr(-.1, .1), rr(.3, .6), rr(-.1, .1), 1.2, .18, .35, .3, .3, .3, .22, { drag: 1 }); }
  }
  updRockets(dt, d, lvl) {
    const tgt = findTarget(this.x, this.z, d.range[lvl], false, true, d.minRange);
    this.recoil = Math.max(0, this.recoil - dt * 3);
    if (tgt) {
      const q = aimPoint(tgt, 1, _ap2), want = Math.atan2(q.x - this.x, q.z - this.z); this.gunYaw = angDamp(this.gunYaw, want, 4, dt);
      if (Math.abs(angDiff(this.gunYaw, want)) < .15 && this.cool <= 0 && !this.salvo) { this.cool = d.rate[lvl] * rr(.95, 1.06); this.salvo = d.salvo; this.salvoT = 0; this.salvoTgt = tgt; }
    } else this.gunYaw = angDamp(this.gunYaw, this.yaw + Math.sin(G.t * .3 + this.idx) * .7, 1.2, dt);
    if (this.salvo > 0 && G.phase === 'play' && !TOWER_STUN) {
      this.salvoT -= dt;
      if (this.salvoT <= 0) {
        const first = this.salvo === d.salvo, m0 = inReach(this, this.salvoTgt, d.range[lvl] + 1) ? this.salvoTgt : tgt;
        const m = first ? m0 : (findTarget(this.x, this.z, d.range[lvl], false, true, d.minRange, 0, m0) || m0);
        if (m) {
          this.salvo--; this.salvoT = .22; this.recoil = 1;
          this.carriage.updateMatrixWorld(true); const tb = this.tubes[this.tubeI++ % this.tubes.length], mz = _tv.set(tb[0], tb[1], tb[2]).applyMatrix4(this.barrel.matrixWorld);
          const dx = Math.sin(this.gunYaw), dz = Math.cos(this.gunYaw);
          G.shells.push({ rocket: true, x: mz.x, y: mz.y, z: mz.z, vx: dx * 3, vy: 4.5, vz: dz * 3, sp: 5, m, tx: m.x, ty: m.y, tz: m.z, t: 0, dmg: d.dmg[lvl], splash: d.splash[lvl], tower: this, sm: 0, wob: rnd() * 9 });
          lightFlash(mz.x, mz.y, mz.z, 0xffb070, 260, .12, 12); fxTimed(5, mz.x, mz.y, mz.z, 1.3, 1.3, 4, 2.6, 1.2, 1, .1);
          for (let i = 0; i < 5; i++) fxSmoke(mz.x - dx * .3, mz.y - .2, mz.z - dz * .3, -dx * rr(.5, 2) + rr(-.6, .6), rr(-.2, .6), -dz * rr(.5, 2) + rr(-.6, .6), rr(1, 2), rr(.3, .5), .9, .32, .3, .29, .45, { drag: 2, rise: .2 });
          sfx('rocket', this.x, this.z, .9, rnd());
        } else this.salvo = 0;
      }
    }
    this.carriage.rotation.y = this.gunYaw - this.yaw; this.barrel.rotation.x = -.62 - .06 * this.recoil;
  }
  updSpire(dt, d, lvl) {
    const tgt = findTarget(this.x, this.z, d.range[lvl], true, true);
    const was = this.charge;
    this.charge = tgt ? Math.min(1, this.charge + dt / d.rate[lvl]) : Math.max(0, this.charge - dt * .25);
    if (was < .68 && this.charge >= .68 && tgt) sfx('charge', this.x, this.z, .5);
    const c = this.charge, pulse = .85 + .15 * Math.sin(G.t * (6 + c * 20));
    this.spin += dt * (.8 + c * 5); this.core.rotation.y = this.spin; this.core.position.y = Math.sin(G.t * 1.6 + this.idx) * .05;
    this.shards.forEach((s, i) => { const a = this.spin * .7 + i * TAU / this.shards.length; s.position.set(Math.cos(a) * .58, Math.sin(a * 1.3) * .14 - .05, Math.sin(a) * .58); s.rotation.y = -a * 2; });
    if (this.ringG) this.ringG.rotation.y = -this.spin * .25;
    const k = (.9 + 4.5 * c * c) * pulse * this.appear; this.cmat.color.setRGB(.28 * k, .62 * k, 1.15 * k);
    this.em.I = (d.light[lvl] + 70 * c * c) * pulse;
    const cp = this.w(this.mounts.crystal, _ap);
    FX.add.push(cp.x, cp.y, cp.z, 1.5 + c, 1.5 + c, 0, 0, .25, .55, 1.0, (.1 + .22 * c) * pulse, 2, 0, 0, 0);
    if (c > .5 && rnd() < dt * 14 * c) { const a = rnd() * TAU; fxBolt([cp.x, cp.y, cp.z], [cp.x + Math.cos(a) * .7, cp.y + rr(-.5, .5), cp.z + Math.sin(a) * .7], .1, [.45, .7, 1.4], .035); }
    if (c >= 1 && tgt) {
      this.charge = 0; let from = [cp.x, cp.y, cp.z], cur = tgt, dmg = d.dmg[lvl]; const hit = [];
      for (let j = 0; j < d.jumps[lvl] && cur; j++) {
        hit.push(cur); const to = [cur.x, cur.y + cur.hitH, cur.z];
        fxBolt(from, to, .26 - j * .015, [.5, .78, 1.6], .1 - j * .008);
        fxSparks(to[0], to[1], to[2], 5, 3.5, 1.2, 2, 4, { grav: 3, size: .06 }); fxTimed(2, to[0], to[1], to[2], 1.6, 1.6, .5, .9, 2, .7, .16);
        const cx = cur.x, cz = cur.z; slowMonster(cur, d.slow[lvl], d.slowT[lvl]); hitMonster(cur, dmg, 'bolt', 0, 0, this);
        if (d.roots && j < 4 && !cur.fly) addField(cx, cz, d.roots, this);
        dmg *= .86; from = to; let nb = null, nd = (d.roots ? 3.4 : 3.0) ** 2;
        for (const m of G.mons) { if (m.dead || m.hp <= 0 || !m.vis || hit.includes(m)) continue; const dd = dist2(cx, cz, m.x, m.z); if (dd < nd) { nd = dd; nb = m; } }
        cur = nb;
      }
      lightFlash(tgt.x, tgt.y + 1.2, tgt.z, 0x9fd0ff, 520, .22, 16); lightFlash(cp.x, cp.y, cp.z, 0x9fd0ff, 300, .18, 12);
      sfx('zap', this.x, this.z, 1, lvl / 2); FX.shake = Math.min(1, FX.shake + .08);
    }
  }
  updPlasma(dt, d, lvl) {
    const range = d.range[lvl], B = d.beam;
    let t = this.beamT; if (G.phase !== 'play' || TOWER_STUN || !inReach(this, t, range)) t = null;
    if (!t) { t = findTarget(this.x, this.z, range, true, true); if (t) this.heat *= .4; }
    this.beamT = t;
    this.heat = t ? Math.min(1, this.heat + dt / B[2]) : Math.max(0, this.heat - dt * .8);
    const c = t ? .35 + .65 * this.heat : this.heat * .3, pulse = .85 + .15 * Math.sin(G.t * (8 + c * 24));
    this.spin += dt * (.8 + c * 6); this.core.rotation.y = this.spin; this.core.position.y = Math.sin(G.t * 1.6 + this.idx) * .05;
    this.shards.forEach((s, i) => { const a = this.spin * .7 + i * TAU / this.shards.length; s.position.set(Math.cos(a) * .58, Math.sin(a * 1.3) * .14 - .05, Math.sin(a) * .58); s.rotation.y = -a * 2; });
    if (this.ringG) this.ringG.rotation.y = -this.spin * .25;
    const k = (1 + 4 * c * c) * pulse * this.appear; this.cmat.color.setRGB(.85 * k, .36 * k, 1.2 * k);
    this.em.I = (d.light[lvl] + 140 * c * c) * pulse;
    const cp = this.w(this.mounts.crystal, _ap);
    FX.add.push(cp.x, cp.y, cp.z, 1.6 + c, 1.6 + c, 0, 0, .8, .3, 1.1, (.12 + .25 * c) * pulse, 2, 0, 0, 0);
    if (!t) return;
    const hx = t.x, hy = t.y + (t.fly ? 0 : t.hitH), hz = t.z, wd = .05 + .09 * this.heat;
    burnMonster(t, lerp(B[0], B[1], this.heat) * dt, this, 'plasma');
    const SG = FX.segs, jx = rr(-.04, .04), jy = rr(-.04, .04);
    SG.push(cp.x, cp.y, cp.z, wd, hx + jx, hy + jy, hz, wd * .8, 4.2, 2.2, 5.2, 1); SG.push(cp.x, cp.y, cp.z, wd * 3.6, hx, hy, hz, wd * 3, 1.1, .35, 1.6, .5);
    FX.add.push(hx, hy, hz, .7 + this.heat, .7 + this.heat, 0, 0, 2.6, 1.2, 3.2, .9 * pulse, 0, 0, 0, 0); FX.add.push(hx, hy, hz, 2.2, 2.2, 0, 0, .7, .25, 1, .3, 2, 0, 0, 0);
    if (rnd() < dt * 20) fxSparks(hx, hy, hz, 2, 3, 2.2, 1, 3, { grav: 4, size: .05 });
    if (rnd() < dt * 4) fxSmoke(hx, hy, hz, rr(-.2, .2), rr(.4, .9), rr(-.2, .2), rr(.6, 1.1), .25, .5, .2, .15, .25, .3, { drag: 1 });
    this.hum = (this.hum || 0) - dt; if (this.hum <= 0) { this.hum = .42; sfx('plasma', this.x, this.z, .45 + .35 * this.heat, this.heat); }
  }
  updGuard(dt, d, lvl) {
    for (let i = this.men.length - 1; i >= 0; i--) if (this.men[i].gone) this.men.splice(i, 1);
    if (this.men.length < d.n[lvl]) { this.respawn -= dt; if (this.respawn <= 0) { this.respawn = this.men.length === 0 && G.t < 4 ? .5 : d.rate[lvl]; spawnFootman(this); } }
  }
  dispose() { this.alive = false; this.em.alive = false; LT.emitters[this.idx] = null; this.clearModel(false); R.scene.remove(this.group); this.pad.tower = null; }
}
const _ap2 = { x: 0, y: 0, z: 0, tx: 0, tz: 0 };

function shootArrow(x, y, z, m, dmg, tower, o) {
  const bolt = !!(o && o.bolt), dist = Math.hypot(m.x - x, m.z - z), T = bolt ? clamp(dist / 26, .1, .42) : clamp(dist / 14, .22, .62), q = aimPoint(m, T, _ap2);
  G.arrows.push({ x0: x, y0: y, z0: z, tx: q.x, ty: q.y, tz: q.z, t: 0, T, m, dmg, tower, x, y, z, dx: 0, dy: 0, dz: 1, arc: bolt ? .05 + dist * .015 : .25 + dist * .07, alive: true, lI: bolt ? 14 : 22, lCol: o && o.poison ? 0x70ff50 : bolt ? 0xb0d0ff : 0xff9040, lx: x, ly: y, lz: z, lseed: rnd() * 9, ember: 0, bolt, pierce: o && o.pierce || 0, poison: o && o.poison || null });
}
function arrowMatrix(x, y, z, dx, dy, dz, sc = 1) { _tq.setFromUnitVectors(_tz, _tv.set(dx, dy, dz).normalize()); return _tm.compose(_tv.set(x, y, z), _tq, _ts.set(sc, sc, sc)); }
function updateProjectiles(dt) {
  const A = G.arrows, B = G.B;
  for (let i = A.length - 1; i >= 0; i--) {
    const a = A[i]; a.t += dt; const u = Math.min(1, a.t / a.T), m = a.m;
    if (m && !m.dead && m.hp > 0) { const q = aimPoint(m, Math.max(0, a.T - a.t), _ap2), k = Math.min(1, dt * 9); a.tx = lerp(a.tx, q.x, k); a.ty = lerp(a.ty, q.y, k); a.tz = lerp(a.tz, q.z, k); }
    const px = a.x, py = a.y, pz = a.z;
    a.x = lerp(a.x0, a.tx, u); a.z = lerp(a.z0, a.tz, u); a.y = lerp(a.y0, a.ty, u) + a.arc * 4 * u * (1 - u);
    const dx = a.x - px, dy = a.y - py, dz = a.z - pz, l = Math.hypot(dx, dy, dz) || 1; a.dx = dx / l; a.dy = dy / l; a.dz = dz / l;
    a.lx = a.x; a.ly = a.y; a.lz = a.z;
    const sc = a.bolt ? 1.8 : 1, hx = a.x + a.dx * .25 * sc, hy = a.y + a.dy * .25 * sc, hz = a.z + a.dz * .25 * sc;
    if (a.bolt) {
      KIT.bolt.put(arrowMatrix(a.x, a.y, a.z, a.dx, a.dy, a.dz), 0, null);
      FX.segs.push(hx, hy, hz, .05, hx - a.dx * 2.2, hy - a.dy * 2.2, hz - a.dz * 2.2, 0, 1.6, 1.9, 2.4, .6);
      FX.add.push(hx, hy, hz, .9, .9, 0, 0, .6, .7, 1, .18, 2, 0, 0, 0);
    } else if (a.poison) {
      KIT.arrow.put(arrowMatrix(a.x, a.y, a.z, a.dx, a.dy, a.dz), 0, null);
      FX.segs.push(hx, hy, hz, .055, hx - a.dx * .95, hy - a.dy * .95, hz - a.dz * .95, .0, .7, 2.6, .4, .85);
      FX.add.push(hx, hy, hz, .3, .3, 0, 0, 1.2, 3.6, .7, 1, 0, 0, 0, 0); FX.add.push(hx, hy, hz, 1.0, 1.0, 0, 0, .3, 1, .2, .22, 2, 0, 0, 0);
      a.ember += dt * 20; while (a.ember > 1) { a.ember -= 1; fxPart(hx, hy, hz, rr(-.3, .3), rr(-.4, .1), rr(-.3, .3), rr(.25, .5), .05, .6, 2.4, .4, { drag: 1.5, grav: 1.5 }); }
    } else {
      KIT.arrow.put(arrowMatrix(a.x, a.y, a.z, a.dx, a.dy, a.dz), 0, null);
      FX.segs.push(hx, hy, hz, .055, hx - a.dx * .95, hy - a.dy * .95, hz - a.dz * .95, .0, 2.6, 1.05, .25, .85);
      FX.add.push(hx, hy, hz, .3, .3, 0, 0, 3.6, 1.9, .5, 1, 0, 0, 0, 0); FX.add.push(hx, hy, hz, 1.0, 1.0, 0, 0, 1, .45, .12, .22, 2, 0, 0, 0);
      a.ember += dt * 26; while (a.ember > 1) { a.ember -= 1; fxPart(hx, hy, hz, rr(-.4, .4), rr(-.1, .6), rr(-.4, .4), rr(.25, .6), .05, 2.6, 1.1, .2, { drag: 1.5, rise: .6 }); }
    }
    if (u >= 1) {
      a.alive = false; swapRemove(A, i);
      if (m && !m.dead && m.hp > 0 && dist2(a.tx, a.tz, m.x, m.z) < 1.0) {
        if (a.poison) { fxSparks(a.x, a.y, a.z, 5, 2.4, .6, 2.4, .4, { size: .055, grav: 6 }); fxTimed(2, a.x, a.y, a.z, .9, .9, .5, 1.6, .3, .8, .12); }
        else if (a.bolt) { fxSparks(a.x, a.y, a.z, 9, 4.5, 2.6, 2.4, 2, { size: .06, grav: 6 }); fxTimed(2, a.x, a.y, a.z, 1.4, 1.4, 1.6, 1.6, 1.8, .8, .14); }
        else { fxSparks(a.x, a.y, a.z, 5, 3, 3, 1.5, .4, { size: .055, grav: 6 }); fxTimed(2, a.x, a.y, a.z, .9, .9, 1.6, .8, .25, .8, .12); }
        sfx('arrowHit', a.x, a.z, a.bolt ? .9 : .55, a.bolt ? 0 : rnd());
        if (hitMonster(m, a.dmg, 'arrow', a.dx * (a.bolt ? 2.5 : 1), a.dz * (a.bolt ? 2.5 : 1), a.tower, a.pierce) === false && a.poison && !m.dead && m.hp > 0 && !m.eth) poisonMonster(m, a.poison[0], a.poison[1], a.tower);
      } else if (!m || !m.fly) {
        const gy = B.heightAt(a.x, a.z);
        G.stuck.push({ x: a.x, y: gy + .12 * sc, z: a.z, dx: a.dx, dy: Math.min(-.5, a.dy), dz: a.dz, life: 3.2, bolt: a.bolt, green: !!a.poison });
        fxSparks(a.x, gy + .1, a.z, 3, 2, 3, 1.5, .4, { size: .05 });
      }
    }
  }
  const St = G.stuck;
  for (let i = St.length - 1; i >= 0; i--) {
    const s = St[i]; s.life -= dt; if (s.life <= 0) { swapRemove(St, i); continue; }
    (s.bolt ? KIT.bolt : KIT.arrow).put(arrowMatrix(s.x, s.y - Math.max(0, .5 - s.life) * .5, s.z, s.dx, s.dy, s.dz), 0, null);
    if (s.life > 1.4 && !s.bolt && !s.green) { FX.add.push(s.x - s.dx * .25, s.y - s.dy * .25 + .04, s.z - s.dz * .25, .2, .2, 0, 0, 3, 1.4, .3, Math.min(1, (s.life - 1.4)), 0, 0, 0, 0); if (rnd() < dt * 5) fxPart(s.x, s.y + .1, s.z, rr(-.1, .1), rr(.4, .9), rr(-.1, .1), .6, .045, 2.4, 1, .2, { drag: .5, wob: 1 }); }
  }
  const Sh = G.shells;
  for (let i = Sh.length - 1; i >= 0; i--) {
    const s = Sh[i]; s.t += dt;
    if (s.rocket) { if (updRocket(s, dt)) swapRemove(Sh, i); continue; }
    const u = Math.min(1, s.t / s.T);
    s.x = lerp(s.x0, s.tx, u); s.z = lerp(s.z0, s.tz, u); s.y = lerp(s.y0, s.ty, u) + s.arc * 4 * u * (1 - u);
    _tm.compose(_tv.set(s.x, s.y, s.z), _tq.setFromAxisAngle(_tz, s.t * 9), _ts.setScalar(s.big ? 1.7 : 1)); KIT.shell.put(_tm, 0, null);
    FX.add.push(s.x, s.y + .1, s.z, .3, .3, 0, 0, 3.2, 1.5, .3, 1, 0, 0, 0, 0);
    s.sm += dt * 30; while (s.sm > 1) { s.sm -= 1; fxSmoke(s.x, s.y, s.z, rr(-.1, .1), rr(0, .2), rr(-.1, .1), rr(.5, .9), .16, .3, .26, .25, .25, .32, { drag: 1 }); if (rnd() < .5) fxPart(s.x, s.y, s.z, rr(-.5, .5), rr(-.2, .5), rr(-.5, .5), .4, .05, 2.5, 1.1, .2, { grav: 2 }); }
    if (u >= 1) { swapRemove(Sh, i); explodeAt(s.tx, s.ty, s.tz, s.dmg, s.splash, s.tower, s.stagger); }
  }
  updateFields(dt);
}
const _rk = { x: 0, y: 0, z: 0, tx: 0, tz: 0 };
function updRocket(s, dt) {
  const m = s.m;
  if (m && !m.dead && m.hp > 0) { const d = Math.hypot(m.x - s.x, m.z - s.z), q = aimPoint(m, Math.min(1, d / Math.max(6, s.sp)), _rk); s.tx = q.x; s.ty = q.y - m.hitH * .5; s.tz = q.z; }
  const dx = s.tx - s.x, dy = s.ty - s.y, dz = s.tz - s.z, dl = Math.hypot(dx, dy, dz) || 1, boost = s.t < .32;
  s.sp = Math.min(16, s.sp + dt * 26);
  let vx = s.vx, vy = s.vy, vz = s.vz; const vl = Math.hypot(vx, vy, vz) || 1, k = Math.min(1, dt * (boost ? 1.5 : 6 + s.t * 6));
  const wob = Math.sin(s.t * 13 + s.wob) * .25 * sat(1 - s.t);
  vx = lerp(vx / vl, dx / dl, k) + wob * dz / dl; vy = lerp(vy / vl, boost ? 1 : dy / dl, k); vz = lerp(vz / vl, dz / dl, k) - wob * dx / dl;
  const nl = Math.hypot(vx, vy, vz) || 1; s.vx = vx / nl * s.sp; s.vy = vy / nl * s.sp; s.vz = vz / nl * s.sp;
  s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
  const nx = s.vx / s.sp, ny = s.vy / s.sp, nz = s.vz / s.sp;
  KIT.rocket.put(arrowMatrix(s.x, s.y, s.z, nx, ny, nz), 0, null);
  const bx = s.x - nx * .35, by = s.y - ny * .35, bz = s.z - nz * .35;
  FX.add.push(bx, by, bz, .4, .4, 0, 0, 4, 2.4, .9, 1, 0, 0, 0, 0); FX.add.push(bx, by, bz, 1.3, 1.3, 0, 0, 1.2, .55, .15, .3, 2, 0, 0, 0);
  FX.segs.push(bx, by, bz, .07, bx - nx * .8, by - ny * .8, bz - nz * .8, 0, 3, 1.6, .5, .8);
  s.sm += dt * 40; while (s.sm > 1) { s.sm -= 1; fxSmoke(bx, by, bz, rr(-.15, .15), rr(0, .25), rr(-.15, .15), rr(.8, 1.5), .17, .5, .3, .28, .27, .36, { drag: 1.2, rise: .1 }); }
  const gy = G.B.heightAt(s.x, s.z);
  if (dl < .45 || s.y < gy + .05 || s.t > 4) { explodeAt(s.x, Math.max(gy, Math.min(s.y, s.ty)) + .05, s.z, s.dmg, s.splash, s.tower); return true; }
  return false;
}
function explodeAt(x, y, z, dmg, splash, tower, stagger) {
  const sc = splash / 1.7;
  fxExplosion(x, y, z, sc);
  FX.decals.add(G.B.heightAt, x, z, splash * 1.2, .016, .013, .011, .85, 45);
  sfx('explode', x, z, 1, clamp(sc - .6, 0, 1));
  for (const m of G.mons) {
    if (m.dead || m.hp <= 0 || m.fly || !m.vis) continue;
    const d = Math.hypot(m.x - x, m.z - z); if (d > splash + m.rad) continue;
    const k = lerp(1, .45, sat(d / splash)), l = d || 1;
    if (stagger) slowMonster(m, stagger[0], stagger[1]);
    hitMonster(m, dmg * k, 'blast', (m.x - x) / l, (m.z - z) / l, tower);
  }
  for (let i = 0; i < 5; i++) { _tm.compose(_tv.set(x + rr(-.3, .3), y + .2, z + rr(-.3, .3)), _tq.set(rr(-1, 1), rr(-1, 1), rr(-1, 1), 1).normalize(), _ts.set(.6, .6, .6)); addDebris(KIT.rubble, _tm, [.5, .45, .4], rr(-3, 3), rr(3, 6), rr(-3, 3), rr(4, 10), rr(1.6, 2.6)); }
}

function addField(x, z, rt, tower) {
  const F = G.fields; for (const f of F) if (dist2(f.x, f.z, x, z) < .5) { f.t = Math.max(f.t, rt[2]); return; }
  if (F.length > 40) return;
  const y = G.B.heightAt(x, z), arms = [];
  for (let i = 0; i < 5; i++) arms.push(rnd() * TAU);
  F.push({ x, y, z, r: rt[0], dps: rt[1], t: rt[2], max: rt[2], tower, arms, zap: 0, seed: rnd() * 9 });
  FX.decals.add(G.B.heightAt, x, z, rt[0] * .9, .01, .016, .03, .5, rt[2] + 2);
}
function updateFields(dt) {
  const F = G.fields; if (!F.length) return; const id = G.t;
  for (let i = F.length - 1; i >= 0; i--) {
    const f = F[i]; f.t -= dt; if (f.t <= 0 || G.phase !== 'play') { swapRemove(F, i); continue; }
    const k = Math.min(1, f.t * 1.5, (f.max - f.t) * 6 + .3), r2 = (f.r + .2) ** 2;
    for (const m of G.mons) {
      if (m.dead || m.hp <= 0 || m.fly || !m.vis || m.shockAt === id) continue;
      if (dist2(m.x, m.z, f.x, f.z) > r2 + m.rad * m.rad) continue;
      m.shockAt = id; slowMonster(m, .3, .3); burnMonster(m, f.dps * dt, f.tower, 'shock');
    }
    FX.add.push(f.x, f.y + .1, f.z, f.r * 2.4, f.r * 2.4, 0, 0, .25, .5, 1.2, .35 * k, 4, f.seed, .5, 1);
    f.zap -= dt;
    if (f.zap <= 0) {
      f.zap = rr(.05, .12);
      const a = f.arms[Math.floor(rnd() * f.arms.length)] + rr(-.3, .3), r = f.r * rr(.6, 1.1), ex = f.x + Math.cos(a) * r, ez = f.z + Math.sin(a) * r;
      fxBolt([f.x + rr(-.15, .15), f.y + .06, f.z + rr(-.15, .15)], [ex, G.B.heightAt(ex, ez) + .05, ez], .1, [.45, .75, 1.6], .03 * k + .01);
      if (rnd() < .3) fxPart(ex, G.B.heightAt(ex, ez) + .08, ez, 0, rr(.5, 1.2), 0, rr(.2, .4), .05, 1, 1.6, 3, { drag: 1 });
    }
  }
}
