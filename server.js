import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MemeEngine } from './src/engine.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(root, 'public');
const memeDir = process.env.MEMES_DIR ? path.resolve(process.env.MEMES_DIR) : path.join(root, 'memes');
const port = Number(process.env.PORT || 3927);
const host = '127.0.0.1';
const engine = new MemeEngine();
const listeners = new Set();
let live = null;
let generation = 0;
let mode = 'idle';
let message = 'Test mode ready';
let streamer = '';

fs.mkdirSync(memeDir, { recursive: true });

function pngFiles() {
  return fs.readdirSync(memeDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .filter(entry => fs.statSync(path.join(memeDir, entry.name)).size <= 10 * 1024 * 1024)
    .map(entry => entry.name)
    .sort();
}
function snapshot() {
  return {
    mode, message, streamer, top3: engine.top3(),
    memes: pngFiles(), cooldownMs: engine.cooldownMs,
    cooldownUntil: engine.lastMemeAt === null ? 0 : engine.lastMemeAt + engine.cooldownMs
  };
}
function broadcast(packet) {
  const data = 'data: ' + JSON.stringify(packet) + '\n\n';
  for (const client of listeners) {
    try { client.write(data); } catch { listeners.delete(client); }
  }
}
function pushState() { broadcast({ type: 'state', state: snapshot() }); }
function gift(data) {
  if (engine.recordGift(data)) pushState();
}
function comment(data) {
  const result = engine.handleChat(data, pngFiles());
  if (!result.ok) return result;
  broadcast({ type: 'meme', event: result.event });
  pushState();
  return result;
}

async function disconnect() {
  ++generation;
  const old = live;
  live = null;
  if (old) {
    try { await old.disconnect(); } catch (error) { console.warn('Disconnect:', error.message); }
  }
  mode = 'idle';
  message = 'Disconnected';
  streamer = '';
  pushState();
}
async function connect(handle) {
  const name = String(handle || '').trim().replace(/^@/, '');
  if (!/^[a-zA-Z0-9._]{2,30}$/.test(name)) throw new Error('Enter a valid TikTok username.');
  await disconnect();
  engine.reset();
  const sequence = ++generation;
  mode = 'connecting'; streamer = name; message = 'Connecting to @' + name;
  pushState();
  try {
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = await import('tiktok-live-connector');
    if (sequence !== generation) return;
    const conn = new TikTokLiveConnection(name, { enableExtendedGiftInfo: true });
    live = conn;
    conn.on(WebcastEvent.GIFT || 'gift', data => { if (sequence === generation) gift(data); });
    conn.on(WebcastEvent.CHAT || 'chat', data => { if (sequence === generation) comment(data); });
    conn.on(ControlEvent.DISCONNECTED || 'disconnected', () => {
      if (sequence !== generation) return;
      mode = 'offline'; message = 'TikTok disconnected. Reconnect from the dashboard.'; pushState();
    });
    conn.on(ControlEvent.ERROR || 'error', error => {
      if (sequence !== generation) return;
      mode = 'error'; message = 'TikTok: ' + String(error?.message || error); pushState();
    });
    await conn.connect();
    if (sequence !== generation) { await conn.disconnect(); return; }
    mode = 'connected'; message = 'Connected to @' + name; pushState();
  } catch (error) {
    if (sequence === generation) {
      live = null;
      mode = 'error';
      message = String(error?.message || error);
      pushState();
    }
    throw error;
  }
}
function json(res, code, value) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}
function serve(res, file, mime) {
  fs.readFile(file, (error, data) => {
    if (error) return json(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(data);
  });
}
async function body(req) {
  let size = 0; const parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32_768) throw new Error('Request too large');
    parts.push(chunk);
  }
  return JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
}

const pages = {
  '/': ['control.html', 'text/html; charset=utf-8'],
  '/overlay': ['overlay.html', 'text/html; charset=utf-8'],
  '/control.js': ['control.js', 'application/javascript; charset=utf-8'],
  '/overlay.js': ['overlay.js', 'application/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8']
};
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://' + host);
  try {
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, snapshot());
    if (req.method === 'GET' && url.pathname === '/events') {
      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        'connection': 'keep-alive',
        'x-accel-buffering': 'no'
      });
      res.write('data: ' + JSON.stringify({ type: 'state', state: snapshot() }) + '\n\n');
      listeners.add(res);
      req.on('close', () => listeners.delete(res));
      return;
    }
    if (req.method === 'GET' && url.pathname.startsWith('/memes/')) {
      let filename;
      try { filename = decodeURIComponent(url.pathname.slice('/memes/'.length)); }
      catch { return json(res, 400, { error: 'Invalid filename' }); }
      if (!pngFiles().includes(filename)) return json(res, 404, { error: 'PNG not found' });
      return serve(res, path.join(memeDir, filename), 'image/png');
    }
    if (req.method === 'GET' && pages[url.pathname]) {
      const [file, mime] = pages[url.pathname];
      return serve(res, path.join(pub, file), mime);
    }
    if (req.method !== 'POST' || !url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found' });
    const origin = req.headers.origin;
    if (origin && origin !== 'http://' + host + ':' + port && origin !== 'http://localhost:' + port) {
      return json(res, 403, { error: 'Wrong origin' });
    }
    const data = await body(req);
    if (url.pathname === '/api/connect') {
      await connect(data.username);
      return json(res, 200, snapshot());
    }
    if (url.pathname === '/api/disconnect') {
      await disconnect(); return json(res, 200, snapshot());
    }
    if (url.pathname === '/api/reset') {
      engine.reset(); pushState(); return json(res, 200, snapshot());
    }
    if (url.pathname === '/api/test/gift') {
      const username = String(data.username || '').trim().replace(/^@/, '').slice(0, 40);
      const diamonds = Number(data.diamonds);
      if (!username || !Number.isInteger(diamonds) || diamonds <= 0 || diamonds > 100_000) {
        return json(res, 400, { error: 'Enter a username and 1–100000 diamonds' });
      }
      gift({ user: { userId: 'test:' + username.toLowerCase(), uniqueId: username }, diamondCount: diamonds });
      return json(res, 200, snapshot());
    }
    if (url.pathname === '/api/test/chat') {
      const username = String(data.username || '').trim().replace(/^@/, '');
      const candidate = engine.top3().find(u => u.username.toLowerCase() === username.toLowerCase());
      if (!candidate) return json(res, 400, { error: 'Choose a current top-three user' });
      const result = comment({ user: { userId: candidate.userId, uniqueId: candidate.username }, comment: '!meme' });
      return json(res, result.ok ? 200 : 400, result.ok ? { event: result.event } : { error: result.reason, remainingMs: result.remainingMs || 0 });
    }
    return json(res, 404, { error: 'Unknown action' });
  } catch (error) {
    console.error(error);
    return json(res, 400, { error: String(error?.message || error) });
  }
});
const ticker = setInterval(() => { for (const client of listeners) client.write(': ping\n\n'); }, 20_000);
server.listen(port, host, () => {
  console.log('Meme Buddies control: http://' + host + ':' + port + '/');
  console.log('TikTok Studio source: http://' + host + ':' + port + '/overlay');
});
process.on('SIGINT', () => { clearInterval(ticker); server.close(); void disconnect().finally(() => process.exit(0)); });

export { server };
