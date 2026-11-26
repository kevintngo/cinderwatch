// Balance harness: lets the AI commander play headless, without rendering, for each seed until its first defeat or a time cap,
// then reports how far it got, how each battlefield went (regular waves, the boss, unspent gold) and how much damage each tower level and path deals.
// Usage: node tools/balance.js [seeds, e.g. 1-8] [minutes per seed] [extra URL flags, e.g. level=6]
const { spawn } = require('child_process'); const fs = require('fs'); const os = require('os'); const path = require('path');
const ROOT = path.dirname(__dirname);
const [seedArg = '1-8', maxMin = '90', extra = ''] = process.argv.slice(2);
const FILE = path.resolve(process.env.FILE || path.join(ROOT, 'index.html')), LCAP = +(process.env.LCAP || 9);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const GL = process.platform === 'darwin' ? ['--headless=new', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--headless', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [s0, s1] = seedArg.split('-').map(Number), seeds = []; for (let s = s0; s <= (s1 || s0); s++) seeds.push(s);

// Runs inside the page: steps the game and keeps the statistics.
const PAGE = `(() => { const c = __cw, G = c.G; c.UI.setManual(false); window.__bal = { log: [], lastK: -1, lastL: -1, max: 0, livesAtWave: G.lives, eff: {}, boards: [], bd: null, prevPh: '',
  run(n) { for (let i = 0; i < n; i++) { c.step(1 / 30); this.note(); if (G.phase === 'defeat') return 'defeat'; } return 'ok'; },
  note() {
    const w = G.level * 5 + G.k;
    if (G.k !== this.lastK || G.level !== this.lastL) {
      if (this.lastK > 0 && G.k > 0) this.log.push({ w: this.lastL * 5 + this.lastK, lost: this.livesAtWave - G.lives, lives: G.lives, press: +G.press.toFixed(2), gold: Math.round(G.gold), tw: G.towers.filter(t => t.alive).map(t => t.kind[0] + (t.lvl + 1) + (t.path ? t.path[0] : '')).sort().join(' ') });
      this.lastK = G.k; this.lastL = G.level; this.livesAtWave = G.lives;
    }
    if (G.phase === 'play' || G.phase === 'defeat') this.max = Math.max(this.max, w);
    // damage per second of each tower while it sits at level 3 (kind + '3') or at a level 4 path
    for (const t of G.towers) { if (t.state !== 'active') continue; if (t.lvl === 2 && t._u0 === undefined) { t._e0 = t.dealt; t._u0 = G.t; } if (t.lvl === 3 && t._t0 === undefined) { t._d0 = t.dealt; t._t0 = G.t; } }
    if ((G.phase === 'clear' || G.phase === 'defeat') && !this.recd) {
      this.recd = true;
      for (const t of G.towers) {
        let lab, d0, t0; if (t.lvl === 3) { lab = t.path; d0 = t._d0; t0 = t._t0; } else if (t.lvl === 2) { lab = t.kind + '3'; d0 = t._e0; t0 = t._u0; } else continue;
        if (t0 === undefined || G.t - t0 < 20) continue; const e = this.eff[lab] = this.eff[lab] || [0, 0, 0]; e[0] += t.dealt - d0; e[1] += G.t - t0; e[2]++;
      }
    }
    if (G.phase === 'play') this.recd = false;
    // one record per battlefield
    const bd = this.bd = this.bd || { L: G.level, a: 0, b: 0, leak: false, lives: G.lives, preBoss: 0, mid: 0, midN: 0 };
    if (G.lives < bd.lives) { if (G.k === 5) bd.b += bd.lives - G.lives; else bd.a += bd.lives - G.lives; } bd.lives = G.lives;
    if (G.phase === 'play' && G.spawning && G.waveT < .05 && G.k >= 2 && G.k <= 4) { bd.mid += G.gold; bd.midN++; }
    if (G.phase === 'play' && G.k === 4 && !G.spawning) bd.preBoss = Math.max(bd.preBoss, G.gold);
    for (const ty in G.leakTypes) if (c.MON[ty].boss) bd.leak = true;
    if (G.phase === 'crumble' && this.prevPh !== 'crumble') this.boards.push(bd);
    if (G.phase === 'crumble' || G.phase === 'rise') this.bd = null;
    this.prevPh = G.phase;
  } }; return 1; })()`;

async function runSeed(seed) {
  const port = 9500 + Math.floor(Math.random() * 400), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'cinderwatch-bal-'));
  const ch = spawn(CHROME, GL.concat(['--window-size=640,400', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--mute-audio', 'about:blank']), { stdio: 'ignore' });
  let ws = null; for (let i = 0; i < 80 && !ws; i++) { await sleep(150); try { const j = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); const pg = j.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch (e) { } }
  if (!ws) throw new Error('could not start Chrome at ' + CHROME + ' (set CHROME)');
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pend = new Map(), errs = [];
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errs.push((d.exception && d.exception.description || d.text).slice(0, 500)); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception.description); return r.result.result.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'file://' + FILE + '#seed=' + seed + '&manual=1&noscale=1' + (extra ? '&' + extra : '') });
  for (let i = 0; i < 80; i++) { await sleep(250); try { if (await ev('!!(window.__cw && __cw.G.B)')) break; } catch (e) { } }
  await ev(PAGE);
  const cap = +maxMin * 60 * 30; let res = 'cap';
  for (let t = 0; t < cap; t += 1800) if (await ev('__bal.run(1800)') === 'defeat') { res = 'defeat'; break; }
  const out = await ev('({ max: __bal.max, log: __bal.log, t: __cw.G.t, eff: __bal.eff, boards: __bal.boards })');
  ws.close(); ch.kill(); await sleep(200); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { }
  return Object.assign({ seed, res, errs }, out);
}

(async () => {
  const all = [];
  for (const s of seeds) {
    const r = await runSeed(s); all.push(r);
    console.log(`seed ${s}: ${r.res} at wave ${r.max} (${(r.t / 60).toFixed(1)} game minutes)` + (r.errs.length ? '  ERRORS: ' + r.errs.join(' | ') : ''));
    if (process.env.B) for (const b of r.boards) console.log(`  L${b.L}: waves 1-4 lost ${b.a}, boss wave lost ${b.b}${b.leak ? ', boss got through' : ''}, mid gold ${Math.round(b.mid / Math.max(1, b.midN))}, pre-boss gold ${Math.round(b.preBoss)}`);
    if (process.env.V) for (const l of r.log) console.log(`  w${l.w} lost ${l.lost} lives ${l.lives} press ${l.press} gold ${l.gold} [${l.tw}]`);
  }
  const E = {}; for (const r of all) for (const k in r.eff) { const e = E[k] = E[k] || [0, 0, 0]; for (let i = 0; i < 3; i++) e[i] += r.eff[k][i]; }
  console.log('\ndamage per second while at that level:');
  for (const k of Object.keys(E).sort()) console.log('  ' + k.padEnd(10) + (E[k][0] / E[k][1]).toFixed(1).padStart(7) + '   ' + E[k][2] + ' towers, ' + (E[k][1] / 60).toFixed(0) + ' tower-minutes');
  const byL = {};
  for (const r of all) for (const b of r.boards) { const k = Math.min(b.L, LCAP), e = byL[k] = byL[k] || { n: 0, a: 0, b: 0, leak: 0, mid: 0, pre: 0 }; e.n++; e.a += b.a; e.b += b.b; e.leak += b.leak ? 1 : 0; e.mid += b.mid / Math.max(1, b.midN); e.pre += b.preBoss; }
  console.log(`\nper battlefield (L${LCAP} includes later ones; averages per battlefield):`);
  console.log('        boards  lives lost w1-4  lives lost boss wave  boss got through  gold at waves 2-4  gold before boss');
  for (const k in byL) { const e = byL[k]; console.log(`  L${String(k).padEnd(4)}${String(e.n).padStart(6)}${(e.a / e.n).toFixed(1).padStart(17)}${(e.b / e.n).toFixed(1).padStart(22)}${(e.leak + '/' + e.n).padStart(18)}${String(Math.round(e.mid / e.n)).padStart(19)}${String(Math.round(e.pre / e.n)).padStart(18)}`); }
  const ws = all.map(r => r.max).sort((a, b) => a - b);
  console.log('\nwaves reached:', ws.join(' '), '  median', ws[Math.floor(ws.length / 2)]);
})();
