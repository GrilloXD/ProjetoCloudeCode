// Uso: node cdp.mjs <script.json>  — script: {url, width, height, mobile, steps:[{eval:"js"}|{shot:"arquivo.png", full:true, sel:"css"}|{wait:ms}]}
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const port = 9333 + Math.floor(Math.random() * 300);
const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const prof = process.env.TEMP + '/cdp-prof-' + port;
const br = spawn(exe, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl = null;
for (let i = 0; i < 50 && !wsUrl; i++) { await sleep(200); try { const j = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); const p = j.find(x => x.type === 'page'); if (p) wsUrl = p.webSocketDebuggerUrl; } catch (e) {} }
if (!wsUrl) { console.error('sem conexão CDP'); br.kill(); process.exit(1); }
const ws = new WebSocket(wsUrl); let id = 0; const pend = {}; const logs = [];
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400)); else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) logs.push(m.params.type + ' ' + m.params.args.map(a => a.value || a.description).join(' ').slice(0, 300)); };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: cfg.width || 1280, height: cfg.height || 900, deviceScaleFactor: 1, mobile: !!cfg.mobile });
if (cfg.mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Page.navigate', { url: cfg.url }); await sleep(cfg.loadWait || 3500);
for (const st of cfg.steps) {
  if (st.wait) await sleep(st.wait);
  if (st.nav) { await send('Page.navigate', { url: st.nav }); await sleep(st.navWait || 3500); }
  if (st.eval) { const r = await send('Runtime.evaluate', { expression: '(async()=>{' + st.eval + '})()', awaitPromise: true, returnByValue: true }); const v = r.result && r.result.result; if (r.result && r.result.exceptionDetails) console.log('ERRO eval:', JSON.stringify(r.result.exceptionDetails).slice(0, 500)); else if (v && v.value !== undefined) console.log(typeof v.value === 'string' ? v.value : JSON.stringify(v.value)); }
  if (st.shot) {
    let params = { format: 'png' };
    if (st.sel) { const r = await send('Runtime.evaluate', { expression: 'JSON.stringify((()=>{const e=document.querySelector(' + JSON.stringify(st.sel) + ');const b=e.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,w:b.width,h:b.height};})())', returnByValue: true }); const b = JSON.parse(r.result.result.value); params.clip = { x: Math.max(0, b.x - 8), y: Math.max(0, b.y - 8), width: Math.min(b.w + 16, (cfg.width || 1280)), height: Math.min(b.h + 16, st.maxh || 2400), scale: st.scale || 1 }; params.captureBeyondViewport = true; }
    else if (st.full) { const r = await send('Page.getLayoutMetrics'); const h = Math.min(r.result.cssContentSize.height, st.maxh || 6000); params.clip = { x: 0, y: st.y || 0, width: cfg.width || 1280, height: h - (st.y || 0), scale: st.scale || 1 }; params.captureBeyondViewport = true; }
    const r = await send('Page.captureScreenshot', params); if (!r.result) { console.log('ERRO shot', JSON.stringify(r.error)); continue; } fs.writeFileSync(st.shot, Buffer.from(r.result.data, 'base64')); console.log('shot', st.shot);
  }
}
if (logs.length) console.log('LOGS:\n' + logs.join('\n'));
ws.close(); br.kill(); await sleep(300);
try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
process.exit(0);
